# ============ Stage base: dependências de sistema ============
FROM node:22-bookworm-slim AS base

WORKDIR /app

# libs de sistema necessárias para sharp/prisma
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# ============ Stage development: hot reload (código montado via volume) ============
FROM base AS development

ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 8000

## aplica migrations pendentes e sobe em modo watch
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]

# ============ Stage builder: compila o projeto ============
FROM development AS builder

RUN npm run build

# ============ Stage production: imagem enxuta ============
FROM base AS production

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

## diretórios graváveis (uploads locais e logs do winston) pertencentes ao usuário não-root
RUN mkdir -p storage/app logs && chown -R node:node storage logs

USER node

EXPOSE 8000

## aplica migrations pendentes antes de iniciar a API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
