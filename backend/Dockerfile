# DE-PRINCE DIGITAL HUB - backend image
# Layout mirrors the source tree so alembic finds database/001_init.sql:
#   /app            <- backend contents (app/, alembic/, alembic.ini, requirements.txt)
#   /app/database   <- database/001_init.sql + 002_banking.sql fallback
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps (psycopg2-binary ships its own libpq; this is a safety net)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps first for layer caching
COPY backend/requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# Backend source
COPY backend/app /app/app
COPY backend/alembic /app/alembic
COPY backend/alembic.ini /app/alembic.ini
COPY backend/start.sh /app/start.sh

# Canonical schema for the 0001 migration (and 002 if present)
COPY database /app/database

# Uploads
ENV UPLOAD_DIR=/var/lib/deprince/uploads
RUN mkdir -p /var/lib/deprince/uploads

EXPOSE 8000
CMD ["bash", "/app/start.sh"]