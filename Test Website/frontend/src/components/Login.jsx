import React, { useState } from 'react';
import axios from 'axios';
import { ShieldAlert, ShieldCheck, Lock, Terminal } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suspicious, setSuspicious] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuspicious(false);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
      const res = await axios.post(`${apiBase}/api/auth/login`, { email, password });
      
      if (res.data.suspicious) {
        setSuspicious(true);
        setTimeout(() => {
          onLogin(res.data.user);
        }, 3000);
      } else {
        onLogin(res.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Access Denied: Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '48px', width: '100%', maxWidth: '460px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px', color: 'rgba(255,255,255,0.05)' }}>
            <Terminal size={120} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ padding: '16px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)' }}>
                <ShieldCheck size={48} />
            </div>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px' }}>SAIS Gateway</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Alpha_Secure_Vector :: 0.9.1</p>
        </div>

        {error && (
            <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '13px', border: '1px solid var(--danger)', textAlign: 'center', fontWeight: '600' }}>
                {error}
            </div>
        )}
        
        {suspicious && (
          <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '20px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', border: '1px solid var(--danger)', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 0 20px var(--danger-glow)' }}>
            <ShieldAlert size={32} />
            <div style={{ textAlign: 'left' }}>
              <strong style={{ display: 'block', marginBottom: '2px' }}>THREAT DETECTED</strong>
              <p style={{ fontSize: '12px', opacity: 0.8 }}>Anomaly detected in login environment. Vector isolated and reported to SAIS Core.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Terminal size={14} /> Email Address
            </label>
            <input 
              type="email" 
              className="input-field" 
              placeholder="operator@sais.internal"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                <Lock size={14} /> Access Key
            </label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••••••"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', height: '56px', marginTop: '12px', fontSize: '15px' }} disabled={loading}>
            {loading ? 'Analyzing Login...' : 'Secure Login'}
          </button>
        </form>

        <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '24px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                System Secured by **DeepMind SAIS**
            </div>
        </div>
      </div>
    </div>
  );
}

