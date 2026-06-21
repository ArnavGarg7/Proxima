from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Text, Float, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import TIMESTAMP

TIMESTAMPTZ = TIMESTAMP(timezone=True)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func, text
from proxima.database import Base
from datetime import datetime
from uuid import UUID as PyUUID

class AdminAuditLog(Base):
    __tablename__ = "admin_audit_log"
    log_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    admin_user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    target_resource: Mapped[str | None] = mapped_column(String(255))
    details: Mapped[dict | None] = mapped_column(JSONB)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    __table_args__ = (
        Index("idx_admin_audit_log_admin_id", "admin_user_id"),
        Index("idx_admin_audit_log_action", "action"),
        Index("idx_admin_audit_log_created_at", "created_at"),
    )

class AdminSession(Base):
    __tablename__ = "admin_sessions"
    session_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[PyUUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMPTZ, nullable=False)
