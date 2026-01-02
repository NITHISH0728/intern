from celery import Celery

# Define the app here
celery_app = Celery(
    "code_executor", 
    broker="redis://127.0.0.1:6379/0", 
    backend="redis://127.0.0.1:6379/0"
)

# Optional: Ensure tasks are found
celery_app.conf.imports = ('worker',)