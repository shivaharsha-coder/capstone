import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Award,
  HelpCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';

export const StudentQuizAttempt = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef(null);

  useEffect(() => {
    const fetchAssessmentDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/assessments/${id}`);
        const data = res.data;
        setAssessment(data);

        // Check if student has already completed
        if (data.student_attempt) {
          setIsSubmitted(true);
          setSubmitResult({
            score: data.student_attempt.score,
            total_marks: data.total_marks,
            percentage: Math.round((data.student_attempt.score / data.total_marks) * 100),
            message: 'You have completed this assessment.',
          });
          if (data.student_attempt.answers) {
            setSelectedAnswers(data.student_attempt.answers);
          }
        } else {
          // Initialize timer
          setTimeLeftSeconds(data.duration_minutes * 60);
        }
      } catch (err) {
        console.error('Failed to load assessment:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessmentDetails();
  }, [id]);

  // Countdown Timer
  useEffect(() => {
    if (isSubmitted || timeLeftSeconds <= 0 || !assessment) return;

    timerRef.current = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleFinalSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isSubmitted, assessment]);

  const handleSelectOption = (questionId, optionLetter) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId.toString()]: optionLetter,
    }));
  };

  const handleFinalSubmit = async () => {
    if (isSubmitted || submitting) return;
    setSubmitting(true);

    try {
      const res = await api.post(`/api/assessments/${id}/submit`, {
        assessment_id: parseInt(id, 10),
        answers: selectedAnswers,
      });
      setIsSubmitted(true);
      setSubmitResult(res.data);
      // Reload assessment to get correct options revealed
      const refreshed = await api.get(`/api/assessments/${id}`);
      setAssessment(refreshed.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Assessment not found.</p>
        <Link to="/student/assessments" className="mt-2 text-indigo-400 underline block">
          Back to Assessments
        </Link>
      </div>
    );
  }

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const questions = assessment.questions || [];
  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Bar with Timer and Breadcrumb */}
      <div className="p-5 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/student/assessments"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Assessments</span>
            </Link>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-emerald-400 font-semibold">{assessment.subject_name}</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">{assessment.title}</h2>
        </div>

        {/* Live Timer or Score Badge */}
        {!isSubmitted ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto font-mono text-sm">
            <Clock className={`w-4 h-4 ${timeLeftSeconds < 120 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className={timeLeftSeconds < 120 ? 'text-rose-400 font-bold' : 'text-white'}>
              {formatTimer(timeLeftSeconds)} Remaining
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
            <Award className="w-5 h-5" />
            <span>
              Final Score: {submitResult?.score} / {submitResult?.total_marks} ({submitResult?.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Submitted Result Congratulatory Card */}
      {isSubmitted && submitResult && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30 border border-emerald-500/30 shadow-xl text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-white">Assessment Submitted & Graded!</h3>
          <p className="text-xs text-slate-300">
            You scored <strong className="text-emerald-400">{submitResult.score}</strong> out of{' '}
            <strong>{submitResult.total_marks}</strong> ({submitResult.percentage}%). Review your answers below.
          </p>
        </div>
      )}

      {/* Question Card & Options */}
      {currentQ && (
        <div className="p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-6">
          {/* Question Index & Progress */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-bold text-white text-sm">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="font-mono bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
              Worth {currentQ.marks} Marks
            </span>
          </div>

          {/* Question Text */}
          <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed">
            {currentQ.question_text}
          </h3>

          {/* MCQ Options A, B, C, D */}
          <div className="space-y-3 pt-2">
            {[
              { key: 'A', text: currentQ.option_a },
              { key: 'B', text: currentQ.option_b },
              { key: 'C', text: currentQ.option_c },
              { key: 'D', text: currentQ.option_d },
            ].map((opt) => {
              const isSelected = selectedAnswers[currentQ.id.toString()] === opt.key;
              const isCorrect = isSubmitted && currentQ.correct_option === opt.key;
              const isWrongSelected = isSubmitted && isSelected && !isCorrect;

              return (
                <div
                  key={opt.key}
                  onClick={() => handleSelectOption(currentQ.id, opt.key)}
                  className={`p-4 rounded-2xl border text-xs sm:text-sm font-medium transition cursor-pointer flex items-center gap-3.5 ${
                    isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : isWrongSelected
                      ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                      : isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 transition ${
                      isCorrect
                        ? 'bg-emerald-500 text-white'
                        : isWrongSelected
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {opt.key}
                  </div>
                  <span className="flex-1">{opt.text}</span>
                  {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-800">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {!isLast ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : !isSubmitted ? (
                <button
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit Assessment'}</span>
                </button>
              ) : (
                <Link
                  to="/student/assessments"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Done Reviewing
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Question Navigator Drawer / Index Pills */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-400 font-semibold">
          Answered: <strong className="text-white">{answeredCount}</strong> of {questions.length}
        </span>

        <div className="flex items-center gap-2 overflow-x-auto">
          {questions.map((_, i) => {
            const hasAns = !!selectedAnswers[questions[i].id.toString()];
            const isCur = i === currentIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition ${
                  isCur
                    ? 'ring-2 ring-indigo-500 bg-indigo-600 text-white'
                    : hasAns
                    ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

