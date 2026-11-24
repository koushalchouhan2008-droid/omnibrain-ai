# Architecture and verified MVP boundaries

## Request path

```text
Browser (HTML/CSS/JS, same-origin, safe DOM rendering)
    ↓ authenticated fetch / SSE
Node 22 HTTP server [server/app.js]
    ├─ routes, validation, session/CSRF checks, per-user resource checks
    ├─ encrypted credential lookup → model routing
    ├─ provider adapter → official remote AI endpoint
    ├─ Brave search adapter → official search API (optional/explicit)
    └─ SQLite WAL database → users, sessions, credentials, chats, usage, audit
    ↓
SSE events: start | status | delta | provider | sources | final | error
```

### Primary components

- **Config:** `.env` supported without extra dependencies; development creates a persistent local encryption key; production refuses missing/invalid key.
- **Database:** SQLite WAL, foreign keys, transactions per statement, indexes, cascading deletes, persistent conversation/user data. Node 22 built-in `node:sqlite` API is experimental in this runtime. Large deployments should migrate to PostgreSQL/pgvector using checked migrations.
- **Auth:** scrypt with per-password salt, opaque 256-bit session tokens whose SHA-256 hashes are stored, HttpOnly/SameSite cookies, server-side expiration check.
- **Credential vault:** AES-256-GCM with unique random IV per key and a server-only encryption secret.
- **Adapters:** OpenAI, DeepSeek, Grok use chat-completion-compatible official APIs. Gemini and Anthropic have their respective request schemas. Search uses Brave's official API. Fixed hosts prevent user-supplied API base-url SSRF in the MVP.
- **Routing:** Auto selects the first available supported provider by explicit priority. Manual runs only selected connected providers. Ultimate Brain runs 2+ eligible selected providers, isolates failures, then attempts a real synthesis via an available model. Nothing is hardcoded as an AI answer.
- **Chat:** SSE status and token delta for OpenAI-compatible provider when one model is selected. Gemini/Anthropic currently return full responses. Multi-model output is delivered as a final synthesized answer; statuses stream in the meantime.
- **Client:** semantic HTML and CSS, no fake buttons, separate views for chat, connections, usage and settings, 700px mobile layout, light/dark theme preference.

## Data entities

`users`, `sessions`, `credentials`, `conversations`, `messages`, `usage`, `audit_events`. Every credential/conversation endpoint filters by authenticated `user_id`. Message access goes through a verified conversation owner. User credentials are never serialized into API responses.

## Reliability controls implemented / outstanding

Implemented: per-provider request timeout, request size limit, SSE errors, optional model failure isolation, cancellation, some in-memory request throttling, SQLite WAL + foreign keys, no fabricated completions, clear connection test status. Outstanding: durable background jobs, Redis/BullMQ, transactional idempotency for external side effects, circuit breakers, distributed throttling, provider Retry-After handling, dedicated monitoring, tested database restore, performance benchmarks, third-party security review.

## Design decisions

1. **Runnability first:** Dependency-free Node 22 + web UI. No Node packages could be downloaded in the build environment.
2. **No pretend integrations:** A user must supply keys for provider calls. A saved key is *not* a verified connection until an API test succeeds.
3. **No fake costs:** Show only provider-reported token numbers; leave monetary estimates unavailable.
4. **No premature monolithic 'agent':** Design modules permit later refactoring into packages and workers.
