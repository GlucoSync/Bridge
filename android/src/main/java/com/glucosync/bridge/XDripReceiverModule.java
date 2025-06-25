package com.glucosync.bridge;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

/**
 * Native module for receiving xDrip+ Inter-App glucose broadcasts
 * 
 * This module listens for broadcasts from xDrip+ and other compatible CGM apps
 * that use the standardized inter-app communication protocol.
 */
public class XDripReceiverModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "XDripReceiver";
    private static final String TAG = "XDripReceiver";
    
    // xDrip+ Inter-App broadcast action
    private static final String XDRIP_ACTION_NEW_BG_ESTIMATE = "com.eveningoutpost.dexdrip.BgEstimate";
    private static final String EVENT_NAME = "xDripGlucoseReading";
    
    private ReactApplicationContext reactContext;
    private BroadcastReceiver xDripReceiver;
    private boolean isListening = false;

    public XDripReceiverModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Start listening for xDrip+ broadcasts
     */
    @ReactMethod
    public void startListening(Promise promise) {
        try {
            if (isListening) {
                promise.resolve(true);
                return;
            }

            Log.d(TAG, "Starting xDrip+ broadcast listener");
            
            // Create broadcast receiver
            xDripReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    handleXDripBroadcast(intent);
                }
            };

            // Register receiver for xDrip+ broadcasts
            IntentFilter filter = new IntentFilter();
            filter.addAction(XDRIP_ACTION_NEW_BG_ESTIMATE);
            
            reactContext.registerReceiver(xDripReceiver, filter);
            isListening = true;
            
            Log.d(TAG, "xDrip+ broadcast listener started successfully");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start xDrip+ listener", e);
            promise.reject("START_LISTENING_ERROR", "Failed to start xDrip+ listener: " + e.getMessage());
        }
    }

    /**
     * Stop listening for xDrip+ broadcasts
     */
    @ReactMethod
    public void stopListening(Promise promise) {
        try {
            if (!isListening || xDripReceiver == null) {
                promise.resolve(true);
                return;
            }

            Log.d(TAG, "Stopping xDrip+ broadcast listener");
            
            reactContext.unregisterReceiver(xDripReceiver);
            xDripReceiver = null;
            isListening = false;
            
            Log.d(TAG, "xDrip+ broadcast listener stopped successfully");
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop xDrip+ listener", e);
            promise.reject("STOP_LISTENING_ERROR", "Failed to stop xDrip+ listener: " + e.getMessage());
        }
    }

    /**
     * Check if currently listening for broadcasts
     */
    @ReactMethod
    public void isListening(Promise promise) {
        promise.resolve(isListening);
    }

    /**
     * Handle incoming xDrip+ broadcast
     */
    private void handleXDripBroadcast(Intent intent) {
        try {
            Bundle extras = intent.getExtras();
            if (extras == null) {
                Log.w(TAG, "Received xDrip+ broadcast with no extras");
                return;
            }

            // Extract glucose data from broadcast
            WritableMap glucoseData = Arguments.createMap();
            
            // Core glucose values
            if (extras.containsKey("glucose")) {
                glucoseData.putDouble("value", extras.getDouble("glucose"));
                glucoseData.putDouble("glucose", extras.getDouble("glucose"));
            }
            
            if (extras.containsKey("timestamp")) {
                glucoseData.putDouble("timestamp", extras.getLong("timestamp"));
            }
            
            if (extras.containsKey("raw")) {
                glucoseData.putDouble("raw", extras.getDouble("raw"));
            }
            
            if (extras.containsKey("filtered")) {
                glucoseData.putDouble("filtered", extras.getDouble("filtered"));
            }
            
            // Trend and slope information
            if (extras.containsKey("slope")) {
                glucoseData.putDouble("slope", extras.getDouble("slope"));
            }
            
            if (extras.containsKey("direction")) {
                glucoseData.putString("direction", extras.getString("direction"));
            }
            
            if (extras.containsKey("noise")) {
                glucoseData.putInt("noise", extras.getInt("noise"));
            }
            
            // Units and source
            if (extras.containsKey("units")) {
                glucoseData.putString("units", extras.getString("units"));
            } else {
                glucoseData.putString("units", "mg/dL"); // Default for xDrip+
            }
            
            glucoseData.putString("source", "xDrip+");
            
            // Battery and sensor information (if available)
            if (extras.containsKey("battery")) {
                glucoseData.putInt("battery", extras.getInt("battery"));
            }
            
            if (extras.containsKey("sensor_age")) {
                glucoseData.putLong("sensorAge", extras.getLong("sensor_age"));
            }

            Log.d(TAG, "Received xDrip+ glucose reading: " + glucoseData.toString());
            
            // Send to React Native
            if (reactContext.hasActiveCatalystInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                    .emit(EVENT_NAME, glucoseData);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error processing xDrip+ broadcast", e);
        }
    }

    /**
     * Clean up when module is destroyed
     */
    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (isListening && xDripReceiver != null) {
            try {
                reactContext.unregisterReceiver(xDripReceiver);
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering receiver during cleanup", e);
            }
        }
    }
}
