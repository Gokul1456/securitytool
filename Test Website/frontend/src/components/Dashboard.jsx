import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Users, ShieldAlert, Cpu, Download, Globe, ShieldCheck } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState({ logs: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditFinished, setAuditFinished] = useState(false);

  const handleAudit = () => {
    setIsAuditing(true);
    setAuditFinished(false);
    
    // Simulate deep system scan
    setTimeout(() => {
        setIsAuditing(false);
        setAuditFinished(true);
        // Reset message after 5 seconds
        setTimeout(() => setAuditFinished(false), 5000);
    }, 3000);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live polling for demo
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:3000/api/dashboard');
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const avgRisk = data.logs.length 
    ? (data.logs.reduce((acc, l) => acc + (l.risk_score || 0), 0) / data.logs.length).toFixed(1) 
    : 0;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Command Intelligence</h1>
        <div style={{ 
            padding: '8px 20px', 
            background: '#dcfce7', 
            borderRadius: '100px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '12px', 
            color: '#15803d',
            fontWeight: '700',
            border: '1px solid rgba(22, 163, 74, 0.2)',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.1)'
        }}>
          <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' }}></div>
          All Systems Operational
        </div>
      </div>
      
      <div className="card-grid" style={{ marginBottom: '48px' }}>
        {/* Risk Index Card - Azure Aura */}
        <div className="glass-panel stat-card" style={{ position: 'relative', overflow: 'hidden', padding: '40px' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0, 102, 255, 0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
          <div className="stat-icon" style={{ position: 'relative', zIndex: 1 }}>
            <Activity size={28} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>System Risk Index</div>
            <div style={{ fontSize: '42px', fontWeight: '950', color: 'var(--text-main)', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {avgRisk} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>/ 100</span>
            </div>
          </div>
        </div>

        {/* Security Nodes Card - Emerald Aura */}
        <div className="glass-panel stat-card" style={{ position: 'relative', overflow: 'hidden', padding: '40px' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(0, 217, 166, 0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
          <div className="stat-icon" style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg, rgba(0, 217, 166, 0.1), rgba(0, 217, 166, 0.05))', color: 'var(--success)' }}>
            <Users size={28} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Security Nodes</div>
            <div style={{ fontSize: '42px', fontWeight: '950', color: 'var(--text-main)' }}>{data.logs.length}</div>
          </div>
        </div>

        {/* Neural Scans Card - Lavender Aura */}
        <div className="glass-panel stat-card" style={{ position: 'relative', overflow: 'hidden', padding: '40px' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(160, 100, 255, 0.1) 0%, transparent 70%)', zIndex: 0 }}></div>
          <div className="stat-icon" style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(135deg, rgba(160, 100, 255, 0.1), rgba(160, 100, 255, 0.05))', color: '#a064ff' }}>
            <Cpu size={28} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>Neural Scans</div>
            <div style={{ fontSize: '42px', fontWeight: '950', color: 'var(--text-main)' }}>{data.files.length}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <div className="glass-panel" style={{ padding: '40px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '8px', height: '24px', background: 'var(--accent)', borderRadius: '4px' }}></div>
                Activity Intel
            </h2>
            {loading ? <p>Synchronizing data streams...</p> : (
                <table className="table">
                <thead>
                    <tr>
                    <th>Timestamp</th>
                    <th>Network Node</th>
                    <th>Threat Origin</th>
                    <th>Risk Index</th>
                    </tr>
                </thead>
                <tbody>
                    {data.logs.slice(0, 8).map((log, i) => (
                    <tr key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <td style={{ fontSize: '13px', fontWeight: '700' }}>{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'LIVE'}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '13px' }}>{log.ip || log.node_ip || '127.0.0.1'}</td>
                        <td style={{ fontSize: '13px', fontWeight: '600' }}>{log.location || log.origin || 'Main Cluster'}</td>
                        <td>
                        <span className={`badge ${log.risk_score > 70 ? 'danger' : log.risk_score > 30 ? 'warning' : 'success'}`}>
                            {log.risk_score > 70 ? 'ALERT' : log.risk_score > 30 ? 'CAUTION' : 'SAFE'}
                        </span>
                        </td>
                    </tr>
                    ))}
                    {data.logs.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>Waiting for telemetry...</td></tr>}
                </tbody>
                </table>
            )}
        </div>
      </div>


      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '24px' }}>Latest Defense Scans</h2>
        {loading ? <p>Loading sensor data...</p> : (
            <table className="table">
            <thead>
                <tr>
                <th>Resource Name</th>
                <th>Classification</th>
                <th>Scan Time</th>
                <th>Operational Action</th>
                </tr>
            </thead>
            <tbody>
                {data.files.map((file, i) => (
                <tr key={i}>
                    <td style={{ fontWeight: '600' }}>{file.filename}</td>
                    <td>
                    <span className={`badge ${file.status === 'clean' ? 'success' : 'danger'}`}>
                        {file.status === 'clean' ? 'Safe' : 'Threat Detected'}
                    </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(file.uploaded_at).toLocaleString()}</td>
                    <td>
                    {file.status === 'clean' ? (
                        <a 
                        href={`http://127.0.0.1:3000/api/files/${file.id || file._id}/download`} 
                        download={file.filename.replace(/^\d+-/, '')}
                        className="btn"
                        style={{ padding: '6px 14px', fontSize: '11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                        <Download size={14} /> Download
                        </a>
                    ) : (
                        <span style={{ color: 'var(--danger)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Quarantined</span>
                    )}
                    </td>
                </tr>
                ))}
                {data.files.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No defense scans on record</td></tr>}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
}

