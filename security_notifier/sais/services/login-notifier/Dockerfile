FROM node:22-alpine

WORKDIR /app

COPY shared/shared ./shared
COPY services/login-notifier ./login-notifier

# Install shared deps first
WORKDIR /app/shared
RUN npm install --omit=dev

WORKDIR /app/login-notifier
RUN npm install --omit=dev

EXPOSE 4002
CMD ["node", "server.js"]
