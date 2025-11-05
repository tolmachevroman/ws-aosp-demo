# Architecture Documentation

Complete architectural overview of the Push Notification System using WebSockets.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         WebSocket Server                            │
│                      (ws://localhost:3001)                          │
└────────────────┬──────────────────────┬─────────────────────────────┘
                 │                      │
                 │ WebSocket            │ WebSocket
                 │ Connection           │ Connection
                 ▼                      ▼
┌────────────────────────┐   ┌──────────────────────────┐
│    Web Application     │   │   Android Application    │
│   (React + Vite)       │   │   (Kotlin + Compose)     │
└────────────────────────┘   └──────────────────────────┘
```

## Android Application Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                          MainActivity                              │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Jetpack Compose UI                                          │ │
│  │  - Connection Status Display                                 │ │
│  │  - Start/Stop Service Buttons                                │ │
│  │  - Notification History List (LazyColumn)                    │ │
│  │  - Permission Request Handler                                │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                              │                                     │
│                              │ Binds to / Controls                │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Service Connection (Binder)                                 │ │
│  │  - onServiceConnected()                                      │ │
│  │  - onServiceDisconnected()                                   │ │
│  │  - Callbacks for updates                                     │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   │ IPC (Inter-Process Communication)
                   │
┌──────────────────▼───────────────────────────────────────────────┐
│                     WebSocketService                             │
│                  (Foreground Service)                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  WebSocket Management                                      │ │
│  │  - OkHttpClient + WebSocket                                │ │
│  │  - Connection state management                             │ │
│  │  - Auto-reconnection logic (5s delay)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Message Handler                                           │ │
│  │  - JSON parsing (Gson)                                     │ │
│  │  - Message validation                                      │ │
│  │  - Data extraction                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Notification Manager                                      │ │
│  │  - Create notification channels                            │ │
│  │  - Show foreground service notification                    │ │
│  │  - Display push notifications                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                   │
                   │ System Notifications
                   ▼
┌────────────────────────────────────────────────────────────────┐
│              Android Notification System                       │
│  - Notification Tray                                          │
│  - Notification Channels                                      │
│  - Sound, Vibration, LED                                      │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Service Initialization Flow

```
MainActivity                WebSocketService              NotificationManager
     │                              │                              │
     │──[1] startForegroundService()─>│                              │
     │                              │                              │
     │                              │──[2] onCreate()               │
     │                              │──[3] createNotificationChannels()─>│
     │                              │                              │
     │                              │<─[4] Channels created        │
     │                              │                              │
     │──[5] bindService()───────────>│                              │
     │                              │                              │
     │<─[6] onServiceConnected()────│                              │
     │     (returns LocalBinder)    │                              │
     │                              │                              │
     │──[7] Set callbacks───────────>│                              │
     │    - onConnectionStatusChanged│                              │
     │    - onNotificationReceived   │                              │
     │                              │                              │
     │                              │──[8] connectWebSocket()       │
     │                              │                              │
     │<─[9] Status callback─────────│                              │
     │     (Connected/Disconnected) │                              │
```

### 2. Notification Receiving Flow

```
WebSocket Server         WebSocketService           NotificationManager       MainActivity
     │                          │                            │                      │
     │─[1] Send JSON message────>│                            │                      │
     │                          │                            │                      │
     │                          │─[2] onMessage()            │                      │
     │                          │    WebSocketListener       │                      │
     │                          │                            │                      │
     │                          │─[3] handleMessage()        │                      │
     │                          │    Gson.fromJson()         │                      │
     │                          │                            │                      │
     │                          │─[4] Parse to              │                      │
     │                          │    NotificationPayload     │                      │
     │                          │                            │                      │
     │                          │─[5] Validate type &        │                      │
     │                          │    required fields         │                      │
     │                          │                            │                      │
     │                          │──[6] showNotification()────>│                      │
     │                          │                            │                      │
     │                          │                            │─[7] Display         │
     │                          │                            │    in tray          │
     │                          │                            │                      │
     │                          │─────[8] Callback────────────────────────────────>│
     │                          │    onNotificationReceived() │                      │
     │                          │                            │                      │
     │                          │                            │      [9] Update UI  │
     │                          │                            │      Add to list    │
```

### 3. Reconnection Flow

```
WebSocketService                    WebSocket Server
     │                                      │
     │──[1] Connection attempt──────────────>│
     │                                      │
     │<─[2] onFailure()─────────────────────│
     │     (Connection failed)              │
     │                                      │
     │─[3] Log error                        │
     │─[4] Notify callbacks                 │
     │     (Disconnected status)            │
     │                                      │
     │─[5] Handler.postDelayed()            │
     │     (5000ms delay)                   │
     │                                      │
     │─[6] Wait...                          │
     │                                      │
     │──[7] Retry connection────────────────>│
     │                                      │
     │<─[8] onOpen() / onFailure()──────────│
     │                                      │
     │─[9] Repeat if needed                 │
```

## Class Structure

### WebSocketService.kt

```kotlin
class WebSocketService : Service() {
    // Core Components
    - webSocket: WebSocket?
    - client: OkHttpClient
    - gson: Gson
    - notificationManager: NotificationManager
    
    // Callbacks
    - onConnectionStatusChanged: (Boolean, String) -> Unit
    - onNotificationReceived: (NotificationPayload) -> Unit
    
    // Lifecycle Methods
    + onCreate()
    + onStartCommand()
    + onDestroy()
    + onBind(): IBinder
    
    // WebSocket Management
    - connectWebSocket()
    - disconnectWebSocket()
    - sendClientIdentification()
    
    // Message Handling
    - handleMessage(String)
    - showNotification(NotificationPayload)
    
    // Notification Setup
    - createNotificationChannels()
    - createForegroundNotification(): Notification
}
```

### NotificationPayload.kt

```kotlin
data class NotificationPayload(
    val type: String?,          // "notification"
    val id: String?,            // Unique notification ID
    val title: String?,         // Notification title
    val message: String?,       // Notification body
    val data: Map<String, Any>?, // Optional custom data
    val timestamp: String?      // ISO 8601 timestamp
)

data class WebSocketMessage(
    val notification: NotificationPayload
)
```

### MainActivity.kt

```kotlin
class MainActivity : ComponentActivity() {
    // State Management
    - webSocketService: WebSocketService?
    - bound: Boolean
    - connectionStatus: String
    - isConnected: Boolean
    - receivedNotifications: MutableStateList<NotificationPayload>
    
    // Service Connection
    - serviceConnection: ServiceConnection
    - notificationPermissionLauncher: ActivityResultLauncher
    
    // Service Control
    - startWebSocketService()
    - stopWebSocketService()
    - requestNotificationPermissionAndStart()
    - checkNotificationPermission(): Boolean
}
```

## Message Validation Flow

The service validates messages in multiple stages:

1. **JSON Parsing**: Try to parse as `NotificationPayload`
2. **Type Check**: Verify `type == "notification"`
3. **Required Fields**: Ensure `id`, `title`, and `message` are non-null
4. **Processing**: Only valid notifications are shown

This ensures non-notification messages (like connection acknowledgments) are filtered out.

## Notification Channels

### 1. Service Channel

- **ID:** `websocket_service_channel`
- **Name:** "WebSocket Service"
- **Importance:** LOW
- **Purpose:** Foreground service indicator
- **User Visible:** Yes, but minimal disruption

### 2. Push Notifications Channel

- **ID:** `push_notifications_channel`
- **Name:** "Push Notifications"
- **Importance:** HIGH
- **Features:** Vibration, LED lights
- **Purpose:** Actual push notifications from server

## Threading Model

```
┌─────────────────────────────────────────────────────────────┐
│                         Main Thread                         │
│  - MainActivity UI updates                                  │
│  - Compose recomposition                                    │
│  - Service binding/unbinding                                │
│  - Callback invocations                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Process/Thread                   │
│  - WebSocket connection management                          │
│  - Message handling                                         │
│  - Notification creation                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Async
                              ▼
┌─────────────────────────────────────────────────────────────┐
��                   OkHttp WebSocket Thread                   │
│  - Network I/O                                              │
│  - WebSocket protocol handling                              │
│  - Message send/receive                                     │
└─────────────────────────────────────────────────────────────┘
```

## Security Considerations

1. **Cleartext Traffic:** Currently enabled for development (`android:usesCleartextTraffic="true"`)
    - For production, use WSS (WebSocket Secure)
    - Remove cleartext traffic permission

2. **Permissions:** Runtime permission request for `POST_NOTIFICATIONS` on Android 13+

3. **Data Validation:** JSON messages are parsed and validated before processing
    - Type checking
    - Required field validation
    - Null safety handling

4. **No Authentication:** Currently, no authentication is implemented
    - For production, add token-based auth to WebSocket handshake

## Performance Considerations

1. **Memory Management**
    - Notification history limited to 50 items
    - Automatic cleanup on service stop

2. **Battery Usage**
    - Foreground service ensures reliability but uses battery
    - Consider implementing WorkManager for periodic sync in production

3. **Network Efficiency**
    - WebSocket maintains single persistent connection
    - Automatic reconnection with 5-second delay
    - No polling required

## Client Identification

When connecting, the Android app sends identification:

```json
{
  "type": "identify",
  "clientType": "android-emulator", // or "android-device"
  "deviceInfo": {
    "manufacturer": "Google",
    "model": "sdk_gphone64_arm64",
    "brand": "google",
    "device": "emu64a",
    "androidVersion": "15",
    "sdkVersion": 35,
    "isEmulator": true
  }
}
```

This allows the server to:

- Track Android clients separately
- Send targeted notifications
- Display appropriate badges in web UI

## Future Enhancements

1. **Persistence Layer**
    - Add Room database for notification history
    - Store messages when app is closed

2. **Advanced Reconnection**
    - Exponential backoff strategy
    - Network state monitoring
    - Smart retry based on network type

3. **Message Queue**
    - Queue messages during disconnection
    - Replay on reconnection

4. **Analytics**
    - Track connection stability
    - Monitor notification delivery
    - User engagement metrics

5. **Rich Notifications**
    - Image support
    - Action buttons
    - Grouped notifications
    - Progress indicators

## Technology Stack

**Android:**

- Kotlin 2.2.21
- Jetpack Compose (Material 3)
- OkHttp 5.3.0 (WebSocket)
- Gson 2.13.2 (JSON parsing)
- Lifecycle Service 2.9.4

**Server:**

- Node.js
- Express
- WebSocket (ws)
- UUID

**Web:**

- React 19
- TypeScript
- Vite
