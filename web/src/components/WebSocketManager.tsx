import { useEffect, useRef, useState } from 'react';
import type { Notification, ConnectionStatus } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

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
        
        // Send client identification
        sendClientIdentification(ws);
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
          } else if (data.type === 'identified') {
            console.log('Client identified:', data);
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
  
  const sendClientIdentification = (ws: WebSocket) => {
    try {
      // Get browser and platform information
      const userAgent = navigator.userAgent;
      
      // Detect platform with modern approach
      let platform = 'Unknown';
      
      // Try to use modern User-Agent Client Hints API when available
      const userAgentData = (navigator as any).userAgentData;
      if (userAgentData) {
        platform = userAgentData.platform;
      } else {
        // Fallback to userAgent parsing for better Apple Silicon detection
        if (/Mac/.test(navigator.userAgent)) {
          // Check for Apple Silicon indicators
          if (/Apple/.test(navigator.vendor) && navigator.maxTouchPoints > 1) {
            platform = 'macOS (Apple Silicon)';
          } else {
            // Try to detect if it's actually Apple Silicon
            try {
              const canvas = document.createElement('canvas');
              const gl = canvas.getContext('webgl');
              const debugInfo = gl?.getExtension('WEBGL_debug_renderer_info');
              const renderer = debugInfo ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '' : '';
              
              if (/Apple/.test(renderer as string) && !/Intel/.test(renderer as string)) {
                platform = 'macOS (Apple Silicon)';
              } else if (/Intel/.test(navigator.userAgent) || navigator.platform === 'MacIntel') {
                platform = 'macOS (Intel)';
              } else {
                platform = 'macOS';
              }
            } catch {
              platform = 'macOS';
            }
          }
        } else if (/Win/.test(navigator.userAgent)) {
          platform = 'Windows';
        } else if (/Linux/.test(navigator.userAgent)) {
          platform = 'Linux';
        } else if (/Android/.test(navigator.userAgent)) {
          platform = 'Android';
        } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
          platform = 'iOS';
        } else {
          platform = navigator.platform || 'Unknown';
        }
      }
      
      // Detect browser
      let browser = 'Unknown';
      if (userAgent.indexOf('Firefox') > -1) {
        browser = 'Firefox';
      } else if (userAgent.indexOf('Chrome') > -1) {
        browser = 'Chrome';
      } else if (userAgent.indexOf('Safari') > -1) {
        browser = 'Safari';
      } else if (userAgent.indexOf('Edge') > -1) {
        browser = 'Edge';
      }
      
      const identificationMessage = {
        type: 'identify',
        clientType: 'web',
        deviceInfo: {
          browser,
          platform,
          userAgent,
          language: navigator.language,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`
        }
      };
      
      ws.send(JSON.stringify(identificationMessage));
      console.log('Sent client identification: web');
    } catch (error) {
      console.error('Failed to send client identification:', error);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          WebSocket Connection
          <Badge variant={connectionStatus.connected ? "default" : "destructive"} 
                 className={connectionStatus.connected ? "bg-green-600 hover:bg-green-700" : ""}>
            {connectionStatus.connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionStatus.clientId && (
          <div className="space-y-2">
            <div className="text-base">
              <span className="font-medium">Client ID:</span>
              <code className="ml-2 px-2 py-1 bg-muted rounded text-sm">
                {connectionStatus.clientId}
              </code>
            </div>
            
            {connectionStatus.connectTime && (
              <div className="text-base text-muted-foreground">
                Connected at: {connectionStatus.connectTime.toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {retryCount > 0 && !connectionStatus.connected && (
          <div className="text-base text-muted-foreground">
            Retry attempts: {retryCount}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={connect} 
            disabled={connectionStatus.connected}
            size="sm"
          >
            Connect
          </Button>
          
          <Button 
            onClick={disconnect} 
            disabled={!connectionStatus.connected}
            variant="destructive"
            size="sm"
          >
            Disconnect
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="auto-reconnect"
            checked={autoReconnect}
            onChange={(e) => setAutoReconnect(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="auto-reconnect" className="text-base font-medium">
            Auto-reconnect
          </label>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebSocketManager;