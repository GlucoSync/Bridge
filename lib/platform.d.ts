/**
 * Platform detection utilities
 */
/**
 * Checks if the current platform is iOS
 *
 * @returns True if the platform is iOS
 */
export declare function isIOS(): boolean;
/**
 * Checks if the current platform is Android
 *
 * @returns True if the platform is Android
 */
export declare function isAndroid(): boolean;
/**
 * Gets the platform version as a number
 *
 * @returns Platform version as a number
 */
export declare function getPlatformVersion(): number;
/**
 * Checks if iOS version is at least the specified version
 *
 * @param version Minimum version to check for
 * @returns True if platform is iOS and version is at least the specified version
 */
export declare function isAtLeastiOSVersion(version: number): boolean;
/**
 * Checks if Android API level is at least the specified level
 *
 * @param apiLevel Minimum API level to check for
 * @returns True if platform is Android and API level is at least the specified level
 */
export declare function isAtLeastAndroidVersion(apiLevel: number): boolean;
