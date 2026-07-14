#!/bin/bash

set -e

cd /home/ec2-user/unicomm/backend

source .venv/bin/activate

pkill -f gunicorn || true

nohup gunicorn \
    -k uvicorn.workers.UvicornWorker \
    app.main:app \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    > backend.log 2>&1 &
