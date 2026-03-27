# 🐳 SAIS API - Docker Deployment Guide

The SAIS API is containerised for portability — no more manual Python or ClamAV setup.

## 🚀 Quick Run (Recommended)

One command to build and start the entire service:

```bash
docker-compose up --build
```

Wait for the "SAIS Listening" banner to appear on port `5000`.

---

## 🛠️ Build & Run (Manual)

### 1. Build the image
```bash
docker build -t sais-api .
```

### 2. Run the container
```bash
docker run -d -p 5000:5000 --name sais-api sais-api
```

---

## 🔍 Validation (Inside Container)

Check that the API is alive and responsive:

- **Liveness:** `http://localhost:5000/health`
- **Scanning:** Use the Postman collection provided in the root folder.

### View Logs
```bash
docker-compose logs -f
```

### Accessing Shell
```bash
docker exec -it sais-api-service bash
```

---

## 📦 Container Checklist

- ✅ **Node 18** (Bullseye-slim)
- ✅ **Python 3** installed
- ✅ **ClamAV** + **Freshclam** ready
- ✅ **Healthcheck** enabled (30s interval)
- ✅ **Port 5000** exposed
- ✅ **Auto-restart** on failure (via compose)

**The SAIS API is now production-portable.** 🚛
