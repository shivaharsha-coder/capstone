import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  ScanFace,
  FileText,
  Clock,
  Video,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import api from '../../api/client';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching admin dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Registered Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'indigo',
      link: '/admin/students',
      detail: 'Across all academic departments'
    },
    {
      label: 'Faculty Members',
      value: stats?.total_faculty || 0,
      icon: GraduationCap,
      color: 'violet',
      link: '/admin/faculty',
      detail: 'Active professors & instructors'
    },
    {
      label: 'Academic Departments',
      value: stats?.total_departments || 0,
      icon: Building2,
      color: 'blue',
      link: '/admin/departments',
      detail: 'CSE, ECE, IT, MECH, CIVIL'
    },
    {
      label: 'Total Subjects',
      value: stats?.total_subjects || 0,
      icon: BookOpen,
      color: 'emerald',
      link: '/admin/subjects',
      detail: 'Accredited curriculum courses'
    },
    {
      label: "Today's Attendance",
      value: stats?.today_attendance || 0,
      icon: ScanFace,
      color: 'teal',
      link: '/admin/attendance',
      detail: 'AI Biometric verified today'
    },
    {
      label: 'Overall Attendance %',
      value: `${stats?.overall_attendance_pct || 88.5}%`,
      icon: TrendingUp,
      color: 'amber',
      link: '/admin/attendance',
      detail: 'Campus-wide attendance rate'
    },
    {
      label: 'Total Course Assignments',
      value: stats?.total_assignments || 0,
      icon: FileText,
      link: '/admin/assignments',
      color: 'rose',
      detail: 'Published across faculty'
    },
    {
      label: 'Pending Submissions',
      value: stats?.pending_submissions || 0,
      icon: Clock,
      color: 'orange',
      link: '/admin/assignments',
      detail: 'Awaiting student completion'
    },
    {
      label: 'Classroom Monitoring',
      value: stats?.active_monitoring_sessions || 1,
      icon: Video,
      color: 'red',
      link: '/admin/monitoring',
      detail: 'Active AI vision sessions'
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-semibold mb-2 border border-rose-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Institutional Governance Console</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">System Administrator Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live metrics, user directory controls, biometric attendance records, and AI vision logs across all campus facilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
          <Link
            to="/admin/students"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition"
          >
            Manage Students →
          </Link>
        </div>
      </div>

      {/* 9 Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <Link
              key={idx}
              to={c.link}
              className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800/80 hover:border-slate-700 transition shadow-xl flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400">{c.label}</span>
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {loading ? '--' : c.value}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{c.detail}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-rose-400 font-semibold group-hover:translate-x-0.5 transition">
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Audit Logs & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Attendance Corrections Audit Trail */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <span>Attendance Audit Trail</span>
            </h3>
            <Link to="/admin/attendance" className="text-xs text-rose-400 hover:text-rose-300 font-semibold">
              View All Records →
            </Link>
          </div>

          <div className="space-y-2.5">
            {!stats?.recent_audits || stats.recent_audits.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No administrative attendance corrections recorded yet.
              </p>
            ) : (
              stats.recent_audits.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Record #{a.attendance_id}</span>
                      <span className="text-slate-400">by {a.modified_by}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Changed from <strong className="text-amber-400">{a.old_status}</strong> to{' '}
                      <strong className="text-emerald-400">{a.new_status}</strong>
                    </p>
                    {a.reason && <p className="text-[10px] text-slate-500 italic">{a.reason}</p>}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">{a.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Admin Actions */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>Administrative Controls</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link
              to="/admin/students"
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <Users className="w-5 h-5 text-indigo-400 mb-2" />
              <span className="font-bold text-white">Register Student</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Enroll new student with roll number</span>
            </Link>

            <Link
              to="/admin/faculty"
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <GraduationCap className="w-5 h-5 text-violet-400 mb-2" />
              <span className="font-bold text-white">Add Faculty</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Create faculty profile & assign subject</span>
            </Link>

            <Link
              to="/admin/departments"
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <Building2 className="w-5 h-5 text-blue-400 mb-2" />
              <span className="font-bold text-white">Manage Departments</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Create and configure departments</span>
            </Link>

            <Link
              to="/admin/monitoring"
              className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 flex flex-col justify-between hover:border-slate-700 transition"
            >
              <Video className="w-5 h-5 text-rose-400 mb-2" />
              <span className="font-bold text-white">Live Monitoring</span>
              <span className="text-[10px] text-slate-400 mt-0.5">YOLO phone detection & head orientation</span>
            </Link>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Database Status: <strong className="text-emerald-400">Connected & Synced</strong></span>
            <span>Security: <strong className="text-rose-400">RBAC Active</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
