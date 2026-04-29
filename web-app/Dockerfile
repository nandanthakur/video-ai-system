FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY src/public/ ./dist/public/

ENV NODE_ENV=production

EXPOSE 8005

CMD ["node", "dist/server.js"]