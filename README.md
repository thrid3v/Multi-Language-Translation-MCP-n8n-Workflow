# Multi-Language Translation — MCP + n8n Workflow

Brief utility that exposes a Model Context Protocol (MCP) server for language detection and translation, plus an exported n8n workflow to wire the MCP into conversational automation.

**Project purpose:** Provide a lightweight MCP toolset that detects languages (including custom handling for Hokkien), translates between supported regional languages, and integrates with n8n using an SSE-based MCP client node.

**Quick links**
- File: [Multilanguage-MCP.json](Multilanguage-MCP.json)
- Entry: [src/index.ts](src/index.ts#L1)

**Features**
- Exposes three MCP tools: `get_supported_languages`, `detect_language`, and `translate_text`.
- Real translation/detection via `google-translate-api-x` with normalization for regional codes and Hokkien heuristics.
- SSE transport compatible with n8n's MCP Client node for real-time conversational workflows.
- Type-safe request validation using `zod`.

**File structure**
- `Multilanguage-MCP.json` — exported n8n workflow (import into your n8n instance).
- `package.json` — scripts and dependencies.
- `tsconfig.json` — TypeScript config.
- `src/`
  - `index.ts` — MCP server bootstrap, tool registration, SSE endpoints. (Listen: default port 3000)
  - `languages.ts` — language matrix, normalization, and real API wrappers.
  - `types.ts` — TypeScript types and `zod` schemas.

**MCP Tools exposed**
- `get_supported_languages` — returns the supported language matrix.
- `detect_language` — detects the language of provided text; returns `{ code, name }` (Hokkien detection heuristic applied when applicable).
- `translate_text` — translates text into a target language; accepts optional `source_lang`.

Tool input schemas are implemented in `src/types.ts` via `zod` and enforced on the server.

**n8n workflow details**
- Import `Multilanguage-MCP.json` into your n8n (Workflow → Import) to get the following nodes:
  - `When chat message received` (LangChain Chat Trigger) — webhook trigger for incoming chat messages.
  - `AI Agent` (LangChain Agent) — orchestrates language model, memory and tools.
  - `Google Gemini Chat Model` — configured to call a Google PaLM/Gemini credential in n8n (see next section).
  - `Simple Memory` — lightweight buffer memory for the agent.
  - `MCP Client` — configured to use `http://localhost:3000/sse` as the MCP SSE endpoint.

Notes when importing:
- Ensure the `Google Gemini` (PaLM) credential in your n8n instance is configured (the exported workflow references a credential id). Replace or reconfigure credentials after import.
- Update the `MCP Client` node's `endpointUrl` if your MCP server runs on a different host/port.
- Activate the workflow after import.

**How to run the MCP server locally**
1. Install dependencies

```bash
npm install
```

2. Run in development mode (live TypeScript execution)

```bash
npm run dev
```

3. Or build and run for production

```bash
npm run build
npm start
```

4. By default the server listens on `http://localhost:3000` and exposes the SSE endpoint used by n8n: `http://localhost:3000/sse`.

**Environment & credentials**
- The project uses `google-translate-api-x` which does not require a paid API key for basic usage (it relies on Google Translate internals); be aware of rate limits and reliability for production.
- The n8n workflow uses `Google Gemini (PaLM)` via a PaLM API credential inside n8n — configure your PaLM key inside n8n Credentials after importing the workflow.

**Testing the tools (basic)**
- Recommended: import the workflow into n8n and use the chat trigger to drive translations through the Agent — the `MCP Client` node calls your local MCP server.
- You can also run simple programmatic tests by writing a minimal MCP client that connects to the server's SSE endpoint and issues `ListTools` / `CallTool` requests using any MCP-compatible SDK.

Example: start the server then open n8n (or import the workflow) and send a message to the chat trigger — the Agent will use the configured language model and call MCP tools as needed.

**Troubleshooting**
- If n8n cannot connect to the MCP SSE endpoint, confirm the MCP server is running and that `MCP Client` node's `endpointUrl` matches `http://localhost:3000/sse` (or your host/port).
- If the n8n node references a missing credential id for PaLM/Gemini, open the `Google Gemini Chat Model` node and select your configured PaLM credential.

**Next steps / suggestions**
- Add automated tests for the tool handlers (`detect_language`, `translate_text`).
- Add Dockerfile / docker-compose for running MCP server and n8n together.

---
Generated on 2026-06-02.
