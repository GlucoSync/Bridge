/**
 * Bluetooth Glucose Meter Tests
 */

import { BluetoothGlucoseMeterManager } from "../bluetooth/glucose-meter";
import {
  BluetoothConnectionState,
  GlucoseUnit,
  BluetoothScanOptions,
  BluetoothConnectionOptions,
  MockBluetoothOptions,
} from "../types";

describe("BluetoothGlucoseMeterManager", () => {
  let bluetoothManager: BluetoothGlucoseMeterManager;

  beforeEach(() => {
    // Create manager with mock mode enabled for testing
    bluetoothManager = new BluetoothGlucoseMeterManager({
      enableMockMode: true,
      mockDeviceCount: 3,
      mockReadingCount: 10,
      simulateDelays: false, // Disable delays for faster tests
      mockFailureRate: 0, // Disable failures for predictable tests
    });
  });

  describe("Mock Mode Tests", () => {
    test("should support Bluetooth in mock mode", () => {
      expect(bluetoothManager.isBluetoothSupported()).toBe(true);
    });

    test("should scan for mock devices", async () => {
      const devices = await bluetoothManager.scanForDevices();

      expect(devices).toHaveLength(3);
      expect(devices[0]).toMatchObject({
        id: "mock-device-1",
        name: "Mock Glucose Meter 1",
        manufacturer: "Abbott",
        model: "FreeStyle Libre",
        connectionState: BluetoothConnectionState.DISCONNECTED,
        supportsStreaming: true,
      });
    });

    test("should handle scan with callback", async () => {
      const foundDevices: any[] = [];
      const stateChanges: BluetoothConnectionState[] = [];

      const options: BluetoothScanOptions = {
        onDeviceFound: (device) => foundDevices.push(device),
        onStateChange: (state) => stateChanges.push(state),
      };

      const devices = await bluetoothManager.scanForDevices(options);

      expect(devices).toHaveLength(3);
      expect(foundDevices).toHaveLength(3);
      expect(foundDevices[0].name).toBe("Mock Glucose Meter 1");
    });

    test("should connect to mock device", async () => {
      // First scan to discover devices
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;

      // Connect to the device
      const connected = await bluetoothManager.connectToDevice(deviceId);
      expect(connected).toBe(true);

      // Check connected devices list
      const connectedDevices = await bluetoothManager.getConnectedDevices();
      expect(connectedDevices).toHaveLength(1);
      expect(connectedDevices[0].id).toBe(deviceId);
      expect(connectedDevices[0].connectionState).toBe(
        BluetoothConnectionState.CONNECTED
      );
    });

    test("should handle connection with callback", async () => {
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;

      const stateChanges: BluetoothConnectionState[] = [];
      const options: BluetoothConnectionOptions = {
        onStateChange: (state) => stateChanges.push(state),
      };

      await bluetoothManager.connectToDevice(deviceId, options);

      expect(stateChanges).toContain(BluetoothConnectionState.CONNECTED);
    });

    test("should sync glucose readings from mock device", async () => {
      // Connect to device first
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;
      await bluetoothManager.connectToDevice(deviceId);

      // Sync readings
      const readings = await bluetoothManager.syncDevice(deviceId);

      expect(readings).toHaveLength(10);
      expect(readings[0]).toMatchObject({
        id: expect.stringMatching(/^mock-/),
        value: expect.any(Number),
        unit: GlucoseUnit.MGDL,
        timestamp: expect.any(String),
        source: expect.stringContaining("Mock Device"),
        readingType: "finger",
        metadata: {
          sequenceNumber: expect.any(Number),
          deviceId,
          mockGenerated: true,
        },
      });

      // Check that readings are in chronological order
      for (let i = 1; i < readings.length; i++) {
        const prevTime = new Date(readings[i - 1].timestamp).getTime();
        const currTime = new Date(readings[i].timestamp).getTime();
        expect(currTime).toBeGreaterThan(prevTime);
      }
    });

    test("should disconnect from mock device", async () => {
      // Connect first
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;
      await bluetoothManager.connectToDevice(deviceId);

      // Verify connected
      const connected = await bluetoothManager.getConnectedDevices();
      expect(connected).toHaveLength(1);

      // Disconnect
      const disconnected = await bluetoothManager.disconnectDevice(deviceId);
      expect(disconnected).toBe(true);

      // Verify disconnected
      const connectedAfter = await bluetoothManager.getConnectedDevices();
      expect(connectedAfter).toHaveLength(0);
    });

    test("should handle multiple devices", async () => {
      const devices = await bluetoothManager.scanForDevices();
      expect(devices).toHaveLength(3);

      // Connect to multiple devices
      await bluetoothManager.connectToDevice(devices[0].id);
      await bluetoothManager.connectToDevice(devices[1].id);

      const connected = await bluetoothManager.getConnectedDevices();
      expect(connected).toHaveLength(2);

      // Sync both devices
      const readings1 = await bluetoothManager.syncDevice(devices[0].id);
      const readings2 = await bluetoothManager.syncDevice(devices[1].id);

      expect(readings1).toHaveLength(10);
      expect(readings2).toHaveLength(10);

      // Verify readings have different device IDs
      expect(readings1[0].metadata?.deviceId).toBe(devices[0].id);
      expect(readings2[0].metadata?.deviceId).toBe(devices[1].id);
    });

    test("should handle realistic glucose values", async () => {
      const devices = await bluetoothManager.scanForDevices();
      await bluetoothManager.connectToDevice(devices[0].id);
      const readings = await bluetoothManager.syncDevice(devices[0].id);

      // Check that all values are within realistic glucose ranges
      readings.forEach((reading) => {
        expect(reading.value).toBeGreaterThanOrEqual(70);
        expect(reading.value).toBeLessThanOrEqual(300);
        expect(reading.unit).toBe(GlucoseUnit.MGDL);
      });
    });

    test("should generate timestamps over the past week", async () => {
      const devices = await bluetoothManager.scanForDevices();
      await bluetoothManager.connectToDevice(devices[0].id);
      const readings = await bluetoothManager.syncDevice(devices[0].id);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      readings.forEach((reading) => {
        const readingTime = new Date(reading.timestamp);
        expect(readingTime.getTime()).toBeGreaterThan(weekAgo.getTime());
        expect(readingTime.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    test("should update last sync timestamp after successful sync", async () => {
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;

      // Check initial state
      let deviceInfo = devices.find((d) => d.id === deviceId);
      expect(deviceInfo?.lastSync).toBeUndefined();

      await bluetoothManager.connectToDevice(deviceId);
      await bluetoothManager.syncDevice(deviceId);

      // Get updated device info
      const connectedDevices = await bluetoothManager.getConnectedDevices();
      deviceInfo = connectedDevices.find((d) => d.id === deviceId);

      expect(deviceInfo?.lastSync).toBeDefined();
      expect(new Date(deviceInfo!.lastSync!).getTime()).toBeLessThanOrEqual(
        Date.now()
      );
    });
  });

  describe("Error Handling", () => {
    test("should throw error when connecting to non-existent device", async () => {
      await expect(
        bluetoothManager.connectToDevice("non-existent-device")
      ).rejects.toThrow("Device non-existent-device not found");
    });

    test("should throw error when syncing disconnected device", async () => {
      const devices = await bluetoothManager.scanForDevices();
      const deviceId = devices[0].id;

      // Don't connect, try to sync directly
      await expect(bluetoothManager.syncDevice(deviceId)).rejects.toThrow(
        "not connected"
      );
    });
  });

  describe("Configuration Tests", () => {
    test("should respect custom mock device count", () => {
      const customManager = new BluetoothGlucoseMeterManager({
        enableMockMode: true,
        mockDeviceCount: 5,
      });

      return customManager.scanForDevices().then((devices) => {
        expect(devices).toHaveLength(5);
      });
    });

    test("should respect custom reading count", async () => {
      const customManager = new BluetoothGlucoseMeterManager({
        enableMockMode: true,
        mockReadingCount: 25,
        simulateDelays: false, // Disable delays for faster tests
      });

      const devices = await customManager.scanForDevices();
      await customManager.connectToDevice(devices[0].id);
      const readings = await customManager.syncDevice(devices[0].id);

      expect(readings).toHaveLength(25);
    });

    test("should support failure simulation", async () => {
      const failingManager = new BluetoothGlucoseMeterManager({
        enableMockMode: true,
        mockFailureRate: 1.0, // Always fail
        simulateDelays: false, // Disable delays for faster tests
      });

      const devices = await failingManager.scanForDevices();

      await expect(
        failingManager.connectToDevice(devices[0].id)
      ).rejects.toThrow("Mock connection failed");
    });
  });
});

describe("Real Bluetooth Mode Tests", () => {
  let bluetoothManager: BluetoothGlucoseMeterManager;

  beforeEach(() => {
    // Create manager without mock mode (real Bluetooth)
    bluetoothManager = new BluetoothGlucoseMeterManager({
      enableMockMode: false,
    });
  });

  test("should detect Bluetooth support availability", () => {
    // This will depend on the test environment
    // In Node.js/Jest environment, navigator.bluetooth won't be available
    const isSupported = bluetoothManager.isBluetoothSupported();
    expect(typeof isSupported).toBe("boolean");
  });

  test("should throw error when Bluetooth not supported", async () => {
    if (!bluetoothManager.isBluetoothSupported()) {
      await expect(bluetoothManager.scanForDevices()).rejects.toThrow(
        "Bluetooth is not supported"
      );
    }
  });
});
