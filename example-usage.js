/**
 * Example usage of GlucoSync Bridge with xDrip+ and LibreLink streaming support
 */

import {
  GlucoseSyncBridge,
  GlucoseUnit,
  AuthorizationStatus,
} from "@glucosync/bridge";

// Create bridge instance
const bridge = new GlucoseSyncBridge({
  defaultUnit: GlucoseUnit.MGDL,
  autoInitialize: false,
});

async function setupGlucoseStreaming() {
  try {
    // Initialize the bridge
    await bridge.initialize();

    // Request permissions
    const authStatus = await bridge.requestAuthorization();
    if (authStatus !== AuthorizationStatus.AUTHORIZED) {
      console.error("Health data access not authorized");
      return;
    }

    // Check if streaming is supported (Android only)
    if (!bridge.isStreamingSupported()) {
      console.log("Real-time streaming not supported on this platform");
      return;
    }

    console.log("Starting glucose streaming...");

    // Start streaming with both xDrip+ and LibreLink support
    await bridge.startGlucoseStream({
      enableXDripStream: true, // Enable xDrip+ Inter-App broadcasts
      enableLibreLinkStream: true, // Enable LibreLink data through Health Connect
      minInterval: 30000, // Minimum 30 seconds between readings

      onReading: (reading) => {
        console.log("New glucose reading:", {
          value: reading.value,
          unit: reading.unit,
          source: reading.source,
          timestamp: new Date(reading.timestamp).toLocaleString(),
          trend: reading.metadata?.direction || "unknown",
        });

        // Handle the reading (save to database, update UI, etc.)
        handleNewGlucoseReading(reading);
      },

      onError: (error) => {
        console.error("Streaming error:", error.message);
      },
    });

    console.log("Glucose streaming started successfully");

    // Stop streaming after 1 hour (for demo purposes)
    setTimeout(async () => {
      try {
        await bridge.stopGlucoseStream();
        console.log("Glucose streaming stopped");
      } catch (error) {
        console.error("Error stopping streaming:", error);
      }
    }, 60 * 60 * 1000); // 1 hour
  } catch (error) {
    console.error("Error setting up glucose streaming:", error);
  }
}

function handleNewGlucoseReading(reading) {
  // Example: Check for high/low glucose alerts
  if (reading.value > 250) {
    console.warn("HIGH GLUCOSE ALERT:", reading.value, reading.unit);
    // Send notification, alert user, etc.
  } else if (reading.value < 70) {
    console.warn("LOW GLUCOSE ALERT:", reading.value, reading.unit);
    // Send notification, alert user, etc.
  }

  // Example: Store reading in local database
  // await database.storeGlucoseReading(reading);

  // Example: Send to remote server
  // await api.uploadGlucoseReading(reading);
}

// Alternative: Fetch historical data without streaming
async function fetchHistoricalData() {
  try {
    await bridge.initialize();

    const authStatus = await bridge.getAuthorizationStatus();
    if (authStatus !== AuthorizationStatus.AUTHORIZED) {
      console.error("Health data access not authorized");
      return;
    }

    // Get latest reading
    const latest = await bridge.getLatestGlucoseReading();
    console.log("Latest reading:", latest);

    // Get readings from the past week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const readings = await bridge.getGlucoseReadings({
      startDate: weekAgo.toISOString(),
      endDate: new Date().toISOString(),
      limit: 100,
      ascending: false, // Most recent first
    });

    console.log(`Found ${readings.length} readings from the past week`);
    readings.forEach((reading, index) => {
      console.log(
        `${index + 1}. ${reading.value} ${reading.unit} at ${new Date(
          reading.timestamp
        ).toLocaleString()} (${reading.source})`
      );
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
  }
}

// Bluetooth Glucose Meter Example
async function bluetoothGlucoseMeterExample() {
  try {
    // Create bridge with mock mode for testing
    const bluetoothBridge = new GlucoseSyncBridge({
      enableMockMode: true, // Enable mock mode for testing
      mockDeviceCount: 3,
      mockReadingCount: 50,
      autoInitialize: false,
    });

    await bluetoothBridge.initialize();

    // Check if Bluetooth is supported
    if (!bluetoothBridge.isBluetoothSupported()) {
      console.log("Bluetooth not supported on this platform");
      return;
    }

    console.log("Scanning for Bluetooth glucose meters...");

    // Scan for devices
    const devices = await bluetoothBridge.scanForBluetoothDevices({
      timeout: 10000,
      onDeviceFound: (device) => {
        console.log("Found device:", device.name, device.id);
      },
      onStateChange: (state) => {
        console.log("Scan state:", state);
      },
    });

    console.log(`Found ${devices.length} glucose meters:`);
    devices.forEach((device, index) => {
      console.log(
        `${index + 1}. ${device.name} (${device.manufacturer} ${device.model})`
      );
    });

    if (devices.length === 0) {
      console.log("No glucose meters found");
      return;
    }

    // Connect to the first device
    const deviceId = devices[0].id;
    console.log(`Connecting to ${devices[0].name}...`);

    const connected = await bluetoothBridge.connectToBluetoothDevice(deviceId, {
      timeout: 30000,
      autoSync: false,
      onStateChange: (state) => {
        console.log("Connection state:", state);
      },
    });

    if (!connected) {
      console.error("Failed to connect to device");
      return;
    }

    console.log("Connected successfully!");

    // Sync glucose readings
    console.log("Syncing glucose readings...");
    const readings = await bluetoothBridge.syncBluetoothDevice(deviceId);

    console.log(`Retrieved ${readings.length} readings:`);
    readings.slice(0, 10).forEach((reading, index) => {
      console.log(
        `${index + 1}. ${reading.value} ${reading.unit} at ${new Date(
          reading.timestamp
        ).toLocaleString()}`
      );
    });

    // Get connected devices
    const connectedDevices =
      await bluetoothBridge.getConnectedBluetoothDevices();
    console.log(`Currently connected to ${connectedDevices.length} device(s)`);

    // Disconnect
    console.log("Disconnecting...");
    await bluetoothBridge.disconnectBluetoothDevice(deviceId);
    console.log("Disconnected successfully");
  } catch (error) {
    console.error("Bluetooth example error:", error);
  }
}

// Real-time streaming and Bluetooth combined example
async function combinedExample() {
  try {
    const bridge = new GlucoseSyncBridge({
      enableMockMode: true, // Enable mock Bluetooth devices
      autoInitialize: false,
    });

    await bridge.initialize();

    // Start real-time streaming
    if (bridge.isStreamingSupported()) {
      console.log("Starting real-time glucose streaming...");
      await bridge.startGlucoseStream({
        enableXDripStream: true,
        enableLibreLinkStream: true,
        onReading: (reading) => {
          console.log(
            "Streaming reading:",
            reading.value,
            reading.unit,
            "from",
            reading.source
          );
        },
      });
    }

    // Simultaneously work with Bluetooth meters
    if (bridge.isBluetoothSupported()) {
      console.log("Working with Bluetooth glucose meters...");
      const devices = await bridge.scanForBluetoothDevices();

      if (devices.length > 0) {
        await bridge.connectToBluetoothDevice(devices[0].id);
        const bluetoothReadings = await bridge.syncBluetoothDevice(
          devices[0].id
        );
        console.log(
          `Synced ${bluetoothReadings.length} readings from Bluetooth meter`
        );
      }
    }

    console.log("Combined streaming and Bluetooth sync running...");
  } catch (error) {
    console.error("Combined example error:", error);
  }
}

// Run examples
if (require.main === module) {
  console.log("=== GlucoSync Bridge Examples ===\n");

  console.log("1. Real-time Streaming Example:");
  setupGlucoseStreaming();

  setTimeout(() => {
    console.log("\n2. Historical Data Example:");
    fetchHistoricalData();
  }, 2000);

  setTimeout(() => {
    console.log("\n3. Bluetooth Glucose Meter Example:");
    bluetoothGlucoseMeterExample();
  }, 4000);

  setTimeout(() => {
    console.log("\n4. Combined Example:");
    combinedExample();
  }, 6000);
}
