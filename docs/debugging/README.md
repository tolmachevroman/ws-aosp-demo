# Debugging Guide

Complete guide for troubleshooting and debugging the Push Notification System.

## Quick Diagnosis

### 1. Check if Android App Connects

**In Android app:**

- Open the app
- Tap "Start Service"
- Status should turn green and say "Connected"

**Check logs:**

```bash
adb logcat | grep "WebSocketService"
```

You should see:

```
WebSocketService: Service created
WebSocketService: WebSocket connected
WebSocketService: Sent client identification: android-emulator (or android-device)
```

### 2. Check Server Sees the Connection

**Open web app:** `http://localhost:5173`

In the "Connected Clients" section, you should see:

- 🌐 Web badge for your browser
- 📱 Android Emulator badge (purple) or 📱 Android Device badge (green)

**Or check server API:**

```bash
curl http://localhost:3001/api/status | jq
```

Look for clients with `"clientType": "android-emulator"` or `"android-device"`

### 3. Send a Test Notification

**From terminal:**

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Debug Test",
    "message": "Testing Android notifications",
    "data": {
      "priority": "high",
      "category": "debug"
    }
  }'
```

**Watch Android logs:**

```bash
adb logcat | grep -E "WebSocketService|Notification"
```

Expected log sequence:

```
WebSocketService: Message received: {"type":"notification",...}
WebSocketService: Handling message: {"type":"notification",...}
WebSocketService: Message type is 'notification', processing
WebSocketService: Parsed notification - ID: xxx, Title: Debug Test
WebSocketService: Notified listeners
WebSocketService: Creating notification for: Debug Test
WebSocketService: Showing notification with ID: xxx
WebSocketService: Notification shown successfully: Debug Test
```

## Common Issues

### Issue 1: "No notifications appearing in system tray"

**Check notification permission:**

```bash
# Check if permission is granted
adb shell dumpsys package com.push.notifications.via.ws | grep POST_NOTIFICATIONS
```

**Grant permission manually:**

1. Settings > Apps > Push Notifications Via WebSockets > Notifications
2. Enable "All notifications"

**Or grant via ADB (Android 13+):**

```bash
adb shell pm grant com.push.notifications.via.ws android.permission.POST_NOTIFICATIONS
```

### Issue 2: "Notifications appear in app but not in system tray"

**Check notification channels:**

```bash
adb shell dumpsys notification | grep "push_notifications_channel"
```

**Check if Do Not Disturb is on:**

```bash
adb shell dumpsys notification | grep "mInterruptionFilter"
```

### Issue 3: "Service shows 'Connected' but no notifications received"

**Check message format:**

The server must send messages with `type: "notification"` and all required fields:

**✅ CORRECT:**

```json
{
  "type": "notification",
  "id": "unique-id",
  "title": "Test",
  "message": "Message",
  "data": {
    "priority": "high"
  },
  "timestamp": "2025-10-28T15:22:17.919Z"
}
```

**❌ INCORRECT (missing type):**

```json
{
  "id": "unique-id",
  "title": "Test",
  "message": "Message"
}
```

**Check logs for filtering:**

```bash
adb logcat | grep "Message type is"
```

You should see:

```
WebSocketService: Message type is 'notification', processing
```

If you see:

```
WebSocketService: Message type is 'identify', not 'notification', skipping
```

This means the message is being filtered out (which is correct for non-notification messages).

### Issue 4: "Service connects but then disconnects"

**Check server logs** for connection errors.

**Check Android logs:**

```bash
adb logcat | grep "WebSocketService"
```

Look for:

```
WebSocketService: WebSocket error: [error message]
```

Common causes:

- Wrong WebSocket URL
- Server not running
- Network issues
- Firewall blocking connection

### Issue 5: "Connection fails on emulator"

**Verify server is running:**

```bash
curl http://localhost:3001/api/status
```

**Check URL in WebSocketService.kt:**

```kotlin
private const val WS_URL = "ws://10.0.2.2:3001"
```

**Note:** `10.0.2.2` is the special IP for localhost on Android emulator.

### Issue 6: "Connection fails on physical device"

**Find your computer's local IP:**

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

**Update WebSocketService.kt:**

```kotlin
private const val WS_URL = "ws://YOUR_LOCAL_IP:3001"  // e.g., ws://192.168.1.100:3001
```

**Rebuild and install:**

```bash
cd android
./gradlew clean installDebug
```

**Check firewall:**

- Ensure port 3001 is not blocked
- Both devices must be on the same network

## Detailed Logging

### Enable Verbose Logging

Watch all WebSocket activity:

```bash
adb logcat -s WebSocketService:V
```

### Filter Specific Events

**Connection events:**

```bash
adb logcat | grep -E "connected|disconnected|error"
```

**Message handling:**

```bash
adb logcat | grep -E "Message received|Handling message|Parsed notification"
```

**Message filtering:**

```bash
adb logcat | grep -E "Message type is|skipping"
```

**Notification display:**

```bash
adb logcat | grep -E "Creating notification|Showing notification|Notification shown"
```

## Verify Client Identification

### Check Server Logs

When Android connects, you should see:

```
Client connected: xxx-xxx-xxx (Total clients: 1)
Client xxx identified as: android-emulator {manufacturer: Google, model: sdk_gphone64_arm64, ...}
```

### Check from Web App

1. Open `http://localhost:5173`
2. Look at "Connected Clients"
3. You should see client with badge:
    - 📱 Android Emulator (purple)
    - 📱 Android Device (green)

### Check via API

```bash
curl http://localhost:3001/api/status | jq '.clients[] | select(.clientType | startswith("android"))'
```

Expected output:

```json
{
  "id": "client-id",
  "connectedAt": "...",
  "userAgent": "...",
  "clientType": "android-emulator",
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

## Testing Specific Client

### Send to Android Only

1. Get Android client ID from web app or:
   ```bash
   curl http://localhost:3001/api/status | jq '.clients[] | select(.clientType | startswith("android")) | .id'
   ```

2. Send targeted notification:
   ```bash
   curl -X POST http://localhost:3001/api/notifications/send/CLIENT_ID_HERE \
     -H "Content-Type: application/json" \
     -d '{"title": "Android Only", "message": "This is for Android"}'
   ```

## Real-time Log Monitoring

**Terminal 1 - Server:**

```bash
cd server
npm start
```

**Terminal 2 - Android Logs:**

```bash
adb logcat -c && adb logcat | grep -E "WebSocketService|Notification"
```

**Terminal 3 - Send Test:**

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Hello"}'
```

## Check Notification Settings

```bash
# List all notification channels
adb shell dumpsys notification | grep -A 20 "com.push.notifications.via.ws"

# Check if notifications are enabled
adb shell dumpsys notification | grep "mEnabled=true"

# Check importance level
adb shell dumpsys notification | grep "mImportance="
```

## Verify Message Filtering

### Test Non-Notification Messages

Send a non-notification message:

```bash
# This should be filtered out and NOT shown
echo '{"type":"test","id":"123","title":"Test","message":"Should not appear","timestamp":"2025-10-28T15:22:17.919Z"}' | \
  wscat -c ws://localhost:3001
```

Check logs:

```bash
adb logcat | grep "Message type is"
```

You should see:

```
WebSocketService: Message type is 'test', not 'notification', skipping
```

### Test Missing Required Fields

Messages with null `id`, `title`, or `message` should be filtered:

```bash
adb logcat | grep "received with null"
```

You might see:

```
WebSocketService: Notification received with null ID, skipping
WebSocketService: Notification received with null title, skipping
WebSocketService: Notification received with null message, skipping
```

## Clear and Reset

**Uninstall and reinstall:**

```bash
adb uninstall com.push.notifications.via.ws
cd android && ./gradlew installDebug
```

**Clear app data:**

```bash
adb shell pm clear com.push.notifications.via.ws
```

**Reset notification settings:**
Settings > Apps > Push Notifications Via WebSockets > Storage > Clear Data

## Advanced Debugging

### Capture Network Traffic

```bash
# Start capturing
adb shell tcpdump -i any -s 0 -w /sdcard/capture.pcap port 3001

# Stop with Ctrl+C, then pull file
adb pull /sdcard/capture.pcap

# Open in Wireshark
```

### Monitor Service Lifecycle

```bash
adb logcat | grep -E "Service created|Service destroyed|onStartCommand|onBind"
```

### Check Battery Optimization

```bash
# Check if app is optimized
adb shell dumpsys deviceidle whitelist | grep com.push.notifications.via.ws
```

### Verify Service is Running

```bash
adb shell dumpsys activity services | grep WebSocketService
```

## Success Checklist

- [ ] Server running on port 3001
- [ ] Android app installed and opened
- [ ] "Start Service" tapped
- [ ] Status shows green "Connected"
- [ ] Android client visible in web app with badge
- [ ] Notification permission granted
- [ ] Test notification sent with `type: "notification"`
- [ ] Notification appears in app list
- [ ] Notification appears in system tray
- [ ] Logs show successful message handling
- [ ] Non-notification messages are filtered out

## Common Log Messages

### Success Messages

```
WebSocketService: Service created
WebSocketService: WebSocket connected
WebSocketService: Sent client identification: android-emulator
WebSocketService: Message received: {...}
WebSocketService: Message type is 'notification', processing
WebSocketService: Parsed notification - ID: xxx, Title: xxx
WebSocketService: Notification shown successfully: xxx
```

### Filtering Messages (Normal Behavior)

```
WebSocketService: Message type is 'identify', not 'notification', skipping
WebSocketService: Message is not a notification, skipping
WebSocketService: Notification received with null ID, skipping
```

### Error Messages

```
WebSocketService: WebSocket error: Connection refused
WebSocketService: Failed to parse message: Expected BEGIN_OBJECT
WebSocketService: Error showing notification: [error]
WebSocketService: Notification ID is null, cannot show notification
```

## Get Help

If issues persist:

1. **Capture full logs:**
   ```bash
   adb logcat > android_logs.txt
   ```

2. **Check server response:**
   ```bash
   curl -v -X POST http://localhost:3001/api/notifications/broadcast \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "message": "Test"}'
   ```

3. **Verify notification channel exists:**
   ```bash
   adb shell dumpsys notification | grep "push_notifications_channel"
   ```

4. **Check if service is running:**
   ```bash
   adb shell dumpsys activity services | grep WebSocketService
   ```

5. **Review recent changes:**
    - Check if message format changed on server
    - Verify all required fields are present
    - Ensure `type: "notification"` is set

## Testing Different Scenarios

### Scenario 1: Normal Notification

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Normal Test",
    "message": "This should appear",
    "data": {"priority": "normal"}
  }'
```

Expected: ✅ Notification shown

### Scenario 2: High Priority Notification

```bash
curl -X POST http://localhost:3001/api/notifications/broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent Alert!",
    "message": "High priority notification",
    "data": {"priority": "high", "category": "alert"}
  }'
```

Expected: ✅ Notification shown with priority info

### Scenario 3: Connection Acknowledgment

```json
{"type": "connected", "clientId": "xxx"}
```

Expected: ❌ Filtered out, not shown

### Scenario 4: Missing Required Field

```json
{"type": "notification", "title": "Test"}
```

Expected: ❌ Filtered out, missing `id` and `message`
