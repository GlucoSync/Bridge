/**
 * iOS HealthKit implementation for GlucoSync Bridge
 */
import { GlucoseReading, GlucoseSyncOptions, GlucoseFetchOptions, AuthorizationStatus, PlatformBridge, GlucoseStreamOptions } from "../types";
export declare class IOSHealthKitBridge implements PlatformBridge {
    private options;
    private initialized;
    private healthKitOptions;
    constructor(options: GlucoseSyncOptions);
    /**
     * Initialize HealthKit connection
     */
    initialize(): Promise<boolean>;
    /**
     * Request authorization to access HealthKit data
     */
    requestAuthorization(): Promise<AuthorizationStatus>;
    /**
     * Get current authorization status
     */
    getAuthorizationStatus(): Promise<AuthorizationStatus>;
    /**
     * Get latest glucose reading
     */
    getLatestGlucoseReading(): Promise<GlucoseReading | null>;
    /**
     * Get glucose readings within a specified date range
     */
    getGlucoseReadings(options?: GlucoseFetchOptions): Promise<GlucoseReading[]>;
    /**
     * Maps a HealthKit reading to our standard GlucoseReading format
     */
    private mapHealthKitReadingToGlucoseReading;
    /**
     * Check if real-time glucose streaming is supported on iOS
     * Currently not supported, but may be added in future versions
     */
    isStreamingSupported(): boolean;
    /**
     * Start real-time glucose streaming (not supported on iOS)
     */
    startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean>;
    /**
     * Stop real-time glucose streaming (not supported on iOS)
     */
    stopGlucoseStream(): Promise<boolean>;
}
