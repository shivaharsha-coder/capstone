import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Search,
  CheckCircle2,
  Clock,
  User,
  HelpCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import api from '../../api/client';

export const AdminAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/assessments');
      setAssessments(res.data);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const filtered = assessments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject_code.toLowerCase().includes(search.toLowerCase()) ||
      a.faculty_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-violet-400" />
            Assessment & Quiz Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global evaluation of quizzes, automated grading engines, attempt statistics, and average cohort scores.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments by quiz name, subject, or creator..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading online quizzes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No assessments found.
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-violet-500/10 text-violet-400 font-mono font-semibold border border-violet-500/20 text-[10px]">
                    {a.subject_code}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    a.is_published ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {a.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{a.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Instructor: {a.faculty_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Duration: {a.duration_minutes} Minutes</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-500">Questions</p>
                    <p className="text-base font-bold text-white mt-0.5">{a.questions_count}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-500">Attempts</p>
                    <p className="text-base font-bold text-white mt-0.5">{a.attempts_count}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-500">Avg Score</p>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">{a.average_score}</p>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Total: {a.total_marks} Marks</span>
                <span>Created {a.created_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

