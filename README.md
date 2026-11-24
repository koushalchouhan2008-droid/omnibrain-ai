# OMNIBRAIN AI — responsive cinematic edition (v0.1)

An **actual runnable web application** created from the included *OMNIBRAIN AI — Ultimate Master Build Prompt v2.0* (48 sections). This delivery focuses on a tested **Phase 0 / early Phase 1 MVP**, **not** the complete commercial AI operating system described in the 21-page PDF.

## November 2026 — Android + laptop UI update

The uploaded Android screenshot showed the main content being squeezed horizontally. The issue was caused by the mobile bottom navigation being a **flex sibling** of the main content (so it was placed at the right edge instead of being overlaid at the bottom). This edition fixes the layout with a fixed full-width mobile dock, correct content sizing, scrollable chat, mobile touch targets and readable composer fields.

This edition also includes **original locally bundled SVG fantasy scenery and a new emblem**, designed with cinematic dark-mountain and amber/moonlight aesthetics (inspired by the atmosphere of fantasy action games, not copied or licensed game artwork). The background works without loading any image from an external server. Existing chat, provider, auth and usage logic are kept; a small origin-check compatibility fix lets matching-host HTTPS reverse-proxy/tunnel sessions reach a local HTTP Node server. An explicitly configured `ORIGIN` stays strictly enforced.

Browser layout was inspected at **320×680, 360×780, 393×852, 768×1024 and 1366×768**. The Node automated suite passes. See `ANDROID-LAPTOP-SETUP-HINDI.txt` for phone/laptop instructions.

## Quick start — Windows, macOS, Linux

1. Install **Node.js 22.13+** (22.16 recommended): https://nodejs.org/
2. **Fully extract** the ZIP (do not run the .bat file inside the compressed ZIP).
3. On Windows, double-click **`START-WINDOWS.bat`**. It checks Node.js, selects a free port, verifies that the app responds, and tries to open your browser. On macOS/Linux, run **`npm run launch`** in the project folder. Advanced users may still use `npm start` to run the server directly.
4. On the **same computer**, open the URL printed in the terminal (normally **http://127.0.0.1:3000**). Keep the terminal running.
5. Register an account with a password of **at least 12 characters**.
6. Open **Connections**, securely save an API key for OpenAI, Gemini, Anthropic, DeepSeek, or Grok; optionally run **Test connection** to check the provider in real time.
7. Return to **AI Chat** and send a prompt. Use the **+** button to select models, or set **Smart Auto**.

**No npm install is required for this implementation**: it deliberately runs on Node.js built-in APIs so the MVP remains testable without a package registry. **Provider APIs require valid personal credentials and internet access.** AI usage may be billed by the provider. Never put keys in client JavaScript or commit `.env` files.

**Run the automated tests**:
```bash
npm test
npm run check
```

## Hindi / Hinglish startup

ZIP extract karo → PC/laptop par Node.js 22.13+ install karo → extracted folder mein **START-WINDOWS.bat** double-click karo → browser khulega (ya terminal mein dikhaya URL SAME PC par kholo). Account banao, phir **Connections** mein apni provider API key save karo. Uske baad chat use kar sakte ho. Bina real API key ke model se response generate nahi hoga. Ye Android APK nahi hai; ye responsive web application hai.

## Website not opening / error troubleshoot

- This ZIP contains a **local web application, not a publicly hosted website**. `127.0.0.1` means **the device you are using**. A `127.0.0.1` URL on an Android phone **cannot reach the server on your laptop**. To use a website from any phone, arrange a secure public hosting/deployment with HTTPS and a domain. Do not expose the development server to the public internet.
- **Site can't be reached / refused to connect:** launch the app first on the PC, keep the launcher open, and use its printed URL. If the server is stopped, the website will not load.
- **`node` is not recognized / Node version too old:** install Node.js 22.13 or newer and restart the terminal/PC.
- **`Cannot find module`:** fully extract the ZIP before starting; do not run the file inside a ZIP viewer.
- **Port 3000 busy:** the improved launcher automatically checks ports 3000–3009 and prints the chosen URL.
- **SQLite experimental warning:** the warning alone does not mean startup failed.
- **AI does not reply:** log in and configure a real provider API key under **Connections**, then test it. External provider access was not verified without credentials.

See the dedicated `OPEN-THIS-FIRST-HINDI.txt` included with the ZIP.

## What works in this release

| Area | Honest status | Notes |
| --- | --- | --- |
| Responsive dark/light UI | **Implemented** | Desktop + mobile, actual working navigation |
| Email/password sign-up and sign-in | **Implemented** | Scrypt password hashing, HttpOnly session cookies |
| Persistent chats and per-user isolation | **Implemented** | SQLite storage, history, delete conversation, JSON export |
| Encrypted user API keys | **Implemented** | AES-256-GCM encryption, per-user storage, never returned to browser |
| OpenAI-compatible chat | **Implemented; requires API key** | Real OpenAI, DeepSeek and Grok endpoints; token streaming |
| Gemini and Anthropic adapters | **Implemented; requires API key** | Real provider API requests, full-response output |
| Provider connection checks | **Implemented; requires internet/key** | Actual upstream API call; not marked verified by saving a key |
| Smart Auto / manual provider picker | **Implemented** | Manual scope strictly obeyed; Auto uses one connected provider |
| Multi-model execution and synthesis | **Implemented; requires >=2 API keys** | Ultimate Brain compares real responses, synthesizes using selected successful model |
| Brave live web search | **Implemented; requires Brave API key** | Actual search results passed as clearly labeled, untrusted source context |
| Chat streaming/cancellation | **Partially implemented** | SSE status and OpenAI-compatible token streaming; abort active tasks; other adapters use non-streaming calls |
| Activity and token usage | **Implemented** | Based on real provider usage when supplied; **no invented pricing** |
| Tests | **Implemented** | Unit, HTTP integration, mocked provider stream; see testing notes |
| Production-grade auth, compliance and infrastructure | **Partially implemented** | Hardening, external audit, MFA, key rotation, load tests still needed |
| OAuth app marketplace, MCP, file knowledge base | **Not yet implemented** | Reserved for later phases |
| Advanced research, agents, workflow automation | **Not yet implemented** | Reserved for later phases |
| Image/video creation, voice, native apps | **Not yet implemented** | Provider licensing, job processing and other work required |
| Full Next.js + strict TypeScript / Postgres / Redis target architecture | **Not implemented in this portable MVP** | PDF-target upgrade path documented below |

**Important:** Automated provider adapter tests use **mocked upstream HTTP** because this environment had no API keys and could not access the public package registry. No claim is made that real third-party provider responses were verified here. Run each provider's **Test connection** with your own credentials before using it.

## Repository map

```text
omnibrain-ai/
├─ server/
│  ├─ index.js          # HTTP start / shutdown
│  ├─ app.js            # Authenticated API, SSE, model routing, UI serving
│  ├─ providers.js      # Official provider adapters + Brave search
│  ├─ database.js       # SQLite schema and per-user data operations
│  ├─ crypto.js         # Password/session hashes, AES-256-GCM
│  └─ config.js         # Environment config, local dev encryption key
├─ web/
│  ├─ index.html        # Accessible, responsive interface
│  ├─ app.js            # Connected UX, SSE reader, secure DOM rendering
│  ├─ styles.css        # Responsive fantasy UI / mobile fixes
│  ├─ assets/           # Original cinematic landscape and emblem SVGs
│  ├─ manifest.webmanifest
│  └─ icon.svg
├─ tests/               # Unit + real local HTTP integration tests
├─ docs/                # Architecture, security, API, roadmap, test notes
├─ blueprint/           # User-supplied original PDF specification
├─ Dockerfile
├─ compose.yaml
├─ .env.example
└─ package.json
```

## Environment

To configure your local environment, optionally copy `.env.example` to `.env`. The `.env` file is ignored by Git. The development server generates and saves a local AES key under `data/.development-key` if one isn't supplied. **Do not delete this file while you have encrypted API keys in the database or those keys become unreadable. Back it up securely.**

For **production**, you **must** set `APP_ENCRYPTION_KEY` to a securely generated 32-byte key (64 hex characters), run behind HTTPS/reverse proxy, set a public `ORIGIN`, and protect access to the mounted database/storage. Production mode will refuse to start without the key.

```bash
# example generation (do NOT paste real generated key into public chat)
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set e.g. `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT=3000`, `APP_ENCRYPTION_KEY`, `ORIGIN=https://your-domain.example`. Docker Compose can be used after these are set.

## Limitations & next steps

This runnable MVP intentionally diverges from the PDF's final recommended Next.js/TypeScript/PostgreSQL/pgvector/Redis/BullMQ architecture. Installing or verifying those packages was blocked by unavailable npm registry access in this build environment. Instead, the **dependency-free Node.js 22 + SQLite modular monolith** enabled reliable executable code and tests. It is a developer foundation, **not a certified production launch**. Upgrade plan in [docs/ROADMAP.md](docs/ROADMAP.md).

See [docs/SECURITY.md](docs/SECURITY.md) before deployment. Consult the original PDF under `blueprint/` for the whole product specification.
