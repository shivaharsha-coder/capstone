import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import api from '../../api/client';

export const StudentAttendance = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/attendance/student/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isSafe = (stats?.overall_percentage || 0) >= 75;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
            <ScanFace className="w-3.5 h-3.5" />
            <span>Biometric Attendance Analytics</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">My Attendance Record</h2>
          <p className="text-xs text-slate-400 mt-1">
            Personal attendance verification powered by real-time AI facial recognition
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`px-5 py-3 rounded-2xl border text-center ${
              isSafe
                ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
            }`}
          >
            <span className="text-[10px] uppercase font-bold block">Overall Presence</span>
            <span className="text-2xl font-black">{stats?.overall_percentage || 0}%</span>
            <span className="text-[10px] block mt-0.5">
              {isSafe ? '✓ Safe (>= 75%)' : '⚠ Shortage Alert (< 75%)'}
            </span>
          </div>
        </div>
      </div>

      {/* Subject-Wise Attendance Breakdown */}
      <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Subject-Wise Attendance Breakdown</h3>
          <p className="text-xs text-slate-400">Class presence progress across all registered subjects</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats?.subject_stats?.map((subj) => {
            const subjectSafe = subj.percentage >= 75;
            return (
              <div
                key={subj.subject_id}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {subj.code}
                    </span>
                    <span
                      className={`text-xs font-black ${
                        subjectSafe ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {subj.percentage}%
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-xs line-clamp-1">{subj.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Attended {subj.attended} of {subj.total_classes} classes
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        subjectSafe ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${subj.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Attendance History Table */}
      <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Recent Attendance Log</h3>
          <p className="text-xs text-slate-400">Chronological history of recorded attendance sessions</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Subject</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Recognition Method</th>
                <th className="px-5 py-3.5">Confidence</th>
                <th className="px-5 py-3.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
              {(!stats?.history || stats.history.length === 0) ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No attendance records logged yet.
                  </td>
                </tr>
              ) : (
                stats.history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-3 font-mono text-slate-200">{h.date}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-white block">{h.subject_name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{h.subject_code}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          h.status === 'Present'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : h.status === 'Late'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {h.status === 'Present' && <CheckCircle2 className="w-3 h-3" />}
                        {h.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-300">
                      {h.method === 'AI_FAKE_STUDENT_REJECTED' || h.evidence_image ? (
                        <div className="flex items-center gap-2.5">
                          {h.evidence_image && (
                            <img
                              src={h.evidence_image.startsWith('http') ? h.evidence_image : `http://localhost:8000${h.evidence_image}`}
                              alt="Proxy Evidence"
                              className="w-11 h-8 rounded-lg object-cover border border-rose-500/80 shadow"
                            />
                          )}
                          <div>
                            <span className="text-rose-400 font-bold block text-[11px]">
                              🚨 Proxy Attempt Blocked (Absent)
                            </span>
                            {h.proxy_roll_number && (
                              <span className="text-[10px] text-rose-300 font-mono block">
                                Attempted by: {h.proxy_roll_number}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : h.method === 'AI_FACE' ? (
                        <span className="text-violet-400 font-medium">AI Face Verification</span>
                      ) : (
                        <span>Manual Faculty Entry</span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-400">
                      {h.confidence ? `${h.confidence}%` : '100%'}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-500">{h.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

