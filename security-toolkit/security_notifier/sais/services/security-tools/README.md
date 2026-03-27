# 🔒 Security Tools

A suite of Python-based security tools for scanning uploaded files for malware and testing web application APIs for common vulnerabilities.

---

## 📁 Project Structure

```
security-tools/
├── malware_scanner.py   # ClamAV-based file scanner (multi-threaded, quarantine, VirusTotal)
├── scanner.py           # Web app vulnerability scanner (SQLi, XSS, SSRF, CORS, etc.)
├── requirements.txt     # Python dependencies
├── uploads/             # Folder for files to scan (kept in repo via uploads/.gitkeep)
├── quarantine/          # Auto-created: infected files are moved here (ignored by git)
├── scan_report.json     # Auto-generated after each scan (ignored by git)
└── scan_report.txt      # Auto-generated after each scan (ignored by git)
```

---

## ⚙️ Setup

### 1. Prerequisites

- Python 3.11+
- [ClamAV](https://www.clamav.net/) installed and `clamscan` in PATH
  - **Ubuntu/Debian:** `sudo apt install clamav && sudo freshclam`
  - **macOS:** `brew install clamav`
  - **Windows:** [Download ClamAV](https://www.clamav.net/downloads)

#### Windows note: database directory

If `clamscan` fails with a database path error, set the database directory explicitly:

```bash
# Windows PowerShell (example)
$env:CLAMAV_DB = "C:\\ProgramData\\ClamAV\\db"
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. (Optional) VirusTotal API Key

Set your API key as an environment variable to enable hash lookups:

```bash
# Linux / macOS
export VT_API_KEY="your_api_key_here"

# Windows PowerShell
$env:VT_API_KEY = "your_api_key_here"
```

---

## 🦠 malware_scanner.py — Usage

Scans all files in a folder using ClamAV. Infected files are quarantined automatically.

```bash
# Basic usage (scans ./uploads/ by default)
python malware_scanner.py

# Custom folder
python malware_scanner.py /path/to/folder

# All options
python malware_scanner.py uploads/ \
  --quarantine quarantine/ \
  --report scan_report \
  --max-size 100 \
  --workers 8 \
  --verbose
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `folder` | `uploads/` | Directory to scan |
| `--quarantine` | `quarantine/` | Where to move infected files |
| `--report` | `scan_report` | Report file prefix (produces `.json` + `.txt`) |
| `--max-size` | `50` | Max file size in MB |
| `--workers` | `4` | Parallel scan threads |
| `--verbose` | off | Enable DEBUG logging |

### What it checks

- ✅ SHA-256 hash (audit trail)
- ✅ File-type via magic bytes (EXE, ELF, ZIP, PDF, scripts)
- ✅ File size enforcement
- ✅ ClamAV deep scan (exit-code based)
- ✅ VirusTotal hash lookup (if API key set)
- ✅ Auto-quarantine infected files

---

## 🌐 scanner.py — Usage

Scans web application API endpoints for security vulnerabilities.

```bash
# Basic usage (targets http://localhost:3000 by default)
python scanner.py

# Custom target
python scanner.py --url http://myapp.com

# Skip specific test modules
python scanner.py --url http://myapp.com --skip rate methods

# All options
python scanner.py \
  --url http://localhost:3000 \
  --report scan_report \
  --burst 30 \
  --verbose
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--url` | `http://localhost:3000` | Base URL to scan |
| `--report` | `scan_report` | Report prefix |
| `--burst` | `20` | Requests for rate-limit test |
| `--verbose` | off | Enable DEBUG logging |
| `--skip` | none | Skip modules: `sql xss cmd path ssrf auth cors rate methods chatbot` |

### Test Modules

| Module | What it tests |
|--------|--------------|
| `sql` | SQL Injection (7 payloads + blind time-based) |
| `xss` | Cross-Site Scripting (5 payloads, reflection check) |
| `cmd` | Command Injection (6 payloads) |
| `path` | Path Traversal (4 payloads) |
| `ssrf` | Server-Side Request Forgery (AWS metadata, localhost) |
| `auth` | Auth bypass + missing authentication |
| `cors` | CORS misconfiguration (wildcard, origin reflection) |
| `rate` | Rate limiting (burst test, expects 429) |
| `methods` | HTTP method fuzzing (GET/POST/PUT/DELETE/PATCH) |
| `chatbot` | Prompt injection + sensitive data filter |

---

## 🧩 security_suite.py — Run both scanners together

`security_suite.py` orchestrates **both**:

- The malware file scan over an uploads folder, and
- The web/API security scan against a base URL.

```bash
# Scan ./uploads/ for malware + http://localhost:3000 for web vulns
python security_suite.py

# Custom uploads folder and URL, with custom report prefix
python security_suite.py \
  --uploads uploads \
  --url http://myapp.local \
  --report my_security_scan
```

This produces:

- `my_security_scan_files.json` / `.txt` — file malware scan
- `my_security_scan_web.json` / `.txt` — web/API findings
- `my_security_scan_suite.json` — combined high-level JSON for both

## 🔗 Web App Integration

### Option A: Use the included demo website (Flask)

This repository includes a small web UI that lets you upload a document and scans it immediately.

```bash
# Install deps
pip install -r requirements.txt

# Run the website (http://127.0.0.1:5000)
python app.py
```

Notes:
- Uploads are stored under `uploads/` and scanned via `malware_scanner.scan_file()`.
- Infected files are moved to `quarantine/`.
- The app enforces the same max size limit as `malware_scanner.py` (default: 50 MB).

### Option B: Integrate into your own app — File Upload Endpoint

```python
from malware_scanner import scan_file

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    dest = f"uploads/{file.filename}"
    file.save(dest)

    result = scan_file(dest, upload_folder="uploads", quarantine_dir="quarantine")

    if result["status"] == "INFECTED":
        return {"error": "File rejected: malware detected"}, 400

    return {"message": "Upload successful", "sha256": result["sha256"]}, 200
```

### scanner — CI/CD Pipeline

Run `scanner.py` against your staging environment before every deployment.
See `.github/workflows/security.yml` in this repository.

---

## 📊 Reports

After each run, two report files are generated:

- `scan_report.json` — machine-readable, suitable for dashboards / SIEM tools
- `scan_report.txt` — human-readable summary

---

## ⚠️ Disclaimer

These tools are intended for use on systems you own or have explicit permission to test.
Unauthorized scanning is illegal.
