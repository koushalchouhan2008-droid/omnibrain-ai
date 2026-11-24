# Build verification report

Build date: 22 November 2026

- `node --check` applied to backend entry point, database, provider adapter, API router and browser client JavaScript.
- `npm test`: **10 passed, 0 failed** (crypto, SQL persistence, end-to-end local HTTP, streamed mocked OpenAI, mocked Gemini/OpenAI multi-model synthesis, Brave retrieval, authorization/CSRF and error paths).
- `curl http://127.0.0.1:3000/api/health`: returned 200 with `{ "ok": true }` from started Node server.
- Browser screenshot/E2E could not be executed because the test browser was blocked from navigating to localhost/file URLs by the execution environment's administrator; this is **not a browser-test pass**.
- No live third-party provider call, external credential validation, real AI inference, load test, PostgreSQL deployment, or production security audit was performed. API keys were not supplied, and npm registry access was unavailable.

API adapters were integration tested **with mocked upstream provider responses**. A user must test real connections using their own authorized keys, which the app never displays back to the browser.
