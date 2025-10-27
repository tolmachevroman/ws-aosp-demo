import { useEffect, useRef, useState } from 'react';
import type { Notification, ConnectionStatus } from '../App';

interface WebSocketManagerProps {
  onNotification: (notification: Notification) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
}

const WebSocketManager: React.FC<WebSocketManagerProps> = ({
  onNotification,
  onConnectionChange
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    clientId: null,
    connectTime: null
  });
  const [retryCount, setRetryCount] = useState(0);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const reconnectTimeoutRef = useRef<number | undefined>();

  const connect = () => {
    try {
      const ws = new WebSocket('ws://localhost:3001');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        const status: ConnectionStatus = {
          connected: true,
          clientId: null, // Will be set when welcome message is received
          connectTime: new Date()
        };
        setConnectionStatus(status);
        onConnectionChange(status);
        setRetryCount(0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message:', data);

          if (data.type === 'welcome') {
            const updatedStatus: ConnectionStatus = {
              ...connectionStatus,
              connected: true,
              clientId: data.clientId,
              connectTime: new Date()
            };
            setConnectionStatus(updatedStatus);
            onConnectionChange(updatedStatus);
          } else if (data.type === 'notification') {
            onNotification(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        const status: ConnectionStatus = {
          connected: false,
          clientId: null,
          connectTime: null
        };
        setConnectionStatus(status);
        onConnectionChange(status);

        // Auto-reconnect if enabled and not manually closed
        if (autoReconnect && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    setAutoReconnect(false);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
    }
  };

  const sendPing = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  useEffect(() => {
    connect();

    return () => {
      setAutoReconnect(false);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="websocket-manager">
      <h3>🔗 WebSocket Connection</h3>
      
      <div className="connection-status">
        <div className={`status-indicator ${connectionStatus.connected ? 'connected' : 'disconnected'}`}>
          {connectionStatus.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        
        {connectionStatus.clientId && (
          <div className="client-info">
            <strong>Client ID:</strong> <code>{connectionStatus.clientId}</code>
          </div>
        )}
        
        {connectionStatus.connectTime && (
          <div className="connect-time">
            <strong>Connected at:</strong> {connectionStatus.connectTime.toLocaleTimeString()}
          </div>
        )}

        {retryCount > 0 && !connectionStatus.connected && (
          <div className="retry-info">
            Retry attempts: {retryCount}
          </div>
        )}
      </div>

      <div className="connection-controls">
        <button 
          onClick={connect} 
          disabled={connectionStatus.connected}
          className="connect-btn"
        >
          Connect
        </button>
        
        <button 
          onClick={disconnect} 
          disabled={!connectionStatus.connected}
          className="disconnect-btn"
        >
          Disconnect
        </button>
        
        <button 
          onClick={sendPing} 
          disabled={!connectionStatus.connected}
          className="ping-btn"
        >
          Send Ping
        </button>
      </div>

      <div className="auto-reconnect">
        <label>
          <input
            type="checkbox"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
          />
          Auto-reconnect
        </label>
      </div>
    </div>
  );
};

export default WebSocketManager;