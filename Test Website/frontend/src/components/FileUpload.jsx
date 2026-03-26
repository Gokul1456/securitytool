import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, XCircle, CheckCircle2, ShieldAlert, Cpu, FileCheck } from 'lucide-react';

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', msg: string }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
      const res = await axios.post(`${apiBase}/api/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus({ type: 'success', msg: res.data.message });
      setFile(null); // Clear on success
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Upload failed due to unknown error.' });
      setFile(null); // Clear infected file
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 className="page-title">Secure File Scanner</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>
          Initializing **Deep Packet Inspection** (DPI) for incoming binary streams.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ color: 'var(--accent)', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Scanner Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
                <div style={{ fontSize: '18px', fontWeight: '600' }}>Active Node</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                The SAIS Multi-Engine scanner is currently analyzing patterns from clamd-daemon using **Heuristic Signature Matching**.
            </div>
            <div style={{ marginTop: 'auto', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>ENGINE_ID:08X29</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} style={{ width: '10%', height: '4px', background: i < 5 ? 'var(--accent)' : 'rgba(255,255,255,0.1)', borderRadius: '2px' }}></div>
                    ))}
                </div>
            </div>
        </div>

        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', position: 'relative' }}>
            {uploading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255, 255, 255, 0.8)', zIndex: 10, borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                   <div className="stat-icon" style={{ width: '80px', height: '80px', background: 'rgba(37, 99, 235, 0.05)', marginBottom: '24px' }}>
                        <Cpu size={40} className="animate-spin" style={{ animationDuration: '3s' }} />
                   </div>
                   <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', letterSpacing: '2px', color: 'var(--text-main)' }}>ANALYZING PAYLOAD...</div>
                   <div style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'monospace' }}>DECRYPTING_STREAM :: SHA256_HASH_INIT</div>
                </div>
            )}

            <form onSubmit={handleUpload}>
            <div style={{ border: '2px dashed var(--glass-border)', borderRadius: '20px', padding: '60px 20px', marginBottom: '32px', background: 'rgba(255,255,255,0.02)', position: 'relative', cursor: 'pointer', transition: 'all 0.3s' }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                    onClick={() => document.getElementById('file-upload').click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]); setStatus(null); }}
            >
                <input 
                id="file-upload" 
                type="file" 
                onChange={handleFileChange} 
                style={{ display: 'none' }} 
                />
                
                {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ padding: '24px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', color: 'var(--success)' }}>
                        <FileCheck size={56} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{file.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Ready for Security Clearance ({(file.size / 1024).toFixed(2)} KB)</div>
                    </div>
                </div>
                ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div className="stat-icon" style={{ width: '80px', height: '80px' }}>
                        <UploadCloud size={40} />
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Drop Payload or Select Path</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>All objects scanned against ClamAV definitions</div>
                    </div>
                </div>
                )}
            </div>

            <button type="submit" className="btn" style={{ width: '100%', padding: '20px', fontSize: '15px' }} disabled={!file || uploading}>
                {uploading ? 'Scanning File...' : 'Upload & Scan File'}
            </button>
            </form>

            {status && (
            <div className="animate-fade-in" style={{
                marginTop: '32px',
                padding: '24px',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                background: status.type === 'error' ? '#fee2e2' : '#dafbe1',
                color: status.type === 'error' ? 'var(--danger)' : 'var(--success)',
                border: `1px solid ${status.type === 'error' ? 'rgba(207, 34, 46, 0.1)' : 'rgba(26, 127, 55, 0.1)'}`
            }}>
                {status.type === 'error' ? <ShieldAlert size={28} /> : <CheckCircle2 size={28} />}
                <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                        {status.type === 'error' ? 'THREAT INTERCEPTED' : 'FILE IS SAFE'}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.8 }}>{status.msg}</div>
                </div>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}

