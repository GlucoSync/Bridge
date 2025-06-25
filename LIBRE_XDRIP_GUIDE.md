# LibreLink and xDrip+ Integration Guide

## Overview

GlucoSync Bridge now supports real-time glucose streaming from multiple sources on Android:

1. **LibreLink App** - via Android Health Connect
2. **xDrip+** - via Inter-App broadcasts
3. **Other CGM Apps** - that support the xDrip+ Inter-App protocol

## LibreLink Integration

### Setup Requirements

1. **LibreLink App**: Install and configure the official LibreLink app
2. **Health Connect**: Ensure Android Health Connect is installed and updated
3. **Permissions**: Grant Health Connect access to both LibreLink and your app

### LibreLink → Health Connect Setup

1. Open LibreLink app
2. Go to Settings → Connected Apps → Health Connect
3. Enable "Blood Glucose" data sharing
4. Ensure readings are being synced to Health Connect

### Verification

To verify LibreLink is syncing to Health Connect:

1. Open Health Connect app
2. Go to "Data and privacy" → "Blood glucose"
3. Check that LibreLink is listed as a data source
4. Verify recent readings appear in the list

## xDrip+ Integration

### xDrip+ Setup

1. **Install xDrip+**: Download from GitHub or F-Droid
2. **Configure Data Source**: Set up your CGM (Libre, Dexcom, etc.)
3. **Enable Inter-App Broadcasts**:
   - Go to Settings → Inter-app settings
   - Enable "Broadcast Locally"
   - Enable "xDrip+ Sync Settings" → "Send Display Glucose"

### Broadcasting Settings

In xDrip+ Settings → Inter-app settings:

- ✅ **Broadcast Locally**: Must be enabled
- ✅ **Send Display Glucose**: Recommended
- ✅ **Send Raw Glucose**: Optional (for raw sensor data)
- ✅ **Send Filtered Glucose**: Optional (for noise-filtered data)

### Compatible Apps

The xDrip+ Inter-App protocol is also supported by:

- **Diabox** (Libre reader app)
- **Glimp** (Libre reader app)
- **Custom CGM Solutions**

## Implementation Example

```javascript
import { GlucoseSyncBridge } from "@glucosync/bridge";

const bridge = new GlucoseSyncBridge();

// Initialize and request permissions
await bridge.initialize();
await bridge.requestAuthorization();

// Start streaming from both sources
await bridge.startGlucoseStream({
  enableXDripStream: true, // xDrip+ broadcasts
  enableLibreLinkStream: true, // LibreLink via Health Connect
  minInterval: 60000, // 1 minute minimum between readings

  onReading: (reading) => {
    console.log(
      `New reading: ${reading.value} ${reading.unit} from ${reading.source}`
    );

    // Handle based on source
    if (reading.source === "xDrip+") {
      // Real-time CGM data with trend information
      console.log("Trend:", reading.metadata?.direction);
      console.log("Raw value:", reading.metadata?.raw);
    } else if (reading.source === "LibreLink") {
      // Official LibreLink readings
      console.log("LibreLink reading - highly accurate");
    }
  },

  onError: (error) => {
    console.error("Streaming error:", error.message);
  },
});
```

## Data Sources Priority

When both sources are enabled, you may receive duplicate readings. The library handles this by:

1. **Timestamp deduplication**: Readings with identical timestamps are filtered
2. **Minimum interval**: Configurable minimum time between readings
3. **Source identification**: Each reading includes its source for handling

## Troubleshooting

### LibreLink Not Syncing

1. **Check Health Connect**: Verify LibreLink appears in Health Connect data sources
2. **Permissions**: Ensure both apps have necessary permissions
3. **Background Sync**: Allow LibreLink to run in background
4. **Force Sync**: Open LibreLink and manually sync readings

### xDrip+ Broadcasts Not Working

1. **Inter-App Settings**: Verify "Broadcast Locally" is enabled
2. **Permissions**: Check app has permission to receive broadcasts
3. **Background Processing**: Ensure your app can receive background broadcasts
4. **Test Broadcasting**: Use xDrip+ → Settings → Inter-app → "Send test broadcast"

### Battery Optimization

Android may kill background processes. To ensure reliable streaming:

1. **Disable Battery Optimization**:

   - Go to Settings → Apps → [Your App] → Battery
   - Select "Don't optimize"

2. **Allow Background Activity**:

   - Enable "Allow background activity" for your app

3. **Auto-Start Management**:
   - Some Android variants require enabling auto-start for apps

## Privacy and Security

- **Local Processing**: All data stays on device unless explicitly sent elsewhere
- **No Cloud Dependency**: Works entirely offline
- **Encrypted Storage**: Use encrypted storage for sensitive glucose data
- **User Consent**: Always obtain explicit user consent before accessing health data

## Technical Details

### xDrip+ Broadcast Format

The xDrip+ Inter-App broadcast includes:

```javascript
{
  glucose: 120,          // Current glucose value (mg/dL)
  timestamp: 1641234567, // Unix timestamp
  raw: 115.5,           // Raw sensor value
  filtered: 119.8,      // Filtered/smoothed value
  direction: "Flat",    // Trend direction
  slope: 0.1,          // Rate of change
  noise: 1,            // Noise level
  battery: 85          // Sensor battery level
}
```

### Health Connect Data

LibreLink data through Health Connect provides:

- **Timestamp**: When reading was taken
- **Value**: Glucose level with unit conversion
- **Source**: App that provided the data
- **Specimen Source**: Type of sample (interstitial fluid, blood, etc.)
- **Meal Relation**: Fasting, before meal, after meal, etc.

## Migration from Other Solutions

If you're currently using other glucose monitoring solutions:

1. **From Nightscout**: Import historical data, then switch to real-time streaming
2. **From Direct xDrip+**: Simply enable the bridge alongside existing xDrip+ setup
3. **From LibreLink Only**: Add xDrip+ for enhanced features while keeping LibreLink accuracy
