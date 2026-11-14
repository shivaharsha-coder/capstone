import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { 
    loading, 
    adminUser,
    adminToken,
    facultyUser, 
    facultyToken, 
    studentUser, 
    studentToken 
  } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm font-medium">Authenticating SMART CLASSROOM...</p>
      </div>
    );
  }

  // Admin Route Protection: requires valid admin session
  if (requiredRole === 'ADMIN') {
    if (!adminToken || !adminUser) {
      return <Navigate to="/login/admin" state={{ from: location }} replace />;
    }
    return children;
  }

  // Faculty Route Protection: requires valid faculty session
  if (requiredRole === 'FACULTY') {
    if (!facultyToken || !facultyUser) {
      return <Navigate to="/login/faculty" state={{ from: location }} replace />;
    }
    return children;
  }

  // Student Route Protection: requires valid student session
  if (requiredRole === 'STUDENT') {
    if (!studentToken || !studentUser) {
      return <Navigate to="/login/student" state={{ from: location }} replace />;
    }
    return children;
  }

  return children;
};
