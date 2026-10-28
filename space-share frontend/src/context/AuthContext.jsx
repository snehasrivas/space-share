import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const DEFAULT_GUEST_USER = {
  id: 'guest-explorer-id',
  email: 'guest@spaceshare.in',
  user_metadata: {
    full_name: 'Guest Explorer',
    role: 'owner',
  },
};

const DEFAULT_GUEST_PROFILE = {
  id: 'guest-explorer-id',
  full_name: 'Guest Explorer',
  email: 'guest@spaceshare.in',
  role: 'owner',
  avatar_url: '',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : DEFAULT_GUEST_USER;
    } catch {
      return DEFAULT_GUEST_USER;
    }
  });

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('profile');
      return saved ? JSON.parse(saved) : DEFAULT_GUEST_PROFILE;
    } catch {
      return DEFAULT_GUEST_PROFILE;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(false);

  // If real token exists, re-fetch profile on initial mount
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
        console.warn('Live session check failed, falling back to guest mode:', err);
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
    setUser(DEFAULT_GUEST_USER);
    setProfile(DEFAULT_GUEST_PROFILE);
  };

  const updateProfileState = (updatedProfile) => {
    setProfile(updatedProfile);
    localStorage.setItem('profile', JSON.stringify(updatedProfile));
  };

  const isGuest = !token || user?.id === 'guest-explorer-id';
  const role = profile?.role || 'owner';

  // In guest mode, unlock everything so user can freely explore all pages
  const isOwner = isGuest || role === 'owner';
  const isRenter = isGuest || role === 'renter';
  const isAdmin = isGuest || role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        role,
        isGuest,
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
