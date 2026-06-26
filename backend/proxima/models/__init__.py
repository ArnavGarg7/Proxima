from proxima.database import Base
from proxima.models.core import User, Session, Project, Document, DocumentVersion, DocumentChunk, Template, Export, BackgroundJob
from proxima.models.ai import RegisteredModel, ModelRoutingRule, PromptVersion, OutputSchema, DomainKnowledgeChunk, AIRequest, SegmentConfidenceScore, AuditReport, Comparison, ContractAnalysis, ClinicalNote
from proxima.models.admin import AdminAuditLog, AdminSession
from proxima.models.session import AnalysisSession

# Expose all models so Alembic can discover them
__all__ = [
    "Base",
    "User", "Session", "Project", "Document", "DocumentVersion", "DocumentChunk", "Template", "Export", "BackgroundJob",
    "RegisteredModel", "ModelRoutingRule", "PromptVersion", "OutputSchema", "DomainKnowledgeChunk", "AIRequest", "SegmentConfidenceScore", "AuditReport", "Comparison", "ContractAnalysis", "ClinicalNote",
    "AdminAuditLog", "AdminSession", "AnalysisSession"
]
