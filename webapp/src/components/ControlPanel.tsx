import { useState } from 'react';
import type { ConnectionStatus } from '../App';

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

  const quickSendTest = () => {
    setTitle('Quick Test');
    setMessage(`Test notification sent at ${new Date().toLocaleTimeString()}`);
    setAdditionalData('{"type": "quick-test"}');
    setSendMode('broadcast');
    setTimeout(sendNotification, 100);
  };

  return (
    <div className="control-panel">
      <h3>🎛️ Control Panel</h3>

      {/* Server Status */}
      <div className="server-status">
        <h4>Server Status</h4>
        {serverStatus ? (
          <div className="status-info">
            <div>Status: <span className="status-value">{serverStatus.status}</span></div>
            <div>Connected Clients: <span className="status-value">{serverStatus.connectedClients}</span></div>
            <div>Uptime: <span className="status-value">{Math.floor(serverStatus.uptime)}s</span></div>
          </div>
        ) : (
          <div className="status-error">Unable to fetch server status</div>
        )}
      </div>

      {/* Send Mode Selection */}
      <div className="send-mode">
        <h4>Send Mode</h4>
        <label>
          <input
            type="radio"
            value="broadcast"
            checked={sendMode === 'broadcast'}
            onChange={(e) => setSendMode(e.target.value as 'broadcast')}
          />
          Broadcast to All Clients
        </label>
        <label>
          <input
            type="radio"
            value="targeted"
            checked={sendMode === 'targeted'}
            onChange={(e) => setSendMode(e.target.value as 'targeted')}
          />
          Send to Specific Client
        </label>

        {sendMode === 'targeted' && (
          <div className="target-client">
            <input
              type="text"
              placeholder="Enter Client ID"
              value={targetClientId}
              onChange={(e) => setTargetClientId(e.target.value)}
              className="client-id-input"
            />
            {connectionStatus.clientId && (
              <button
                type="button"
                onClick={() => setTargetClientId(connectionStatus.clientId || '')}
                className="use-my-id-btn"
              >
                Use My ID
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notification Form */}
      <div className="notification-form">
        <h4>Notification Details</h4>
        
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Notification message"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="data">Additional Data (JSON):</label>
          <textarea
            id="data"
            value={additionalData}
            onChange={(e) => setAdditionalData(e.target.value)}
            placeholder='{"key": "value"}'
            rows={3}
          />
        </div>

        <div className="form-actions">
          <button
            onClick={sendNotification}
            disabled={sending || !title || !message}
            className="send-btn"
          >
            {sending ? 'Sending...' : `Send ${sendMode === 'broadcast' ? 'Broadcast' : 'Targeted'}`}
          </button>

          <button
            onClick={quickSendTest}
            disabled={sending}
            className="quick-test-btn"
          >
            Quick Test
          </button>
        </div>
      </div>

      {/* Response Display */}
      {lastResponse && (
        <div className="response-display">
          <h4>Last Response</h4>
          <pre className="response-content">
            {JSON.stringify(lastResponse, null, 2)}
          </pre>
        </div>
      )}

      {/* Connected Clients List */}
      {serverStatus?.clients && serverStatus.clients.length > 0 && (
        <div className="clients-list">
          <h4>Connected Clients</h4>
          <div className="clients">
            {serverStatus.clients.map((client: any) => (
              <div key={client.id} className="client-item">
                <div className="client-id">
                  <code>{client.id}</code>
                  {client.id === connectionStatus.clientId && <span className="my-client"> (You)</span>}
                </div>
                <div className="client-info">
                  Connected: {new Date(client.connectedAt).toLocaleTimeString()}
                </div>
                <button
                  onClick={() => {
                    setTargetClientId(client.id);
                    setSendMode('targeted');
                  }}
                  className="target-btn"
                >
                  Target
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;