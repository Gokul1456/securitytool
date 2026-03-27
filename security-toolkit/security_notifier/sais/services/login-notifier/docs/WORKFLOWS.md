# Notification & Security Workflows

This file describes the main flows your backend will implement using `sendNotification` and the security helpers.  
You can paste these Mermaid diagrams into any Mermaid-compatible viewer (VS Code extension, Obsidian, Mermaid Live Editor) or recreate them in a tool like draw.io / Excalidraw.

---

## 1. General Notification Flow

Conceptual diagram for any business event (lead, admission, finance, system).

```mermaid
flowchart LR
    A[Any backend module<br/>(lead/admission/finance/etc.)]
    B[sendNotification({<br/>userId, title,<br/>message, type, metadata<br/>})]
    C[(PostgreSQL<br/>notifications table)]
    D[GET /api/notifications]
    E[Frontend UI<br/>Notification Center]

    A --> B
    B --> C
    C --> D
    D --> E

    C --- F[status: unread/read<br/>metadata: JSONB]
```

**Narrative**

- Any backend code that wants to notify a user calls `sendNotification`.
- The notification is stored in the `notifications` table with `status='unread'`.
- The frontend calls `GET /api/notifications` to render the notification center.
- When the user opens/reads it, the frontend calls `PATCH /api/notifications/:id/read`.

---

## 2. Security – Successful Login Flow

This shows how a normal successful login triggers security checks and, if needed, alerts.

```mermaid
flowchart LR
    A[User submits<br/>email + password]
    B[Auth route<br/>/login]
    C{Credentials valid?}
    D[Increment failed<br/>counter; 401]
    E[handleSuccessfulLoginSecurity({<br/>userId, ip, userAgent<br/>})]
    F[Detect new device / IP / location]
    G[logSecurityEvent()<br/>(e.g. NEW_DEVICE_LOGIN)]
    H[sendNotification()<br/>type: 'security']
    I[(security_events table)]
    J[(notifications table)]
    K[Issue session/JWT<br/>Login success response]

    A --> B --> C
    C -- no --> D
    C -- yes --> E --> F --> G --> I
    G --> H --> J
    E --> K
```

**Key points**

- `handleSuccessfulLoginSecurity`:
  - records the login in `security_events`
  - checks if IP/device/location is new
  - creates `NEW_DEVICE_LOGIN` / `NEW_IP_LOGIN` / `NEW_LOCATION_LOGIN` events
  - uses `sendNotification` to raise **security alerts** when needed.

---

## 3. Security – Failed Login & Brute Force Flow

This shows how repeated failures trigger a security notification.

```mermaid
flowchart LR
    A[User submits<br/>email + password]
    B[Auth route<br/>/login]
    C{Credentials valid?}
    D[Reset failed<br/>counter]
    E[handleFailedLoginSecurity({<br/>userId?, ip, userAgent,<br/>failedCountForThisUser<br/>})]
    F[logSecurityEvent()<br/>LOGIN_FAILED]
    G{failedCountForThisUser >= 5?}
    H[logSecurityEvent()<br/>MULTIPLE_FAILED_LOGINS]
    I[sendNotification()<br/>type: 'security']
    J[(security_events table)]
    K[(notifications table)]
    L[Return 401<br/>Invalid credentials]

    A --> B --> C
    C -- yes --> D
    C -- no --> E --> F --> J
    F --> G
    G -- yes --> H --> J
    H --> I --> K
    G -- no --> L
    I --> L
```

**Key points**

- For every failed attempt you:
  - log `LOGIN_FAILED` into `security_events`.
  - After N attempts (e.g. `>= 5`), log `MULTIPLE_FAILED_LOGINS` and send a security notification.
- This supports features like:
  - brute-force detection
  - account lockouts (you can extend logic to mark account locked and send `ACCOUNT_LOCKED` notifications).

