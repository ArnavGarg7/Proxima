"""Backfill embeddings for chunks that were persisted without a vector.

Historical chunks were ingested while the registered embedding model was
unavailable (see migration 2026_08_24_embedfix), so their `embedding` column is
NULL and they are invisible to vector retrieval (FTS-only). This script embeds
every chunk with a NULL embedding using the *current* default embedding model,
with bounded concurrency and batched commits.

Idempotent: it only touches rows where embedding IS NULL, so re-running after a
partial run (or after new NULLs appear) is safe.

Run inside the backend container:
    python scripts/backfill_embeddings.py            # all NULL-embedding chunks
    python scripts/backfill_embeddings.py --limit 50 # cap this run
    python scripts/backfill_embeddings.py --concurrency 4
"""
import argparse
import asyncio
import os
import sys

# Allow running as `python scripts/backfill_embeddings.py` from the backend root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, func

from proxima.database import AsyncSessionLocal
from proxima.models import DocumentChunk
from proxima.services.embedding import generate_chunk_embedding
from proxima.services.model_registry import model_registry


class _RateLimiter:
    """Spaces calls to stay under a requests-per-minute quota (Gemini free tier
    is 100/min for the embedding model). A single lock enforces a minimum
    interval between successive acquisitions."""

    def __init__(self, rpm: int):
        self._min_interval = 60.0 / rpm if rpm and rpm > 0 else 0.0
        self._lock = asyncio.Lock()
        self._next = 0.0

    async def acquire(self):
        if self._min_interval <= 0:
            return
        async with self._lock:
            loop = asyncio.get_event_loop()
            now = loop.time()
            wait = self._next - now
            if wait > 0:
                await asyncio.sleep(wait)
            self._next = max(now, self._next) + self._min_interval


async def _embed_one(sem, limiter, chunk_id, content):
    """Return (chunk_id, vector|None). Never raises — failures are reported."""
    async with sem:
        await limiter.acquire()
        async with AsyncSessionLocal() as db:
            try:
                vector = await generate_chunk_embedding(db, content)
            except Exception:
                vector = None
    return chunk_id, vector


async def main(limit: int | None, concurrency: int, batch: int, rpm: int) -> None:
    async with AsyncSessionLocal() as db:
        emb_model = await model_registry.get_default_embedding(db)
        print(f"default embedding model: {emb_model.model_id} "
              f"(dims={emb_model.embedding_dimensions}, version={emb_model.embedding_version})")

        stmt = select(DocumentChunk.chunk_id, DocumentChunk.content).where(
            DocumentChunk.embedding.is_(None)
        ).order_by(DocumentChunk.chunk_id)
        if limit:
            stmt = stmt.limit(limit)
        rows = (await db.execute(stmt)).all()

    total = len(rows)
    print(f"chunks needing embeddings: {total}")
    if total == 0:
        print("nothing to backfill.")
        return

    sem = asyncio.Semaphore(concurrency)
    limiter = _RateLimiter(rpm)
    done = 0
    ok = 0
    failed = 0

    # Process in batches so a long run commits incrementally and is restartable.
    for start in range(0, total, batch):
        window = rows[start:start + batch]
        results = await asyncio.gather(*[_embed_one(sem, limiter, cid, content) for cid, content in window])

        async with AsyncSessionLocal() as db:
            for chunk_id, vector in results:
                done += 1
                if vector is None:
                    failed += 1
                    continue
                chunk = await db.get(DocumentChunk, chunk_id)
                if chunk is None or chunk.embedding is not None:
                    continue  # deleted or already filled by a concurrent run
                chunk.embedding = vector
                chunk.embedding_model = emb_model.model_id
                chunk.embedding_version = emb_model.embedding_version
                chunk.embedding_dimensions = emb_model.embedding_dimensions
                ok += 1
            await db.commit()

        print(f"  progress {done}/{total}  (ok={ok} failed={failed})")

    print(f"done. embedded={ok} failed={failed} of {total}")

    async with AsyncSessionLocal() as db:
        remaining = (await db.execute(
            select(func.count()).select_from(DocumentChunk).where(DocumentChunk.embedding.is_(None))
        )).scalar()
        print(f"chunks still without embeddings: {remaining}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backfill NULL chunk embeddings.")
    parser.add_argument("--limit", type=int, default=None, help="max chunks this run")
    parser.add_argument("--concurrency", type=int, default=4, help="parallel embedding calls")
    parser.add_argument("--batch", type=int, default=50, help="chunks per commit batch")
    parser.add_argument("--rpm", type=int, default=90, help="max embedding requests/min (0 = unlimited)")
    args = parser.parse_args()
    asyncio.run(main(args.limit, args.concurrency, args.batch, args.rpm))
