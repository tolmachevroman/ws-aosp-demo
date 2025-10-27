import { useState, useEffect } from 'react'
import './App.css'
import WebSocketManager from './components/WebSocketManager'
import NotificationPanel from './components/NotificationPanel'
import ControlPanel from './components/ControlPanel'

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  clientId: string | null;
  connectTime: Date | null;
}

function App() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    clientId: null,
    connectTime: null
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [serverStatus, setServerStatus] = useState<any>(null);

  const handleNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const handleConnectionChange = (status: ConnectionStatus) => {
    setConnectionStatus(status);
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Fetch server status periodically
  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/status');
        const data = await response.json();
        setServerStatus(data);
      } catch (error) {
        console.error('Failed to fetch server status:', error);
        setServerStatus(null);
      }
    };

    fetchServerStatus();
    const interval = setInterval(fetchServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔔 Push Notification Demo</h1>
        <p>WebSocket-based real-time notifications</p>
      </header>

      <div className="app-content">
        <div className="left-panel">
          <WebSocketManager 
            onNotification={handleNotification}
            onConnectionChange={handleConnectionChange}
          />
          
          <ControlPanel 
            connectionStatus={connectionStatus}
            serverStatus={serverStatus}
          />
        </div>

        <div className="right-panel">
          <NotificationPanel 
            notifications={notifications}
            onClear={clearNotifications}
          />
        </div>
      </div>
    </div>
  )
}

export default App
