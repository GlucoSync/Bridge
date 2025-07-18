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
 * Callback function for real-time glucose readings
 */
export type GlucoseStreamCallback = (reading: GlucoseReading) => void;
/**
 * Options for configuring real-time glucose streaming
 */
export interface GlucoseStreamOptions {
    /**
     * Enable xDrip+ Inter-App broadcasts (Android only)
     */
    enableXDripStream?: boolean;
    /**
     * Enable LibreLink streaming through Health Connect (Android only)
     */
    enableLibreLinkStream?: boolean;
    /**
     * Callback for new glucose readings
     */
    onReading?: GlucoseStreamCallback;
    /**
     * Callback for stream errors
     */
    onError?: (error: Error) => void;
    /**
     * Minimum interval between readings in milliseconds (default: 60000 = 1 minute)
     */
    minInterval?: number;
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
    startGlucoseStream?(options: GlucoseStreamOptions): Promise<boolean>;
    stopGlucoseStream?(): Promise<boolean>;
    isStreamingSupported?(): boolean;
    scanForBluetoothDevices?(options: BluetoothScanOptions): Promise<BluetoothGlucoseMeter[]>;
    connectToBluetoothDevice?(deviceId: string, options: BluetoothConnectionOptions): Promise<boolean>;
    disconnectBluetoothDevice?(deviceId: string): Promise<boolean>;
    syncBluetoothDevice?(deviceId: string): Promise<GlucoseReading[]>;
    getConnectedBluetoothDevices?(): Promise<BluetoothGlucoseMeter[]>;
    isBluetoothSupported?(): boolean;
}
/**
 * Bluetooth glucose meter connection states
 */
export declare enum BluetoothConnectionState {
    DISCONNECTED = "disconnected",
    SCANNING = "scanning",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    SYNCING = "syncing",
    ERROR = "error"
}
/**
 * Bluetooth glucose meter device information
 */
export interface BluetoothGlucoseMeter {
    /**
     * Device ID
     */
    id: string;
    /**
     * Device name
     */
    name: string;
    /**
     * Manufacturer name
     */
    manufacturer?: string;
    /**
     * Model number
     */
    model?: string;
    /**
     * Connection state
     */
    connectionState: BluetoothConnectionState;
    /**
     * Signal strength (RSSI)
     */
    rssi?: number;
    /**
     * Battery level (0-100)
     */
    batteryLevel?: number;
    /**
     * Last sync timestamp
     */
    lastSync?: string;
    /**
     * Whether device supports real-time streaming
     */
    supportsStreaming?: boolean;
}
/**
 * Bluetooth scan options
 */
export interface BluetoothScanOptions {
    /**
     * Scan timeout in milliseconds (default: 10000)
     */
    timeout?: number;
    /**
     * Whether to scan for specific device types only
     */
    deviceFilter?: string[];
    /**
     * Callback for discovered devices
     */
    onDeviceFound?: (device: BluetoothGlucoseMeter) => void;
    /**
     * Callback for scan state changes
     */
    onStateChange?: (state: BluetoothConnectionState) => void;
}
/**
 * Bluetooth connection options
 */
export interface BluetoothConnectionOptions {
    /**
     * Connection timeout in milliseconds (default: 30000)
     */
    timeout?: number;
    /**
     * Whether to automatically sync after connection
     */
    autoSync?: boolean;
    /**
     * Whether to keep connection alive for streaming
     */
    keepAlive?: boolean;
    /**
     * Callback for connection state changes
     */
    onStateChange?: (state: BluetoothConnectionState) => void;
    /**
     * Callback for data sync progress
     */
    onSyncProgress?: (progress: number, total: number) => void;
}
/**
 * Mock data configuration for testing
 */
export interface MockBluetoothOptions {
    /**
     * Enable mock mode for testing
     */
    enableMockMode?: boolean;
    /**
     * Number of mock devices to generate
     */
    mockDeviceCount?: number;
    /**
     * Number of mock readings to generate per device
     */
    mockReadingCount?: number;
    /**
     * Mock data generation seed for reproducible tests
     */
    mockSeed?: number;
    /**
     * Simulate connection delays in mock mode
     */
    simulateDelays?: boolean;
    /**
     * Mock connection failure rate (0-1)
     */
    mockFailureRate?: number;
}
