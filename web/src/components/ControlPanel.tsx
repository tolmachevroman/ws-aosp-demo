import { useState } from 'react';
import type { ConnectionStatus } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ControlPanelProps {
  connectionStatus: ConnectionStatus;
  serverStatus: any;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  connectionStatus,
  serverStatus
}) => {
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification message');
  const [additionalData, setAdditionalData] = useState('{"priority": "high", "category": "test"}');
  const [targetClientId, setTargetClientId] = useState('');
  const [sendMode, setSendMode] = useState<'broadcast' | 'targeted'>('broadcast');
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const sendNotification = async () => {
    if (!title || !message) {
      alert('Title and message are required');
      return;
    }

    setSending(true);
    setLastResponse(null);

    try {
      let data = {};
      if (additionalData.trim()) {
        try {
          data = JSON.parse(additionalData);
        } catch (error) {
          alert('Invalid JSON in additional data');
          setSending(false);
          return;
        }
      }

      const payload = { title, message, data };
      
      let url = 'http://localhost:3001/api/notifications/broadcast';
      if (sendMode === 'targeted' && targetClientId) {
        url = `http://localhost:3001/api/notifications/send/${targetClientId}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setLastResponse(result);

      if (response.ok) {
        console.log('Notification sent successfully:', result);
      } else {
        console.error('Failed to send notification:', result);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      setLastResponse({ error: 'Failed to send notification' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Status */}
      <Card className="min-w-[800px]">
        <CardHeader>
          <CardTitle>Server Status</CardTitle>
        </CardHeader>
        <CardContent>
          {serverStatus ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-base">Status:</span>
                <Badge variant="default">{serverStatus.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-base">Connected Clients:</span>
                <Badge variant="secondary">{serverStatus.connectedClients}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-base">Uptime:</span>
                <span className="text-base font-mono">{Math.floor(serverStatus.uptime)}s</span>
              </div>
            </div>
          ) : (
            <div className="text-destructive text-base">Unable to fetch server status</div>
          )}
        </CardContent>
      </Card>

      {/* Control Panel */}
      <Card className="min-w-[800px]">
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Send Mode */}
          <div className="space-y-2">
            <label className="text-base font-medium">Send Mode</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="broadcast"
                  checked={sendMode === 'broadcast'}
                  onChange={(e) => setSendMode(e.target.value as 'broadcast')}
                  className="text-primary"
                />
                <span className="text-base">Broadcast to All Clients</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="targeted"
                  checked={sendMode === 'targeted'}
                  onChange={(e) => setSendMode(e.target.value as 'targeted')}
                  className="text-primary"
                />
                <span className="text-base">Send to Specific Client</span>
              </label>
            </div>

            {sendMode === 'targeted' && (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Client ID"
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="font-mono text-xs"
                />
                {connectionStatus.clientId && (
                  <Button
                    type="button"
                    onClick={() => setTargetClientId(connectionStatus.clientId || '')}
                    variant="outline"
                    size="sm"
                  >
                    Use My ID
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label htmlFor="title" className="text-base font-medium block mb-1">
                Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>

            <div>
              <label htmlFor="message" className="text-base font-medium block mb-1">
                Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Notification message"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="data" className="text-base font-medium block mb-1">
                Additional Data (JSON)
              </label>
              <Textarea
                id="data"
                value={additionalData}
                onChange={(e) => setAdditionalData(e.target.value)}
                placeholder='{"key": "value"}'
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={sendNotification}
              disabled={sending || !title || !message}
              className="flex-1"
            >
              {sending ? 'Sending...' : `Send ${sendMode === 'broadcast' ? 'Broadcast' : 'Targeted'}`}
            </Button>
          </div>

          {/* Response Display */}
          {lastResponse && (
            <div className="mt-4">
              <label className="text-base font-medium block mb-2">Last Response</label>
              <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Clients */}
      <Card className="">
        <CardHeader>
          <CardTitle>Connected Clients ({serverStatus?.clients?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {serverStatus?.clients && serverStatus.clients.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {serverStatus.clients.map((client: any) => (
                <div key={client.id} className="p-4 bg-muted rounded-lg border border-border">
                  {/* Single horizontal line with ID, badges, and Target button */}
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-sm bg-background px-2 py-1 rounded font-mono">
                        {client.id}
                      </code>
                      {client.id === connectionStatus.clientId && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                      {client.clientType && (
                        <Badge 
                          variant="default" 
                          className={
                            client.clientType === 'web' ? 'bg-blue-600' :
                            client.clientType === 'android-emulator' ? 'bg-purple-600' :
                            client.clientType === 'android-device' ? 'bg-green-600' :
                            'bg-gray-600'
                          }
                        >
                          {client.clientType === 'web' ? '🌐 Web' :
                           client.clientType === 'android-emulator' ? '📱 Android Emulator' :
                           client.clientType === 'android-device' ? '📱 Android Device' :
                           '❓ Unknown'}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => {
                        setTargetClientId(client.id);
                        setSendMode('targeted');
                        console.log('Target button clicked for client:', client.id);
                      }}
                      variant="default"
                      size="sm"
                      className="bg-black hover:bg-gray-800 text-white"
                    >
                      Target
                    </Button>
                  </div>

                  {/* Device details below */}
                  {client.deviceInfo && Object.keys(client.deviceInfo).length > 0 && (
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {/* Android specific info */}
                      {client.clientType?.startsWith('android') && (
                        <>
                          {client.deviceInfo.manufacturer && client.deviceInfo.model && (
                            <div>
                              <span className="font-medium">Device:</span> {client.deviceInfo.manufacturer} {client.deviceInfo.model}
                            </div>
                          )}
                          {client.deviceInfo.androidVersion && (
                            <div>
                              <span className="font-medium">Android:</span> {client.deviceInfo.androidVersion} (API {client.deviceInfo.sdkVersion})
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Web specific info */}
                      {client.clientType === 'web' && (
                        <>
                          {client.deviceInfo.browser && (
                            <div>
                              <span className="font-medium">Browser:</span> {client.deviceInfo.browser}
                            </div>
                          )}
                          {client.deviceInfo.platform && (
                            <div>
                              <span className="font-medium">Platform:</span> {client.deviceInfo.platform}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Connection time */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Connected at: {new Date(client.connectedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground text-base text-center py-8">
              No clients connected
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
};

export default ControlPanel;