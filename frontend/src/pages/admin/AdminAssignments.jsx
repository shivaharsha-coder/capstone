import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  User,
  BookOpen,
  Calendar,
  Layers
} from 'lucide-react';
import api from '../../api/client';

export const AdminAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const filtered = assignments.filter(
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
            <FileText className="w-6 h-6 text-indigo-400" />
            Assignment & Coursework Monitoring
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global oversight of faculty coursework publications, submission rates, and evaluation progress.
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
            placeholder="Search assignments by title, course code, or professor name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            Loading course assignments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            No assignments found.
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 transition shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 font-mono font-semibold border border-indigo-500/20 text-[10px]">
                    {a.subject_code}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Max: {a.max_marks} pts</span>
                </div>

                <h3 className="font-bold text-white text-sm line-clamp-2">{a.title}</h3>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Faculty: {a.faculty_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Due: {a.formatted_due_date}</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Submissions:</span>
                    <span className="font-bold text-white">{a.submissions_count} Received</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Graded:</span>
                    <span className="font-semibold text-emerald-400">{a.graded_count} Evaluated</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Pending Review:</span>
                    <span className="font-semibold text-amber-400">{a.pending_evaluation} Pending</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                <span>Audience: {a.recipient_type}</span>
                <span>Created {a.created_at}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

