/**
 * Bluetooth Glucose Meter Implementation
 * Based on tidepool-org/ble-glucose library
 */

import {
  GlucoseReading,
  GlucoseUnit,
  BluetoothGlucoseMeter,
  BluetoothConnectionState,
  BluetoothScanOptions,
  BluetoothConnectionOptions,
  MockBluetoothOptions,
} from "../types";
import { convertGlucoseValue } from "../utils/units";

// Bluetooth GATT Service UUIDs
const GLUCOSE_SERVICE_UUID = "00001808-0000-1000-8000-00805f9b34fb";
const DEVICE_INFORMATION_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";

// Bluetooth GATT Characteristic UUIDs
const GLUCOSE_MEASUREMENT_UUID = "00002a18-0000-1000-8000-00805f9b34fb";
const GLUCOSE_MEASUREMENT_CONTEXT_UUID = "00002a34-0000-1000-8000-00805f9b34fb";
const GLUCOSE_FEATURE_UUID = "00002a51-0000-1000-8000-00805f9b34fb";
const RECORD_ACCESS_CONTROL_POINT_UUID = "00002a52-0000-1000-8000-00805f9b34fb";
const MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
const MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";

// Glucose measurement flags
const FLAGS = {
  TIME_OFFSET_PRESENT: 0x01,
  GLUCOSE_PRESENT: 0x02,
  IS_MMOL: 0x04,
  STATUS_PRESENT: 0x08,
  CONTEXT_INFO: 0x10,
};

// RACP (Record Access Control Point) operation codes
const RACP_OPCODES = {
  REPORT_STORED_RECORDS: 0x01,
  DELETE_STORED_RECORDS: 0x02,
  ABORT_OPERATION: 0x03,
  REPORT_NUMBER_OF_STORED_RECORDS: 0x04,
  NUMBER_OF_STORED_RECORDS_RESPONSE: 0x05,
  RESPONSE_CODE: 0x06,
};

/**
 * Bluetooth Glucose Meter Manager
 * Handles scanning, connection, and data synchronization with Bluetooth glucose meters
 */
export class BluetoothGlucoseMeterManager {
  private connectedDevices: Map<string, BluetoothDevice> = new Map();
  private deviceInfo: Map<string, BluetoothGlucoseMeter> = new Map();
  private isScanning = false;
  private mockOptions: MockBluetoothOptions;

  constructor(mockOptions: MockBluetoothOptions = {}) {
    this.mockOptions = {
      enableMockMode: false,
      mockDeviceCount: 3,
      mockReadingCount: 50,
      mockSeed: 12345,
      simulateDelays: true,
      mockFailureRate: 0.1,
      ...mockOptions,
    };
  }

  /**
   * Check if Bluetooth is supported on this platform
   */
  isBluetoothSupported(): boolean {
    if (this.mockOptions.enableMockMode) {
      return true;
    }

    return (
      typeof navigator !== "undefined" &&
      "bluetooth" in navigator &&
      typeof navigator.bluetooth.requestDevice === "function"
    );
  }

  /**
   * Scan for available Bluetooth glucose meters
   */
  async scanForDevices(
    options: BluetoothScanOptions = {}
  ): Promise<BluetoothGlucoseMeter[]> {
    if (this.mockOptions.enableMockMode) {
      return this.mockScanForDevices(options);
    }

    if (!this.isBluetoothSupported()) {
      throw new Error("Bluetooth is not supported on this platform");
    }

    if (this.isScanning) {
      throw new Error("Scan already in progress");
    }

    this.isScanning = true;
    options.onStateChange?.(BluetoothConnectionState.SCANNING);

    try {
      const devices: BluetoothGlucoseMeter[] = [];
      const scanTimeout = options.timeout || 10000;

      // Request device with glucose service filter
      const device = await Promise.race([
        navigator.bluetooth.requestDevice({
          filters: [
            { services: [GLUCOSE_SERVICE_UUID] },
            { namePrefix: "Accu-Chek" },
            { namePrefix: "FreeStyle" },
            { namePrefix: "OneTouch" },
            { namePrefix: "Contour" },
          ],
          optionalServices: [
            DEVICE_INFORMATION_SERVICE_UUID,
            GLUCOSE_SERVICE_UUID,
          ],
        }),
        this.timeout(scanTimeout),
      ]);

      if (device) {
        const glucoseMeter: BluetoothGlucoseMeter = {
          id: device.id,
          name: device.name || "Unknown Device",
          connectionState: BluetoothConnectionState.DISCONNECTED,
          supportsStreaming: true,
        };

        devices.push(glucoseMeter);
        this.deviceInfo.set(device.id, glucoseMeter);
        options.onDeviceFound?.(glucoseMeter);
      }

      return devices;
    } catch (error: any) {
      throw new Error(`Failed to scan for devices: ${error.message}`);
    } finally {
      this.isScanning = false;
      options.onStateChange?.(BluetoothConnectionState.DISCONNECTED);
    }
  }

  /**
   * Connect to a specific Bluetooth glucose meter
   */
  async connectToDevice(
    deviceId: string,
    options: BluetoothConnectionOptions = {}
  ): Promise<boolean> {
    if (this.mockOptions.enableMockMode) {
      return this.mockConnectToDevice(deviceId, options);
    }

    const deviceInfo = this.deviceInfo.get(deviceId);
    if (!deviceInfo) {
      throw new Error(`Device ${deviceId} not found. Run scan first.`);
    }

    if (this.connectedDevices.has(deviceId)) {
      return true; // Already connected
    }

    options.onStateChange?.(BluetoothConnectionState.CONNECTING);
    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTING);

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [GLUCOSE_SERVICE_UUID] }],
        optionalServices: [DEVICE_INFORMATION_SERVICE_UUID],
      });

      const connectTimeout = options.timeout || 30000;
      const server = await Promise.race([
        device.gatt!.connect(),
        this.timeout(connectTimeout),
      ]);

      // Get device information
      await this.getDeviceInformation(deviceId, server);

      // Set up glucose service
      const glucoseService = await server.getPrimaryService(
        GLUCOSE_SERVICE_UUID
      );
      await this.setupGlucoseService(deviceId, glucoseService);

      this.connectedDevices.set(deviceId, device);
      this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
      options.onStateChange?.(BluetoothConnectionState.CONNECTED);

      // Auto-sync if requested
      if (options.autoSync) {
        await this.syncDevice(deviceId);
      }

      return true;
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      options.onStateChange?.(BluetoothConnectionState.ERROR);
      throw new Error(`Failed to connect to device: ${error.message}`);
    }
  }

  /**
   * Disconnect from a Bluetooth glucose meter
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    if (this.mockOptions.enableMockMode) {
      return this.mockDisconnectDevice(deviceId);
    }

    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      return true; // Already disconnected
    }

    try {
      if (device.gatt && device.gatt.connected) {
        device.gatt.disconnect();
      }

      this.connectedDevices.delete(deviceId);
      this.updateDeviceState(deviceId, BluetoothConnectionState.DISCONNECTED);

      return true;
    } catch (error: any) {
      throw new Error(`Failed to disconnect device: ${error.message}`);
    }
  }

  /**
   * Sync glucose readings from a connected device
   */
  async syncDevice(deviceId: string): Promise<GlucoseReading[]> {
    if (this.mockOptions.enableMockMode) {
      return this.mockSyncDevice(deviceId);
    }

    const device = this.connectedDevices.get(deviceId);
    if (!device || !device.gatt || !device.gatt.connected) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    this.updateDeviceState(deviceId, BluetoothConnectionState.SYNCING);

    try {
      const glucoseService = await device.gatt.getPrimaryService(
        GLUCOSE_SERVICE_UUID
      );
      const racp = await glucoseService.getCharacteristic(
        RECORD_ACCESS_CONTROL_POINT_UUID
      );
      const glucoseMeasurement = await glucoseService.getCharacteristic(
        GLUCOSE_MEASUREMENT_UUID
      );

      // Set up notifications
      await glucoseMeasurement.startNotifications();
      await racp.startNotifications();

      const readings: GlucoseReading[] = [];
      let recordCount = 0;

      // Set up event listeners
      const handleMeasurement = (event: Event) => {
        const characteristic =
          event.target as BluetoothRemoteGATTCharacteristic;
        const reading = this.parseGlucoseMeasurement(characteristic.value!);
        if (reading) {
          readings.push(reading);
        }
      };

      const handleRACP = (event: Event) => {
        const characteristic =
          event.target as BluetoothRemoteGATTCharacteristic;
        const response = this.parseRACPResponse(characteristic.value!);

        if (
          response.opCode === RACP_OPCODES.NUMBER_OF_STORED_RECORDS_RESPONSE
        ) {
          recordCount = response.numberOfRecords || 0;
        }
      };

      glucoseMeasurement.addEventListener(
        "characteristicvaluechanged",
        handleMeasurement
      );
      racp.addEventListener("characteristicvaluechanged", handleRACP);

      // Request number of stored records
      await racp.writeValueWithResponse(
        new Uint8Array([
          RACP_OPCODES.REPORT_NUMBER_OF_STORED_RECORDS,
          0x01, // All records
        ])
      );

      // Wait for response
      await this.delay(1000);

      // Request all stored records
      await racp.writeValueWithResponse(
        new Uint8Array([
          RACP_OPCODES.REPORT_STORED_RECORDS,
          0x01, // All records
        ])
      );

      // Wait for all records to be received
      const maxWaitTime = 30000; // 30 seconds
      const startTime = Date.now();

      while (
        readings.length < recordCount &&
        Date.now() - startTime < maxWaitTime
      ) {
        await this.delay(100);
      }

      // Cleanup
      glucoseMeasurement.removeEventListener(
        "characteristicvaluechanged",
        handleMeasurement
      );
      racp.removeEventListener("characteristicvaluechanged", handleRACP);
      await glucoseMeasurement.stopNotifications();
      await racp.stopNotifications();

      this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
      this.updateDeviceLastSync(deviceId);

      return readings;
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      throw new Error(`Failed to sync device: ${error.message}`);
    }
  }

  /**
   * Get list of connected devices
   */
  async getConnectedDevices(): Promise<BluetoothGlucoseMeter[]> {
    return Array.from(this.deviceInfo.values()).filter(
      (device) => device.connectionState === BluetoothConnectionState.CONNECTED
    );
  }

  // Private helper methods

  private async timeout(delay: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Operation timeout")), delay)
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateDeviceState(
    deviceId: string,
    state: BluetoothConnectionState
  ): void {
    const device = this.deviceInfo.get(deviceId);
    if (device) {
      device.connectionState = state;
      this.deviceInfo.set(deviceId, device);
    }
  }

  private updateDeviceLastSync(deviceId: string): void {
    const device = this.deviceInfo.get(deviceId);
    if (device) {
      device.lastSync = new Date().toISOString();
      this.deviceInfo.set(deviceId, device);
    }
  }

  private async getDeviceInformation(
    deviceId: string,
    server: BluetoothRemoteGATTServer
  ): Promise<void> {
    try {
      const deviceInfoService = await server.getPrimaryService(
        DEVICE_INFORMATION_SERVICE_UUID
      );

      const manufacturerChar = await deviceInfoService.getCharacteristic(
        MANUFACTURER_NAME_UUID
      );
      const modelChar = await deviceInfoService.getCharacteristic(
        MODEL_NUMBER_UUID
      );

      const manufacturerValue = await manufacturerChar.readValue();
      const modelValue = await modelChar.readValue();

      const manufacturer = new TextDecoder().decode(manufacturerValue);
      const model = new TextDecoder().decode(modelValue);

      const device = this.deviceInfo.get(deviceId);
      if (device) {
        device.manufacturer = manufacturer;
        device.model = model;
        this.deviceInfo.set(deviceId, device);
      }
    } catch (error) {
      // Device information service might not be available
      console.warn("Could not retrieve device information:", error);
    }
  }

  private async setupGlucoseService(
    deviceId: string,
    service: BluetoothRemoteGATTService
  ): Promise<void> {
    // Setup glucose service characteristics
    const glucoseFeature = await service.getCharacteristic(
      GLUCOSE_FEATURE_UUID
    );
    const features = await glucoseFeature.readValue();

    console.log(
      `Device ${deviceId} glucose features:`,
      this.buf2hex(features.buffer)
    );
  }

  private parseGlucoseMeasurement(value: DataView): GlucoseReading | null {
    try {
      const flags = value.getUint8(0);
      const seqNum = value.getUint16(1, true);

      // Parse timestamp
      const year = value.getUint16(3, true);
      const month = value.getUint8(5);
      const day = value.getUint8(6);
      const hours = value.getUint8(7);
      const minutes = value.getUint8(8);
      const seconds = value.getUint8(9);

      const timestamp = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        seconds
      ).toISOString();

      let offset = 10;

      // Handle time offset if present
      if (flags & FLAGS.TIME_OFFSET_PRESENT) {
        const timeOffset = value.getInt16(offset, true);
        offset += 2;
      }

      // Parse glucose value if present
      if (flags & FLAGS.GLUCOSE_PRESENT) {
        const isMMOL = flags & FLAGS.IS_MMOL;
        const unit = isMMOL ? GlucoseUnit.MMOL : GlucoseUnit.MGDL;

        const glucoseValue = this.getSFLOAT(
          value.getUint16(offset, true),
          unit
        );
        const type = value.getUint8(offset + 2) >> 4;
        const location = value.getUint8(offset + 2) & 0x0f;

        offset += 3;

        // Handle status if present
        let status = undefined;
        if (flags & FLAGS.STATUS_PRESENT) {
          status = value.getUint16(offset, true);
          offset += 2;
        }

        return {
          id: `bluetooth-${seqNum}-${timestamp}`,
          value: glucoseValue,
          unit,
          timestamp,
          source: "Bluetooth Glucose Meter",
          readingType: this.getReadingTypeFromLocation(location),
          metadata: {
            sequenceNumber: seqNum,
            type,
            location,
            status,
            hasContext: !!(flags & FLAGS.CONTEXT_INFO),
          },
        };
      }

      return null;
    } catch (error) {
      console.error("Error parsing glucose measurement:", error);
      return null;
    }
  }

  private parseRACPResponse(value: DataView): any {
    return {
      opCode: value.getUint8(0),
      operator: value.getUint8(1),
      numberOfRecords:
        value.byteLength > 2 ? value.getUint16(2, true) : undefined,
    };
  }

  private getSFLOAT(value: number, unit: GlucoseUnit): number {
    // Handle special values
    switch (value) {
      case 0x07ff:
        return NaN;
      case 0x0800:
        return NaN;
      case 0x07fe:
        return Number.POSITIVE_INFINITY;
      case 0x0802:
        return Number.NEGATIVE_INFINITY;
      case 0x0801:
        return NaN;
    }

    let exponent = value >> 12;
    let mantissa = value & 0x0fff;

    if (exponent >= 0x0008) {
      exponent = -(0x000f + 1 - exponent);
    }

    if (mantissa >= 0x0800) {
      mantissa = -(0x0fff + 1 - mantissa);
    }

    if (unit === GlucoseUnit.MGDL) {
      exponent += 5; // convert kg/L to mg/dL
    } else if (unit === GlucoseUnit.MMOL) {
      exponent += 3; // convert mol/L to mmol/L
    }

    return mantissa * Math.pow(10, exponent);
  }

  private getReadingTypeFromLocation(location: number): string {
    const locations = [
      "not_available",
      "finger",
      "alternate_site_test",
      "earlobe",
      "control_solution",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
      "not_available",
    ];
    return locations[location] || "unknown";
  }

  private buf2hex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ");
  }

  // Mock implementation methods for testing

  private async mockScanForDevices(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    if (this.mockOptions.simulateDelays) {
      await this.delay(2000); // Simulate scan time
    }

    const devices: BluetoothGlucoseMeter[] = [];
    const deviceCount = this.mockOptions.mockDeviceCount || 3;

    for (let i = 0; i < deviceCount; i++) {
      const device: BluetoothGlucoseMeter = {
        id: `mock-device-${i + 1}`,
        name: `Mock Glucose Meter ${i + 1}`,
        manufacturer: i === 0 ? "Abbott" : i === 1 ? "Roche" : "LifeScan",
        model: i === 0 ? "FreeStyle Libre" : i === 1 ? "Accu-Chek" : "OneTouch",
        connectionState: BluetoothConnectionState.DISCONNECTED,
        rssi: -40 - i * 10,
        batteryLevel: 85 - i * 15,
        supportsStreaming: true,
      };

      devices.push(device);
      this.deviceInfo.set(device.id, device);
      options.onDeviceFound?.(device);
    }

    return devices;
  }

  private async mockConnectToDevice(
    deviceId: string,
    options: BluetoothConnectionOptions
  ): Promise<boolean> {
    const deviceInfo = this.deviceInfo.get(deviceId);
    if (!deviceInfo) {
      throw new Error(`Device ${deviceId} not found. Run scan first.`);
    }

    if (this.mockOptions.simulateDelays) {
      await this.delay(3000); // Simulate connection time
    }

    // Simulate connection failure based on failure rate
    if (Math.random() < (this.mockOptions.mockFailureRate || 0)) {
      throw new Error("Mock connection failed");
    }

    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
    options.onStateChange?.(BluetoothConnectionState.CONNECTED);

    return true;
  }

  private async mockDisconnectDevice(deviceId: string): Promise<boolean> {
    this.updateDeviceState(deviceId, BluetoothConnectionState.DISCONNECTED);
    return true;
  }

  private async mockSyncDevice(deviceId: string): Promise<GlucoseReading[]> {
    const deviceInfo = this.deviceInfo.get(deviceId);
    if (
      !deviceInfo ||
      deviceInfo.connectionState !== BluetoothConnectionState.CONNECTED
    ) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    if (this.mockOptions.simulateDelays) {
      await this.delay(5000); // Simulate sync time
    }

    const readings: GlucoseReading[] = [];
    const readingCount = this.mockOptions.mockReadingCount || 50;

    // Generate mock readings over the past week
    const now = new Date();
    for (let i = 0; i < readingCount; i++) {
      const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000); // Every 4 hours

      // Generate realistic glucose values with some variation
      const baseValue =
        120 + Math.sin(i * 0.1) * 30 + (Math.random() - 0.5) * 40;
      const value = Math.max(70, Math.min(300, Math.round(baseValue)));

      readings.push({
        id: `mock-${deviceId}-${i}`,
        value,
        unit: GlucoseUnit.MGDL,
        timestamp: timestamp.toISOString(),
        source: `Mock Device ${deviceId}`,
        readingType: "finger",
        metadata: {
          sequenceNumber: i + 1,
          deviceId,
          mockGenerated: true,
        },
      });
    }

    this.updateDeviceLastSync(deviceId);
    return readings.reverse(); // Return chronologically
  }
}
