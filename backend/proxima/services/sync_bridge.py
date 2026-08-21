"""Single process-wide event loop for bridging async provider calls from sync
Celery workers.

Why one shared loop: the Google GenAI client uses grpc.aio, which binds its
channel to the event loop that is current when the channel is first created.
If the embedding path and the generation path each ran on their own event loop,
the second call reused a channel bound to the first loop and failed with
"got Future attached to a different loop". Routing every sync→async bridge
through ONE persistent loop keeps all grpc.aio channels on a single loop.

This never bridges asyncpg — sync DB access uses the sync session.
"""
import asyncio
from typing import Optional

_worker_loop: Optional[asyncio.AbstractEventLoop] = None


def get_worker_loop() -> asyncio.AbstractEventLoop:
    """Return the process-wide worker loop, creating it once.

    We deliberately do NOT call asyncio.set_event_loop(): during
    run_until_complete this loop is already the running loop (so grpc.aio binds
    its channel to it), and mutating the process-global current loop would
    clobber an outer loop — e.g. pytest-asyncio's — in shared-process contexts.
    Sharing a single loop *instance* across the embedding and generation paths
    is what prevents the grpc "attached to a different loop" failure.
    """
    global _worker_loop
    if _worker_loop is None or _worker_loop.is_closed():
        _worker_loop = asyncio.new_event_loop()
    return _worker_loop


def run_coro(coro):
    """Run a coroutine to completion on the shared worker loop."""
    return get_worker_loop().run_until_complete(coro)
