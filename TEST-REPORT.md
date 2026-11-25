# Test report — v3.0 Ultimate

Environment: Node.js 22.16.0, Linux container. Original 12 tests passed before modifications; expanded suite includes 14 tests. HTTP requests use real local server and isolated SQLite. Provider tests stub remote HTTP responses and validate adapter request/response contracts, not live paid services.

- Startup: local Node server started; health route and HTTP integration tests.
- Authentication, session, per-user data isolation, encryption, ownership, credential storage, SSRF: automated regression tests.
- AI chat, streaming parser, multi-model and synthesis, research sources: mock-provider tests, no actual external model calls.
- Workspace agents, ordered automation run, website creation, Gmail confirmation: mock-provider tests.
- Knowledge text ingestion/retrieval, artifacts generation/edit/export logic, job polling/ownership, Free mode guard: tests.
- Google OAuth: state/PKCE scope and mock Drive callback/token/read tested. Real consent/callback, Gmail sending, Calendar and GitHub external API calls not tested without credentials.
- Media: real adapter code and error reporting implemented; no live image or video generated. Full media job flow unverified with real provider.
- Website ZIP signatures tested. No generated React/Next.js code execution.
- Build: static Netlify build with sample HTTPS backend URL; no live deploy, proxy cookie or custom-domain test. Netlify production configuration requires real backend URL and deployment validation.
- UI: syntax checked and responsive CSS present. Chromium local navigation was blocked in this environment; actual browser interaction/mobile visual verification not completed. Standalone HTML syntax checked, not live browser-tested.
- No security audit/penetration test or load test; no claim of production certification.

Run `npm run check` to repeat the suite, `OMNI_BACKEND_URL=https://example.com npm run build` to check static build, then follow deployment guide for real integration tests. See FEATURE-LIST.md for unsupported functionality.


## 404 repair verification
Node v22.16.0: `npm run check` passed all 16 tests, including real HTTP account registration/login, frontend auth controller with mocked DOM/network, and deployment build validation with mocked backend. Corrected database message order when timestamps tie. Full Chromium browser navigation was blocked by the execution environment policy; real Netlify/Render deployment and AI providers not tested.
