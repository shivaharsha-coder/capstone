import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, Bell } from 'lucide-react';
import api from '../../api/client';

export const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/announcements');
        setAnnouncements(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
          <Megaphone className="w-3.5 h-3.5" />
          <span>Department Notices</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">Class Announcements</h2>
        <p className="text-xs text-slate-400 mt-1">
          Official departmental memos, lab timings, capstone schedules, and examination updates
        </p>
      </div>

      {/* Announcements List */}
      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl p-6 divide-y divide-slate-800/80">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <span>No active announcements at this time.</span>
          </div>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="py-5 first:pt-0 last:pb-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      a.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : a.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    }`}
                  >
                    {a.priority}
                  </span>
                  <h3 className="font-bold text-white text-sm">{a.title}</h3>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {a.faculty_name}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pl-1">{a.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

