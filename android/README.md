# Android Push Notification App

Android application for receiving real-time push notifications via WebSocket connection.

## Overview

This Android app connects to a WebSocket server to receive real-time push notifications. It uses a
foreground service to maintain a persistent connection and displays notifications both in the system
tray and within the app.

### Features

- Persistent WebSocket connection via foreground service
- Automatic reconnection on connection failure (5-second delay)
- Real-time notification display in the app
- System notifications with custom data
- Material Design 3 UI with Jetpack Compose
- Connection status indicator
- Notification history (last 50 notifications)
- Runtime permission handling for Android 13+
- Message validation and filtering
- Client identification (emulator vs device)

## Quick Start

### Prerequisites

1. **Ensure your WebSocket server is running** (in the `server` directory at the project root)
   ```bash
   cd ../server
   npm start
   ```
   The server should be running on port 3001.

### Build and Run

**Using Android Studio:**

1. Open the `android` folder in Android Studio
2. Wait for Gradle sync to complete
3. Click "Run" button (or Shift+F10)

**Using Command Line:**

```bash
cd android
./gradlew installDebug
```

### Using the App

1. Open the app (shows "Disconnected" status)
2. Tap **"Start Service"** to connect
3. Grant notification permission if prompted (Android 13+)
4. Status changes to "Connected" with green indicator
5. Tap **"Stop Service"** to disconnect

## Configuration

### WebSocket Server URL

The default WebSocket URL is configured in `WebSocketService.kt`:

```kotlin
private const val WS_URL = "ws://10.0.2.2:3001"
```

**Important:**
- `10.0.2.2` is the special IP for `localhost` when running on Android Emulator
- For a **physical device**, change this to your computer's local network IP (e.g.,
  `ws://192.168.1.100:3001`)
- For **production**, use your actual server URL with WSS (e.g., `wss://your-server.com`)

**Find your computer's IP:**

- **macOS/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

### Notification Message Format

The server must send messages with the following structure:

```json
{
  "type": "notification",
  "id": "unique-id",
  "title": "Notification Title",
  "message": "Notification message body",
  "data": {
    "priority": "high",
    "category": "test"
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

**Note:** Messages without `type: "notification"` or missing required fields will be filtered out.

## Key Components

### WebSocketService

A foreground service that:

- Maintains persistent WebSocket connection
- Handles automatic reconnection (5-second delay)
- Validates and filters incoming messages
- Creates system notifications
- Sends client identification to server

### MainActivity

Compose UI that:

- Displays connection status
- Shows notification history (last 50)
- Controls service start/stop
- Handles notification permissions

### NotificationPayload

Data model for parsing notification messages with null safety.

## Permissions

The app requires the following permissions (already configured in `AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## Notification Channels

### 1. Service Channel

- **ID:** `websocket_service_channel`
- **Importance:** LOW
- **Purpose:** Foreground service indicator

### 2. Push Notifications Channel

- **ID:** `push_notifications_channel`
- **Importance:** HIGH
- **Features:** Vibration, LED lights
- **Purpose:** Actual push notifications from server

## Testing

Send a test notification:

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test message",
    "data": {
      "priority": "high",
      "category": "test"
    }
  }'
```

View logs:

```bash
adb logcat | grep "WebSocketService"
```

## Customization

### Changing Notification Appearance

Edit the `showNotification()` method in `WebSocketService.kt`:

- Change icon: `R.drawable.ic_launcher_foreground`
- Modify priority: `NotificationCompat.PRIORITY_HIGH`
- Add sound/vibration patterns
- Add notification action buttons

### Adjusting Reconnection Delay

Edit `WebSocketService.kt`:

```kotlin
}, 5000)  // Change delay in milliseconds
```

### Modifying Notification History Limit

Edit `MainActivity.kt`:
```kotlin
if (receivedNotifications.size > 50) {  // Change limit
    receivedNotifications.removeAt(receivedNotifications.size - 1)
}
```

## Dependencies

```toml
okhttp = "5.3.0"              # WebSocket client
gson = "2.13.2"               # JSON parsing
lifecycle-service = "2.9.4"   # Service lifecycle management
compose-bom = "2025.10.01"    # Jetpack Compose
```

## Troubleshooting

### Quick Diagnostics

**Check connection:**

```bash
adb logcat | grep "WebSocketService"
```

You should see:

```
WebSocketService: WebSocket connected
WebSocketService: Sent client identification: android-emulator
```

**Check notifications:**

```bash
adb logcat | grep "Notification"
```

### Common Issues

| Issue                        | Solution                                          |
|------------------------------|---------------------------------------------------|
| Connection fails on emulator | Verify server running, use `ws://10.0.2.2:3001`   |
| Connection fails on device   | Update URL with your local IP, check same network |
| No notifications showing     | Grant permission, check logs for message format   |
| Service stops unexpectedly   | Disable battery optimization                      |
| Notifications filtered out   | Verify message has `type: "notification"`         |

**For detailed troubleshooting, see [../docs/debugging/README.md](../docs/debugging/README.md)**

## Documentation

- **[Architecture Guide](../docs/architecture/README.md)** - System design, data flow, component
  structure
- **[Debugging Guide](../docs/debugging/README.md)** - Comprehensive troubleshooting and testing
- **[Root README](../README.md)** - Project overview and quick start

## Production Considerations

1. **Secure WebSocket** - Use `wss://` instead of `ws://`
2. **Authentication** - Add token-based authentication to WebSocket handshake
3. **Battery Optimization** - Implement exponential backoff for reconnection
4. **Network Changes** - Listen to network state changes and reconnect accordingly
5. **Error Handling** - Add more robust error handling and logging
6. **Persistence** - Store notifications in a local database (Room)
7. **Background Restrictions** - Handle Android's background execution limits
8. **Message Validation** - Server-side validation of message format

## Technology Stack

- **Language:** Kotlin 2.2.21
- **UI:** Jetpack Compose with Material 3
- **WebSocket:** OkHttp 5.3.0
- **JSON:** Gson 2.13.2
- **Architecture:** Foreground Service + Compose UI
- **Build:** Gradle with Kotlin DSL

## License

MIT License - See LICENSE file for details
