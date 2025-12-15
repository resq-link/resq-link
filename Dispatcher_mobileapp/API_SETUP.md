# API Configuration Guide

> **Note**: Currently, the app is in **UI Mode** (enabled by default), which means it uses mock data and doesn't require a backend API. This guide is for when you're ready to connect to a real backend API.

## Problem
The mobile app needs to connect to your backend API server. When running on a physical device or emulator, `localhost` won't work because it refers to the device itself, not your development machine.

## Solution

### Option 1: Automatic Detection (Recommended)
The app will automatically try to detect your local IP from the Expo dev server connection. This works when:
- Running `expo start` or `npx expo start`
- The Expo dev server shows your local IP in the connection URLs

### Option 2: Manual Configuration
If automatic detection doesn't work, manually set your local IP address:

1. **Find your local IP address:**
   - **Windows**: Open Command Prompt and run `ipconfig`, look for "IPv4 Address" under your active network adapter
   - **Mac/Linux**: Open Terminal and run `ifconfig` or `ip addr`, look for your local network IP (usually starts with 192.168.x.x or 10.0.x.x)

2. **Update `app.json`:**
   ```json
   "extra": {
     "apiUrl": "http://YOUR_IP_ADDRESS:4000"
   }
   ```
   
   Example:
   ```json
   "apiUrl": "http://192.168.1.100:4000"
   ```

3. **Or use environment variable:**
   Create a `.env` file in the mobile app directory:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:4000
   ```

### Option 3: Use Expo Tunnel
If you're having network issues, you can use Expo's tunnel feature:
```bash
npx expo start --tunnel
```
This creates a public URL that works from anywhere, but may be slower.

## Troubleshooting

1. **Make sure your backend API server is running:**
   - You'll need to set up your own backend API server
   - The API should be accessible on port 4000 (or configure a different port)
   - The mobile app expects endpoints like:
     - `POST /api/auth/login`
     - `POST /api/auth/register`
     - `GET /api/emergency/list?userId=...`
     - `POST /api/emergency/submit`
     - `GET /api/responders/locations`

2. **Check firewall settings:**
   - Make sure your firewall allows connections on port 4000
   - Windows: Check Windows Defender Firewall
   - Mac: Check System Preferences > Security & Privacy > Firewall

3. **Verify the IP address:**
   - Make sure your mobile device/emulator is on the same network as your development machine
   - Try accessing `http://YOUR_IP:4000` from a browser on your device to test connectivity

4. **Check the console:**
   - The app logs the API URL being used when it starts
   - Look for: `📱 API Base URL: http://...`

## Testing
After configuration, try logging in with your backend API credentials.

## UI Mode (Current Default)
The app is currently configured to use **UI Mode** with mock data, which means:
- ✅ No backend required
- ✅ All screens work with sample data
- ✅ Perfect for UI development and testing

To switch to real API mode, update `app.json`:
```json
"extra": {
  "uiMode": false,
  "apiUrl": "http://YOUR_BACKEND_URL:4000"
}
```

See `UI_DEVELOPMENT.md` for more information about UI Mode.

