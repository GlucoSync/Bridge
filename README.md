# Bridge

![image info](./assets/bridgebanner.png)

A cross-platform TypeScript library for accessing blood glucose data from Apple HealthKit (iOS) and Google Health Connect (Android) in React Native and Expo applications.

## Features

- Unified API for accessing blood glucose data across iOS and Android
- TypeScript support with full type definitions
- Comprehensive error handling
- Unit conversion (mg/dL ↔ mmol/L)
- Works with Expo (bare workflow/EAS)
- Supports real-time data access through button-triggered refreshes

### Dependencies

This library requires the following peer dependencies:

```bash
# For iOS
npm install react-native-health

# For Android
npm install react-native-health-connect
```

## Usage

### Basic Setup

```typescript
import { GlucoseSync, GlucoseUnit } from "@glucosync/bridge";

// Initialize with options
await GlucoseSync.initialize();

// Request permissions
const authStatus = await GlucoseSync.requestAuthorization();
if (authStatus === "authorized") {
  console.log("Access granted");
}
```

### Get Latest Reading

```typescript
try {
  const latestReading = await GlucoseSync.getLatestGlucoseReading();
  if (latestReading) {
    console.log(`Latest glucose: ${latestReading.value} ${latestReading.unit}`);
    console.log(`Timestamp: ${latestReading.timestamp}`);
    console.log(`Source: ${latestReading.source}`);
  } else {
    console.log("No glucose readings available");
  }
} catch (error) {
  console.error("Error getting latest reading:", error);
}
```

### Get Multiple Readings

```typescript
try {
  const readings = await GlucoseSync.getGlucoseReadings({
    startDate: "2025-01-01T00:00:00.000Z",
    endDate: new Date(),
    limit: 20,
    ascending: false,
    unit: GlucoseUnit.MMOL,
  });

  console.log(`Found ${readings.length} readings`);
  readings.forEach((reading) => {
    console.log(`${reading.timestamp}: ${reading.value} ${reading.unit}`);
  });
} catch (error) {
  console.error("Error getting readings:", error);
}
```

### Custom Instance

```typescript
import { GlucoseSyncBridge, GlucoseUnit } from "@glucosync/bridge";

// Create a custom instance with specific options
const customGlucoseSync = new GlucoseSyncBridge({
  defaultUnit: GlucoseUnit.MMOL,
  autoInitialize: true,
  onError: (error) => console.error("GlucoseSync error:", error),
});

// Use the custom instance
const readings = await customGlucoseSync.getGlucoseReadings();
```

## API Reference

### `GlucoseSyncBridge`

Main class for accessing glucose data.

#### Constructor Options

```typescript
{
  defaultUnit?: GlucoseUnit; // Default: GlucoseUnit.MGDL
  autoInitialize?: boolean;  // Default: true
  onError?: (error: Error) => void;
}
```

#### Methods

- `initialize(): Promise<boolean>` - Initialize the bridge
- `requestAuthorization(): Promise<AuthorizationStatus>` - Request permissions
- `getAuthorizationStatus(): Promise<AuthorizationStatus>` - Get current permission status
- `getLatestGlucoseReading(): Promise<GlucoseReading | null>` - Get most recent reading
- `getGlucoseReadings(options?: GlucoseFetchOptions): Promise<GlucoseReading[]>` - Get multiple readings
- `getPlatform(): 'ios' | 'android' | 'unknown'` - Get current platform

### Types

#### `GlucoseReading`

```typescript
{
  id: string;            // Unique identifier
  value: number;         // Glucose value
  unit: GlucoseUnit;     // Unit of measurement
  timestamp: string;     // ISO timestamp
  source?: string;       // Source device/app
  isFasting?: boolean;   // Whether reading was while fasting
  readingType?: string;  // Type of reading
  metadata?: Record<string, any>; // Additional data
}
```

#### `GlucoseFetchOptions`

```typescript
{
  startDate?: string | Date;  // Start date for range
  endDate?: string | Date;    // End date for range
  limit?: number;             // Maximum number of readings
  ascending?: boolean;        // Sort order
  unit?: GlucoseUnit;         // Override default unit
}
```

#### `AuthorizationStatus`

```typescript
enum AuthorizationStatus {
  NOT_DETERMINED = "notDetermined",
  DENIED = "denied",
  AUTHORIZED = "authorized",
  PARTIALLY_AUTHORIZED = "partiallyAuthorized",
}
```

## Expo Usage

This library can be used with Expo but requires the bare workflow or EAS Build since it uses native modules. Add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "deploymentTarget": "13.0"
          },
          "android": {
            "compileSdkVersion": 31,
            "targetSdkVersion": 31,
            "buildToolsVersion": "31.0.0"
          }
        }
      ]
    ]
  }
}
```

## Considerations

- **HealthKit (iOS)**: Requires iOS 13.0+
- **Health Connect (Android)**: Requires Health Connect to be installed on the device
- **Permissions**: Users must explicitly grant permissions
- **Units**: The library handles unit conversion automatically
