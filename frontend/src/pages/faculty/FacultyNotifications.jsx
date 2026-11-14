import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, Clock, FileCheck2, Video, Megaphone, Trash2 } from 'lucide-react';
import api from '../../api/client';

export const FacultyNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    if (type === 'MONITORING') return <Video className="w-4 h-4 text-rose-400" />;
    if (type === 'ASSIGNMENT' || type === 'ASSESSMENT') return <FileCheck2 className="w-4 h-4 text-indigo-400" />;
    return <Megaphone className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
            <Bell className="w-3.5 h-3.5" />
            <span>Notification Center</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">System & Student Activity Alerts</h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time notifications for assignment submissions, quiz attempts, and YOLO monitoring events
          </p>
        </div>

        <button
          onClick={markAllRead}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
        >
          <CheckCheck className="w-4 h-4 text-emerald-400" />
          <span>Mark All as Read</span>
        </button>
      </div>

      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl p-6 divide-y divide-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <span>No notifications at this time.</span>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`py-4 first:pt-0 last:pb-0 flex items-start gap-4 transition ${
                !n.is_read ? 'opacity-100' : 'opacity-70'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex-shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-white text-xs">{n.title}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

