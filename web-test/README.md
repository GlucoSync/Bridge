# Web Test Environment Usage Guide

## Quick Start

1. **Start a local server** (required for Web Bluetooth API):

   ```bash
   # Simple HTTP server
   python -m http.server 8080

   # Or with Node.js
   npx http-server . -p 8080
   ```

2. **Open the test environment**:
   - Navigate to: `http://localhost:8080/web-test/ble-test.html`
   - For real Bluetooth testing, use HTTPS: `https://localhost:8080/web-test/ble-test.html`

## Step-by-Step Testing

### 1. System Check

- Verify Web Bluetooth API support
- Check HTTPS/secure context
- Confirm platform compatibility

### 2. Device Discovery

- Click "Scan for Devices"
- Wait for devices to appear

### 3. Device Connection

- Click "Connect" on individual devices
- Or use "Connect All" for batch connection
- Monitor connection status

### 4. Data Synchronization

- Click "Sync" on connected devices
- Or use "Sync All" for batch synchronization
- View readings in the readings panel

### 5. Data Export

- Export readings as JSON for analysis
- Export debug logs for troubleshooting
- Clear data as needed

## Troubleshooting

### Web Bluetooth Not Supported

- **Solution**: Use Chrome, Edge, or Opera browser
- **Alternative**: Use Mock Mode for testing

### Not Secure Context

- **Solution**: Use HTTPS or localhost
- **Alternative**: Set up local SSL certificate

### Device Not Found

- **Check**: Device is in pairing mode
- **Check**: Device supports Bluetooth LE
- **Check**: Device is compatible with glucose service UUID

### Connection Fails

- **Check**: Device is not connected to another app
- **Check**: Bluetooth is enabled on computer
- **Try**: Reset device and retry

### No Readings Received

- **Check**: Device has stored readings
- **Check**: Proper glucose service characteristics
- **Try**: Manual sync from device

## Supported Glucose Meters

The test environment is designed to work with Bluetooth LE glucose meters that implement the Bluetooth SIG Glucose Profile, including:

- Abbott FreeStyle series
- Roche Accu-Chek series
- LifeScan OneTouch series
- Ascensia Contour series
- Bayer Breeze series

## Browser Developer Tools

Use Chrome DevTools for advanced debugging:

1. **Console Tab**: View JavaScript logs and errors
2. **Application Tab > Storage**: Check for stored data
3. **Network Tab**: Monitor Bluetooth API calls
4. **Security Tab**: Verify HTTPS status
