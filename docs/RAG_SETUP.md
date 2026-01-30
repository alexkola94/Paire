# RAG Service Setup and Expenses-APP Configuration

This guide explains how to **run the Ai-RAG-Service** and **configure the Expenses-APP** so the chatbot "Thinking mode (RAG enhanced)" works.

---

## Overview

- **Ai-RAG-Service** runs on **port 5020**. It uses your Supabase PostgreSQL (same DB as the AI Microservice), does retrieval with pgvector, and calls the **AI Microservice (port 5015)** to generate answers.
- **Expenses-APP** backend proxies RAG requests: when the user selects "Thinking mode" in the chatbot, it calls the RAG service and returns the answer (and optional sources).

**Run order:** AI Microservice (5015) → RAG Service (5020) → Expenses-APP backend + frontend.

---

## Part 1: Set up and run Ai-RAG-Service

### Prerequisites

- **.NET 9.0 SDK** (or 8.0 if the project targets it)
- **PostgreSQL with pgvector** (you already use Supabase)
- **AI Microservice** running on **http://localhost:5015**

### 1. Enable pgvector in Supabase

In Supabase Dashboard → **SQL Editor**, run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Configure Ai-RAG-Service

Edit **`Ai-RAG-Service/src/AiMicroservice.RAG/appsettings.Development.json`** (or `appsettings.json`):

- **ConnectionStrings:DefaultConnection**  
  Use the **same** Supabase connection string as your AI Microservice / Expenses-APP (same database).

- **RAG:AiGateway**  
  Must point to the AI Microservice and use its gateway secret:
  - `BaseUrl`: `http://localhost:5015`
  - `GatewaySecret`: same as in your AI Microservice config (e.g. `aigw_test_X8R2C4ZQW7E0T6S5N9D1KJYBHVMPA`)

- **Security**  
  - `GatewaySecret`: secret that **callers** (e.g. Expenses-APP) use to call the RAG service. Example: `rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8`
  - `AllowedTenantIds`: list including your app tenant, e.g. `["thepaire", "senseihub"]`

Example (values are examples only):

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "User Id=...;Password=...;Server=...;Port=5432;Database=postgres"
  },
  "RAG": {
    "AiGateway": {
      "BaseUrl": "http://localhost:5015",
      "GatewaySecret": "aigw_test_X8R2C4ZQW7E0T6S5N9D1KJYBHVMPA"
    }
  },
  "Security": {
    "GatewaySecret": "rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8",
    "AllowedTenantIds": ["thepaire", "senseihub"]
  }
}
```

### 3. Run database migrations

From the repo root (or from `Ai-RAG-Service`):

```bash
cd Ai-RAG-Service/src/AiMicroservice.RAG
dotnet ef database update
```

This creates RAG tables (`rag_knowledge_documents`, `rag_document_chunks`) in your Supabase database.

### 4. Run the RAG service

```bash
cd Ai-RAG-Service/src/AiMicroservice.RAG
dotnet run
```

Service listens on **http://localhost:5020**.  
Check: **http://localhost:5020/health** (or Swagger if enabled).

### Optional: ONNX embedding model

For better embeddings, place the Sentence-BERT ONNX model at:

`Ai-RAG-Service/src/AiMicroservice.RAG/Models/all-MiniLM-L6-v2.onnx`

Without it, the service uses a fallback (e.g. TF-IDF) and still runs.

---

## Part 2: Configure Expenses-APP

### Backend configuration

Edit **`Expenses-APP/You-me-Expenses/backend/YouAndMeExpensesAPI/appsettings.json`** (or `appsettings.Development.json`):

1. Set **RagService:Enabled** to **true**.
2. Set **RagService:BaseUrl** to the RAG service URL (local: `http://localhost:5020`).
3. Set **RagService:TenantId** to a tenant that exists in the RAG service’s **AllowedTenantIds** (e.g. `thepaire`).
4. Set **RagService:GatewaySecret** to the **exact** value of **Security:GatewaySecret** in the RAG service (e.g. `rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8`).

Example:

```json
"RagService": {
  "BaseUrl": "http://localhost:5020",
  "TenantId": "thepaire",
  "GatewaySecret": "rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8",
  "Enabled": true
}
```

No frontend config is required: the frontend calls the Expenses-APP backend, which proxies to the RAG service.

### Run order

1. Start **AI Microservice** (port 5015).
2. Start **Ai-RAG-Service** (port 5020).
3. Start **Expenses-APP** backend and frontend.

In the chatbot: enable **AI mode**, then choose **"Thinking mode (RAG enhanced)"**. Questions will go through the RAG service; answers may include sources if you have documents in the knowledge base.

---

## Automatic Per-User Context (New!)

The RAG integration now **automatically syncs each user's financial data** to the RAG knowledge base. When a user asks a question in "Thinking mode," the system:

1. **Checks if the user has a context document** in RAG (category: `user_{userId}`).
2. **If missing or stale** (older than `UserContextStaleHours`, default 24h):
   - Builds a **financial summary** including:
     - Current month income, expenses, balance
     - Top spending categories
     - Recurring bills summary
     - Savings goals progress
     - Active loans
   - Creates/updates the document in RAG (auto-chunked and embedded).
3. **Filters retrieval** to the user's documents so they get personalized answers.

**Result:** Users can ask questions like "What are my top spending categories?" or "How much do I spend on bills?" and get accurate, personalized answers without manual document management.

### Configuration

In `appsettings.json`:

```json
"RagService": {
  "BaseUrl": "http://localhost:5020",
  "TenantId": "thepaire",
  "GatewaySecret": "rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8",
  "Enabled": true,
  "UserContextStaleHours": 24,
  "AutoSyncUserContext": true
}
```

- **UserContextStaleHours** (default: 24): Hours until a user's context is refreshed.
- **AutoSyncUserContext** (default: true): Set to `false` to disable automatic syncing.

### Manual Refresh

To force an immediate refresh of a user's context (e.g., after bulk data import):

```javascript
// Frontend
await aiGatewayService.ragRefresh()
```

Or via API:

```bash
curl -X POST http://localhost:5038/api/ai-gateway/rag-refresh \
  -H "Authorization: Bearer <user-token>"
```

---

## What if there are no rows in the RAG tables?

The RAG service uses two main tables (created by migrations):

- **`rag_knowledge_documents`** – one row per document you upload (title, content, tenant, category, etc.).
- **`rag_document_chunks`** – one row per text chunk of those documents, with vector embeddings for similarity search.

**If no rows are inserted into these tables**, it means:

1. **No documents have been added** to the RAG knowledge base for your tenant.
2. **Thinking mode still works**, but:
   - The RAG service runs (validates query, embeds it, runs vector search).
   - The search returns **0 chunks** (nothing in `rag_document_chunks`).
   - **Context is empty**, so the enhanced prompt sent to the AI is effectively just the user’s question.
   - The AI Microservice still answers using the LLM’s **general knowledge only** – no custom documents, no “Sources” in the reply.

So: **empty tables = no custom knowledge base**. Thinking mode behaves like normal chat (LLM only) until you add and index documents (see below).

---

## Adding content for RAG (optional)

With no documents in the RAG knowledge base, "Thinking mode" still works but has little context. To get useful RAG answers:

1. **Create documents** via the RAG API (e.g. with curl or Postman):

   ```bash
   curl -X POST http://localhost:5020/v1/documents \
     -H "Content-Type: application/json" \
     -H "X-Tenant-Id: thepaire" \
     -H "X-Gateway-Secret: rag_secret_X9K4M7P2Q8R1T6V3W0Y5Z8" \
     -d "{\"title\": \"Expense tips\", \"content\": \"You can track recurring expenses from the Recurring Bills page...\", \"category\": \"documentation\"}"
   ```

2. Or use the RAG service’s **document management** and **index/refresh** endpoints to upload and index content.

After documents are indexed, "Thinking mode" will use them to answer questions.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| 503 from Expenses-APP when using Thinking mode | **RagService:Enabled** is **true** and **RagService:BaseUrl** is correct. |
| 502 from Expenses-APP when using Thinking mode | RAG service is running on 5020; **RagService:BaseUrl** matches (e.g. `http://localhost:5020`). |
| 401 from RAG service | **RagService:GatewaySecret** in Expenses-APP matches **Security:GatewaySecret** in RAG service; request sends **X-Gateway-Secret** (backend does this). |
| 403 from RAG service | **RagService:TenantId** is in the RAG service’s **Security:AllowedTenantIds**. |
| RAG answers are generic | Add and index documents in the RAG knowledge base for the same tenant. |

---

## Summary

1. **Ai-RAG-Service:** Same DB (Supabase) as AI Microservice, enable pgvector, run migrations, set **RAG:AiGateway** and **Security:GatewaySecret** / **AllowedTenantIds**, then `dotnet run` on 5020.
2. **Expenses-APP:** Set **RagService:Enabled = true**, **BaseUrl**, **TenantId**, and **GatewaySecret** (matching RAG’s **Security:GatewaySecret**).
3. Run: AI Microservice → RAG Service → Expenses-APP; in the chatbot use AI mode + "Thinking mode (RAG enhanced)".
