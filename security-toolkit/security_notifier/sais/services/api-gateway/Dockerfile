FROM node:22-alpine

WORKDIR /app

COPY shared/shared ./shared
COPY services/api-gateway ./api-gateway

# Install shared deps first
WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/api-gateway
RUN npm install --omit=dev

EXPOSE 4000
CMD ["node", "server.js"]
