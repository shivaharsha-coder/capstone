import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Play,
  Square,
  AlertTriangle,
  Smartphone,
  Eye,
  CheckCircle2,
  Clock,
  Shield,
  Sparkles,
  RefreshCw,
  Info,
  History,
  Compass,
  CheckCircle,
  XCircle,
  Users,
  User,
  X,
  ExternalLink,
  ChevronRight,
  Radio,
  Bell,
  Camera,
  TrendingUp,
  AlertOctagon,
  Search,
  Filter,
  Calendar,
  Mic,
  MicOff,
  VideoOff,
  EyeOff
} from 'lucide-react';
import api from '../../api/client';

export const FacultyMonitoring = () => {
  const [monitoringActive, setMonitoringActive] = useState(false);
  const monitoringActiveRef = useRef(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [classroomName, setClassroomName] = useState('Smart Classroom 401');

  // Live Students Roster
  const [liveStudents, setLiveStudents] = useState([]);
  const [liveStudentsLoading, setLiveStudentsLoading] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAlertSnapshot, setSelectedAlertSnapshot] = useState(null);
  const [modalImageError, setModalImageError] = useState(false);

  // Live Urgent Notification Banner (e.g. Student XYZ detected using smartphone / looking away)
  const [urgentBannerAlert, setUrgentBannerAlert] = useState(null);

  // Live Class / Meeting Session State
  const [meetingActive, setMeetingActive] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState("Lecture 16: Socket Programming & TCP Congestion Control");
  const [meetingSubject, setMeetingSubject] = useState("CS501 - Computer Networks");
  const [meetingSeconds, setMeetingSeconds] = useState(0);
  const [meetingPhones, setMeetingPhones] = useState(0);
  const [meetingDistractions, setMeetingDistractions] = useState(0);
  const [meetingSaving, setMeetingSaving] = useState(false);
  const [meetingFinishedSummary, setMeetingFinishedSummary] = useState(null);
  const [previewVideoModal, setPreviewVideoModal] = useState(null);

  // View Tabs: 'live' | 'videos' | 'history'
  const [activeTab, setActiveTab] = useState('live');
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoSearch, setVideoSearch] = useState('');
  const [alertSearch, setAlertSearch] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('ALL');
  const [isMicMuted, setIsMicMuted] = useState(false);

  const meetingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Audible warning signal for faculty console
  const playFacultyWarningSignal = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(659.25, now + 0.15);
      osc.frequency.setValueAtTime(880, now + 0.30);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  };

  const getBackendUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
      return path;
    }
    const protocol = window.location.protocol;
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:8000${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const getImageSrc = (url) => {
    if (!url) return null;
    return getBackendUrl(url);
  };

  const getVideoSrc = (url) => {
    return getBackendUrl(url);
  };

  const fetchVideos = async () => {
    setVideosLoading(true);
    try {
      const res = await api.get('/api/monitoring/videos');
      setVideos(res.data);
    } catch (err) {
      console.warn('Error fetching session videos:', err);
    } finally {
      setVideosLoading(false);
    }
  };

  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await api.get('/api/monitoring/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchLiveStudents = async () => {
    setLiveStudentsLoading(true);
    try {
      const res = await api.get('/api/monitoring/live-students');
      setLiveStudents(res.data);
    } catch (err) {
      console.error('Error fetching live students:', err);
    } finally {
      setLiveStudentsLoading(false);
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await api.get('/api/monitoring/active-session');
      if (res.data.is_active) {
        setMeetingActive(true);
        if (res.data.title) setMeetingTitle(res.data.title);
        if (res.data.classroom_name) setClassroomName(res.data.classroom_name);
      }
    } catch (e) {
      console.warn('Session check error:', e);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchLiveStudents();
    fetchVideos();
    checkActiveSession();

    const rosterInterval = setInterval(() => {
      fetchLiveStudents();
    }, 3500);

    let ws = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      ws = new WebSocket(`${wsProtocol}//${host}:8000/api/monitoring/ws`);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Handle direct urgent smartphone warning signal
          if (msg.type === 'URGENT_FACULTY_PHONE_ALERT' && msg.data) {
            const data = msg.data;
            const studentName = data.student_name || 'Student';
            const studentRoll = data.student_roll || '';
            playFacultyWarningSignal();
            setMeetingPhones((prev) => prev + 1);
            setUrgentBannerAlert({
              id: Date.now(),
              type: 'MOBILE_PHONE',
              student_name: studentName,
              student_roll: studentRoll,
              title: `🚨 SMARTPHONE DETECTED: Student ${studentName} (${studentRoll})`,
              message: `Student ${studentName} (${studentRoll}) was detected using a mobile phone in live class '${data.class_title || 'Online Class'}'! An automatic warning signal has been dispatched.`,
              time: data.detection_time || new Date().toLocaleTimeString(),
              confidence: data.primary_confidence || 85.0,
              snapshot: data.snapshot_url
            });
            fetchAlerts();
          }

          // Handle incoming student live frame tick
          if (msg.type === 'STUDENT_MONITORING_TICK' && msg.data) {
            const data = msg.data;
            const studentName = data.student_name || 'Student';
            const studentRoll = data.student_roll || '';

            // 0. If Proxy Attendance / Face Mismatch: Play audible warning signal & flash banner!
            if (data.is_proxy_detected || data.face_matched === false) {
              playFacultyWarningSignal();
              setUrgentBannerAlert({
                id: Date.now(),
                type: 'PROXY_MISMATCH',
                student_name: studentName,
                student_roll: studentRoll,
                title: `❌ PROXY ATTENDANCE BLOCKED: Student ${studentName} (${studentRoll})`,
                message: `Face does not match registered baseline profile (Similarity: ${data.similarity_pct || 31}%). Daily attendance marked ABSENT!`,
                time: data.detection_time || new Date().toLocaleTimeString(),
                confidence: data.similarity_pct || 31.0,
                snapshot: data.snapshot_url
              });
              fetchAlerts();
            }
            // 1. If Smartphone Detected: Play audible warning signal & flash banner!
            else if (data.phone_detected) {
              playFacultyWarningSignal();
              setMeetingPhones((prev) => prev + 1);
              setUrgentBannerAlert({
                id: Date.now(),
                type: 'MOBILE_PHONE',
                student_name: studentName,
                student_roll: studentRoll,
                title: `🚨 SMARTPHONE DETECTED: Student ${studentName} (${studentRoll})`,
                message: `Student ${studentName} (${studentRoll}) was detected using a mobile phone during live session!`,
                time: data.detection_time || new Date().toLocaleTimeString(),
                confidence: data.primary_confidence || 85.0,
                snapshot: data.snapshot_url
              });
              fetchAlerts();
            }
            // 2. If Inattentive (Facing Left, Right, Looking Down, Looking Up, Facing Away, Head Tilted):
            else if (['Facing Left', 'Facing Right', 'Looking Down', 'Looking Up', 'Facing Away', 'Head Tilted'].includes(data.primary_head_orientation)) {
              setMeetingDistractions((prev) => prev + 1);
              setUrgentBannerAlert({
                id: Date.now(),
                type: 'DISTRACTION',
                student_name: studentName,
                student_roll: studentRoll,
                title: `⚠️ INATTENTION ALERT: Student ${studentName} (${studentRoll})`,
                message: `Student ${studentName} (${studentRoll}) is seeing surroundings (${data.primary_head_orientation}) instead of watching the live lecture!`,
                time: data.detection_time || new Date().toLocaleTimeString(),
                orientation: data.primary_head_orientation,
                confidence: 85.0,
                snapshot: data.snapshot_url
              });
              fetchAlerts();
            }

            // Update Live Students Roster
            setLiveStudents((prev) => {
              const existingIdx = prev.findIndex((s) => s.student_id === data.student_id);
              if (existingIdx >= 0) {
                const updated = [...prev];
                updated[existingIdx] = {
                  ...updated[existingIdx],
                  head_orientation: data.primary_head_orientation,
                  phone_detected: data.phone_detected,
                  status: data.status,
                  detection_time: data.detection_time,
                  confidence: data.primary_confidence,
                  face_matched: data.face_matched,
                  similarity_pct: data.similarity_pct,
                  attendance_status: data.attendance_status,
                  is_proxy_detected: data.is_proxy_detected
                };
                return updated;
              } else {
                return [data, ...prev];
              }
            });
          }

          if (msg.type === 'PROXY_ATTENDANCE_ALERT' && msg.data) {
            playFacultyWarningSignal();
            setUrgentBannerAlert({
              id: Date.now(),
              type: 'PROXY_MISMATCH',
              student_name: msg.data.student_name,
              student_roll: msg.data.student_roll,
              title: `❌ PROXY ATTENDANCE BLOCKED: ${msg.data.student_name} (${msg.data.student_roll})`,
              message: `Unmatched face detected. Daily attendance marked ABSENT.`,
              time: msg.data.detection_time || new Date().toLocaleTimeString(),
              confidence: msg.data.similarity_pct || 31.0,
              snapshot: msg.data.snapshot_url
            });
            fetchAlerts();
            fetchLiveStudents();
          }

          if (msg.type === 'NEW_ALERT' && msg.alert) {
            setAlerts((prev) => [msg.alert, ...prev.filter((a) => a.id !== msg.alert.id)]);
          }

          if (msg.type === 'NEW_SESSION_VIDEO' && msg.video) {
            setVideos((prev) => [msg.video, ...prev.filter((v) => v.id !== msg.video.id)]);
          }
        } catch (e) {
          console.warn(e);
        }
      };
    } catch (e) {
      console.warn('WebSocket connection not available:', e);
    }

    return () => {
      stopCamera();
      clearInterval(rosterInterval);
      if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (cameraConnected && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn(e));
    }
  }, [cameraConnected, activeTab]);

  const startRecordingStream = (stream) => {
    try {
      recordedChunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : undefined;

      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('MediaRecorder error:', e);
    }
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraConnected(true);
      return stream;
    } catch (err) {
      setCameraError('Camera access denied: ' + err.message);
      setCameraConnected(false);
      return null;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraConnected(false);
  };

  // --- START CLASS MEETING ---
  const handleStartClassMeeting = async () => {
    setMeetingSeconds(0);
    setMeetingDistractions(0);
    setMeetingPhones(0);
    setUrgentBannerAlert(null);
    recordedChunksRef.current = [];

    try {
      await api.post('/api/monitoring/start-session', {
        title: meetingTitle || "CS501 - Computer Networks",
        subject_code: meetingSubject.split(' ')[0] || "CS501",
        classroom_name: classroomName
      });
    } catch (e) {
      console.error('Start session API error:', e);
      alert('Could not start live class session on server. Please verify backend is online.');
      return;
    }

    const stream = await startCamera();
    if (stream) {
      startRecordingStream(stream);
    }

    if (meetingTimerRef.current) clearInterval(meetingTimerRef.current);
    meetingTimerRef.current = setInterval(() => {
      setMeetingSeconds((prev) => prev + 1);
    }, 1000);

    setMeetingActive(true);
    monitoringActiveRef.current = true;
    setMonitoringActive(true);
  };

  // --- END CLASS MEETING & PUBLISH TO ADMIN PORTAL ---
  const handleEndClassMeeting = async () => {
    setMeetingSaving(true);

    if (meetingTimerRef.current) {
      clearInterval(meetingTimerRef.current);
      meetingTimerRef.current = null;
    }

    let uploadedVideoUrl = null;
    let computedFileSize = null;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise((resolve) => {
          mediaRecorderRef.current.onstop = resolve;
          mediaRecorderRef.current.stop();
        });

        if (recordedChunksRef.current && recordedChunksRef.current.length > 0) {
          const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
          if (videoBlob.size > 2000) {
            const formData = new FormData();
            formData.append('file', videoBlob, `class_session_${Date.now()}.webm`);
            try {
              const uploadRes = await api.post('/api/monitoring/upload-recording', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              uploadedVideoUrl = uploadRes.data.video_url;
              computedFileSize = uploadRes.data.file_size;
            } catch (err) {
              console.warn('Video upload notice:', err);
            }
          }
        }
      } catch (err) {
        console.warn('Recorder termination notice:', err);
      }
    }

    const formatDurationString = (secs) => {
      if (secs < 60) return `${Math.max(1, secs)} secs`;
      const mins = Math.round(secs / 60);
      return `${mins} mins`;
    };

    try {
      const durStr = formatDurationString(meetingSeconds);
      const res = await api.post('/api/monitoring/end-session', {
        title: meetingTitle || "Classroom Lecture Session",
        classroom_name: classroomName,
        subject_code: meetingSubject.split(' ')[0] || "CS501",
        duration: durStr,
        file_size: computedFileSize || `${Math.max(110, Math.round(meetingSeconds * 2.5))} MB`,
        distractions_flagged: meetingDistractions,
        mobile_alerts_flagged: meetingPhones,
        video_url: uploadedVideoUrl || null
      });

      setMeetingFinishedSummary(res.data.video);
      await fetchVideos();
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to end and save session video:', err);
    } finally {
      stopCamera();
      setMeetingActive(false);
      monitoringActiveRef.current = false;
      setMonitoringActive(false);
      setMeetingSaving(false);
    }
  };

  const markAlertReviewed = async (alertId) => {
    try {
      await api.put(`/api/monitoring/alerts/${alertId}/review`);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_reviewed: true } : a))
      );
    } catch (err) {
      console.error('Failed to review alert:', err);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-400" />
            Classroom Vision & Live Student Attention
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time instructor console: Live telemetry of attending students, instant smartphone and inattention alerts with student names.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Live Class & Attention</span>
            {meetingActive && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'videos'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Video className="w-4 h-4 text-sky-400" />
            <span>Recorded Videos ({videos.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-rose-400" />
            <span>Captured Evidence ({alerts.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          IMMEDIATE LIVE NOTIFICATION BANNER (STUDENT NAME PROMINENTLY DISPLAYED)
          ========================================================================= */}
      {urgentBannerAlert && (
        <div className={`p-4 rounded-3xl border-2 shadow-2xl flex items-start justify-between gap-4 transition-all duration-300 ${
          urgentBannerAlert.type === 'MOBILE_PHONE'
            ? 'bg-rose-950/90 border-rose-500 text-rose-200 ring-4 ring-rose-500/20'
            : 'bg-amber-950/90 border-amber-500 text-amber-200 ring-4 ring-amber-500/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl ${
              urgentBannerAlert.type === 'MOBILE_PHONE' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {urgentBannerAlert.type === 'MOBILE_PHONE' ? (
                <Smartphone className="w-6 h-6 animate-pulse" />
              ) : (
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  urgentBannerAlert.type === 'MOBILE_PHONE' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'
                }`}>
                  {urgentBannerAlert.type === 'MOBILE_PHONE' ? '🚨 LIVE SMARTPHONE DETECTED' : '⚠️ LIVE DISTRACTION DETECTED'}
                </span>
                <span className="text-[11px] text-slate-300 font-mono">{urgentBannerAlert.time}</span>
              </div>

              <h3 className="font-bold text-white text-base mt-1">
                Student <span className="underline decoration-2 underline-offset-2">{urgentBannerAlert.student_name}</span> ({urgentBannerAlert.student_roll})
              </h3>
              <p className="text-xs text-slate-200 mt-0.5">
                {urgentBannerAlert.message}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalImageError(false);
                setSelectedAlertSnapshot({
                  student_name: urgentBannerAlert.student_name,
                  student_roll: urgentBannerAlert.student_roll,
                  event_type: urgentBannerAlert.type,
                  classroom_name: classroomName,
                  timestamp: urgentBannerAlert.time,
                  confidence: urgentBannerAlert.confidence,
                  notes: urgentBannerAlert.message,
                  image_snapshot: urgentBannerAlert.snapshot
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Evidence</span>
            </button>
            <button
              onClick={() => setUrgentBannerAlert(null)}
              className="p-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 1: LIVE CLASSROOM & AI ATTENTION MONITOR
          ========================================================================= */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          {/* LIVE CLASS MEETING CONTROLLER PANEL */}
      <div className={`p-6 rounded-3xl border shadow-2xl transition duration-300 relative overflow-hidden ${
        meetingActive
          ? 'bg-gradient-to-r from-rose-950/30 via-slate-900 to-indigo-950/30 border-rose-500/50'
          : 'bg-[#0f172a] border-slate-800'
      }`}>
        {meetingActive ? (
          /* Active Meeting Mode */
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider font-mono">
                  Live Class Meeting In Session
                </span>
                <span className="text-xs font-mono font-bold text-rose-400 bg-black/40 px-2.5 py-0.5 rounded-lg border border-rose-500/30">
                  ⏱️ {formatTimer(meetingSeconds)}
                </span>
              </div>

              <h2 className="text-lg font-bold text-white tracking-tight">
                {meetingTitle}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="text-indigo-400 font-semibold">{meetingSubject}</span>
                <span>•</span>
                <span>{classroomName}</span>
                <span>•</span>
                <span className="text-emerald-400">Class Recording Active & Syncing to Admin</span>
              </p>

              {/* Real-Time Meeting Metrics Bar */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-slate-400">Attending Students:</span>
                  <strong className="text-white">{liveStudents.length}</strong>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs">
                  <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-slate-400">Phones Flagged:</span>
                  <strong className="text-rose-400 font-bold">{meetingPhones}</strong>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 text-xs">
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Distractions Flagged:</span>
                  <strong className="text-amber-400 font-bold">{meetingDistractions}</strong>
                </div>
              </div>
            </div>

            {/* End Class Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleEndClassMeeting}
                disabled={meetingSaving}
                className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {meetingSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Publishing Video to Admin Portal...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>End Class & Publish Video to Admin Portal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Meeting Setup & Start Mode */
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                    Live Session Controls
                  </span>
                  <span className="text-xs text-slate-400">• Ready to Conduct Class</span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Start Live Class Meeting & Video Recording
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Starting this class meeting enables students to join, starts live AI attention monitoring, and automatically archives the video to the Admin Portal upon completion.
                </p>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartClassMeeting}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-emerald-600/25 transition flex items-center justify-center gap-2.5 group"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition" />
                <span>Start Live Class Meeting</span>
              </button>
            </div>

            {/* Quick Session Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div>
                <label className="text-slate-400 text-[11px] font-semibold block mb-1">
                  Class Meeting Topic / Title:
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Lecture 16: Socket Programming"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-semibold block mb-1">
                  Course / Subject:
                </label>
                <input
                  type="text"
                  value={meetingSubject}
                  onChange={(e) => setMeetingSubject(e.target.value)}
                  placeholder="e.g. CS501 - Computer Networks"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="text-slate-400 text-[11px] font-semibold block mb-1">
                  Classroom / Hall:
                </label>
                <select
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="Smart Classroom 401">Smart Classroom 401</option>
                  <option value="Smart Classroom 302">Smart Classroom 302</option>
                  <option value="Central Auditorium">Central Auditorium</option>
                  <option value="Cyber Lab 102">Cyber Lab 102</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MAIN MONITORING GRID
          Left: Live Connected Students Roster & Visual Attention Telemetry
          Right: Live Student Inattention & Smartphone Alert Feed (Student Name Prominent)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Attending Students */}
        <div className="lg:col-span-2 space-y-4">
          {/* Instructor Live Broadcast Webcam Feed */}
          <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Instructor Classroom Video Broadcast</h3>
                  <p className="text-[11px] text-slate-400">Live lecture video streamed to attending students</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {cameraConnected ? (
                  <button
                    onClick={stopCamera}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition flex items-center gap-1.5"
                  >
                    <VideoOff className="w-3.5 h-3.5" />
                    <span>Stop Video</span>
                  </button>
                ) : (
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Video</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraConnected ? '' : 'hidden'}`}
              />
              {!cameraConnected && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
                    <Video className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-white">Camera Standby</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Instructor webcam is currently inactive. Click below to start preview or start a live class meeting.
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/30"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Camera Preview</span>
                  </button>
                </div>
              )}
              {cameraConnected && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  <span>LIVE INSTRUCTOR BROADCAST</span>
                </div>
              )}
              {cameraConnected && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="font-semibold text-slate-200 truncate">{meetingTitle}</span>
                  <span className="font-mono text-emerald-400">⏱️ {formatTimer(meetingSeconds)}</span>
                </div>
              )}
            </div>
            {cameraError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {cameraError}
              </div>
            )}
          </div>
          <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Live Attending Students ({liveStudents.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Real-time visual attention and mobile device usage streamed directly from attending students' cameras.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLiveStudents}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
                  title="Refresh Student Roster"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${liveStudentsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {liveStudents.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs space-y-3">
                <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-slate-300 text-sm">No students currently streaming in this class</p>
                  <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                    {meetingActive
                      ? "Students can now join the active class session from their portal."
                      : "Start the class meeting above to open the session for attending students."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveStudents.map((st) => {
                  const isProxy = st.is_proxy_detected || st.face_matched === false;
                  const isStDistracted = ['Facing Left', 'Facing Right', 'Looking Down', 'Looking Up', 'Facing Away', 'Head Tilted'].includes(st.head_orientation);
                  return (
                    <div
                      key={st.student_id}
                      className={`p-4 rounded-3xl border-2 transition shadow-xl space-y-3 ${
                        isProxy
                          ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-rose-900/40 animate-pulse'
                          : st.phone_detected
                          ? 'bg-rose-950/30 border-rose-500 text-rose-200'
                          : isStDistracted
                          ? 'bg-amber-950/25 border-amber-500/60 text-amber-200'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={st.student_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${st.student_name}`}
                            alt={st.student_name}
                            className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 object-cover"
                          />
                          <div>
                            <h4 className="font-bold text-white text-sm">{st.student_name}</h4>
                            <p className="text-[11px] text-slate-400 font-mono">{st.student_roll} • {st.student_dept}</p>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          isProxy
                            ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40'
                            : st.phone_detected
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'
                            : isStDistracted
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {isProxy ? '❌ PROXY (ABSENT)' : st.phone_detected ? '🚨 SMARTPHONE' : isStDistracted ? '⚠️ DISTRACTED' : '✅ ATTENTIVE'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800/80 text-[11px]">
                          <span className="text-slate-400">Daily Attendance:</span>
                          <span className={`font-extrabold flex items-center gap-1 ${
                            isProxy
                              ? 'text-rose-400'
                              : st.face_matched === true
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {isProxy
                              ? `❌ ABSENT (Face Mismatch ${st.similarity_pct || 31}%)`
                              : st.face_matched === true
                              ? `✅ PRESENT (Face Verified ${st.similarity_pct || 94}%)`
                              : 'Verifying Face...'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Visual Orientation:</span>
                          <span className={`font-bold ${
                            st.head_orientation === 'Facing Forward' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>
                            {st.head_orientation || 'Facing Forward'}
                          </span>
                        </div>

                        {isStDistracted && (
                          <div className="text-[10px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 leading-tight">
                            ⚠️ Student is seeing surroundings ({st.head_orientation}) instead of watching live class.
                          </div>
                        )}

                        {isProxy && (
                          <div className="text-[10px] text-rose-300 bg-rose-500/15 p-2 rounded-xl border border-rose-500/30 leading-tight font-medium">
                            🚨 Proxy Attendance Blocked: Face does not match registered student face from previous attendance. Attendance marked ABSENT.
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                          <span className="text-slate-400">Mobile Phone Status:</span>
                          <span className={st.phone_detected ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                            {st.phone_detected ? '🚨 Smartphone In Use' : 'No Phone in View'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Live Inattention & Smartphone Alert Feed */}
        <div className="space-y-4">
          {/* Real-time Alerts Panel */}
          <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-rose-500 animate-pulse" />
                Live Student Alerts Feed
              </span>
              <button
                onClick={fetchAlerts}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
                title="Refresh alerts"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-slate-300">All Students Attentive</p>
                  <p className="text-[11px] text-slate-500">No smartphone or inattention incidents logged.</p>
                </div>
              ) : (
                alerts.slice(0, 8).map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-3.5 rounded-2xl border space-y-2 text-xs transition ${
                      alt.event_type === 'MOBILE_PHONE'
                        ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {/* Student Name Displayed Prominently */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {alt.student_name}
                          </span>
                          {alt.student_roll && alt.student_roll !== 'N/A' && (
                            <span className="text-[10px] text-slate-400 font-mono bg-black/40 px-1.5 py-0.5 rounded">
                              {alt.student_roll}
                            </span>
                          )}
                        </div>

                        <span className={`text-[11px] font-bold block mt-1 ${
                          alt.event_type === 'MOBILE_PHONE' ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {alt.event_type === 'MOBILE_PHONE' ? '🚨 Smartphone Detected in View' : '⚠️ Seeing Surroundings / Looking Away'}
                        </span>

                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {alt.notes}
                        </p>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                        alt.is_reviewed
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}>
                        {alt.is_reviewed ? 'Verified' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                      <span>{alt.timestamp}</span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setModalImageError(false);
                            setSelectedAlertSnapshot(alt);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[10px] flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Snapshot</span>
                        </button>

                        {!alt.is_reviewed && (
                          <button
                            onClick={() => markAlertReviewed(alt.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px] transition"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* =========================================================================
      TAB 2: RECORDED CLASS SESSION VIDEOS
      ========================================================================= */}
  {activeTab === 'videos' && (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={videoSearch}
            onChange={(e) => setVideoSearch(e.target.value)}
            placeholder="Search recorded lecture videos by title or subject code..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchVideos}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${videosLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Videos</span>
          </button>
        </div>
      </div>

      {videosLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs rounded-3xl bg-[#0f172a] border border-slate-800">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading recorded session videos...
        </div>
      ) : videos.filter(v => (v.title || '').toLowerCase().includes(videoSearch.toLowerCase()) || (v.subject_code || '').toLowerCase().includes(videoSearch.toLowerCase())).length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800 space-y-2">
          <Video className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-semibold text-sm">No recorded class session videos found</p>
          <p className="text-slate-500 text-xs">Start and end a live class meeting to automatically archive lecture videos here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos
            .filter(v => (v.title || '').toLowerCase().includes(videoSearch.toLowerCase()) || (v.subject_code || '').toLowerCase().includes(videoSearch.toLowerCase()))
            .map((video) => (
              <div
                key={video.id}
                className="rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 overflow-hidden shadow-xl flex flex-col justify-between transition group"
              >
                <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Video className="w-7 h-7" />
                  </div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10">
                    {video.classroom_name}
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-slate-300 border border-white/10 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {video.duration}
                  </div>
                  <button
                    onClick={() => setPreviewVideoModal(video)}
                    className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center justify-center shadow-xl shadow-indigo-600/40 transition hover:scale-110 active:scale-95"
                    title="Watch Lecture Video"
                  >
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </button>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px] font-mono font-bold">
                        {video.subject_code}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">
                        {video.faculty_name}
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-sm leading-snug line-clamp-2">
                      {video.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Recorded</span>
                      <span className="text-slate-300 font-medium">{video.recorded_at}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">File Size</span>
                      <span className="text-slate-300 font-medium">{video.file_size}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      {video.mobile_alerts_flagged || 0} Phones
                    </span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {video.distractions_flagged || 0} Distractions
                    </span>
                  </div>

                  <button
                    onClick={() => setPreviewVideoModal(video)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Watch Lecture Video</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )}

  {/* =========================================================================
      TAB 3: CAPTURED EVIDENCE & SNAPSHOTS
      ========================================================================= */}
  {activeTab === 'history' && (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={alertSearch}
            onChange={(e) => setAlertSearch(e.target.value)}
            placeholder="Search captured evidence by student name, roll number, or note..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={alertTypeFilter}
            onChange={(e) => setAlertTypeFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Event Types</option>
            <option value="MOBILE_PHONE">Smartphone Detected Only</option>
            <option value="DISTRACTED">Inattention / Looking Away</option>
          </select>
          <button
            onClick={fetchAlerts}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${alertsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Evidence</span>
          </button>
        </div>
      </div>

      {alertsLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs rounded-3xl bg-[#0f172a] border border-slate-800">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading captured evidence records...
        </div>
      ) : alerts
          .filter(a => alertTypeFilter === 'ALL' || (alertTypeFilter === 'MOBILE_PHONE' ? a.event_type === 'MOBILE_PHONE' : a.event_type !== 'MOBILE_PHONE'))
          .filter(a => (a.student_name || '').toLowerCase().includes(alertSearch.toLowerCase()) || (a.student_roll || '').toLowerCase().includes(alertSearch.toLowerCase()) || (a.notes || '').toLowerCase().includes(alertSearch.toLowerCase()))
          .length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800 space-y-2">
          <Shield className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-300 font-semibold text-sm">No vision evidence records found</p>
          <p className="text-slate-500 text-xs">AI attention and smartphone detection logs will appear here in real time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alerts
            .filter(a => alertTypeFilter === 'ALL' || (alertTypeFilter === 'MOBILE_PHONE' ? a.event_type === 'MOBILE_PHONE' : a.event_type !== 'MOBILE_PHONE'))
            .filter(a => (a.student_name || '').toLowerCase().includes(alertSearch.toLowerCase()) || (a.student_roll || '').toLowerCase().includes(alertSearch.toLowerCase()) || (a.notes || '').toLowerCase().includes(alertSearch.toLowerCase()))
            .map((alt) => (
              <div
                key={alt.id}
                className="rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 overflow-hidden shadow-xl flex flex-col justify-between transition group"
              >
                <div className="relative aspect-video bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800/80">
                  {getImageSrc(alt.image_snapshot) ? (
                    <img
                      src={getImageSrc(alt.image_snapshot)}
                      alt="Violation Snapshot"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 text-center">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                        alt.event_type === 'MOBILE_PHONE' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                      }`}>
                        {alt.event_type === 'MOBILE_PHONE' ? <Smartphone className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-2 font-medium">Telemetry Logged</span>
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-lg ${
                    alt.event_type === 'MOBILE_PHONE' ? 'bg-rose-950/80 text-rose-300 border-rose-500/40' : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {alt.event_type === 'MOBILE_PHONE' ? 'Smartphone Detected' : 'Inattentive / Looking Away'}
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-mono text-slate-300 border border-white/10">
                    {alt.confidence ? `${alt.confidence}% Conf` : alt.formatted_time || alt.timestamp}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-white text-sm">
                        {alt.student_name}
                      </h4>
                      {alt.student_roll && alt.student_roll !== 'N/A' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-semibold">
                          {alt.student_roll}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {alt.notes}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>{alt.timestamp}</span>
                    <span className={`font-semibold ${alt.is_reviewed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {alt.is_reviewed ? 'Verified' : 'Pending Review'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setModalImageError(false);
                      setSelectedAlertSnapshot(alt);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect Evidence</span>
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )}

      {/* =========================================================================
          SNAPSHOT EVIDENCE VIEWER MODAL
          ========================================================================= */}
      {selectedAlertSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-lg w-full bg-[#0f172a] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-500" />
                  Student Violation Evidence
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedAlertSnapshot.student_name} ({selectedAlertSnapshot.student_roll}) • {selectedAlertSnapshot.classroom_name || classroomName}
                </p>
              </div>
              <button
                onClick={() => setSelectedAlertSnapshot(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center justify-center bg-slate-950/80 min-h-[250px] relative border-b border-slate-800/80">
              {getImageSrc(selectedAlertSnapshot.image_snapshot) && !modalImageError ? (
                <img
                  src={getImageSrc(selectedAlertSnapshot.image_snapshot)}
                  alt="Student Violation Snapshot"
                  onError={() => setModalImageError(true)}
                  className="max-h-[50vh] max-w-full object-contain rounded-xl border border-slate-800 shadow-lg"
                />
              ) : (
                <div className="w-full max-w-md py-8 px-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center text-center space-y-3">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
                    (selectedAlertSnapshot.event_type || '').includes('MOBILE') || (selectedAlertSnapshot.event_type || '').includes('PHONE')
                      ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {(selectedAlertSnapshot.event_type || '').includes('MOBILE') || (selectedAlertSnapshot.event_type || '').includes('PHONE') ? (
                      <Smartphone className="w-7 h-7" />
                    ) : (
                      <AlertTriangle className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">
                      {(selectedAlertSnapshot.event_type || '').includes('MOBILE') || (selectedAlertSnapshot.event_type || '').includes('PHONE')
                        ? 'Smartphone Detection Record'
                        : 'Inattention / Distraction Record'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {selectedAlertSnapshot.notes || 'Real-time telemetry event logged by Classroom AI engine.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400">
                    {selectedAlertSnapshot.confidence && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 font-mono text-emerald-400">
                        Confidence: {selectedAlertSnapshot.confidence}%
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/60 text-slate-300">
                      {selectedAlertSnapshot.classroom_name || classroomName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-slate-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block text-[10px]">Student</span>
                  <strong className="text-white">{selectedAlertSnapshot.student_name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Logged Time</span>
                  <strong className="text-white">{selectedAlertSnapshot.timestamp}</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                {selectedAlertSnapshot.notes}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {selectedAlertSnapshot.id && !selectedAlertSnapshot.is_reviewed && (
                  <button
                    onClick={async () => {
                      await markAlertReviewed(selectedAlertSnapshot.id);
                      setSelectedAlertSnapshot(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Acknowledge & Mark Reviewed</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedAlertSnapshot(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MEETING FINISHED & ARCHIVED MODAL
          ========================================================================= */}
      {meetingFinishedSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Class Meeting Video Archived!
              </h2>
              <p className="text-xs text-slate-400">
                The session video and AI monitoring telemetry have been automatically published to the <span className="text-rose-400 font-semibold">Admin Portal</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-slate-400">Class Topic:</span>
                <span className="text-white font-bold text-right">{meetingFinishedSummary.title}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Duration</span>
                  <strong className="text-white">{meetingFinishedSummary.duration}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">File Size</span>
                  <strong className="text-white">{meetingFinishedSummary.file_size}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Smartphone Alerts</span>
                  <strong className="text-rose-400 font-bold">{meetingFinishedSummary.mobile_alerts_flagged}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Distractions Flagged</span>
                  <strong className="text-amber-400 font-bold">{meetingFinishedSummary.distractions_flagged}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPreviewVideoModal(meetingFinishedSummary)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Watch Video</span>
              </button>

              <a
                href="/admin/monitoring"
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 transition"
              >
                <span>View in Admin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => setMeetingFinishedSummary(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="max-w-3xl w-full bg-[#0f172a] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{previewVideoModal.title}</h3>
                <p className="text-[11px] text-slate-400">{previewVideoModal.classroom_name} • {previewVideoModal.duration}</p>
              </div>
              <button onClick={() => setPreviewVideoModal(null)} className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={getVideoSrc(previewVideoModal.video_url)}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Browser does not support video playback.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Classroom Monitoring History & Student Alerts
              </h2>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {alerts.length === 0 ? (
                <p className="text-slate-500 py-6 text-center">No alerts logged in the database.</p>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{alt.student_name} ({alt.student_roll})</p>
                      <p className="text-[10px] text-slate-400 font-mono">{alt.timestamp}</p>
                    </div>
                    <p className="text-slate-300 text-[11px]">{alt.notes}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                      <span className="text-slate-400">Classroom: {alt.classroom_name} • Conf: {alt.confidence}%</span>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          alt.is_reviewed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {alt.is_reviewed ? 'Reviewed' : 'Action Required'}
                        </span>
                        {!alt.is_reviewed && (
                          <button
                            onClick={() => markAlertReviewed(alt.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px]"
                          >
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
