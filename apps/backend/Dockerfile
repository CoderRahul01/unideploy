FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code (as root, then chown)
COPY --chown=nobody:nogroup . .

# Create required directories and fix ownership so nobody user can write
RUN mkdir -p /app/builder/templates /app/local_storage && \
    chown -R nobody:nogroup /app/local_storage

# Run as non-root
USER nobody

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
