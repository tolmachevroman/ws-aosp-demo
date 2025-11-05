package com.push.notifications.via.ws.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import com.push.notifications.via.ws.MainActivity
import com.push.notifications.via.ws.R
import com.push.notifications.via.ws.model.NotificationPayload
import com.push.notifications.via.ws.model.WebSocketMessage
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

class WebSocketService : Service() {

    private val binder = LocalBinder()
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private val gson = Gson()
    private lateinit var notificationManager: NotificationManager

    // Callback for connection status updates
    var onConnectionStatusChanged: ((Boolean, String) -> Unit)? = null
    var onNotificationReceived: ((NotificationPayload) -> Unit)? = null

    companion object {
        private const val TAG = "WebSocketService"
        private const val FOREGROUND_NOTIFICATION_ID = 1
        private const val SERVICE_CHANNEL_ID = "websocket_service_channel"
        private const val NOTIFICATION_CHANNEL_ID = "push_notifications_channel"
        const val ACTION_START_SERVICE = "com.push.notifications.via.ws.START_SERVICE"
        const val ACTION_STOP_SERVICE = "com.push.notifications.via.ws.STOP_SERVICE"

        // WebSocket server URL - change this to match your server
        private const val WS_URL =
            "ws://10.0.2.2:3001"  // 10.0.2.2 is localhost for Android emulator
    }

    inner class LocalBinder : Binder() {
        fun getService(): WebSocketService = this@WebSocketService
    }

    override fun onBind(intent: Intent): IBinder {
        return binder
    }

    override fun onCreate() {
        super.onCreate()
        notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createNotificationChannels()
        Log.d(TAG, "Service created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_SERVICE -> {
                startForeground(FOREGROUND_NOTIFICATION_ID, createForegroundNotification())
                connectWebSocket()
            }

            ACTION_STOP_SERVICE -> {
                disconnectWebSocket()
                stopSelf()
            }
        }
        return START_STICKY
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Channel for the foreground service
            val serviceChannel = NotificationChannel(
                SERVICE_CHANNEL_ID,
                "WebSocket Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the WebSocket connection alive"
            }

            // Channel for push notifications
            val notificationChannel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Push Notifications",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications received from the server"
                enableVibration(true)
                enableLights(true)
            }

            notificationManager.createNotificationChannel(serviceChannel)
            notificationManager.createNotificationChannel(notificationChannel)
        }
    }

    private fun createForegroundNotification(): Notification {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setContentTitle("Push Notification Service")
            .setContentText("Connected to WebSocket server")
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun connectWebSocket() {
        if (webSocket != null) {
            Log.d(TAG, "WebSocket already connected")
            return
        }

        val request = Request.Builder()
            .url(WS_URL)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                onConnectionStatusChanged?.invoke(true, "Connected")

                // Send client identification
                sendClientIdentification(webSocket)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                Log.d(TAG, "Message received: $text")
                handleMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: $code / $reason")
                onConnectionStatusChanged?.invoke(false, "Disconnecting")
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: $code / $reason")
                onConnectionStatusChanged?.invoke(false, "Disconnected")
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket error: ${t.message}", t)
                onConnectionStatusChanged?.invoke(false, "Error: ${t.message}")

                // Attempt to reconnect after 5 seconds
                android.os.Handler(mainLooper).postDelayed({
                    if (this@WebSocketService.webSocket == null) {
                        Log.d(TAG, "Attempting to reconnect...")
                        connectWebSocket()
                    }
                }, 5000)
            }
        })
    }

    private fun sendClientIdentification(webSocket: WebSocket) {
        try {
            // Determine if running on emulator
            val isEmulator = Build.FINGERPRINT.contains("generic") ||
                    Build.FINGERPRINT.contains("unknown") ||
                    Build.MODEL.contains("google_sdk") ||
                    Build.MODEL.contains("Emulator") ||
                    Build.MODEL.contains("Android SDK built for x86") ||
                    Build.MANUFACTURER.contains("Genymotion") ||
                    Build.PRODUCT.contains("sdk_google") ||
                    Build.PRODUCT.contains("google_sdk") ||
                    Build.PRODUCT.contains("sdk") ||
                    Build.PRODUCT.contains("sdk_x86") ||
                    Build.PRODUCT.contains("vbox86p") ||
                    Build.PRODUCT.contains("emulator") ||
                    Build.PRODUCT.contains("simulator")

            val clientType = if (isEmulator) "android-emulator" else "android-device"

            val identificationMessage = mapOf(
                "type" to "identify",
                "clientType" to clientType,
                "deviceInfo" to mapOf(
                    "manufacturer" to Build.MANUFACTURER,
                    "model" to Build.MODEL,
                    "brand" to Build.BRAND,
                    "device" to Build.DEVICE,
                    "androidVersion" to Build.VERSION.RELEASE,
                    "sdkVersion" to Build.VERSION.SDK_INT,
                    "isEmulator" to isEmulator
                )
            )

            val message = gson.toJson(identificationMessage)
            webSocket.send(message)
            Log.d(TAG, "Sent client identification: $clientType")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send client identification: ${e.message}", e)
        }
    }

    private fun disconnectWebSocket() {
        webSocket?.close(1000, "Service stopped")
        webSocket = null
        Log.d(TAG, "WebSocket disconnected")
    }

    private fun handleMessage(message: String) {
        try {
            Log.d(TAG, "Handling message: $message")

            // Try to parse as direct notification first (what the server actually sends)
            val notification = try {
                gson.fromJson(message, NotificationPayload::class.java)
            } catch (e: Exception) {
                // If that fails, try wrapped format
                Log.d(TAG, "Direct parse failed, trying wrapped format")
                try {
                    val wsMessage = gson.fromJson(message, WebSocketMessage::class.java)
                    wsMessage.notification
                } catch (e2: Exception) {
                    Log.d(TAG, "Wrapped format also failed, skipping message")
                    null
                }
            }

            // Validate that we got a notification
            if (notification == null) {
                Log.d(TAG, "Message is not a notification, skipping")
                return
            }

            // Only process messages with type "notification"
            if (notification.type != "notification") {
                Log.d(TAG, "Message type is '${notification.type}', not 'notification', skipping")
                return
            }

            // Validate required fields for notifications
            if (notification.id == null) {
                Log.w(TAG, "Notification received with null ID, skipping")
                return
            }
            if (notification.title == null) {
                Log.w(TAG, "Notification received with null title, skipping")
                return
            }
            if (notification.message == null) {
                Log.w(TAG, "Notification received with null message, skipping")
                return
            }

            Log.d(TAG, "Parsed notification - ID: ${notification.id}, Title: ${notification.title}")

            // Notify listeners
            onNotificationReceived?.invoke(notification)
            Log.d(TAG, "Notified listeners")

            // Show system notification
            showNotification(notification)
            Log.d(TAG, "Show notification called")

        } catch (e: JsonSyntaxException) {
            Log.e(TAG, "Failed to parse message: ${e.message}", e)
            Log.e(TAG, "Raw message was: $message")
        } catch (e: Exception) {
            Log.e(TAG, "Error handling message: ${e.message}", e)
            e.printStackTrace()
        }
    }

    private fun showNotification(payload: NotificationPayload) {
        try {
            Log.d(TAG, "Creating notification for: ${payload.title}")

            // Validate required fields
            val notificationId = payload.id ?: run {
                Log.e(TAG, "Notification ID is null, cannot show notification")
                return
            }

            val notificationTitle = payload.title ?: "Notification"
            val notificationMessage = payload.message ?: ""

            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("notification_id", notificationId)
                putExtra("notification_data", gson.toJson(payload.data))
            }

            val pendingIntent = PendingIntent.getActivity(
                this,
                notificationId.hashCode(),
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setContentTitle(notificationTitle)
                .setContentText(notificationMessage)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .apply {
                    // Add additional info from data payload if available
                    payload.data?.let { data ->
                        val priority = data["priority"] as? String
                        val category = data["category"] as? String

                        if (priority != null || category != null) {
                            val infoText = listOfNotNull(
                                priority?.let { "Priority: $it" },
                                category?.let { "Category: $it" }
                            ).joinToString(" • ")
                            setSubText(infoText)
                        }
                    }
                }
                .build()

            val notificationIdHash = notificationId.hashCode()
            Log.d(TAG, "Showing notification with ID: $notificationIdHash")
            notificationManager.notify(notificationIdHash, notification)
            Log.d(TAG, "Notification shown successfully: $notificationTitle")
        } catch (e: Exception) {
            Log.e(TAG, "Error showing notification: ${e.message}", e)
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        disconnectWebSocket()
        client.dispatcher.executorService.shutdown()
        Log.d(TAG, "Service destroyed")
    }

    fun isConnected(): Boolean = webSocket != null

    fun getWebSocketUrl(): String = WS_URL
}
