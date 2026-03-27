import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import Alerts from './components/Alerts';
import Layout from './components/Layout';

const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // ignore storage failures so UI still works
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore storage failures so UI still works
    }
  }
};

function App() {
  const [session, setSession] = useState(() => {
    const saved = storage.get('sais_session');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (!parsed?.token || !parsed?.user?.id) return null;
      return parsed;
    } catch {
      // Prevent white screen when stale/corrupt storage exists.
      storage.remove('sais_session');
      return null;
    }
  });

  useEffect(() => {
    if (session?.token) {
      axios.defaults.headers.common.Authorization = `Bearer ${session.token}`;
    } else {
      delete axios.defaults.headers.common.Authorization;
    }
  }, [session]);

  const handleLogin = (authData) => {
    const nextSession = { user: authData.user, token: authData.token };
    setSession(nextSession);
    storage.set('sais_session', JSON.stringify(nextSession));
  };

  const handleLogout = () => {
    setSession(null);
    storage.remove('sais_session');
    delete axios.defaults.headers.common.Authorization;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} />
        
        <Route path="/" element={session ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="upload" element={<FileUpload user={session?.user} />} />
          <Route path="alerts" element={<Alerts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
