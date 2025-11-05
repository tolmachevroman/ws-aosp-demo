const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Store connected clients
const clients = new Map();

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const clientId = uuidv4();
    const clientInfo = {
        id: clientId,
        ws: ws,
        connectedAt: new Date(),
        userAgent: req.headers['user-agent'] || 'Unknown',
        clientType: 'unknown', // Will be updated when client identifies itself
        deviceInfo: {}
    };
    
    clients.set(clientId, clientInfo);
    console.log(`Client connected: ${clientId} (Total clients: ${clients.size})`);
    
    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        clientId: clientId,
        message: 'Connected to push notification server'
    }));
    
    // Handle incoming messages from client
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${clientId}:`, data);
            
            // Handle client identification
            if (data.type === 'identify') {
                const client = clients.get(clientId);
                if (client) {
                    client.clientType = data.clientType || 'unknown';
                    client.deviceInfo = data.deviceInfo || {};
                    clients.set(clientId, client);
                    console.log(`Client ${clientId} identified as: ${client.clientType}`, client.deviceInfo);
                    
                    // Send acknowledgment
                    ws.send(JSON.stringify({
                        type: 'identified',
                        clientId: clientId,
                        clientType: client.clientType
                    }));
                }
            }
            
            // Echo back or handle specific message types
            else if (data.type === 'ping') {
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: new Date().toISOString()
                }));
            }
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
        clients.delete(clientId);
        console.log(`Client disconnected: ${clientId} (Total clients: ${clients.size})`);
    });
    
    // Handle errors
    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        clients.delete(clientId);
    });
});

// REST API endpoints

// Get server status and connected clients
app.get('/api/status', (req, res) => {
    const clientList = Array.from(clients.values()).map(client => ({
        id: client.id,
        connectedAt: client.connectedAt,
        userAgent: client.userAgent,
        clientType: client.clientType,
        deviceInfo: client.deviceInfo
    }));
    
    res.json({
        status: 'running',
        connectedClients: clients.size,
        clients: clientList,
        uptime: process.uptime()
    });
});

// Send notification to all connected clients
app.post('/api/notifications/broadcast', (req, res) => {
    const { title, message, data } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ 
            error: 'Title and message are required' 
        });
    }
    
    const notification = {
        type: 'notification',
        id: uuidv4(),
        title,
        message,
        data: data || {},
        timestamp: new Date().toISOString()
    };
    
    let successCount = 0;
    let failureCount = 0;
    
    clients.forEach((client, clientId) => {
        try {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify(notification));
                successCount++;
            } else {
                failureCount++;
                clients.delete(clientId); // Clean up dead connections
            }
        } catch (error) {
            console.error(`Failed to send to client ${clientId}:`, error);
            failureCount++;
            clients.delete(clientId);
        }
    });
    
    res.json({
        success: true,
        notification,
        sent: successCount,
        failed: failureCount,
        totalClients: clients.size
    });
    
    console.log(`Broadcast notification sent to ${successCount} clients`);
});

// Send notification to specific client
app.post('/api/notifications/send/:clientId', (req, res) => {
    const { clientId } = req.params;
    const { title, message, data } = req.body;
    
    if (!title || !message) {
        return res.status(400).json({ 
            error: 'Title and message are required' 
        });
    }
    
    const client = clients.get(clientId);
    if (!client) {
        return res.status(404).json({ 
            error: 'Client not found' 
        });
    }
    
    const notification = {
        type: 'notification',
        id: uuidv4(),
        title,
        message,
        data: data || {},
        timestamp: new Date().toISOString()
    };
    
    try {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(notification));
            res.json({
                success: true,
                notification,
                sentTo: clientId
            });
            console.log(`Notification sent to client ${clientId}`);
        } else {
            clients.delete(clientId);
            res.status(410).json({ 
                error: 'Client connection is no longer active' 
            });
        }
    } catch (error) {
        console.error(`Failed to send to client ${clientId}:`, error);
        clients.delete(clientId);
        res.status(500).json({ 
            error: 'Failed to send notification' 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// Serve static files for simple test page
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>Push Notification Server</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    .status { background: #f0f0f0; padding: 20px; border-radius: 5px; }
                    .endpoint { margin: 10px 0; padding: 10px; background: #e8f4f8; border-radius: 3px; }
                </style>
            </head>
            <body>
                <h1>Push Notification Server</h1>
                <div class="status">
                    <h3>Server Status: Running</h3>
                    <p>WebSocket URL: ws://localhost:3001</p>
                    <p>Connected clients: <span id="clientCount">Loading...</span></p>
                </div>
                
                <h3>Available Endpoints:</h3>
                <div class="endpoint">
                    <strong>GET /api/status</strong> - Get server status and connected clients
                </div>
                <div class="endpoint">
                    <strong>POST /api/notifications/broadcast</strong> - Send notification to all clients<br>
                    Body: { "title": "Title", "message": "Message", "data": {} }
                </div>
                <div class="endpoint">
                    <strong>POST /api/notifications/send/:clientId</strong> - Send notification to specific client
                </div>
                
                <script>
                    fetch('/api/status')
                        .then(res => res.json())
                        .then(data => {
                            document.getElementById('clientCount').textContent = data.connectedClients;
                        })
                        .catch(err => {
                            document.getElementById('clientCount').textContent = 'Error loading';
                        });
                </script>
            </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Push notification server running on port ${PORT}`);
    console.log(`WebSocket URL: ws://localhost:${PORT}`);
    console.log(`HTTP API: http://localhost:${PORT}/api`);
    console.log(`Status page: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});