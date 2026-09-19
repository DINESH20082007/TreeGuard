import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { notificationsApi, type NotificationItem, type NotifType } from '../../services/notifications';

const typeConfig: Record<NotifType, { icon: string; color: string }> = {
  emergency: { icon: '🚨', color: 'bg-red-100' },
  update: { icon: '📋', color: 'bg-blue-100' },
  assignment: { icon: '👷', color: 'bg-purple-100' },
  resolved: { icon: '✅', color: 'bg-green-100' },
  alert: { icon: '⚠️', color: 'bg-amber-100' },
  system: { icon: '🔔', color: 'bg-gray-100' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    try {
      setError(null);
      const res = await notificationsApi.getNotifications();
      setNotifs(res.notifications || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = async () => {
    if (markingAll || unread === 0) return;
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (n: NotificationItem) => {
    // 1. Mark as read on backend if unread
    if (!n.read) {
      try {
        await notificationsApi.markAsRead(n.id);
        setNotifs((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
      } catch {
        // Fallback optimistic update
        setNotifs((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, read: true } : item))
        );
      }
    }

    // 2. Navigate to related entity if valid
    if (n.related_entity_type && n.related_entity_id) {
      if (n.related_entity_type === 'tree') {
        navigate(`/app/tree/${n.related_entity_id}`);
      } else if (n.related_entity_type === 'report') {
        navigate('/app/reports');
      } else if (n.related_entity_type === 'emergency') {
        navigate('/app/emergency');
      } else if (n.related_entity_type === 'assignment') {
        navigate('/app/inspector');
      } else if (n.related_entity_type === 'recovery_plan') {
        navigate(`/app/tree/${n.related_entity_id}/recovery-plan`);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 border-4 border-forest-100 border-t-forest-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">Loading notifications from PostgreSQL…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Notifications</h1>
          {unread > 0 && <p className="text-sm text-gray-500 mt-0.5">{unread} unread</p>}
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-sm text-forest-600 hover:text-forest-700 font-medium transition-colors disabled:opacity-50"
          >
            {markingAll ? 'Marking read…' : 'Mark all read'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <p>{error}</p>
          <button onClick={loadNotifications} className="text-xs font-semibold underline ml-3">Retry</button>
        </div>
      )}

      {notifs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 text-center">
          <div className="text-5xl mb-4">🔔</div>
          <h3 className="font-semibold text-gray-800 mb-1">No notifications</h3>
          <p className="text-gray-400 text-sm">You're all caught up. Real notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => {
            const cfg = typeConfig[n.type] || typeConfig.system;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleClick(n)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer ${
                  n.read
                    ? 'bg-white border border-gray-100 hover:border-gray-200'
                    : 'bg-white border-l-4 border-l-forest-500 border border-gray-100 shadow-sm hover:shadow-md'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${cfg.color} flex items-center justify-center text-lg flex-shrink-0`}>
                  {cfg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? 'text-gray-700' : 'text-gray-900 font-semibold'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{n.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                  {n.related_entity_type && n.related_entity_id && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-forest-600 font-medium">
                      <span>View details</span>
                      <span>→</span>
                    </div>
                  )}
                </div>
                {!n.read && <div className="w-2.5 h-2.5 bg-forest-500 rounded-full flex-shrink-0 mt-1.5 ring-4 ring-forest-100" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
