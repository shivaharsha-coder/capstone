import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Mail,
  Lock,
  Save,
  CheckCircle2,
  Calendar,
  KeyRound
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const AdminProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/profile');
      setProfile(res.data);
      setFullName(res.data.full_name);
      setEmail(res.data.email);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ text: '', type: '' });

    if (password && password !== confirmPassword) {
      setStatusMsg({ text: 'Passwords do not match.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = { full_name: fullName, email };
      if (password) payload.password = password;

      await api.put('/api/admin/profile', payload);
      setStatusMsg({ text: 'Profile successfully updated.', type: 'success' });
      setPassword('');
      setConfirmPassword('');
      fetchProfile();
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.detail || 'Update failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-rose-500" />
          Administrator Account Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Master administrative credentials, security keys, and privileged session data.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4 text-center shadow-xl">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-rose-600 to-indigo-600 p-1 shadow-xl shadow-rose-600/20">
            <div className="w-full h-full rounded-3xl bg-[#0f172a] flex items-center justify-center overflow-hidden">
              <ShieldCheck className="w-12 h-12 text-rose-400" />
            </div>
          </div>

          <div>
            <h3 className="font-bold text-white text-base">{fullName || 'Super Administrator'}</h3>
            <p className="text-xs text-rose-400 font-mono font-medium">ROLE: SYSTEM ADMIN</p>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Account Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full Access
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Member Since:</span>
              <span className="text-slate-300 font-mono">{profile?.created_at || 'Academic Session'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Security Level:</span>
              <span className="text-amber-400 font-semibold">Tier 1 Root</span>
            </div>
          </div>
        </div>

        {/* Right Column: Update Credentials */}
        <div className="md:col-span-2 p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
          <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800">
            Update Profile & Password
          </h3>

          {statusMsg.text && (
            <div className={`p-3 rounded-xl border text-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                Change Master Password (leave empty to retain current)
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-semibold shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-indigo-500 transition"
              >
                <Save className="w-4 h-4" />
                {submitting ? 'Updating...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

