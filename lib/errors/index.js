"use strict";
/**
 * Custom error types for GlucoSync Bridge
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFormatError = exports.UnsupportedFeatureError = exports.PermissionDeniedError = exports.InitializationError = exports.InvalidPlatformError = exports.GlucoseSyncError = void 0;
/**
 * Base error class for GlucoSync Bridge
 */
class GlucoseSyncError extends Error {
    constructor(message) {
        super(message);
        this.name = "GlucoseSyncError";
    }
}
exports.GlucoseSyncError = GlucoseSyncError;
/**
 * Error thrown when trying to use an unsupported platform
 */
class InvalidPlatformError extends GlucoseSyncError {
    constructor(message) {
        super(message);
        this.name = "InvalidPlatformError";
    }
}
exports.InvalidPlatformError = InvalidPlatformError;
/**
 * Error thrown when initialization fails
 */
class InitializationError extends GlucoseSyncError {
    constructor(message) {
        super(message);
        this.name = "InitializationError";
    }
}
exports.InitializationError = InitializationError;
/**
 * Error thrown when permissions are denied
 */
class PermissionDeniedError extends GlucoseSyncError {
    constructor(message) {
        super(message);
        this.name = "PermissionDeniedError";
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
/**
 * Error thrown when a feature is not supported on the current platform
 */
class UnsupportedFeatureError extends GlucoseSyncError {
    constructor(message) {
        super(message);
        this.name = "UnsupportedFeatureError";
    }
}
exports.UnsupportedFeatureError = UnsupportedFeatureError;
/**
 * Error thrown when there's an issue with data format or values
 */
class DataFormatError extends GlucoseSyncError {
    constructor(message) {
        super(message);
        this.name = "DataFormatError";
    }
}
exports.DataFormatError = DataFormatError;
