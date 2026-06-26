from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, nullslast
from proxima.models.core import Document
from proxima.models.session import AnalysisSession
from proxima.schemas.dashboard import DashboardSummary, RecentRun, QuickStats, TemplateUsageStats

class DashboardService:
    @staticmethod
    async def get_overview(db: AsyncSession, user_id: str) -> DashboardSummary:
        # Total documents
        total_docs_result = await db.execute(select(func.count(Document.document_id)).where(Document.user_id == user_id))
        total_documents = total_docs_result.scalar_one()

        # Recent runs (completed or failed)
        recent_runs_stmt = (
            select(AnalysisSession, Document.title.label("document_name"))
            .outerjoin(Document, AnalysisSession.document_id == Document.document_id)
            .where(AnalysisSession.user_id == user_id, AnalysisSession.status != 'open')
            .order_by(desc(AnalysisSession.started_at))
            .limit(10)
        )
        recent_runs_result = await db.execute(recent_runs_stmt)
        recent_runs = []
        for session, doc_name in recent_runs_result.all():
            recent_runs.append(RecentRun(
                id=str(session.id),
                document_name=doc_name or "Unknown Document",
                analyzer=session.analyzer,
                status=session.status,
                created_at=session.started_at.isoformat(),
                confidence=session.confidence,
                domain=None, # Document domain not explicitly fetched here unless needed
                template=session.template_origin,
                duration_ms=session.duration_ms
            ))

        # Active sessions (open)
        active_sessions_stmt = (
            select(AnalysisSession, Document.title.label("document_name"))
            .outerjoin(Document, AnalysisSession.document_id == Document.document_id)
            .where(AnalysisSession.user_id == user_id, AnalysisSession.status == 'open')
            .order_by(desc(AnalysisSession.last_opened))
            .limit(5)
        )
        active_sessions_result = await db.execute(active_sessions_stmt)
        active_sessions = []
        for session, doc_name in active_sessions_result.all():
            active_sessions.append(RecentRun(
                id=str(session.id),
                document_name=doc_name or "Unknown Document",
                analyzer=session.analyzer,
                status=session.status,
                created_at=session.started_at.isoformat(),
                confidence=session.confidence,
                domain=None,
                template=session.template_origin,
                duration_ms=session.duration_ms
            ))

        # Template usage
        template_stmt = (
            select(AnalysisSession.template_origin, func.count(AnalysisSession.id).label("count"))
            .where(AnalysisSession.user_id == user_id, AnalysisSession.template_origin != None)
            .group_by(AnalysisSession.template_origin)
            .order_by(desc("count"))
            .limit(5)
        )
        template_result = await db.execute(template_stmt)
        template_usage = [
            TemplateUsageStats(template_name=t[0], usage_count=t[1])
            for t in template_result.all()
        ]

        # Analyzer Distribution
        distribution_stmt = (
            select(AnalysisSession.analyzer, func.count(AnalysisSession.id))
            .where(AnalysisSession.user_id == user_id)
            .group_by(AnalysisSession.analyzer)
        )
        distribution_result = await db.execute(distribution_stmt)
        analyzer_distribution = {row[0]: row[1] for row in distribution_result.all()}

        # Quick Stats
        quick_stats = await DashboardService.get_quick_stats(db, user_id, total_documents)

        return DashboardSummary(
            total_documents=total_documents,
            recent_runs=recent_runs,
            active_sessions=active_sessions,
            template_usage=template_usage,
            quick_stats=quick_stats,
            analyzer_distribution=analyzer_distribution
        )

    @staticmethod
    async def get_recent_runs(db: AsyncSession, user_id: str) -> list[RecentRun]:
        recent_runs_stmt = (
            select(AnalysisSession, Document.title.label("document_name"))
            .outerjoin(Document, AnalysisSession.document_id == Document.document_id)
            .where(AnalysisSession.user_id == user_id, AnalysisSession.status != 'open')
            .order_by(desc(AnalysisSession.started_at))
            .limit(20)
        )
        recent_runs_result = await db.execute(recent_runs_stmt)
        return [
            RecentRun(
                id=str(session.id),
                document_name=doc_name or "Unknown Document",
                analyzer=session.analyzer,
                status=session.status,
                created_at=session.started_at.isoformat(),
                confidence=session.confidence,
                domain=None,
                template=session.template_origin,
                duration_ms=session.duration_ms
            )
            for session, doc_name in recent_runs_result.all()
        ]

    @staticmethod
    async def get_quick_stats(db: AsyncSession, user_id: str, total_documents: int = None) -> QuickStats:
        if total_documents is None:
            total_docs_result = await db.execute(select(func.count(Document.document_id)).where(Document.user_id == user_id))
            total_documents = total_docs_result.scalar_one()

        completed_result = await db.execute(
            select(func.count(AnalysisSession.id)).where(AnalysisSession.user_id == user_id, AnalysisSession.status == 'completed')
        )
        analyses_completed = completed_result.scalar_one()

        templates_result = await db.execute(
            select(func.count(func.distinct(AnalysisSession.template_origin)))
            .where(AnalysisSession.user_id == user_id, AnalysisSession.template_origin != None)
        )
        templates_used = templates_result.scalar_one()

        domains_result = await db.execute(
            select(func.count(func.distinct(Document.domain)))
            .where(Document.user_id == user_id, Document.domain != None)
        )
        domains_detected = domains_result.scalar_one()

        avg_conf_result = await db.execute(
            select(func.avg(AnalysisSession.confidence))
            .where(AnalysisSession.user_id == user_id, AnalysisSession.confidence != None)
        )
        avg_conf = avg_conf_result.scalar_one() or 0

        return QuickStats(
            documents_uploaded=total_documents,
            analyses_completed=analyses_completed,
            templates_used=templates_used,
            domains_detected=domains_detected,
            average_confidence=int(avg_conf)
        )
