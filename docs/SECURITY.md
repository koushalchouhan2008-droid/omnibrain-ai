# Security, privacy and deployment cautions

**Developer preview / MVP**. Audit and harden before serving untrusted internet traffic or sensitive corporate data.

## Built-in safeguards

- User passwords are salted and hashed using Node `scrypt`; no plaintext password storage.
- Session cookies are HttpOnly, SameSite=Lax; `Secure` in production; sessions are hashed in the database and expire after seven days.
- API keys are encrypted at rest with AES-256-GCM. Server master key is in `APP_ENCRYPTION_KEY` (production) or local `data/.development-key` (development).
- All saved chats and API credentials are associated with users; authentication checks apply per resource.
- No API keys are returned to the browser after saving. Connection verification is a real outgoing API request.
- Origin checks reject cross-origin browser writes. Includes CSP, no-sniff, no framing, and referrer policy headers.
- External hosts in provider adapters are hardcoded; no custom URL execution or arbitrary remote tool access.
- Search snippets and other model outputs are treated as untrusted input, not privileged instructions.
- User/chat text is set via DOM `textContent`; retrieved source links only use HTTP(S) targets.
- JSON bodies and prompts have size caps; request limits exist for login, register, chat and provider tests.

## High-priority hardening for real production

1. Use trusted HTTPS termination, an explicit canonical `ORIGIN`, encrypted backups, and a secret manager; rotate master key with a planned re-encryption procedure.
2. Add CSRF tokens/strict origin and trusted-proxy configuration, dedicated rate-limit store, account lockout, password reset, email verification, MFA and session revocation UI.
3. Introduce real structured audit log redaction, monitoring, metrics, privacy retention/export/delete policy and data processing agreements.
4. Add cost controls and resource quotas before allowing broad multi-model/long-running automation.
5. Test upstream provider responses and changes, approval gates for side effects, prompt-injection defenses and external content handling.
6. Run dependency scans, independent code review, abuse tests, accessibility audits, load testing and backup restoration drills.
7. Use PostgreSQL for multiple instances and Redis/queues for durable jobs. SQLite and in-memory throttling here are single-server choices.

## Critical key warning

**Never share your real provider API key in chat or commit it to source control.** The local development key in `data/.development-key` must stay secret. Losing this key makes existing encrypted credentials unreadable; leaking it plus the database can expose credentials. There is no password recovery/forgot-password workflow yet.

## Provider data sharing

Messages sent to a provider are processed by that provider. Manual mode sends messages only to explicitly selected connected models. Ultimate Brain sends the prompt to each selected model; its synthesizer may receive other providers' outputs. **Do not use Ultimate Brain for private data until you have reviewed each provider's privacy policy and permission scope.**
