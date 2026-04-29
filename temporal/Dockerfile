FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY models/ ./models/
COPY config/ ./config/

ENV NODE_ENV=production

EXPOSE 7233

CMD ["node", "dist/worker.js"]