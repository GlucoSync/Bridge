"use strict";
/**
 * Android Health Connect implementation for GlucoSync Bridge
 * Includes support for LibreLink data and xDrip+ Inter-App streaming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidHealthConnectBridge = void 0;
const react_native_1 = require("react-native");
const react_native_health_connect_1 = require("react-native-health-connect");
const types_1 = require("../types");
const date_1 = require("../utils/date");
const units_1 = require("../utils/units");
const errors_1 = require("../errors");
class AndroidHealthConnectBridge {
    constructor(options) {
        this.initialized = false;
        this.permissions = [
            { accessType: "read", recordType: "BloodGlucose" },
        ];
        // Streaming support
        this.isStreaming = false;
        this.options = options;
    }
    /**
     * Initialize Health Connect
     */
    async initialize() {
        try {
            // Initialize the Health Connect SDK
            const initialized = await (0, react_native_health_connect_1.initialize)();
            if (!initialized) {
                throw new errors_1.InitializationError("Failed to initialize Health Connect SDK");
            }
            this.initialized = true;
            return true;
        }
        catch (error) {
            throw new errors_1.InitializationError(`Failed to initialize Health Connect: ${error.message}`);
        }
    }
    /**
     * Request permissions to access Health Connect data
     */
    async requestAuthorization() {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            // Request permissions
            const grantedPermissions = await (0, react_native_health_connect_1.requestPermission)(this.permissions);
            // Check if our required permission was granted
            const hasBloodGlucosePermission = grantedPermissions.some((permission) => permission.recordType === "BloodGlucose" &&
                permission.accessType === "read");
            if (hasBloodGlucosePermission) {
                return types_1.AuthorizationStatus.AUTHORIZED;
            }
            else {
                return types_1.AuthorizationStatus.DENIED;
            }
        }
        catch (error) {
            throw new Error(`Failed to request permissions: ${error.message}`);
        }
    }
    /**
     * Get current authorization status
     */
    async getAuthorizationStatus() {
        if (!this.initialized) {
            await this.initialize();
        }
        try {
            // Check current permissions
            const grantedPermissions = await (0, react_native_health_connect_1.getGrantedPermissions)();
            // Check if our required permission is in the granted permissions
            const hasBloodGlucosePermission = grantedPermissions.some((permission) => permission.recordType === "BloodGlucose" &&
                permission.accessType === "read");
            if (hasBloodGlucosePermission) {
                return types_1.AuthorizationStatus.AUTHORIZED;
            }
            else {
                // Since getRequestedPermissions doesn't exist, we'll treat this as not determined
                return types_1.AuthorizationStatus.NOT_DETERMINED;
            }
        }
        catch (error) {
            throw new Error(`Failed to get authorization status: ${error.message}`);
        }
    }
    /**
     * Get latest glucose reading
     */
    async getLatestGlucoseReading() {
        const auth = await this.getAuthorizationStatus();
        if (auth !== types_1.AuthorizationStatus.AUTHORIZED) {
            throw new errors_1.PermissionDeniedError("Health Connect access not authorized");
        }
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        try {
            // Set up time range filter for the past week
            const timeRangeFilter = {
                operator: "between",
                startTime: (0, date_1.formatISODate)(oneWeekAgo),
                endTime: (0, date_1.formatISODate)(new Date()),
            };
            // Get blood glucose records
            const response = await (0, react_native_health_connect_1.readRecords)("BloodGlucose", {
                timeRangeFilter,
                ascendingOrder: false, // Most recent first
                pageSize: 1,
            });
            if (!response || !response.records || response.records.length === 0) {
                return null;
            }
            // Map the first (most recent) record
            return this.mapHealthConnectReadingToGlucoseReading(response.records[0]);
        }
        catch (error) {
            throw new Error(`Failed to get latest glucose reading: ${error.message}`);
        }
    }
    /**
     * Get glucose readings within a specified date range
     */
    async getGlucoseReadings(options = {}) {
        const auth = await this.getAuthorizationStatus();
        if (auth !== types_1.AuthorizationStatus.AUTHORIZED) {
            throw new errors_1.PermissionDeniedError("Health Connect access not authorized");
        }
        const defaultStartDate = new Date();
        defaultStartDate.setDate(defaultStartDate.getDate() - 7);
        try {
            // Set up time range filter
            const timeRangeFilter = {
                operator: "between",
                startTime: options.startDate
                    ? (0, date_1.formatISODate)((0, date_1.convertDate)(options.startDate))
                    : (0, date_1.formatISODate)(defaultStartDate),
                endTime: options.endDate
                    ? (0, date_1.formatISODate)((0, date_1.convertDate)(options.endDate))
                    : (0, date_1.formatISODate)(new Date()),
            };
            // Get blood glucose records
            const response = await (0, react_native_health_connect_1.readRecords)("BloodGlucose", {
                timeRangeFilter,
                ascendingOrder: options.ascending !== undefined ? options.ascending : false,
                pageSize: options.limit || 100,
            });
            if (!response || !response.records || response.records.length === 0) {
                return [];
            }
            // Map records to our standard format
            return response.records.map((record) => this.mapHealthConnectReadingToGlucoseReading(record));
        }
        catch (error) {
            throw new Error(`Failed to get glucose readings: ${error.message}`);
        }
    }
    /**
     * Maps a Health Connect reading to our standard GlucoseReading format
     */
    mapHealthConnectReadingToGlucoseReading(reading) {
        var _a, _b;
        // Health Connect stores blood glucose with units in the result
        const targetUnit = this.options.defaultUnit || types_1.GlucoseUnit.MGDL;
        // Get the glucose value - Health Connect returns results with unit conversions
        let value;
        let sourceUnit;
        if (reading.level && typeof reading.level === "object") {
            // New format with unit conversions
            if (targetUnit === types_1.GlucoseUnit.MGDL) {
                value =
                    reading.level.inMilligramsPerDeciliter ||
                        reading.level.inMillimolesPerLiter * 18.018;
                sourceUnit = types_1.GlucoseUnit.MGDL;
            }
            else {
                value =
                    reading.level.inMillimolesPerLiter ||
                        reading.level.inMilligramsPerDeciliter / 18.018;
                sourceUnit = types_1.GlucoseUnit.MMOL;
            }
        }
        else {
            // Fallback for older format or raw values
            value = reading.level || reading.value;
            sourceUnit = types_1.GlucoseUnit.MMOL; // Health Connect default
            value = (0, units_1.convertGlucoseValue)(value, sourceUnit, targetUnit);
        }
        // Map specimen source to readable format
        const getSpecimenSource = (source) => {
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
        const getRelationToMeal = (relation) => {
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
            id: ((_a = reading.metadata) === null || _a === void 0 ? void 0 : _a.id) || `healthconnect-${reading.time}`,
            value,
            unit: targetUnit,
            timestamp: reading.time,
            source: ((_b = reading.metadata) === null || _b === void 0 ? void 0 : _b.dataOrigin) || "Health Connect",
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
    isStreamingSupported() {
        return true; // Android supports both xDrip and Health Connect streaming
    }
    /**
     * Start real-time glucose streaming from multiple sources
     */
    async startGlucoseStream(options) {
        if (this.isStreaming) {
            throw new Error("Glucose streaming is already active");
        }
        if (!this.initialized) {
            await this.initialize();
        }
        const auth = await this.getAuthorizationStatus();
        if (auth !== types_1.AuthorizationStatus.AUTHORIZED) {
            throw new errors_1.PermissionDeniedError("Health Connect access not authorized");
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
        }
        catch (error) {
            this.isStreaming = false;
            throw new Error(`Failed to start glucose streaming: ${error.message}`);
        }
    }
    /**
     * Stop real-time glucose streaming
     */
    async stopGlucoseStream() {
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
        }
        catch (error) {
            throw new Error(`Failed to stop glucose streaming: ${error.message}`);
        }
    }
    /**
     * Start xDrip+ Inter-App broadcast receiver
     */
    async startXDripStream() {
        try {
            // Listen for xDrip+ broadcasts using DeviceEventEmitter
            react_native_1.DeviceEventEmitter.addListener("xDripGlucoseReading", (data) => {
                this.handleXDripReading(data);
            });
            // Register with native module to start listening for xDrip broadcasts
            if (react_native_1.NativeModules.XDripReceiver) {
                await react_native_1.NativeModules.XDripReceiver.startListening();
            }
            else {
                console.warn("XDripReceiver native module not found. xDrip streaming may not work.");
            }
        }
        catch (error) {
            throw new Error(`Failed to start xDrip streaming: ${error.message}`);
        }
    }
    /**
     * Stop xDrip+ Inter-App broadcast receiver
     */
    stopXDripStream() {
        try {
            react_native_1.DeviceEventEmitter.removeAllListeners("xDripGlucoseReading");
            if (react_native_1.NativeModules.XDripReceiver) {
                react_native_1.NativeModules.XDripReceiver.stopListening();
            }
        }
        catch (error) {
            console.warn("Error stopping xDrip streaming:", error);
        }
    }
    /**
     * Handle incoming xDrip+ glucose reading
     */
    handleXDripReading(data) {
        var _a, _b;
        try {
            if (!((_a = this.streamOptions) === null || _a === void 0 ? void 0 : _a.onReading)) {
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
            const targetUnit = this.options.defaultUnit || types_1.GlucoseUnit.MGDL;
            let value = data.value || data.glucose || data.bg;
            // xDrip usually sends data in mg/dL, but check the units
            const sourceUnit = data.units === "mmol/L" ? types_1.GlucoseUnit.MMOL : types_1.GlucoseUnit.MGDL;
            value = (0, units_1.convertGlucoseValue)(value, sourceUnit, targetUnit);
            const reading = {
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
        }
        catch (error) {
            if ((_b = this.streamOptions) === null || _b === void 0 ? void 0 : _b.onError) {
                this.streamOptions.onError(new Error(`Error processing xDrip reading: ${error.message}`));
            }
        }
    }
    /**
     * Start Health Connect polling for LibreLink data
     */
    async startHealthConnectPolling() {
        var _a;
        const pollInterval = ((_a = this.streamOptions) === null || _a === void 0 ? void 0 : _a.minInterval) || 60000; // Default 1 minute
        this.streamPollingInterval = setInterval(async () => {
            var _a;
            try {
                await this.pollHealthConnectForNewReadings();
            }
            catch (error) {
                if ((_a = this.streamOptions) === null || _a === void 0 ? void 0 : _a.onError) {
                    this.streamOptions.onError(new Error(`Health Connect polling error: ${error.message}`));
                }
            }
        }, pollInterval);
        // Do an initial poll
        await this.pollHealthConnectForNewReadings();
    }
    /**
     * Stop Health Connect polling
     */
    stopHealthConnectPolling() {
        if (this.streamPollingInterval) {
            clearInterval(this.streamPollingInterval);
            this.streamPollingInterval = undefined;
        }
    }
    /**
     * Poll Health Connect for new glucose readings
     */
    async pollHealthConnectForNewReadings() {
        var _a, _b, _c, _d;
        try {
            const now = new Date();
            const lookbackMinutes = ((_a = this.streamOptions) === null || _a === void 0 ? void 0 : _a.minInterval)
                ? Math.ceil(this.streamOptions.minInterval / 60000)
                : 5; // Default 5 minutes lookback
            const startTime = new Date(now.getTime() - lookbackMinutes * 60 * 1000);
            const timeRangeFilter = {
                operator: "between",
                startTime: this.lastReadingTimestamp || (0, date_1.formatISODate)(startTime),
                endTime: (0, date_1.formatISODate)(now),
            };
            const response = await (0, react_native_health_connect_1.readRecords)("BloodGlucose", {
                timeRangeFilter,
                ascendingOrder: true, // Get chronological order
                pageSize: 50,
                dataOriginFilter: ["com.freestylelibre.app"], // LibreLink app
            });
            if (((_b = response === null || response === void 0 ? void 0 : response.records) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                for (const record of response.records) {
                    // Skip if we've already processed this reading
                    if (this.lastReadingTimestamp &&
                        record.time <= this.lastReadingTimestamp) {
                        continue;
                    }
                    const reading = this.mapHealthConnectReadingToGlucoseReading(record);
                    // Mark as LibreLink source if from LibreLink app
                    if (((_c = record.metadata) === null || _c === void 0 ? void 0 : _c.dataOrigin) === "com.freestylelibre.app") {
                        reading.source = "LibreLink";
                        reading.readingType = "freestyle_libre";
                    }
                    this.lastReadingTimestamp = reading.timestamp;
                    if ((_d = this.streamOptions) === null || _d === void 0 ? void 0 : _d.onReading) {
                        this.streamOptions.onReading(reading);
                    }
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to poll Health Connect: ${error.message}`);
        }
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
        // Bluetooth support is available on Android, but handled by main bridge
        return true;
    }
}
exports.AndroidHealthConnectBridge = AndroidHealthConnectBridge;
