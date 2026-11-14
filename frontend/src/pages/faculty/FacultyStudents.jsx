import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  X,
  ScanFace,
  Eye,
  Sparkles,
} from 'lucide-react';
import api from '../../api/client';
import { PasswordStrengthMeter } from '../../components/common/PasswordStrengthMeter';
import { WebcamCaptureModal } from '../../components/common/WebcamCaptureModal';

export const FacultyStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Register Modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    department: 'CSE',
    academic_year: '3rd Year',
    section: 'A',
    password: '',
    confirm_password: '',
  });
  const [capturedFaceSamples, setCapturedFaceSamples] = useState([]);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Webcam Modal
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const [targetStudentForFace, setTargetStudentForFace] = useState(null);

  // Edit Modal state
  const [editingStudent, setEditingStudent] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/students', {
        params: {
          search: search || undefined,
          department: selectedDept || undefined,
          academic_year: selectedYear || undefined,
        },
      });
      setStudents(res.data);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedDept, selectedYear]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) {
      setRegError('Password and Confirm Password do not match.');
      return;
    }

    setRegLoading(true);
    setRegError('');
    setRegSuccess('');

    try {
      const payload = {
        ...formData,
        avatar_base64: capturedFaceSamples.length > 0 ? capturedFaceSamples[0] : null,
        face_samples: capturedFaceSamples,
      };

      const res = await api.post('/api/students/register', payload);
      setRegSuccess(res.data.message || 'Student registered successfully!');
      setTimeout(() => {
        setShowRegisterModal(false);
        setFormData({
          full_name: '',
          roll_number: '',
          email: '',
          department: 'CSE',
          academic_year: '3rd Year',
          section: 'A',
          password: '',
          confirm_password: '',
        });
        setCapturedFaceSamples([]);
        setRegSuccess('');
        fetchStudents();
      }, 1500);
    } catch (err) {
      setRegError(err.response?.data?.detail || 'Failed to register student.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleDelete = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete student "${studentName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.delete(`/api/students/${studentId}`);
      fetchStudents();
    } catch (err) {
      alert('Failed to delete student.');
    }
  };

  // Face Registration Callback for existing student
  const handleSaveFaceSamples = async (samples) => {
    if (targetStudentForFace) {
      try {
        await api.post(`/api/students/${targetStudentForFace.id}/face-register`, { samples });
        alert(`Face profile successfully updated for ${targetStudentForFace.full_name}!`);
        setTargetStudentForFace(null);
        fetchStudents();
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to register face.');
      }
    } else {
      // In registration form
      setCapturedFaceSamples(samples);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Registration CTA */}
      <div className="p-6 md:p-8 rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold mb-2 border border-indigo-500/20">
            <Users className="w-3.5 h-3.5" />
            <span>Student Management Module</span>
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">Student Directory & Registration</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enroll students, associate biometric facial embeddings, and manage account details
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Student</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800/80 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or email..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="IT">IT</option>
            <option value="MECH">MECH</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
          >
            <option value="">All Years</option>
            <option value="1st Year">1st Year</option>
            <option value="2nd Year">2nd Year</option>
            <option value="3rd Year">3rd Year</option>
            <option value="4th Year">4th Year</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800">
            <thead className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4">Student Name</th>
                <th className="px-5 py-4">Roll Number</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Dept / Year / Sec</th>
                <th className="px-5 py-4">Face Recognition</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    Loading student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-500">
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-3.5 flex items-center gap-3">
                      {s.avatar ? (
                        <img
                          src={s.avatar}
                          alt={s.full_name}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {s.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-white block">{s.full_name}</span>
                        <span className="text-[10px] text-slate-500">User ID: #{s.user_id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-indigo-300 font-semibold">{s.roll_number}</td>
                    <td className="px-5 py-3.5 text-slate-400">{s.email}</td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {s.department} • {s.academic_year} • Sec {s.section}
                    </td>
                    <td className="px-5 py-3.5">
                      {s.face_registered ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Active Profile</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setTargetStudentForFace(s);
                            setShowWebcamModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Enroll Face</span>
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => {
                            setTargetStudentForFace(s);
                            setShowWebcamModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                          title="Update Face Profile"
                        >
                          <ScanFace className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0f172a] border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <UserPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-white">Register New Student</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}
              {regSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">University Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.roll_number}
                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                    placeholder="e.g. 21CS009"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Student Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. jdoe@smartclassroom.edu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="IT">IT</option>
                    <option value="MECH">MECH</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Academic Year</label>
                  <select
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-indigo-500"
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
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white outline-none focus:border-indigo-500"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                  <PasswordStrengthMeter password={formData.password} />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Face Registration Step */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <ScanFace className="w-4 h-4 text-indigo-400" />
                      <span>Webcam Face Registration</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Capture snapshots to enable automated attendance for this student
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTargetStudentForFace(null);
                      setShowWebcamModal(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{capturedFaceSamples.length > 0 ? 'Recapture Face' : 'Open Camera'}</span>
                  </button>
                </div>

                {capturedFaceSamples.length > 0 ? (
                  <div className="flex items-center gap-2 pt-1 text-emerald-400 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{capturedFaceSamples.length} face sample(s) captured and ready!</span>
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px] italic">
                    Face can also be registered later by the student or faculty.
                  </p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={regLoading}
                  className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {regLoading ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Webcam Capture Modal */}
      <WebcamCaptureModal
        isOpen={showWebcamModal}
        onClose={() => setShowWebcamModal(false)}
        onSaveSamples={handleSaveFaceSamples}
      />
    </div>
  );
};

