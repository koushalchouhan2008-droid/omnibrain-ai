# OMNIBRAIN AI 2.0

An upgrade of the supplied Node.js + SQLite project (not a new foundation). Existing login, encrypted API keys, conversation history, SSE chat, usage reporting and original theme are retained. New workflows are independently implemented from the uploaded 49-page implementation reference and public product documentation. This is not a copy of proprietary Claude code or its model.

## New in this release
- Nine built-in AI choices: OpenAI, Gemini, Claude, DeepSeek, Grok, Groq, OpenRouter, Mistral and Perplexity. Plus any compatible custom AI endpoint. Provider model IDs are editable. Availability depends on account and provider.
- Brave/Tavily, custom search GET APIs, linked public websites, Wikipedia fallback when neither commercial search provider is configured. Parallel requests, deduplication, round-robin source merge, actual retrieved source URLs, and partial-failure reporting. Ultimate mode turns on search and synthesizes successful AI replies. It does not crawl the entire internet; linked pages are read directly, not a domain-wide crawl. Default model cap eight, max twenty (to control cost/concurrency), custom saved agent/link count is not capped by subscription. Research uses up to twelve custom sources and thirty results per request.
- Add your AI & Website: encrypted optional bearer keys, OpenAI-compatible custom chat endpoints, GET JSON search endpoints, public HTTPS page reading and external login bookmarks. Custom links do not accept passwords or cookies, and arbitrary login pages cannot be automatically converted into authorized connectors. No generic OAuth discovery/MCP or browser automation is implemented.
- Website studio: generated self-contained HTML, saved projects, iterative AI revisions, editable code, isolated preview and HTML downloads. Not a full-stack hosting system. Preview is sandboxed and ordinary external fetches/forms are blocked; don't enter secrets into generated content. Review downloaded code before publishing.
- Image studio: OpenAI image endpoint. Video studio: xAI video job endpoint, polling and file download. Jobs saved locally with honest queued/running/done/failed states. Job execution requires server uptime; pending jobs are marked failed on restart. OpenAI Videos API is not used. Image/video default model IDs can be overridden in the UI.
- Agents: create custom instruction-based specialists or start from five templates; optionally enable web research. Agents have a task runner, not autonomous general-purpose computer control.
- Automations: manual or interval trigger, ordered search, AI, site and email-draft steps; pause/resume and last-run output. Runs on the server while it is online; no cloud service or push notifications. At most one overdue execution per workflow after a restart. Up to five steps and three concurrent workflows; minimum interval 15 minutes. Scheduled email steps draft only.
- Gmail OAuth: send-only access, official consent screen, PKCE, encrypted refresh token, revocation, AI-assisted editable email, recipient and body confirmation. Natural-language chat command with explicit address opens drafting interface. Google Cloud configuration required. No actual Gmail password or universal sign-in form.
- Responsive navigation for mobile and desktop; light/dark themes; creation shortcuts `/website`, `/image`, `/video`.

## Start
Read `START-V2-HERE.txt` first. Node >=22.13; no external npm dependencies. Existing `README.md` and blueprint describe the original baseline, not current features. Run `npm start` or the supplied launcher. Set `MAX_AI_MODELS` to a number from 1 to 20 in `.env` if necessary. `docs/GMAIL-SETUP.md` explains Google OAuth. Use the original setup guides for hosting, but follow the V2 security limitations.

## Verification
`npm test` passes 12 automated tests: original auth, database, crypto, provider contracts, streaming, synthesis and search; new custom connections, user isolation, agents, automations, site preview, draft and confirmation, public network validation. Upstream AI is mocked for deterministic tests. The environment blocked Chromium local navigation, so full interactive browser QA was not completed. Live OAuth/email, media generations, custom remote connections and paid APIs have not been tested with real credentials. Production security and deployment review is still required. This is a functional development release, not an audited production product.

## Security and operational limits
Keys encrypted with AES-256-GCM using the local persistent application key. Custom network requests pin public IPv4 DNS results, disallow non-HTTPS/private/reserved IPs, credentials in URLs, custom ports and redirects; IPv6-only custom endpoints are not supported. Custom endpoints receive the prompt and (when applicable) research data; only connect services you trust. No universal unlimited access: provider terms, moderation, model availability, rate limits and API bills apply. Development use is local by default. Back up the SQLite data and encryption key; protect them and the .env file. For public hosting add HTTPS, access controls, resource quotas, monitoring, backups, and security testing. An original account password is not a provider password.

## Public references
- Claude Artifacts: https://support.claude.com/en/articles/17153992-what-are-artifacts-and-how-do-i-use-them
- Claude custom connectors: https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- Google OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- Gmail send: https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send
- OpenAI images: https://developers.openai.com/api/reference/resources/images/methods/generate
- xAI video: https://docs.x.ai/developers/model-capabilities/video/generation
