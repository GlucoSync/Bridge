/**
 * Android Health Connect implementation for GlucoSync Bridge
 * Includes support for LibreLink data and xDrip+ Inter-App streaming
 */
import { GlucoseReading, GlucoseSyncOptions, GlucoseFetchOptions, AuthorizationStatus, PlatformBridge, GlucoseStreamOptions, BluetoothGlucoseMeter, BluetoothScanOptions, BluetoothConnectionOptions } from "../types";
export declare class AndroidHealthConnectBridge implements PlatformBridge {
    private options;
    private initialized;
    private permissions;
    private isStreaming;
    private streamOptions?;
    private xdripEventEmitter?;
    private lastReadingTimestamp?;
    private streamPollingInterval?;
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
    /**
     * Check if real-time glucose streaming is supported on this platform
     */
    isStreamingSupported(): boolean;
    /**
     * Start real-time glucose streaming from multiple sources
     */
    startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean>;
    /**
     * Stop real-time glucose streaming
     */
    stopGlucoseStream(): Promise<boolean>;
    /**
     * Start xDrip+ Inter-App broadcast receiver
     */
    private startXDripStream;
    /**
     * Stop xDrip+ Inter-App broadcast receiver
     */
    private stopXDripStream;
    /**
     * Handle incoming xDrip+ glucose reading
     */
    private handleXDripReading;
    /**
     * Start Health Connect polling for LibreLink data
     */
    private startHealthConnectPolling;
    /**
     * Stop Health Connect polling
     */
    private stopHealthConnectPolling;
    /**
     * Poll Health Connect for new glucose readings
     */
    private pollHealthConnectForNewReadings;
    scanForBluetoothDevices?(options: BluetoothScanOptions): Promise<BluetoothGlucoseMeter[]>;
    connectToBluetoothDevice?(deviceId: string, options: BluetoothConnectionOptions): Promise<boolean>;
    disconnectBluetoothDevice?(deviceId: string): Promise<boolean>;
    syncBluetoothDevice?(deviceId: string): Promise<GlucoseReading[]>;
    getConnectedBluetoothDevices?(): Promise<BluetoothGlucoseMeter[]>;
    isBluetoothSupported?(): boolean;
}
