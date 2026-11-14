import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  ScanFace,
  BookOpen,
  FileCheck2,
  Download,
  Calendar,
  Layers
} from 'lucide-react';
import api from '../../api/client';

export const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/reports/analytics');
      setData(res.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            University Analytics & Executive Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional trends, multi-department student density, weekly attendance ratios, and platform activity.
          </p>
        </div>
      </div>

      {/* Highlights Bar */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <p className="text-[11px] text-slate-400">Total Active Users</p>
            <p className="text-2xl font-extrabold text-white mt-1">{data.total_active_users}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <p className="text-[11px] text-slate-400">Quizzes Taken</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{data.total_quizzes_taken}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <p className="text-[11px] text-slate-400">Study Materials Shared</p>
            <p className="text-2xl font-extrabold text-indigo-400 mt-1">{data.total_materials_shared}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <p className="text-[11px] text-slate-400">Report Status</p>
            <p className="text-2xl font-extrabold text-teal-400 mt-1">Live DB Sync</p>
          </div>
        </div>
      )}

      {/* Grid of Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Trend */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-teal-400" />
              7-Day University Attendance Trend
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Present vs Absent</span>
          </div>

          {loading || !data ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading attendance timeline...</div>
          ) : (
            <div className="space-y-3 pt-2">
              {data.attendance_trend.map((item, idx) => {
                const total = item.present + item.absent;
                const pct = total > 0 ? Math.round((item.present / total) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{item.date}</span>
                      <span className="text-slate-400 font-mono">
                        <span className="text-emerald-400 font-bold">{item.present} Present</span> / {item.absent} Absent ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-l-full"
                        style={{ width: `${pct}%` }}
                      />
                      <div
                        className="bg-rose-500 h-full rounded-r-full"
                        style={{ width: `${100 - pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Department Enrollment Distribution */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Department Enrollment & Faculty Density
            </h3>
            <span className="text-[10px] text-slate-500">Distribution</span>
          </div>

          {loading || !data ? (
            <div className="py-12 text-center text-slate-500 text-xs">Loading department analytics...</div>
          ) : (
            <div className="space-y-4 pt-2">
              {data.dept_distribution.map((dept, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm">{dept.name}</span>
                    <p className="text-[11px] text-slate-400">Department of Engineering</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Students</span>
                      <span className="font-bold text-indigo-400">{dept.students}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Faculty</span>
                      <span className="font-bold text-violet-400">{dept.faculty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

