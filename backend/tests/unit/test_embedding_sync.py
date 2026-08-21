"""Synchronous embedding wrapper (Stage 7C)."""
import pytest
from fastapi import HTTPException

from proxima.services import embedding as emb
from proxima.services.embedding import (
    TransientEmbeddingError,
    generate_chunk_embedding_sync,
)


class _DummyModel:
    model_id = "text-embedding-004"
    provider = "google"
    embedding_version = "v1"
    embedding_dimensions = 768


def test_empty_text_returns_none():
    assert generate_chunk_embedding_sync(db=None, text="   ", emb_model=_DummyModel()) is None


def test_success_returns_vector(monkeypatch):
    async def fake_get_embedding(model, text):
        return [0.1] * 768

    monkeypatch.setattr(emb.model_registry, "get_embedding", fake_get_embedding)
    vec = generate_chunk_embedding_sync(db=None, text="hello", emb_model=_DummyModel())
    assert vec == [0.1] * 768


def test_transient_status_raises(monkeypatch):
    async def fake_get_embedding(model, text):
        raise HTTPException(status_code=504, detail="Provider timeout.")

    monkeypatch.setattr(emb.model_registry, "get_embedding", fake_get_embedding)
    with pytest.raises(TransientEmbeddingError):
        generate_chunk_embedding_sync(db=None, text="hello", emb_model=_DummyModel())


def test_terminal_status_returns_none(monkeypatch):
    async def fake_get_embedding(model, text):
        raise HTTPException(status_code=401, detail="Invalid API key provided.")

    monkeypatch.setattr(emb.model_registry, "get_embedding", fake_get_embedding)
    assert generate_chunk_embedding_sync(db=None, text="hello", emb_model=_DummyModel()) is None


def test_no_model_returns_none():
    # emb_model=None and a db that returns no default model → None (FTS-only).
    class _NoModelDb:
        def execute(self, *a, **k):
            class _R:
                def scalar_one_or_none(self_inner):
                    return None
            return _R()

    assert generate_chunk_embedding_sync(db=_NoModelDb(), text="hello") is None
