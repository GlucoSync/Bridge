/**
 * GlucoSync Bridge
 *
 * A cross-platform library for accessing blood glucose data from
 * Apple HealthKit and Google Health Connect.
 *
 * @copyright GlucoSync 2025
 * @author Afonso Pereira
 * @license Proprietary
 */
import { GlucoseReading, GlucoseSyncOptions, GlucoseFetchOptions, AuthorizationStatus, GlucoseStreamOptions, BluetoothGlucoseMeter, BluetoothScanOptions, BluetoothConnectionOptions, MockBluetoothOptions } from "./types";
/**
 * GlucoseSyncBridge - Main class for interfacing with health platforms
 *
 * This class provides a unified API for accessing blood glucose data
 * from Apple HealthKit (iOS) and Google Health Connect (Android).
 */
export declare class GlucoseSyncBridge {
    private platform;
    private bridge;
    private bluetoothManager;
    private initialized;
    private options;
    /**
     * Creates a new instance of the GlucoseSyncBridge
     *
     * @param options Configuration options including Bluetooth mock options
     */
    constructor(options?: GlucoseSyncOptions & MockBluetoothOptions);
    /**
     * Initializes the platform-specific bridge
     * Must be called before any other methods if autoInitialize is false
     *
     * @returns Promise that resolves when initialization is complete
     */
    initialize(): Promise<boolean>;
    /**
     * Requests necessary permissions to access health data
     *
     * @returns Promise that resolves to authorization status
     */
    requestAuthorization(): Promise<AuthorizationStatus>;
    /**
     * Gets the current authorization status
     *
     * @returns Promise that resolves to current authorization status
     */
    getAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * Fetches the most recent blood glucose reading
     *
     * @returns Promise that resolves to the most recent glucose reading or null if none found
     */
    getLatestGlucoseReading(): Promise<GlucoseReading | null>;
    /**
     * Fetches blood glucose readings within a specified time range
     *
     * @param options Options for fetching glucose readings
     * @returns Promise that resolves to an array of glucose readings
     */
    getGlucoseReadings(options?: GlucoseFetchOptions): Promise<GlucoseReading[]>;
    /**
     * Check if real-time glucose streaming is supported on current platform
     *
     * @returns True if streaming is supported, false otherwise
     */
    isStreamingSupported(): boolean;
    /**
     * Start real-time glucose streaming (Android only - xDrip+ and LibreLink support)
     *
     * @param options Streaming configuration options
     * @returns Promise that resolves when streaming starts successfully
     */
    startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean>;
    /**
     * Stop real-time glucose streaming
     *
     * @returns Promise that resolves when streaming stops successfully
     */
    stopGlucoseStream(): Promise<boolean>;
    /**
     * Check if Bluetooth glucose meter support is available
     *
     * @returns True if Bluetooth is supported, false otherwise
     */
    isBluetoothSupported(): boolean;
    /**
     * Scan for available Bluetooth glucose meters
     *
     * @param options Scanning configuration options
     * @returns Promise that resolves to an array of discovered devices
     */
    scanForBluetoothDevices(options?: BluetoothScanOptions): Promise<BluetoothGlucoseMeter[]>;
    /**
     * Connect to a specific Bluetooth glucose meter
     *
     * @param deviceId The ID of the device to connect to
     * @param options Connection configuration options
     * @returns Promise that resolves when connection is established
     */
    connectToBluetoothDevice(deviceId: string, options?: BluetoothConnectionOptions): Promise<boolean>;
    /**
     * Disconnect from a Bluetooth glucose meter
     *
     * @param deviceId The ID of the device to disconnect from
     * @returns Promise that resolves when disconnection is complete
     */
    disconnectBluetoothDevice(deviceId: string): Promise<boolean>;
    /**
     * Sync glucose readings from a connected Bluetooth device
     *
     * @param deviceId The ID of the device to sync
     * @returns Promise that resolves to an array of glucose readings
     */
    syncBluetoothDevice(deviceId: string): Promise<GlucoseReading[]>;
    /**
     * Get list of currently connected Bluetooth devices
     *
     * @returns Promise that resolves to an array of connected devices
     */
    getConnectedBluetoothDevices(): Promise<BluetoothGlucoseMeter[]>;
    /**
     * Gets platform name
     *
     * @returns The current platform: 'ios', 'android', or 'unknown'
     */
    getPlatform(): "ios" | "android" | "unknown";
    /**
     * Ensures the bridge is initialized before performing operations
     *
     * @throws InitializationError if the bridge is not initialized
     */
    private ensureInitialized;
}
export * from "./types";
export * from "./errors";
export declare const GlucoseSync: GlucoseSyncBridge;
export default GlucoseSyncBridge;
