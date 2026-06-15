# PROXIMA v4.0
## Product Requirements Document — Master Specification
**v4.1 · Engineered by Arnav Garg · B.Tech CSE (AI/ML) · UPES Dehradun · 2026**

---

## 1. Executive Summary

Proxima is a professional AI writing suite — a single platform serving lawyers, doctors, engineers, and business professionals across the complete lifecycle of document work: drafting, completing, analyzing, comparing, auditing, and exporting.

Proxima's three proprietary intelligence layers power every feature:
- **Context-Aware Inline Intelligence** — reads the entire document before completing a single word
- **Cross-Domain Collision Engine** — auto-detects domain composition and fuses intelligence layers proportionally
- **Completion Confidence Scoring** — scores every completed segment via the Quality Heuristic Engine

> **Clinical Boundary Notice:** Proxima v1.0 is NOT HIPAA-compliant. The Clinical Notes tool is an educational and professional drafting aid only. Storage of Protected Health Information (PHI) is strictly prohibited. Users must not enter real patient names, dates of birth, SSNs, medical record numbers, or any other PHI into Proxima.

---

## 2. Database Schema — 22 Tables

The schema consists of exactly **22 tables**. No other count is correct.

### 2.1 Table Index (dependency order)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Auth + profile + plan + role |
| 2 | `projects` | Document grouping |
| 3 | `documents` | Document metadata + ingest state |
| 4 | `document_versions` | Version history |
| 5 | `document_chunks` | RAG chunks + embeddings |
| 6 | `segment_confidence_scores` | Per-segment quality scores |
| 7 | `sessions` | App-level usage sessions |
| 8 | `ai_requests` | Every AI call (cost computed column) |
| 9 | `templates` | 50 professional templates |
| 10 | `exports` | File export records |
| 11 | `audit_reports` | Full document quality reports |
| 12 | `comparisons` | Document comparison results |
| 13 | `contract_analyses` | Contract analysis results |
| 14 | `clinical_notes` | Clinical note generation results |
| 15 | `domain_knowledge_chunks` | Global KB for RAG + embeddings |
| 16 | `prompt_versions` | Prompt Registry — version-controlled prompts |
| 17 | `output_schemas` | JSON output schemas per tool |
| 18 | `registered_models` | Model Registry — all AI models |
| 19 | `model_routing_rules` | Task → model mapping |
| 20 | `background_jobs` | Celery job tracking |
| 21 | `admin_audit_log` | Immutable admin action log |
| 22 | `admin_sessions` | Admin session tokens |

### 2.2 Key Schema Details

**document_chunks and domain_knowledge_chunks** must include these embedding versioning fields on every vector record:
```sql
embedding              vector(768)   -- dimension matches registered embedding model
embedding_model        VARCHAR(100)  -- e.g. 'text-embedding-004'
embedding_version      VARCHAR(50)   -- e.g. '1.0'
embedding_dimensions   INTEGER       -- e.g. 768
embedded_at            TIMESTAMPTZ
```

**ai_requests** computed column:
```sql
estimated_cost_usd FLOAT GENERATED ALWAYS AS (
  (COALESCE(prompt_tokens,0) * input_cost_per_1m / 1000000.0) +
  (COALESCE(completion_tokens,0) * output_cost_per_1m / 1000000.0)
) STORED
```
Note: `input_cost_per_1m` and `output_cost_per_1m` come from the registered model at request time and are stored on the ai_requests row so the computed column remains accurate as model pricing changes.

---

## 3. Model Registry

All AI model references in Proxima are resolved through the Model Registry — the `registered_models` table. No model string is hardcoded anywhere in application code.

### 3.1 registered_models schema

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

### 3.2 ModelRegistry service

```python
class ModelRegistry:
    async def get_generation_model(self, db) -> RegisteredModel:
        """Returns the active default generation model."""

    async def get_embedding_model(self, db) -> RegisteredModel:
        """Returns the active default embedding model."""

    async def get_model_for_task(self, task_class: str, domain: str, db) -> RegisteredModel:
        """Returns the best model for a given task via model_routing_rules."""

    async def build_client(self, model: RegisteredModel):
        """Returns provider-appropriate client (google | openai | anthropic)."""
```

Application code calls `model_registry.get_generation_model(db)` — never imports or instantiates a provider SDK directly.

### 3.3 Seeded models (v1.0)

| model_id | provider | type | default |
|----------|---------|------|---------|
| `gemini-2.0-flash` | google | generation | ✓ |
| `gemini-1.5-flash-8b` | google | generation | — |
| `text-embedding-004` | google | embedding | ✓ (dims=768) |
| `gpt-4o` | openai | generation | — (inactive) |
| `claude-3-5-sonnet` | anthropic | generation | — (inactive) |

---

## 4. Prompt Registry — Canonical Key List

The following is the **frozen canonical list** of prompt keys. All stages and all application code must use exactly these keys. No aliases, no alternatives.

```
system.base

domain.legal
domain.medical
domain.code

tool.workspace
tool.contract
tool.clinical
tool.audit
tool.compare
tool.code
```

Total: **10 prompt keys**. Every key has a `tier` value:
- `system.base` → tier: `system`
- `domain.*` → tier: `domain`
- `tool.*` → tier: `tool`

---

## 5. API Contract — Frozen Endpoint Paths

The following paths are canonical. Stages must not deviate.

```
# Auth
GET  /api/auth/google
GET  /api/auth/callback
POST /api/auth/refresh
POST /api/auth/logout

# Users (NOT /api/auth/me)
GET  /api/users/me
PUT  /api/users/me
GET  /api/users/me/stats

# Documents
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PUT    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/upload-url     ← NOT /ingest

# Intelligence
POST /api/intelligence/scan
POST /api/intelligence/complete
POST /api/intelligence/confidence
POST /api/intelligence/compare       ← NOT /compare-domains

# Tools
POST /api/tools/analyze-contract
POST /api/tools/clinical-notes
POST /api/tools/code-review
POST /api/tools/code-docstring
POST /api/tools/code-readme
POST /api/tools/code-bug-explain
POST /api/tools/compare-documents
POST /api/tools/audit-document

# Templates
GET /api/templates
GET /api/templates/:id

# Exports
POST   /api/exports
GET    /api/exports
GET    /api/exports/:id
DELETE /api/exports/:id
POST   /api/exports/bulk-download

# Sessions & Jobs
POST /api/sessions
PUT  /api/sessions/:id
GET  /api/sessions
GET  /api/jobs/:id/status

# System
GET /api/health
GET /api/stats

# Admin
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

---

## 6. Confidence Scoring — Canonical Thresholds

The Quality Heuristic Engine produces a score from 0–100. The following thresholds are used **everywhere** — in the backend scorer, frontend CSS classes, Admin UI, and documentation. No local copies.

| Score Range | Class | CSS Token | Meaning |
|-------------|-------|-----------|---------|
| 80 – 100 | `high` | `#22c55e` | Trusted — no treatment |
| 65 – 79 | `amber` | `#f59e0b` | Review recommended |
| 50 – 64 | `low` | `#f97316` | Questionable — review |
| 0 – 49 | `critical` | `#ef4444` | Regenerate |

---

## 7. Intelligence Architecture

### 7.1 Quality Heuristic Engine (Confidence Scoring)

Internally referred to as the **Quality Heuristic Engine**. Externally documented as Confidence Scoring or Confidence Audit. The four dimensions remain:

- T — Terminology Accuracy
- S — Structural Validity
- D — Domain Consistency (KL divergence)
- C — Contextual Coherence

Domain-specific coefficients:

| Domain | T | S | D | C |
|--------|---|---|---|---|
| legal | 0.35 | 0.30 | 0.20 | 0.15 |
| medical | 0.30 | 0.25 | 0.25 | 0.20 |
| code | 0.20 | 0.40 | 0.25 | 0.15 |
| default | 0.25 | 0.25 | 0.25 | 0.25 |

### 7.2 Domain-to-KB Mapping

When retrieving RAG context, domain labels map to knowledge base names as follows:

```python
DOMAIN_TO_KB = {
    "code":    "engineering",   # not "code"
    "medical": "medical",
    "legal":   "legal",
}
```

### 7.3 Semantic Compare Pipeline

Document comparison follows this exact pipeline:

```
Step 1 — Chunking
  Split each document into sentence-level chunks (≤ 3 sentences)

Step 2 — Similarity (Stage 2: Jaccard; Stage 5: Embedding cosine)
  Build N×M similarity matrix between all chunk pairs

Step 3 — Alignment
  Hungarian algorithm (scipy.optimize.linear_sum_assignment) on cost matrix

Step 4 — Classification (exact thresholds)
  score ≥ 0.97 → IDENTICAL
  score ≥ 0.82 → MODIFIED (possible semantic shift)
  score ≥ 0.72 → MODIFIED (textual change)
  score ≥ 0.65 → CRITICAL
  score  < 0.65 → REWRITTEN

Step 5 — LLM Analysis
  For MODIFIED pairs (0.65 ≤ score < 0.82):
  Send both chunks to generation model:
  "Do these passages mean the same thing? Respond: YES/NO + one sentence explanation."
  If NO → classify as semantic_shift: true

Step 6 — Output
  Return: changes[], similarity_score, critical_count, semantic_count, textual_count
```

Stage 2 uses Jaccard similarity in Step 2.
Stage 5 replaces Step 2 with embedding cosine similarity (pgvector).

### 7.4 RAG Retrieval Strategy

Stage 2: Full-text search (FTS) via PostgreSQL `tsvector`.
Stage 5: Vector similarity via pgvector cosine distance.

The `domain_knowledge_chunks` table uses the DOMAIN_TO_KB mapping:
- Query context from the `engineering` KB when code domain is dominant
- Query context from the `medical` KB when medical domain is dominant
- Query context from the `legal` KB when legal domain is dominant

### 7.5 Knowledge Base Sizing

| Environment | Chunks |
|-------------|--------|
| Development | 150–500 |
| Production | 26,000 |

Development seeding (Stage 2) targets 150–500 chunks across the three KBs.
Production seeding (deployment) targets the full 26,000 chunk corpus.

---

## 8. Embedding Versioning

Every row in `document_chunks` and `domain_knowledge_chunks` must carry full embedding provenance:

```python
embedding_model      = "text-embedding-004"   # from Model Registry at embed time
embedding_version    = "1.0"                  # from Model Registry
embedding_dimensions = 768                    # from Model Registry
embedded_at          = datetime.now(UTC)
```

When the embedding model changes, old chunks are re-embedded in a background job. The version fields allow mixing old and new embeddings safely during transition.

---

## 9. Information Architecture — 10 Pages

| # | Page | Route | Auth |
|---|------|-------|------|
| 1 | Landing | `/` | Public |
| 2 | Workspace | `/workspace` | Required |
| 3 | Contract Analyzer | `/analyze` | Required |
| 4 | Clinical Notes | `/clinical` | Required |
| 5 | Code Suite | `/code` | Required |
| 6 | Document Compare | `/compare` | Required |
| 7 | Template Library | `/templates` | Browse public, use requires auth |
| 8 | Confidence Audit | `/audit` | Required |
| 9 | Domain Radar | `/radar` | Required |
| 10 | Dashboard | `/dashboard` | Required |
| — | Pricing | `/pricing` | Public |
| — | Admin | `/admin/*` | Admin role |

---

## 10. Clinical Notes Boundary

```
⚠️  PROXIMA v1.0 — CLINICAL BOUNDARY

NOT HIPAA-compliant.
Clinical Notes is an educational and professional drafting tool.
PHI storage is strictly prohibited.

What constitutes PHI (do NOT enter):
  - Patient full name
  - Date of birth
  - Social Security Number
  - Medical Record Number
  - Address, phone, email
  - Dates of service tied to an individual
  - Any identifier linking text to a real patient

Permitted patient context fields (no PHI):
  - Age range (e.g. "40s", "pediatric")
  - Biological sex
  - Chief complaint (general, non-identifying)

This boundary must be displayed:
  - In the Clinical Notes UI (persistent disclaimer)
  - In the API response header: X-Proxima-Clinical-Boundary: non-hipaa
  - In the README
  - In the /pricing page fine print
```

---

## 11. Testing Requirements

Every release must pass all test suites before deployment.

### 11.1 Backend (pytest)

```
Framework:   pytest + pytest-asyncio
Coverage:    ≥ 80% on services/ and routers/

Required test files:
  tests/
    unit/
      test_domain_detector.py       ← detection accuracy on known texts
      test_confidence_scorer.py     ← dimension scores + thresholds
      test_prompt_assembler.py      ← blending logic
      test_semantic_compare.py      ← Hungarian alignment correctness
    integration/
      test_auth_flow.py             ← Google OAuth mock + JWT validation
      test_intelligence_endpoints.py← /scan, /complete, /confidence, /compare
      test_tools_endpoints.py       ← all 8 tool endpoints with mocked Gemini
      test_export_tasks.py          ← Celery task with mocked S3
    fixtures/
      sample_legal_doc.txt
      sample_medical_doc.txt
      sample_code_doc.py
```

### 11.2 Frontend (Vitest)

```
Framework: Vitest + React Testing Library

Required test files:
  src/__tests__/
    DomainRadar.test.tsx       ← polygon vertex calculation
    ConfidenceHeatmap.test.tsx ← correct CSS class per threshold
    useCompletion.test.tsx     ← SSE streaming mock
    auth.test.tsx              ← protected route redirect
```

### 11.3 E2E (Playwright)

```
Framework: Playwright

Required scenarios:
  e2e/
    auth.spec.ts           ← login → dashboard flow
    workspace.spec.ts      ← upload → scan → complete → confidence
    analyze.spec.ts        ← contract upload → analysis result
    export.spec.ts         ← generate PDF → download
    admin.spec.ts          ← admin login → user list → prompt activate
```

### 11.4 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
# Triggers: push to main, all PRs

jobs:
  backend-test:
    - Install Python deps
    - Run pytest with coverage
    - Fail if coverage < 80%

  frontend-test:
    - Install Node deps
    - Run vitest
    - Run tsc --noEmit (type check)

  e2e-test:
    - Start docker-compose (postgres + redis)
    - Run migrations + seed
    - Start backend + frontend
    - Run playwright tests

  build:
    - npm run build (frontend)
    - docker build (backend)
    - Fail if either fails
```

---

## 12. Security

### 12.1 Authentication
- Google OAuth 2.0 with PKCE
- RS256 JWT (4096-bit RSA) in HttpOnly + Secure + SameSite=Strict cookies
- Access token: 15 minutes
- Refresh token: 7 days, Redis-stored, rotated on each use
- Refresh token revocation on logout
- OAuth state stored in Redis (10 min TTL) for CSRF protection

### 12.2 Upload Security
Every file upload must be validated in this order before processing:
1. MIME type validation (Content-Type header)
2. Magic-byte validation (read first 512 bytes, compare to known signatures)
3. File size limit: 20MB per file
4. Archive bomb protection: reject ZIP/archives containing other archives
5. Malware scan hook: `scan_file(path)` — stub returning True in v1.0, pluggable for ClamAV

### 12.3 Export Sanitization
All user-supplied content rendered into HTML for PDF export must be sanitized:
```python
import bleach
safe_content = bleach.clean(
    user_content,
    tags=['p','h1','h2','h3','h4','ul','ol','li','strong','em','code','pre','table','tr','th','td','br'],
    attributes={'*': ['class']},
    strip=True
)
```
Never use `{{ content | safe }}` without preceding `bleach.clean()`.

### 12.4 Admin Authorization
- `require_admin` dependency on all `/admin/api/*` endpoints
- Role hierarchy: `user < admin < super_admin`
- Role self-escalation is prohibited (admin cannot promote themselves to super_admin)
- Every admin mutation logs to `admin_audit_log` before returning response
- Admin session tokens are separate from user JWT (stored in `admin_sessions`)

### 12.5 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/intelligence/complete` | 30/hour |
| `/api/intelligence/scan` | 60/hour |
| `/api/intelligence/confidence` | 60/hour |
| `/api/intelligence/compare` | 10/hour |
| `/api/tools/*` | 10–30/hour (per tool) |
| All unauthenticated | 10/minute per IP |

---

## 13. Production Readiness Checklist

| Category | Item | Stage |
|----------|------|-------|
| Auth | Google OAuth 2.0 + PKCE | 1 |
| Auth | RS256 JWT + HttpOnly cookies | 1 |
| Auth | Refresh rotation + revocation | 1 |
| Auth | Redis session storage | 1 |
| Schema | 22 tables + pgvector | 1 |
| Schema | Embedding versioning fields | 1 |
| Model | ModelRegistry abstraction | 1 |
| Testing | pytest + vitest + playwright | 1 |
| CI/CD | GitHub Actions pipeline | 1 |
| Intelligence | Domain detection (lexical+structural) | 2 |
| Intelligence | Prompt Registry (10 canonical keys) | 2 |
| Intelligence | Quality Heuristic Engine | 2 |
| Intelligence | FTS RAG (code→engineering mapping) | 2 |
| Intelligence | Semantic compare (Jaccard+LLM) | 2 |
| Celery | 4 queues + Beat + tasks | 2 |
| Storage | S3/R2 + local fallback | 2 |
| Security | Upload validation pipeline | 2 |
| Admin | 6-page admin platform | 3 |
| Admin | Audit log + no self-escalation | 3 |
| Animation | Framer Motion system | 3 |
| Landing | Three.js cinematic hero | 4 |
| Exports | PDF + DOCX + MD + CSV + JSON | 5 |
| Exports | bleach.clean() sanitization | 5 |
| Embeddings | text-embedding-004 via ModelRegistry | 5 |
| Embeddings | Embedding versioning on all records | 5 |
| RAG | pgvector cosine similarity | 5 |
| Semantic compare | Embedding similarity matrix | 5 |
| Monitoring | Sentry (full redaction) | 5 |
| Analytics | PostHog | 5 |
| Billing | Token reset + usage gates | 5 |
| Deploy | Docker + docker-compose | 5 |

---

## 14. Tech Stack

### Frontend
React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Three.js, GSAP, Zustand, React Router v6, TanStack Query, Recharts, PDF.js, mammoth, marked

### Backend
Python 3.11, FastAPI, SQLAlchemy 2.0 async, asyncpg, Alembic, aioredis, python-jose (RS256), Authlib, Celery, pgvector, scipy, PyMuPDF, pytesseract, python-docx, WeasyPrint, bleach, boto3, structlog, sentry-sdk, slowapi

### Infrastructure
PostgreSQL 16 + pgvector, Redis 7, AWS S3 / Cloudflare R2, Vercel (frontend), Railway / Render (backend + workers), pgvector/pgvector:pg16 (Docker image)

---

*Proxima v4.1 PRD — Engineered by Arnav Garg · 2026*
