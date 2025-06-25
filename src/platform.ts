/**
 * Platform detection utilities
 */

import { Platform } from "react-native";

/**
 * Checks if the current platform is iOS
 *
 * @returns True if the platform is iOS
 */
export function isIOS(): boolean {
  return Platform.OS === "ios";
}

/**
 * Checks if the current platform is Android
 *
 * @returns True if the platform is Android
 */
export function isAndroid(): boolean {
  return Platform.OS === "android";
}

/**
 * Gets the platform version as a number
 *
 * @returns Platform version as a number
 */
export function getPlatformVersion(): number {
  return parseInt(Platform.Version.toString(), 10);
}

/**
 * Checks if iOS version is at least the specified version
 *
 * @param version Minimum version to check for
 * @returns True if platform is iOS and version is at least the specified version
 */
export function isAtLeastiOSVersion(version: number): boolean {
  return isIOS() && getPlatformVersion() >= version;
}

/**
 * Checks if Android API level is at least the specified level
 *
 * @param apiLevel Minimum API level to check for
 * @returns True if platform is Android and API level is at least the specified level
 */
export function isAtLeastAndroidVersion(apiLevel: number): boolean {
  return isAndroid() && getPlatformVersion() >= apiLevel;
}
