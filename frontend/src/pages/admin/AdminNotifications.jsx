import React, { useState, useEffect } from 'react';
import {
  Bell,
  Megaphone,
  Plus,
  Send,
  Users,
  GraduationCap,
  Calendar,
  X,
  CheckCircle2
} from 'lucide-react';
import api from '../../api/client';

export const AdminNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    target_role: 'ALL',
    type: 'ANNOUNCEMENT'
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/notifications/broadcast', formData);
      setSuccessMsg(res.data.message || 'Broadcast transmitted successfully!');
      setTimeout(() => {
        setShowBroadcastModal(false);
        setSuccessMsg('');
        setFormData({
          title: '',
          message: '',
          target_role: 'ALL',
          type: 'ANNOUNCEMENT'
        });
        fetchNotifications();
      }, 900);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-400" />
            University Notifications & System Broadcasts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Dispatch announcements to students, faculty, or the entire campus, and monitor notification delivery.
          </p>
        </div>

        <button
          onClick={() => setShowBroadcastModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 hover:from-amber-500 hover:to-orange-500 transition"
        >
          <Megaphone className="w-4 h-4" />
          Broadcast Announcement
        </button>
      </div>

      {/* Notifications List */}
      <div className="rounded-2xl bg-[#0f172a] border border-slate-800 p-6 space-y-4 shadow-xl">
        <h3 className="font-bold text-white text-sm flex items-center justify-between pb-3 border-b border-slate-800">
          <span>Recent Transmitted Notifications</span>
          <span className="text-xs text-slate-500 font-mono">{notifications.length} Logs</span>
        </h3>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">No notifications recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{n.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-slate-500 pt-1">
                    Delivered to: <span className="text-slate-300 font-semibold">{n.recipient_name}</span> ({n.recipient_role}) • {n.created_at}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-400" />
                University-Wide Broadcast
              </h2>
              <button onClick={() => setShowBroadcastModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleBroadcastSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Target Audience *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ALL', label: 'All Users' },
                    { id: 'STUDENT', label: 'Students Only' },
                    { id: 'FACULTY', label: 'Faculty Only' }
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, target_role: role.id })}
                      className={`py-2 rounded-xl border text-xs font-semibold transition ${
                        formData.target_role === role.id
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Campus Holiday Schedule & Semester Exam Timetable"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Detailed Message / Notice *</label>
                <textarea
                  rows="4"
                  required
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Official notification text to be delivered to user inboxes..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Transmitting...' : 'Dispatch Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

