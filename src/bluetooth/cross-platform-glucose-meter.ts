/**
 * Cross-platform Bluetooth Glucose Meter Implementation
 * Supports Web Bluetooth API, react-native-ble-plx, and Expo Bluetooth
 */

import { Platform } from "react-native";
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

// Check for available Bluetooth implementations
const isBrowser = typeof window !== "undefined";
const isReactNative = typeof Platform !== "undefined";
const isExpo = typeof global !== "undefined" && (global as any).__expo;

// Import BLE PLX conditionally
let BleManager: any = null;
let Device: any = null;
let Service: any = null;
let Characteristic: any = null;

// Import Expo Bluetooth conditionally
let ExpoBluetooth: any = null;

try {
  if (isExpo) {
    // Try to import Expo Bluetooth if available
    ExpoBluetooth = require("expo-bluetooth");
  } else if (isReactNative) {
    const BLE = require("react-native-ble-plx");
    BleManager = BLE.BleManager;
    Device = BLE.Device;
    Service = BLE.Service;
    Characteristic = BLE.Characteristic;
  }
} catch (error) {
  console.log(
    "Bluetooth libraries not available, using Web Bluetooth API or mock mode fallback"
  );
}

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
 * Cross-platform Bluetooth Glucose Meter Manager
 */
export class CrossPlatformBluetoothGlucoseMeterManager {
  private connectedDevices: Map<string, any> = new Map();
  private deviceInfo: Map<string, BluetoothGlucoseMeter> = new Map();
  private isScanning = false;
  private mockOptions: MockBluetoothOptions;
  private bleManager: any = null;
  private platform: "web" | "react-native" | "expo" | "mock";

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

    // Determine platform and initialize appropriate Bluetooth manager
    if (this.mockOptions.enableMockMode) {
      this.platform = "mock";
    } else if (isExpo && ExpoBluetooth) {
      this.platform = "expo";
      this.bleManager = ExpoBluetooth;
    } else if (isReactNative && BleManager) {
      this.platform = "react-native";
      this.bleManager = new BleManager();
    } else if (
      isBrowser &&
      typeof navigator !== "undefined" &&
      "bluetooth" in navigator
    ) {
      this.platform = "web";
    } else {
      this.platform = "mock";
      console.warn("No Bluetooth support detected, using mock mode");
      this.mockOptions.enableMockMode = true;
    }
  }

  /**
   * Initialize the Bluetooth manager
   */
  async initialize(): Promise<boolean> {
    if (this.platform === "expo" && this.bleManager) {
      try {
        // Initialize Expo Bluetooth
        const isSupported = await this.bleManager.isSupported();
        if (!isSupported) {
          console.warn("Bluetooth not supported on this device");
          return false;
        }

        const isEnabled = await this.bleManager.isEnabled();
        if (!isEnabled) {
          console.warn("Bluetooth is not enabled");
          return false;
        }

        return true;
      } catch (error) {
        console.error("Failed to initialize Expo Bluetooth:", error);
        return false;
      }
    } else if (this.platform === "react-native" && this.bleManager) {
      try {
        const state = await this.bleManager.state();
        if (state === "PoweredOn") {
          return true;
        } else {
          // Wait for Bluetooth to be powered on
          return new Promise((resolve) => {
            const subscription = this.bleManager.onStateChange(
              (state: string) => {
                if (state === "PoweredOn") {
                  subscription.remove();
                  resolve(true);
                }
              },
              true
            );
          });
        }
      } catch (error) {
        console.error("Failed to initialize BLE manager:", error);
        return false;
      }
    }
    return true;
  }

  /**
   * Check if Bluetooth is supported on this platform
   */
  isBluetoothSupported(): boolean {
    return this.platform !== "mock" || this.mockOptions.enableMockMode === true;
  }

  /**
   * Get the current platform being used
   */
  getPlatform(): string {
    return this.platform;
  }

  /**
   * Scan for available Bluetooth glucose meters
   */
  async scanForDevices(
    options: BluetoothScanOptions = {}
  ): Promise<BluetoothGlucoseMeter[]> {
    if (this.platform === "mock") {
      return this.mockScanForDevices(options);
    }

    if (this.isScanning) {
      throw new Error("Scan already in progress");
    }

    this.isScanning = true;
    options.onStateChange?.(BluetoothConnectionState.SCANNING);

    try {
      if (this.platform === "expo") {
        return await this.scanWithExpoBluetooth(options);
      } else if (this.platform === "react-native") {
        return await this.scanWithBLEPLX(options);
      } else if (this.platform === "web") {
        return await this.scanWithWebBluetooth(options);
      } else {
        throw new Error("No Bluetooth implementation available");
      }
    } catch (error: any) {
      throw new Error(`Failed to scan for devices: ${error.message}`);
    } finally {
      this.isScanning = false;
      options.onStateChange?.(BluetoothConnectionState.DISCONNECTED);
    }
  }

  /**
   * Scan using react-native-ble-plx
   */
  private async scanWithBLEPLX(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    const devices: BluetoothGlucoseMeter[] = [];
    const scanTimeout = options.timeout || 10000;

    return new Promise((resolve, reject) => {
      const foundDevices = new Set<string>();

      this.bleManager.startDeviceScan(
        [GLUCOSE_SERVICE_UUID],
        null,
        (error: any, device: any) => {
          if (error) {
            reject(error);
            return;
          }

          if (device && !foundDevices.has(device.id)) {
            foundDevices.add(device.id);

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
        }
      );

      setTimeout(() => {
        this.bleManager.stopDeviceScan();
        resolve(devices);
      }, scanTimeout);
    });
  }

  /**
   * Scan using Expo Bluetooth
   */
  private async scanWithExpoBluetooth(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    const devices: BluetoothGlucoseMeter[] = [];
    const scanTimeout = options.timeout || 10000;

    return new Promise((resolve, reject) => {
      const foundDevices = new Set<string>();

      const scanOptions = {
        services: [GLUCOSE_SERVICE_UUID],
        timeout: scanTimeout,
      };

      this.bleManager.startScan(scanOptions, (device: any) => {
        if (device && !foundDevices.has(device.id)) {
          foundDevices.add(device.id);

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

      setTimeout(() => {
        this.bleManager.stopScan();
        resolve(devices);
      }, scanTimeout);
    });
  }

  /**
   * Scan using Web Bluetooth API
   */
  private async scanWithWebBluetooth(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    const devices: BluetoothGlucoseMeter[] = [];
    const scanTimeout = options.timeout || 10000;

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
  }

  /**
   * Connect to a specific Bluetooth glucose meter
   */
  async connectToDevice(
    deviceId: string,
    options: BluetoothConnectionOptions = {}
  ): Promise<boolean> {
    if (this.platform === "mock") {
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
      if (this.platform === "expo") {
        return await this.connectWithExpoBluetooth(deviceId, options);
      } else if (this.platform === "react-native") {
        return await this.connectWithBLEPLX(deviceId, options);
      } else if (this.platform === "web") {
        return await this.connectWithWebBluetooth(deviceId, options);
      } else {
        throw new Error("No Bluetooth implementation available");
      }
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      options.onStateChange?.(BluetoothConnectionState.ERROR);
      throw new Error(`Failed to connect to device: ${error.message}`);
    }
  }

  /**
   * Connect using react-native-ble-plx
   */
  private async connectWithBLEPLX(
    deviceId: string,
    options: BluetoothConnectionOptions
  ): Promise<boolean> {
    const connectTimeout = options.timeout || 30000;

    const device = await Promise.race([
      this.bleManager.connectToDevice(deviceId),
      this.timeout(connectTimeout),
    ]);

    await device.discoverAllServicesAndCharacteristics();

    // Get device information
    await this.getDeviceInformationBLEPLX(deviceId, device);

    this.connectedDevices.set(deviceId, device);
    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
    options.onStateChange?.(BluetoothConnectionState.CONNECTED);

    return true;
  }

  /**
   * Connect using Expo Bluetooth
   */
  private async connectWithExpoBluetooth(
    deviceId: string,
    options: BluetoothConnectionOptions
  ): Promise<boolean> {
    const connectTimeout = options.timeout || 30000;

    const device = await Promise.race([
      this.bleManager.connect(deviceId),
      this.timeout(connectTimeout),
    ]);

    // Discover services and characteristics
    await this.bleManager.discoverServices(deviceId);
    await this.bleManager.discoverCharacteristics(
      deviceId,
      GLUCOSE_SERVICE_UUID
    );

    // Get device information
    await this.getDeviceInformationExpo(deviceId, device);

    this.connectedDevices.set(deviceId, device);
    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
    options.onStateChange?.(BluetoothConnectionState.CONNECTED);

    return true;
  }

  /**
   * Connect using Web Bluetooth API
   */
  private async connectWithWebBluetooth(
    deviceId: string,
    options: BluetoothConnectionOptions
  ): Promise<boolean> {
    const connectTimeout = options.timeout || 30000;

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [GLUCOSE_SERVICE_UUID] }],
      optionalServices: [DEVICE_INFORMATION_SERVICE_UUID],
    });

    const server = await Promise.race([
      device.gatt!.connect(),
      this.timeout(connectTimeout),
    ]);

    // Get device information
    await this.getDeviceInformationWeb(deviceId, server);

    this.connectedDevices.set(deviceId, device);
    this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
    options.onStateChange?.(BluetoothConnectionState.CONNECTED);

    return true;
  }

  /**
   * Sync glucose readings from a connected device
   */
  async syncDevice(deviceId: string): Promise<GlucoseReading[]> {
    if (this.platform === "mock") {
      return this.mockSyncDevice(deviceId);
    }

    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} is not connected`);
    }

    this.updateDeviceState(deviceId, BluetoothConnectionState.SYNCING);

    try {
      if (this.platform === "expo") {
        return await this.syncWithExpoBluetooth(deviceId, device);
      } else if (this.platform === "react-native") {
        return await this.syncWithBLEPLX(deviceId, device);
      } else if (this.platform === "web") {
        return await this.syncWithWebBluetooth(deviceId, device);
      } else {
        throw new Error("No Bluetooth implementation available");
      }
    } catch (error: any) {
      this.updateDeviceState(deviceId, BluetoothConnectionState.ERROR);
      throw new Error(`Failed to sync device: ${error.message}`);
    } finally {
      this.updateDeviceState(deviceId, BluetoothConnectionState.CONNECTED);
      this.updateDeviceLastSync(deviceId);
    }
  }

  /**
   * Sync using react-native-ble-plx
   */
  private async syncWithBLEPLX(
    deviceId: string,
    device: any
  ): Promise<GlucoseReading[]> {
    const readings: GlucoseReading[] = [];

    // Get glucose service
    const services = await device.services();
    const glucoseService = services.find(
      (s: any) => s.uuid === GLUCOSE_SERVICE_UUID
    );
    if (!glucoseService) {
      throw new Error("Glucose service not found");
    }

    // Get characteristics
    const characteristics = await glucoseService.characteristics();
    const glucoseMeasurement = characteristics.find(
      (c: any) => c.uuid === GLUCOSE_MEASUREMENT_UUID
    );
    const racp = characteristics.find(
      (c: any) => c.uuid === RECORD_ACCESS_CONTROL_POINT_UUID
    );

    if (!glucoseMeasurement || !racp) {
      throw new Error("Required characteristics not found");
    }

    // Monitor glucose measurements
    glucoseMeasurement.monitor((error: any, characteristic: any) => {
      if (error) {
        console.error("Glucose measurement error:", error);
        return;
      }

      const reading = this.parseGlucoseMeasurementBLEPLX(characteristic);
      if (reading) {
        readings.push(reading);
      }
    });

    // Request all stored records
    const command = Buffer.from([RACP_OPCODES.REPORT_STORED_RECORDS, 0x01]);
    await racp.writeWithResponse(command.toString("base64"));

    // Wait for all records
    await this.delay(5000);

    return readings;
  }

  /**
   * Sync using Expo Bluetooth
   */
  private async syncWithExpoBluetooth(
    deviceId: string,
    device: any
  ): Promise<GlucoseReading[]> {
    const readings: GlucoseReading[] = [];

    try {
      // Get glucose measurement characteristic
      const glucoseMeasurement = await this.bleManager.getCharacteristic(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID
      );

      // Get record access control point characteristic
      const racp = await this.bleManager.getCharacteristic(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        RECORD_ACCESS_CONTROL_POINT_UUID
      );

      // Enable notifications for glucose measurements
      await this.bleManager.startNotifications(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID
      );

      // Set up notification handler
      this.bleManager.onCharacteristicValueChanged(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID,
        (value: ArrayBuffer) => {
          const reading = this.parseGlucoseMeasurementExpo(
            new Uint8Array(value)
          );
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
      await this.bleManager.writeCharacteristic(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        RECORD_ACCESS_CONTROL_POINT_UUID,
        command
      );

      // Wait for all records to be received
      await this.delay(5000);

      // Stop notifications
      await this.bleManager.stopNotifications(
        deviceId,
        GLUCOSE_SERVICE_UUID,
        GLUCOSE_MEASUREMENT_UUID
      );

      return readings;
    } catch (error) {
      console.error("Error syncing with Expo Bluetooth:", error);
      throw error;
    }
  }

  /**
   * Sync using Web Bluetooth API (similar to original implementation)
   */
  private async syncWithWebBluetooth(
    deviceId: string,
    device: any
  ): Promise<GlucoseReading[]> {
    const readings: GlucoseReading[] = [];
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

    // Event listeners
    const handleMeasurement = (event: Event) => {
      const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
      const reading = this.parseGlucoseMeasurementWeb(characteristic.value!);
      if (reading) {
        readings.push(reading);
      }
    };

    glucoseMeasurement.addEventListener(
      "characteristicvaluechanged",
      handleMeasurement
    );

    // Request all stored records
    await racp.writeValueWithResponse(
      new Uint8Array([RACP_OPCODES.REPORT_STORED_RECORDS, 0x01])
    );

    // Wait for all records
    await this.delay(5000);

    // Cleanup
    glucoseMeasurement.removeEventListener(
      "characteristicvaluechanged",
      handleMeasurement
    );
    await glucoseMeasurement.stopNotifications();
    await racp.stopNotifications();

    return readings;
  }

  /**
   * Disconnect from a Bluetooth glucose meter
   */
  async disconnectDevice(deviceId: string): Promise<boolean> {
    if (this.platform === "mock") {
      return this.mockDisconnectDevice(deviceId);
    }

    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      return true; // Already disconnected
    }

    try {
      if (this.platform === "expo") {
        await this.bleManager.disconnect(deviceId);
      } else if (this.platform === "react-native") {
        await this.bleManager.cancelDeviceConnection(deviceId);
      } else if (this.platform === "web") {
        if (device.gatt && device.gatt.connected) {
          device.gatt.disconnect();
        }
      }

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

  // Private helper methods (similar to original implementation)
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

  // Device information methods
  private async getDeviceInformationBLEPLX(
    deviceId: string,
    device: any
  ): Promise<void> {
    try {
      const services = await device.services();
      const deviceInfoService = services.find(
        (s: any) => s.uuid === DEVICE_INFORMATION_SERVICE_UUID
      );

      if (deviceInfoService) {
        const characteristics = await deviceInfoService.characteristics();

        const manufacturerChar = characteristics.find(
          (c: any) => c.uuid === MANUFACTURER_NAME_UUID
        );
        const modelChar = characteristics.find(
          (c: any) => c.uuid === MODEL_NUMBER_UUID
        );

        let manufacturer = "Unknown";
        let model = "Unknown";

        if (manufacturerChar) {
          const value = await manufacturerChar.read();
          manufacturer = Buffer.from(value.value, "base64").toString();
        }

        if (modelChar) {
          const value = await modelChar.read();
          model = Buffer.from(value.value, "base64").toString();
        }

        const deviceInfo = this.deviceInfo.get(deviceId);
        if (deviceInfo) {
          deviceInfo.manufacturer = manufacturer;
          deviceInfo.model = model;
          this.deviceInfo.set(deviceId, deviceInfo);
        }
      }
    } catch (error) {
      console.warn("Could not retrieve device information:", error);
    }
  }

  private async getDeviceInformationExpo(
    deviceId: string,
    device: any
  ): Promise<void> {
    try {
      // Try to get manufacturer name
      try {
        const manufacturerData = await this.bleManager.readCharacteristic(
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
        const modelData = await this.bleManager.readCharacteristic(
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

  private async getDeviceInformationWeb(
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
      console.warn("Could not retrieve device information:", error);
    }
  }

  // Glucose measurement parsing methods
  private parseGlucoseMeasurementBLEPLX(
    characteristic: any
  ): GlucoseReading | null {
    try {
      const buffer = Buffer.from(characteristic.value, "base64");
      const value = new DataView(buffer.buffer);
      return this.parseGlucoseMeasurementData(value);
    } catch (error) {
      console.error("Error parsing glucose measurement:", error);
      return null;
    }
  }

  private parseGlucoseMeasurementWeb(value: DataView): GlucoseReading | null {
    return this.parseGlucoseMeasurementData(value);
  }

  private parseGlucoseMeasurementExpo(
    value: Uint8Array
  ): GlucoseReading | null {
    // Convert Uint8Array to DataView for consistent parsing
    const dataView = new DataView(
      value.buffer,
      value.byteOffset,
      value.byteLength
    );
    return this.parseGlucoseMeasurementData(dataView);
  }

  private parseGlucoseMeasurementData(value: DataView): GlucoseReading | null {
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

        return {
          id: `bluetooth-${seqNum}-${timestamp}`,
          value: glucoseValue,
          unit,
          timestamp,
          source: `Bluetooth Glucose Meter (${this.platform})`,
          readingType: this.getReadingTypeFromLocation(location),
          metadata: {
            sequenceNumber: seqNum,
            type,
            location,
            platform: this.platform,
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

  // Mock implementation methods (same as original)
  private async mockScanForDevices(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    if (this.mockOptions.simulateDelays) {
      await this.delay(2000);
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
      await this.delay(3000);
    }

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
      await this.delay(5000);
    }

    const readings: GlucoseReading[] = [];
    const readingCount = this.mockOptions.mockReadingCount || 50;

    const now = new Date();
    for (let i = 0; i < readingCount; i++) {
      const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000);
      const baseValue =
        120 + Math.sin(i * 0.1) * 30 + (Math.random() - 0.5) * 40;
      const value = Math.max(70, Math.min(300, Math.round(baseValue)));

      readings.push({
        id: `mock-${deviceId}-${i}`,
        value,
        unit: GlucoseUnit.MGDL,
        timestamp: timestamp.toISOString(),
        source: `Mock Device ${deviceId} (${this.platform})`,
        readingType: "finger",
        metadata: {
          sequenceNumber: i + 1,
          deviceId,
          platform: this.platform,
          mockGenerated: true,
        },
      });
    }

    this.updateDeviceLastSync(deviceId);
    return readings.reverse();
  }
}
