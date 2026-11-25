# OMNIBRAIN AI 3.0 Ultimate — Arcane Intelligence

An upgrade of the supplied v2 project, not a new mockup. Dependency-free browser HTML/CSS/JavaScript and Node 22 HTTP API with SQLite. Original functionality is retained and new modes, knowledge retrieval, artifacts, additional integrations and Netlify support have been added.

## 404 signup repair
Read **START-404-FIX-HINDI.txt** first. The frontend now checks API availability before sending passwords, verifies the session after registration, and offers connection retry. The Netlify build validates the backend before producing its API proxy. Optional `render.yaml` config deploys the whole application as a single HTTPS service with a paid persistent disk. No live hosting has been configured.

## Start locally
Install Node.js **22.13+**, open a terminal in this directory and run `npm start`. Visit http://localhost:3000 and create your app account (a new password of at least 12 characters). Connect a provider using Connections Marketplace, enter your own API key and test it. Open `http://localhost:3000/standalone.html` for the single-file HTML edition. The standalone HTML opened from disk is an offline interface preview, not an independent AI service.

`npm run check` runs syntax checks and automated tests. No npm dependencies need installing. `npm run build` creates Netlify assets if `OMNI_BACKEND_URL` is set to a valid HTTPS backend origin. No API keys are bundled.

Read INSTALLATION-GUIDE.md, NETLIFY-DEPLOYMENT-GUIDE.md, API-SETUP-GUIDE.md, GOOGLE-OAUTH-SETUP.md, SECURITY-GUIDE.md, FEATURE-LIST.md and TEST-REPORT.md. See schema.sql for database structure. The original PDF blueprint is retained in blueprint/. Older v2 guides are historical and do not override these instructions.

## Important limits
This is an expanded functional foundation, not a complete replica of the named commercial platforms. Provider keys/quotas/billing and a persistent HTTPS backend are required for live online services. No live provider credentials were supplied. Read FEATURE-LIST.md for unsupported items and TEST-REPORT.md for verification scope.
