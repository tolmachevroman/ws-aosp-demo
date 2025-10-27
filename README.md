# Push Notification Demo

Real-time push notifications using WebSockets with Node.js server and React web app.

## Quick Start

**1. Start the server:**
```bash
cd server && npm install && npm start
```

**2. Start the web app:**
```bash
cd web && npm install && npm run dev
```

**3. Open your browser:**
- Web App: http://localhost:5173
- Server Status: http://localhost:3001

## Project Structure

```
├── server/     # Node.js WebSocket server (port 3001)
├── web/        # React TypeScript web app (port 5173)
└── android/    # Android app (coming soon)
```

## Features

- Real-time WebSocket communication
- Broadcast notifications to all clients
- Targeted notifications to specific clients
- Auto-reconnect with retry logic
- Live server status and client monitoring
- Modern React UI with TypeScript

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
  -d '{"title": "Test", "message": "Hello World!"}'
```

## Tech Stack

**Server:** Node.js, Express, WebSocket (ws), UUID  
**Web App:** React 19, TypeScript, Vite

## Development

```bash
# Server with auto-restart
cd server && npm run dev

# Web app with hot reload  
cd web && npm run dev
```
Sending push notifications using pure web sockets to an AOSP device
