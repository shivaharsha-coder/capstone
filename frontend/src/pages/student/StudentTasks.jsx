import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, Circle, Clock, User } from 'lucide-react';
import api from '../../api/client';

export const StudentTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (taskId) => {
    try {
      await api.put(`/api/tasks/${taskId}/toggle`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'PENDING') return !t.is_completed;
    if (filter === 'COMPLETED') return t.is_completed;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Daily Action Items</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">My Academic Tasks</h2>
        <p className="text-xs text-slate-400 mt-1">
          Track deliverables assigned by faculty and check off completed milestones
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs">
        {['ALL', 'PENDING', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl transition ${
              filter === f
                ? 'bg-violet-600 text-white font-semibold'
                : 'bg-[#0f172a] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {f === 'ALL' ? 'All Tasks' : f === 'PENDING' ? 'Pending' : 'Completed'}
          </button>
        ))}
      </div>

      {/* Task Items */}
      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl p-6 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-60" />
            <span>No tasks in this category!</span>
          </div>
        ) : (
          filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                t.is_completed
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <button
                  onClick={() => handleToggle(t.id)}
                  className="mt-0.5 text-slate-400 hover:text-emerald-400 transition flex-shrink-0"
                >
                  {t.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0">
                  <h4
                    className={`font-semibold text-xs ${
                      t.is_completed ? 'line-through text-slate-400' : 'text-white'
                    }`}
                  >
                    {t.title}
                  </h4>
                  {t.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        t.priority === 'High'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : t.priority === 'Medium'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="text-slate-500">Assigned by: {t.created_by}</span>
                    {t.due_date && (
                      <span className="text-slate-500 font-mono">
                        Due: {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                  t.is_completed ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'
                }`}
              >
                {t.is_completed ? 'Done' : 'Pending'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

