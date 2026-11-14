import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';

// Landing & Auth Pages
import { LandingPage } from './pages/LandingPage';
import { FacultyLogin } from './pages/auth/FacultyLogin';
import { StudentLogin } from './pages/auth/StudentLogin';
import { AdminLogin } from './pages/auth/AdminLogin';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminStudents } from './pages/admin/AdminStudents';
import { AdminFaculty } from './pages/admin/AdminFaculty';
import { AdminDepartments } from './pages/admin/AdminDepartments';
import { AdminSubjects } from './pages/admin/AdminSubjects';
import { AdminAttendance } from './pages/admin/AdminAttendance';
import { AdminAssignments } from './pages/admin/AdminAssignments';
import { AdminAssessments } from './pages/admin/AdminAssessments';
import { AdminMonitoring } from './pages/admin/AdminMonitoring';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminNotifications } from './pages/admin/AdminNotifications';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminProfile } from './pages/admin/AdminProfile';

// Faculty Pages
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { FacultyAttendance } from './pages/faculty/FacultyAttendance';
import { FacultyStudents } from './pages/faculty/FacultyStudents';
import { FacultyAssignments } from './pages/faculty/FacultyAssignments';
import { FacultyAssessments } from './pages/faculty/FacultyAssessments';
import { FacultyMaterials } from './pages/faculty/FacultyMaterials';
import { FacultyTasks } from './pages/faculty/FacultyTasks';
import { FacultyMonitoring } from './pages/faculty/FacultyMonitoring';
import { FacultyNotifications } from './pages/faculty/FacultyNotifications';
import { FacultyReports } from './pages/faculty/FacultyReports';
import { FacultyProfile } from './pages/faculty/FacultyProfile';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentAttendance } from './pages/student/StudentAttendance';
import { StudentLiveClass } from './pages/student/StudentLiveClass';
import { StudentAssignments } from './pages/student/StudentAssignments';
import { StudentAssessments } from './pages/student/StudentAssessments';
import { StudentQuizAttempt } from './pages/student/StudentQuizAttempt';
import { StudentMaterials } from './pages/student/StudentMaterials';
import { StudentTasks } from './pages/student/StudentTasks';
import { StudentAnnouncements } from './pages/student/StudentAnnouncements';
import { StudentNotifications } from './pages/student/StudentNotifications';
import { StudentProfile } from './pages/student/StudentProfile';

// Admin Dashboard App Shell
const AdminLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/students')) return 'Student Management & Biometrics';
    if (pathname.includes('/faculty')) return 'Faculty Management & Subject Assignment';
    if (pathname.includes('/departments')) return 'Academic Department Management';
    if (pathname.includes('/subjects')) return 'Course & Subject Management';
    if (pathname.includes('/attendance')) return 'Biometric Attendance & Audit Trail';
    if (pathname.includes('/assignments')) return 'Assignment & Coursework Monitoring';
    if (pathname.includes('/assessments')) return 'Assessment & Quiz Monitoring';
    if (pathname.includes('/monitoring')) return 'AI Classroom Vision & Smartphone Detection';
    if (pathname.includes('/reports')) return 'University Analytics & Reports';
    if (pathname.includes('/notifications')) return 'System Notifications & Broadcasts';
    if (pathname.includes('/settings')) return 'System Settings & AI Parameters';
    if (pathname.includes('/profile')) return 'Administrator Profile';
    return 'Administrator Master Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#080c14] overflow-hidden text-slate-100">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenMobileMenu={() => setIsMobileOpen(true)} title={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#080c14]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Faculty Dashboard App Shell
const FacultyLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/attendance')) return 'AI Facial Recognition Attendance';
    if (pathname.includes('/students')) return 'Student Directory & Biometric Registration';
    if (pathname.includes('/assignments')) return 'LMS Coursework & Evaluation';
    if (pathname.includes('/assessments')) return 'Assessments & MCQ Engine';
    if (pathname.includes('/materials')) return 'Course Materials Archive';
    if (pathname.includes('/tasks')) return "Today's Tasks & Milestones";
    if (pathname.includes('/monitoring')) return 'AI Classroom Vision & Phone Detection';
    if (pathname.includes('/notifications')) return 'Faculty Notifications';
    if (pathname.includes('/reports')) return 'Attendance & Academic Reports';
    if (pathname.includes('/profile')) return 'Faculty Profile';
    return 'Faculty Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#080c14] overflow-hidden text-slate-100">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenMobileMenu={() => setIsMobileOpen(true)} title={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#080c14]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

// Student Dashboard App Shell
const StudentLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname) => {
    if (pathname.includes('/attendance')) return 'My Biometric Attendance';
    if (pathname.includes('/live-class')) return 'Live Class Session & AI Attention Monitor';
    if (pathname.includes('/assignments')) return 'Coursework & Submissions';
    if (pathname.includes('/assessments')) return 'Assessments & Quizzes';
    if (pathname.includes('/materials')) return 'Course Study Materials';
    if (pathname.includes('/tasks')) return 'My Academic Tasks';
    if (pathname.includes('/announcements')) return 'Department Announcements';
    if (pathname.includes('/notifications')) return 'Academic Notifications';
    if (pathname.includes('/profile')) return 'Student Profile';
    return 'Student Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#080c14] overflow-hidden text-slate-100">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onOpenMobileMenu={() => setIsMobileOpen(true)} title={getPageTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#080c14]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing & Login Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LandingPage />} />
          <Route path="/login/faculty" element={<FacultyLogin />} />
          <Route path="/login/student" element={<StudentLogin />} />
          <Route path="/login/admin" element={<AdminLogin />} />

          {/* Protected Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="faculty" element={<AdminFaculty />} />
            <Route path="departments" element={<AdminDepartments />} />
            <Route path="subjects" element={<AdminSubjects />} />
            <Route path="attendance" element={<AdminAttendance />} />
            <Route path="assignments" element={<AdminAssignments />} />
            <Route path="assessments" element={<AdminAssessments />} />
            <Route path="monitoring" element={<AdminMonitoring />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* Protected Faculty Routes */}
          <Route
            path="/faculty"
            element={
              <ProtectedRoute requiredRole="FACULTY">
                <FacultyLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/faculty/dashboard" replace />} />
            <Route path="dashboard" element={<FacultyDashboard />} />
            <Route path="attendance" element={<FacultyAttendance />} />
            <Route path="students" element={<FacultyStudents />} />
            <Route path="assignments" element={<FacultyAssignments />} />
            <Route path="assessments" element={<FacultyAssessments />} />
            <Route path="materials" element={<FacultyMaterials />} />
            <Route path="tasks" element={<FacultyTasks />} />
            <Route path="monitoring" element={<FacultyMonitoring />} />
            <Route path="notifications" element={<FacultyNotifications />} />
            <Route path="reports" element={<FacultyReports />} />
            <Route path="profile" element={<FacultyProfile />} />
          </Route>

          {/* Protected Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="STUDENT">
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="live-class" element={<StudentLiveClass />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="assessments" element={<StudentAssessments />} />
            <Route path="assessments/:id/attempt" element={<StudentQuizAttempt />} />
            <Route path="materials" element={<StudentMaterials />} />
            <Route path="tasks" element={<StudentTasks />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="notifications" element={<StudentNotifications />} />
            <Route path="profile" element={<StudentProfile />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
