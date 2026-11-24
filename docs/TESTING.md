# Test execution and verification

Run `npm test` or `npm run check` from project root with Node 22.13+.

### Automated checks

- Secure password storage, verification, token hashing, AES-256-GCM roundtrip and tampering detection.
- SQLite persistence, message history, per-user resource isolation, key storage, usage accounting and cascading deletes.
- Provider contract and token accounting using **mocked upstream HTTP**.
- Split-chunk SSE parser and live server SSE flow with real HTTP, session cookies, registration, saved keys, streamed provider response, DB persistence, and token counts.
- CSRF origin rejection, missing-provider error and cross-account conversation authorization.
- Brave search result URL filtering and official fixed-host request contract (mocked upstream).

### Tests not executed/available here

- Live paid provider API calls: real keys were not supplied.
- Browser automation across device matrix / screen readers: not part of automated suite.
- Rate limiting under multiple processes; external outages and sustained load.
- Production HTTPS, Docker deployment on a target server, disaster recovery.
- All 48 PDF product sections: only stated MVP is implemented.

Record these as release blockers for production rather than assuming success.
