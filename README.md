# Push Notification Demo

Real-time push notifications using WebSockets with Node.js server, React web app, and Android app
for AOSP devices.

## 🚀 Quick Start

### Step 1: Start the WebSocket Server

```bash
cd server
npm install
npm start
```

✅ Server should be running on `ws://localhost:3001`

### Step 2: Install the Android App

**Option A - Using Android Studio:**

1. Open the `android` folder in Android Studio
2. Wait for Gradle sync to complete
3. Click "Run" button (or Shift+F10)

**Option B - Using Command Line:**
```bash
cd android
./gradlew installDebug
```

✅ App installs as "Push Notifications Via WebSockets"

### Step 3: Connect and Test!

**In the Android App:**

1. Open the app (it will show "Disconnected" status with a red indicator)
2. Tap the **"Start Service"** button
3. Grant notification permission if prompted
4. Wait a moment - the status should change to "Connected" with a green indicator

**Send a Test Notification:**

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello from Server! 👋",
    "message": "Your push notification system is working!",
    "data": {
      "priority": "high",
      "category": "test"
    }
  }'
```

**Or use the web app:**

```bash
cd web
npm install
npm run dev
# Open http://localhost:5173
# Use the UI to send notifications
```

## Project Structure

```
├── server/     # Node.js WebSocket server (port 3001)
├── web/        # React TypeScript web app (port 5173)
├── android/    # Android AOSP app with foreground service
└── docs/       # Documentation
    ├── architecture/  # System architecture and design
    └── debugging/     # Troubleshooting guides
```

## System Components

### 1. Android Application (Kotlin + Jetpack Compose)

- Foreground service for persistent WebSocket connection
- Real-time notification display with Material Design 3 UI
- Notification history (last 50 notifications)
- Automatic reconnection with 5-second delay
- Runtime permission handling for Android 13+

### 2. WebSocket Server (Node.js)

- Real-time bidirectional communication
- Client identification and tracking
- Broadcast and targeted notifications
- RESTful API for sending notifications

### 3. Web Dashboard (React + TypeScript)

- Monitor connected clients
- Send notifications via UI
- View notification history
- Real-time connection status

## Features

### Server & Web
- Real-time WebSocket communication
- Broadcast notifications to all clients
- Targeted notifications to specific clients
- Auto-reconnect with retry logic
- Live server status and client monitoring
- Modern React UI with TypeScript
- Client identification (Web/Android Emulator/Android Device)

### Android App

- Persistent WebSocket connection via foreground service
- System notifications with custom data
- Real-time notification history (last 50)
- Automatic reconnection on failure
- Material Design 3 UI
- Runtime permission handling (Android 13+)
- Connection status indicator
- Message validation and filtering

## Permissions

The Android app requires the following permissions (all configured in `AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

The app automatically requests `POST_NOTIFICATIONS` permission on Android 13+ at runtime.

## API

**WebSocket:** `ws://localhost:3001`

**REST Endpoints:**
- `GET /api/status` - Server status
- `POST /api/notifications/broadcast` - Send to all clients
- `POST /api/notifications/send/:clientId` - Send to specific client

**Example:**
```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "Hello from the server!",
    "data": {
      "priority": "high",
      "category": "test"
    }
  }'
```

## Architecture Highlights

### Service Pattern

- **Foreground Service** - Runs in background with persistent notification
- **Binder Pattern** - Activity binds to service for bidirectional communication
- **Callback Pattern** - Service notifies activity of connection and notification events

### Threading Model

- **Main Thread** - UI updates and Compose recomposition
- **Service Thread** - WebSocket management and notification handling
- **OkHttp Thread** - Network I/O operations

### State Management

- **Compose State** - Reactive UI with `mutableStateOf` and `mutableStateListOf`
- **Service State** - Connection status and WebSocket instance management
- **Persistent State** - Service survives activity recreation

## Android Configuration

### For Android Emulator

The app is pre-configured with `ws://10.0.2.2:3001` (localhost for emulator)

### For Physical Devices

1. Find your computer's local IP address:
    - **macOS/Linux**: `ifconfig | grep "inet "`
    - **Windows**: `ipconfig`

2. Update `android/app/src/main/java/com/push/notifications/via/ws/service/WebSocketService.kt`:
   ```kotlin
   private const val WS_URL = "ws://YOUR_LOCAL_IP:3001"
   ```

3. Ensure both your computer and device are on the same network

## Notification Format

All notifications should follow this structure:

```json
{
  "type": "notification",
  "id": "unique-id-here",
  "title": "Notification Title",
  "message": "Notification message body",
  "data": {
    "priority": "high",
    "category": "test",
    "customKey": "customValue"
  },
  "timestamp": "2025-10-28T15:22:17.919Z"
}
```

**Required fields:**

- `type`: Must be `"notification"` (other types are filtered out)
- `id`: Unique identifier
- `title`: Notification title
- `message`: Notification body
- `timestamp`: ISO 8601 timestamp

**Optional fields:**

- `data`: Custom key-value pairs

## Tech Stack

**Server:** Node.js, Express, WebSocket (ws), UUID  
**Web App:** React 19, TypeScript, Vite, TailwindCSS  
**Android:** Kotlin 2.2.21, Jetpack Compose, OkHttp 5.3.0, Gson 2.13.2

## Development

```bash
# Server with auto-restart
cd server && npm run dev

# Web app with hot reload  
cd web && npm run dev

# Android app build and install
cd android && ./gradlew installDebug

# View Android logs
adb logcat | grep "WebSocketService"
```

## 🔧 Troubleshooting

### Connection fails on emulator

- Ensure server is running: `curl http://localhost:3001/api/status`
- Use `ws://10.0.2.2:3001` (already configured)

### Connection fails on physical device

- Find your computer's IP: `ifconfig` or `ipconfig`
- Update `WS_URL` in `WebSocketService.kt`
- Ensure both devices are on the same network
- Check firewall settings

### Notifications not showing

- Grant notification permission (Settings > Apps > Your App > Notifications)
- Check logs: `adb logcat | grep "WebSocketService"`
- Verify message has `type: "notification"` and all required fields

### Service stops unexpectedly

- Disable battery optimization for the app
- Check logs for errors: `adb logcat | grep "WebSocketService"`

**For detailed troubleshooting, see [docs/debugging/README.md](docs/debugging/README.md)**

## 📚 Documentation

- **[Architecture Guide](docs/architecture/README.md)** - System design, data flow, and component
  structure
- **[Debugging Guide](docs/debugging/README.md)** - Comprehensive troubleshooting and testing
- **[Android README](android/README.md)** - Android-specific documentation

## Testing

1. Start the server
2. Open the web app or Android app
3. Send a test notification using the web UI or curl command
4. Notifications appear in:
    - Web app UI
    - Android notification tray
    - Android app notification history

### Testing Checklist

- [x] Server starts and accepts connections
- [x] Web app connects and displays status
- [x] Android app builds successfully
- [x] Android service connects to WebSocket
- [x] Notifications appear in system tray
- [x] Notifications display in app UI
- [x] Connection status updates correctly
- [x] Reconnection works after server restart
- [x] Custom data fields display correctly
- [x] Permission handling works on Android 13+

## What You Should See

**Web App Dashboard:**

- Server status and uptime
- Connected clients with badges (🌐 Web, 📱 Android Emulator, 📱 Android Device)
- Form to send notifications
- Notification history

**Android App:**

- Connection status with color indicator
- Start/Stop service controls
- Real-time notification list
- System notifications in tray

## Production Considerations

### Security
- Use `wss://` (WebSocket Secure) instead of `ws://`
- Implement authentication and authorization
- Add token-based authentication to WebSocket handshake
- Remove `android:usesCleartextTraffic="true"` from Android manifest

### Reliability
- Add message persistence (database)
- Handle battery optimization on Android
- Implement exponential backoff for reconnections
- Add network state monitoring
- Implement message queue for offline support

### Monitoring & Logging
- Add proper error monitoring and logging
- Track connection stability metrics
- Monitor notification delivery rates
- Implement analytics for user engagement

### Features

- Add Room database for notification persistence
- Implement rich notifications (images, actions)
- Add notification grouping
- User preferences for notification settings
- Rate limiting and message validation

## Build Status

✅ **Fully Functional**  
✅ **All Tests Passing**  
✅ **Documentation Complete**  
✅ **Ready for Testing and Deployment**

## License

MIT License - See LICENSE file for details

---
*Sending push notifications using pure WebSockets to AOSP devices*
