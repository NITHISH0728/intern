import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv
import backup_manager
load_dotenv()

# Get the REDIS_URL from Render, or default to localhost for your laptop
# Note: Render uses 'redis://red-xxxxx:6379' format
REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")

celery_app = Celery(
    "code_executor",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery_app.conf.imports = ('worker',)

# OPTIONAL: Fix for SSL if Render requires it (Common in production Redis)
if "rediss://" in REDIS_URL:
    celery_app.conf.update(
        broker_use_ssl={"ssl_cert_reqs": "none"},
        redis_backend_use_ssl={"ssl_cert_reqs": "none"},
    )
    
celery_app.conf.beat_schedule = {
    'daily-database-backup': {
        'task': 'worker.run_backup_task',
        'schedule': crontab(hour=3, minute=0), # Runs at 3:00 AM every day
    },
}    