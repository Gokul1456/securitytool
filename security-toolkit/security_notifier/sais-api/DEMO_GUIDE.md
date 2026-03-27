# 🚀 SAIS API - Demo Execution Guide

This guide provides everything you need to demonstrate the **Secure Access Intelligence System (SAIS)**.

---

## 🛠️ 1. Setup & Preparation

### Create Test Files
Run these commands in your terminal (already done for you in the `demo-assets/` folder):

1. **clean.txt**: `echo "This is a safe file content for the SAIS demo." > demo-assets/clean.txt`
2. **virus.txt**: `echo "MZ fake virus content with magic bytes header." > demo-assets/virus.txt`

### Import Postman Collection
1. Open **Postman**.
2. Click **Import** (top left).
3. Select `SAIS_Postman_Collection.json` from the `sais-api/` directory.

---

## 🎬 2. Step-by-Step Demo Script

| Step | Action | Script / Narrative | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Liveness** | Run `01 - Health Check` | "First, let's verify the SAIS API is alive and healthy. It returns the system uptime and version." | **HTTP 200** with `status: ok` |
| **2. Risk Engine** | Run `02 - Suspicious Login` | "Notice multiple risk factors (new device, failed attempts). The risk engine calculates a score of 70 and flags an alert." | **HTTP 200** with `alert: true` |
| **3. Risk Engine** | Run `03 - Normal Login` | "A standard login from a known device returns a zero risk score. No alerts triggered." | **HTTP 200** with `alert: false` |
| **4. Safe Scan** | Run `04` (attach `clean.txt`) | "Now let's scan a safe file. The API processes the buffer, calls the AI scanner, and returns a 'clean' verdict." | **HTTP 200** with `status: clean` |
| **5. Threat Scan** | Run `05` (attach `virus.txt`) | "Finally, let's upload a malicious file. Even if hidden as a .txt, SAIS detects the internal MZ magic bytes." | **HTTP 422** with `status: infected` |

---

## 💻 3. Quick cURL Commands

### Health Check
```bash
curl -X GET http://localhost:5000/health \
     -H "Accept: application/json"
```

### Suspicious Login
```bash
curl -X POST http://localhost:5000/auth/analyze \
     -H "Content-Type: application/json" \
     -d '{"newDevice":true,"newLocation":true,"failedAttempts":3,"oddTime":true}'
```

### File Upload (Clean)
```bash
curl -X POST http://localhost:5000/scan/file \
     -F "file=@demo-assets/clean.txt"
```

### File Upload (Malicious)
```bash
curl -X POST http://localhost:5000/scan/file \
     -F "file=@demo-assets/virus.txt"
```

---

## 🔍 4. Troubleshooting Guide

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **404 Not Found** | Wrong URL or Method | Verify you are using `POST` for `/scan` and `/auth`. |
| **413 Too Large** | File > 10MB | Use smaller test files (like the provided ones). |
| **500 Error** | Python/Path Issue | Check the server console logs for exact trace. |
| **No Response** | Server Offline | Run `npm start` in the `sais-api/` directory. |
| **Rate Limited** | >100 req / min | Wait 60 seconds for the window to reset. |

---

**System is Demo Ready!** 🟢
