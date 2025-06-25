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

import { Platform } from "react-native";
import {
  GlucoseReading,
  GlucoseSyncOptions,
  GlucoseFetchOptions,
  GlucoseUnit,
  AuthorizationStatus,
  GlucoseStreamOptions,
} from "./types";
import { isIOS, isAndroid } from "./platform";
import { IOSHealthKitBridge } from "./ios/healthkit";
import { AndroidHealthConnectBridge } from "./android/healthconnect";
import {
  InvalidPlatformError,
  PermissionDeniedError,
  InitializationError,
} from "./errors";

/**
 * GlucoseSyncBridge - Main class for interfacing with health platforms
 *
 * This class provides a unified API for accessing blood glucose data
 * from Apple HealthKit (iOS) and Google Health Connect (Android).
 */
export class GlucoseSyncBridge {
  private platform: "ios" | "android" | "unknown";
  private bridge: IOSHealthKitBridge | AndroidHealthConnectBridge | null = null;
  private initialized = false;
  private options: GlucoseSyncOptions;

  /**
   * Creates a new instance of the GlucoseSyncBridge
   *
   * @param options Configuration options
   */
  constructor(options: GlucoseSyncOptions = {}) {
    this.options = {
      defaultUnit: GlucoseUnit.MGDL,
      autoInitialize: true,
      ...options,
    };

    // Determine platform
    if (isIOS()) {
      this.platform = "ios";
      this.bridge = new IOSHealthKitBridge(this.options);
    } else if (isAndroid()) {
      this.platform = "android";
      this.bridge = new AndroidHealthConnectBridge(this.options);
    } else {
      this.platform = "unknown";
      this.bridge = null;
    }

    // Auto-initialize if requested
    if (this.options.autoInitialize) {
      this.initialize().catch((err) => {
        console.warn("GlucoseSyncBridge: Auto-initialization failed", err);
      });
    }
  }

  /**
   * Initializes the platform-specific bridge
   * Must be called before any other methods if autoInitialize is false
   *
   * @returns Promise that resolves when initialization is complete
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (!this.bridge) {
      throw new InvalidPlatformError("Unsupported platform");
    }

    const result = await this.bridge.initialize();
    this.initialized = result;
    return result;
  }

  /**
   * Requests necessary permissions to access health data
   *
   * @returns Promise that resolves to authorization status
   */
  async requestAuthorization(): Promise<AuthorizationStatus> {
    this.ensureInitialized();
    return await this.bridge!.requestAuthorization();
  }

  /**
   * Gets the current authorization status
   *
   * @returns Promise that resolves to current authorization status
   */
  async getAuthorizationStatus(): Promise<AuthorizationStatus> {
    this.ensureInitialized();
    return await this.bridge!.getAuthorizationStatus();
  }

  /**
   * Fetches the most recent blood glucose reading
   *
   * @returns Promise that resolves to the most recent glucose reading or null if none found
   */
  async getLatestGlucoseReading(): Promise<GlucoseReading | null> {
    this.ensureInitialized();
    return await this.bridge!.getLatestGlucoseReading();
  }

  /**
   * Fetches blood glucose readings within a specified time range
   *
   * @param options Options for fetching glucose readings
   * @returns Promise that resolves to an array of glucose readings
   */
  async getGlucoseReadings(
    options: GlucoseFetchOptions = {}
  ): Promise<GlucoseReading[]> {
    this.ensureInitialized();
    return await this.bridge!.getGlucoseReadings(options);
  }

  /**
   * Check if real-time glucose streaming is supported on current platform
   *
   * @returns True if streaming is supported, false otherwise
   */
  isStreamingSupported(): boolean {
    if (!this.bridge) {
      return false;
    }

    return this.bridge.isStreamingSupported
      ? this.bridge.isStreamingSupported()
      : false;
  }

  /**
   * Start real-time glucose streaming (Android only - xDrip+ and LibreLink support)
   *
   * @param options Streaming configuration options
   * @returns Promise that resolves when streaming starts successfully
   */
  async startGlucoseStream(options: GlucoseStreamOptions): Promise<boolean> {
    this.ensureInitialized();

    if (!this.bridge!.startGlucoseStream) {
      throw new Error("Glucose streaming is not supported on this platform");
    }

    return await this.bridge!.startGlucoseStream(options);
  }

  /**
   * Stop real-time glucose streaming
   *
   * @returns Promise that resolves when streaming stops successfully
   */
  async stopGlucoseStream(): Promise<boolean> {
    this.ensureInitialized();

    if (!this.bridge!.stopGlucoseStream) {
      throw new Error("Glucose streaming is not supported on this platform");
    }

    return await this.bridge!.stopGlucoseStream();
  }

  /**
   * Gets platform name
   *
   * @returns The current platform: 'ios', 'android', or 'unknown'
   */
  getPlatform(): "ios" | "android" | "unknown" {
    return this.platform;
  }

  /**
   * Ensures the bridge is initialized before performing operations
   *
   * @throws InitializationError if the bridge is not initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.bridge) {
      throw new InitializationError(
        "GlucoseSyncBridge not initialized. Call initialize() first."
      );
    }
  }
}

// Export types and constants
export * from "./types";
export * from "./errors";

// Create default instance for simple usage
export const GlucoseSync = new GlucoseSyncBridge();

// Default export for ESM
export default GlucoseSyncBridge;
