import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Award,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';

export const StudentAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      setLoading(true);
      try {
        const res = await api.get('/api/assessments');
        setAssessments(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessments();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-2 border border-emerald-500/20">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Interactive Quizzes & LMS</span>
        </div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white">Online Assessments & Quizzes</h2>
        <p className="text-xs text-slate-400 mt-1">
          Take timed multiple-choice assessments with instant automated scoring and performance metrics
        </p>
      </div>

      {/* Assessment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-500 text-xs">
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 p-8 rounded-3xl bg-[#0f172a] border border-slate-800 text-xs">
            <CheckCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-white">No active assessments right now</p>
            <p className="text-slate-400 mt-1">Check back later when faculty publishes tests.</p>
          </div>
        ) : (
          assessments.map((asmt) => {
            const hasCompleted = !!asmt.student_result;

            return (
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

                  {/* Completion Status */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                    {hasCompleted ? (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed</span>
                        </span>
                        <span className="text-sm font-extrabold text-white">
                          Score: {asmt.student_result.score} / {asmt.student_result.total_marks}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Not attempted yet</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800">
                  <Link
                    to={`/student/assessments/${asmt.id}/attempt`}
                    className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 shadow-lg ${
                      hasCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                    }`}
                  >
                    {hasCompleted ? (
                      <>
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Review Completed Assessment</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start MCQ Assessment</span>
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

