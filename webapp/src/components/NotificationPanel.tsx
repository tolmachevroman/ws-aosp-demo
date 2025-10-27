import type { Notification } from '../App';

interface NotificationPanelProps {
  notifications: Notification[];
  onClear: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  notifications,
  onClear
}) => {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatData = (data: any) => {
    if (!data || Object.keys(data).length === 0) return null;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div className="notification-panel">
      <div className="panel-header">
        <h3>📨 Notifications ({notifications.length})</h3>
        <button 
          onClick={onClear} 
          className="clear-btn"
          disabled={notifications.length === 0}
        >
          Clear All
        </button>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications received yet.</p>
            <p>Connect to the server and send some test notifications!</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="notification-item">
              <div className="notification-header">
                <h4>{notification.title}</h4>
                <span className="notification-time">
                  {formatTimestamp(notification.timestamp)}
                </span>
              </div>
              
              <div className="notification-message">
                {notification.message}
              </div>
              
              {notification.data && Object.keys(notification.data).length > 0 && (
                <div className="notification-data">
                  <strong>Additional Data:</strong>
                  <pre>{formatData(notification.data)}</pre>
                </div>
              )}
              
              <div className="notification-meta">
                <span className="notification-id">ID: {notification.id}</span>
                <span className="notification-type">Type: {notification.type}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;