from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text, Float, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import TIMESTAMP

TIMESTAMPTZ = TIMESTAMP(timezone=True)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text
from proxima.database import Base
from pgvector.sqlalchemy import Vector
from datetime import datetime
from uuid import UUID as PyUUID

class RegisteredModel(Base):
    __tablename__ = "registered_models"
    model_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    model_type: Mapped[str] = mapped_column(String(50), nullable=False)  # generation|embedding
    context_window: Mapped[int | None] = mapped_column(Integer)
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer)
    embedding_version: Mapped[str | None] = mapped_column(String(50))
    cost_per_1m_input: Mapped[float] = mapped_column(Float, nullable=False)
    cost_per_1m_output: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    supports_streaming: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_default_generation: Mapped[bool] = mapped_column(Boolean, default=False)
    is_default_embedding: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class ModelRoutingRule(Base):
    __tablename__ = "model_routing_rules"
    rule_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    task_class: Mapped[str] = mapped_column(String(100), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(50))
    model_id: Mapped[str] = mapped_column(String(100), ForeignKey("registered_models.model_id", ondelete="CASCADE"), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    version_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    prompt_key: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    __table_args__ = (Index("idx_prompt_versions_key_active", "prompt_key", "is_active"),)

class OutputSchema(Base):
    __tablename__ = "output_schemas"
    schema_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)
    schema_definition: Mapped[dict] = mapped_column(JSONB, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class DomainKnowledgeChunk(Base):
    __tablename__ = "domain_knowledge_chunks"
    chunk_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    kb_name: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str | None] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(500))
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer)
    embedding: Mapped[list | None] = mapped_column(Vector(768))
    embedding_model: Mapped[str | None] = mapped_column(String(100))
    embedding_version: Mapped[str | None] = mapped_column(String(50))
    embedding_dimensions: Mapped[int | None] = mapped_column(Integer)
    embedded_at: Mapped[datetime | None] = mapped_column(TIMESTAMPTZ)
    metadata_fields: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    __table_args__ = (Index("idx_domain_kb_kb_name", "kb_name"),)

class AIRequest(Base):
    __tablename__ = "ai_requests"
    request_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="SET NULL"))
    model_id: Mapped[str] = mapped_column(String(100), ForeignKey("registered_models.model_id", ondelete="RESTRICT"), nullable=False)
    task_class: Mapped[str] = mapped_column(String(100), nullable=False)
    tokens_input: Mapped[int] = mapped_column(Integer, default=0)
    tokens_output: Mapped[int] = mapped_column(Integer, default=0)
    computed_cost: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    __table_args__ = (
        Index("idx_ai_requests_user_id", "user_id"),
        Index("idx_ai_requests_model_id", "model_id"),
    )

class SegmentConfidenceScore(Base):
    __tablename__ = "segment_confidence_scores"
    score_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    document_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    ai_request_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_requests.request_id", ondelete="SET NULL"))
    segment_index: Mapped[int] = mapped_column(Integer, nullable=False)
    segment_text: Mapped[str] = mapped_column(Text, nullable=False)
    score_t: Mapped[float] = mapped_column(Float, nullable=False)
    score_s: Mapped[float] = mapped_column(Float, nullable=False)
    score_d: Mapped[float] = mapped_column(Float, nullable=False)
    score_c: Mapped[float] = mapped_column(Float, nullable=False)
    composite_score: Mapped[float] = mapped_column(Float, nullable=False)
    domain: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class AuditReport(Base):
    __tablename__ = "audit_reports"
    report_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    document_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    report_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class Comparison(Base):
    __tablename__ = "comparisons"
    comparison_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    doc_a_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    doc_b_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    diff_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class ContractAnalysis(Base):
    __tablename__ = "contract_analyses"
    analysis_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    document_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    analysis_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    note_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="SET NULL"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_phi_scrubbed: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
