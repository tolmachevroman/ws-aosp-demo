import type { Notification } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Notifications
            <Badge variant="secondary">
              {notifications.length}
            </Badge>
          </CardTitle>
          <Button 
            onClick={onClear} 
            variant="outline"
            size="sm"
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-2 text-base">No notifications received yet.</div>
              <div className="text-base">Connect to the server and send some test notifications!</div>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card key={notification.id} className="border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-foreground">
                      {notification.title}
                    </h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>
                  
                  <p className="text-base text-muted-foreground mb-3 leading-relaxed">
                    {notification.message}
                  </p>
                  
                  {notification.data && Object.keys(notification.data).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Additional Data:
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {formatData(notification.data)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {notification.id}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {notification.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;