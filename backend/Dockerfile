FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-prod.txt ./

# Install dependencies with pip (simpler for production)
RUN pip install --no-cache-dir -r requirements-prod.txt

# Copy application code
COPY . .

# Disable Marker in production (too heavy)
ENV MARKER_ENABLED=false
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
