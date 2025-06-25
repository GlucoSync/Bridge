/**
 * Custom error types for GlucoSync Bridge
 */
/**
 * Base error class for GlucoSync Bridge
 */
export declare class GlucoseSyncError extends Error {
    constructor(message: string);
}
/**
 * Error thrown when trying to use an unsupported platform
 */
export declare class InvalidPlatformError extends GlucoseSyncError {
    constructor(message: string);
}
/**
 * Error thrown when initialization fails
 */
export declare class InitializationError extends GlucoseSyncError {
    constructor(message: string);
}
/**
 * Error thrown when permissions are denied
 */
export declare class PermissionDeniedError extends GlucoseSyncError {
    constructor(message: string);
}
/**
 * Error thrown when a feature is not supported on the current platform
 */
export declare class UnsupportedFeatureError extends GlucoseSyncError {
    constructor(message: string);
}
/**
 * Error thrown when there's an issue with data format or values
 */
export declare class DataFormatError extends GlucoseSyncError {
    constructor(message: string);
}
