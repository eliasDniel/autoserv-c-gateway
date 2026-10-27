# syntax=docker/dockerfile:1
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --no-fund

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "rm -f tsconfig.build.tsbuildinfo && npm run start:dev"]
