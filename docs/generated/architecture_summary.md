# Proxima v4.0 — Architecture Specification
**Derived exclusively from PRD v4.1 · Source of truth: `docs/PRD/Proxima_v4_PRD_v2.md`**

---

## 1. Repository Architecture

```
proxima/
├── backend/                        # Python 3.11 / FastAPI application
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory, middleware, router mount
│   │   ├── config.py               # Pydantic Settings — env vars, secrets
│   │   ├── database.py             # SQLAlchemy 2.0 async engine + session factory
│   │   ├── redis_client.py         # aioredis connection pool
│   │   │
│   │   ├── models/                 # SQLAlchemy ORM models (22 tables)
│   │   │   ├── user.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── document_version.py
│   │   │   ├── document_chunk.py
│   │   │   ├── segment_confidence_score.py
│   │   │   ├── session.py
│   │   │   ├── ai_request.py
│   │   │   ├── template.py
│   │   │   ├── export.py
│   │   │   ├── audit_report.py
│   │   │   ├── comparison.py
│   │   │   ├── contract_analysis.py
│   │   │   ├── clinical_note.py
│   │   │   ├── domain_knowledge_chunk.py
│   │   │   ├── prompt_version.py
│   │   │   ├── output_schema.py
│   │   │   ├── registered_model.py
│   │   │   ├── model_routing_rule.py
│   │   │   ├── background_job.py
│   │   │   ├── admin_audit_log.py
│   │   │   └── admin_session.py
│   │   │
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── document.py
│   │   │   ├── intelligence.py
│   │   │   ├── tools.py
│   │   │   ├── template.py
│   │   │   ├── export.py
│   │   │   ├── session.py
│   │   │   └── admin.py
│   │   │
│   │   ├── routers/                # FastAPI routers — one per API group
│   │   │   ├── auth.py             # /api/auth/*
│   │   │   ├── users.py            # /api/users/*
│   │   │   ├── documents.py        # /api/documents/*
│   │   │   ├── intelligence.py     # /api/intelligence/*
│   │   │   ├── tools.py            # /api/tools/*
│   │   │   ├── templates.py        # /api/templates/*
│   │   │   ├── exports.py          # /api/exports/*
│   │   │   ├── sessions.py         # /api/sessions/*
│   │   │   ├── jobs.py             # /api/jobs/*
│   │   │   ├── system.py           # /api/health, /api/stats
│   │   │   └── admin.py            # /admin/api/*
│   │   │
│   │   ├── services/               # Business logic layer
│   │   │   ├── model_registry.py   # ModelRegistry class
│   │   │   ├── prompt_registry.py  # PromptRegistry — 10 canonical keys
│   │   │   ├── domain_detector.py  # Lexical + structural domain detection
│   │   │   ├── prompt_assembler.py # Domain-weighted prompt blending
│   │   │   ├── quality_heuristic_engine.py  # QHE — T, S, D, C dimensions
│   │   │   ├── rag_retriever.py    # FTS (Stage 2) / pgvector (Stage 5)
│   │   │   ├── semantic_compare.py # 6-step comparison pipeline
│   │   │   ├── document_parser.py  # PDF / DOCX / TXT extraction
│   │   │   ├── upload_validator.py # MIME + magic-byte + size + bomb + scan
│   │   │   ├── export_service.py   # PDF/DOCX/MD/CSV/JSON generation
│   │   │   └── admin_service.py    # Admin operations + audit logging
│   │   │
│   │   ├── workers/                # Celery tasks
│   │   │   ├── celery_app.py       # Celery app + 4 queues + Beat
│   │   │   ├── ingest_tasks.py     # Document chunking + embedding
│   │   │   ├── export_tasks.py     # PDF/DOCX export generation
│   │   │   ├── embed_tasks.py      # Re-embedding on model change
│   │   │   └── beat_schedule.py    # Periodic task schedule
│   │   │
│   │   ├── dependencies/           # FastAPI dependency injection
│   │   │   ├── auth.py             # get_current_user, require_admin
│   │   │   ├── db.py               # get_db session
│   │   │   └── rate_limit.py       # slowapi limiters per endpoint
│   │   │
│   │   └── migrations/             # Alembic
│   │       ├── env.py
│   │       └── versions/
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── test_domain_detector.py
│   │   │   ├── test_confidence_scorer.py
│   │   │   ├── test_prompt_assembler.py
│   │   │   └── test_semantic_compare.py
│   │   ├── integration/
│   │   │   ├── test_auth_flow.py
│   │   │   ├── test_intelligence_endpoints.py
│   │   │   ├── test_tools_endpoints.py
│   │   │   └── test_export_tasks.py
│   │   └── fixtures/
│   │       ├── sample_legal_doc.txt
│   │       ├── sample_medical_doc.txt
│   │       └── sample_code_doc.py
│   │
│   ├── alembic.ini
│   ├── pyproject.toml
│   └── Dockerfile
│
├── frontend/                       # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                 # React Router v6 routes
│   │   │
│   │   ├── pages/                  # 10 application pages
│   │   │   ├── Landing.tsx         # /          (Public)
│   │   │   ├── Workspace.tsx       # /workspace (Auth)
│   │   │   ├── ContractAnalyzer.tsx# /analyze   (Auth)
│   │   │   ├── ClinicalNotes.tsx   # /clinical  (Auth)
│   │   │   ├── CodeSuite.tsx       # /code      (Auth)
│   │   │   ├── DocumentCompare.tsx # /compare   (Auth)
│   │   │   ├── Templates.tsx       # /templates (Browse public / use auth)
│   │   │   ├── ConfidenceAudit.tsx # /audit     (Auth)
│   │   │   ├── DomainRadar.tsx     # /radar     (Auth)
│   │   │   ├── Dashboard.tsx       # /dashboard (Auth)
│   │   │   ├── Pricing.tsx         # /pricing   (Public)
│   │   │   └── admin/              # /admin/*   (Admin role)
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                 # Shared primitives
│   │   │   ├── intelligence/       # Confidence heatmap, domain radar polygon
│   │   │   ├── editor/             # Workspace inline completion
│   │   │   ├── compare/            # Side-by-side diff viewer
│   │   │   └── admin/              # Admin-specific components
│   │   │
│   │   ├── store/                  # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   ├── documentStore.ts
│   │   │   └── uiStore.ts
│   │   │
│   │   ├── hooks/
│   │   │   ├── useCompletion.ts    # SSE streaming hook
│   │   │   ├── useDocuments.ts     # TanStack Query wrappers
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── api/                    # Typed API client (TanStack Query)
│   │   │   ├── client.ts
│   │   │   ├── auth.ts
│   │   │   ├── documents.ts
│   │   │   ├── intelligence.ts
│   │   │   ├── tools.ts
│   │   │   └── admin.ts
│   │   │
│   │   ├── __tests__/
│   │   │   ├── DomainRadar.test.tsx
│   │   │   ├── ConfidenceHeatmap.test.tsx
│   │   │   ├── useCompletion.test.tsx
│   │   │   └── auth.test.tsx
│   │   │
│   │   └── types/                  # Shared TypeScript types
│   │
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── workspace.spec.ts
│   │   ├── analyze.spec.ts
│   │   ├── export.spec.ts
│   │   └── admin.spec.ts
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── infrastructure/
│   ├── docker-compose.yml          # postgres + redis + backend + worker + frontend
│   ├── docker-compose.dev.yml
│   └── nginx/
│       └── nginx.conf
│
├── docs/
│   ├── PRD/
│   │   └── Proxima_v4_PRD_v2.md    # Source of truth
│   ├── generated/
│   │   └── architecture_summary.md # This file
│   └── stages/
│       ├── Proxima_Stage1_v3.txt
│       ├── Proxima_Stage2_v3.txt
│       ├── Proxima_Stage3_v3.txt
│       ├── Proxima_Stage4_v3.txt
│       └── Proxima_Stage5_v3.txt
│
├── .github/
│   └── workflows/
│       └── ci.yml                  # backend-test + frontend-test + e2e-test + build
│
├── .gitignore
└── README.md
```

---

## 2. Backend Architecture

### 2.1 Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Python 3.11 |
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Migrations | Alembic |
| Cache / Sessions | Redis 7 via aioredis |
| Auth | python-jose (RS256 JWT) + Authlib (Google OAuth 2.0 PKCE) |
| Task Queue | Celery + Redis broker |
| Rate Limiting | slowapi |
| Logging | structlog |
| Error Tracking | sentry-sdk |
| File Parsing | PyMuPDF, pytesseract, python-docx |
| Export | WeasyPrint, python-docx |
| HTML Sanitization | bleach |
| Storage | boto3 (AWS S3 / Cloudflare R2) |
| Vector Math | scipy (Hungarian algorithm), pgvector |

### 2.2 Application Layers

```
HTTP Request
    │
    ▼
FastAPI Router (routers/)
    │   • Validates request schema (Pydantic)
    │   • Enforces auth via dependency injection
    │   • Enforces rate limits via slowapi
    ▼
Service Layer (services/)
    │   • All business logic lives here
    │   • Calls ModelRegistry — never raw SDK
    │   • Calls PromptRegistry — never hardcoded prompts
    │   • Calls QHE for confidence scoring
    │   • Calls RAGRetriever for context
    ▼
ORM / Database (models/ + database.py)
    │   • Async SQLAlchemy sessions
    │   • pgvector for embeddings
    ▼
External Services
        Google OAuth 2.0 · Gemini API · S3/R2 · Redis
```

### 2.3 Authentication Flow

```
Browser → GET /api/auth/google
    │   Backend generates PKCE challenge
    │   Stores state in Redis (10 min TTL)
    │   Redirects → Google
    │
Google → GET /api/auth/callback
    │   Validates state from Redis
    │   Exchanges code → tokens (Authlib)
    │   Upserts user in `users` table
    │   Issues RS256 JWT (4096-bit RSA, 15 min)
    │   Issues refresh token (7 days, stored in Redis)
    │   Sets HttpOnly + Secure + SameSite=Strict cookies
    │
POST /api/auth/refresh
    │   Reads refresh token from cookie
    │   Validates against Redis
    │   Rotates refresh token (delete old, store new)
    │   Issues new access JWT
    │
POST /api/auth/logout
    │   Revokes refresh token from Redis
    │   Clears cookies
```

### 2.4 Celery Worker Architecture

```
Queues (4 total):
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   ingest    │  │   export    │  │   embed     │  │  default    │
  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

Tasks:
  ingest queue  → chunk_document(), store_chunks()
  export queue  → generate_pdf(), generate_docx()
  embed queue   → embed_chunks(), re_embed_on_model_change()
  default queue → misc background jobs

Beat (Scheduler):
  → Periodic cleanup, token resets, re-embedding jobs
```

### 2.5 Upload Validation Pipeline (Security §12.2)

```
Incoming file
    1. MIME type check (Content-Type header)
    2. Magic-byte validation (read first 512 bytes)
    3. Size gate: reject > 20MB
    4. Archive bomb check: reject ZIP containing archives
    5. Malware scan: scan_file(path) — stub → True (pluggable for ClamAV)
    ✓ Pass → proceed to ingest
    ✗ Fail → 400/413/422 response
```

---

## 3. Frontend Architecture

### 3.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Language | TypeScript |
| Bundler | Vite |
| Styling | Tailwind CSS |
| Animation | Framer Motion + GSAP |
| 3D Hero | Three.js |
| State | Zustand |
| Routing | React Router v6 |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| PDF Preview | PDF.js |
| DOCX Preview | mammoth |
| Markdown | marked |
| Testing | Vitest + React Testing Library + Playwright |

### 3.2 10 Application Pages

| # | Page | Route | Auth | Key Components |
|---|------|-------|------|----------------|
| 1 | Landing | `/` | Public | Three.js cinematic hero (Stage 4), CTAs, feature grid |
| 2 | Workspace | `/workspace` | Required | Inline editor, domain scanner, completion trigger, confidence heatmap |
| 3 | Contract Analyzer | `/analyze` | Required | Upload, clause table, risk flags, export |
| 4 | Clinical Notes | `/clinical` | Required | Non-PHI form, PHI disclaimer (persistent), `X-Proxima-Clinical-Boundary` header |
| 5 | Code Suite | `/code` | Required | Sub-tools: review, docstring, readme, bug-explain |
| 6 | Document Compare | `/compare` | Required | Side-by-side diff, similarity score, change classification badges |
| 7 | Template Library | `/templates` | Browse public / use auth | 50 templates, filter by domain, preview |
| 8 | Confidence Audit | `/audit` | Required | Full document QHE report, per-segment score heatmap |
| 9 | Domain Radar | `/radar` | Required | Radar polygon chart (Recharts), domain % breakdown |
| 10 | Dashboard | `/dashboard` | Required | Usage stats, recent documents, token balance, cost summary |
| — | Pricing | `/pricing` | Public | Plan table, Clinical boundary fine print |
| — | Admin | `/admin/*` | Admin role | 6-page admin platform (Stage 3) |

### 3.3 State Architecture (Zustand)

```
authStore
  ├── user: User | null
  ├── isAuthenticated: boolean
  └── actions: login(), logout(), refreshToken()

documentStore
  ├── documents: Document[]
  ├── activeDocument: Document | null
  └── actions: fetchDocuments(), setActive(), uploadDocument()

uiStore
  ├── theme: 'dark' | 'light'
  ├── sidebarOpen: boolean
  └── notifications: Notification[]
```

### 3.4 Confidence Score CSS Classes

Mapped directly from QHE thresholds (PRD §6). **No local copies** — sourced from a single token file:

| Score | Class | Color Token |
|-------|-------|-------------|
| 80–100 | `confidence-high` | `#22c55e` |
| 65–79 | `confidence-amber` | `#f59e0b` |
| 50–64 | `confidence-low` | `#f97316` |
| 0–49 | `confidence-critical` | `#ef4444` |

### 3.5 Route Guard Strategy

```typescript
// React Router v6 layout route pattern
<Route element={<RequireAuth />}>
  <Route path="/workspace" element={<Workspace />} />
  <Route path="/analyze"   element={<ContractAnalyzer />} />
  // ... all protected routes
</Route>
<Route element={<RequireAdmin />}>
  <Route path="/admin/*" element={<AdminLayout />} />
</Route>
```

---

## 4. Database Architecture

### 4.1 Verified Table Index — All 22 Tables

| # | Table | Primary Key | Key Foreign Keys | Notes |
|---|-------|-------------|-----------------|-------|
| 1 | `users` | `user_id` UUID | — | Auth + profile + plan + role |
| 2 | `projects` | `project_id` UUID | `user_id → users` | Document grouping |
| 3 | `documents` | `document_id` UUID | `user_id, project_id` | Metadata + ingest state |
| 4 | `document_versions` | `version_id` UUID | `document_id → documents` | Full version history |
| 5 | `document_chunks` | `chunk_id` UUID | `document_id → documents` | RAG chunks + pgvector embeddings |
| 6 | `segment_confidence_scores` | `score_id` UUID | `document_id, ai_request_id` | Per-segment QHE scores |
| 7 | `sessions` | `session_id` UUID | `user_id → users` | App-level usage sessions |
| 8 | `ai_requests` | `request_id` UUID | `user_id, document_id` | Every AI call; computed cost column |
| 9 | `templates` | `template_id` UUID | — | 50 seeded professional templates |
| 10 | `exports` | `export_id` UUID | `user_id, document_id` | File export records |
| 11 | `audit_reports` | `report_id` UUID | `document_id, user_id` | Full document QHE reports |
| 12 | `comparisons` | `comparison_id` UUID | `user_id` | Document comparison results |
| 13 | `contract_analyses` | `analysis_id` UUID | `document_id, user_id` | Contract analysis results |
| 14 | `clinical_notes` | `note_id` UUID | `user_id` | Clinical note generation results |
| 15 | `domain_knowledge_chunks` | `chunk_id` UUID | — | Global KB; pgvector embeddings |
| 16 | `prompt_versions` | `version_id` UUID | — | Prompt Registry — versioned prompts |
| 17 | `output_schemas` | `schema_id` UUID | — | JSON output schemas per tool |
| 18 | `registered_models` | `model_id` VARCHAR(100) | — | Model Registry — all AI models |
| 19 | `model_routing_rules` | `rule_id` UUID | `model_id → registered_models` | Task → model mapping |
| 20 | `background_jobs` | `job_id` UUID | `user_id` | Celery job tracking |
| 21 | `admin_audit_log` | `log_id` UUID | `admin_user_id → users` | Immutable admin action log |
| 22 | `admin_sessions` | `session_id` UUID | `user_id → users` | Admin session tokens (separate from JWT) |

**Total: 22 tables. PRD §2 verified.**

### 4.2 Embedding Versioning Fields (Tables 5 & 15)

Both `document_chunks` and `domain_knowledge_chunks` carry full embedding provenance on every row:

```sql
embedding              vector(768)   -- dimension matches registered embedding model
embedding_model        VARCHAR(100)  -- e.g. 'text-embedding-004'
embedding_version      VARCHAR(50)   -- e.g. '1.0'
embedding_dimensions   INTEGER       -- e.g. 768
embedded_at            TIMESTAMPTZ
```

### 4.3 ai_requests — Computed Cost Column

```sql
-- input_cost_per_1m and output_cost_per_1m are snapshotted from
-- registered_models at request time and stored on the ai_requests row
estimated_cost_usd FLOAT GENERATED ALWAYS AS (
  (COALESCE(prompt_tokens,0) * input_cost_per_1m / 1000000.0) +
  (COALESCE(completion_tokens,0) * output_cost_per_1m / 1000000.0)
) STORED
```

### 4.4 registered_models Schema (Table 18 — Model Registry)

```sql
CREATE TABLE registered_models (
  model_id              VARCHAR(100) PRIMARY KEY,
  provider              VARCHAR(50)  NOT NULL,   -- google | openai | anthropic
  model_type            VARCHAR(50)  NOT NULL,   -- generation | embedding
  context_window        INTEGER,
  embedding_dimensions  INTEGER,                 -- NULL for generation models
  embedding_version     VARCHAR(50),             -- NULL for generation models
  cost_per_1m_input     FLOAT        NOT NULL,
  cost_per_1m_output    FLOAT        NOT NULL DEFAULT 0,
  supports_streaming    BOOLEAN      DEFAULT TRUE,
  is_active             BOOLEAN      DEFAULT TRUE,
  is_default_generation BOOLEAN      DEFAULT FALSE,
  is_default_embedding  BOOLEAN      DEFAULT FALSE,
  created_at            TIMESTAMPTZ  DEFAULT NOW()
);
```

### 4.5 Seeded Models (v1.0)

| model_id | provider | type | default |
|----------|---------|------|---------|
| `gemini-2.0-flash` | google | generation | ✓ |
| `gemini-1.5-flash-8b` | google | generation | — |
| `text-embedding-004` | google | embedding | ✓ (dims=768) |
| `gpt-4o` | openai | generation | — (inactive) |
| `claude-3-5-sonnet` | anthropic | generation | — (inactive) |

### 4.6 prompt_versions Schema (Table 16 — Prompt Registry)

```sql
CREATE TABLE prompt_versions (
  version_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key    VARCHAR(100) NOT NULL,   -- one of the 10 canonical keys
  tier          VARCHAR(20)  NOT NULL,   -- system | domain | tool
  version       INTEGER      NOT NULL,
  content       TEXT         NOT NULL,
  is_active     BOOLEAN      DEFAULT FALSE,
  created_by    UUID         REFERENCES users(user_id),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);
```

---

## 5. Service Architecture

### 5.1 ModelRegistry Service

**Principle:** No model string is hardcoded anywhere in application code. Every AI call resolves through `ModelRegistry`.

```python
class ModelRegistry:
    async def get_generation_model(self, db) -> RegisteredModel:
        """Returns the active default generation model (is_default_generation=TRUE)."""

    async def get_embedding_model(self, db) -> RegisteredModel:
        """Returns the active default embedding model (is_default_embedding=TRUE)."""

    async def get_model_for_task(self, task_class: str, domain: str, db) -> RegisteredModel:
        """Resolves best model via model_routing_rules table."""

    async def build_client(self, model: RegisteredModel):
        """Returns provider-appropriate client:
           google    → google.generativeai client
           openai    → openai.AsyncOpenAI
           anthropic → anthropic.AsyncAnthropic
        """
```

### 5.2 Prompt Registry Service

**10 Canonical Keys (frozen — no aliases, no alternatives):**

```
system.base          tier: system
domain.legal         tier: domain
domain.medical       tier: domain
domain.code          tier: domain
tool.workspace       tier: tool
tool.contract        tier: tool
tool.clinical        tier: tool
tool.audit           tier: tool
tool.compare         tier: tool
tool.code            tier: tool
```

**PromptRegistry** resolves the active version for a given key from `prompt_versions`
(the row where `is_active=TRUE` for that key).

**PromptAssembler** blends prompts using domain composition weights:

```
final_prompt = system.base
             + Σ(domain_weight × domain.{detected_domain})
             + tool.{current_tool}
```

### 5.3 Quality Heuristic Engine (QHE)

Scores segments on 0–100 across four dimensions weighted by domain.

**Dimensions:**
- **T** — Terminology Accuracy
- **S** — Structural Validity
- **D** — Domain Consistency (KL divergence)
- **C** — Contextual Coherence

**Domain-specific coefficients:**

| Domain | T | S | D | C | Sum |
|--------|---|---|---|---|-----|
| legal | 0.35 | 0.30 | 0.20 | 0.15 | 1.00 |
| medical | 0.30 | 0.25 | 0.25 | 0.20 | 1.00 |
| code | 0.20 | 0.40 | 0.25 | 0.15 | 1.00 |
| default | 0.25 | 0.25 | 0.25 | 0.25 | 1.00 |

**Canonical Thresholds — single source of truth for backend, frontend CSS, and Admin UI:**

| Score Range | Class | CSS Token | Meaning |
|-------------|-------|-----------|---------|
| 80–100 | `high` | `#22c55e` | Trusted — no treatment |
| 65–79 | `amber` | `#f59e0b` | Review recommended |
| 50–64 | `low` | `#f97316` | Questionable — review |
| 0–49 | `critical` | `#ef4444` | Regenerate |

### 5.4 Domain-to-KB Mapping

Used by `rag_retriever.py` when querying `domain_knowledge_chunks`:

```python
DOMAIN_TO_KB = {
    "code":    "engineering",   # NOT "code"
    "medical": "medical",
    "legal":   "legal",
}
```

- Domain `code` → queries KB `engineering`
- Domain `medical` → queries KB `medical`
- Domain `legal` → queries KB `legal`

### 5.5 Semantic Compare Pipeline (6 Steps)

```
Step 1 — Chunking
  Split each document into sentence-level chunks (<= 3 sentences)

Step 2 — Similarity
  Stage 2: Jaccard similarity matrix (NxM between all chunk pairs)
  Stage 5: Embedding cosine similarity via pgvector (replaces Jaccard)

Step 3 — Alignment
  Hungarian algorithm via scipy.optimize.linear_sum_assignment on cost matrix

Step 4 — Classification (exact thresholds)
  score >= 0.97  -> IDENTICAL
  score >= 0.82  -> MODIFIED (possible semantic shift)
  score >= 0.72  -> MODIFIED (textual change)
  score >= 0.65  -> CRITICAL
  score  < 0.65  -> REWRITTEN

Step 5 — LLM Analysis (MODIFIED pairs: 0.65 <= score < 0.82)
  Prompt: "Do these passages mean the same thing? Respond: YES/NO + one sentence explanation."
  If NO -> semantic_shift: true

Step 6 — Output
  { changes[], similarity_score, critical_count, semantic_count, textual_count }
```

### 5.6 RAG Retrieval Strategy

| Stage | Method | Table |
|-------|--------|-------|
| Stage 2 | Full-text search (FTS) via PostgreSQL `tsvector` | `domain_knowledge_chunks` |
| Stage 5 | pgvector cosine distance | `domain_knowledge_chunks` |

KB sizing:
- Development: 150–500 chunks (seeded in Stage 2)
- Production: 26,000 chunks (full corpus at deployment)

### 5.7 Export Sanitization

All user content rendered to HTML for PDF export must pass through `bleach.clean()` first:

```python
import bleach
safe_content = bleach.clean(
    user_content,
    tags=['p','h1','h2','h3','h4','ul','ol','li','strong','em','code','pre','table','tr','th','td','br'],
    attributes={'*': ['class']},
    strip=True
)
# Never use {{ content | safe }} without preceding bleach.clean()
```

---

## 6. API Route Verification

### Auth Routes
```
GET  /api/auth/google
GET  /api/auth/callback
POST /api/auth/refresh
POST /api/auth/logout
```

### User Routes (NOT /api/auth/me)
```
GET /api/users/me
PUT /api/users/me
GET /api/users/me/stats
```

### Document Routes
```
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PUT    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/upload-url     <- NOT /ingest
```

### Intelligence Routes
```
POST /api/intelligence/scan
POST /api/intelligence/complete
POST /api/intelligence/confidence
POST /api/intelligence/compare       <- NOT /compare-domains
```

### Tool Routes (8 tools)
```
POST /api/tools/analyze-contract
POST /api/tools/clinical-notes
POST /api/tools/code-review
POST /api/tools/code-docstring
POST /api/tools/code-readme
POST /api/tools/code-bug-explain
POST /api/tools/compare-documents
POST /api/tools/audit-document
```

### Template Routes
```
GET /api/templates
GET /api/templates/:id
```

### Export Routes
```
POST   /api/exports
GET    /api/exports
GET    /api/exports/:id
DELETE /api/exports/:id
POST   /api/exports/bulk-download
```

### Session & Job Routes
```
POST /api/sessions
PUT  /api/sessions/:id
GET  /api/sessions
GET  /api/jobs/:id/status
```

### System Routes
```
GET /api/health
GET /api/stats
```

### Admin Routes
```
GET    /admin/api/overview
GET    /admin/api/users
PATCH  /admin/api/users/:id/plan
PATCH  /admin/api/users/:id/role
PATCH  /admin/api/users/:id/deactivate
PATCH  /admin/api/users/:id/reset-tokens
GET    /admin/api/prompts
GET    /admin/api/prompts/:key
POST   /admin/api/prompts/:key/versions
POST   /admin/api/prompts/:key/versions/:v/activate
GET    /admin/api/prompts/:key/diff
GET    /admin/api/knowledge
POST   /admin/api/knowledge/chunks
DELETE /admin/api/knowledge/chunks/:id
POST   /admin/api/knowledge/embed
GET    /admin/api/costs/summary
GET    /admin/api/costs/top-users
GET    /admin/api/logs
```

**Total routes: 54 API endpoints (including admin).**

---

## 7. Security Architecture

### 7.1 Auth Security
- Google OAuth 2.0 with PKCE
- RS256 JWT (4096-bit RSA key pair), 15-minute access token lifetime
- Refresh token: 7 days, stored in Redis, rotated on each use, revoked on logout
- OAuth state stored in Redis (10 min TTL) for CSRF protection
- Tokens delivered via `HttpOnly + Secure + SameSite=Strict` cookies

### 7.2 Rate Limiting (slowapi)

| Endpoint | Limit |
|----------|-------|
| `/api/intelligence/complete` | 30/hour |
| `/api/intelligence/scan` | 60/hour |
| `/api/intelligence/confidence` | 60/hour |
| `/api/intelligence/compare` | 10/hour |
| `/api/tools/*` | 10–30/hour (per tool) |
| All unauthenticated | 10/minute per IP |

### 7.3 Admin Security
- Separate `require_admin` dependency on all `/admin/api/*` endpoints
- Role hierarchy: `user < admin < super_admin`
- Self-escalation prohibited (admin cannot promote themselves to super_admin)
- Every admin mutation writes to `admin_audit_log` before returning response
- Admin session tokens stored in `admin_sessions` table (separate from user JWT)

### 7.4 Clinical Boundary
- Persistent PHI disclaimer in Clinical Notes UI
- `X-Proxima-Clinical-Boundary: non-hipaa` header on every `/api/tools/clinical-notes` response
- Boundary notice in README and `/pricing` page fine print

---

## 8. Stage-by-Stage Build Plan

### Stage 1 — Foundation
**Goal:** Authenticated, tested skeleton with all 22 tables and ModelRegistry.

**Deliverables:**
- Full database schema — all 22 tables, pgvector extension, Alembic migration
- Embedding versioning fields on `document_chunks` and `domain_knowledge_chunks`
- `registered_models` table seeded with 5 models (`gemini-2.0-flash` default)
- ModelRegistry service (get_generation_model, get_embedding_model, get_model_for_task, build_client)
- Google OAuth 2.0 + PKCE flow (RS256 JWT, HttpOnly cookies, Redis refresh tokens)
- `/api/auth/*`, `/api/users/me` routes operational
- `/api/health` + `/api/stats` routes
- pytest + vitest + playwright scaffolding
- GitHub Actions CI (backend-test + frontend-test + e2e-test + build jobs)
- Docker + docker-compose (postgres 16 + pgvector + redis 7)
- Frontend shell: React 18 + Vite + Tailwind + React Router v6, auth flow, protected route guard
- Landing page (`/`) stub + Dashboard (`/dashboard`) stub

**PRD §13 checklist:** Auth (4 items), Schema (2 items), Model (1 item), Testing (1 item), CI/CD (1 item)

---

### Stage 2 — Intelligence Core
**Goal:** All intelligence features operational end-to-end using FTS RAG and Jaccard compare.

**Deliverables:**
- Domain Detector (lexical + structural detection -> legal/medical/code/default)
- Prompt Registry: all 10 canonical keys seeded into `prompt_versions`
- Prompt Assembler: domain-weighted prompt blending
- Quality Heuristic Engine: T, S, D, C dimensions with domain-specific coefficients
- RAG Retriever: FTS via PostgreSQL `tsvector`
- Domain-to-KB mapping: `code -> engineering`, `medical -> medical`, `legal -> legal`
- Semantic Compare: Steps 1–6 with Jaccard similarity (Stage 2 variant)
- Development KB seed: 150–500 chunks across 3 knowledge bases
- Celery: 4 queues + Beat + ingest/export/embed tasks
- S3/R2 integration + local fallback storage
- Upload validation pipeline (MIME + magic-byte + 20MB + archive bomb + ClamAV stub)
- All 8 Tool endpoints operational (`/api/tools/*`)
- All 4 Intelligence endpoints operational (`/api/intelligence/*`)
- Document CRUD + `/api/documents/upload-url`
- Template routes with 50 seeded templates
- Export routes (PDF/DOCX/MD/CSV/JSON via WeasyPrint + bleach.clean())
- Session + Job status routes
- Frontend: Workspace, ContractAnalyzer, ClinicalNotes, CodeSuite, DocumentCompare,
  Templates, ConfidenceAudit, DomainRadar pages
- Clinical boundary: persistent UI disclaimer + `X-Proxima-Clinical-Boundary` response header
- Unit tests: domain_detector, confidence_scorer, prompt_assembler, semantic_compare
- Integration tests: auth_flow, intelligence_endpoints, tools_endpoints, export_tasks

**PRD §13 checklist:** Intelligence (5 items), Celery (1 item), Storage (1 item), Security upload (1 item)

---

### Stage 3 — Admin Platform
**Goal:** Full 6-page admin platform with audit logging.

**Deliverables:**
- Admin authentication: `admin_sessions` table, `require_admin` dependency
- All 18 admin routes (`/admin/api/*`) operational
- Admin pages (6):
  1. Overview — platform stats
  2. Users — list, plan change, role change, deactivate, token reset
  3. Prompts — list all 10 keys, view versions, create new version, activate, diff view
  4. Knowledge — list chunks, add chunk, delete chunk, trigger re-embed
  5. Costs — summary, top users
  6. Logs — admin audit log viewer
- Admin audit log: every mutation writes to `admin_audit_log` before response
- Role hierarchy enforcement: self-escalation blocked at service layer
- Framer Motion animation system (page transitions, micro-interactions)
- Frontend: Admin section at `/admin/*` with `RequireAdmin` route guard

**PRD §13 checklist:** Admin (2 items), Animation (1 item)

---

### Stage 4 — Polish & Landing
**Goal:** Production-quality landing page and UI polish.

**Deliverables:**
- Three.js cinematic hero on Landing page (`/`)
- GSAP scroll animations
- Pricing page (`/pricing`) with Clinical boundary fine print
- Full Framer Motion polish across all 10 pages
- Domain Radar polygon rendering (Recharts) — Vitest: polygon vertex calculation
- Confidence Heatmap component — Vitest: correct CSS class per threshold
- SSE streaming in `useCompletion` hook — Vitest: streaming mock test
- E2E: auth.spec.ts, workspace.spec.ts, analyze.spec.ts, export.spec.ts, admin.spec.ts

**PRD §13 checklist:** Landing (1 item)

---

### Stage 5 — Embeddings, pgvector & Production
**Goal:** Full vector search, production corpus, monitoring, and deployment.

**Deliverables:**
- Embedding pipeline: `text-embedding-004` via ModelRegistry, stored with versioning fields
- Re-embedding background job when embedding model changes
- Production KB seed: 26,000 chunks across 3 knowledge bases
- pgvector cosine similarity replacing FTS in RAG retriever
- Semantic Compare Step 2 upgraded: embedding cosine similarity matrix (replaces Jaccard)
- Full export formats: PDF (WeasyPrint + bleach.clean()), DOCX (python-docx), MD, CSV, JSON
- Bulk download (`/api/exports/bulk-download`)
- Token reset + usage gates (billing tier enforcement)
- Sentry integration (full PHI/PII redaction in before_send hook)
- PostHog analytics
- Docker production build + docker-compose production config
- Railway / Render deployment configuration
- Vercel frontend deployment configuration

**PRD §13 checklist:** Exports (2), Embeddings (2), RAG (1), Semantic compare (1),
Monitoring (1), Analytics (1), Billing (1), Deploy (1)

---

## 9. Verification Summary

| Specification Item | Count | Status |
|-------------------|-------|--------|
| Database tables | 22/22 | Verified |
| Model Registry methods | 4/4 | Verified |
| Prompt Registry keys | 10/10 | Verified |
| API route groups | 11 groups | Verified |
| Total API endpoints | 54 | Verified |
| Application pages | 10/10 | Verified |
| QHE dimensions | 4 (T, S, D, C) | Verified |
| QHE domain coefficients | 4 domains | Verified |
| QHE confidence thresholds | 4 bands | Verified |
| Domain-to-KB mappings | 3 (code->engineering, medical, legal) | Verified |
| Semantic compare steps | 6/6 | Verified |
| Seeded models | 5/5 | Verified |
| Celery queues | 4/4 | Verified |
| Backend test files | 8/8 | Verified |
| Frontend test files | 4/4 | Verified |
| E2E test files | 5/5 | Verified |
| Build stages | 5/5 | Verified |

---

*Architecture derived exclusively from Proxima v4.1 PRD · `docs/PRD/Proxima_v4_PRD_v2.md`*
