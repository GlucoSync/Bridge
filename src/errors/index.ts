/**
 * Custom error types for GlucoSync Bridge
 */

/**
 * Base error class for GlucoSync Bridge
 */
export class GlucoseSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GlucoseSyncError";
  }
}

/**
 * Error thrown when trying to use an unsupported platform
 */
export class InvalidPlatformError extends GlucoseSyncError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPlatformError";
  }
}

/**
 * Error thrown when initialization fails
 */
export class InitializationError extends GlucoseSyncError {
  constructor(message: string) {
    super(message);
    this.name = "InitializationError";
  }
}

/**
 * Error thrown when permissions are denied
 */
export class PermissionDeniedError extends GlucoseSyncError {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

/**
 * Error thrown when a feature is not supported on the current platform
 */
export class UnsupportedFeatureError extends GlucoseSyncError {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFeatureError";
  }
}

/**
 * Error thrown when there's an issue with data format or values
 */
export class DataFormatError extends GlucoseSyncError {
  constructor(message: string) {
    super(message);
    this.name = "DataFormatError";
  }
}
