# Push Notification Server

A WebSocket-based push notification server built with Node.js for demo purposes.

## Features

- WebSocket connections for real-time communication
- REST API for sending notifications
- Support for broadcast and targeted notifications
- Client connection management
- Simple status monitoring

## Installation

```bash
npm install
```

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on port 3001 by default.

## API Endpoints

### WebSocket Connection
- **URL**: `ws://localhost:3001`
- Clients connect here to receive real-time notifications

### REST API

#### Get Server Status
- **GET** `/api/status`
- Returns server status and list of connected clients

#### Broadcast Notification
- **POST** `/api/notifications/broadcast`
- Sends notification to all connected clients
- **Body**:
  ```json
  {
    "title": "Notification Title",
    "message": "Notification message",
    "data": {} // Optional additional data
  }
  ```

#### Send to Specific Client
- **POST** `/api/notifications/send/:clientId`
- Sends notification to a specific client
- **Body**: Same as broadcast

#### Health Check
- **GET** `/health`
- Simple health check endpoint

## WebSocket Message Format

### Incoming Messages (Client → Server)
```json
{
  "type": "ping"
}
```

### Outgoing Messages (Server → Client)

#### Welcome Message
```json
{
  "type": "welcome",
  "clientId": "uuid",
  "message": "Connected to push notification server"
}
```

#### Notification
```json
{
  "type": "notification",
  "id": "uuid",
  "title": "Notification Title",
  "message": "Notification message",
  "data": {},
  "timestamp": "2023-10-27T12:00:00.000Z"
}
```

#### Pong Response
```json
{
  "type": "pong",
  "timestamp": "2023-10-27T12:00:00.000Z"
}
```

## Testing the Server

1. Start the server: `npm run dev`
2. Visit `http://localhost:3001` for a simple status page
3. Check status: `GET http://localhost:3001/api/status`
4. Send test notification:
   ```bash
   curl -X POST http://localhost:3001/api/notifications/broadcast \
     -H "Content-Type: application/json" \
     -d '{"title": "Test", "message": "Hello World!"}'
   ```

## Environment Variables

- `PORT`: Server port (default: 3001)