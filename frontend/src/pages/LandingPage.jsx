import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  ScanFace,
  Video,
  FileCheck2,
  BookOpen,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <nav className="border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md px-6 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              SMART CLASSROOM
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-medium">
                AI 2.0
              </span>
            </span>
            <p className="text-[11px] text-slate-400">Next-Gen AI Classroom Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login/admin"
            className="px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-white hover:bg-rose-500/10 rounded-xl transition border border-rose-500/30"
          >
            Admin Sign In
          </Link>
          <Link
            to="/login/faculty"
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition border border-slate-700/60"
          >
            Faculty Sign In
          </Link>
          <Link
            to="/login/student"
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/25 transition"
          >
            Student Sign In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>Final-Year Capstone Project • Production Ready</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          AI-Powered <span className="gradient-text-indigo">Classroom Management</span> & Attendance System
        </h1>

        <p className="mt-5 text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Integrated with real-time OpenCV facial recognition, automated attendance verification, YOLO classroom monitoring, and a Canvas-inspired modern LMS.
        </p>

        {/* Portal Selection Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
          {/* Faculty Card */}
          <Link
            to="/login/faculty"
            className="group relative p-6 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Faculty Portal
                  <ArrowRight className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Start live facial attendance scanning, oversee student registrations, review phone alerts, and publish coursework.
                </p>
              </div>

              <div className="pt-2 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-time Webcam Face Recognition</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>YOLO Mobile Phone Detector</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LMS Assignment & MCQ Quizzes</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400">
              <span>Sign In as Faculty</span>
              <span>&rarr;</span>
            </div>
          </Link>

          {/* Student Card */}
          <Link
            to="/login/student"
            className="group relative p-6 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-violet-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <ScanFace className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Student Portal
                  <ArrowRight className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  View personal biometric attendance, submit dual-slot coursework, take MCQ quizzes, and access materials.
                </p>
              </div>

              <div className="pt-2 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Biometric Attendance Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Interactive Timed MCQ Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                  <span>Code & Word Coursework Uploads</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-violet-400">
              <span>Sign In as Student</span>
              <span>&rarr;</span>
            </div>
          </Link>

          {/* Administrator Card */}
          <Link
            to="/login/admin"
            className="group relative p-6 rounded-3xl bg-[#0f172a] border border-slate-800 hover:border-rose-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/10 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Administrator Portal
                  <ArrowRight className="w-4 h-4 text-rose-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition" />
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Comprehensive institution control: manage students, faculty, departments, audit logs, and global AI metrics.
                </p>
              </div>

              <div className="pt-2 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Central University Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Attendance Audit Trail & CSV Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Faculty & Department Provisioning</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-rose-400">
              <span>Sign In as Administrator</span>
              <span>&rarr;</span>
            </div>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <ScanFace className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white">AI Face Attendance</h4>
            <p className="text-[11px] text-slate-400 mt-1">Real-time cosine embedding matcher</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <Video className="w-6 h-6 text-rose-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white">Classroom AI Vision</h4>
            <p className="text-[11px] text-slate-400 mt-1">YOLO mobile detector & head pose</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <FileCheck2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white">LMS & Quizzes</h4>
            <p className="text-[11px] text-slate-400 mt-1">Targeted assignments & tests</p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 text-center">
            <BookOpen className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-white">Study Materials</h4>
            <p className="text-[11px] text-slate-400 mt-1">Subject notes & syllabus archive</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 px-6 text-center text-xs text-slate-500">
        <p>SMART CLASSROOM • AI-Powered University Management System • Final-Year Academic Capstone Project</p>
      </footer>
    </div>
  );
};

