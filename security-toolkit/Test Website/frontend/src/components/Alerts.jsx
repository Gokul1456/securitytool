import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertOctagon, Terminal, ShieldAlert } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 3000); // live reload
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get('/api/alerts');
      setAlerts(Array.isArray(res.data?.alerts) ? res.data.alerts : []);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="page-title">Real-Time Security Alerts</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        Incident logs broadcasted from SAIS Notifier Integration Endpoint.
      </p>

      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Terminal size={18} />
          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', letterSpacing: '2px', color: 'var(--danger)' }}>SAIS NOTIFIER FEED</span>
        </div>
        
        <div style={{ padding: '24px', flex: 1, fontFamily: 'monospace', color: 'var(--text-main)', background: '#0a0a0f', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ opacity: 0.5, animation: 'pulse 1.5s infinite' }}>Establishing connection to SAIS Gateway...</div>
          ) : (
            alerts.length === 0 ? (
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={16} /> [SYSTEM CLEAR] No security alerts in the current timeframe.
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="animate-fade-in" style={{ 
                  background: 'rgba(239, 68, 68, 0.05)', 
                  borderLeft: '4px solid var(--danger)', 
                  padding: '16px', 
                  borderRadius: '0 8px 8px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <AlertOctagon color="var(--danger)" size={24} />
                    <div>
                      <div style={{ color: 'var(--danger)', fontWeight: 'bold', marginBottom: '4px' }}>{alert.message}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        TIME: {alert?.created_at ? new Date(alert.created_at).toISOString() : 'N/A'} | MODULE: Auth_Analyzer
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'right', marginBottom: '4px' }}>RISK SCORE</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--danger)' }}>{alert.risk_score}</div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}
