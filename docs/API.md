# HTTP API v1

All routes are same-origin JSON except the SSE chat endpoint. Sessions use an HttpOnly `omni_session` cookie. All private routes require authentication. Failed operations return `{ "error": "...", "requestId": "uuid" }` with HTTP status.

| Method | Route | Function |
| --- | --- | --- |
| GET | `/api/health` | Liveness |
| POST | `/api/v1/auth/register` | `{name,email,password}` create account |
| POST | `/api/v1/auth/login` | `{email,password}` sign in |
| POST | `/api/v1/auth/logout` | Clear cookie and invalidate session |
| GET | `/api/v1/me` | Current authenticated user |
| GET | `/api/v1/providers` | Public capabilities and **non-secret** connection status |
| PUT | `/api/v1/providers/:id/credential` | `{key,model?}` encrypt & save provider credential |
| POST | `/api/v1/providers/:id/test` | Test existing saved credentials over official provider API |
| DELETE | `/api/v1/providers/:id/credential` | Remove provider credentials |
| GET | `/api/v1/conversations` | Own conversations |
| POST | `/api/v1/conversations` | Create new conversation `{title?}` |
| GET | `/api/v1/conversations/:id` | Own conversation messages |
| DELETE | `/api/v1/conversations/:id` | Delete own conversation |
| POST | `/api/v1/chat/stream` | `{message,conversationId?,mode?,providers?,search?}` → SSE stream |
| POST | `/api/v1/runs/:runId/cancel` | Abort user's in-progress run |
| GET | `/api/v1/usage` | Own request counts, provider-reported tokens, request timings |

Supported provider IDs: `openai`, `gemini`, `anthropic`, `deepseek`, `grok` (AI), `brave` (web search). Supported chat modes: `auto`, `manual`, `ultimate`. Manual requires explicit selected connected providers. Ultimate requires 2+ providers.

SSE events: `start` gives `runId` and `conversationId`; `status` indicates actual ongoing work; `delta` streams OpenAI-compatible text; `provider` records success/failure; `sources` gives actual Brave results; `final` provides answer and metadata; `error` indicates failure/cancellation. Clients must not claim success before `final`.
