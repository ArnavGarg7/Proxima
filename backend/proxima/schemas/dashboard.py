from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import uuid

class RecentRun(BaseModel):
    id: str
    document_name: str
    analyzer: str
    status: str
    created_at: str
    confidence: Optional[int]
    domain: Optional[str]
    template: Optional[str]
    duration_ms: Optional[int]

class QuickStats(BaseModel):
    documents_uploaded: int
    analyses_completed: int
    templates_used: int
    domains_detected: int
    average_confidence: int

class TemplateUsageStats(BaseModel):
    template_name: str
    usage_count: int

class DashboardSummary(BaseModel):
    total_documents: int
    recent_runs: List[RecentRun]
    active_sessions: List[RecentRun]
    template_usage: List[TemplateUsageStats]
    quick_stats: QuickStats
    analyzer_distribution: dict[str, int]
