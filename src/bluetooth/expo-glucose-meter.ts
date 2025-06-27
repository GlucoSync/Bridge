/**
 * Expo Bluetooth Glucose Meter Implementation
 * For React Native apps using Expo
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

// Import Expo Bluetooth if available
let ExpoBluetooth: any = null;

try {
  ExpoBluetooth = require("expo-bluetooth");
} catch (error) {
  console.warn(
    "expo-bluetooth not available. Install with: expo install expo-bluetooth"
  );
}

// Bluetooth GATT Service and Characteristic UUIDs
const GLUCOSE_SERVICE_UUID = "00001808-0000-1000-8000-00805f9b34fb";
const DEVICE_INFORMATION_SERVICE_UUID = "0000180a-0000-1000-8000-00805f9b34fb";
const GLUCOSE_MEASUREMENT_UUID = "00002a18-0000-1000-8000-00805f9b34fb";
const GLUCOSE_MEASUREMENT_CONTEXT_UUID = "00002a34-0000-1000-8000-00805f9b34fb";
const GLUCOSE_FEATURE_UUID = "00002a51-0000-1000-8000-00805f9b34fb";
const RECORD_ACCESS_CONTROL_POINT_UUID = "00002a52-0000-1000-8000-00805f9b34fb";
const MANUFACTURER_NAME_UUID = "00002a29-0000-1000-8000-00805f9b34fb";
const MODEL_NUMBER_UUID = "00002a24-0000-1000-8000-00805f9b34fb";

// RACP operation codes
const RACP_OPCODES = {
  REPORT_STORED_RECORDS: 0x01,
  DELETE_STORED_RECORDS: 0x02,
  ABORT_OPERATION: 0x03,
  REPORT_NUMBER_OF_STORED_RECORDS: 0x04,
  NUMBER_OF_STORED_RECORDS_RESPONSE: 0x05,
  RESPONSE_CODE: 0x06,
};

/**
 * Expo Bluetooth Glucose Meter Manager
 * Specialized implementation for Expo projects
 */
export class ExpoBluetoothGlucoseMeterManager {
  private connectedDevices: Map<string, any> = new Map();
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

    if (!ExpoBluetooth && !this.mockOptions.enableMockMode) {
      console.warn("Expo Bluetooth not available, enabling mock mode");
      this.mockOptions.enableMockMode = true;
    }
  }

  /**
   * Initialize the Expo Bluetooth manager
   */
  async initialize(): Promise<boolean> {
    if (this.mockOptions.enableMockMode) {
      return true;
    }

    try {
      const isSupported = await ExpoBluetooth.isSupported();
      if (!isSupported) {
        console.warn("Bluetooth not supported on this device");
        return false;
      }

      const isEnabled = await ExpoBluetooth.isEnabled();
      if (!isEnabled) {
        // Request to enable Bluetooth
        const enabled = await ExpoBluetooth.requestEnable();
        if (!enabled) {
          console.warn("Bluetooth was not enabled by user");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("Failed to initialize Expo Bluetooth:", error);
      return false;
    }
  }

  /**
   * Check if Bluetooth is supported
   */
  isBluetoothSupported(): boolean {
    return ExpoBluetooth !== null || this.mockOptions.enableMockMode === true;
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

    if (this.isScanning) {
      throw new Error("Scan already in progress");
    }

    this.isScanning = true;
    options.onStateChange?.(BluetoothConnectionState.SCANNING);

    try {
      const devices: BluetoothGlucoseMeter[] = [];
      const scanTimeout = options.timeout || 10000;

      const scanOptions = {
        services: [GLUCOSE_SERVICE_UUID],
        timeout: scanTimeout,
      };

      await ExpoBluetooth.startScan(scanOptions, (device: any) => {
        if (device && !this.deviceInfo.has(device.id)) {
          const glucoseMeter: BluetoothGlucoseMeter = {
            id: device.id,
            name: device.name || device.localName || "Unknown Device",
            connectionState: BluetoothConnectionState.DISCONNECTED,
            rssi: device.rssi,
            supportsStreaming: true,
          };

          devices.push(glucoseMeter);
          this.deviceInfo.set(device.id, glucoseMeter);
          options.onDeviceFound?.(glucoseMeter);
        }
      });

      // Wait for scan timeout
      await this.delay(scanTimeout);
      await ExpoBluetooth.stopScan();

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
      const connectTimeout = options.timeout || 30000;

      const device = await Promise.race([
        ExpoBluetooth.connect(deviceId),
        this.timeout(connectTimeout),
      ]);

      // Discover services and characteristics
      await ExpoBluetooth.discoverServices(deviceId);
      await ExpoBluetooth.discoverCharacteristics(
        deviceId,
        GLUCOSE_SERVICE_UUID
      );

      // Get device information
      await this.getDeviceInformation(deviceId);

      this.connectedDevices.set(deviceId, device);
      this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
      options.onStateChange?.(BluetoothConnectionState.CONNECTED);

      return true;
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      options.onStateChange?.(BluetoothConnectionState.ERROR);
      throw new Error(`Failed to connect to device: ${error.message}`);
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
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    this.updateDeviceState(deviceId, BluetoothConnectionState.SYNCING);

    try {
      const readings: GlucoseReading[] = [];

      // Enable notifications for glucose measurements
      await ExpoBluetooth.startNotifications(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID
      );

      // Set up notification handler
      ExpoBluetooth.onCharacteristicValueChanged(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID,
        (value: ArrayBuffer) => {
          const reading = this.parseGlucoseMeasurement(new Uint8Array(value));
          if (reading) {
            readings.push(reading);
          }
        }
      );

      // Request all stored records via RACP
      const command = new Uint8Array([
        RACP_OPCODES.REPORT_STORED_RECORDS,
        0x01,
      ]);
      await ExpoBluetooth.writeCharacteristic(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        RECORD_ACCESS_CONTROL_POINT_UUID,
        command
      );

      // Wait for all records to be received
      await this.delay(5000);

      // Stop notifications
      await ExpoBluetooth.stopNotifications(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID
      );

      return readings;
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      throw new Error(`Failed to sync device: ${error.message}`);
    } finally {
      this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
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
      await ExpoBluetooth.disconnect(deviceId);
      this.connectedDevices.delete(deviceId);
      this.updateDeviceState(deviceId, BluetoothConnectionState.DISCONNECTED);

      return true;
    } catch (error: any) {
      throw new Error(`Failed to disconnect device: ${error.message}`);
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

  private async getDeviceInformation(deviceId: string): Promise<void> {
    try {
      // Try to get manufacturer name
      try {
        const manufacturerData = await ExpoBluetooth.readCharacteristic(
          deviceId,
          DEVICE_INFORMATION_SERVICE_UUID,
          MANUFACTURER_NAME_UUID
        );
        const manufacturer = new TextDecoder().decode(manufacturerData);

        const deviceInfo = this.deviceInfo.get(deviceId);
        if (deviceInfo) {
          deviceInfo.manufacturer = manufacturer;
        }
      } catch (error) {
        console.warn("Could not read manufacturer name:", error);
      }

      // Try to get model number
      try {
        const modelData = await ExpoBluetooth.readCharacteristic(
          deviceId,
          DEVICE_INFORMATION_SERVICE_UUID,
          MODEL_NUMBER_UUID
        );
        const model = new TextDecoder().decode(modelData);

        const deviceInfo = this.deviceInfo.get(deviceId);
        if (deviceInfo) {
          deviceInfo.model = model;
        }
      } catch (error) {
        console.warn("Could not read model number:", error);
      }
    } catch (error) {
      console.warn("Could not get device information:", error);
    }
  }

  private parseGlucoseMeasurement(value: Uint8Array): GlucoseReading | null {
    try {
      const dataView = new DataView(
        value.buffer,
        value.byteOffset,
        value.byteLength
      );
      const flags = dataView.getUint8(0);
      const seqNum = dataView.getUint16(1, true);

      // Parse timestamp
      const year = dataView.getUint16(3, true);
      const month = dataView.getUint8(5);
      const day = dataView.getUint8(6);
      const hours = dataView.getUint8(7);
      const minutes = dataView.getUint8(8);
      const seconds = dataView.getUint8(9);

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
      if (flags & 0x01) {
        const timeOffset = dataView.getInt16(offset, true);
        offset += 2;
      }

      // Parse glucose value if present
      if (flags & 0x02) {
        const isMMOL = flags & 0x04;
        const unit = isMMOL ? GlucoseUnit.MMOL : GlucoseUnit.MGDL;

        const glucoseValue = this.getSFLOAT(
          dataView.getUint16(offset, true),
          unit
        );
        const type = dataView.getUint8(offset + 2) >> 4;
        const location = dataView.getUint8(offset + 2) & 0x0f;

        return {
          id: `expo-${seqNum}-${timestamp}`,
          value: glucoseValue,
          unit,
          timestamp,
          source: "Expo Bluetooth Glucose Meter",
          readingType: this.getReadingTypeFromLocation(location),
          metadata: {
            sequenceNumber: seqNum,
            type,
            location,
            platform: "expo",
          },
        };
      }

      return null;
    } catch (error) {
      console.error("Error parsing glucose measurement:", error);
      return null;
    }
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

    // Unit conversion adjustments
    if (unit === GlucoseUnit.MGDL) {
      exponent += 5; // convert kg/L to mg/dL
    } else if (unit === GlucoseUnit.MMOL) {
      exponent += 3; // convert mol/L to mmol/L
    }

    return mantissa * Math.pow(10, exponent);
  }

  private getReadingTypeFromLocation(location: number): string {
    const locations = [
      "reserved",
      "finger",
      "alternate site test",
      "earlobe",
      "control solution",
      "subcutaneous tissue",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "reserved",
      "not available",
    ];
    return locations[location] || "unknown";
  }

  private updateDeviceState(
    deviceId: string,
    state: BluetoothConnectionState
  ): void {
    const device = this.deviceInfo.get(deviceId);
    if (device) {
      device.connectionState = state;
    }
  }

  private async timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Operation timed out")), ms);
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Mock implementations for testing

  private async mockScanForDevices(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    const devices: BluetoothGlucoseMeter[] = [];
    const manufacturers = [
      "Abbott",
      "Roche",
      "LifeScan",
      "Contour",
      "Ascensia",
    ];
    const models = [
      "FreeStyle Libre",
      "Accu-Chek Guide",
      "OneTouch Verio",
      "Contour Next",
      "Breeze 2",
    ];

    if (this.mockOptions.simulateDelays) {
      await this.delay(2000);
    }

    for (let i = 0; i < this.mockOptions.mockDeviceCount!; i++) {
      const manufacturer = manufacturers[i % manufacturers.length];
      const model = models[i % models.length];

      const device: BluetoothGlucoseMeter = {
        id: `expo-mock-device-${i + 1}`,
        name: `${manufacturer} ${model}`,
        manufacturer,
        model,
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
    if (this.mockOptions.simulateDelays) {
      await this.delay(3000);
    }

    if (Math.random() < this.mockOptions.mockFailureRate!) {
      throw new Error("Mock connection failed");
    }

    const device = { id: deviceId };
    this.connectedDevices.set(deviceId, device);
    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
    options.onStateChange?.(BluetoothConnectionState.CONNECTED);

    return true;
  }

  private async mockSyncDevice(deviceId: string): Promise<GlucoseReading[]> {
    if (this.mockOptions.simulateDelays) {
      await this.delay(2000);
    }

    if (Math.random() < this.mockOptions.mockFailureRate!) {
      throw new Error("Mock sync failed");
    }

    const readings: GlucoseReading[] = [];
    const count = this.mockOptions.mockReadingCount!;

    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setHours(date.getHours() - i);

      readings.push({
        id: `expo-mock-reading-${deviceId}-${i}`,
        value: 80 + Math.random() * 120, // 80-200 mg/dL
        unit: GlucoseUnit.MGDL,
        timestamp: date.toISOString(),
        source: "Expo Mock Glucose Meter",
        readingType: "capillary",
        metadata: {
          sequenceNumber: i,
          platform: "expo-mock",
          deviceId,
        },
      });
    }

    return readings;
  }

  private async mockDisconnectDevice(deviceId: string): Promise<boolean> {
    this.connectedDevices.delete(deviceId);
    this.updateDeviceState(deviceId, BluetoothConnectionState.DISCONNECTED);
    return true;
  }
}

export default ExpoBluetoothGlucoseMeterManager;
