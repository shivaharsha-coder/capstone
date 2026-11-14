import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Clock,
  FileCheck2,
  ScanFace,
  Video,
  ArrowRight,
  Bell,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '../../components/common/StatCard';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/api/reports/dashboard/faculty');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/40 via-slate-900 to-violet-900/30 border border-indigo-500/20 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Classroom Academic System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Professor'}!
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              Facial recognition attendance is ready for your classes today. Review your student activities and classroom monitoring alerts below.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/faculty/attendance"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
            >
              <ScanFace className="w-4 h-4" />
              <span>Start Attendance Scanner</span>
            </Link>
            <Link
              to="/faculty/monitoring"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              <Video className="w-4 h-4 text-rose-400" />
              <span>Classroom Vision</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={data?.total_students || 0}
          subtitle="Enrolled in your department"
          icon={Users}
          color="indigo"
          trend={{ label: 'Active status', value: '100% verified', positive: true }}
        />
        <StatCard
          title="Today's Attendance"
          value={`${data?.today_attendance?.percentage || 0}%`}
          subtitle={`${data?.today_attendance?.present || 0} of ${data?.today_attendance?.total || 0} students marked`}
          icon={CheckCircle2}
          color="emerald"
          trend={{ label: 'Scanning method', value: 'AI Face Match', positive: true }}
        />
        <StatCard
          title="Pending Submissions"
          value={data?.pending_grading || 0}
          subtitle="Awaiting your marks & feedback"
          icon={Clock}
          color="amber"
          trend={{ label: 'Needs evaluation', value: `${data?.pending_grading || 0} pending` }}
        />
        <StatCard
          title="Active Assessments"
          value={data?.upcoming_assessments || 0}
          subtitle="Published MCQ quizzes"
          icon={FileCheck2}
          color="violet"
          trend={{ label: 'Status', value: 'Live & Accepting', positive: true }}
        />
      </div>

      {/* Main Grid: Attendance Chart & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-Day Attendance Trend Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">Weekly Attendance Trend</h3>
              <p className="text-xs text-slate-400">Average student presence rate over the past 7 days</p>
            </div>
            <Link
              to="/faculty/reports"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              <span>Detailed Reports</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.attendance_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attRateGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val) => [`${val}%`, 'Attendance Rate']}
                />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#attRateGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Minimum University Requirement: <strong>75%</strong></span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Current Average: {data?.today_attendance?.percentage || 85}%
            </span>
          </div>
        </div>

        {/* Right: Recent Classroom Activities Feed */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white tracking-wide">Recent Activities</h3>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Live Events</span>
            </div>

            <div className="space-y-3">
              {(!data?.recent_activities || data.recent_activities.length === 0) ? (
                <p className="text-xs text-slate-500 py-6 text-center">No recent activity recorded today.</p>
              ) : (
                data.recent_activities.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      act.type === 'ATTENDANCE'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {act.type === 'ATTENDANCE' ? <ScanFace className="w-4 h-4" /> : <FileCheck2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate">{act.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{act.description}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">{act.time}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/faculty/attendance"
            className="mt-4 pt-3 border-t border-slate-800/60 text-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition block"
          >
            Open Attendance Log &rarr;
          </Link>
        </div>
      </div>

      {/* Bottom Section: Recent Announcements & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Recent Announcements</h3>
            <Link to="/faculty/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Manage Tasks
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_announcements?.map((a) => (
              <div key={a.id} className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      a.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : a.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {a.priority}
                    </span>
                    <span className="text-[10px] text-slate-500">{a.created_at}</span>
                  </div>
                  <h4 className="font-semibold text-white">{a.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Hub */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4">Quick Classroom Actions</h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link
              to="/faculty/students"
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-850 transition group flex flex-col justify-between"
            >
              <Users className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition" />
              <div className="mt-3">
                <span className="font-bold text-white block">Register Student</span>
                <span className="text-[11px] text-slate-400">With webcam face capture</span>
              </div>
            </Link>

            <Link
              to="/faculty/assignments"
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/40 hover:bg-slate-850 transition group flex flex-col justify-between"
            >
              <FileCheck2 className="w-5 h-5 text-violet-400 group-hover:scale-110 transition" />
              <div className="mt-3">
                <span className="font-bold text-white block">Create Assignment</span>
                <span className="text-[11px] text-slate-400">Targeted recipients</span>
              </div>
            </Link>

            <Link
              to="/faculty/assessments"
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-850 transition group flex flex-col justify-between"
            >
              <Clock className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
              <div className="mt-3">
                <span className="font-bold text-white block">Publish Quiz</span>
                <span className="text-[11px] text-slate-400">MCQ assessment</span>
              </div>
            </Link>

            <Link
              to="/faculty/monitoring"
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/40 hover:bg-slate-850 transition group flex flex-col justify-between"
            >
              <Video className="w-5 h-5 text-rose-400 group-hover:scale-110 transition" />
              <div className="mt-3">
                <span className="font-bold text-white block">YOLO Monitoring</span>
                <span className="text-[11px] text-slate-400">Mobile phone alerts</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

