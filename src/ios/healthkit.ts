/**
 * iOS HealthKit implementation for GlucoSync Bridge
 */

import { NativeModules, NativeEventEmitter } from "react-native";
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
} from "react-native-health";
import {
  GlucoseReading,
  GlucoseSyncOptions,
  GlucoseFetchOptions,
  GlucoseUnit,
  AuthorizationStatus,
  PlatformBridge,
  GlucoseStreamOptions,
} from "../types";
import { convertDate, formatISODate } from "../utils/date";
import { convertGlucoseValue } from "../utils/units";
import { PermissionDeniedError, InitializationError } from "../errors";

// Create a custom event emitter for handling real-time updates
const healthKitEmitter = new NativeEventEmitter(
  NativeModules.RCTAppleHealthKit
);

export class IOSHealthKitBridge implements PlatformBridge {
  private options: GlucoseSyncOptions;
  private initialized = false;
  private healthKitOptions: HealthKitPermissions;

  constructor(options: GlucoseSyncOptions) {
    this.options = options;

    // Define the permissions we need for HealthKit
    this.healthKitOptions = {
      permissions: {
        read: [AppleHealthKit.Constants.Permissions.BloodGlucose],
        write: [], // We don't need write permissions
      },
    };
  }

  /**
   * Initialize HealthKit connection
   */
  async initialize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      AppleHealthKit.initHealthKit(
        this.healthKitOptions,
        (error: string, result: any) => {
          if (error) {
            reject(
              new InitializationError(
                `HealthKit initialization failed: ${error}`
              )
            );
            return;
          }

          this.initialized = true;
          resolve(true);
        }
      );
    });
  }

  /**
   * Request authorization to access HealthKit data
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      AppleHealthKit.getAuthStatus(
        this.healthKitOptions,
        (err: any, results: any) => {
          if (err) {
            reject(new Error(`Failed to get authorization status: ${err}`));
            return;
          }

          // Check if we have permission for blood glucose
          const glucosePermission = results.permissions.read.find(
            (p: any) =>
              p.permission === AppleHealthKit.Constants.Permissions.BloodGlucose
          );

          if (!glucosePermission || !glucosePermission.granted) {
            resolve(AuthorizationStatus.DENIED);
            return;
          }

          resolve(AuthorizationStatus.AUTHORIZED);
        }
      );
    });
  }

  /**
   * Get current authorization status
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    if (!this.initialized) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      AppleHealthKit.getAuthStatus(
        this.healthKitOptions,
        (err: any, results: any) => {
          if (err) {
            reject(new Error(`Failed to get authorization status: ${err}`));
            return;
          }

          // Check if we have permission for blood glucose
          const glucosePermission = results.permissions.read.find(
            (p: any) =>
              p.permission === AppleHealthKit.Constants.Permissions.BloodGlucose
          );

          if (!glucosePermission) {
            resolve(AuthorizationStatus.NOT_DETERMINED);
          } else if (glucosePermission.granted) {
            resolve(AuthorizationStatus.AUTHORIZED);
          } else {
            resolve(AuthorizationStatus.DENIED);
          }
        }
      );
    });
  }

  /**
   * Get latest glucose reading
   */
  async getLatestGlucoseReading(): Promise<GlucoseReading | null> {
    const auth = await this.getAuthorizationStatus();
    if (auth !== AuthorizationStatus.AUTHORIZED) {
      throw new PermissionDeniedError("HealthKit access not authorized");
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const options = {
      startDate: formatISODate(oneWeekAgo),
      limit: 1,
      ascending: false, // Most recent first
    };

    return new Promise((resolve, reject) => {
      AppleHealthKit.getBloodGlucoseSamples(
        options,
        (err: string, results: any[]) => {
          if (err) {
            reject(new Error(`Failed to get latest glucose reading: ${err}`));
            return;
          }

          if (!results || results.length === 0) {
            resolve(null);
            return;
          }

          const latestReading = results[0];
          resolve(this.mapHealthKitReadingToGlucoseReading(latestReading));
        }
      );
    });
  }

  /**
   * Get glucose readings within a specified date range
   */
  async getGlucoseReadings(
    options: GlucoseFetchOptions = {}
  ): Promise<GlucoseReading[]> {
    const auth = await this.getAuthorizationStatus();
    if (auth !== AuthorizationStatus.AUTHORIZED) {
      throw new PermissionDeniedError("HealthKit access not authorized");
    }

    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    const healthKitOptions = {
      startDate: options.startDate
        ? formatISODate(convertDate(options.startDate))
        : formatISODate(defaultStartDate),
      endDate: options.endDate
        ? formatISODate(convertDate(options.endDate))
        : formatISODate(new Date()),
      limit: options.limit || 100,
      ascending: options.ascending !== undefined ? options.ascending : false,
    };

    return new Promise((resolve, reject) => {
      AppleHealthKit.getBloodGlucoseSamples(
        healthKitOptions,
        (err: string, results: any[]) => {
          if (err) {
            reject(new Error(`Failed to get glucose readings: ${err}`));
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          const readings = results.map((reading) =>
            this.mapHealthKitReadingToGlucoseReading(reading)
          );
          resolve(readings);
        }
      );
    });
  }

  /**
   * Maps a HealthKit reading to our standard GlucoseReading format
   */
  private mapHealthKitReadingToGlucoseReading(reading: any): GlucoseReading {
    // HealthKit stores blood glucose in mg/dL
    const sourceUnit = GlucoseUnit.MGDL;
    const targetUnit = this.options.defaultUnit || GlucoseUnit.MGDL;

    // Convert value if necessary
    const value = convertGlucoseValue(reading.value, sourceUnit, targetUnit);

    return {
      id: reading.id || reading.uuid || `healthkit-${reading.startDate}`,
      value,
      unit: targetUnit,
      timestamp: reading.startDate,
      source: reading.sourceName || reading.source || "HealthKit",
      isFasting: reading.metadata?.HKWasUserEntered === true,
      readingType: reading.metadata?.HKBloodGlucoseMealTime ? "meal" : "manual",
      metadata: reading.metadata || {},
    };
  }

  /**
   * Check if real-time glucose streaming is supported on iOS
   * Currently not supported, but may be added in future versions
   */
  isStreamingSupported(): boolean {
    return false; // iOS HealthKit doesn't support real-time streaming like Android
  }

  /**
   * Start real-time glucose streaming (not supported on iOS)
   */
  async startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean> {
    throw new Error(
      "Real-time glucose streaming is not supported on iOS HealthKit"
    );
  }

  /**
   * Stop real-time glucose streaming (not supported on iOS)
   */
  async stopGlucoseStream(): Promise<boolean> {
    throw new Error(
      "Real-time glucose streaming is not supported on iOS HealthKit"
    );
  }
}
