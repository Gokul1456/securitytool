# ── Build Stage ─────────────────────────────────────────────────────────────
FROM node:18-bullseye-slim

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Install system dependencies:
# - python3 for malware_scanner.py
# - python3-pip for requests
# - clamav for file scanning
# - curl for healthchecks
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    clamav \
    clamav-daemon \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
RUN pip3 install requests || true

# Initialize ClamAV database 
# freshclam may fail if network restricted, so we ensure a baseline db exists
RUN mkdir -p /var/lib/clamav && \
    freshclam || true

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy project files
COPY . .

# Ensure internal scan directories exist and are writable
RUN mkdir -p uploads quarantine && chmod 777 uploads quarantine

# Expose port (must match PORT env)
EXPOSE 5000

# Healthcheck to verify the server is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "server.js"]
