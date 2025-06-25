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
import { GlucoseReading, GlucoseSyncOptions, GlucoseFetchOptions, AuthorizationStatus } from "./types";
/**
 * GlucoseSyncBridge - Main class for interfacing with health platforms
 *
 * This class provides a unified API for accessing blood glucose data
 * from Apple HealthKit (iOS) and Google Health Connect (Android).
 */
export declare class GlucoseSyncBridge {
    private platform;
    private bridge;
    private initialized;
    private options;
    /**
     * Creates a new instance of the GlucoseSyncBridge
     *
     * @param options Configuration options
     */
    constructor(options?: GlucoseSyncOptions);
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
