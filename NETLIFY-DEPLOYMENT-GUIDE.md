# Netlify deploy guide (Hindi/Hinglish)

## 404 repair (read first)
See START-404-FIX-HINDI.txt. Do not upload raw web/ or standalone.html to Netlify as the live app. Build now requires a reachable OMNIBRAIN backend and verifies `/api/health` and `/api/v1/me` before generating `_redirects`. The auth UI will block account submission if the backend cannot be reached and allow a retry.

## Architecture samjho
Netlify frontend host karega; Node/SQLite server ek persistent machine/container par chalega. Netlify ki ephemeral functions par SQLite file, long-lived timers aur media store reliable nahi hain. Isliye frontend proxy + persistent backend use kiya hai. Netlify's proxy timeout is 26 seconds, so long requests use submit/poll jobs. The included Netlify function is a deployment status endpoint, not the application backend. One backend instance is required. No guarantee of a perpetually free persistent host.

## Steps
1. ZIP extract karo. Node 22.13+ install karo, `npm run check` local chalao.
2. https://github.com par free account banao. New private repository create karo. Project ki files (package.json, web, server, scripts, netlify.toml etc.) upload karo, `.env`, `data`, `dist`, `node_modules` nahi. Git CLI or GitHub Desktop use kar sakte ho.
3. Persistent Node hosting choose karo: apna always-on computer + trusted HTTPS reverse proxy/tunnel, or a container/VPS host with persistent volume. Host par same repository checkout karo, Node 22+ install karo, `npm start` set karo. Dockerfile bhi available hai. Free-tier conditions and sleeping behavior provider par depend karte hain.
4. Backend variables secure dashboard ya environment mein set karo: `NODE_ENV=production`, `HOST=0.0.0.0` (or 127.0.0.1 with local ingress), `PORT=3000` (host-specific), `DB_DIR=/persistent/data`, `APP_ENCRYPTION_KEY` (generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`). Key ko private rakho aur permanently preserve karo. HTTPS backend URL open karke `/api/health` check karo.
5. https://app.netlify.com par account create karo, Add new project > Import existing project > GitHub > select repo. Base directory blank/root, build command `npm run build`, publish directory `dist`, Node version 22. netlify.toml already configured hai.
6. Netlify environment variables mein `OMNI_BACKEND_URL=https://your-real-backend.example` set karo (no trailing paths; HTTPS origin). Ismein secret/API key mat dalo. Deploy project. Netlify will create a `*.netlify.app` URL.
7. Backend environment mein `ORIGIN=https://your-project.netlify.app` exact frontend URL set karo and backend restart karo. Backend direct UI writes with different Origin will then be blocked, by design. Production cookies require HTTPS. Visit frontend, register and test login, connections and chat.
8. SQLite automatic create/migrate hoti hai. Ensure `DB_DIR` persistent writable disk hai; backup DB and encryption key together. Netlify Database/Postgres migration is not implemented.
9. Google OAuth: GOOGLE-OAUTH-SETUP.md follow karo. Callback URI uses Netlify frontend origin because session cookies are scoped there. Restart backend after setting env.
10. Automations: Automation sidebar mein interval and steps choose karo; enable schedule. Persistent server timer checks due workflows every 15 seconds. Browser band ho sakta hai, server nahi. If server sleeps, schedules won't execute until it wakes; only one overdue run is caught up. No Netlify cron is required for this architecture.
11. Future updates: GitHub repo push karo, Netlify auto builds; backend ko independently update/restart karo. Database and key preserve karo.
12. Manual deployment: local terminal mein `OMNI_BACKEND_URL=https://your-backend.example npm run build` (PowerShell: `$env:OMNI_BACKEND_URL='https://your-backend.example'; npm run build`). Netlify Drop par `dist/` folder upload karo. Configure exact ORIGIN on backend. Manual upload is frontend only and doesn't deploy the included status function; use GitHub build for functions.
13. Troubleshoot: 404 = correct dist and _redirects; build error = missing backend URL or outdated Node; 502/504 = backend offline/timeout; 403 = exact ORIGIN mismatch; 401 = sign in, HTTPS/cookie issue; Google redirect mismatch = exact URI; 429 = application/provider throttling; failed generation = check model, key and quota. Check Netlify deploy logs and backend logs without sharing secrets.

## Free-tier check (25 Nov 2026)
Official Netlify docs describe 300 monthly credits for the current Free credit-based plan, with fixed limits and no extra credit purchases on Free. Legacy accounts differ. Hosting, requests and function compute may consume credits; the external backend and AI providers are billed separately if applicable. Review dashboard before launch. Do not assume unlimited usage. Scheduled Functions exist on all plans but are not used as the persistent scheduler here.

Sources: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ ; https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/ ; https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/ ; https://docs.netlify.com/build/configure-builds/overview/ ; https://docs.netlify.com/build/functions/scheduled-functions/
