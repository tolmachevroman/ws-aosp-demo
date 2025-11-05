package com.push.notifications.via.ws

import android.Manifest
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.push.notifications.via.ws.model.NotificationPayload
import com.push.notifications.via.ws.service.WebSocketService
import com.push.notifications.via.ws.ui.theme.PushNotificationsViaWebSocketsTheme
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {

    private var webSocketService: WebSocketService? = null
    private var bound by mutableStateOf(false)
    private var connectionStatus by mutableStateOf("Disconnected")
    private var isConnected by mutableStateOf(false)
    private val receivedNotifications = mutableStateListOf<NotificationPayload>()

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            startWebSocketService()
        }
    }

    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as WebSocketService.LocalBinder
            webSocketService = binder.getService()
            bound = true

            // Set up callbacks
            webSocketService?.onConnectionStatusChanged = { connected, status ->
                isConnected = connected
                connectionStatus = status
            }

            webSocketService?.onNotificationReceived = { notification ->
                receivedNotifications.add(0, notification)
                // Keep only last 50 notifications
                if (receivedNotifications.size > 50) {
                    receivedNotifications.removeAt(receivedNotifications.size - 1)
                }
            }

            // Update initial status
            isConnected = webSocketService?.isConnected() ?: false
            connectionStatus = if (isConnected) "Connected" else "Disconnected"
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            webSocketService = null
            bound = false
            isConnected = false
            connectionStatus = "Disconnected"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            PushNotificationsViaWebSocketsTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    NotificationScreen(
                        connectionStatus = connectionStatus,
                        isConnected = isConnected,
                        notifications = receivedNotifications,
                        webSocketUrl = webSocketService?.getWebSocketUrl() ?: "ws://10.0.2.2:3001",
                        onStartService = { requestNotificationPermissionAndStart() },
                        onStopService = { stopWebSocketService() }
                    )
                }
            }
        }
    }

    private fun checkNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    private fun requestNotificationPermissionAndStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkNotificationPermission()) {
                startWebSocketService()
            } else {
                notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        } else {
            startWebSocketService()
        }
    }

    private fun startWebSocketService() {
        val intent = Intent(this, WebSocketService::class.java).apply {
            action = WebSocketService.ACTION_START_SERVICE
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }

        // Bind to the service
        bindService(
            Intent(this, WebSocketService::class.java),
            serviceConnection,
            Context.BIND_AUTO_CREATE
        )
    }

    private fun stopWebSocketService() {
        if (bound) {
            unbindService(serviceConnection)
            bound = false
        }

        val intent = Intent(this, WebSocketService::class.java).apply {
            action = WebSocketService.ACTION_STOP_SERVICE
        }
        startService(intent)

        receivedNotifications.clear()
        isConnected = false
        connectionStatus = "Disconnected"
    }

    override fun onDestroy() {
        super.onDestroy()
        if (bound) {
            unbindService(serviceConnection)
        }
    }
}

@Composable
fun NotificationScreen(
    connectionStatus: String,
    isConnected: Boolean,
    notifications: List<NotificationPayload>,
    webSocketUrl: String,
    onStartService: () -> Unit,
    onStopService: () -> Unit
) {
    Scaffold(
        modifier = Modifier.fillMaxSize()
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
        ) {
            // Header Section
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        text = "Push Notification System",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .background(
                                    color = if (isConnected) Color.Green else Color.Red,
                                    shape = RoundedCornerShape(6.dp)
                                )
                        )

                        Spacer(modifier = Modifier.width(8.dp))

                        Text(
                            text = connectionStatus,
                            style = MaterialTheme.typography.bodyLarge,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "Server: $webSocketUrl",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = onStartService,
                            enabled = !isConnected,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Start Service")
                        }

                        Button(
                            onClick = onStopService,
                            enabled = isConnected,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error
                            )
                        ) {
                            Text("Stop Service")
                        }
                    }
                }
            }

            // Notifications Section
            Text(
                text = "Received Notifications (${notifications.size})",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 8.dp)
            )

            if (notifications.isEmpty()) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Text(
                        text = "No notifications received yet",
                        modifier = Modifier.padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(notifications) { notification ->
                        NotificationCard(notification)
                    }
                }
            }
        }
    }
}

@Composable
fun NotificationCard(notification: NotificationPayload) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = notification.title ?: "No Title",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f)
                )

                Text(
                    text = formatTimestamp(notification.timestamp ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = notification.message ?: "No message",
                style = MaterialTheme.typography.bodyMedium
            )

            if (notification.data != null && notification.data.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Text(
                            text = "Data:",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold
                        )

                        notification.data.forEach { (key, value) ->
                            Text(
                                text = "• $key: $value",
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(start = 8.dp, top = 4.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = "ID: ${notification.id ?: "Unknown"}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
fun formatTimestamp(timestamp: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        inputFormat.timeZone = TimeZone.getTimeZone("UTC")
        val date = inputFormat.parse(timestamp)

        val outputFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        outputFormat.format(date ?: Date())
    } catch (e: Exception) {
        timestamp
    }
}