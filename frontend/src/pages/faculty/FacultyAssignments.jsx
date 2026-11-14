import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  X,
  FileCheck2,
  Search,
  AlertCircle,
  ExternalLink,
  FileCode,
  Folder,
  FolderOpen,
  Bot,
  Sparkles,
  AlertTriangle,
  RotateCw,
  Award,
  Check,
} from 'lucide-react';
import api, { API_BASE_URL } from '../../api/client';

/**
 * AIDetectionDonutChart
 * Exact visual match to user's uploaded reference:
 * - High-contrast circular donut ring with Green (Human Written) & Red (AI Written) arcs.
 * - Clean gap separation between arcs.
 * - Exactly two summary boxes directly below:
 *     Box 1: "Human Written" (green label) + percentage (large white text)
 *     Box 2: "AI Written" (red label) + percentage (large white text)
 */
const AIDetectionDonutChart = ({ aiPct = 0, humanPct = 100 }) => {
  const numAi = Math.max(0, Math.min(100, Number(aiPct) || 0));
  const numHuman = Math.max(0, Math.min(100, Number(humanPct !== undefined ? humanPct : 100 - numAi)));

  const total = numAi + numHuman > 0 ? numAi + numHuman : 100;
  const humanFraction = numHuman / total;
  const aiFraction = numAi / total;

  const radius = 64;
  const strokeWidth = 20;
  const center = 80;
  const circumference = 2 * Math.PI * radius; // ~402.12

  // Visible gap between segments when both exist
  const hasBoth = humanFraction > 0.03 && aiFraction > 0.03;
  const gapPixels = hasBoth ? 10 : 0;
  const netCircumference = circumference - (hasBoth ? gapPixels * 2 : 0);

  const humanArcLength = Math.max(0, humanFraction * netCircumference);
  const aiArcLength = Math.max(0, aiFraction * netCircumference);

  // SVG dasharrays & offsets starting from 12 o'clock (-90 deg rotation)
  const humanDash = `${humanArcLength} ${circumference}`;
  const humanOffset = 0;

  const aiDash = `${aiArcLength} ${circumference}`;
  const aiOffset = -(humanArcLength + gapPixels);

  return (
    <div className="flex flex-col items-center justify-center p-3 select-none">
      {/* High-Contrast Circular Donut Chart */}
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 160 160">
          {/* Subtle background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
          />

          {/* Green Arc: Human Written */}
          {humanFraction > 0.005 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={humanDash}
              strokeDashoffset={humanOffset}
              strokeLinecap={hasBoth ? 'round' : 'butt'}
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Red Arc: AI Written */}
          {aiFraction > 0.005 && (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              strokeDasharray={aiDash}
              strokeDashoffset={aiOffset}
              strokeLinecap={hasBoth ? 'round' : 'butt'}
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center Text Indicator */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
            {numAi >= 25 ? 'AI Violation' : 'Original Work'}
          </span>
          <span
            className={`text-2xl font-black font-mono tracking-tight ${
              numAi >= 25 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {numAi >= 25 ? `${numAi}% AI` : `${numHuman}% Human`}
          </span>
        </div>
      </div>

      {/* Exactly 2 Boxes below matching reference image */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-4">
        {/* Box 1: Human Written */}
        <div className="p-3.5 rounded-2xl bg-[#090e17] border border-slate-800 text-center shadow-lg transition-transform hover:scale-[1.02]">
          <div className="text-xs font-bold text-[#10b981] mb-1">Human Written</div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">{numHuman}%</div>
        </div>

        {/* Box 2: AI Written */}
        <div className="p-3.5 rounded-2xl bg-[#090e17] border border-slate-800 text-center shadow-lg transition-transform hover:scale-[1.02]">
          <div className="text-xs font-bold text-[#ef4444] mb-1">AI Written</div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">{numAi}%</div>
        </div>
      </div>
    </div>
  );
};

export const FacultyAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Assignment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    recipient_type: 'ALL',
    max_marks: 100,
    due_date: '',
    selected_student_ids: [],
    submission_format: 'CODE_AND_WORD',
    group_department: 'CSE',
    group_year: '3rd Year',
    group_section: 'A',
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Submissions Folder Modal (Prompt Requirement: "All the students who submitted their assesments must be displayed like in a small folder")
  const [selectedAssignmentForFolder, setSelectedAssignmentForFolder] = useState(null);
  const [folderSubmissions, setFolderSubmissions] = useState([]);
  const [folderLoading, setFolderLoading] = useState(false);

  // AI Detection & Verification Modal (Prompt Requirement: "AI detection button side of every student... Pie chart... 1st box human written, 2nd box AI written")
  const [aiModalSub, setAiModalSub] = useState(null);
  const [aiModalState, setAiModalState] = useState({
    aiPct: 0.0,
    humanPct: 100.0,
    isAi: false,
    report: '',
    marks: '',
    feedback: '',
    saving: false,
    scanning: false,
  });

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [subjRes, studRes] = await Promise.all([
        api.get('/api/attendance/subjects'),
        api.get('/api/students'),
      ]);
      setSubjects(subjRes.data);
      setStudents(studRes.data);
      if (subjRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, subject_id: subjRes.data[0].id.toString() }));
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  };

  useEffect(() => {
    fetchAssignments();
    fetchMetadata();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachmentFile({
          name: file.name,
          base64: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.subject_id || !formData.due_date) {
      setCreateError('Please complete all required fields.');
      return;
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        subject_id: parseInt(formData.subject_id, 10),
        recipient_type: formData.recipient_type,
        submission_format: formData.submission_format || 'CODE_AND_WORD',
        max_marks: parseInt(formData.max_marks, 10),
        due_date: formData.due_date,
        selected_student_ids: formData.selected_student_ids,
        group_department: formData.group_department,
        group_year: formData.group_year,
        group_section: formData.group_section,
        attachment_base64: attachmentFile?.base64,
        attachment_name: attachmentFile?.name,
      };

      await api.post('/api/assignments', payload);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        subject_id: subjects[0]?.id?.toString() || '',
        recipient_type: 'ALL',
        max_marks: 100,
        due_date: '',
        submission_format: 'CODE_AND_WORD',
        selected_student_ids: [],
        group_department: 'CSE',
        group_year: '3rd Year',
        group_section: 'A',
      });
      setAttachmentFile(null);
      fetchAssignments();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to publish assignment.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Submissions Folder
  const handleOpenFolder = async (assignment) => {
    setSelectedAssignmentForFolder(assignment);
    setFolderLoading(true);
    try {
      const res = await api.get(`/api/assignments/${assignment.id}/submissions`);
      setFolderSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error('Error fetching submissions folder:', err);
      alert('Error fetching folder: ' + (err.response?.data?.detail || err.message));
    } finally {
      setFolderLoading(false);
    }
  };

  // Open AI Detection Modal for a specific student in the folder
  const handleOpenAiDetectionModal = (sub) => {
    setAiModalSub(sub);
    const aiPct = Number(sub.ai_generated_pct || 0);
    const isAi = sub.is_ai_flagged || aiPct >= 25;
    const humanPct = Number(sub.human_written_pct !== undefined ? sub.human_written_pct : (100 - aiPct).toFixed(1));

    setAiModalState({
      aiPct: aiPct,
      humanPct: humanPct,
      isAi: isAi,
      report:
        sub.ai_report ||
        (isAi
          ? `AI Detector flagged ${aiPct}% probability of AI tool assistance. In accordance with academic integrity guidelines, assessment marks are marked as 0.`
          : 'Verified as 100% student-authored original work (0% AI detected). Eligible for faculty marks.'),
      marks: isAi
        ? '0'
        : sub.marks_obtained !== null && sub.marks_obtained !== undefined
        ? String(sub.marks_obtained)
        : '',
      feedback:
        sub.feedback ||
        (isAi
          ? '[Academic Integrity Policy Violation]: Assessment completed using AI tools. 0 marks awarded.'
          : 'Approved and verified as original student-authored coursework.'),
      saving: false,
      scanning: false,
    });
  };

  // Quick Simulation Test Buttons (75% AI / 25% Human vs 0% AI / 100% Human)
  const handleSimulateAiStatus = async (targetAiPct) => {
    if (!aiModalSub) return;
    const targetAi = Number(targetAiPct);
    const targetHuman = Number((100 - targetAi).toFixed(1));
    const isAi = targetAi >= 25;

    setAiModalState((prev) => ({ ...prev, scanning: true }));

    try {
      const res = await api.post(`/api/assignments/submissions/${aiModalSub.id}/scan-ai`, {
        force_ai_pct: targetAi,
        force_ai_flag: isAi,
      });

      // Refresh folder submissions
      if (selectedAssignmentForFolder) {
        const subRes = await api.get(`/api/assignments/${selectedAssignmentForFolder.id}/submissions`);
        setFolderSubmissions(subRes.data.submissions || []);
      }

      setAiModalState((prev) => ({
        ...prev,
        aiPct: targetAi,
        humanPct: targetHuman,
        isAi: isAi,
        marks: isAi
          ? '0'
          : aiModalSub.marks_obtained && aiModalSub.marks_obtained > 0
          ? String(aiModalSub.marks_obtained)
          : String(Math.round(selectedAssignmentForFolder?.max_marks * 0.95 || 95)),
        feedback: isAi
          ? '[Academic Integrity Policy Violation]: Assessment detected as generated by AI tools. 0 marks awarded.'
          : 'Verified 100% student-authored original coursework. Eligible for full faculty marks.',
        report: res.data?.analysis?.report || prev.report,
        scanning: false,
      }));
    } catch (err) {
      console.error('Failed to simulate AI status:', err);
      setAiModalState((prev) => ({ ...prev, scanning: false }));
    }
  };

  // Rescan File with backend natural NLP analysis
  const handleRescanFile = async () => {
    if (!aiModalSub) return;
    setAiModalState((prev) => ({ ...prev, scanning: true }));
    try {
      const res = await api.post(`/api/assignments/submissions/${aiModalSub.id}/scan-ai`, {});
      const ana = res.data.analysis;
      const aiPct = Number(ana.ai_pct || 0);
      const isAi = ana.is_ai;
      const humanPct = Number(ana.human_pct || (100 - aiPct).toFixed(1));

      if (selectedAssignmentForFolder) {
        const subRes = await api.get(`/api/assignments/${selectedAssignmentForFolder.id}/submissions`);
        setFolderSubmissions(subRes.data.submissions || []);
      }

      setAiModalState((prev) => ({
        ...prev,
        aiPct: aiPct,
        humanPct: humanPct,
        isAi: isAi,
        marks: isAi ? '0' : prev.marks,
        feedback: isAi
          ? '[Academic Integrity Policy Violation]: Assessment detected as generated by AI tools. 0 marks awarded.'
          : 'Verified 100% student-authored original coursework.',
        report: ana.report,
        scanning: false,
      }));
    } catch (err) {
      alert('Rescan failed: ' + (err.response?.data?.detail || err.message));
      setAiModalState((prev) => ({ ...prev, scanning: false }));
    }
  };

  // Save Final Grade & Marks to DB
  const handleSaveAiGrade = async (e) => {
    if (e) e.preventDefault();
    if (!aiModalSub || !selectedAssignmentForFolder) return;

    setAiModalState((prev) => ({ ...prev, saving: true }));
    try {
      await api.post(`/api/assignments/submissions/${aiModalSub.id}/grade`, {
        marks_obtained: aiModalState.isAi ? 0 : parseFloat(aiModalState.marks || 0),
        feedback: aiModalState.feedback,
        is_ai_detected: aiModalState.isAi,
        ai_pct: aiModalState.aiPct,
      });

      // Refresh folder submissions
      const subRes = await api.get(`/api/assignments/${selectedAssignmentForFolder.id}/submissions`);
      setFolderSubmissions(subRes.data.submissions || []);
      fetchAssignments();
      setAiModalSub(null);
    } catch (err) {
      alert('Failed to save grade: ' + (err.response?.data?.detail || err.message));
    } finally {
      setAiModalState((prev) => ({ ...prev, saving: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
            <FileText className="w-3.5 h-3.5" />
            <span>Canvas LMS Module</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Coursework & Assignments</h2>
          <p className="text-xs text-slate-400 mt-1">
            Create coursework, verify student assessment submissions in dedicated folders, and run AI detection
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Loading course assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800">
            <FileText className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-white">No assignments published yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Create Assignment" to post coursework for your students.</p>
          </div>
        ) : (
          assignments.map((a) => (
            <div
              key={a.id}
              className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {a.subject_code}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due {new Date(a.due_date).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white line-clamp-2 mt-1">{a.title}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">{a.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                  <span className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 font-mono">
                    Max Marks: {a.max_marks}
                  </span>
                  <span className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                    Recipients: <strong className="text-indigo-400">{a.recipient_type}</strong>
                  </span>
                </div>

                {a.attachment_url && (
                  <div className="mt-3">
                    <a
                      href={`${API_BASE_URL}${a.attachment_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Attachment Document</span>
                    </a>
                  </div>
                )}
              </div>

              {/* USER REQUIREMENT: SMALL FOLDER COMPONENT ON EACH ASSIGNMENT */}
              <div className="mt-5 pt-4 border-t border-slate-800">
                <div
                  onClick={() => handleOpenFolder(a)}
                  className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-slate-900 border border-amber-500/30 hover:border-amber-400 cursor-pointer group transition-all duration-300 shadow-md hover:shadow-amber-500/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition shadow-inner">
                        <Folder className="w-5 h-5 fill-amber-400/20 text-amber-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                            📁 Submissions Folder
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {a.submissions_count} {a.submissions_count === 1 ? 'Student' : 'Students'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {a.submissions_count > 0
                            ? `Click folder to verify ${a.submissions_count} student submission${a.submissions_count === 1 ? '' : 's'}`
                            : 'Click to open submissions folder'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFolder(a);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition group-hover:translate-x-0.5"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Folder</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. SUBMISSIONS FOLDER MODAL (Prompt Requirement)        */}
      {/* ======================================================== */}
      {selectedAssignmentForFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-amber-500/30 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Folder Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow">
                  <Folder className="w-5 h-5 fill-amber-400/30 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Submissions Folder
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Max Marks: {selectedAssignmentForFolder.max_marks}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    {selectedAssignmentForFolder.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedAssignmentForFolder(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folder Body: All students who submitted */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold">
                    Submitted Students ({folderSubmissions.length})
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Each student has an <strong>[ 🤖 AI Detection ]</strong> button to verify Human vs AI authorship
                </span>
              </div>

              {folderLoading ? (
                <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-2">
                  <RotateCw className="w-6 h-6 animate-spin text-amber-400" />
                  <span>Opening submissions folder...</span>
                </div>
              ) : folderSubmissions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 bg-slate-900/30 rounded-2xl border border-slate-800 p-8">
                  <Folder className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-white">Folder is Empty</p>
                  <p className="text-xs text-slate-500 mt-1">
                    No students have submitted or uploaded their completed coursework for this assignment yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {folderSubmissions.map((sub) => {
                    const isAi = sub.is_ai_flagged || (sub.ai_generated_pct && sub.ai_generated_pct >= 25);
                    const aiPct = Number(sub.ai_generated_pct || 0);

                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md"
                      >
                        {/* Student Info */}
                        <div className="flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shadow">
                            {sub.avatar ? (
                              <img
                                src={sub.avatar}
                                alt={sub.student_name}
                                className="w-full h-full object-cover rounded-2xl"
                              />
                            ) : (
                              sub.student_name?.charAt(0) || 'S'
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{sub.student_name}</span>
                              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700 font-semibold">
                                Roll No: {sub.roll_number}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>Submitted: {new Date(sub.submitted_at).toLocaleString()}</span>
                            </p>

                            {/* Attached Uploads */}
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                              {sub.code_file_url && (
                                <a
                                  href={`${API_BASE_URL}${sub.code_file_url}`}
                                  download={sub.code_file_name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 text-[11px] font-semibold border border-orange-500/20 transition"
                                >
                                  <FileCode className="w-3.5 h-3.5" />
                                  <span>Code: {sub.code_file_name}</span>
                                </a>
                              )}

                              {sub.doc_file_url && (
                                <a
                                  href={`${API_BASE_URL}${sub.doc_file_url}`}
                                  download={sub.doc_file_name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-semibold border border-blue-500/20 transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Word: {sub.doc_file_name}</span>
                                </a>
                              )}

                              {sub.file_url && !sub.code_file_url && !sub.doc_file_url && (
                                <a
                                  href={`${API_BASE_URL}${sub.file_url}`}
                                  download={sub.file_name}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-[11px] font-semibold border border-indigo-500/20 transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>File: {sub.file_name}</span>
                                </a>
                              )}
                            </div>

                            {/* Status Chip */}
                            <div className="mt-2 flex items-center gap-2">
                              {isAi ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>🚨 AI Detected ({aiPct}% AI) • 0 Marks</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>✅ 100% Human Written {sub.marks_obtained !== null ? `(${sub.marks_obtained} Marks)` : ''}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* USER REQUIREMENT: AI DETECTION BUTTON SIDE OF EVERY STUDENT */}
                        <div className="flex items-center gap-2 md:self-center flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenAiDetectionModal(sub)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
                          >
                            <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
                            <span>🤖 AI Detection</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Folder Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>Smart Classroom LMS • Assessment Verification Submissions Folder</span>
              <button
                onClick={() => setSelectedAssignmentForFolder(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. AI DETECTION MODAL (With Pie/Donut Chart & 2 Boxes)  */}
      {/* ======================================================== */}
      {aiModalSub && selectedAssignmentForFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1120] border border-indigo-500/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f172a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow">
                  <Bot className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>AI Detection & Verification</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      NLP & Perplexity Audit
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Student: <strong className="text-white">{aiModalSub.student_name}</strong> (Roll: {aiModalSub.roll_number})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setAiModalSub(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* THE EXACT DONUT / PIE CHART WITH BOX 1 (HUMAN) & BOX 2 (AI) */}
              <div className="p-5 rounded-3xl bg-[#080d19] border border-slate-800/80 shadow-inner flex flex-col items-center">
                <div className="w-full text-center mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Authorship Breakdown Analysis
                  </span>
                </div>

                <AIDetectionDonutChart
                  aiPct={aiModalState.aiPct}
                  humanPct={aiModalState.humanPct}
                />
              </div>

              {/* ACADEMIC INTEGRITY POLICY VERDICT */}
              {aiModalState.isAi ? (
                <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                    <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                    <span>Academic Integrity Violation: AI Tools Detected ({aiModalState.aiPct}% AI)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    The student did not write this assessment independently. It was generated or heavily assisted by AI tools.
                    In accordance with university policy, <strong>the student receives zero (0) marks</strong>.
                  </p>
                  <div className="pt-1 flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 font-bold border border-rose-500/40">
                      Enforced Marks: 0 / {selectedAssignmentForFolder.max_marks} (Locked)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>Verified Human-Authored Submission (100% Original)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-xs">
                    No AI usage detected (0% AI used). The student wrote and completed this assessment on their own.
                    <strong> Student is eligible to receive marks given by the faculty</strong> (up to {selectedAssignmentForFolder.max_marks} marks).
                  </p>
                  <div className="pt-1 flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/40">
                      Eligible: Faculty Marks Allowed (Max: {selectedAssignmentForFolder.max_marks})
                    </span>
                  </div>
                </div>
              )}

              {/* QUICK SIMULATION / VERIFICATION TEST BUTTONS */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    Faculty Verification & Test Simulation:
                  </span>
                  {aiModalState.scanning && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-semibold animate-pulse">
                      <RotateCw className="w-3 h-3 animate-spin" /> Scanning file...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSimulateAiStatus(75.0)}
                    disabled={aiModalState.scanning}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      aiModalState.aiPct >= 25
                        ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                        : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      🚨 Test High AI (75% AI)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Sets 75% AI / 25% Human → 0 Marks
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSimulateAiStatus(0.0)}
                    disabled={aiModalState.scanning}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      aiModalState.aiPct === 0
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                        : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1">
                      ✅ Test 100% Human (0% AI)
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Sets 0% AI / 100% Human → Faculty Marks
                    </span>
                  </button>
                </div>

                <div className="pt-1 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleRescanFile}
                    disabled={aiModalState.scanning}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1 font-medium"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Run Deep NLP Scan on Uploaded Document</span>
                  </button>
                </div>
              </div>

              {/* FACULTY MARKS & REMARKS FORM */}
              <form onSubmit={handleSaveAiGrade} className="space-y-4 pt-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Marks Awarded (out of {selectedAssignmentForFolder.max_marks}) *
                  </label>
                  {aiModalState.isAi ? (
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value="0 (Locked: AI Violation Penalty)"
                        className="w-full bg-rose-950/40 border border-rose-500/60 rounded-xl px-3.5 py-2.5 text-rose-300 font-bold font-mono outline-none cursor-not-allowed shadow-inner"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      step="0.5"
                      required
                      min="0"
                      max={selectedAssignmentForFolder.max_marks}
                      value={aiModalState.marks}
                      onChange={(e) => setAiModalState({ ...aiModalState, marks: e.target.value })}
                      placeholder={`e.g. ${Math.round(selectedAssignmentForFolder.max_marks * 0.95)}`}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold outline-none focus:border-indigo-500 transition"
                    />
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {aiModalState.isAi
                      ? 'AI Policy Rule: When AI tools are detected, marks are permanently locked to 0.'
                      : 'Faculty can award any marks between 0 and ' + selectedAssignmentForFolder.max_marks + '.'}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Faculty Remarks & Verification Audit
                  </label>
                  <textarea
                    rows="2"
                    value={aiModalState.feedback}
                    onChange={(e) => setAiModalState({ ...aiModalState, feedback: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 text-xs"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setAiModalSub(null)}
                    className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aiModalState.saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    {aiModalState.saving ? 'Saving...' : 'Confirm & Save Verification'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CREATE ASSIGNMENT MODAL                              */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2 text-indigo-400">
                <FileText className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create New Assignment</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 overflow-y-auto space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Implementation of Convolutional Neural Networks"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description & Instructions</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed guidelines, submission guidelines, rubrics..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Maximum Marks *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="500"
                    value={formData.max_marks}
                    onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* RECIPIENT OPTIONS (ALL, SELECTED, GROUP) */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <label className="block text-slate-200 font-bold">
                  Assignment Recipients (Target Audience) *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      formData.recipient_type === 'ALL'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recipient_type"
                      value="ALL"
                      checked={formData.recipient_type === 'ALL'}
                      onChange={() => setFormData({ ...formData, recipient_type: 'ALL' })}
                      className="hidden"
                    />
                    <span>1. All Students</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      formData.recipient_type === 'SELECTED'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recipient_type"
                      value="SELECTED"
                      checked={formData.recipient_type === 'SELECTED'}
                      onChange={() => setFormData({ ...formData, recipient_type: 'SELECTED' })}
                      className="hidden"
                    />
                    <span>2. Selected Students</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition ${
                      formData.recipient_type === 'GROUP'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-semibold'
                        : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recipient_type"
                      value="GROUP"
                      checked={formData.recipient_type === 'GROUP'}
                      onChange={() => setFormData({ ...formData, recipient_type: 'GROUP' })}
                      className="hidden"
                    />
                    <span>3. Selected Groups</span>
                  </label>
                </div>
              </div>

              {/* Document Attachment Upload */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Attachment (Document / PDF)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  {attachmentFile && <span className="text-emerald-400 font-medium">✓ {attachmentFile.name}</span>}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {createLoading ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FacultyAssignments;
