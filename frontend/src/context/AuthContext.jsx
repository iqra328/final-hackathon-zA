import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001/api').replace(/\/$/, '');

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // In AuthContext
const googleLogin = async (token, user) => {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    return { success: true };
  } catch (error) {
    console.error('Google login error:', error);
    return { success: false, error: error.message };
  }
};

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setToken(token);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (name, email, password, role = 'customer') => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, { 
        name, email, password, role 
      });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      setToken(token);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, register, logout, loading, token,
      isAuthenticated: !!user,
      isAgent: user?.role === 'agent' || user?.role === 'admin',
      isCustomer: user?.role === 'customer',
      isAdmin: user?.role === 'admin',
      isWorker: user?.role === 'worker',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};