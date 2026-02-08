import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, userAPI, adminAPI } from '../services/api';
import socketService from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [originalAdminId, setOriginalAdminId] = useState(null);
  const [demoMode, setDemoMode] = useState(() => {
    // Initialize from localStorage
    const stored = localStorage.getItem('demoMode');
    return stored === 'true';
  });

  useEffect(() => {
    // Check if user is already logged in and restore session
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedOriginalAdminId = localStorage.getItem('originalAdminId');

      if (token) {
        try {
          // Fetch fresh user data from API to verify token and get latest profile
          const response = await userAPI.getProfile();
          const userData = response.data.user;

          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          socketService.connect(token);

          // Restore impersonation state if it exists
          if (storedOriginalAdminId) {
            setOriginalAdminId(parseInt(storedOriginalAdminId));
            setImpersonatedUser(userData);
          }
        } catch (error) {
          // Token is invalid or expired, clear localStorage
          console.error('Failed to restore session:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('originalAdminId');
          setUser(null);
          setImpersonatedUser(null);
          setOriginalAdminId(null);
        }
      }

      setLoading(false);
    };

    initializeAuth();
  }, []);

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      socketService.connect(token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed',
      };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token, user } = response.data;

      console.log('🔐 Login Response Debug:', {
        fullResponse: response.data,
        token: token.substring(0, 20) + '...',
        user,
        userIsAdmin: user.isAdmin,
        userEmail: user.email
      });

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      socketService.connect(token);

      console.log('✓ User state updated in AuthContext');

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('originalAdminId');
    localStorage.removeItem('demoMode');
    setUser(null);
    setImpersonatedUser(null);
    setOriginalAdminId(null);
    setDemoMode(false);
    socketService.disconnect();
  };

  const toggleDemoMode = () => {
    setDemoMode(prev => {
      const newValue = !prev;
      localStorage.setItem('demoMode', newValue);
      return newValue;
    });
  };

  const updateUser = async (data) => {
    try {
      const response = await userAPI.updateProfile(data);
      const updatedUser = response.data.user;

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update impersonated user if currently impersonating
      if (impersonatedUser && impersonatedUser.id === updatedUser.id) {
        setImpersonatedUser(updatedUser);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Update failed',
      };
    }
  };

  const impersonateUser = async (userId) => {
    try {
      const response = await adminAPI.impersonateUser(userId);
      const { token, user: targetUser, originalAdminId: adminId } = response.data;

      // Store original admin ID and token
      localStorage.setItem('originalAdminId', adminId);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(targetUser));

      setOriginalAdminId(adminId);
      setImpersonatedUser(targetUser);
      setUser(targetUser);

      // Reconnect socket with new token
      socketService.disconnect();
      socketService.connect(token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to impersonate user',
      };
    }
  };

  const stopImpersonation = async () => {
    try {
      const response = await adminAPI.stopImpersonation();
      const { token, user: adminUser } = response.data;

      // Clear impersonation state
      localStorage.removeItem('originalAdminId');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(adminUser));

      setOriginalAdminId(null);
      setImpersonatedUser(null);
      setUser(adminUser);

      // Reconnect socket with admin token
      socketService.disconnect();
      socketService.connect(token);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to stop impersonation',
      };
    }
  };

  const value = {
    user,
    loading,
    register,
    login,
    logout,
    updateUser,
    impersonateUser,
    stopImpersonation,
    isAuthenticated: !!user,
    isBrand: user?.role === 'brand',
    isAmbassador: user?.role === 'ambassador',
    isAdmin: user?.isAdmin || false,
    isPreview: user?.isPreview || false,
    isImpersonating: !!impersonatedUser && !!originalAdminId,
    impersonatedUser,
    demoMode,
    toggleDemoMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
