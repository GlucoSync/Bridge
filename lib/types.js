"use strict";
/**
 * Type definitions for GlucoSync Bridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothConnectionState = exports.AuthorizationStatus = exports.GlucoseUnit = void 0;
/**
 * Units for blood glucose measurements
 */
var GlucoseUnit;
(function (GlucoseUnit) {
    GlucoseUnit["MGDL"] = "mg/dL";
    GlucoseUnit["MMOL"] = "mmol/L";
})(GlucoseUnit || (exports.GlucoseUnit = GlucoseUnit = {}));
/**
 * Authorization status for health data access
 */
var AuthorizationStatus;
(function (AuthorizationStatus) {
    AuthorizationStatus["NOT_DETERMINED"] = "notDetermined";
    AuthorizationStatus["DENIED"] = "denied";
    AuthorizationStatus["AUTHORIZED"] = "authorized";
    AuthorizationStatus["PARTIALLY_AUTHORIZED"] = "partiallyAuthorized";
})(AuthorizationStatus || (exports.AuthorizationStatus = AuthorizationStatus = {}));
/**
 * Bluetooth glucose meter connection states
 */
var BluetoothConnectionState;
(function (BluetoothConnectionState) {
    BluetoothConnectionState["DISCONNECTED"] = "disconnected";
    BluetoothConnectionState["SCANNING"] = "scanning";
    BluetoothConnectionState["CONNECTING"] = "connecting";
    BluetoothConnectionState["CONNECTED"] = "connected";
    BluetoothConnectionState["SYNCING"] = "syncing";
    BluetoothConnectionState["ERROR"] = "error";
})(BluetoothConnectionState || (exports.BluetoothConnectionState = BluetoothConnectionState = {}));
