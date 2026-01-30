# AI Chat "Thinking Mode" – End-to-End Workflow

This document traces the full request/response path when a user selects **Thinking mode (RAG enhanced)** in the Expenses-APP chatbot.

---

## High-Level Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  USER (Browser)                                                                          │
│  Types message in Chatbot, AI mode ON, sub-mode = "Thinking mode (RAG enhanced)"          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  1. EXPENSES-APP FRONTEND (React)                                                          │
│     • Chatbot.jsx: sendMessage() → aiSubMode === 'thinking'                                │
│     • Calls: aiGatewayService.ragQuery(userMessage, { signal })                            │
│     • api.js: POST to backend /api/ai-gateway/rag-query with { query }                     │
│     • Headers: Authorization: Bearer <JWT>, X-CSRF-TOKEN, Content-Type: application/json  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  2. EXPENSES-APP BACKEND (ASP.NET Core)                                                    │
│     • AiGatewayController.RagQuery([FromBody] RagQueryRequest)                             │
│     • Checks: RagService:Enabled, request.Query not empty, Bearer or GatewaySecret       │
│     • [NEW] RagContextService.EnsureUserContextAsync(userId) → lazy sync user summary     │
│       → Checks if user has a RAG document; if missing/stale, builds financial summary     │
│         using ExpensesUserRagContextBuilder and syncs to RAG (category: user_{userId})    │
│     • RagClient.RagQueryAsync(request, userCategory, accessToken)                          │
│     • HTTP POST to RAG service: {BaseUrl}/v1/query with body { Query, Category }           │
│     • Headers: X-Tenant-Id (RagService:TenantId), X-Gateway-Secret, optional Authorization │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  3. AI-RAG-SERVICE (ASP.NET Core, port 5020)                                               │
│     • Pipeline: CORS → SecurityHeaders → Authentication → ShieldOrGatewayAuth             │
│       → IpRateLimit → TenantResolution → RateLimit → Endpoints                             │
│     • POST /v1/query → QueryEndpoints: extracts tenantId from context                     │
│     • RAGService.QueryAsync(request, tenantId)                                             │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  4. RAG SERVICE – RAGService.QueryAsync (orchestration)                                    │
│     Step A: Validate/sanitize user query (prompt injection check)                          │
│     Step B: IEmbeddingService.GenerateEmbeddingAsync(query)  → query vector                │
│     Step C: IVectorStoreService.SearchSimilarAsync(queryEmbedding, tenantId, topK, …)     │
│             → similarity search in PostgreSQL (pgvector) → list of (chunk, score)         │
│     Step D: Build context string from chunks; build Sources list (document id, title)     │
│     Step E: BuildEnhancedPrompt(query, context) → single prompt with delimited context     │
│             and user question (reduces injection; instructs model to use only context)     │
│     Step F: IAiGatewayClient.GenerateAsync(enhancedPrompt, tenantId, model, temp, …)     │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  5. AI-RAG-SERVICE – AiGatewayClient.GenerateAsync                                         │
│     • POST to AI Microservice: {RAG:AiGateway:BaseUrl}/v1/generate                        │
│     • Body: { prompt, model, temperature, maxTokens, skipPolishing }                       │
│     • Headers: X-Tenant-Id, X-Gateway-Secret                                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  6. AI MICROSERVICE / GATEWAY (port 5015)                                                   │
│     • POST /v1/generate → GenerateEndpoints → ChatService (or equivalent)                  │
│     • Resolves tenant; calls Ollama (or configured LLM) with the enhanced prompt           │
│     • Returns: { Response, Model, Usage, DurationMs, … }                                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  7. RESPONSE PATH (back up the chain)                                                      │
│     • AI Gateway → RAG AiGatewayClient returns AiGatewayResponse (Response, Model, …)   │
│     • RAGService builds QueryResponse { Response, Sources, RagUsed, ChunksRetrieved, … }   │
│     • QueryEndpoints returns Results.Ok(response)                                         │
│     • Expenses RagClient maps RAG JSON (Response, Sources) → RagQueryResponse (Answer,     │
│       Sources with Id, Title)                                                              │
│     • AiGatewayController returns Ok(response)                                             │
│     • Frontend api.js receives { answer, sources }                                         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  8. EXPENSES-APP FRONTEND – display                                                        │
│     • Chatbot.jsx: answer = response?.answer ?? response?.message?.content                │
│     • sourceLabels = sources?.map(s => s.title ?? s.id)                                    │
│     • displayMessage = answer + (if sources) "\n\n---\n*Sources: ...*"                     │
│     • addBotMessage(displayMessage, 'text') → typewriter + markdown in chat UI            │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step (Code References)

| Step | Layer | File / component | What happens |
|------|--------|-------------------|--------------|
| 1 | Frontend | `Chatbot.jsx` | User sends message; `aiSubMode === 'thinking'` → `aiGatewayService.ragQuery(userMessage, { signal })`. |
| 2 | Frontend | `api.js` | `ragQuery(query)` → `apiRequest('/api/ai-gateway/rag-query', { method: 'POST', body: JSON.stringify({ query }) })`. Uses JWT + CSRF from auth/csrf. |
| 3 | Backend | `AiGatewayController.cs` | `[HttpPost("rag-query")]` → validate RagService enabled & query → `_ragContextService.EnsureUserContextAsync(userId)` for lazy sync → `_ragClient.RagQueryAsync(request, userCategory, GetBearerToken())` → return `Ok(response)`. |
| 3a | Backend | `RagContextService.cs` | [NEW] Checks if user has RAG doc (category: `user_{userId}`); if missing/stale, uses `IUserRagContextBuilder.BuildContextAsync` → `_ragClient.CreateDocumentAsync` to sync financial summary. |
| 3b | Backend | `ExpensesUserRagContextBuilder.cs` | [NEW] Builds markdown financial summary: dashboard analytics (income/expenses/balance), top categories, recurring bills summary, savings goals progress, active loans. |
| 4 | Backend | `RagClient.cs` | `RagQueryAsync` → POST `{ options.BaseUrl }/v1/query` with body `{ Query, Category }`, headers `X-Tenant-Id`, `X-Gateway-Secret`, optional `Authorization`. Category filters retrieval to user's docs. |
| 5 | RAG Service | `Program.cs` → `QueryEndpoints.cs` | Request hits middleware (auth, tenant), then `POST /v1/query` → `ragService.QueryAsync(request, tenantId)` → `Results.Ok(response)`. |
| 6 | RAG Service | `RAGService.cs` | Validate query → embed query → `_vectorStoreService.SearchSimilarAsync` (pgvector) → build context + sources → `BuildEnhancedPrompt` → `_aiGatewayClient.GenerateAsync(enhancedPrompt, …)`. |
| 7 | RAG Service | `AiGatewayClient.cs` | POST to AI Microservice `/v1/generate` with prompt + headers; parse `Response`, `Usage` → return `AiGatewayResponse`. |
| 8 | AI Microservice | Gateway `/v1/generate` | Process prompt with tenant config; call LLM (e.g. Ollama); return `{ Response, Model, Usage, … }`. |
| 9 | Back to frontend | `RagClient.cs` | Map RAG `Response` → `Answer`, `Sources` → `RagSourceInfo` (Id, Title). Controller returns JSON. |
| 10 | Frontend | `Chatbot.jsx` | Read `response.answer`, `response.sources`; build `displayMessage`; `addBotMessage(displayMessage, 'text')` for UI. |

---

## Data Shapes (Key DTOs)

| Stage | Request / Response shape |
|-------|---------------------------|
| Frontend → Backend | `POST /api/ai-gateway/rag-query` body: `{ query: string }`. |
| Backend → RAG Service | `POST {RagService:BaseUrl}/v1/query` body: `{ Query: string }` (C# PascalCase serialized). |
| RAG Service internal | `QueryRequest` (Query, TopK, MinRelevanceScore, …) → `QueryResponse` (Response, Sources, RagUsed, ChunksRetrieved, …). |
| RAG → AI Gateway | `POST /v1/generate` body: `{ prompt, model, temperature, maxTokens, skipPolishing }`. |
| AI Gateway → RAG | `{ Response, Model, Usage: { PromptTokens, CompletionTokens } }`. |
| Backend → Frontend | `RagQueryResponse`: `{ answer: string, sources?: { id, title }[] }`. |

---

## Summary

1. **User** selects Thinking mode and sends a message in the chatbot.
2. **Frontend** sends the message as `query` to the Expenses backend `/api/ai-gateway/rag-query` (with JWT and CSRF).
3. **Expenses backend** [NEW] **ensures user context**: checks if user's financial summary exists in RAG; if missing or stale, builds a summary (income/expenses, categories, bills, savings) and syncs it to RAG.
4. **Expenses backend** forwards the query to the **RAG service** `/v1/query` with tenant, gateway secret, and **user category** (filters retrieval to user's docs).
5. **RAG service** validates the query, embeds it, runs **vector search** (pgvector) for the user's category, builds **context** from chunks, then builds an **enhanced prompt** and calls the **AI Microservice** `/v1/generate`.
6. **AI Microservice** runs the LLM and returns the generated **Response**.
7. **RAG service** returns **Response** and **Sources** in its `QueryResponse`.
8. **Expenses backend** maps that to **answer** and **sources** and returns JSON to the frontend.
9. **Frontend** shows the answer and optional sources in the chat (typewriter + markdown).

The “thinking” is: **retrieve relevant knowledge (RAG) → put it in the prompt → LLM answers using that context.**
