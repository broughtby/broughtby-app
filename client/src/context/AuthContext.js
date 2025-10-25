import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, userAPI } from '../services/api';
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

  useEffect(() => {
    // Check if user is already logged in and restore session
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');

      if (token) {
        try {
          // Fetch fresh user data from API to verify token and get latest profile
          const response = await userAPI.getProfile();
          const userData = response.data.user;

          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          socketService.connect(token);
        } catch (error) {
          // Token is invalid or expired, clear localStorage
          console.error('Failed to restore session:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
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

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      socketService.connect(token);

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
    setUser(null);
    socketService.disconnect();
  };

  const updateUser = async (data) => {
    try {
      const response = await userAPI.updateProfile(data);
      const updatedUser = response.data.user;

      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Update failed',
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
    isAuthenticated: !!user,
    isBrand: user?.role === 'brand',
    isAmbassador: user?.role === 'ambassador',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
