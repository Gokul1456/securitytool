# 🛡️ SAIS Full-Stack Security Demo – Setup Guide

This toolkit contains the **Secure Access Intelligence System (SAIS)** and a **Test Website** integrated with its security SDK. Follow this guide to set up the environment and run the full demo.

---

## 🚀 1. Prerequisites

Before starting, ensure your local development machine has:

- **Node.js**: v18.0 or higher ([Download](https://nodejs.org/))
- **Docker Desktop**: Required for microservices orchestration ([Get Docker](https://www.docker.com/products/docker-desktop/))
- **PostgreSQL**: v14+ running locally (default port 5432)
- **Python**: v3.9+ (for security scanning tools)
- **Git** (to manage versions)
- **PowerShell**: Built-in on Windows; used for automation scripts

---

## 🔧 2. Project Configuration

### A. Environment Variables
1. Navigate to `security_notifier/sais/services/login-notifier/`.
2. Copy `.env.example` to `.env` and fill in your values.
3. The root `start_sais_local.ps1` script sets all SAIS microservice env vars inline.

### B. Dependency Installation (Automated)
Run the provided repair/setup script from the project root:

```powershell
# From: c:\security toolkit\
.\full_demo_repair.ps1
```

This will:
- Kill any stale Node processes
- Run `npm install` for all 4 SAIS services + the shared package
- Start all SAIS microservices (ports 4000–4003)
- Install and start the Website backend (port 3000) and frontend (port 5173)

---

## 🐳 3. SAIS Microservices (Optional: Docker Mode)

The system can also run via Docker Compose for production-like environments:

1. Open Docker Desktop and ensure the engine is running.
2. Open a terminal in `security_notifier/sais/deploy`.
3. Run:
   ```bash
   docker compose --env-file ../../.env up -d --build
   ```
4. **Health Checks:**
   - Gateway:  `http://localhost:4000/health`
   - Core:     `http://localhost:4001/health`
   - Notifier: `http://localhost:4002/health`
   - Scanner:  `http://localhost:4003/health`

---

## 🌐 4. Quick Start (Local Mode)

```powershell
# From: c:\security toolkit\
.\full_demo_repair.ps1
```

Access the demo at:
- **Frontend UI**:  `http://localhost:5173`
- **Backend API**:  `http://localhost:3000`

Default login credentials:
- **Email**: `admin@demo.com`
- **Password**: `password123`

---

## 🧪 5. Security Feature Testing

### A. Malware File Detection
```powershell
# From: c:\security toolkit\Test Website\backend\
node -e "
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const form = new FormData();
form.append('file', fs.createReadStream('c:\\\\security toolkit\\\\Test Website\\\\test_virus_unique.txt'), { filename: 'test_virus_unique.txt' });
axios.post('http://localhost:3000/api/upload', form, { headers: form.getHeaders(), validateStatus: () => true })
  .then(r => console.log('HTTP', r.status, r.data));
"
```
**Expected:** `HTTP 403 { error: 'Malicious file detected. Upload blocked by SAIS.' }`

### B. Suspicious Login Detection (Tor)
```powershell
node -e "
const axios = require('axios');
axios.post('http://localhost:3000/api/auth/login',
  { email: 'admin@demo.com', password: 'password123' },
  { headers: { 'User-Agent': 'Mozilla/5.0 Firefox/115.0 Tor Browser' } }
).then(r => console.log(r.status, r.data));
" 
```
**Expected:** Login succeeds (UX preserved), but a **Risk Score 85** alert is generated in the background and appears on the dashboard.

### C. Brute-Force Detection
Send 5+ incorrect password attempts for any email — a **MULTIPLE_FAILED_LOGINS** security event and email alert are triggered automatically.

```powershell
for ($i=1; $i -le 6; $i++) {
    curl.exe -s -X POST -H "Content-Type: application/json" `
    -d '{\"email\": \"victim@demo.com\", \"password\": \"wrongpass\"}' `
    http://localhost:3000/api/auth/login
    Write-Host "Attempt $i done"
}
```

### D. Full End-to-End Test
```powershell
# From: c:\security toolkit\
node full_security_test.js
```

---

## 📧 6. Email Notifications (Demo Mode)

**No SMTP required for demo!** Every security alert that would normally send an email is saved locally at:

```
c:\security toolkit\last_email.html
```

Open this file in any browser to preview the premium dark-themed HTML email template. Two email types are supported:
- **Suspicious Login Detected** — triggered by high-risk logins (Risk > 50)
- **Too Many Failed Login Attempts** — triggered by brute-force (≥ 5 bad passwords)

To configure real email delivery, set `SMTP_*` variables in the login-notifier `.env` file.

---

## 🛠️ 7. Troubleshooting

If the project fails to start or services are stale:
```powershell
# From: c:\security toolkit\
.\full_demo_repair.ps1
```

---

## 📁 8. Key Files Reference

| File | Purpose |
|------|---------|
| `full_demo_repair.ps1` | One-click reset + start for all services |
| `start_sais_local.ps1` | Starts SAIS microservices (4000–4003) |
| `Test Website\start_demo.ps1` | Starts website backend + frontend |
| `full_security_test.js` | End-to-end virus + login security test |
| `trigger_suspicious_email.js` | Manually trigger a suspicious login email |
| `manual_alert.js` | Manually trigger a brute-force alert email |
| `last_email.html` | Latest generated security email preview |
| `Test Website\test_virus_unique.txt` | EICAR test file for malware scanning |

---

**Maintained by**: Antigravity Security Suite
