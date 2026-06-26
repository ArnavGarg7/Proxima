from sqlalchemy import Column, String, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func, text
from proxima.database import Base
from datetime import datetime
from uuid import UUID as PyUUID

TIMESTAMPTZ = TIMESTAMP(timezone=True)

class AnalysisSession(Base):
    __tablename__ = "analysis_sessions"
    
    id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    document_id: Mapped[PyUUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.document_id", ondelete="SET NULL"))
    
    analyzer: Mapped[str] = mapped_column(String(50), nullable=False)  # 'clinical', 'legal', 'compare', 'audit', 'code', 'domain_radar'
    template_origin: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), default="processing")  # 'open', 'completed', 'failed'
    
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    confidence: Mapped[int | None] = mapped_column(Integer)
    
    started_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    last_opened: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        Index("idx_analysis_sessions_user_id", "user_id"),
        Index("idx_analysis_sessions_created", "started_at"),
    )
