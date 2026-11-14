import React, { useState } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  ScanFace,
  Camera,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { WebcamCaptureModal } from '../../components/common/WebcamCaptureModal';
import api from '../../api/client';

export const StudentProfile = () => {
  const { user, refreshUser } = useAuth();
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMessage, setPwMessage] = useState({ type: '', text: '' });
  const [faceMessage, setFaceMessage] = useState({ type: '', text: '' });

  const handleSaveFaceSamples = async (samples) => {
    try {
      const studentId = user.profile_id;
      const res = await api.post(`/api/students/${studentId}/face-register`, { samples });
      setFaceMessage({ type: 'success', text: res.data.message || 'Face biometrics successfully registered!' });
      await refreshUser();
    } catch (err) {
      setFaceMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to register face biometrics.',
      });
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setPwLoading(true);
    setPwMessage({ type: '', text: '' });

    try {
      await api.post('/api/auth/forgot-password', {
        email: user.email,
        new_password: newPassword,
      });
      setPwMessage({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setNewPassword('');
        setPwMessage({ type: '', text: '' });
      }, 1500);
    } catch (err) {
      setPwMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-violet-500/40 shadow-xl"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center font-bold text-3xl border border-violet-500/30">
              {user?.name?.charAt(0)}
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Registered Student</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">{user?.name}</h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              University Roll: <strong className="text-violet-400">{user?.roll_number}</strong>
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                {user?.department || 'CSE'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowWebcamModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-violet-600/25 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Update Face Biometrics</span>
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
            >
              <KeyRound className="w-4 h-4 text-violet-400" />
              <span>Change Password</span>
            </button>
          </div>
        </div>
      </div>

      {/* Face Biometric Status Box */}
      <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ScanFace className="w-4 h-4 text-violet-400" />
              <span>AI Face Recognition Attendance Profile</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Your facial embeddings allow automated verification during faculty attendance scanning
            </p>
          </div>

          {user?.face_registered ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Biometrics Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>Enrollment Needed</span>
            </span>
          )}
        </div>

        {faceMessage.text && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              faceMessage.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {faceMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{faceMessage.text}</span>
          </div>
        )}

        <div className="pt-2 text-xs text-slate-400">
          <p>
            When faculty starts the attendance camera, the system extracts real-time embeddings from the video frame and matches them against your stored profile.
          </p>
        </div>
      </div>

      {/* Shared Webcam Capture Modal */}
      <WebcamCaptureModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onSaveSamples={handleSaveFaceSamples}
      />

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Update Student Password</h3>
            <p className="text-xs text-slate-400 mt-1">Enter your new secure password below</p>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-4 text-xs">
              {pwMessage.text && (
                <div
                  className={`p-3 rounded-xl flex items-center gap-2 ${
                    pwMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {pwMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{pwMessage.text}</span>
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
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
                  disabled={pwLoading}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold shadow"
                >
                  {pwLoading ? 'Saving...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

