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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Push Notification Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            WebSocket-based real-time notifications
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <WebSocketManager 
              onNotification={handleNotification}
              onConnectionChange={handleConnectionChange}
            />
            
            <ControlPanel 
              connectionStatus={connectionStatus}
              serverStatus={serverStatus}
            />
          </div>

          <div>
            <NotificationPanel 
              notifications={notifications}
              onClear={clearNotifications}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
