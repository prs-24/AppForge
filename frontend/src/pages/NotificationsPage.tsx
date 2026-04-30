import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Info, CheckCircle, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      const res = await api.get('/notifications', { params: { limit: 50 } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark as read');
    }
  }

  async function markRead(id: string) {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }

  const iconMap = {
    info: <Info className="w-5 h-5 text-blue-400" />,
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
  };

  const bgMap = {
    info: 'bg-blue-500/5 border-blue-500/20',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-amber-500/5 border-amber-500/20',
    error: 'bg-red-500/5 border-red-500/20',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-slate-400 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">They'll show up here when app events occur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`flex items-start gap-4 p-4 border rounded-xl transition-all cursor-pointer ${
                n.is_read ? 'bg-dark-800 border-slate-700/40 opacity-70' : `${bgMap[n.type] || bgMap.info} hover:opacity-100`
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">{iconMap[n.type] || iconMap.info}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className={`font-medium text-sm ${n.is_read ? 'text-slate-400' : 'text-white'}`}>{n.title}</p>
                  {!n.is_read && <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
                {n.message && <p className="text-slate-500 text-sm mt-1">{n.message}</p>}
                <p className="text-slate-600 text-xs mt-2">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
