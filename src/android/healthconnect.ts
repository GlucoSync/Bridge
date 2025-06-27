/**
 * Android Health Connect implementation for GlucoSync Bridge
 * Includes support for LibreLink data and xDrip+ Inter-App streaming
 */

import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
} from "react-native";
import HealthConnect, {
  Permission,
  ReadRecordsOptions,
  ReadRecordsResult,
  initialize,
  getSdkStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
} from "react-native-health-connect";
import type { TimeRangeFilter } from "react-native-health-connect/lib/typescript/types/base.types";
import {
  GlucoseReading,
  GlucoseSyncOptions,
  GlucoseFetchOptions,
  GlucoseUnit,
  AuthorizationStatus,
  PlatformBridge,
  GlucoseStreamOptions,
  GlucoseStreamCallback,
  BluetoothGlucoseMeter,
  BluetoothScanOptions,
  BluetoothConnectionOptions,
} from "../types";
import { convertDate, formatISODate } from "../utils/date";
import { convertGlucoseValue } from "../utils/units";
import { PermissionDeniedError, InitializationError } from "../errors";

export class AndroidHealthConnectBridge implements PlatformBridge {
  private options: GlucoseSyncOptions;
  private initialized = false;
  private permissions: Permission[] = [
    { accessType: "read", recordType: "BloodGlucose" },
  ];

  // Streaming support
  private isStreaming = false;
  private streamOptions?: GlucoseStreamOptions;
  private xdripEventEmitter?: NativeEventEmitter;
  private lastReadingTimestamp?: string;
  private streamPollingInterval?: NodeJS.Timeout;

  constructor(options: GlucoseSyncOptions) {
    this.options = options;
  }

  /**
   * Initialize Health Connect
   */
  async initialize(): Promise<boolean> {
    try {
      // Initialize the Health Connect SDK
      const initialized = await initialize();

      if (!initialized) {
        throw new InitializationError(
          "Failed to initialize Health Connect SDK"
        );
      }

      this.initialized = true;
      return true;
    } catch (error: any) {
      throw new InitializationError(
        `Failed to initialize Health Connect: ${error.message}`
      );
    }
  }

  /**
   * Request permissions to access Health Connect data
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Request permissions
      const grantedPermissions = await requestPermission(this.permissions);

      // Check if our required permission was granted
      const hasBloodGlucosePermission = grantedPermissions.some(
        (permission) =>
          permission.recordType === "BloodGlucose" &&
          permission.accessType === "read"
      );

      if (hasBloodGlucosePermission) {
        return AuthorizationStatus.AUTHORIZED;
      } else {
        return AuthorizationStatus.DENIED;
      }
    } catch (error: any) {
      throw new Error(`Failed to request permissions: ${error.message}`);
    }
  }

  /**
   * Get current authorization status
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Check current permissions
      const grantedPermissions = await getGrantedPermissions();

      // Check if our required permission is in the granted permissions
      const hasBloodGlucosePermission = grantedPermissions.some(
        (permission: Permission) =>
          permission.recordType === "BloodGlucose" &&
          permission.accessType === "read"
      );

      if (hasBloodGlucosePermission) {
        return AuthorizationStatus.AUTHORIZED;
      } else {
        // Since getRequestedPermissions doesn't exist, we'll treat this as not determined
        return AuthorizationStatus.NOT_DETERMINED;
      }
    } catch (error: any) {
      throw new Error(`Failed to get authorization status: ${error.message}`);
    }
  }

  /**
   * Get latest glucose reading
   */
  async getLatestGlucoseReading(): Promise<GlucoseReading | null> {
    const auth = await this.getAuthorizationStatus();
    if (auth !== AuthorizationStatus.AUTHORIZED) {
      throw new PermissionDeniedError("Health Connect access not authorized");
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    try {
      // Set up time range filter for the past week
      const timeRangeFilter: TimeRangeFilter = {
        operator: "between",
        startTime: formatISODate(oneWeekAgo),
        endTime: formatISODate(new Date()),
      };

      // Get blood glucose records
      const response = await readRecords("BloodGlucose", {
        timeRangeFilter,
        ascendingOrder: false, // Most recent first
        pageSize: 1,
      });

      if (!response || !response.records || response.records.length === 0) {
        return null;
      }

      // Map the first (most recent) record
      return this.mapHealthConnectReadingToGlucoseReading(response.records[0]);
    } catch (error: any) {
      throw new Error(`Failed to get latest glucose reading: ${error.message}`);
    }
  }

  /**
   * Get glucose readings within a specified date range
   */
  async getGlucoseReadings(
    options: GlucoseFetchOptions = {}
  ): Promise<GlucoseReading[]> {
    const auth = await this.getAuthorizationStatus();
    if (auth !== AuthorizationStatus.AUTHORIZED) {
      throw new PermissionDeniedError("Health Connect access not authorized");
    }

    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    try {
      // Set up time range filter
      const timeRangeFilter: TimeRangeFilter = {
        operator: "between",
        startTime: options.startDate
          ? formatISODate(convertDate(options.startDate))
          : formatISODate(defaultStartDate),
        endTime: options.endDate
          ? formatISODate(convertDate(options.endDate))
          : formatISODate(new Date()),
      };

      // Get blood glucose records
      const response = await readRecords("BloodGlucose", {
        timeRangeFilter,
        ascendingOrder:
          options.ascending !== undefined ? options.ascending : false,
        pageSize: options.limit || 100,
      });

      if (!response || !response.records || response.records.length === 0) {
        return [];
      }

      // Map records to our standard format
      return response.records.map((record) =>
        this.mapHealthConnectReadingToGlucoseReading(record)
      );
    } catch (error: any) {
      throw new Error(`Failed to get glucose readings: ${error.message}`);
    }
  }

  /**
   * Maps a Health Connect reading to our standard GlucoseReading format
   */
  private mapHealthConnectReadingToGlucoseReading(
    reading: any
  ): GlucoseReading {
    // Health Connect stores blood glucose with units in the result
    const targetUnit = this.options.defaultUnit || GlucoseUnit.MGDL;

    // Get the glucose value - Health Connect returns results with unit conversions
    let value: number;
    let sourceUnit: GlucoseUnit;

    if (reading.level && typeof reading.level === "object") {
      // New format with unit conversions
      if (targetUnit === GlucoseUnit.MGDL) {
        value =
          reading.level.inMilligramsPerDeciliter ||
          reading.level.inMillimolesPerLiter * 18.018;
        sourceUnit = GlucoseUnit.MGDL;
      } else {
        value =
          reading.level.inMillimolesPerLiter ||
          reading.level.inMilligramsPerDeciliter / 18.018;
        sourceUnit = GlucoseUnit.MMOL;
      }
    } else {
      // Fallback for older format or raw values
      value = reading.level || reading.value;
      sourceUnit = GlucoseUnit.MMOL; // Health Connect default
      value = convertGlucoseValue(value, sourceUnit, targetUnit);
    }

    // Map specimen source to readable format
    const getSpecimenSource = (source: number): string => {
      switch (source) {
        case 1:
          return "interstitial_fluid";
        case 2:
          return "capillary_blood";
        case 3:
          return "plasma";
        case 4:
          return "serum";
        case 5:
          return "tears";
        case 6:
          return "whole_blood";
        default:
          return "unknown";
      }
    };

    // Map relation to meal
    const getRelationToMeal = (relation: number): string => {
      switch (relation) {
        case 1:
          return "general";
        case 2:
          return "fasting";
        case 3:
          return "before_meal";
        case 4:
          return "after_meal";
        default:
          return "unknown";
      }
    };

    return {
      id: reading.metadata?.id || `healthconnect-${reading.time}`,
      value,
      unit: targetUnit,
      timestamp: reading.time,
      source: reading.metadata?.dataOrigin || "Health Connect",
      isFasting: reading.specimenSource === 2 || reading.relationToMeal === 2, // capillary_blood or fasting
      readingType: getRelationToMeal(reading.relationToMeal) || "unknown",
      metadata: {
        ...reading.metadata,
        specimenSource: getSpecimenSource(reading.specimenSource),
        relationToMeal: getRelationToMeal(reading.relationToMeal),
        rawReading: reading,
      },
    };
  }

  /**
   * Check if real-time glucose streaming is supported on this platform
   */
  isStreamingSupported(): boolean {
    return true; // Android supports both xDrip and Health Connect streaming
  }

  /**
   * Start real-time glucose streaming from multiple sources
   */
  async startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean> {
    if (this.isStreaming) {
      throw new Error("Glucose streaming is already active");
    }

    if (!this.initialized) {
      await this.initialize();
    }

    const auth = await this.getAuthorizationStatus();
    if (auth !== AuthorizationStatus.AUTHORIZED) {
      throw new PermissionDeniedError("Health Connect access not authorized");
    }

    this.streamOptions = options;
    this.isStreaming = true;

    try {
      // Start xDrip Inter-App streaming if enabled
      if (options.enableXDripStream) {
        await this.startXDripStream();
      }

      // Start LibreLink/Health Connect polling if enabled
      if (options.enableLibreLinkStream) {
        await this.startHealthConnectPolling();
      }

      return true;
    } catch (error: any) {
      this.isStreaming = false;
      throw new Error(`Failed to start glucose streaming: ${error.message}`);
    }
  }

  /**
   * Stop real-time glucose streaming
   */
  async stopGlucoseStream(): Promise<boolean> {
    if (!this.isStreaming) {
      return true;
    }

    try {
      // Stop xDrip streaming
      this.stopXDripStream();

      // Stop Health Connect polling
      this.stopHealthConnectPolling();

      this.isStreaming = false;
      this.streamOptions = undefined;
      this.lastReadingTimestamp = undefined;

      return true;
    } catch (error: any) {
      throw new Error(`Failed to stop glucose streaming: ${error.message}`);
    }
  }

  /**
   * Start xDrip+ Inter-App broadcast receiver
   */
  private async startXDripStream(): Promise<void> {
    try {
      // Listen for xDrip+ broadcasts using DeviceEventEmitter
      DeviceEventEmitter.addListener("xDripGlucoseReading", (data) => {
        this.handleXDripReading(data);
      });

      // Register with native module to start listening for xDrip broadcasts
      if (NativeModules.XDripReceiver) {
        await NativeModules.XDripReceiver.startListening();
      } else {
        console.warn(
          "XDripReceiver native module not found. xDrip streaming may not work."
        );
      }
    } catch (error: any) {
      throw new Error(`Failed to start xDrip streaming: ${error.message}`);
    }
  }

  /**
   * Stop xDrip+ Inter-App broadcast receiver
   */
  private stopXDripStream(): void {
    try {
      DeviceEventEmitter.removeAllListeners("xDripGlucoseReading");

      if (NativeModules.XDripReceiver) {
        NativeModules.XDripReceiver.stopListening();
      }
    } catch (error: any) {
      console.warn("Error stopping xDrip streaming:", error);
    }
  }

  /**
   * Handle incoming xDrip+ glucose reading
   */
  private handleXDripReading(data: any): void {
    try {
      if (!this.streamOptions?.onReading) {
        return;
      }

      // Parse xDrip data format
      const timestamp = new Date(data.timestamp || Date.now()).toISOString();

      // Check if this is a duplicate reading
      if (this.lastReadingTimestamp === timestamp) {
        return;
      }

      // Check minimum interval
      if (this.lastReadingTimestamp && this.streamOptions.minInterval) {
        const lastTime = new Date(this.lastReadingTimestamp).getTime();
        const currentTime = new Date(timestamp).getTime();
        if (currentTime - lastTime < this.streamOptions.minInterval) {
          return;
        }
      }

      const targetUnit = this.options.defaultUnit || GlucoseUnit.MGDL;
      let value = data.value || data.glucose || data.bg;

      // xDrip usually sends data in mg/dL, but check the units
      const sourceUnit =
        data.units === "mmol/L" ? GlucoseUnit.MMOL : GlucoseUnit.MGDL;
      value = convertGlucoseValue(value, sourceUnit, targetUnit);

      const reading: GlucoseReading = {
        id: `xdrip-${data.timestamp || Date.now()}`,
        value,
        unit: targetUnit,
        timestamp,
        source: data.source || "xDrip+",
        isFasting: false, // xDrip doesn't typically provide this info
        readingType: "continuous",
        metadata: {
          raw: data.raw || null,
          filtered: data.filtered || null,
          slope: data.slope || null,
          direction: data.direction || null,
          noise: data.noise || null,
          ...data,
        },
      };

      this.lastReadingTimestamp = timestamp;
      this.streamOptions.onReading(reading);
    } catch (error: any) {
      if (this.streamOptions?.onError) {
        this.streamOptions.onError(
          new Error(`Error processing xDrip reading: ${error.message}`)
        );
      }
    }
  }

  /**
   * Start Health Connect polling for LibreLink data
   */
  private async startHealthConnectPolling(): Promise<void> {
    const pollInterval = this.streamOptions?.minInterval || 60000; // Default 1 minute

    this.streamPollingInterval = setInterval(async () => {
      try {
        await this.pollHealthConnectForNewReadings();
      } catch (error: any) {
        if (this.streamOptions?.onError) {
          this.streamOptions.onError(
            new Error(`Health Connect polling error: ${error.message}`)
          );
        }
      }
    }, pollInterval);

    // Do an initial poll
    await this.pollHealthConnectForNewReadings();
  }

  /**
   * Stop Health Connect polling
   */
  private stopHealthConnectPolling(): void {
    if (this.streamPollingInterval) {
      clearInterval(this.streamPollingInterval);
      this.streamPollingInterval = undefined;
    }
  }

  /**
   * Poll Health Connect for new glucose readings
   */
  private async pollHealthConnectForNewReadings(): Promise<void> {
    try {
      const now = new Date();
      const lookbackMinutes = this.streamOptions?.minInterval
        ? Math.ceil(this.streamOptions.minInterval / 60000)
        : 5; // Default 5 minutes lookback

      const startTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);

      const timeRangeFilter: TimeRangeFilter = {
        operator: "between",
        startTime: this.lastReadingTimestamp || formatISODate(startTime),
        endTime: formatISODate(now),
      };

      const response = await readRecords("BloodGlucose", {
        timeRangeFilter,
        ascendingOrder: true, // Get chronological order
        pageSize: 50,
        dataOriginFilter: ["com.freestylelibre.app"], // LibreLink app
      });

      if (response?.records?.length > 0) {
        for (const record of response.records) {
          // Skip if we've already processed this reading
          if (
            this.lastReadingTimestamp &&
            record.time <= this.lastReadingTimestamp
          ) {
            continue;
          }

          const reading = this.mapHealthConnectReadingToGlucoseReading(record);

          // Mark as LibreLink source if from LibreLink app
          if (record.metadata?.dataOrigin === "com.freestylelibre.app") {
            reading.source = "LibreLink";
            reading.readingType = "freestyle_libre";
          }

          this.lastReadingTimestamp = reading.timestamp;

          if (this.streamOptions?.onReading) {
            this.streamOptions.onReading(reading);
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Failed to poll Health Connect: ${error.message}`);
    }
  }

  // Bluetooth methods (delegate to main bridge Bluetooth manager)
  // These are implemented in the main GlucoseSyncBridge class

  async scanForBluetoothDevices?(
    options: BluetoothScanOptions
  ): Promise<BluetoothGlucoseMeter[]> {
    throw new Error(
      "Bluetooth scanning should be handled by the main GlucoseSyncBridge instance"
    );
  }

  async connectToBluetoothDevice?(
    deviceId: string,
    options: BluetoothConnectionOptions
  ): Promise<boolean> {
    throw new Error(
      "Bluetooth connection should be handled by the main GlucoseSyncBridge instance"
    );
  }

  async disconnectBluetoothDevice?(deviceId: string): Promise<boolean> {
    throw new Error(
      "Bluetooth disconnection should be handled by the main GlucoseSyncBridge instance"
    );
  }

  async syncBluetoothDevice?(deviceId: string): Promise<GlucoseReading[]> {
    throw new Error(
      "Bluetooth sync should be handled by the main GlucoseSyncBridge instance"
    );
  }

  async getConnectedBluetoothDevices?(): Promise<BluetoothGlucoseMeter[]> {
    throw new Error(
      "Bluetooth device listing should be handled by the main GlucoseSyncBridge instance"
    );
  }

  isBluetoothSupported?(): boolean {
    // Bluetooth support is available on Android, but handled by main bridge
    return true;
  }
}
