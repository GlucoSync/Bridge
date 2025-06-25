/**
 * Android Health Connect implementation for GlucoSync Bridge
 */

import { NativeModules, NativeEventEmitter } from "react-native";
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
    // Health Connect stores blood glucose in mmol/L
    const sourceUnit = GlucoseUnit.MMOL;
    const targetUnit = this.options.defaultUnit || GlucoseUnit.MGDL;

    // Convert value if necessary
    const value = convertGlucoseValue(reading.level, sourceUnit, targetUnit);

    return {
      id: reading.metadata?.id || `healthconnect-${reading.time}`,
      value,
      unit: targetUnit,
      timestamp: reading.time,
      source: reading.metadata?.dataOrigin || "Health Connect",
      isFasting: reading.specimenSource === "interstitial_fluid",
      readingType: reading.relationToMeal || "unknown",
      metadata: reading.metadata || {},
    };
  }
}
