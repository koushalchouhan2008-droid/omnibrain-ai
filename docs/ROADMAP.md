# PDF roadmap → code delivery status

The source PDF contains 48 specification sections, including the phased plan in section 41 and a final build command in section 48. This file distinguishes **implemented** from **proposed**, in line with the PDF's honesty rule.

## Implemented in v0.1

- **Phase 0 foundation:** runnable modular Node server, persistent database schema, encrypted configuration, responsive web app, documented architecture, HTTP/adapter tests, Dockerfile and Compose for single instance.
- **Early Phase 1 core:** account registration/login, persistent chat, three primary provider adapters (OpenAI, Gemini, Anthropic) plus DeepSeek/Grok, Brave search, Smart + selector, manual and Auto routing, multi-model synthesis, OpenAI-compatible streaming, cancellable server tasks, error isolation, usage tracking.

## Partial or blocked

- Next.js/React/strict TypeScript, PostgreSQL/pgvector and Redis/BullMQ: **not included** in dependency-free MVP. NPM registry could not be reached in this environment. For final target architecture, migrate the tested API/domain contracts to the specified stack after selecting verified package versions and running full compatibility tests.
- Streaming for Gemini/Anthropic: currently full response with SSE status; add provider-specific delta adapters and reconnection semantics.
- Provider test and real AI output quality: **requires live keys, internet and permitted model access**; only local mocked upstream tests executed.
- Multi-model cost estimates and account-wide quotas: not yet implemented. Token usage is stored if returned by provider; financial cost is not invented.
- Persisted background jobs, retry/backoff, circuit breakers and dashboards: not yet implemented. Current cancellation applies to an active HTTP run.

## Subsequent phases based on section 41

1. **Phase 1 hardening:** migrate to strict TypeScript, add install lockfile, introduce Postgres, validate all provider APIs with real credentials, stream all providers, add failure injection and deeper E2E tests.
2. **Phase 2 connected apps:** OAuth 2.0 app marketplace, Google integrations, permission registry, MCP/custom API SDK, file upload + authorized document search.
3. **Phase 3 agents:** research planning with citations, specialist agent builder, approval gates, trace/step limits and budget limits.
4. **Phase 4 media:** real image and video providers, durable queues, asset storage, cost and job-status tracking.
5. **Phase 5 automations:** visual workflow editor, scheduler, webhooks, workflow versioning, durable execution, side-effect idempotency.
6. **Phase 6 personalization:** opt-in, controllable memory; voice interface; saved teams and presets.
7. **Phase 7 hardening:** security/a11y/load reviews, backups/restore drills, monitoring and incident procedures, deployment and rollback verification.

Every phase needs tests, release gates, and feature labels (`Implemented`, `Partially Implemented`, `Requires Credentials`, `Not Yet Implemented`, `Blocked`). Do not claim completed commercial functionality from mock UIs.
