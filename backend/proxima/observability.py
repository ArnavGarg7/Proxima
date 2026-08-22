"""Lightweight production observability: Sentry + structured logging.

Deliberately minimal — no dashboards, no custom metrics backend. Sentry is
initialized only when a DSN is configured (so development is unaffected), and it
is configured to never attach request bodies or PII. structlog is given a
production-appropriate (JSON) or development-friendly (console) renderer.

Logging discipline: this project never logs prompts, document contents, model
responses, secrets, JWTs, or credentials. That is enforced at call sites; this
module only sets up the pipeline.
"""
import logging

import structlog

from proxima.config import settings


def _init_sentry() -> None:
    if not settings.sentry_dsn:
        return
    try:
        import sentry_sdk
    except ImportError:  # pragma: no cover - sentry is an optional extra
        logging.getLogger(__name__).warning("sentry_dsn set but sentry_sdk not installed")
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        # Do not attach request bodies / headers / user PII to events.
        send_default_pii=False,
        traces_sample_rate=0.0,
    )


def _init_structlog() -> None:
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    # JSON in production for log aggregation; readable console in development.
    if settings.is_production:
        processors.append(structlog.processors.JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def init_observability() -> None:
    """Idempotent-enough setup called once at application startup."""
    _init_sentry()
    _init_structlog()
