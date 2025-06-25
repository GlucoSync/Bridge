"use strict";
/**
 * Android Health Connect implementation for GlucoSync Bridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AndroidHealthConnectBridge = void 0;
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
        // Health Connect stores blood glucose in mmol/L
        const sourceUnit = types_1.GlucoseUnit.MMOL;
        const targetUnit = this.options.defaultUnit || types_1.GlucoseUnit.MGDL;
        // Convert value if necessary
        const value = (0, units_1.convertGlucoseValue)(reading.level, sourceUnit, targetUnit);
        return {
            id: ((_a = reading.metadata) === null || _a === void 0 ? void 0 : _a.id) || `healthconnect-${reading.time}`,
            value,
            unit: targetUnit,
            timestamp: reading.time,
            source: ((_b = reading.metadata) === null || _b === void 0 ? void 0 : _b.dataOrigin) || "Health Connect",
            isFasting: reading.specimenSource === "interstitial_fluid",
            readingType: reading.relationToMeal || "unknown",
            metadata: reading.metadata || {},
        };
    }
}
exports.AndroidHealthConnectBridge = AndroidHealthConnectBridge;
