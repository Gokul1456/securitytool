# 🛡️ SAIS: Security-Assessment-Integrated-Suite
## Comprehensive Technical Architecture & System Specifications

### 1. Project Abstract
SAIS (Security-Assessment-Integrated-Suite) is an enterprise-grade, microservice-driven security middleware ecosystem. It is designed to be a "proactive defense layer" that can be integrated into any modern web application to provide real-time behavioral analysis, malware quarantine, and vulnerability detection. Unlike traditional firewalls, SAIS operates at the identity and application level, focusing on **Intent Detection** through specialized risk-scoring algorithms and deep-file inspection.

---

### 2. High-Level System Architecture

#### 2.1 API Gateway Service (Node.js/Express)
The Gateway is the unified entry point for all security-related traffic. It decouples the security logic from the client application while providing a unified interface (SDK endpoint).
- **Internal Security**: Implements HMAC-signed headers (`x-sais-internal-token`) for all service-to-service communication.
- **Dynamic Routing**: Uses `http-proxy-middleware` to distribute traffic to Core, Notifier, or Scanner services.
- **Observability**: Exports Prometheus-compatible metrics (`/metrics`) for real-time monitoring of security service health.

#### 2.2 SAIS Core: The Identity & Risk Engine (Node.js/Express)
The Core service is responsible for the behavioral assessment of every identity transaction.
- **Risk Scoring Algorithm**: Interrogates login attempts using geo-location, historical frequency, and user-agent fingerprints.
- **Identity Orchestration**: Manages the persistence of security profiles to PostgreSQL.
- **Anomalous Detection**: Flags high-risk patterns such as "Impossible Travel" (logins from geographically distant locations in a short timeframe).

#### 2.3 Login-Notifier: The Event Bus (Node.js/Redis)
A specialized service for asynchronous alerting and stateful brute-force tracking.
- **Redis Queue (BullMQ)**: Uses a persistent Redis store to manage the frequency of failed attempts globally.
- **Multi-Channel Delivery**: Features a flexible driver-based system for sending alerts to Email, Slack, or Discord.
- **Distributed State**: Ensures that rate-limiting persists even across multiple gateway instances.

#### 2.4 Security-Tools: Python-Based Scanning Suite
This service provides advanced threat detection capabilities using Python 3.11.
- **ClamAV Integration**: Performs deep scans on binary streams and file uploads.
- **Quarantine Management**: Automatically moves infected files to a separate, non-executable storage zone on the server.
- **Vulnerability Scanner**: A library of payloads (SQLi, XSS, SSRF, CORS) used to fuzzer test internal or external endpoints.

---

### 3. Detailed Technical Specifications

#### 3.1 Component Matrix
| Service | Language/Runtime | Port | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Gateway** | Node.js (v24) | 4000 | Routing, Proxying, Metrics |
| **Core** | Node.js (v24) | 4001 | Risk Scoring, Identity |
| **Notifier** | Node.js (v24) | 4002 | Alerting, Brute-Force |
| **Scanner** | Python (3.11) | 4003 | Malware/Vuln Scanning |
| **Demo App** | Node.js / React | 3000/5173 | UI Testing, Dashboard |

#### 3.2 Database Schema (PostgreSQL)
The persistence layer manages a normalized schema to track security history:
- `Users`: Identity records.
- `LoginLogs`: Tracking for IP, Browser, and Risk Scores.
- `Files`: Inventory of all uploads with a "Scan Status" (Clean/Infected).
- `Alerts`: High-risk events with severity levels (95 = Critical, 10 = Info).

#### 3.3 Security Protocols
- **HMAC Authentication**: Internal communication is validated via a `SHA-256` HMAC signed with a 32-character secret key.
- **CORS Whitelisting**: Strict origin-reflection check on the gateway layer.
- **Rate Limiting**: Distributed Sliding-Window algorithm via `rate-limit-redis`.

---

### 4. Integration Specifications (SAIS SDK)

The SAIS SDK is a middleware wrapper designed for Express. It allows for "Plug-and-Play" security without refactoring existing code.
- **Mechanism**: Captures the `res.on('finish')` event to asynchronously forward telemetry to the SAIS Gateway.
- **Data Points Collected**: IP Address, User-Agent, Device Information, Login Success/Failure Status, and Endpoint Latency.
- **Low Impact**: Telemetry is "fire-and-forget," adding <5ms of overhead to the host application's request cycle.

---

### 5. Deployment and DevOps

#### 5.1 Docker Orchestration
The entire suite is containerized using `docker-compose`. 
- **Volumes**: Persistent volumes for PostgreSQL data (`pgdata`) and ClamAV virus signatures.
- **Networks**: Isolated bridge network for internal microservice communication.

#### 5.2 Environment Configuration
Key environment variables required for activation:
- `SAIS_INTERNAL_API_KEY`: Secret used for service-to-service HMAC.
- `DATABASE_URL`: Connection string for PostgreSQL.
- `REDIS_URL`: Connection string for the event queue.
- `SAIS_SDK_API_KEYS`: Comma-separated list of authorized client keys.

---

### 6. Disaster Recovery & Failover
- **Quarantine Policy**: When an `INFECTED` file is detected, it is immediately unlinked from the primary upload path and moved to an isolated directory with zero execute permissions.
- **Service Resilience**: The API Gateway uses `opossum` for circuit-breaking to ensure the main application remains active even if the security scanner is undergoing updates or maintenance.
- **Backup**: PostgreSQL WAL (Write-Ahead Logging) for point-in-time recovery.

---

### 7. Governance and Audit
SAIS maintains a cryptographically signed audit trail of all security decisions. Every decision made by the Risk Engine is logged with a unique `x-request-id`, allowing security teams to retrace any flagged event back to the original client request.

---

**End of Document**
**Draft Date**: March 26, 2026
**Version**: 1.0.0 (Production Hardened)
