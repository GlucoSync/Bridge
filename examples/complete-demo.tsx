/**
 * Complete GlucoSync Bridge Example
 * Demonstrates all features: Health data, streaming, and Bluetooth glucose meters
 */

import React, { useState, useEffect } from "react";
import { View, Text, Button, ScrollView, Alert } from "react-native";
import {
  GlucoseSyncBridge,
  GlucoseUnit,
  AuthorizationStatus,
  BluetoothConnectionState,
  GlucoseReading,
  BluetoothGlucoseMeter,
} from "@glucosync/bridge";

const GlucoseApp = () => {
  const [bridge] = useState(
    () =>
      new GlucoseSyncBridge({
        defaultUnit: GlucoseUnit.MGDL,
        enableMockMode: true, // Enable for testing
        mockDeviceCount: 2,
        autoInitialize: false,
      })
  );

  const [isInitialized, setIsInitialized] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthorizationStatus>(
    AuthorizationStatus.NOT_DETERMINED
  );
  const [latestReading, setLatestReading] = useState<GlucoseReading | null>(
    null
  );
  const [historicalReadings, setHistoricalReadings] = useState<
    GlucoseReading[]
  >([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingReadings, setStreamingReadings] = useState<GlucoseReading[]>(
    []
  );

  // Bluetooth state
  const [bluetoothDevices, setBluetoothDevices] = useState<
    BluetoothGlucoseMeter[]
  >([]);
  const [connectedDevices, setConnectedDevices] = useState<
    BluetoothGlucoseMeter[]
  >([]);
  const [bluetoothReadings, setBluetoothReadings] = useState<GlucoseReading[]>(
    []
  );
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    initializeBridge();
  }, []);

  const initializeBridge = async () => {
    try {
      await bridge.initialize();
      setIsInitialized(true);

      const status = await bridge.getAuthorizationStatus();
      setAuthStatus(status);

      // Get latest reading if authorized
      if (status === AuthorizationStatus.AUTHORIZED) {
        const reading = await bridge.getLatestGlucoseReading();
        setLatestReading(reading);
      }
    } catch (error) {
      console.error("Initialization error:", error);
      Alert.alert("Error", "Failed to initialize glucose bridge");
    }
  };

  const requestAuthorization = async () => {
    try {
      const status = await bridge.requestAuthorization();
      setAuthStatus(status);

      if (status === AuthorizationStatus.AUTHORIZED) {
        Alert.alert("Success", "Health data access granted");
        const reading = await bridge.getLatestGlucoseReading();
        setLatestReading(reading);
      } else {
        Alert.alert("Permission Denied", "Health data access not granted");
      }
    } catch (error) {
      console.error("Authorization error:", error);
      Alert.alert("Error", "Failed to request authorization");
    }
  };

  const fetchHistoricalData = async () => {
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const readings = await bridge.getGlucoseReadings({
        startDate: weekAgo.toISOString(),
        endDate: new Date().toISOString(),
        limit: 50,
        ascending: false,
      });

      setHistoricalReadings(readings);
      Alert.alert(
        "Success",
        `Retrieved ${readings.length} historical readings`
      );
    } catch (error) {
      console.error("Fetch historical error:", error);
      Alert.alert("Error", "Failed to fetch historical data");
    }
  };

  const startStreaming = async () => {
    try {
      if (!bridge.isStreamingSupported()) {
        Alert.alert(
          "Not Supported",
          "Real-time streaming not supported on this platform"
        );
        return;
      }

      await bridge.startGlucoseStream({
        enableXDripStream: true,
        enableLibreLinkStream: true,
        minInterval: 30000, // 30 seconds
        onReading: (reading) => {
          console.log("New streaming reading:", reading);
          setStreamingReadings((prev) => [reading, ...prev.slice(0, 9)]); // Keep last 10

          // Alert for extreme values
          if (reading.value > 250 || reading.value < 70) {
            Alert.alert(
              "Glucose Alert",
              `${reading.value} ${reading.unit} from ${reading.source}`,
              [{ text: "OK" }]
            );
          }
        },
        onError: (error) => {
          console.error("Streaming error:", error);
          Alert.alert("Streaming Error", error.message);
        },
      });

      setIsStreaming(true);
      Alert.alert("Success", "Glucose streaming started");
    } catch (error) {
      console.error("Start streaming error:", error);
      Alert.alert("Error", "Failed to start streaming");
    }
  };

  const stopStreaming = async () => {
    try {
      await bridge.stopGlucoseStream();
      setIsStreaming(false);
      Alert.alert("Success", "Glucose streaming stopped");
    } catch (error) {
      console.error("Stop streaming error:", error);
      Alert.alert("Error", "Failed to stop streaming");
    }
  };

  // Bluetooth Methods
  const scanForBluetoothDevices = async () => {
    try {
      if (!bridge.isBluetoothSupported()) {
        Alert.alert(
          "Not Supported",
          "Bluetooth not supported on this platform"
        );
        return;
      }

      setIsScanning(true);
      setBluetoothDevices([]);

      const devices = await bridge.scanForBluetoothDevices({
        timeout: 10000,
        onDeviceFound: (device) => {
          console.log("Found device:", device.name);
          setBluetoothDevices((prev) => [...prev, device]);
        },
        onStateChange: (state) => {
          console.log("Scan state:", state);
        },
      });

      setIsScanning(false);
      Alert.alert("Scan Complete", `Found ${devices.length} glucose meters`);
    } catch (error) {
      setIsScanning(false);
      console.error("Bluetooth scan error:", error);
      Alert.alert("Scan Error", error.message);
    }
  };

  const connectToDevice = async (deviceId: string) => {
    try {
      const connected = await bridge.connectToBluetoothDevice(deviceId, {
        timeout: 30000,
        autoSync: false,
        onStateChange: (state) => {
          console.log("Connection state:", state);
        },
      });

      if (connected) {
        const updatedDevices = await bridge.getConnectedBluetoothDevices();
        setConnectedDevices(updatedDevices);
        Alert.alert("Connected", "Successfully connected to glucose meter");
      }
    } catch (error) {
      console.error("Connect error:", error);
      Alert.alert("Connection Error", error.message);
    }
  };

  const syncDevice = async (deviceId: string) => {
    try {
      const readings = await bridge.syncBluetoothDevice(deviceId);
      setBluetoothReadings((prev) => [...readings, ...prev]);
      Alert.alert(
        "Sync Complete",
        `Retrieved ${readings.length} readings from device`
      );
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Sync Error", error.message);
    }
  };

  const disconnectDevice = async (deviceId: string) => {
    try {
      await bridge.disconnectBluetoothDevice(deviceId);
      const updatedDevices = await bridge.getConnectedBluetoothDevices();
      setConnectedDevices(updatedDevices);
      Alert.alert("Disconnected", "Device disconnected successfully");
    } catch (error) {
      console.error("Disconnect error:", error);
      Alert.alert("Disconnect Error", error.message);
    }
  };

  const renderGlucoseReading = (reading: GlucoseReading, index: number) => (
    <View
      key={reading.id || index}
      style={{ padding: 10, borderBottomWidth: 1, borderColor: "#eee" }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold" }}>
        {reading.value} {reading.unit}
      </Text>
      <Text style={{ fontSize: 12, color: "#666" }}>
        {new Date(reading.timestamp).toLocaleString()}
      </Text>
      <Text style={{ fontSize: 12, color: "#999" }}>
        Source: {reading.source || "Unknown"}
      </Text>
    </View>
  );

  const renderBluetoothDevice = (device: BluetoothGlucoseMeter) => (
    <View
      key={device.id}
      style={{ padding: 10, borderBottomWidth: 1, borderColor: "#eee" }}
    >
      <Text style={{ fontSize: 16, fontWeight: "bold" }}>{device.name}</Text>
      <Text style={{ fontSize: 12, color: "#666" }}>
        {device.manufacturer} {device.model}
      </Text>
      <Text style={{ fontSize: 12, color: "#999" }}>
        State: {device.connectionState}
      </Text>

      <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
        {device.connectionState === BluetoothConnectionState.DISCONNECTED && (
          <Button title="Connect" onPress={() => connectToDevice(device.id)} />
        )}
        {device.connectionState === BluetoothConnectionState.CONNECTED && (
          <>
            <Button title="Sync" onPress={() => syncDevice(device.id)} />
            <Button
              title="Disconnect"
              onPress={() => disconnectDevice(device.id)}
            />
          </>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        GlucoSync Bridge Demo
      </Text>

      {/* Initialization Status */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>Status</Text>
        <Text>Initialized: {isInitialized ? "Yes" : "No"}</Text>
        <Text>Authorization: {authStatus}</Text>
        <Text>Platform: {bridge.getPlatform()}</Text>
        <Text>
          Streaming Supported: {bridge.isStreamingSupported() ? "Yes" : "No"}
        </Text>
        <Text>
          Bluetooth Supported: {bridge.isBluetoothSupported() ? "Yes" : "No"}
        </Text>
      </View>

      {/* Authorization */}
      {authStatus !== AuthorizationStatus.AUTHORIZED && (
        <View style={{ marginBottom: 20 }}>
          <Button
            title="Request Authorization"
            onPress={requestAuthorization}
          />
        </View>
      )}

      {/* Latest Reading */}
      {latestReading && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Latest Reading
          </Text>
          {renderGlucoseReading(latestReading, 0)}
        </View>
      )}

      {/* Historical Data */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Historical Data
        </Text>
        <Button title="Fetch Last Week" onPress={fetchHistoricalData} />
        {historicalReadings.slice(0, 5).map(renderGlucoseReading)}
        {historicalReadings.length > 5 && (
          <Text style={{ textAlign: "center", marginTop: 10, color: "#666" }}>
            ... and {historicalReadings.length - 5} more
          </Text>
        )}
      </View>

      {/* Real-time Streaming */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Real-time Streaming
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <Button
            title={isStreaming ? "Stop Streaming" : "Start Streaming"}
            onPress={isStreaming ? stopStreaming : startStreaming}
          />
        </View>
        {streamingReadings.length > 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              Live Readings:
            </Text>
            {streamingReadings.slice(0, 3).map(renderGlucoseReading)}
          </View>
        )}
      </View>

      {/* Bluetooth Glucose Meters */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Bluetooth Glucose Meters
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <Button
            title={isScanning ? "Scanning..." : "Scan for Devices"}
            onPress={scanForBluetoothDevices}
            disabled={isScanning}
          />
        </View>

        {bluetoothDevices.length > 0 && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              Available Devices:
            </Text>
            {bluetoothDevices.map(renderBluetoothDevice)}
          </View>
        )}

        {connectedDevices.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              Connected Devices:
            </Text>
            {connectedDevices.map(renderBluetoothDevice)}
          </View>
        )}

        {bluetoothReadings.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold" }}>
              Bluetooth Readings:
            </Text>
            {bluetoothReadings.slice(0, 5).map(renderGlucoseReading)}
            {bluetoothReadings.length > 5 && (
              <Text
                style={{ textAlign: "center", marginTop: 10, color: "#666" }}
              >
                ... and {bluetoothReadings.length - 5} more from Bluetooth
                devices
              </Text>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default GlucoseApp;
