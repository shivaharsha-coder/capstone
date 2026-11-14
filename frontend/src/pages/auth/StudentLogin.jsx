import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ScanFace,
  UserCheck,
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
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { WebcamCaptureModal } from '../../components/common/WebcamCaptureModal';
import api from '../../api/client';

export const StudentLogin = () => {
  const navigate = useNavigate();
  const { loginStudent } = useAuth();

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
  const [regData, setRegData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    department: 'CSE',
    academic_year: '3rd Year',
    section: 'A',
    password: '',
    confirm_password: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [capturedFaceSamples, setCapturedFaceSamples] = useState([]);
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

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
      setErrorMessage('Please enter your University Roll Number / Email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      await loginStudent(login, password, rememberMe);
      navigate('/student/dashboard');
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Authentication failed. Please verify your student credentials.';
      setErrorMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration Submit
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
      const payload = {
        ...regData,
        avatar_base64: capturedFaceSamples.length > 0 ? capturedFaceSamples[0] : null,
        face_samples: capturedFaceSamples,
      };

      const res = await api.post('/api/auth/student/register', payload);
      const data = res.data;

      // Save token and auto-login
      localStorage.setItem('smart_classroom_student_token', data.access_token);
      localStorage.setItem('smart_classroom_student_user', JSON.stringify(data));
      localStorage.setItem('smart_classroom_token', data.access_token);
      localStorage.setItem('smart_classroom_user', JSON.stringify(data));

      setRegSuccess('Student account created successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/student/dashboard';
      }, 1000);
    } catch (err) {
      setRegError(err.response?.data?.detail || 'Registration failed. Please check your details.');
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
        text: err.response?.data?.detail || 'Failed to reset password. Please verify the email.',
      });
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-violet-500 selection:text-white">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative w-full max-w-lg">
        {/* Portal Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-600/30 group-hover:scale-105 transition">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">SMART CLASSROOM</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold border border-violet-500/20 mb-2">
            <ScanFace className="w-3.5 h-3.5" />
            <span>Student Academic Portal</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {activeTab === 'signin' ? 'Student Sign In' : 'Create Student Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'signin'
              ? 'Check attendance, submit coursework, and attempt quizzes'
              : 'Register your student credentials and face biometrics for automated attendance'}
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
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
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
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Register as New Student
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
                {/* Roll Number or Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    University Roll Number or Email
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={login}
                      onChange={(e) => setLogin(e.target.value)}
                      placeholder="e.g. 21CS101 or student@smartclassroom.edu"
                      required
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
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
                      className="text-xs text-violet-400 hover:text-violet-300 transition"
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
                      className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
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
                      className="rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500 focus:ring-offset-0"
                    />
                    <span>Remember me on this device</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying Student Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Student Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-xs text-slate-400">
                <span>Don't have a student account? </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="font-bold text-violet-400 hover:text-violet-300 underline"
                >
                  Register here
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER AS NEW STUDENT */}
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
                {/* Full Name & Roll Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regData.full_name}
                      onChange={(e) => setRegData({ ...regData, full_name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">University Roll Number *</label>
                    <input
                      type="text"
                      required
                      value={regData.roll_number}
                      onChange={(e) => setRegData({ ...regData, roll_number: e.target.value })}
                      placeholder="e.g. 21CS015"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regData.email}
                    onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                    placeholder="e.g. jdoe@smartclassroom.edu"
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                  />
                </div>

                {/* Department, Year, Section */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Department</label>
                    <select
                      value={regData.department}
                      onChange={(e) => setRegData({ ...regData, department: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-violet-500"
                    >
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="IT">IT</option>
                      <option value="MECH">MECH</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Year</label>
                    <select
                      value={regData.academic_year}
                      onChange={(e) => setRegData({ ...regData, academic_year: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-violet-500"
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Section</label>
                    <select
                      value={regData.section}
                      onChange={(e) => setRegData({ ...regData, section: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none focus:border-violet-500"
                    >
                      <option value="A">Sec A</option>
                      <option value="B">Sec B</option>
                      <option value="C">Sec C</option>
                    </select>
                  </div>
                </div>

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
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-3 pr-8 py-2 text-white outline-none focus:border-violet-500"
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
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                {/* Password Strength Meter */}
                <PasswordStrengthMeter password={regData.password} />

                {/* Webcam Face Biometric Registration */}
                <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <ScanFace className="w-4 h-4 text-violet-400" />
                        <span>Webcam Face Enrollment</span>
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Optional: Capture face snapshots now for automated attendance
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWebcamModal(true)}
                      className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-[11px] flex items-center gap-1.5 transition shadow"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{capturedFaceSamples.length > 0 ? 'Recapture' : 'Open Camera'}</span>
                    </button>
                  </div>

                  {capturedFaceSamples.length > 0 && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs pt-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{capturedFaceSamples.length} face sample(s) attached!</span>
                    </div>
                  )}
                </div>

                {/* Submit Register */}
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-lg shadow-violet-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {regLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating Student Account...</span>
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
                  className="font-bold text-violet-400 hover:text-violet-300 underline"
                >
                  Sign In instead
                </button>
              </div>
            </div>
          )}

          {/* Switch to Faculty Portal */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
            <span>Are you a faculty member? </span>
            <Link to="/login/faculty" className="font-semibold text-violet-400 hover:text-violet-300 transition">
              Go to Faculty Login &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Webcam Capture Modal */}
      <WebcamCaptureModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onSaveSamples={(samples) => setCapturedFaceSamples(samples)}
      />

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-violet-400">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Reset Student Password</h3>
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
                  Registered Student Email
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="student@smartclassroom.edu"
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
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
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow transition"
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
