## Secure Access Intelligence System (SAIS)

Production-ready, multi-service security platform that centralizes login telemetry, risk scoring, alerts, and vulnerability scanning.

### Folder structure (current)

- **`api-gateway/`**: Central entrypoint. Routes:
  - `/auth/*` → `sais-core`
  - `/notify/*` → `login notifier`
  - `/scan/*` → `security-tools`
- **`sais-core/`**: Auth telemetry + risk scoring + admin risk endpoint
- **`login-notifier/`**: Notification + security-event service (now also accepts internal SAIS alerts)
- **`security-tools/`**: Python scanners + Node REST wrapper (`server.js`)
- **`shared/`**: Shared config/db/logging/auth helpers
- **`sais-sdk/`**: Mountable middleware SDK for any Node app

### Integration flow (high level)

- External app mounts SDK: `app.use(require("sais-sdk")(API_KEY))`
- SDK detects login endpoints and POSTs telemetry to:
  - `POST /auth/telemetry/login` (via `api-gateway`)
- `sais-core` computes **risk score (0–100)** and stores a `login_events` row.
- If **riskScore > 50**, `sais-core` sends an internal alert to `login notifier`:
  - `POST /internal/alerts` (authenticated by `SAIS_INTERNAL_API_KEY`)
- `login notifier` stores a `notifications` row and `security_events` row.

### Running with Docker

1. Copy env and set secrets.

```bash
copy .env.example .env
```

2. Start services.

```bash
docker compose up --build
```

3. Health checks:
  - Gateway: `GET http://localhost:4000/health`
  - Core: `GET http://localhost:4001/health`
  - Notifier: `GET http://localhost:4002/health`
  - Tools: `GET http://localhost:4003/health`

### Database schema

- Single source of truth: `shared/db/schema.sql`

### “Remove node_modules” note

This repo contains `node_modules/` folders; they should be deleted and always installed via `npm install` (they’re now ignored via `.gitignore`).

