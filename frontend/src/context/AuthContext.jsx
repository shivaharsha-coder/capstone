import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [facultyToken, setFacultyToken] = useState(null);
  const [facultyUser, setFacultyUser] = useState(null);
  const [studentToken, setStudentToken] = useState(null);
  const [studentUser, setStudentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize sessions from localStorage on mount
  useEffect(() => {
    try {
      const aToken = localStorage.getItem('smart_classroom_admin_token');
      const aUser = localStorage.getItem('smart_classroom_admin_user');
      const fToken = localStorage.getItem('smart_classroom_faculty_token');
      const fUser = localStorage.getItem('smart_classroom_faculty_user');
      const sToken = localStorage.getItem('smart_classroom_student_token');
      const sUser = localStorage.getItem('smart_classroom_student_user');

      if (aToken && aUser) {
        setAdminToken(aToken);
        setAdminUser(JSON.parse(aUser));
      }

      if (fToken && fUser) {
        setFacultyToken(fToken);
        setFacultyUser(JSON.parse(fUser));
      }

      if (sToken && sUser) {
        setStudentToken(sToken);
        setStudentUser(JSON.parse(sUser));
      }

      // Legacy fallback
      const legacyToken = localStorage.getItem('smart_classroom_token');
      const legacyUser = localStorage.getItem('smart_classroom_user');
      if (legacyToken && legacyUser) {
        const parsed = JSON.parse(legacyUser);
        if (parsed.role === 'ADMIN' && !aToken) {
          setAdminToken(legacyToken);
          setAdminUser(parsed);
          localStorage.setItem('smart_classroom_admin_token', legacyToken);
          localStorage.setItem('smart_classroom_admin_user', legacyUser);
        } else if (parsed.role === 'FACULTY' && !fToken) {
          setFacultyToken(legacyToken);
          setFacultyUser(parsed);
          localStorage.setItem('smart_classroom_faculty_token', legacyToken);
          localStorage.setItem('smart_classroom_faculty_user', legacyUser);
        } else if (parsed.role === 'STUDENT' && !sToken) {
          setStudentToken(legacyToken);
          setStudentUser(parsed);
          localStorage.setItem('smart_classroom_student_token', legacyToken);
          localStorage.setItem('smart_classroom_student_user', legacyUser);
        }
      }
    } catch (e) {
      console.error('Failed to parse cached session data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAdmin = async (login, password, rememberMe = false) => {
    const response = await api.post('/api/auth/admin/login', { login, password, remember_me: rememberMe });
    const data = response.data;
    setAdminToken(data.access_token);
    setAdminUser(data);
    localStorage.setItem('smart_classroom_admin_token', data.access_token);
    localStorage.setItem('smart_classroom_admin_user', JSON.stringify(data));
    localStorage.setItem('smart_classroom_token', data.access_token);
    localStorage.setItem('smart_classroom_user', JSON.stringify(data));
    return data;
  };

  const registerAdmin = async (registrationData) => {
    const response = await api.post('/api/auth/admin/register', registrationData);
    const data = response.data;
    setAdminToken(data.access_token);
    setAdminUser(data);
    localStorage.setItem('smart_classroom_admin_token', data.access_token);
    localStorage.setItem('smart_classroom_admin_user', JSON.stringify(data));
    localStorage.setItem('smart_classroom_token', data.access_token);
    localStorage.setItem('smart_classroom_user', JSON.stringify(data));
    return data;
  };

  const loginFaculty = async (login, password, rememberMe = false) => {
    const response = await api.post('/api/auth/faculty/login', { login, password, remember_me: rememberMe });
    const data = response.data;
    setFacultyToken(data.access_token);
    setFacultyUser(data);
    localStorage.setItem('smart_classroom_faculty_token', data.access_token);
    localStorage.setItem('smart_classroom_faculty_user', JSON.stringify(data));
    localStorage.setItem('smart_classroom_token', data.access_token);
    localStorage.setItem('smart_classroom_user', JSON.stringify(data));
    return data;
  };

  const loginStudent = async (login, password, rememberMe = false) => {
    const response = await api.post('/api/auth/student/login', { login, password, remember_me: rememberMe });
    const data = response.data;
    setStudentToken(data.access_token);
    setStudentUser(data);
    localStorage.setItem('smart_classroom_student_token', data.access_token);
    localStorage.setItem('smart_classroom_student_user', JSON.stringify(data));
    localStorage.setItem('smart_classroom_token', data.access_token);
    localStorage.setItem('smart_classroom_user', JSON.stringify(data));
    return data;
  };

  const logoutAdmin = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('smart_classroom_admin_token');
    localStorage.removeItem('smart_classroom_admin_user');
  };

  const logoutFaculty = () => {
    setFacultyToken(null);
    setFacultyUser(null);
    localStorage.removeItem('smart_classroom_faculty_token');
    localStorage.removeItem('smart_classroom_faculty_user');
  };

  const logoutStudent = () => {
    setStudentToken(null);
    setStudentUser(null);
    localStorage.removeItem('smart_classroom_student_token');
    localStorage.removeItem('smart_classroom_student_user');
  };

  const logout = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path.startsWith('/admin')) {
      logoutAdmin();
    } else if (path.startsWith('/faculty')) {
      logoutFaculty();
    } else if (path.startsWith('/student')) {
      logoutStudent();
    } else {
      logoutAdmin();
      logoutFaculty();
      logoutStudent();
      localStorage.removeItem('smart_classroom_token');
      localStorage.removeItem('smart_classroom_user');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/auth/me');
      const updated = response.data;
      if (updated.role === 'ADMIN') {
        const merged = { ...adminUser, ...updated };
        setAdminUser(merged);
        localStorage.setItem('smart_classroom_admin_user', JSON.stringify(merged));
      } else if (updated.role === 'FACULTY') {
        const merged = { ...facultyUser, ...updated };
        setFacultyUser(merged);
        localStorage.setItem('smart_classroom_faculty_user', JSON.stringify(merged));
      } else if (updated.role === 'STUDENT') {
        const merged = { ...studentUser, ...updated };
        setStudentUser(merged);
        localStorage.setItem('smart_classroom_student_user', JSON.stringify(merged));
      }
    } catch (e) {
      console.error('Failed to refresh user profile', e);
    }
  };

  // Determine active context based on current location
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAdminContext = path.startsWith('/admin') || path.startsWith('/login/admin');
  const isFacultyContext = path.startsWith('/faculty') || path.startsWith('/login/faculty');
  const isStudentContext = path.startsWith('/student') || path.startsWith('/login/student');

  let activeUser = null;
  let activeToken = null;

  if (isAdminContext) {
    activeUser = adminUser;
    activeToken = adminToken;
  } else if (isFacultyContext) {
    activeUser = facultyUser;
    activeToken = facultyToken;
  } else if (isStudentContext) {
    activeUser = studentUser;
    activeToken = studentToken;
  } else {
    activeUser = adminUser || facultyUser || studentUser;
    activeToken = adminToken || facultyToken || studentToken;
  }

  const contextValue = {
    // Active portal user & token
    user: activeUser,
    token: activeToken,
    loading,
    isAuthenticated: !!activeToken && !!activeUser,
    isAdmin: activeUser?.role === 'ADMIN',
    isFaculty: activeUser?.role === 'FACULTY',
    isStudent: activeUser?.role === 'STUDENT',

    // Role-specific sessions
    adminUser,
    adminToken,
    isAdminAuthenticated: !!adminToken && !!adminUser,

    facultyUser,
    facultyToken,
    isFacultyAuthenticated: !!facultyToken && !!facultyUser,

    studentUser,
    studentToken,
    isStudentAuthenticated: !!studentToken && !!studentUser,

    // Methods
    loginAdmin,
    registerAdmin,
    loginFaculty,
    loginStudent,
    logoutAdmin,
    logoutFaculty,
    logoutStudent,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
