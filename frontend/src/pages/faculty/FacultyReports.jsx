import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api, { API_BASE_URL } from '../../api/client';

export const FacultyReports = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const [subjRes, dashRes] = await Promise.all([
          api.get('/api/attendance/subjects'),
          api.get('/api/reports/dashboard/faculty'),
        ]);
        setSubjects(subjRes.data);
        if (subjRes.data.length > 0) {
          setSelectedSubject(subjRes.data[0].id.toString());
        }
        setReportData(dashRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  const handleExportCSV = () => {
    if (!selectedSubject) return;
    const url = `${API_BASE_URL}/api/attendance/export?subject_id=${selectedSubject}`;
    window.open(url, '_blank');
  };

  const COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

  const attendancePieData = [
    { name: 'Present', value: reportData?.today_attendance?.present || 5 },
    { name: 'Absent', value: (reportData?.total_students || 6) - (reportData?.today_attendance?.present || 5) },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Academic Intelligence & Reports</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Classroom Attendance & Grade Analytics</h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual statistics, daily attendance breakdowns, and exportable university records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Daily Presence vs Absence</h3>
            <p className="text-xs text-slate-400 mt-0.5">Recorded daily through AI facial attendance verification</p>
          </div>

          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData?.attendance_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="present" fill="#10b981" name="Present Students" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#f43f5e" name="Absent Students" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Ratio Pie (1 Col) */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Today's Attendance Ratio</h3>
            <p className="text-xs text-slate-400 mt-0.5">Overall department percentage</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendancePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-center text-xs">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-emerald-400 block font-semibold">Present</span>
              <strong className="text-white text-base">{attendancePieData[0].value}</strong>
            </div>
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-rose-400 block font-semibold">Absent</span>
              <strong className="text-white text-base">{attendancePieData[1].value}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

