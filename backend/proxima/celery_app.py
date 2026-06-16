from celery import Celery
from proxima.config import settings

celery_app = Celery(
    "proxima",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=['proxima.tasks']
)

celery_app.conf.task_routes = {
    'proxima.tasks.ai.*': {'queue': 'ai'},
    'proxima.tasks.embeddings.*': {'queue': 'embeddings'},
    'proxima.tasks.exports.*': {'queue': 'exports'},
    'proxima.tasks.maintenance.*': {'queue': 'maintenance'},
}

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)
