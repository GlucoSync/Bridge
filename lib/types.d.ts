/**
 * Type definitions for GlucoSync Bridge
 */
/**
 * Units for blood glucose measurements
 */
export declare enum GlucoseUnit {
    MGDL = "mg/dL",// Milligrams per deciliter
    MMOL = "mmol/L"
}
/**
 * Authorization status for health data access
 */
export declare enum AuthorizationStatus {
    NOT_DETERMINED = "notDetermined",
    DENIED = "denied",
    AUTHORIZED = "authorized",
    PARTIALLY_AUTHORIZED = "partiallyAuthorized"
}
/**
 * A blood glucose reading with metadata
 */
export interface GlucoseReading {
    /**
     * Unique identifier for the reading
     */
    id: string;
    /**
     * The glucose value
     */
    value: number;
    /**
     * The unit of measurement
     */
    unit: GlucoseUnit;
    /**
     * Timestamp of the reading (ISO string)
     */
    timestamp: string;
    /**
     * Source of the reading (device or app name)
     */
    source?: string;
    /**
     * Whether the reading was taken while fasting
     */
    isFasting?: boolean;
    /**
     * Reading type if available (e.g., manual, continuous, etc.)
     */
    readingType?: string;
    /**
     * Any additional metadata
     */
    metadata?: Record<string, any>;
}
/**
 * Options for configuring the GlucoseSyncBridge
 */
export interface GlucoseSyncOptions {
    /**
     * Default unit to return glucose values in
     */
    defaultUnit?: GlucoseUnit;
    /**
     * Whether to automatically initialize on creation
     */
    autoInitialize?: boolean;
    /**
     * Callback for handling errors
     */
    onError?: (error: Error) => void;
}
/**
 * Options for fetching glucose readings
 */
export interface GlucoseFetchOptions {
    /**
     * Start date for fetching readings (ISO string or Date object)
     */
    startDate?: string | Date;
    /**
     * End date for fetching readings (ISO string or Date object)
     */
    endDate?: string | Date;
    /**
     * Maximum number of readings to fetch
     */
    limit?: number;
    /**
     * Sort order for results
     */
    ascending?: boolean;
    /**
     * Unit to return values in (overrides default)
     */
    unit?: GlucoseUnit;
}
/**
 * Interface for platform-specific bridge implementations
 */
export interface PlatformBridge {
    initialize(): Promise<boolean>;
    requestAuthorization(): Promise<AuthorizationStatus>;
    getAuthorizationStatus(): Promise<AuthorizationStatus>;
    getLatestGlucoseReading(): Promise<GlucoseReading | null>;
    getGlucoseReadings(options: GlucoseFetchOptions): Promise<GlucoseReading[]>;
}
