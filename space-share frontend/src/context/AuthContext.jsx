import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('profile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Re-fetch profile on initial mount if token exists
  useEffect(() => {
    const fetchMe = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data && response.data.data) {
          const { user: fetchedUser, profile: fetchedProfile } = response.data.data;
          setUser(fetchedUser);
          setProfile(fetchedProfile);
          localStorage.setItem('user', JSON.stringify(fetchedUser));
          localStorage.setItem('profile', JSON.stringify(fetchedProfile));
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
        // If 401 or failed, interceptor handles clearing
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { session, user: loggedUser, profile: loggedProfile } = response.data.data;
    const accessToken = session?.access_token;

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
    }
    if (loggedUser) {
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
    }
    if (loggedProfile) {
      localStorage.setItem('profile', JSON.stringify(loggedProfile));
      setProfile(loggedProfile);
    }

    return response.data;
  };

  const signup = async ({ email, password, full_name, phone, role }) => {
    const response = await api.post('/auth/signup', {
      email,
      password,
      full_name,
      phone,
      role: role || 'renter',
    });

    const { session, user: newUser, profile: newProfile } = response.data.data || {};
    const accessToken = session?.access_token;

    if (accessToken) {
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
    }
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    }
    if (newProfile) {
      localStorage.setItem('profile', JSON.stringify(newProfile));
      setProfile(newProfile);
    }

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('profile');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfileState = (updatedProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('profile', JSON.stringify(updatedProfile));
  };

  const role = profile?.role || 'renter';
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isRenter = role === 'renter';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        role,
        isOwner,
        isAdmin,
        isRenter,
        login,
        signup,
        logout,
        updateProfileState,
      }}
    >
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
