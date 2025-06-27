"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlucoseSync = exports.GlucoseSyncBridge = void 0;
const types_1 = require("./types");
const platform_1 = require("./platform");
const healthkit_1 = require("./ios/healthkit");
const healthconnect_1 = require("./android/healthconnect");
const glucose_meter_1 = require("./bluetooth/glucose-meter");
const errors_1 = require("./errors");
/**
 * GlucoseSyncBridge - Main class for interfacing with health platforms
 *
 * This class provides a unified API for accessing blood glucose data
 * from Apple HealthKit (iOS) and Google Health Connect (Android).
 */
class GlucoseSyncBridge {
    /**
     * Creates a new instance of the GlucoseSyncBridge
     *
     * @param options Configuration options including Bluetooth mock options
     */
    constructor(options = {}) {
        this.bridge = null;
        this.bluetoothManager = null;
        this.initialized = false;
        this.options = {
            defaultUnit: types_1.GlucoseUnit.MGDL,
            autoInitialize: true,
            ...options,
        };
        // Determine platform
        if ((0, platform_1.isIOS)()) {
            this.platform = "ios";
            this.bridge = new healthkit_1.IOSHealthKitBridge(this.options);
        }
        else if ((0, platform_1.isAndroid)()) {
            this.platform = "android";
            this.bridge = new healthconnect_1.AndroidHealthConnectBridge(this.options);
        }
        else {
            this.platform = "unknown";
            this.bridge = null;
        }
        // Initialize Bluetooth manager (works on all platforms with proper fallbacks)
        this.bluetoothManager = new glucose_meter_1.BluetoothGlucoseMeterManager(options);
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
    async initialize() {
        if (this.initialized) {
            return true;
        }
        if (!this.bridge) {
            throw new errors_1.InvalidPlatformError("Unsupported platform");
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
    async requestAuthorization() {
        this.ensureInitialized();
        return await this.bridge.requestAuthorization();
    }
    /**
     * Gets the current authorization status
     *
     * @returns Promise that resolves to current authorization status
     */
    async getAuthorizationStatus() {
        this.ensureInitialized();
        return await this.bridge.getAuthorizationStatus();
    }
    /**
     * Fetches the most recent blood glucose reading
     *
     * @returns Promise that resolves to the most recent glucose reading or null if none found
     */
    async getLatestGlucoseReading() {
        this.ensureInitialized();
        return await this.bridge.getLatestGlucoseReading();
    }
    /**
     * Fetches blood glucose readings within a specified time range
     *
     * @param options Options for fetching glucose readings
     * @returns Promise that resolves to an array of glucose readings
     */
    async getGlucoseReadings(options = {}) {
        this.ensureInitialized();
        return await this.bridge.getGlucoseReadings(options);
    }
    /**
     * Check if real-time glucose streaming is supported on current platform
     *
     * @returns True if streaming is supported, false otherwise
     */
    isStreamingSupported() {
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
    async startGlucoseStream(options) {
        this.ensureInitialized();
        if (!this.bridge.startGlucoseStream) {
            throw new Error("Glucose streaming is not supported on this platform");
        }
        return await this.bridge.startGlucoseStream(options);
    }
    /**
     * Stop real-time glucose streaming
     *
     * @returns Promise that resolves when streaming stops successfully
     */
    async stopGlucoseStream() {
        this.ensureInitialized();
        if (!this.bridge.stopGlucoseStream) {
            throw new Error("Glucose streaming is not supported on this platform");
        }
        return await this.bridge.stopGlucoseStream();
    }
    // Bluetooth Glucose Meter Methods
    /**
     * Check if Bluetooth glucose meter support is available
     *
     * @returns True if Bluetooth is supported, false otherwise
     */
    isBluetoothSupported() {
        return this.bluetoothManager
            ? this.bluetoothManager.isBluetoothSupported()
            : false;
    }
    /**
     * Scan for available Bluetooth glucose meters
     *
     * @param options Scanning configuration options
     * @returns Promise that resolves to an array of discovered devices
     */
    async scanForBluetoothDevices(options = {}) {
        if (!this.bluetoothManager) {
            throw new Error("Bluetooth manager not initialized");
        }
        return await this.bluetoothManager.scanForDevices(options);
    }
    /**
     * Connect to a specific Bluetooth glucose meter
     *
     * @param deviceId The ID of the device to connect to
     * @param options Connection configuration options
     * @returns Promise that resolves when connection is established
     */
    async connectToBluetoothDevice(deviceId, options = {}) {
        if (!this.bluetoothManager) {
            throw new Error("Bluetooth manager not initialized");
        }
        return await this.bluetoothManager.connectToDevice(deviceId, options);
    }
    /**
     * Disconnect from a Bluetooth glucose meter
     *
     * @param deviceId The ID of the device to disconnect from
     * @returns Promise that resolves when disconnection is complete
     */
    async disconnectBluetoothDevice(deviceId) {
        if (!this.bluetoothManager) {
            throw new Error("Bluetooth manager not initialized");
        }
        return await this.bluetoothManager.disconnectDevice(deviceId);
    }
    /**
     * Sync glucose readings from a connected Bluetooth device
     *
     * @param deviceId The ID of the device to sync
     * @returns Promise that resolves to an array of glucose readings
     */
    async syncBluetoothDevice(deviceId) {
        if (!this.bluetoothManager) {
            throw new Error("Bluetooth manager not initialized");
        }
        return await this.bluetoothManager.syncDevice(deviceId);
    }
    /**
     * Get list of currently connected Bluetooth devices
     *
     * @returns Promise that resolves to an array of connected devices
     */
    async getConnectedBluetoothDevices() {
        if (!this.bluetoothManager) {
            throw new Error("Bluetooth manager not initialized");
        }
        return await this.bluetoothManager.getConnectedDevices();
    }
    /**
     * Gets platform name
     *
     * @returns The current platform: 'ios', 'android', or 'unknown'
     */
    getPlatform() {
        return this.platform;
    }
    /**
     * Ensures the bridge is initialized before performing operations
     *
     * @throws InitializationError if the bridge is not initialized
     */
    ensureInitialized() {
        if (!this.initialized || !this.bridge) {
            throw new errors_1.InitializationError("GlucoseSyncBridge not initialized. Call initialize() first.");
        }
    }
}
exports.GlucoseSyncBridge = GlucoseSyncBridge;
// Export types and constants
__exportStar(require("./types"), exports);
__exportStar(require("./errors"), exports);
// Create default instance for simple usage
exports.GlucoseSync = new GlucoseSyncBridge();
// Default export for ESM
exports.default = GlucoseSyncBridge;
