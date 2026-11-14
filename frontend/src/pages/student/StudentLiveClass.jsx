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
  Compass,
  BookOpen,
  User,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Radio,
  UserCheck,
  UserX,
  XCircle
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const StudentLiveClass = () => {
  const { user } = useAuth();
  const [monitoringActive, setMonitoringActive] = useState(false);
  const monitoringActiveRef = useRef(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [classroomName, setClassroomName] = useState('Smart Classroom 401');
  const [subjectTitle, setSubjectTitle] = useState('CS501 - Computer Networks (Dr. Rajesh Sharma)');

  // Active session status from Faculty
  const [classSessionActive, setClassSessionActive] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // AI Live Indicators
  const [headOrientation, setHeadOrientation] = useState('Facing Forward');
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState('No Smartphone Detected.');
  const [detectedObject, setDetectedObject] = useState('None');
  const [confidencePct, setConfidencePct] = useState(0.0);
  const [attentionScore, setAttentionScore] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);

  // AI Face Matching & Daily Attendance Consistency (Day 1 vs Day 2 Face Matching)
  const [faceMatched, setFaceMatched] = useState(null); // true = Present, false = Absent
  const [faceSimilarity, setFaceSimilarity] = useState(0.0);
  const [attendanceStatus, setAttendanceStatus] = useState('Pending');
  const [attendanceRemarks, setAttendanceRemarks] = useState('');
  const [simulateProxyMismatch, setSimulateProxyMismatch] = useState(false);
  const simulateProxyRef = useRef(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const isProcessingRef = useRef(false);
  const audioCtxRef = useRef(null);
  const lastSpokenRef = useRef(0);

  // Play audio warning signal
  const playToneAlert = (type) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'PHONE') {
        // High-pitched warning alarm for smartphone
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.15);
        osc.frequency.setValueAtTime(880, now + 0.30);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'DISTRACTION') {
        // Gentle reminder chime for looking away from screen
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'PROXY') {
        // Harsh discord alarm for proxy face mismatch
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(160, now + 0.2);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  };

  // Voice intimation: "Don't see surroundings, watch to the screen!"
  const speakGuidance = (text) => {
    try {
      const now = Date.now();
      if (now - lastSpokenRef.current > 7000) {
        lastSpokenRef.current = now;
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const checkActiveSession = async () => {
    try {
      const res = await api.get('/api/monitoring/active-session');
      const data = res.data;
      setClassSessionActive(data.is_active);
      setSessionDetails(data);
      if (data.title) setSubjectTitle(data.title);
      if (data.classroom_name) setClassroomName(data.classroom_name);

      if (!data.is_active && monitoringActiveRef.current) {
        // Faculty ended session while student was attending
        stopSession();
      }
    } catch (err) {
      console.warn('Could not check active session:', err);
    } finally {
      setCheckingSession(false);
    }
  };

  useEffect(() => {
    checkActiveSession();
    const pollInterval = setInterval(checkActiveSession, 3500);

    // WebSocket real-time session listener
    let ws = null;
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      ws = new WebSocket(`${wsProtocol}//${host}:8000/api/monitoring/ws`);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'CLASS_SESSION_STARTED' && msg.session) {
            setClassSessionActive(true);
            setSessionDetails(msg.session);
            if (msg.session.title) setSubjectTitle(msg.session.title);
            if (msg.session.classroom_name) setClassroomName(msg.session.classroom_name);
          } else if (msg.type === 'CLASS_SESSION_ENDED') {
            setClassSessionActive(false);
            stopSession();
          }
        } catch (e) {
          console.warn(e);
        }
      };
    } catch (e) {
      console.warn('WS error:', e);
    }

    return () => {
      stopCamera();
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, []);

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
      return true;
    } catch (err) {
      setCameraError('Camera access denied or device not found: ' + err.message);
      setCameraConnected(false);
      return false;
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
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    clearBoundingBoxes();
  };

  const startSession = async () => {
    if (!classSessionActive) {
      alert("Faculty has not started the class meeting yet. Please wait for the instructor to start.");
      return;
    }

    const ok = await startCamera();
    if (!ok) return;

    setMonitoringActive(true);
    monitoringActiveRef.current = true;

    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = setInterval(() => {
      processFrameTick();
    }, 1500);
  };

  const stopSession = () => {
    setMonitoringActive(false);
    monitoringActiveRef.current = false;
    stopCamera();
    setPhoneDetected(false);
    setPhoneStatus("No Smartphone Detected.");
    setHeadOrientation("Face Not Visible");
  };

  const clearBoundingBoxes = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const processFrameTick = async () => {
    if (!videoRef.current || !monitoringActiveRef.current || isProcessingRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      isProcessingRef.current = true;
      const offscreen = document.createElement('canvas');
      offscreen.width = video.videoWidth || 640;
      offscreen.height = video.videoHeight || 480;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(video, 0, 0, offscreen.width, offscreen.height);

      const frameBase64 = offscreen.toDataURL('image/jpeg', 0.92);

      const res = await api.post('/api/monitoring/student-frame', {
        frame_base64: frameBase64,
        classroom_name: classroomName,
        simulate_proxy_mismatch: simulateProxyRef.current
      });

      const analysis = res.data;

      if (analysis.class_active === false) {
        // Faculty ended class or hasn't started
        setClassSessionActive(false);
        stopSession();
        return;
      }

      // AI Face Verification & Daily Attendance Update (Day 1 vs Day 2 Face Matching)
      if (analysis.face_verification) {
        const fv = analysis.face_verification;
        setFaceMatched(fv.face_matched);
        setFaceSimilarity(fv.similarity_pct || 0.0);
        setAttendanceStatus(fv.attendance_status || 'Pending');
        setAttendanceRemarks(fv.remarks || '');

        if (fv.face_matched === false) {
          playToneAlert('PROXY');
          speakGuidance("Face verification failed. Your face does not match, attendance marked absent!");
        }
      }

      // Smartphone Detection Update
      if (analysis.phone_detected) {
        setPhoneDetected(true);
        setPhoneStatus("🚨 Smartphone Detected in View!");
        setDetectedObject(analysis.detected_object || "Mobile Phone");
        setConfidencePct(analysis.primary_confidence || 85.0);
        setAttentionScore((prev) => Math.max(10, prev - 15));
        playToneAlert('PHONE');
      } else {
        setPhoneDetected(false);
        setPhoneStatus("No Smartphone Detected.");
        setDetectedObject("None");
        setConfidencePct(0.0);
      }

      // Head Orientation & Attentiveness Update
      const orient = analysis.primary_head_orientation || 'Facing Forward';
      setHeadOrientation(orient);
      const isAttentive = analysis.is_attentive !== undefined ? analysis.is_attentive : (orient === 'Facing Forward');

      const isDistracted = !isAttentive || ['Facing Left', 'Facing Right', 'Looking Down', 'Looking Up', 'Facing Away', 'Head Tilted'].includes(orient);

      if (isDistracted) {
        setDistractionCount((prev) => prev + 1);
        setAttentionScore((prev) => Math.max(20, prev - 2));
        if (!analysis.phone_detected) {
          playToneAlert('DISTRACTION');
          speakGuidance("Don't see surroundings, watch to the screen!");
        }
      } else if (orient === 'Facing Forward') {
        setAttentionScore((prev) => Math.min(100, prev + 1));
      }

      drawBoundingBoxes(analysis);
    } catch (err) {
      console.warn('Student frame tick error:', err);
    } finally {
      isProcessingRef.current = false;
    }
  };

  const drawBoundingBoxes = (analysis) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / (video.videoWidth || 640);
    const scaleY = canvas.height / (video.videoHeight || 480);

    // Phones
    if (analysis.phone_boxes && analysis.phone_boxes.length > 0) {
      analysis.phone_boxes.forEach((box) => {
        const [x1, y1, x2, y2, conf] = box;
        // Since video is mirrored with scale-x-[-1], flip horizontal coordinate for canvas so text is not reversed
        const bw = (x2 - x1) * scaleX;
        const bx = canvas.width - (x2 * scaleX);
        const by = y1 * scaleY;
        const bh = (y2 - y1) * scaleY;

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillRect(bx, by, bw, bh);

        const text = `🚨 SMARTPHONE: ${Math.round(conf * 100)}%`;
        ctx.font = 'bold 12px sans-serif';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx, Math.max(0, by - 24), tw + 12, 24);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, bx + 6, Math.max(17, by - 7));
      });
    }

    // Faces / Head Pose
    if (analysis.face_boxes && analysis.face_boxes.length > 0) {
      analysis.face_boxes.forEach((fb) => {
        const [x1, y1, x2, y2, orientation, isGood] = fb;
        // Flip horizontal coordinate to match mirrored video without reversing text
        const bw = (x2 - x1) * scaleX;
        const bx = canvas.width - (x2 * scaleX);
        const by = y1 * scaleY;
        const bh = (y2 - y1) * scaleY;

        ctx.strokeStyle = isGood ? '#10b981' : '#f59e0b';
        ctx.lineWidth = isGood ? 2 : 3;
        ctx.strokeRect(bx, by, bw, bh);

        const text = isGood ? 'WATCHING SCREEN' : "DON'T SEE SURROUNDINGS - WATCH SCREEN";
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = isGood ? '#10b981' : '#f59e0b';
        ctx.fillRect(bx, Math.max(0, by - 22), tw + 12, 22);
        ctx.fillStyle = '#080c14';
        ctx.fillText(text, bx + 6, Math.max(15, by - 6));
      });
    }
  };

  const isLookingAway = ['Facing Left', 'Facing Right', 'Looking Down', 'Looking Up', 'Facing Away', 'Head Tilted'].includes(headOrientation);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Video className="w-6 h-6 text-violet-400" />
            Live Class Session & AI Attention Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Student live attendance interface with automated visual engagement and smartphone adherence verification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {classSessionActive ? (
            !monitoringActive ? (
              <button
                onClick={startSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 transition"
              >
                <Play className="w-4 h-4" />
                Join Live Class Session
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-red-500 transition"
              >
                <Square className="w-4 h-4" />
                Leave Session
              </button>
            )
          ) : (
            <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Waiting for Faculty...</span>
            </div>
          )}
        </div>
      </div>

      {/* Session Details Bar */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${classSessionActive
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{subjectTitle}</p>
            <p className="text-slate-400 text-[11px]">
              {classroomName} • {classSessionActive ? '🔴 Live Streaming In Session' : '⚪ Class Meeting Not Started'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Student:</span>
            <span className="font-semibold text-white">{user?.name} ({user?.roll_number || '21CS101'})</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Attendance:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${
              faceMatched === true
                ? 'text-emerald-400'
                : faceMatched === false
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                faceMatched === true ? 'bg-emerald-400' : faceMatched === false ? 'bg-rose-500' : 'bg-amber-400 animate-pulse'
              }`}></span>
              {faceMatched === true ? '✓ PRESENT' : faceMatched === false ? '❌ ABSENT' : 'VERIFYING'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-400">Session:</span>
            <span className={`font-semibold flex items-center gap-1.5 ${monitoringActive
              ? 'text-emerald-400'
              : classSessionActive
                ? 'text-amber-400'
                : 'text-slate-500'
              }`}>
              <span className={`w-2 h-2 rounded-full ${monitoringActive
                ? 'bg-emerald-400 animate-ping'
                : classSessionActive
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
                }`}></span>
              {monitoringActive ? 'LIVE ATTENDING' : classSessionActive ? 'READY TO JOIN' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* IF FACULTY HAS NOT STARTED MEETING: RENDER POLISHED WAITING ROOM */}
      {!classSessionActive ? (
        <div className="p-12 text-center rounded-3xl bg-[#0f172a] border border-slate-800 shadow-2xl space-y-5 max-w-2xl mx-auto my-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Waiting for Faculty to Start</span>
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Class Meeting Not Started Yet
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your instructor has not started or created the live class meeting for <strong className="text-white">{subjectTitle}</strong> in <strong className="text-white">{classroomName}</strong>.
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Please stay on this page. As soon as the faculty begins the class meeting, you will automatically be able to join and start attendance monitoring.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={checkActiveSession}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 mx-auto transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingSession ? 'animate-spin' : ''}`} />
              <span>Check Class Status</span>
            </button>
          </div>
        </div>
      ) : (
        /* IF FACULTY HAS STARTED MEETING: NORMAL ACTIVE ATTENDANCE INTERFACE */
        <>
          {/* Real-time Dynamic Student Alert Banners */}
          {monitoringActive && faceMatched === true && (
            <div className="p-4 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500 text-emerald-200 text-xs flex items-center gap-3.5 shadow-xl animate-fadeIn">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Attendance Marked: Face verified successfully.
                </p>
                <p className="text-xs text-emerald-200 mt-0.5 font-medium leading-relaxed">
                  Face match confirmed ({faceSimilarity}% similarity). Your attendance has been officially verified and recorded as <strong className="text-emerald-300 underline font-bold">PRESENT</strong>.
                </p>
              </div>
            </div>
          )}

          {monitoringActive && faceMatched === false && (
            <div className="p-4 rounded-2xl bg-rose-600/30 border-2 border-rose-500 text-rose-200 text-xs flex items-center gap-3.5 shadow-2xl animate-pulse">
              <XCircle className="w-8 h-8 text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Proxy Detected: The scanned face does not match the registered student. Attendance denied.
                </p>
                <p className="text-xs text-rose-100 mt-0.5 font-medium leading-relaxed">
                  The scanned face does not match your registered profile photo (Similarity: <strong className="text-white">{faceSimilarity}%</strong> &lt; 58% threshold). Proxy attempt rejected and attendance officially recorded as <strong className="text-rose-300 underline font-bold">ABSENT</strong>.
                </p>
              </div>
            </div>
          )}

          {monitoringActive && phoneDetected && (
            <div className="p-4 rounded-2xl bg-rose-600/25 border-2 border-rose-500 text-rose-200 text-xs flex items-center gap-3.5 shadow-2xl animate-pulse">
              <Smartphone className="w-8 h-8 text-rose-400 shrink-0" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-white uppercase tracking-wider">🚨 SMARTPHONE USAGE DETECTED!</p>
                <p className="text-xs text-rose-200 mt-0.5">
                  Mobile phone usage is strictly prohibited during live online classes. An automatic warning signal and official notification have been dispatched to your faculty instructor.
                </p>
              </div>
            </div>
          )}

          {monitoringActive && !phoneDetected && isLookingAway && (
            <div className="p-4 rounded-2xl bg-amber-500/25 border-2 border-amber-500 text-amber-200 text-xs flex items-center gap-3.5 shadow-2xl animate-pulse">
              <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="font-extrabold text-sm text-white uppercase tracking-wider">⚠️ DON'T SEE SURROUNDINGS, WATCH TO THE SCREEN!</p>
                <p className="text-xs text-amber-100 font-medium mt-0.5">
                  You are seeing surroundings ({headOrientation}) instead of watching the lecture. Please turn your attention directly to the screen!
                </p>
              </div>
            </div>
          )}

          {/* Main Attendance Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Camera Feed & Facial Overlays */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
                <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transform ${monitoringActive ? 'scale-x-[-1]' : 'hidden'}`}
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 pointer-events-none ${monitoringActive ? '' : 'hidden'}`}
                  />

                  {/* Camera Paused / Not Joined */}
                  {!monitoringActive && (
                    <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                        <Video className="w-7 h-7" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Live Class Meeting is Ready</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                          Click below to start your webcam and broadcast your live attendance.
                        </p>
                      </div>
                      <button
                        onClick={startSession}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Join Live Class</span>
                      </button>
                    </div>
                  )}

                  {/* Connected Badge */}
                  {monitoringActive && (
                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>LIVE CLASS ATTENDING</span>
                    </div>
                  )}
                </div>

                {cameraError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}

                <p className="text-[11px] text-slate-500 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Academic Integrity: Real-time visual orientation and mobile device detection are securely streamed to your professor's monitoring console.</span>
                </p>
              </div>
            </div>

            {/* Right Column: Live Attention Sidebar */}
            <div className="space-y-4">
              {/* AI Face Matching & Daily Attendance Card (Day 1 vs Day 2 Verification) */}
              <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Face Match & Attendance
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    faceMatched === true
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : faceMatched === false
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {faceMatched === true ? '✅ Present' : faceMatched === false ? '❌ Marked Absent' : 'Verifying...'}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                  faceMatched === true
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                    : faceMatched === false
                    ? 'bg-rose-950/30 border-rose-500 text-rose-200'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">Face Consistency:</span>
                    <strong className="font-mono text-white">
                      {faceMatched === true
                        ? `✓ Matches Day 1 Face (${faceSimilarity}%)`
                        : faceMatched === false
                        ? `❌ Unmatched Face (${faceSimilarity}%)`
                        : 'Detecting face...'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Daily Attendance:</span>
                    <span className={`font-extrabold ${
                      faceMatched === true ? 'text-emerald-400' : faceMatched === false ? 'text-rose-400' : 'text-slate-400'
                    }`}>
                      {attendanceStatus === 'Present' ? '✅ Status: PRESENT' : attendanceStatus === 'Absent' ? '❌ Status: ABSENT (Proxy Blocked)' : 'Pending Verification'}
                    </span>
                  </div>

                  {attendanceRemarks && (
                    <p className="text-[10px] text-slate-400 pt-1 italic leading-tight">
                      {attendanceRemarks}
                    </p>
                  )}
                </div>

                {/* Interactive Test / Simulation Toggle */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !simulateProxyMismatch;
                      setSimulateProxyMismatch(nextVal);
                      simulateProxyRef.current = nextVal;
                    }}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition ${
                      simulateProxyMismatch
                        ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{simulateProxyMismatch ? '🧪 Simulating Day 2 Mismatch (ACTIVE)' : '🧪 Test: Simulate Day 2 Proxy Face Mismatch'}</span>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-1 text-center">
                    Toggle to test next-day mismatched face proxy block & instant Absent marking.
                  </p>
                </div>
              </div>

              {/* Head Orientation Card */}
              <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    Visual Orientation
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${headOrientation === 'Facing Forward'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                    {headOrientation === 'Facing Forward' ? 'Attentive' : 'Distracted'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[
                    { label: 'Facing Forward', desc: 'Watching live lecture stream' },
                    { label: 'Facing Left', desc: 'Seeing surroundings (Distracted)' },
                    { label: 'Facing Right', desc: 'Seeing surroundings (Distracted)' },
                    { label: 'Facing Away', desc: 'Not watching class session' },
                    { label: 'Face Not Visible', desc: 'Left seat / camera blocked' },
                  ].map((item) => {
                    const isActive = headOrientation === item.label;
                    return (
                      <div
                        key={item.label}
                        className={`p-2.5 rounded-xl border text-xs transition ${isActive
                          ? item.label === 'Facing Forward'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.label}</span>
                          {isActive && <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>}
                        </div>
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Smartphone Status */}
              <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-rose-400" />
                    Smartphone Status
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">YOLOv8s Detector</span>
                </div>

                <div className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${phoneDetected
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300'
                  }`}>
                  <p className="font-bold text-sm">{phoneStatus}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-400 block">Detected Object:</span>
                      <strong className="text-white">{detectedObject}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Confidence:</span>
                      <strong className="font-mono text-white">{confidencePct > 0 ? `${confidencePct}%` : '--'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attention Score Gauge */}
              <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Lecture Attention Score
                  </span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{attentionScore}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-500 ${attentionScore >= 80 ? 'bg-emerald-500' : attentionScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                    style={{ width: `${attentionScore}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                  <span>Distractions Logged:</span>
                  <span className="font-mono font-bold text-slate-300">{distractionCount} instances</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
