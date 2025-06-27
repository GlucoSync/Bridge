"use strict";
/**
 * iOS HealthKit implementation for GlucoSync Bridge
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOSHealthKitBridge = void 0;
const react_native_1 = require("react-native");
const react_native_health_1 = __importDefault(require("react-native-health"));
const types_1 = require("../types");
const date_1 = require("../utils/date");
const units_1 = require("../utils/units");
const errors_1 = require("../errors");
// Create a custom event emitter for handling real-time updates
const healthKitEmitter = new react_native_1.NativeEventEmitter(react_native_1.NativeModules.RCTAppleHealthKit);
class IOSHealthKitBridge {
    constructor(options) {
        this.initialized = false;
        this.options = options;
        // Define the permissions we need for HealthKit
        this.healthKitOptions = {
            permissions: {
                read: [react_native_health_1.default.Constants.Permissions.BloodGlucose],
                write: [], // We don't need write permissions
            },
        };
    }
    /**
     * Initialize HealthKit connection
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            react_native_health_1.default.initHealthKit(this.healthKitOptions, (error, result) => {
                if (error) {
                    reject(new errors_1.InitializationError(`HealthKit initialization failed: ${error}`));
                    return;
                }
                this.initialized = true;
                resolve(true);
            });
        });
    }
    /**
     * Request authorization to access HealthKit data
     */
    async requestAuthorization() {
        if (!this.initialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            react_native_health_1.default.getAuthStatus(this.healthKitOptions, (err, results) => {
                if (err) {
                    reject(new Error(`Failed to get authorization status: ${err}`));
                    return;
                }
                // Check if we have permission for blood glucose
                const glucosePermission = results.permissions.read.find((p) => p.permission === react_native_health_1.default.Constants.Permissions.BloodGlucose);
                if (!glucosePermission || !glucosePermission.granted) {
                    resolve(types_1.AuthorizationStatus.DENIED);
                    return;
                }
                resolve(types_1.AuthorizationStatus.AUTHORIZED);
            });
        });
    }
    /**
     * Get current authorization status
     */
    async getAuthorizationStatus() {
        if (!this.initialized) {
            await this.initialize();
        }
        return new Promise((resolve, reject) => {
            react_native_health_1.default.getAuthStatus(this.healthKitOptions, (err, results) => {
                if (err) {
                    reject(new Error(`Failed to get authorization status: ${err}`));
                    return;
                }
                // Check if we have permission for blood glucose
                const glucosePermission = results.permissions.read.find((p) => p.permission === react_native_health_1.default.Constants.Permissions.BloodGlucose);
                if (!glucosePermission) {
                    resolve(types_1.AuthorizationStatus.NOT_DETERMINED);
                }
                else if (glucosePermission.granted) {
                    resolve(types_1.AuthorizationStatus.AUTHORIZED);
                }
                else {
                    resolve(types_1.AuthorizationStatus.DENIED);
                }
            });
        });
    }
    /**
     * Get latest glucose reading
     */
    async getLatestGlucoseReading() {
        const auth = await this.getAuthorizationStatus();
        if (auth !== types_1.AuthorizationStatus.AUTHORIZED) {
            throw new errors_1.PermissionDeniedError("HealthKit access not authorized");
        }
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const options = {
            startDate: (0, date_1.formatISODate)(oneWeekAgo),
            limit: 1,
            ascending: false, // Most recent first
        };
        return new Promise((resolve, reject) => {
            react_native_health_1.default.getBloodGlucoseSamples(options, (err, results) => {
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
            });
        });
    }
    /**
     * Get glucose readings within a specified date range
     */
    async getGlucoseReadings(options = {}) {
        const auth = await this.getAuthorizationStatus();
        if (auth !== types_1.AuthorizationStatus.AUTHORIZED) {
            throw new errors_1.PermissionDeniedError("HealthKit access not authorized");
        }
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 7);
        const healthKitOptions = {
            startDate: options.startDate
                ? (0, date_1.formatISODate)((0, date_1.convertDate)(options.startDate))
                : (0, date_1.formatISODate)(defaultStartDate),
            endDate: options.endDate
                ? (0, date_1.formatISODate)((0, date_1.convertDate)(options.endDate))
                : (0, date_1.formatISODate)(new Date()),
            limit: options.limit || 100,
            ascending: options.ascending !== undefined ? options.ascending : false,
        };
        return new Promise((resolve, reject) => {
            react_native_health_1.default.getBloodGlucoseSamples(healthKitOptions, (err, results) => {
                if (err) {
                    reject(new Error(`Failed to get glucose readings: ${err}`));
                    return;
                }
                if (!results || results.length === 0) {
                    resolve([]);
                    return;
                }
                const readings = results.map((reading) => this.mapHealthKitReadingToGlucoseReading(reading));
                resolve(readings);
            });
        });
    }
    /**
     * Maps a HealthKit reading to our standard GlucoseReading format
     */
    mapHealthKitReadingToGlucoseReading(reading) {
        var _a, _b;
        // HealthKit stores blood glucose in mg/dL
        const sourceUnit = types_1.GlucoseUnit.MGDL;
        const targetUnit = this.options.defaultUnit || types_1.GlucoseUnit.MGDL;
        // Convert value if necessary
        const value = (0, units_1.convertGlucoseValue)(reading.value, sourceUnit, targetUnit);
        return {
            id: reading.id || reading.uuid || `healthkit-${reading.startDate}`,
            value,
            unit: targetUnit,
            timestamp: reading.startDate,
            source: reading.sourceName || reading.source || "HealthKit",
            isFasting: ((_a = reading.metadata) === null || _a === void 0 ? void 0 : _a.HKWasUserEntered) === true,
            readingType: ((_b = reading.metadata) === null || _b === void 0 ? void 0 : _b.HKBloodGlucoseMealTime) ? "meal" : "manual",
            metadata: reading.metadata || {},
        };
    }
    /**
     * Check if real-time glucose streaming is supported on iOS
     * Currently not supported, but may be added in future versions
     */
    isStreamingSupported() {
        return false; // iOS HealthKit doesn't support real-time streaming like Android
    }
    /**
     * Start real-time glucose streaming (not supported on iOS)
     */
    async startGlucoseStream(options) {
        throw new Error("Real-time glucose streaming is not supported on iOS HealthKit");
    }
    /**
     * Stop real-time glucose streaming (not supported on iOS)
     */
    async stopGlucoseStream() {
        throw new Error("Real-time glucose streaming is not supported on iOS HealthKit");
    }
    // Bluetooth methods (delegate to main bridge Bluetooth manager)
    // These are implemented in the main GlucoseSyncBridge class
    async scanForBluetoothDevices(options) {
        throw new Error("Bluetooth scanning should be handled by the main GlucoseSyncBridge instance");
    }
    async connectToBluetoothDevice(deviceId, options) {
        throw new Error("Bluetooth connection should be handled by the main GlucoseSyncBridge instance");
    }
    async disconnectBluetoothDevice(deviceId) {
        throw new Error("Bluetooth disconnection should be handled by the main GlucoseSyncBridge instance");
    }
    async syncBluetoothDevice(deviceId) {
        throw new Error("Bluetooth sync should be handled by the main GlucoseSyncBridge instance");
    }
    async getConnectedBluetoothDevices() {
        throw new Error("Bluetooth device listing should be handled by the main GlucoseSyncBridge instance");
    }
    isBluetoothSupported() {
        // Bluetooth support is available on iOS, but handled by main bridge
        return true;
    }
}
exports.IOSHealthKitBridge = IOSHealthKitBridge;
