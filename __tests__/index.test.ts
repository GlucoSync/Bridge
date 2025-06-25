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
});
