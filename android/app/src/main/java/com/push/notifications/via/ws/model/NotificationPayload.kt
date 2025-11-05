package com.push.notifications.via.ws.model

import com.google.gson.annotations.SerializedName

/**
 * Represents a notification received from the WebSocket server
 */
data class NotificationPayload(
    @SerializedName("type")
    val type: String?,

    @SerializedName("id")
    val id: String?,

    @SerializedName("title")
    val title: String?,

    @SerializedName("message")
    val message: String?,

    @SerializedName("data")
    val data: Map<String, Any>?,

    @SerializedName("timestamp")
    val timestamp: String?
)

/**
 * Wrapper for the WebSocket message
 */
data class WebSocketMessage(
    @SerializedName("notification")
    val notification: NotificationPayload
)
