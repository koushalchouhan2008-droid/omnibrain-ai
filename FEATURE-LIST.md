# Feature inventory — honest scope

| Area | Implemented | Boundaries |
|---|---|---|
| Chat | Auto, Fast, Smart, Deep Research, Ultimate, Creative, Developer, Free and manual model selection; multiple models, synthesis, source records, local SSE and Netlify job polling | Heuristic routing, not autonomous universal reasoning; no guarantee of factual correctness; provider access needed |
| Models | Built-in 12 AI providers and compatible custom endpoints; Brave/Tavily research; Wikipedia fallback | No bundled paid accounts, no guaranteed current model quotas |
| Add Your AI | Custom OpenAI-compatible POST, public website research, search adapter, bookmark, read-only REST, test | No arbitrary authenticated site login, browser automation, MCP/OpenAPI imports, custom headers or arbitrary write tools |
| Services | Gmail OAuth + confirmed send, Google Drive metadata and Calendar read OAuth, GitHub read via PAT | No general Google/Microsoft sign-in; no other native marketplace APIs, GitHub OAuth/push, Gmail inbox reading or automatic tool dispatch |
| Agents | Templates, instructions, model selection, research, natural-language draft, run | No multi-agent teams, avatars, long-term agent memory or autonomous action permissions |
| Automations | Manual or intervals, ordered search/AI/site/email-draft steps, AI planning, pause/resume, Run Now, bounded history, persistent timer | No drag/drop graph, event/webhook triggers, cron timezone/monthly, retries, notifications, unattended email sends; backend must stay awake |
| Image/video | OpenAI text-to-image, xAI text-to-video, aspect controls, persisted status, download | No image-to-image, reference uploads, editing, upscaling, object removal, voiceover, subtitles or alternative native adapters; jobs interrupted by backend restart |
| Website builder | Prompt to single HTML file, code edit, sandbox preview, five previous versions, restore, ZIP/HTML export | No full multi-file React/Next.js/backend execution, GitHub push, automatic debugger or generated app hosting |
| Artifacts | Markdown, TXT, CSV and JSON generation/edit/download | No native PDF/DOCX/PPTX/XLSX, interactive diagram editor or split-screen workspace |
| Knowledge | Private text/Markdown/CSV/JSON ingestion, keyword chunk search, optional contextual retrieval, chat history | No binary file parsing, embeddings, project folders, voice, generalized memory management |
| UI | Original arcane/fantasy/cyber CSS, six themes, reduced motion, responsive CSS, sidebar | Browser viewport testing was blocked; no command palette, voice, rich attachment workflow or animation intensity slider |
| Storage/hosting | SQLite schema, encrypted provider secrets, Netlify static frontend, proxy, status function, external persistent backend and scheduler | No distributed queue, restart-resilient in-flight chat, managed database or fully serverless deployment; no guaranteed zero cost |
| Usage | Request/token statistics and restricted Free mode | No live quota balances or hard budget enforcement across paid providers |

No unsupported integrations are advertised as completed. Advanced features above remain future work.
