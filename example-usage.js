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
      await bridge.requestAuthorization();
    }

    // Get readings from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const readings = await bridge.getGlucoseReadings({
      startDate: yesterday.toISOString(),
      endDate: new Date().toISOString(),
      limit: 100,
      ascending: false, // Most recent first
    });

    console.log(`Retrieved ${readings.length} historical readings`);

    // Process historical data
    readings.forEach((reading) => {
      console.log(
        `${new Date(reading.timestamp).toLocaleString()}: ${reading.value} ${
          reading.unit
        } (${reading.source})`
      );
    });
  } catch (error) {
    console.error("Error fetching historical data:", error);
  }
}

// Export functions for use in your app
export { setupGlucoseStreaming, fetchHistoricalData };
