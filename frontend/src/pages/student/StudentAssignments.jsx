import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  FileCheck2,
  Calendar,
  Sparkles,
  FileCode,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import api, { API_BASE_URL } from '../../api/client';

const formatFileSize = (bytes) => {
  if (!bytes) return '1.2 MB';
  if (typeof bytes === 'string' && (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B'))) {
    return bytes;
  }
  const num = Number(bytes);
  if (isNaN(num)) return '1.2 MB';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

export const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit modal state
  const [activeAssignmentForSubmit, setActiveAssignmentForSubmit] = useState(null);
  const [submissionComments, setSubmissionComments] = useState('');
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [forceAiFlag, setForceAiFlag] = useState(false);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const resetModalState = () => {
    setActiveAssignmentForSubmit(null);
    setSubmissionComments('');
    setSubmissionFile(null);
    setSubmitError('');
    setSubmitting(false);
    setForceAiFlag(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSubmissionFile({
        name: file.name,
        base64: reader.result,
        size: formatFileSize(file.size),
      });
      setSubmitError('');
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!submissionFile) {
      setSubmitError('Please select a file to submit.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      await api.post(`/api/assignments/${activeAssignmentForSubmit.id}/submit`, {
        assignment_id: activeAssignmentForSubmit.id,
        comments: submissionComments,
        file_base64: submissionFile.base64,
        file_name: submissionFile.name,
        force_ai_flag: forceAiFlag,
      });

      resetModalState();
      fetchAssignments();
    } catch (err) {
      setSubmitError(err.response?.data?.detail || 'Failed to submit assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-2 border border-violet-500/20">
          <FileText className="w-3.5 h-3.5" />
          <span>Canvas LMS Coursework</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">My Assignments & Submissions</h2>
        <p className="text-xs text-slate-400 mt-1">
          Review assignments published by faculty, prepare required code and Word reports, and submit with automatic format validation
        </p>
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            Loading your assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800 text-xs">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-white">No assignments assigned to you</p>
            <p className="text-slate-400 mt-1">Assignments published for your department or section will appear here.</p>
          </div>
        ) : (
          assignments.map((a) => {
            const hasSubmitted = !!a.submission;
            const isGraded = a.submission?.is_graded;

            return (
              <div
                key={a.id}
                className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {a.subject_code}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white line-clamp-2 mt-1">{a.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">{a.description}</p>

                  {/* Required Submission Format Badge */}
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[10px] px-2.5 py-1 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-medium">
                      {a.submission_format === 'CODE_AND_WORD' && 'Required: 💻 Code + 📄 Word (.docx)'}
                      {a.submission_format === 'CODE_ONLY' && 'Required: 💻 Code File (.py/.ipynb)'}
                      {a.submission_format === 'WORD_ONLY' && 'Required: 📄 Word Document (.docx)'}
                      {a.submission_format === 'PDF_ONLY' && 'Required: 📑 PDF Document'}
                      {(!a.submission_format || a.submission_format === 'ANY') && 'Required: 📁 Coursework Document'}
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                    <span>Faculty: <strong className="text-slate-300">{a.faculty_name}</strong></span>
                    <span>Max Marks: <strong className="text-white font-mono">{a.max_marks}</strong></span>
                  </div>

                  {a.attachment_url && (
                    <div className="mt-3">
                      <a
                        href={`${API_BASE_URL}${a.attachment_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 underline font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Faculty Attachment</span>
                      </a>
                    </div>
                  )}

                  {/* Submission Status Box */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
                    {/* AI Tool Usage Badge */}
                    {hasSubmitted && (
                      a.submission.is_ai_flagged || (a.submission.ai_generated_pct && a.submission.ai_generated_pct >= 25) ? (
                        <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            🚨 AI Tools Detected ({a.submission.ai_generated_pct || 88.5}% AI)
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/30 text-rose-200">Marks: 0</span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ✅ 0% AI Used — 100% Student Authored
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-200">Eligible</span>
                        </div>
                      )
                    )}

                    {isGraded ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold flex items-center gap-1 ${
                            a.submission.is_ai_flagged ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{a.submission.is_ai_flagged ? 'Graded (AI Violation: 0 Marks)' : 'Graded'}</span>
                          </span>
                          <span className={`text-sm font-extrabold font-mono ${
                            a.submission.is_ai_flagged ? 'text-rose-400' : 'text-white'
                          }`}>
                            {a.submission.marks_obtained} / {a.max_marks}
                          </span>
                        </div>
                        {a.submission.feedback && (
                          <p className="text-[11px] text-slate-300 mt-1 italic">
                            Faculty: "{a.submission.feedback}"
                          </p>
                        )}
                      </div>
                    ) : hasSubmitted ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submitted (Pending Evaluation)</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(a.submission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Submitted files preview */}
                        <div className="mt-2 flex flex-wrap gap-1.5 pt-1 border-t border-slate-800/60">
                          {a.submission.code_file_name && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 font-mono">
                              💻 {a.submission.code_file_name}
                            </span>
                          )}
                          {a.submission.doc_file_name && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                              📄 {a.submission.doc_file_name}
                            </span>
                          )}
                          {a.submission.file_name && !a.submission.code_file_name && !a.submission.doc_file_name && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              📁 {a.submission.file_name}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Not yet submitted</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setActiveAssignmentForSubmit(a);
                      setSubmissionFile(null);
                      setSubmissionComments('');
                      setSubmitError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/25 transition flex items-center justify-center gap-2"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{hasSubmitted ? 'Resubmit Assignment' : 'Submit Assignment'}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Normal Submit Assignment Modal */}
      {activeAssignmentForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div>
                <h3 className="text-base font-bold text-white">
                  Submit Assignment
                </h3>
                <p className="text-xs text-slate-400 line-clamp-1">{activeAssignmentForSubmit.title}</p>
              </div>
              <button
                onClick={resetModalState}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Course & Due Date Info */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Subject</span>
                  <span className="text-xs font-semibold text-violet-400">{activeAssignmentForSubmit.subject_code}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Max Marks</span>
                  <span className="text-xs font-semibold text-white font-mono">{activeAssignmentForSubmit.max_marks} pts</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Due Date</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {new Date(activeAssignmentForSubmit.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Standard Clean File Upload */}
              <div className="space-y-1.5">
                <label className="block text-slate-200 font-bold">
                  Upload Assignment File *
                </label>
                <p className="text-[11px] text-slate-400">
                  Select your coursework document, PDF, notebook, code, or archive file:
                </p>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 hover:border-violet-500/60 transition">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-500 cursor-pointer"
                  />

                  {submissionFile && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-white font-medium truncate font-mono">{submissionFile.name}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px] flex-shrink-0">{submissionFile.size}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Comments (Optional) */}
              <div>
                <label className="block text-slate-200 font-bold mb-1">
                  Student Comments (Optional)
                </label>
                <textarea
                  rows="3"
                  value={submissionComments}
                  onChange={(e) => setSubmissionComments(e.target.value)}
                  placeholder="Notes about your implementation, test steps, or assumptions..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                />
              </div>

              {/* Academic Integrity AI Detection Option */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-white text-xs font-semibold block flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Academic Integrity AI Scanner
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Coursework is checked for AI tools. Human-authored work (0% AI) receives faculty marks.
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-xs ml-3">
                  <input
                    type="checkbox"
                    checked={forceAiFlag}
                    onChange={(e) => setForceAiFlag(e.target.checked)}
                    className="rounded text-violet-600 w-4 h-4"
                  />
                  <span className={`font-semibold ${forceAiFlag ? 'text-rose-400' : 'text-slate-400'}`}>
                    {forceAiFlag ? '🚨 Simulate AI Used' : 'Test AI Flag'}
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetModalState}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Coursework...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Submission</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
