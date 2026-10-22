#!/bin/sh
set -eu
python -c 'from seed import seed; seed()'
exec gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 2 'app:create_app()'
