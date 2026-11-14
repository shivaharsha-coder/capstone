import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Trash2,
  AlertTriangle,
  Smartphone,
  Eye,
  CheckCircle2,
  Clock,
  Shield,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  GraduationCap,
  HardDrive,
  X,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Check,
  AlertCircle,
  EyeOff
} from 'lucide-react';
import api from '../../api/client';

export const AdminMonitoring = () => {
  const [activeTab, setActiveTab] = useState('videos'); // 'videos' | 'history'

  // Video sessions state
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videoSearch, setVideoSearch] = useState('');
  const [selectedClassroomFilter, setSelectedClassroomFilter] = useState('ALL');
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Vision alerts history state
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('ALL');
  const [selectedSnapshotModal, setSelectedSnapshotModal] = useState(null);
  const [modalImageError, setModalImageError] = useState(false);

  // Delete confirmation modal state
  const [itemToDelete, setItemToDelete] = useState(null); // { type: 'video' | 'alert', id, title }
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const res = await api.get('/api/admin/monitoring/videos');
      setVideos(res.data);
    } catch (err) {
      console.error('Failed to fetch class session videos:', err);
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await api.get('/api/admin/monitoring/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to fetch monitoring alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    fetchAlerts();

    // Real-time WebSocket connection to receive incoming monitoring events
    let ws = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      ws = new WebSocket(`${wsProtocol}//${host}:8000/api/monitoring/ws`);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'NEW_ALERT' && msg.alert) {
            setAlerts((prev) => [msg.alert, ...prev]);
          } else if (msg.type === 'NEW_SESSION_VIDEO' && msg.video) {
            setVideos((prev) => [msg.video, ...prev.filter((v) => v.id !== msg.video.id)]);
            showToast(`New class session video published: "${msg.video.title}"`);
          } else if (msg.type === 'STUDENT_MONITORING_TICK' && msg.data) {
            // Live tick from a student
            if (msg.data.phone_detected || msg.data.distracted) {
              fetchAlerts();
            }
          }
        } catch (e) {
          console.warn('WS message error:', e);
        }
      };
    } catch (e) {
      console.warn('WS initialization error:', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setActionLoading(true);
    try {
      if (itemToDelete.type === 'video') {
        await api.delete(`/api/admin/monitoring/videos/${itemToDelete.id}`);
        setVideos((prev) => prev.filter((v) => v.id !== itemToDelete.id));
        showToast(`Class session video "${itemToDelete.title}" deleted.`);
      } else if (itemToDelete.type === 'alert') {
        await api.delete(`/api/admin/monitoring/alerts/${itemToDelete.id}`);
        setAlerts((prev) => prev.filter((a) => a.id !== itemToDelete.id));
        showToast('Classroom vision record deleted from history.');
      }
      setItemToDelete(null);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to delete record.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewAlert = async (alertId) => {
    try {
      await api.put(`/api/admin/monitoring/alerts/${alertId}/review`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_reviewed: true } : a))
      );
      showToast('Alert marked as reviewed.');
    } catch (err) {
      showToast('Failed to update alert status.', 'error');
    }
  };

  // Filtered videos
  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
      (v.subject_code && v.subject_code.toLowerCase().includes(videoSearch.toLowerCase())) ||
      (v.faculty_name && v.faculty_name.toLowerCase().includes(videoSearch.toLowerCase()));
    const matchesClass =
      selectedClassroomFilter === 'ALL' || v.classroom_name === selectedClassroomFilter;
    return matchesSearch && matchesClass;
  });

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    const searchLow = alertSearch.toLowerCase();
    const matchesSearch =
      (a.student_name && a.student_name.toLowerCase().includes(searchLow)) ||
      (a.student_roll && a.student_roll.toLowerCase().includes(searchLow)) ||
      (a.classroom_name && a.classroom_name.toLowerCase().includes(searchLow)) ||
      (a.notes && a.notes.toLowerCase().includes(searchLow));

    const matchesType =
      alertTypeFilter === 'ALL' ||
      (alertTypeFilter === 'MOBILE' && a.event_type.includes('MOBILE')) ||
      (alertTypeFilter === 'ORIENTATION' &&
        (a.event_type.includes('HEAD') || a.event_type.includes('POSE') || a.event_type.includes('DISTRACTION')));

    return matchesSearch && matchesType;
  });

  // Unique classrooms for filter
  const uniqueClassrooms = Array.from(new Set(videos.map((v) => v.classroom_name).filter(Boolean)));

  // Aggregate stats
  const totalDistractions = videos.reduce((acc, v) => acc + (v.distractions_flagged || 0), 0) +
    alerts.filter((a) => a.event_type !== 'MOBILE_PHONE').length;
  const totalPhoneAlerts = videos.reduce((acc, v) => acc + (v.mobile_alerts_flagged || 0), 0) +
    alerts.filter((a) => a.event_type === 'MOBILE_PHONE').length;

  const getBackendUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getVideoSrc = (url) => {
    return getBackendUrl(url);
  };

  const getImageSrc = (url) => {
    if (!url) return null;
    return getBackendUrl(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {feedbackToast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md border animate-fadeIn ${
            feedbackToast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {feedbackToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Institutional Archive
            </span>
            <span className="text-slate-400 text-xs">• Central Vision Logs</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Video className="w-7 h-7 text-rose-500" />
            Classroom Vision & Session Recordings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review recorded class session videos, inspect AI smartphone & distraction vision history, and manage unwanted records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchVideos();
              fetchAlerts();
              showToast('Refreshed class sessions and vision history.');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 text-xs font-semibold flex items-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Archives</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Recorded Sessions</span>
            <Video className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{videos.length}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Full classroom lecture videos</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Vision Events Logged</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400">{alerts.length}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Real-time AI detections recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Mobile Phone Flags</span>
            <Smartphone className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{totalPhoneAlerts}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Flagged across all sessions</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Distraction Incidents</span>
            <Eye className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">{totalDistractions}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Head turned / looking away</span>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-2 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'videos'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Recorded Class Sessions ({videos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'history'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Classroom Vision History & Alerts ({alerts.length})</span>
        </button>
      </div>

      {/* TAB 1: RECORDED CLASS SESSIONS */}
      {activeTab === 'videos' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={videoSearch}
                onChange={(e) => setVideoSearch(e.target.value)}
                placeholder="Search class sessions by topic, subject code, or faculty..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Classroom:
              </span>
              <select
                value={selectedClassroomFilter}
                onChange={(e) => setSelectedClassroomFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="ALL">All Classrooms</option>
                {uniqueClassrooms.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {selectedClassroomFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedClassroomFilter('ALL')}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition"
                  title="Show all recorded classroom sessions"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

          {/* Videos Grid */}
          {videosLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs rounded-3xl bg-[#0f172a] border border-slate-800">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading recorded session videos...
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800">
              <Video className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-300 font-semibold text-sm">No class session videos found</p>
              <p className="text-slate-500 text-xs mt-1">Try adjusting your search query or classroom filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 overflow-hidden shadow-xl flex flex-col justify-between transition group"
                >
                  {/* Thumbnail / Video Preview Area */}
                  <div className="relative aspect-video bg-slate-900 overflow-hidden">
                    <img
                      src={getVideoSrc(video.thumbnail_url)}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-black/40"></div>

                    {/* Classroom Badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10">
                      {video.classroom_name}
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {video.duration}
                    </div>

                    {/* Play Button Overlay */}
                    <button
                      onClick={() => setActiveVideoModal(video)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/40 transition hover:scale-110 active:scale-95"
                      title="Play Session Video"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </button>
                  </div>

                  {/* Details Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-bold">
                          {video.subject_code}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {video.faculty_name}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 mb-3">
                        {video.title}
                      </h3>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Recorded</span>
                          <span className="text-slate-300 font-medium">{video.recorded_at}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">File Size</span>
                          <span className="text-slate-300 font-medium">{video.file_size}</span>
                        </div>
                      </div>

                      {/* Vision Flags in this session */}
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${
                            video.mobile_alerts_flagged > 0
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          <Smartphone className="w-3 h-3" />
                          {video.mobile_alerts_flagged} Phones
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md border flex items-center gap-1 font-semibold ${
                            video.distractions_flagged > 0
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          {video.distractions_flagged} Distractions
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                      <button
                        onClick={() => setActiveVideoModal(video)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Watch Video</span>
                      </button>

                      {/* Delete Unwanted Video Button */}
                      <button
                        onClick={() =>
                          setItemToDelete({
                            type: 'video',
                            id: video.id,
                            title: video.title
                          })
                        }
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition hover:scale-105"
                        title="Delete unwanted class session video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLASSROOM VISION VIEW HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f172a] border border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                placeholder="Search history by student name, roll number, classroom, or notes..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-rose-500 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Alert Type:
              </span>
              <select
                value={alertTypeFilter}
                onChange={(e) => setAlertTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="ALL">All Event Types</option>
                <option value="MOBILE">Smartphone Detections Only</option>
                <option value="ORIENTATION">Head Pose / Distractions</option>
              </select>
            </div>
          </div>

          {/* Alerts Table */}
          {alertsLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs rounded-3xl bg-[#0f172a] border border-slate-800">
              <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading classroom vision records...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-300 font-semibold text-sm">No classroom vision events found</p>
              <p className="text-slate-500 text-xs mt-1">Classroom vision history is clean.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Student / Target</th>
                    <th className="py-3.5 px-4">Classroom</th>
                    <th className="py-3.5 px-4">Detection Event</th>
                    <th className="py-3.5 px-4">Confidence</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-slate-900/40 transition">
                      {/* Student info */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">
                          {alert.student_name || 'Classroom View'}
                        </div>
                        {alert.student_roll && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {alert.student_roll}
                          </div>
                        )}
                      </td>

                      {/* Classroom */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {alert.classroom_name || 'Smart Classroom 401'}
                      </td>

                      {/* Event Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {alert.event_type === 'MOBILE_PHONE' ? (
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 font-bold">
                              <Smartphone className="w-3.5 h-3.5" />
                              Smartphone Detected
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 font-bold">
                              <Eye className="w-3.5 h-3.5" />
                              {alert.notes || 'Inattention / Head Pose'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                        {alert.confidence}%
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                        {alert.timestamp}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {alert.is_reviewed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            Verification Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setModalImageError(false);
                              setSelectedSnapshotModal(alert);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition"
                            title="Inspect Snapshot & Verify"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Evidence</span>
                          </button>

                          {/* Delete unwanted vision record */}
                          <button
                            onClick={() =>
                              setItemToDelete({
                                type: 'alert',
                                id: alert.id,
                                title: `${alert.event_type} (${alert.timestamp})`
                              })
                            }
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            title="Delete unwanted vision record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-4xl w-full bg-[#0f172a] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{activeVideoModal.title}</h3>
                <p className="text-[11px] text-slate-400">
                  {activeVideoModal.classroom_name} • {activeVideoModal.faculty_name} ({activeVideoModal.subject_code})
                </p>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={getVideoSrc(activeVideoModal.video_url)}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video player.
              </video>
            </div>

            <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>Duration: <strong className="text-white">{activeVideoModal.duration}</strong></span>
                <span>Size: <strong className="text-white">{activeVideoModal.file_size}</strong></span>
                <span>Recorded: <strong className="text-white">{activeVideoModal.recorded_at}</strong></span>
              </div>
              <button
                onClick={() => {
                  const toDelete = activeVideoModal;
                  setActiveVideoModal(null);
                  setItemToDelete({
                    type: 'video',
                    id: toDelete.id,
                    title: toDelete.title
                  });
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SNAPSHOT VIEWER / EVIDENCE VERIFICATION MODAL */}
      {selectedSnapshotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-xl w-full bg-[#0f172a] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  AI Classroom Vision Evidence & Snapshot
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedSnapshotModal.student_name} ({selectedSnapshotModal.student_roll}) • {selectedSnapshotModal.classroom_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedSnapshotModal(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Evidence Image */}
            <div className="p-4 flex flex-col items-center justify-center bg-slate-950/80 min-h-[260px] relative border-b border-slate-800/80">
              {getImageSrc(selectedSnapshotModal.image_snapshot) && !modalImageError ? (
                <img
                  src={getImageSrc(selectedSnapshotModal.image_snapshot)}
                  alt="Vision Alert Snapshot"
                  onError={() => setModalImageError(true)}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-lg"
                />
              ) : (
                <div className="w-full max-w-md py-8 px-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                    selectedSnapshotModal.event_type === 'MOBILE_PHONE'
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {selectedSnapshotModal.event_type === 'MOBILE_PHONE' ? (
                      <Smartphone className="w-7 h-7" />
                    ) : (
                      <EyeOff className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {selectedSnapshotModal.event_type === 'MOBILE_PHONE' ? 'Smartphone Detection Record' : 'Inattention Detection Record'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedSnapshotModal.notes || 'Real-time telemetry event logged by Classroom AI engine.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 font-mono text-emerald-400">
                      Confidence: {selectedSnapshotModal.confidence}%
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
                      {selectedSnapshotModal.classroom_name || 'Classroom Camera'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Details & Actions */}
            <div className="p-4 bg-slate-900/80 border-t border-slate-800 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Event Type</span>
                  <strong className={selectedSnapshotModal.event_type === 'MOBILE_PHONE' ? 'text-rose-400' : 'text-amber-400'}>
                    {selectedSnapshotModal.event_type === 'MOBILE_PHONE' ? 'Smartphone Detected' : 'Inattention / Looking Away'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">AI Confidence</span>
                  <strong className="text-white font-mono">{selectedSnapshotModal.confidence}%</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Logged At</span>
                  <strong className="text-white">{selectedSnapshotModal.timestamp}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Review Status</span>
                  <strong className={selectedSnapshotModal.is_reviewed ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedSnapshotModal.is_reviewed ? 'Verified' : 'Verification Pending'}
                  </strong>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold block text-[11px] mb-0.5">Violation Note:</span>
                <span>{selectedSnapshotModal.notes || "Detected during live student monitoring."}</span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {!selectedSnapshotModal.is_reviewed ? (
                  <button
                    onClick={async () => {
                      await handleReviewAlert(selectedSnapshotModal.id);
                      setSelectedSnapshotModal((prev) => ({ ...prev, is_reviewed: true }));
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Confirm & Mark as Verified</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evidence Officially Verified</span>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedSnapshotModal(null);
                      setActiveTab('videos');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Video className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Watch Class Video</span>
                  </button>
                  <button
                    onClick={() => setSelectedSnapshotModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-[#0f172a] rounded-3xl border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">
                Delete {itemToDelete.type === 'video' ? 'Class Session Video' : 'Vision Record'}?
              </h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to remove <span className="text-white font-semibold">"{itemToDelete.title}"</span>? This record will be permanently deleted from database history.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
