FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 py3-pip clamav

COPY shared/shared ./shared
COPY services/security-tools ./security-tools

# Install shared deps first
WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/security-tools
RUN npm install --omit=dev

# Install Python deps
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

ENV PATH="/opt/venv/bin:${PATH}"

EXPOSE 4003
CMD ["node", "server.js"]
