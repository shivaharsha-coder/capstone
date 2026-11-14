import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Users,
  Award,
} from 'lucide-react';
import api from '../../api/client';

export const FacultyAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create Assessment Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    duration_minutes: 20,
    total_marks: 20,
    due_date: '',
  });

  const [questions, setQuestions] = useState([
    {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_option: 'A',
      marks: 5,
    },
  ]);

  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Results Modal
  const [selectedAssessmentForResults, setSelectedAssessmentForResults] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/assessments');
      setAssessments(res.data);
    } catch (err) {
      console.error('Failed to load assessments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await api.get('/api/attendance/subjects');
        setSubjects(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({ ...prev, subject_id: res.data[0].id.toString() }));
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    };
    fetchAssessments();
    fetchMetadata();
  }, []);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        marks: 5,
      },
    ]);
  };

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.subject_id) {
      setCreateError('Please fill in assessment title and select a subject.');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        setCreateError(`Please provide question text and all four options for Question #${i + 1}.`);
        return;
      }
    }

    setCreateLoading(true);
    setCreateError('');

    try {
      const totalMarksCalculated = questions.reduce((sum, q) => sum + parseInt(q.marks || 0, 10), 0);

      const payload = {
        title: formData.title,
        description: formData.description,
        subject_id: parseInt(formData.subject_id, 10),
        duration_minutes: parseInt(formData.duration_minutes, 10),
        total_marks: totalMarksCalculated,
        due_date: formData.due_date || null,
        questions,
      };

      await api.post('/api/assessments', payload);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        subject_id: subjects[0]?.id?.toString() || '',
        duration_minutes: 20,
        total_marks: 20,
        due_date: '',
      });
      setQuestions([
        {
          question_text: '',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_option: 'A',
          marks: 5,
        },
      ]);
      fetchAssessments();
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create assessment.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleViewResults = async (asmt) => {
    setSelectedAssessmentForResults(asmt);
    setResultsLoading(true);
    try {
      const res = await api.get(`/api/assessments/${asmt.id}/results`);
      setResultsData(res.data);
    } catch (err) {
      console.error('Failed to load assessment results:', err);
    } finally {
      setResultsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Assessments & MCQ Engine</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Quiz & Assessment Creator</h2>
          <p className="text-xs text-slate-400 mt-1">
            Build interactive multiple-choice tests, set timed countdowns, and view automated student results
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Assessment</span>
        </button>
      </div>

      {/* Assessments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500">
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800">
            <FileCheck2 className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="font-semibold text-white">No assessments created yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "New Assessment" to publish MCQ quizzes for your class.</p>
          </div>
        ) : (
          assessments.map((asmt) => (
            <div
              key={asmt.id}
              className="p-6 rounded-3xl bg-[#0f172a] border border-slate-800/80 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {asmt.subject_code}
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    {asmt.duration_minutes} Mins
                  </span>
                </div>

                <h3 className="text-base font-bold text-white line-clamp-2 mt-1">{asmt.title}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{asmt.description}</p>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-300">
                  <span>Questions: <strong className="text-white">{asmt.question_count} MCQs</strong></span>
                  <span>Total Marks: <strong className="text-emerald-400 font-mono">{asmt.total_marks}</strong></span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Completed: <strong className="text-white">{asmt.attempts_count} students</strong>
                </span>

                <button
                  onClick={() => handleViewResults(asmt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>View Scores</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Assessment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2 text-emerald-400">
                <FileCheck2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Create MCQ Assessment</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAssessment} className="p-6 overflow-y-auto space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Assessment Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Mid-Term Machine Learning Quiz"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Subject *</label>
                  <select
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-emerald-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Instructions</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Choose the single best answer for each question."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Time Limit (Minutes) *</label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    required
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Dynamic Questions Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                    <span>Multiple Choice Questions ({questions.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl font-semibold border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-400 text-xs">Question #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-slate-400">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={q.marks}
                              onChange={(e) => updateQuestion(idx, 'marks', parseInt(e.target.value || 1, 10))}
                              className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-white"
                            />
                          </div>
                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQuestion(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Enter question text here..."
                        value={q.question_text}
                        onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                      />

                      {/* Options A, B, C, D */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-4">A:</span>
                          <input
                            type="text"
                            placeholder="Option A"
                            value={q.option_a}
                            onChange={(e) => updateQuestion(idx, 'option_a', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-4">B:</span>
                          <input
                            type="text"
                            placeholder="Option B"
                            value={q.option_b}
                            onChange={(e) => updateQuestion(idx, 'option_b', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-4">C:</span>
                          <input
                            type="text"
                            placeholder="Option C"
                            value={q.option_c}
                            onChange={(e) => updateQuestion(idx, 'option_c', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-400 w-4">D:</span>
                          <input
                            type="text"
                            placeholder="Option D"
                            value={q.option_d}
                            onChange={(e) => updateQuestion(idx, 'option_d', e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                          />
                        </div>
                      </div>

                      {/* Correct Option Selector */}
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[11px] text-emerald-400 font-semibold">Correct Answer:</span>
                        {['A', 'B', 'C', 'D'].map((opt) => (
                          <label key={opt} className="flex items-center gap-1 text-slate-300 cursor-pointer">
                            <input
                              type="radio"
                              name={`correct_${idx}`}
                              value={opt}
                              checked={q.correct_option === opt}
                              onChange={() => updateQuestion(idx, 'correct_option', opt)}
                              className="text-emerald-500"
                            />
                            <span>Option {opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
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
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  {createLoading ? 'Publishing...' : 'Publish Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {selectedAssessmentForResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div>
                <h3 className="text-base font-bold text-white">
                  Assessment Scores: {selectedAssessmentForResults.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Total Marks: {selectedAssessmentForResults.total_marks} • Total Completed:{' '}
                  {resultsData?.total_attempts || 0}
                </p>
              </div>
              <button
                onClick={() => setSelectedAssessmentForResults(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 text-xs">
              {resultsLoading ? (
                <div className="py-12 text-center text-slate-500">Loading student scores...</div>
              ) : !resultsData || resultsData.results.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No students have completed this assessment yet.
                </div>
              ) : (
                resultsData.results.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {res.avatar ? (
                        <img
                          src={res.avatar}
                          alt={res.student_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                          {res.student_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white block">{res.student_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {res.roll_number} • {res.department}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-extrabold text-emerald-400">
                        {res.score} / {res.total_marks}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Score: {res.percentage}% • {new Date(res.completed_at).toLocaleTimeString()}
                      </span>
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

