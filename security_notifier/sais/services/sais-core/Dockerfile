FROM node:22-alpine

WORKDIR /app

COPY shared/shared ./shared
COPY services/sais-core ./sais-core

# Install shared deps first
WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/sais-core
RUN npm install --omit=dev

EXPOSE 4001
CMD ["node", "server.js"]
