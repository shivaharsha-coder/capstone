import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  X,
  User,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';

export const FacultyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'PENDING', 'COMPLETED'

  // Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Normal',
    due_date: '',
    assigned_to_student_id: '',
  });
  const [addLoading, setAddLoading] = useState(false);

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
    const fetchStudentsList = async () => {
      try {
        const res = await api.get('/api/students');
        setStudents(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTasks();
    fetchStudentsList();
  }, []);

  const handleToggle = async (taskId) => {
    try {
      await api.put(`/api/tasks/${taskId}/toggle`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/api/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!formData.title) return;
    setAddLoading(true);

    try {
      await api.post('/api/tasks', {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_to_student_id: formData.assigned_to_student_id
          ? parseInt(formData.assigned_to_student_id, 10)
          : null,
      });
      setShowAddModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'Normal',
        due_date: '',
        assigned_to_student_id: '',
      });
      fetchTasks();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create task.');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'PENDING') return !t.is_completed;
    if (filter === 'COMPLETED') return t.is_completed;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Task Management Module</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Today's Tasks & Milestones</h2>
          <p className="text-xs text-slate-400 mt-1">
            Assign targeted action items, set priority deadlines, and track classroom deliverables
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/30 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Task</span>
        </button>
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

      {/* Tasks List */}
      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl p-6 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <span>No tasks found in this view.</span>
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
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      }`}
                    >
                      {t.priority} Priority
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Assigned to: <strong className="text-slate-300">{t.assigned_to}</strong>
                    </span>
                    {t.due_date && (
                      <span className="text-slate-500 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        Due {new Date(t.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(t.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2 text-violet-400">
                <CheckSquare className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create New Task</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Complete PyTorch CNN Model Training Notebook"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows="2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task instructions and guidelines..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-violet-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assign To</label>
                <select
                  value={formData.assigned_to_student_id}
                  onChange={(e) => setFormData({ ...formData, assigned_to_student_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-violet-500"
                >
                  <option value="">All Students (Class-Wide Task)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.roll_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/30 transition disabled:opacity-50"
                >
                  {addLoading ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

