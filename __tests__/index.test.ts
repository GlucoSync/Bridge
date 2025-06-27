import { GlucoseSyncBridge, GlucoseUnit, AuthorizationStatus } from "../src";

describe("GlucoseSyncBridge", () => {
  let bridge: GlucoseSyncBridge;

  beforeEach(() => {
    bridge = new GlucoseSyncBridge({
      defaultUnit: GlucoseUnit.MGDL,
      autoInitialize: false,
    });
  });

  test("should create an instance", () => {
    expect(bridge).toBeInstanceOf(GlucoseSyncBridge);
  });

  test("should initialize successfully", async () => {
    const result = await bridge.initialize();
    expect(result).toBeTruthy();
  });

  test("should get authorization status", async () => {
    await bridge.initialize();
    const status = await bridge.getAuthorizationStatus();
    expect(status).toBe(AuthorizationStatus.AUTHORIZED);
  });

  test("should get latest glucose reading", async () => {
    await bridge.initialize();
    const reading = await bridge.getLatestGlucoseReading();
    expect(reading).not.toBeNull();
    expect(reading?.value).toBeDefined();
    expect(reading?.unit).toBe(GlucoseUnit.MGDL);
    expect(reading?.timestamp).toBeDefined();
  });

  test("should get multiple glucose readings", async () => {
    await bridge.initialize();
    const readings = await bridge.getGlucoseReadings({
      startDate: "2025-01-01T00:00:00.000Z",
      endDate: "2025-01-02T00:00:00.000Z",
    });
    expect(Array.isArray(readings)).toBeTruthy();
    expect(readings.length).toBeGreaterThan(0);
  });

  test("should support streaming on Android", () => {
    expect(bridge.isStreamingSupported()).toBeTruthy();
  });

  // Bluetooth Tests
  describe("Bluetooth Support", () => {
    test("should check Bluetooth support", () => {
      const isSupported = bridge.isBluetoothSupported();
      expect(typeof isSupported).toBe("boolean");
    });

    test("should scan for Bluetooth devices in mock mode", async () => {
      // Create bridge with mock mode enabled
      const mockBridge = new GlucoseSyncBridge({
        enableMockMode: true,
        mockDeviceCount: 2,
        autoInitialize: false,
      });

      await mockBridge.initialize();
      const devices = await mockBridge.scanForBluetoothDevices();

      expect(Array.isArray(devices)).toBeTruthy();
      expect(devices.length).toBe(2);
      expect(devices[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        connectionState: expect.any(String),
      });
    });
    test("should connect to Bluetooth device in mock mode", async () => {
      const mockBridge = new GlucoseSyncBridge({
        enableMockMode: true,
        simulateDelays: false, // Disable delays for faster tests
        mockFailureRate: 0, // Disable failures for predictable tests
        autoInitialize: false,
      });

      await mockBridge.initialize();
      const devices = await mockBridge.scanForBluetoothDevices();
      const connected = await mockBridge.connectToBluetoothDevice(
        devices[0].id
      );

      expect(connected).toBe(true);
    });
    test("should sync glucose readings from Bluetooth device", async () => {
      const mockBridge = new GlucoseSyncBridge({
        enableMockMode: true,
        mockReadingCount: 5,
        simulateDelays: false, // Disable delays for faster tests
        mockFailureRate: 0, // Disable failures for predictable tests
        autoInitialize: false,
      });

      await mockBridge.initialize();
      const devices = await mockBridge.scanForBluetoothDevices();
      await mockBridge.connectToBluetoothDevice(devices[0].id);
      const readings = await mockBridge.syncBluetoothDevice(devices[0].id);

      expect(Array.isArray(readings)).toBeTruthy();
      expect(readings.length).toBe(5);
      expect(readings[0]).toMatchObject({
        id: expect.any(String),
        value: expect.any(Number),
        unit: expect.any(String),
        timestamp: expect.any(String),
        source: expect.any(String),
      });
    });
    test("should get connected Bluetooth devices", async () => {
      const mockBridge = new GlucoseSyncBridge({
        enableMockMode: true,
        simulateDelays: false, // Disable delays for faster tests
        mockFailureRate: 0, // Disable failures for predictable tests
        autoInitialize: false,
      });

      await mockBridge.initialize();
      const devices = await mockBridge.scanForBluetoothDevices();
      await mockBridge.connectToBluetoothDevice(devices[0].id);

      const connectedDevices = await mockBridge.getConnectedBluetoothDevices();
      expect(connectedDevices.length).toBe(1);
      expect(connectedDevices[0].id).toBe(devices[0].id);
    });
    test("should disconnect from Bluetooth device", async () => {
      const mockBridge = new GlucoseSyncBridge({
        enableMockMode: true,
        simulateDelays: false, // Disable delays for faster tests
        mockFailureRate: 0, // Disable failures for predictable tests
        autoInitialize: false,
      });

      await mockBridge.initialize();
      const devices = await mockBridge.scanForBluetoothDevices();
      await mockBridge.connectToBluetoothDevice(devices[0].id);

      const disconnected = await mockBridge.disconnectBluetoothDevice(
        devices[0].id
      );
      expect(disconnected).toBe(true);

      const connectedDevices = await mockBridge.getConnectedBluetoothDevices();
      expect(connectedDevices.length).toBe(0);
    });
  });
});
