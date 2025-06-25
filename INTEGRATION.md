# Integration Instructions

## Installing GlucoSync Bridge with xDrip+ and LibreLink Support

### 1. Install the Package

```bash
npm install @glucosync/bridge
```

### 2. Android Setup

#### Add Native Module

1. **Add to MainApplication.java**:

```java
// android/app/src/main/java/com/yourapp/MainApplication.java
import com.glucosync.bridge.GlucosyncBridgePackage;

public class MainApplication extends Application implements ReactApplication {
    // ... existing code ...
    
    @Override
    protected List<ReactPackage> getPackages() {
        @SuppressWarnings("UnnecessaryLocalVariable")
        List<ReactPackage> packages = new PackageList(this).getPackages();
        
        // Add GlucoSync Bridge package
        packages.add(new GlucosyncBridgePackage());
        
        return packages;
    }
}
```

#### Add Permissions

2. **Update AndroidManifest.xml**:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Health Connect permissions -->
    <uses-permission android:name="android.permission.health.READ_BLOOD_GLUCOSE" />
    <uses-permission android:name="android.permission.health.WRITE_BLOOD_GLUCOSE" />
    
    <!-- xDrip+ broadcast permissions -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <application>
        <!-- xDrip+ broadcast receiver -->
        <receiver
            android:name="com.glucosync.bridge.XDripBroadcastReceiver"
            android:enabled="true"
            android:exported="true">
            <intent-filter>
                <action android:name="com.eveningoutpost.dexdrip.BgEstimate" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

#### Copy Native Files

3. **Copy the native Android files** from this package to your project:

```
Copy from: node_modules/@glucosync/bridge/android/
Copy to: android/app/src/main/java/com/glucosync/bridge/
```

Files to copy:
- `XDripReceiverModule.java`
- `GlucosyncBridgePackage.java`

### 3. iOS Setup (Basic Support)

No additional setup required for iOS - uses react-native-health.

### 4. Dependencies

Ensure you have these peer dependencies installed:

```bash
# For Health Connect (Android)
npm install react-native-health-connect

# For HealthKit (iOS)
npm install react-native-health

# React Native core
npm install react-native
```

### 5. Usage Example

```javascript
import { GlucoseSyncBridge, GlucoseUnit } from '@glucosync/bridge';

const bridge = new GlucoseSyncBridge({
  defaultUnit: GlucoseUnit.MGDL,
  autoInitialize: true,
});

// Check platform capabilities
if (bridge.isStreamingSupported()) {
  // Android - supports real-time streaming
  console.log('Real-time streaming available');
} else {
  // iOS - polling only
  console.log('Polling mode only');
}

// Initialize and request permissions
await bridge.initialize();
await bridge.requestAuthorization();

// Start streaming (Android only)
if (bridge.isStreamingSupported()) {
  await bridge.startGlucoseStream({
    enableXDripStream: true,
    enableLibreLinkStream: true,
    minInterval: 60000, // 1 minute
    
    onReading: (reading) => {
      console.log('New reading:', reading);
    },
    
    onError: (error) => {
      console.error('Stream error:', error);
    }
  });
}

// Or fetch historical data
const readings = await bridge.getGlucoseReadings({
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  limit: 100
});
```

### 6. Build Configuration

#### Android Gradle

Make sure your `android/app/build.gradle` includes:

```gradle
android {
    compileSdkVersion 34
    
    defaultConfig {
        targetSdkVersion 34
    }
}

dependencies {
    implementation 'androidx.health.connect:connect-client:1.1.0'
}
```

#### Proguard

If using Proguard, add these rules to `android/app/proguard-rules.pro`:

```proguard
# Keep GlucoSync Bridge classes
-keep class com.glucosync.bridge.** { *; }

# Keep Health Connect classes
-keep class androidx.health.connect.** { *; }
```

### 7. Testing Setup

To test xDrip+ integration without a real CGM:

1. Install xDrip+ from GitHub
2. Go to Settings → Hardware Data Source → "Random"
3. Enable Settings → Inter-app settings → "Broadcast Locally"
4. Your app should start receiving test glucose readings

### 8. Troubleshooting

#### Common Issues

1. **"XDripReceiver native module not found"**
   - Ensure you copied the native files correctly
   - Rebuild the Android app after adding files

2. **"Health Connect not available"**
   - Install Health Connect from Google Play Store
   - Ensure target API level is 34 or higher

3. **No broadcasts received from xDrip+**
   - Check xDrip+ Inter-app settings
   - Verify broadcast permissions in AndroidManifest.xml
   - Test with xDrip+ "Send test broadcast" feature

4. **LibreLink data not syncing**
   - Open LibreLink app and enable Health Connect sharing
   - Check Health Connect app for permission grants
   - Ensure LibreLink has recent readings

### 9. Production Considerations

- **Battery Optimization**: Request users to disable battery optimization for your app
- **Background Processing**: Ensure your app can receive broadcasts in background
- **Data Privacy**: Implement proper encryption for stored glucose data
- **User Consent**: Always obtain explicit consent before accessing health data
- **Error Handling**: Implement robust error handling for network/sensor failures

### 10. Support

For issues specific to:
- **xDrip+**: Check xDrip+ GitHub issues and documentation
- **LibreLink**: Ensure you're using the official Abbott LibreLink app
- **Health Connect**: Verify compatibility with Android version and Health Connect app version
- **This Package**: Create issues in the GlucoSync Bridge repository
