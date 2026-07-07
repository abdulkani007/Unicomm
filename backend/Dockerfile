# Use slim Python 3.10 as base image
FROM python:3.10-slim

# Prevent python from writing pyc files and buffer outputs
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies if required
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Pre-train baseline model weights to ensure local ML inference doesn't fall back to mock
# Running train_model.py generates assets/sign_model.h5 inside the container.
RUN python scripts/train_model.py

# Create a non-root system user for security hardening
RUN useradd -u 1001 apiuser && \
    chown -R apiuser:apiuser /app
USER apiuser

# Expose standard Cloud Run port
EXPOSE 8080

# Run uvicorn server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
