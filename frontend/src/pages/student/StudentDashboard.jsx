import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ScanFace,
  Clock,
  FileCheck2,
  BookOpen,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Megaphone,
  Sparkles,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentStats = async () => {
      try {
        const res = await api.get('/api/reports/dashboard/student');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentStats();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-violet-900/40 via-slate-900 to-indigo-900/30 border border-violet-500/20 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold mb-2 border border-violet-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Academic Hub</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hello, {data?.student_name || user?.name}!
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-xl">
              University Roll Number: <strong className="text-violet-400 font-mono">{data?.roll_number}</strong> •{' '}
              {data?.department} ({data?.academic_year}, Sec {data?.section})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/attendance"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition transform hover:-translate-y-0.5"
            >
              <ScanFace className="w-4 h-4" />
              <span>My Attendance</span>
            </Link>
            <Link
              to="/student/assignments"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            >
              <FileText className="w-4 h-4 text-violet-400" />
              <span>Assignments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance Score"
          value={`${data?.attendance?.percentage || 0}%`}
          subtitle={`${data?.attendance?.present || 0} of ${data?.attendance?.total || 0} classes attended`}
          icon={CheckCircle2}
          color="emerald"
          trend={{
            label: 'University minimum',
            value: data?.attendance?.percentage >= 75 ? 'Safe (>= 75%)' : 'Shortage Alert (< 75%)',
            positive: data?.attendance?.percentage >= 75,
          }}
        />
        <StatCard
          title="Pending Coursework"
          value={data?.pending_assignments?.length || 0}
          subtitle="Assignments due soon"
          icon={Clock}
          color="amber"
          trend={{ label: 'Status', value: 'Requires submission' }}
        />
        <StatCard
          title="Active Assessments"
          value={data?.upcoming_assessments?.length || 0}
          subtitle="Quizzes open for submission"
          icon={FileCheck2}
          color="violet"
          trend={{ label: 'Auto-graded', value: 'Instant results', positive: true }}
        />
        <StatCard
          title="Face Biometrics"
          value={data?.face_registered ? 'Enrolled' : 'Pending'}
          subtitle={data?.face_registered ? 'Active for camera scan' : 'Webcam sample required'}
          icon={ScanFace}
          color={data?.face_registered ? 'indigo' : 'rose'}
          trend={{
            label: 'Attendance method',
            value: data?.face_registered ? 'Automated AI' : 'Manual verification',
            positive: data?.face_registered,
          }}
        />
      </div>

      {/* Main Grid: Today's Classes & Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Class Schedule (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">Today's Class Schedule</h3>
                <p className="text-xs text-slate-400">Timetable & live attendance status for each lecture</p>
              </div>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Semester 6</span>
            </div>

            <div className="space-y-3">
              {data?.today_classes?.map((c, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-bold text-xs">
                      {c.subject_code}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{c.subject_name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {c.faculty} • {c.room}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-slate-300 block text-[11px]">{c.time}</span>
                    <span
                      className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.attended
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {c.attended ? 'Attended' : 'Scheduled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Automated facial scanning runs at the beginning of each class.</span>
            <Link to="/student/attendance" className="text-violet-400 hover:text-violet-300 font-semibold">
              View History &rarr;
            </Link>
          </div>
        </div>

        {/* Right: Pending Assignments & Deadlines (1 Col) */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">Upcoming Deadlines</h3>
              <Link to="/student/assignments" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
                All
              </Link>
            </div>

            <div className="space-y-3">
              {(!data?.pending_assignments || data.pending_assignments.length === 0) ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2 opacity-60" />
                  <span>All caught up! No pending assignments.</span>
                </div>
              ) : (
                data.pending_assignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                        Due Soon
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{a.due_date}</span>
                    </div>
                    <h4 className="font-semibold text-white line-clamp-1">{a.title}</h4>
                    <p className="text-[10px] text-slate-400">{a.subject} • Max Marks: {a.max_marks}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link
            to="/student/assignments"
            className="mt-4 pt-3 border-t border-slate-800 text-center text-xs font-semibold text-violet-400 hover:text-violet-300 block"
          >
            Submit Assignments &rarr;
          </Link>
        </div>
      </div>

      {/* Bottom Section: Announcements & Today's Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-violet-400" />
              <span>Campus Announcements</span>
            </h3>
            <Link to="/student/announcements" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_announcements?.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      a.priority === 'URGENT'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : a.priority === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    }`}
                  >
                    {a.priority}
                  </span>
                  <span className="text-[10px] text-slate-500">{a.created_at}</span>
                </div>
                <h4 className="font-semibold text-white">{a.title}</h4>
                <p className="text-[11px] text-slate-400">{a.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Tasks */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Your Action Items</h3>
            <Link to="/student/tasks" className="text-xs text-violet-400 hover:text-violet-300 font-semibold">
              All Tasks
            </Link>
          </div>

          <div className="space-y-3">
            {(!data?.tasks || data.tasks.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No tasks assigned for today.</p>
            ) : (
              data.tasks.map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-semibold text-white">{t.title}</h4>
                    <span className="text-[10px] text-slate-500">Due: {t.due_date}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    {t.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

