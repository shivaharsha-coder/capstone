import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Video,
  ScanFace
} from 'lucide-react';
import api from '../../api/client';

export const AdminSettings = () => {
  const [settings, setSettings] = useState({
    academic_year: '2026-27',
    current_semester: 'Even Semester',
    attendance_threshold_pct: '75',
    yolo_phone_conf_threshold: '0.18',
    face_match_threshold: '0.65',
    monitoring_interval_ms: '1500',
    university_name: 'SR University - Smart Campus',
    system_version: 'AI Smart Classroom 2.0'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/settings');
      if (res.data && Object.keys(res.data).length > 0) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.put('/api/admin/settings', settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-400" />
            System Configuration & AI Engine Parameters
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global academic session variables, YOLOv8 vision thresholds, and biometric attendance rules.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Parameters Synchronized
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Academic Settings */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Academic Year & Institution Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">University / Institute Name</label>
              <input
                type="text"
                value={settings.university_name}
                onChange={(e) => setSettings({ ...settings, university_name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">System Version & Build</label>
              <input
                type="text"
                value={settings.system_version}
                disabled
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Active Academic Session</label>
              <input
                type="text"
                value={settings.academic_year}
                onChange={(e) => setSettings({ ...settings, academic_year: e.target.value })}
                placeholder="2026-27"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Active Semester Term</label>
              <input
                type="text"
                value={settings.current_semester}
                onChange={(e) => setSettings({ ...settings, current_semester: e.target.value })}
                placeholder="Even Semester (Jan-May)"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Minimum Mandatory Attendance (%)</label>
              <input
                type="number"
                min="50"
                max="90"
                value={settings.attendance_threshold_pct}
                onChange={(e) => setSettings({ ...settings, attendance_threshold_pct: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* AI & Vision Settings */}
        <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Video className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-white text-sm">AI Computer Vision & YOLO Inference Engine</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">YOLO Smartphone Detection Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="0.80"
                value={settings.yolo_phone_conf_threshold}
                onChange={(e) => setSettings({ ...settings, yolo_phone_conf_threshold: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Optimized for horizontal & held smartphones (0.18 recommended).</p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Facial Recognition Confidence</label>
              <input
                type="number"
                step="0.01"
                min="0.40"
                max="0.95"
                value={settings.face_match_threshold}
                onChange={(e) => setSettings({ ...settings, face_match_threshold: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Cosine similarity match floor for student verification.</p>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Camera Frame Sampling Rate (ms)</label>
              <input
                type="number"
                step="100"
                min="500"
                max="5000"
                value={settings.monitoring_interval_ms}
                onChange={(e) => setSettings({ ...settings, monitoring_interval_ms: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
              />
              <p className="text-[10px] text-slate-500 mt-1">Interval between consecutive AI inference frames (1500 ms ideal).</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving System Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};

