import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  GraduationCap,
  Building,
  Briefcase,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import api from '../../api/client';

const COURSE_PRESETS = [
  { name: 'Computer Networks', code: 'CS501', semester: 5 },
  { name: 'Blockchain Technology', code: 'CS702', semester: 7 },
  { name: 'Artificial Intelligence & Machine Learning', code: 'CS601', semester: 6 },
  { name: 'Cloud Computing & Distributed Systems', code: 'CS603', semester: 6 },
  { name: 'Cyber Security & Cryptography', code: 'CS605', semester: 6 },
  { name: 'Operating Systems & System Programming', code: 'CS402', semester: 4 },
  { name: 'Database Management Systems', code: 'CS401', semester: 4 },
  { name: 'Full Stack Web Engineering', code: 'CS604', semester: 6 },
];

export const FacultyLogin = () => {
  const navigate = useNavigate();
  const { loginFaculty } = useAuth();

  // Mode: 'signin' or 'register'
  const [activeTab, setActiveTab] = useState('signin');

  // Sign In State
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register State
  const [selectedCoursePreset, setSelectedCoursePreset] = useState('Computer Networks');
  const [regData, setRegData] = useState({
    full_name: '',
    email: '',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    employee_id: '',
    cabin_room: 'Academic Block B, Room 302',
    phone: '+91 9876543210',
    course_name: 'Computer Networks',
    course_code: 'CS501',
    semester: 5,
    password: '',
    confirm_password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleCoursePresetChange = (presetName) => {
    setSelectedCoursePreset(presetName);
    if (presetName === 'custom') {
      setRegData((prev) => ({ ...prev, course_name: '', course_code: '' }));
    } else {
      const found = COURSE_PRESETS.find((p) => p.name === presetName);
      if (found) {
        setRegData((prev) => ({
          ...prev,
          course_name: found.name,
          course_code: found.code,
          semester: found.semester,
        }));
      }
    }
  };

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState({ type: '', text: '' });

  // Handle Sign In Submit
  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!login || !password) {
      setErrorMessage('Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await loginFaculty(login, password, rememberMe);
      navigate('/faculty/dashboard');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Authentication failed. Please verify your faculty credentials.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (regData.password !== regData.confirm_password) {
      setRegError('Password and Confirm Password do not match.');
      return;
    }

    if (regData.password.length < 8) {
      setRegError('Password must be at least 8 characters long.');
      return;
    }

    setRegLoading(true);

    try {
      const res = await api.post('/api/auth/faculty/register', regData);
      const data = res.data;

      // Save token and auto-login
      localStorage.setItem('smart_classroom_faculty_token', data.access_token);
      localStorage.setItem('smart_classroom_faculty_user', JSON.stringify(data));
      localStorage.setItem('smart_classroom_token', data.access_token);
      localStorage.setItem('smart_classroom_user', JSON.stringify(data));

      setRegSuccess('Faculty account registered successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/faculty/dashboard';
      }, 1000);
    } catch (err) {
      let msg = 'Registration failed. Please check your details.';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          msg = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          msg = err.response.data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else {
          msg = JSON.stringify(err.response.data.detail);
        }
      } else if (err.message) {
        msg = err.message;
      }
      setRegError(msg);
    } finally {
      setRegLoading(false);
    }
  };

  // Handle Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail || !newPassword) {
      setForgotMessage({ type: 'error', text: 'Please fill in both fields.' });
      return;
    }

    setForgotLoading(true);
    setForgotMessage({ type: '', text: '' });

    try {
      const res = await api.post('/api/auth/forgot-password', {
        email: forgotEmail,
        new_password: newPassword,
      });
      setForgotMessage({ type: 'success', text: res.data.message || 'Password successfully updated!' });
      setTimeout(() => {
        setShowForgotModal(false);
        setPassword(newPassword);
        setLogin(forgotEmail);
        setActiveTab('signin');
      }, 1500);
    } catch (err) {
      setForgotMessage({
        type: 'error',
        text: err.response?.data?.detail || 'Failed to reset password. Please check the email.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {/* Portal Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">SMART CLASSROOM</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Faculty & Administrative Portal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {activeTab === 'signin' ? 'Faculty Sign In' : 'Create Faculty Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'signin'
              ? 'Access automated attendance scanner, LMS assessments, and monitoring'
              : 'Register your faculty credentials to manage attendance and coursework'}
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Register */}
        <div className="flex rounded-2xl bg-slate-900/90 p-1 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'signin'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setRegError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'register'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register as New Faculty
          </button>
        </div>

        {/* Card Body */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* TAB 1: SIGN IN */}
          {activeTab === 'signin' && (
            <div>
              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Faculty Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="e.g. faculty@smartclassroom.edu"
                      required
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                    />
                    <span>Remember me on this workstation</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Faculty Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Faculty Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-slate-400">
                <span>New faculty member? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="font-bold text-indigo-400 hover:text-indigo-300 underline"
                >
                  Register here
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER AS NEW FACULTY */}
          {activeTab === 'register' && (
            <div>
              {regError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}
              {regSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name (with Title) *</label>
                  <input
                    type="text"
                    required
                    value={regData.full_name}
                    onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Sharma"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Email Address & Employee ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Faculty Email *</label>
                    <input
                      type="email"
                      required
                      value={regData.email}
                      onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                      placeholder="e.g. rsharma@smartclassroom.edu"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Employee / Faculty ID</label>
                    <input
                      type="text"
                      value={regData.employee_id}
                      onChange={(e) => setRegData({ ...regData, employee_id: e.target.value })}
                      placeholder="e.g. FAC-CSE-045"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Department & Designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <select
                      value={regData.department}
                      onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                      <option value="Electronics & Communication">Electronics & Communication</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Designation</label>
                    <select
                      value={regData.designation}
                      onChange={(e) => setRegData({ ...regData, designation: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Professor">Professor & HOD</option>
                      <option value="Associate Professor">Associate Professor</option>
                      <option value="Assistant Professor">Assistant Professor</option>
                      <option value="Visiting Faculty">Visiting Faculty</option>
                    </select>
                  </div>
                </div>

                {/* Course / Subject Taught & Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Course / Subject Taught *</label>
                    <select
                      value={selectedCoursePreset}
                      onChange={(e) => handleCoursePresetChange(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                    >
                      <option value="Computer Networks">Computer Networks (CS501)</option>
                      <option value="Blockchain Technology">Blockchain Technology (CS702)</option>
                      <option value="Artificial Intelligence & Machine Learning">Artificial Intelligence & ML (CS601)</option>
                      <option value="Cloud Computing & Distributed Systems">Cloud Computing (CS603)</option>
                      <option value="Cyber Security & Cryptography">Cyber Security & Cryptography (CS605)</option>
                      <option value="Operating Systems & System Programming">Operating Systems (CS402)</option>
                      <option value="Database Management Systems">Database Management Systems (CS401)</option>
                      <option value="Full Stack Web Engineering">Full Stack Web Engineering (CS604)</option>
                      <option value="custom">✏️ Custom Course (Enter your own)...</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Teaching Semester</label>
                    <select
                      value={regData.semester || 5}
                      onChange={(e) => setRegData({ ...regData, semester: parseInt(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-indigo-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <option key={sem} value={sem}>Semester {sem}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedCoursePreset === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Custom Course Name *</label>
                      <input
                        type="text"
                        required
                        value={regData.course_name}
                        onChange={(e) => setRegData({ ...regData, course_name: e.target.value })}
                        placeholder="e.g. Data Structures & Algorithms"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Course Code (Optional)</label>
                      <input
                        type="text"
                        value={regData.course_code || ''}
                        onChange={(e) => setRegData({ ...regData, course_code: e.target.value.toUpperCase() })}
                        placeholder="e.g. CS301"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 uppercase font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regData.password}
                        onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 text-white outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      required
                      value={regData.confirm_password}
                      onChange={(e) => setRegData({ ...regData, confirm_password: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                <PasswordStrengthMeter password={regData.password} />

                {/* Submit Register */}
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {regLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Faculty Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center text-xs text-slate-400">
                <span>Already have a registered account? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className="font-bold text-indigo-400 hover:text-indigo-300 underline"
                >
                  Sign In instead
                </button>
              </div>
            </div>
          )}

          {/* Switch to Student Portal */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <span>Are you a student? </span>
            <Link to="/login/student" className="font-semibold text-indigo-400 hover:text-indigo-300 transition">
              Go to Student Login &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Reset Faculty Password</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              {forgotMessage.text && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    forgotMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {forgotMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>{forgotMessage.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Registered Faculty Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="faculty@smartclassroom.edu"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Enter New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3.5 py-2 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  {forgotLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
