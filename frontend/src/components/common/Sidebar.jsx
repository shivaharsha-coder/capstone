import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanFace,
  Users,
  FileText,
  FileCheck2,
  BookOpen,
  CheckSquare,
  Video,
  Bell,
  BarChart3,
  User,
  LogOut,
  Sparkles,
  GraduationCap,
  X,
  Megaphone,
  Building2,
  UserCheck,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { user, isFaculty, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    if (location.pathname.startsWith('/admin')) {
      navigate('/login/admin');
    } else if (location.pathname.startsWith('/faculty')) {
      navigate('/login/faculty');
    } else {
      navigate('/login/student');
    }
  };

  const adminNavItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Student Management', path: '/admin/students', icon: Users },
    { label: 'Faculty Management', path: '/admin/faculty', icon: UserCheck },
    { label: 'Department Management', path: '/admin/departments', icon: Building2 },
    { label: 'Subject Management', path: '/admin/subjects', icon: BookOpen },
    { label: 'Attendance Management', path: '/admin/attendance', icon: ScanFace, highlight: true },
    { label: 'Assignment Monitoring', path: '/admin/assignments', icon: FileText },
    { label: 'Assessment Monitoring', path: '/admin/assessments', icon: FileCheck2 },
    { label: 'Classroom Monitoring', path: '/admin/monitoring', icon: Video, badge: 'AI' },
    { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { label: 'Notifications', path: '/admin/notifications', icon: Bell },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
    { label: 'Profile', path: '/admin/profile', icon: User },
  ];

  const facultyNavItems = [
    { label: 'Dashboard', path: '/faculty/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', path: '/faculty/attendance', icon: ScanFace, highlight: true },
    { label: 'Students', path: '/faculty/students', icon: Users },
    { label: 'Assignments', path: '/faculty/assignments', icon: FileText },
    { label: 'Assessments', path: '/faculty/assessments', icon: FileCheck2 },
    { label: 'Study Materials', path: '/faculty/materials', icon: BookOpen },
    { label: 'Today\'s Tasks', path: '/faculty/tasks', icon: CheckSquare },
    { label: 'Classroom Monitoring', path: '/faculty/monitoring', icon: Video, badge: 'AI' },
    { label: 'Notifications', path: '/faculty/notifications', icon: Bell },
    { label: 'Reports', path: '/faculty/reports', icon: BarChart3 },
    { label: 'Profile', path: '/faculty/profile', icon: User },
  ];

  const studentNavItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Attendance', path: '/student/attendance', icon: ScanFace, highlight: true },
    { label: 'Live Class Session', path: '/student/live-class', icon: Video, badge: 'Live' },
    { label: 'My Assignments', path: '/student/assignments', icon: FileText },
    { label: 'Assessments', path: '/student/assessments', icon: FileCheck2 },
    { label: 'Study Materials', path: '/student/materials', icon: BookOpen },
    { label: 'Today\'s Tasks', path: '/student/tasks', icon: CheckSquare },
    { label: 'Announcements', path: '/student/announcements', icon: Megaphone },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
    { label: 'My Profile', path: '/student/profile', icon: User },
  ];

  const isCurrentAdmin = isAdmin || location.pathname.startsWith('/admin');
  const isCurrentFaculty = isFaculty || location.pathname.startsWith('/faculty');
  const navItems = isCurrentAdmin ? adminNavItems : isCurrentFaculty ? facultyNavItems : studentNavItems;

  const content = (
    <div className="flex flex-col h-full bg-[#0b0f19] border-r border-slate-800/80 text-slate-300 w-64 select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
            isCurrentAdmin
              ? 'bg-gradient-to-tr from-rose-600 via-rose-500 to-indigo-600 shadow-rose-600/30'
              : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 shadow-indigo-600/30'
          }`}>
            {isCurrentAdmin ? (
              <ShieldCheck className="w-5 h-5 text-white" />
            ) : (
              <GraduationCap className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wide text-white flex items-center gap-1.5">
              SMART CLASSROOM
              <span className={`inline-block w-1.5 h-1.5 rounded-full animate-pulse ${isCurrentAdmin ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
            </h1>
            <p className={`text-[10px] font-medium uppercase tracking-wider ${isCurrentAdmin ? 'text-rose-400' : 'text-indigo-400'}`}>
              {isCurrentAdmin ? 'Admin Portal' : isCurrentFaculty ? 'Faculty Portal' : 'Student Portal'}
            </p>
          </div>
        </div>

        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen && setIsMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition group ${
                  isActive
                    ? isCurrentAdmin
                      ? 'bg-gradient-to-r from-rose-600/20 to-indigo-600/10 text-white border border-rose-500/30 shadow-sm'
                      : 'bg-gradient-to-r from-indigo-600/20 to-violet-600/10 text-white border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 transition group-hover:scale-110 text-slate-400 ${isCurrentAdmin ? 'group-hover:text-rose-400' : 'group-hover:text-indigo-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[9px] font-semibold rounded border ${
                  isCurrentAdmin ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* User Info & Logout footer */}
      <div className="p-3 border-t border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-2">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-lg object-cover border border-slate-700" />
          ) : (
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs ${
              isCurrentAdmin
                ? 'bg-rose-600/20 border-rose-500/30 text-rose-400'
                : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400'
            }`}>
              {user?.name?.charAt(0) || (isCurrentAdmin ? 'A' : 'U')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || (isCurrentAdmin ? 'System Administrator' : 'User')}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.email || (isCurrentAdmin ? 'admin@smartclassroom.edu' : '')}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition border border-transparent hover:border-rose-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0 z-30">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          ></div>
          <div className="relative z-10 animate-slideRight">{content}</div>
        </div>
      )}
    </>
  );
};

