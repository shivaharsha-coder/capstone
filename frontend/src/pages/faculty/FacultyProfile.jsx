import React, { useState } from 'react';
import { User, Mail, Building, Phone, KeyRound, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import api from '../../api/client';

export const FacultyProfile = () => {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await api.post('/api/auth/forgot-password', {
        email: user.email,
        new_password: newPassword,
      });
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-xl"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-3xl border border-indigo-500/30">
              {user?.name?.charAt(0)}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Faculty Account</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">{user?.name}</h2>
            <p className="text-xs text-slate-400 mt-1">{user?.department || 'Computer Science & Engineering'}</p>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                Cabin: Academic Block B, Room 302
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Change Password</span>
          </button>
        </div>
      </div>

      {/* System Technical Specs */}
      <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white">System Architecture & AI Capabilities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-slate-300">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Facial Biometrics</span>
            <span className="text-emerald-400 font-semibold block mt-1">OpenCV YuNet + Deep Embedder</span>
            <span className="text-[10px] text-slate-400">Cosine similarity threshold 68%</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Classroom AI Vision</span>
            <span className="text-rose-400 font-semibold block mt-1">Ultralytics YOLOv8n</span>
            <span className="text-[10px] text-slate-400">COCO Class 67 (Cell Phone)</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Database Persistence</span>
            <span className="text-indigo-400 font-semibold block mt-1">SQLAlchemy ORM</span>
            <span className="text-[10px] text-slate-400">PostgreSQL / SQLite ready</span>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Update Faculty Password</h3>
            <p className="text-xs text-slate-400 mt-1">Enter your new secure password below</p>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4 text-xs">
              {message.text && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow"
                >
                  {loading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

