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
  XCircle,
  Monitor,
  Tv,
  Maximize2,
  Minimize2
} from 'lucide-react';
import api, { getWsUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const StudentLiveClass = () => {
  const { user } = useAuth();
  const [monitoringActive, setMonitoringActive] = useState(false);
  const monitoringActiveRef = useRef(false);
  const [cameraConnected, setCameraConnected] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [classroomName, setClassroomName] = useState('Smart Classroom 401');
  const [subjectTitle, setSubjectTitle] = useState('CS501 - Computer Networks (Dr. Rajesh Sharma)');

  // Enrolled Courses & Course Selection State
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const selectedCourseRef = useRef(null);

  useEffect(() => {
    selectedCourseRef.current = selectedCourse;
  }, [selectedCourse]);

  // Active session status from Faculty
  const [classSessionActive, setClassSessionActive] = useState(false);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Faculty Live Screen Sharing Stream
  const [facultyScreenFrame, setFacultyScreenFrame] = useState(null);
  const [isFacultyScreenSharing, setIsFacultyScreenSharing] = useState(false);
  const [isStageFullScreen, setIsStageFullScreen] = useState(false);
  const stageContainerRef = useRef(null);

  // AI Live Indicators (quiet & non-intrusive)
  const [headOrientation, setHeadOrientation] = useState('Facing Forward');
  const [phoneDetected, setPhoneDetected] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState('No Smartphone Detected.');
  const [detectedObject, setDetectedObject] = useState('None');
  const [confidencePct, setConfidencePct] = useState(0.0);
  const [attentionScore, setAttentionScore] = useState(100);
  const [distractionCount, setDistractionCount] = useState(0);

  // AI Face Matching & Daily Attendance Consistency
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
  const wsRef = useRef(null);

  // Intentionally silent - removed loud buzzer alarms & speech synthesis per user request
  const playToneAlert = () => {};
  const speakGuidance = () => {};

  const toggleStageFullScreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(err => console.warn(err));
      setIsStageFullScreen(true);
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
      setIsStageFullScreen(false);
    }
  };

  const fetchStudentCourses = async () => {
    try {
      const res = await api.get('/api/monitoring/student-enrolled-courses');
      if (res.data && res.data.success) {
        const list = res.data.courses || [];
        setEnrolledCourses(list);

        setSelectedCourse((prev) => {
          if (prev) {
            const fresh = list.find((c) => c.subject_id === prev.subject_id);
            if (fresh) {
              setClassSessionActive(Boolean(fresh.is_live));
              if (fresh.is_live && fresh.session_id) {
                setSessionDetails({
                  session_id: fresh.session_id,
                  title: fresh.session_title,
                  classroom_name: fresh.classroom_name,
                });
              }
              return fresh;
            }
          }
          // Default to live course or first course
          const liveCourse = list.find((c) => c.is_live);
          const initial = liveCourse || list[0] || null;
          if (initial) {
            setSubjectTitle(initial.session_title || `${initial.code} - ${initial.name} (${initial.faculty_name})`);
            setClassroomName(initial.classroom_name || 'Smart Classroom 401');
            setClassSessionActive(Boolean(initial.is_live));
            if (initial.session_id) {
              setSessionDetails({
                session_id: initial.session_id,
                title: initial.session_title,
                classroom_name: initial.classroom_name,
              });
            }
          }
          return initial;
        });
      }
    } catch (err) {
      console.warn('Could not fetch student courses:', err);
    } finally {
      setCoursesLoading(false);
      setCheckingSession(false);
    }
  };

  const handleSelectCourse = (course) => {
    if (!course) return;
    setSelectedCourse(course);
    setSubjectTitle(course.session_title || `${course.code} - ${course.name} (${course.faculty_name})`);
    setClassroomName(course.classroom_name || 'Smart Classroom 401');
    setClassSessionActive(Boolean(course.is_live));

    if (course.session_id) {
      setSessionDetails({
        session_id: course.session_id,
        title: course.session_title,
        classroom_name: course.classroom_name,
      });
    }

    const targetRoom = course.session_id || course.code || 'default';
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_SESSION',
          session_id: targetRoom,
          role: 'STUDENT',
        })
      );
    }

    checkActiveScreenShare(targetRoom);
  };

  const checkActiveScreenShare = async (forceSid = null) => {
    const curCourse = selectedCourseRef.current;
    const targetSid = forceSid || curCourse?.session_id || curCourse?.code || 'default';
    try {
      const screenRes = await api.get(`/api/monitoring/screen-share/${targetSid}`);
      if (screenRes.data && screenRes.data.is_sharing && screenRes.data.frame) {
        setIsFacultyScreenSharing(true);
        setFacultyScreenFrame(screenRes.data.frame);
        return;
      }
      // Check fallback latest frame
      const latRes = await api.get('/api/monitoring/screen-share/latest');
      if (latRes.data && latRes.data.is_sharing && latRes.data.frame) {
        setIsFacultyScreenSharing(true);
        setFacultyScreenFrame(latRes.data.frame);
      } else if (!screenRes.data?.is_sharing) {
        setIsFacultyScreenSharing(false);
      }
    } catch (e) {
      // Silent fallback
    }
  };

  useEffect(() => {
    fetchStudentCourses();
    checkActiveScreenShare();

    const pollInterval = setInterval(() => {
      fetchStudentCourses();
      checkActiveScreenShare();
    }, 2500);

    let ws = null;
    try {
      const wsUrl = getWsUrl('/api/monitoring/ws');
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        const sid = selectedCourseRef.current?.session_id || selectedCourseRef.current?.code || 'default';
        ws.send(
          JSON.stringify({
            type: 'JOIN_SESSION',
            session_id: sid,
            role: 'STUDENT',
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'CLASS_SESSION_STARTED') {
            fetchStudentCourses();
          } else if (msg.type === 'CLASS_SESSION_ENDED') {
            fetchStudentCourses();
            setIsFacultyScreenSharing(false);
            setFacultyScreenFrame(null);
            stopSession();
          } else if (msg.type === 'SCREEN_SHARE_STARTED') {
            setIsFacultyScreenSharing(true);
          } else if (msg.type === 'SCREEN_SHARE_FRAME' && msg.frame) {
            setIsFacultyScreenSharing(true);
            setFacultyScreenFrame(msg.frame);
          } else if (msg.type === 'SCREEN_SHARE_STOPPED') {
            setIsFacultyScreenSharing(false);
            setFacultyScreenFrame(null);
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
    if (!classSessionActive && !isFacultyScreenSharing) {
      alert("Faculty has not started the class meeting yet. Please wait for the instructor to start.");
      return;
    }

    const ok = await startCamera();
    if (!ok) return;

    setMonitoringActive(true);
    monitoringActiveRef.current = true;

    const sid = selectedCourseRef.current?.session_id || selectedCourseRef.current?.code || 'default';
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN_SESSION',
          session_id: sid,
          role: 'STUDENT',
        })
      );
    }

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
        setAttentionScore((prev) => Math.max(20, prev - 1));
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

        ctx.strokeStyle = isGood ? '#10b981' : '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        const text = isGood ? 'ATTENTIVE' : 'STUDENT (ENGAGED)';
        ctx.font = 'bold 11px sans-serif';
        const tw = ctx.measureText(text).width;
        ctx.fillStyle = isGood ? '#10b981' : '#38bdf8';
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
          {classSessionActive || isFacultyScreenSharing ? (
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

      {/* =========================================================================
          REGISTERED COURSES & LIVE MEETINGS SELECTOR
          Enables the student to view all enrolled courses and seamlessly join any meeting!
          ========================================================================= */}
      <div className="p-4 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              My Enrolled Courses & Live Class Meetings ({enrolledCourses.length})
            </h2>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            {enrolledCourses.some((c) => c.is_live) ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {enrolledCourses.filter((c) => c.is_live).length} Class Meeting(s) Live Now
              </span>
            ) : (
              <span className="text-slate-400">
                ⚪ No other meetings active at this moment
              </span>
            )}
          </div>
        </div>

        {/* Horizontal course selector cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
          {enrolledCourses.map((c) => {
            const isSelected = selectedCourse?.subject_id === c.subject_id;
            return (
              <button
                key={c.subject_id}
                onClick={() => handleSelectCourse(c)}
                className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-950/70 to-slate-900 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-500'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${
                      isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {c.code}
                    </span>
                    {c.is_live ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">⚪ Idle</span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs text-white line-clamp-1 group-hover:text-indigo-300 transition">
                    {c.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    👨‍🏫 {c.faculty_name}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 truncate">{c.classroom_name || 'Classroom 401'}</span>
                  {isSelected && (
                    <span className="text-indigo-400 font-bold flex items-center gap-0.5">
                      Selected ✓
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Session Details Bar */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${classSessionActive || isFacultyScreenSharing
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{subjectTitle}</p>
            <p className="text-slate-400 text-[11px]">
              {classroomName} • {isFacultyScreenSharing ? '🔴 Live Slides Broadcast in Progress' : classSessionActive ? '🔴 Live Streaming In Session' : '⚪ Class Meeting Not Started'}
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
              : classSessionActive || isFacultyScreenSharing
                ? 'text-amber-400'
                : 'text-slate-500'
              }`}>
              <span className={`w-2 h-2 rounded-full ${monitoringActive
                ? 'bg-emerald-400 animate-ping'
                : classSessionActive || isFacultyScreenSharing
                  ? 'bg-amber-400'
                  : 'bg-slate-600'
                }`}></span>
              {monitoringActive ? 'LIVE ATTENDING' : classSessionActive || isFacultyScreenSharing ? 'READY TO JOIN' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* IF FACULTY HAS NOT STARTED MEETING AND NOT SHARING SCREEN: RENDER POLISHED WAITING ROOM */}
      {!classSessionActive && !isFacultyScreenSharing ? (
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
              Class Meeting Not Started Yet for {selectedCourse?.code || 'Course'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Your instructor has not started or created the live class meeting for <strong className="text-white">{subjectTitle}</strong> in <strong className="text-white">{classroomName}</strong>.
            </p>
            <p className="text-[11px] text-slate-500 pt-1">
              Please stay on this page or choose another enrolled course above. As soon as the faculty begins the class meeting or shares their screen, you will automatically be able to attend and watch the slides.
            </p>
          </div>

          {enrolledCourses.some((c) => c.is_live && c.subject_id !== selectedCourse?.subject_id) && (
            <div className="p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/50 text-xs text-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-left shadow-xl">
              <div>
                <p className="font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Another enrolled class meeting is Live Now!
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {enrolledCourses.find((c) => c.is_live && c.subject_id !== selectedCourse?.subject_id)?.code} -{' '}
                  {enrolledCourses.find((c) => c.is_live && c.subject_id !== selectedCourse?.subject_id)?.name} is currently in session.
                </p>
              </div>
              <button
                onClick={() =>
                  handleSelectCourse(enrolledCourses.find((c) => c.is_live && c.subject_id !== selectedCourse?.subject_id))
                }
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs whitespace-nowrap shadow-lg shadow-emerald-600/25 transition"
              >
                Switch to Live Class →
              </button>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => {
                fetchStudentCourses();
                checkActiveScreenShare();
              }}
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

          {/* Main Lecture Presentation & Attendance Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Faculty Screen Share / Lecture Stage */}
            <div className="lg:col-span-2 space-y-4">
              <div
                ref={stageContainerRef}
                className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4 relative"
              >
                {/* Header above Lecture Stage */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                      {isFacultyScreenSharing ? <Monitor className="w-4 h-4 text-emerald-400" /> : <Tv className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-2">
                        {isFacultyScreenSharing ? 'Faculty Live Screen Presentation' : 'Classroom Lecture Stage'}
                        {isFacultyScreenSharing && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse font-mono">
                            LIVE SLIDES
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {isFacultyScreenSharing
                          ? 'Instructor is sharing lecture slides and teaching online'
                          : `${subjectTitle} • Live Class Stream`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleStageFullScreen}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs flex items-center gap-1.5"
                      title="Toggle Fullscreen"
                    >
                      {isStageFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span className="hidden sm:inline">{isStageFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                    </button>
                  </div>
                </div>

                {/* Primary Screen Stage Area */}
                <div className="relative aspect-video w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  {/* Case 1: Faculty IS Screen Sharing -> Show Presentation in Full Resolution */}
                  {isFacultyScreenSharing && facultyScreenFrame ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <img
                        src={facultyScreenFrame}
                        alt="Instructor Presentation"
                        className="w-full h-full object-contain select-none"
                      />

                      {/* Top Presenter Overlay */}
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2 z-10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span>FACULTY SCREEN BROADCAST</span>
                      </div>

                      {/* Student Camera PiP in Bottom Right Corner */}
                      {monitoringActive && (
                        <div className="absolute bottom-4 right-4 w-44 h-28 rounded-xl overflow-hidden border-2 border-indigo-500/80 bg-slate-950 shadow-2xl z-20 group">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                          />
                          <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                          <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                            {attendanceStatus === 'Present' ? '✓ ATTENDANCE PRESENT' : 'ATTENDING'}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Case 2: Faculty Not Screen Sharing Yet -> Show Student Webcam or Standby */
                    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
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
                        <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center z-10">
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
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold flex items-center gap-2 z-10">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>LIVE CLASS ATTENDING (WAITING FOR LECTURE SLIDES)</span>
                        </div>
                      )}
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
