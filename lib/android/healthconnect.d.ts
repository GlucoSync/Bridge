/**
 * Android Health Connect implementation for GlucoSync Bridge
 */
import { GlucoseReading, GlucoseSyncOptions, GlucoseFetchOptions, AuthorizationStatus, PlatformBridge } from "../types";
export declare class AndroidHealthConnectBridge implements PlatformBridge {
    private options;
    private initialized;
    private permissions;
    constructor(options: GlucoseSyncOptions);
    /**
     * Initialize Health Connect
     */
    initialize(): Promise<boolean>;
    /**
     * Request permissions to access Health Connect data
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
     * Maps a Health Connect reading to our standard GlucoseReading format
     */
    private mapHealthConnectReadingToGlucoseReading;
}
