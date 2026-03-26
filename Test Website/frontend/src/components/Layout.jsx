import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, UploadCloud, AlertTriangle, LogOut } from 'lucide-react';

export default function Layout({ onLogout }) {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 12, height: 12, background: 'var(--accent)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent)' }}></div>
            SAIS Core
          </div>
        </div>
        <div className="nav-links" style={{ flex: 1 }}>
          <Link to="/dashboard" className={`nav-item ${path.includes('dashboard') ? 'active' : ''}`}>
            <LayoutDashboard size={20} style={{ marginRight: 12 }} /> Dashboard
          </Link>
          <Link to="/upload" className={`nav-item ${path.includes('upload') ? 'active' : ''}`}>
            <UploadCloud size={20} style={{ marginRight: 12 }} /> File Scanner
          </Link>
          <Link to="/alerts" className={`nav-item ${path.includes('alerts') ? 'active' : ''}`}>
            <AlertTriangle size={20} style={{ marginRight: 12 }} /> Security Alerts
          </Link>
        </div>
        <div className="nav-links" style={{ paddingBottom: '24px' }}>
          <div className="nav-item" onClick={onLogout} style={{ cursor: 'pointer' }}>
            <LogOut size={20} style={{ marginRight: 12 }} /> Logout
          </div>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
