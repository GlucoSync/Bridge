"use strict";
/**
 * Platform detection utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isIOS = isIOS;
exports.isAndroid = isAndroid;
exports.getPlatformVersion = getPlatformVersion;
exports.isAtLeastiOSVersion = isAtLeastiOSVersion;
exports.isAtLeastAndroidVersion = isAtLeastAndroidVersion;
const react_native_1 = require("react-native");
/**
 * Checks if the current platform is iOS
 *
 * @returns True if the platform is iOS
 */
function isIOS() {
    return react_native_1.Platform.OS === "ios";
}
/**
 * Checks if the current platform is Android
 *
 * @returns True if the platform is Android
 */
function isAndroid() {
    return react_native_1.Platform.OS === "android";
}
/**
 * Gets the platform version as a number
 *
 * @returns Platform version as a number
 */
function getPlatformVersion() {
    return parseInt(react_native_1.Platform.Version.toString(), 10);
}
/**
 * Checks if iOS version is at least the specified version
 *
 * @param version Minimum version to check for
 * @returns True if platform is iOS and version is at least the specified version
 */
function isAtLeastiOSVersion(version) {
    return isIOS() && getPlatformVersion() >= version;
}
/**
 * Checks if Android API level is at least the specified level
 *
 * @param apiLevel Minimum API level to check for
 * @returns True if platform is Android and API level is at least the specified level
 */
function isAtLeastAndroidVersion(apiLevel) {
    return isAndroid() && getPlatformVersion() >= apiLevel;
}
