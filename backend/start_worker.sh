#!/bin/bash

# 1. Start the Celery Worker in the background (&)
# We use 'nohup' to keep it running
nohup celery -A main.celery_app worker --pool=gevent --concurrency=20 --loglevel=info &

# 2. Start a dummy web server to satisfy Render's port requirement
# This simply listens on the port Render assigns ($PORT)
python -m http.server $PORT