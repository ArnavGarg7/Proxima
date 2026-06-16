# Stage 1 Readiness Report
**Risk Analysis & Pre-Flight Checks for Proxima v4.0**

This report analyzes the architecture specification against the Stage 1 build plan to identify missing components, hidden risks, and setup requirements before implementation begins.

---

## 1. Missing Dependencies

The PRD tech stack is comprehensive but omits several critical transitive and utility dependencies required for Stage 1 execution:

**Backend (Python):**
- `uvicorn` — ASGI server required to run FastAPI.
- `pydantic-settings` — Required for `config.py` environment variable management (separated from core Pydantic in v2).
- `greenlet` — Required by SQLAlchemy 2.0 for async ORM operations.
- `cryptography` — Required by `python-jose` to support RS256 asymmetric JWT signing.
- `httpx` — Required by `Authlib` to make async outbound HTTP requests to Google's OAuth endpoints.
- `pgvector` (Python package) — Required for SQLAlchemy to recognize and map the `vector(768)` column type.

**Frontend (Node):**
- `lucide-react` (or similar) — Required for UI iconography (implied by the rich UI requirements).

---

## 2. Missing Environment Variables

To successfully boot Stage 1, the following environment variables must be defined in `.env` files. (Not explicitly listed in the PRD, but structurally required):

**Backend (`.env`):**
- `DATABASE_URL` — e.g., `postgresql+asyncpg://user:pass@db:5432/proxima`
- `REDIS_URL` — e.g., `redis://redis:6379/0`
- `CORS_ORIGINS` — Comma-separated list of allowed frontend URLs (e.g., `http://localhost:5173`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — For Authlib.
- `GOOGLE_REDIRECT_URI` — Must exactly match Google Cloud Console (e.g., `http://localhost:8000/api/auth/callback`).
- `RSA_PRIVATE_KEY` / `RSA_PUBLIC_KEY` — PEM strings or file paths required for RS256 JWT signing.

**Frontend (`.env`):**
- `VITE_API_BASE_URL` — e.g., `http://localhost:8000`

---

## 3. Database Migration Risks

1. **pgvector Extension Creation:** Alembic's autogenerate will map the `vector` columns, but it will *not* automatically generate the SQL to create the extension. The first migration file must be manually edited to include `op.execute('CREATE EXTENSION IF NOT EXISTS vector;')` before any table creation commands.
2. **Migration Size:** Creating all 22 tables in a single initial migration is required by Stage 1. This requires strict topological sorting of foreign keys. The creation order must exactly follow the dependency chain (e.g., `users` → `registered_models` → `projects` → `documents` → `document_chunks`).
3. **UUID Generation:** Postgres 16 uses `gen_random_uuid()`. We must ensure SQLAlchemy models define `server_default=text("gen_random_uuid()")` rather than relying on Python-side UUID generation for performance and consistency.

---

## 4. Docker Risks

1. **Postgres Image:** Using the standard `postgres:16` image will cause immediate failure upon Alembic migration. The `docker-compose.yml` MUST use `pgvector/pgvector:pg16`.
2. **Frontend HMR:** Vite inside Docker requires specific polling configurations (`watch: { usePolling: true }`) and exposing port 5173, otherwise Hot Module Replacement fails on Windows host machines.
3. **Network Resolution:** The backend must connect to the database using the docker-compose service name (`db`), not `localhost`.

---

## 5. OAuth & Security Risks

1. **Cookie SameSite Policy:** The PRD specifies `SameSite=Strict` for cookies. However, Google's OAuth callback is a cross-site navigation. If the JWT is issued and set during this callback, `SameSite=Strict` may cause modern browsers to drop the cookie on the redirect back to the frontend. **Mitigation:** The auth cookie may need `SameSite=Lax`, or the frontend must handle the callback and exchange an authorization code via a first-party API call.
2. **Localhost HTTPS:** The PRD specifies `Secure` cookies. In local development (HTTP), `Secure` cookies are ignored by browsers. **Mitigation:** The backend must read an environment variable (e.g., `ENVIRONMENT=development`) and conditionally set `secure=False` locally.
3. **Redis Volatility:** The PRD relies on Redis for Refresh Tokens. If the Redis container crashes or restarts without persistence, all users are immediately logged out.

---

## 6. pgvector Setup Requirements

- **Docker:** Must use `image: pgvector/pgvector:pg16` in `docker-compose.yml`.
- **SQLAlchemy Model:** Must import `from pgvector.sqlalchemy import Vector` and define columns as `mapped_column(Vector(768))`.
- **Initialization:** The database user must have superuser privileges temporarily during the first migration to execute `CREATE EXTENSION vector;`.

---

## 7. Redis Setup Requirements

- **Persistence:** The Redis Docker command must include `--appendonly yes` to persist Refresh Tokens to disk.
- **Logical Databases:** To prevent Celery from flushing auth tokens during queue purges, Redis logical databases must be isolated in the connection URLs:
  - Tokens/Sessions: `redis://redis:6379/0`
  - Celery Broker: `redis://redis:6379/1`

---

## 8. Contradictions (Architecture vs. Stage 1 Plan)

1. **Table Prerequisite vs. Feature Reality:** Stage 1 requires creating all 22 tables, including `clinical_notes`, `prompt_versions`, and `contract_analyses`. However, the logic that populates and reads these tables isn't built until Stages 2 and 3.
   - *Risk:* Building the schema before the business logic may lead to schema drift. We must commit to the PRD schema exactly and avoid altering it until the features are actually wired up.
2. **ModelRegistry Abstraction:** Stage 1 mandates building the `ModelRegistry` service, but there are no AI endpoints to actually test it.
   - *Risk:* The service will be built "blind".
   - *Mitigation:* We should write thorough unit tests for `ModelRegistry` using mock DB sessions in Stage 1 to guarantee it works before Stage 2 relies on it.
3. **Embedding Versioning:** Tables 5 and 15 require embedding versioning fields, but Stage 1 doesn't generate embeddings.
   - *Mitigation:* We will define the fields as nullable or provide safe defaults for the schema, ensuring they are ready for Stage 2/5 data ingestion.

---
*Ready for approval to begin Stage 1 implementation.*
