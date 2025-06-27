# Bridge

![image info](./assets/bridgebanner.png)

A cross-platform TypeScript library for accessing blood glucose data from Apple HealthKit (iOS) and Google Health Connect (Android) in React Native and Expo applications.

## Features

- ✅ **Unified API** for accessing blood glucose data across iOS and Android
- ✅ **TypeScript support** with full type definitions
- ✅ **Real-time streaming** from xDrip+ and LibreLink (Android)
- ✅ **Bluetooth glucose meters** with mock support for testing
- ✅ **Historical data** fetching with date ranges
- ✅ **Unit conversion** (mg/dL ↔ mmol/L)
- ✅ **Multi-source support**: HealthKit, Health Connect, xDrip+, LibreLink, Bluetooth meters
- ✅ **Comprehensive error handling**
- ✅ **Battery-optimized** background processing
- ✅ **Works with Expo** (bare workflow/EAS)

### Real-time Streaming (Android)

- **xDrip+ Inter-App Broadcasts**: Receive real-time CGM data from xDrip+, Diabox, Glimp
- **LibreLink Integration**: Access official LibreLink readings through Health Connect
- **Multiple Sources**: Combine data from different apps with deduplication
- **Trend Information**: Get glucose direction, slope, and raw sensor values

### Bluetooth Glucose Meters

- **Web Bluetooth API**: Connect to compatible Bluetooth glucose meters
- **Mock Mode**: Full testing support with simulated devices and data
- **Multiple Devices**: Connect and sync from multiple meters simultaneously
- **Manufacturer Support**: Abbott FreeStyle, Roche Accu-Chek, LifeScan OneTouch, and more
- **Real-time Sync**: Retrieve stored readings from connected meters

## Dependencies

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

### Real-time Streaming (Android Only)

```typescript
import { GlucoseSyncBridge, GlucoseUnit } from "@glucosync/bridge";

const bridge = new GlucoseSyncBridge({
  defaultUnit: GlucoseUnit.MGDL,
});

// Check if streaming is supported
if (bridge.isStreamingSupported()) {
  await bridge.startGlucoseStream({
    enableXDripStream: true, // xDrip+ broadcasts
    enableLibreLinkStream: true, // LibreLink via Health Connect
    minInterval: 60000, // 1 minute minimum between readings

    onReading: (reading) => {
      console.log(`${reading.value} ${reading.unit} from ${reading.source}`);

      // Handle real-time glucose data
      if (reading.source === "xDrip+") {
        console.log("Trend:", reading.metadata?.direction);
      }
    },

    onError: (error) => {
      console.error("Streaming error:", error.message);
    },
  });
}

// Stop streaming
await bridge.stopGlucoseStream();
```

## Bluetooth Glucose Meters

The library includes comprehensive support for Bluetooth glucose meters using the Web Bluetooth API with fallback mock support for testing.

### Scanning for Devices

```typescript
import { GlucoseSyncBridge } from "@glucosync/bridge";

const bridge = new GlucoseSyncBridge();
await bridge.initialize();

// Check if Bluetooth is supported
if (bridge.isBluetoothSupported()) {
  console.log("Bluetooth is supported");

  // Scan for glucose meters
  const devices = await bridge.scanForBluetoothDevices({
    timeout: 10000,
    onDeviceFound: (device) => {
      console.log("Found:", device.name, device.manufacturer);
    },
    onStateChange: (state) => {
      console.log("Scan state:", state);
    },
  });

  console.log(`Found ${devices.length} glucose meters`);
}
```

### Connecting and Syncing

```typescript
// Connect to a device
const deviceId = devices[0].id;
const connected = await bridge.connectToBluetoothDevice(deviceId, {
  timeout: 30000,
  autoSync: true, // Automatically sync after connection
  onStateChange: (state) => {
    console.log("Connection state:", state);
  },
  onSyncProgress: (progress, total) => {
    console.log(`Sync progress: ${progress}/${total}`);
  },
});

if (connected) {
  // Manually sync readings
  const readings = await bridge.syncBluetoothDevice(deviceId);
  console.log(`Retrieved ${readings.length} readings`);

  // Get connected devices
  const connectedDevices = await bridge.getConnectedBluetoothDevices();

  // Disconnect when done
  await bridge.disconnectBluetoothDevice(deviceId);
}
```

### Mock Mode for Testing

The library includes a comprehensive mock mode for testing Bluetooth functionality without real devices:

```typescript
const mockBridge = new GlucoseSyncBridge({
  enableMockMode: true, // Enable mock mode
  mockDeviceCount: 3, // Number of mock devices
  mockReadingCount: 50, // Readings per device
  simulateDelays: true, // Realistic connection delays
  mockFailureRate: 0.1, // 10% failure rate for testing
});

// All Bluetooth methods work identically with mock data
const devices = await mockBridge.scanForBluetoothDevices();
await mockBridge.connectToBluetoothDevice(devices[0].id);
const readings = await mockBridge.syncBluetoothDevice(devices[0].id);
```

### Supported Glucose Meters

The library supports Bluetooth glucose meters that implement the Bluetooth LE Glucose Profile, including:

- **Abbott FreeStyle**: Libre series with Bluetooth
- **Roche Accu-Chek**: Guide, Instant, and other Bluetooth models
- **LifeScan OneTouch**: Verio series and newer models
- **Contour**: Next series with Bluetooth
- **Other meters**: Any meter implementing the standard Glucose Service (0x1808)

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

### Bluetooth Methods

#### `isBluetoothSupported(): boolean`

Check if Bluetooth glucose meter support is available.

#### `scanForBluetoothDevices(options?): Promise<BluetoothGlucoseMeter[]>`

Scan for available Bluetooth glucose meters.

#### `connectToBluetoothDevice(deviceId, options?): Promise<boolean>`

Connect to a specific glucose meter.

#### `syncBluetoothDevice(deviceId): Promise<GlucoseReading[]>`

Sync glucose readings from a connected meter.

#### `disconnectBluetoothDevice(deviceId): Promise<boolean>`

Disconnect from a glucose meter.

#### `getConnectedBluetoothDevices(): Promise<BluetoothGlucoseMeter[]>`

Get list of currently connected devices.

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

#### `BluetoothGlucoseMeter`

```typescript
{
  id: string;                    // Device ID
  name: string;                  // Device name
  manufacturer?: string;         // Manufacturer name
  model?: string;               // Model number
  connectionState: BluetoothConnectionState;
  rssi?: number;                // Signal strength
  batteryLevel?: number;        // Battery level (0-100)
  lastSync?: string;            // Last sync timestamp
  supportsStreaming?: boolean;  // Real-time support
}
```

#### `BluetoothConnectionState`

```typescript
enum BluetoothConnectionState {
  DISCONNECTED = "disconnected",
  SCANNING = "scanning",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  SYNCING = "syncing",
  ERROR = "error",
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

## 📱 Expo Bluetooth Support

GlucoSync Bridge now includes dedicated support for Expo projects with Bluetooth capabilities:

### Installation for Expo

```bash
# Install GlucoSync Bridge
npm install @glucosync/bridge

# Install Expo Bluetooth dependency
expo install expo-bluetooth
```

### Usage with Expo

```typescript
import { GlucoseSyncBridge } from "@glucosync/bridge";
import { ExpoBluetoothGlucoseMeterManager } from "@glucosync/bridge/expo-glucose-meter";

// Initialize with Expo Bluetooth manager
const bridge = new GlucoseSyncBridge({
  defaultUnit: GlucoseUnit.MGDL,
  // Expo-specific options
  enableExpoMode: true,
});

// Or use the dedicated Expo manager directly
const expoManager = new ExpoBluetoothGlucoseMeterManager({
  enableMockMode: false, // Set to true for testing
  mockDeviceCount: 3,
});

await expoManager.initialize();
const devices = await expoManager.scanForDevices();
```

### Expo Configuration

Add the following to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-bluetooth",
        {
          "isBackgroundEnabled": true,
          "modes": ["central", "peripheral"],
          "bluetoothAlwaysPermission": "Allow $(PRODUCT_NAME) to connect to blood glucose meters"
        }
      ]
    ]
  }
}
```

## 🌐 Enhanced Web Test Environment

The project now includes a comprehensive web-based test environment for testing Bluetooth functionality:

### Test Environment Files

- `web-test/index.html` - Original test environment
- `web-test/enhanced-test.html` - Enhanced test environment with Expo support

### Features

- **Multiple Test Modes**: Real Bluetooth, Mock Mode, and Expo Mode
- **Platform Detection**: Automatically detects Web Bluetooth API support
- **Device Management**: Scan, connect, sync, and disconnect devices
- **Reading Display**: View glucose readings with metadata
- **Debug Logging**: Comprehensive logging with export functionality
- **Data Export**: Export readings as JSON and logs as text files

### Running the Test Environment

1. **For HTTPS (recommended)**:

   ```bash
   # Using Python
   python -m http.server 8080 --bind 127.0.0.1

   # Then visit: http://localhost:8080/web-test/enhanced-test.html
   ```

2. **For HTTPS with SSL (for real Bluetooth testing)**:

   ```bash
   # Using local SSL certificate
   npx http-server web-test -p 8080 -S -C cert.pem -K key.pem

   # Then visit: https://localhost:8080/enhanced-test.html
   ```

### Browser Compatibility

- **Chrome/Chromium**: Full Web Bluetooth API support ✅
- **Edge**: Full Web Bluetooth API support ✅
- **Opera**: Full Web Bluetooth API support ✅
- **Firefox**: Limited support (requires enabling flags) ⚠️
- **Safari**: Not supported ❌

### Test Environment Usage

1. **System Check**: Verify Web Bluetooth API and secure context support
2. **Mode Selection**: Choose between Real, Mock, or Expo testing modes
3. **Device Discovery**: Scan for compatible blood glucose meters
4. **Connection Management**: Connect to discovered devices
5. **Data Sync**: Retrieve glucose readings from connected devices
6. **Export Data**: Download readings and logs for analysis

```

```
