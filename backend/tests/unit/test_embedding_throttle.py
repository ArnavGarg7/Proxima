"""Stage 8: ingestion embedding throttle (SyncRateLimiter).

Transient-429 retry, terminal->None degradation, and no-infinite-loop are
already covered by test_embedding_sync.py and test_backfill_embeddings.py; this
file focuses on the new throttle behaviour.
"""
import time

from proxima.services.embedding import SyncRateLimiter, _is_transient_status


def test_zero_rpm_never_sleeps():
    limiter = SyncRateLimiter(0)
    start = time.monotonic()
    for _ in range(50):
        limiter.acquire()
    assert time.monotonic() - start < 0.05  # effectively free


def test_rate_limiter_spaces_calls():
    # 600 rpm -> 0.1s minimum interval.
    limiter = SyncRateLimiter(600)
    start = time.monotonic()
    limiter.acquire()  # first is immediate
    limiter.acquire()
    limiter.acquire()  # two intervals enforced after the first
    elapsed = time.monotonic() - start
    assert elapsed >= 0.18  # ~2 * 0.1s, allowing scheduler slack


def test_first_acquire_is_immediate():
    limiter = SyncRateLimiter(60)  # 1s interval
    start = time.monotonic()
    limiter.acquire()
    assert time.monotonic() - start < 0.05  # small documents are not slowed


def test_transient_status_classification_unchanged():
    # 429 (rate limit) and 5xx are retryable; client errors are terminal.
    for s in (429, 500, 502, 503, 504):
        assert _is_transient_status(s) is True
    for s in (400, 401, 403, 404, 422):
        assert _is_transient_status(s) is False
