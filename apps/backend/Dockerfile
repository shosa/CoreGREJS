# Multi-stage build for NestJS Backend in Monorepo

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY apps/backend/package.json ./apps/backend/

# Install ALL dependencies (including workspaces)
RUN npm install --workspace=@coregre/backend --include-workspace-root

# Stage 2: Build
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy backend source code (including prisma schema)
COPY apps/backend ./apps/backend

# Copy frontend public folder (for PDF generation assets)
COPY apps/frontend/public ./apps/frontend/public

# Generate Prisma Client for Alpine Linux
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x
ENV PRISMA_SCHEMA_PATH=/app/apps/backend/prisma/schema.prisma

# Generate using root prisma binary, pointing to backend schema
WORKDIR /app
RUN node_modules/.bin/prisma generate --schema=./apps/backend/prisma/schema.prisma

# Now change to backend directory and build
WORKDIR /app/apps/backend
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Copy necessary files from builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./package.json

# Copy node_modules from ROOT (workspace) - includes Prisma Client
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy frontend public assets (needed for PDF generation)
COPY --from=builder --chown=nestjs:nodejs /app/apps/frontend/public ./public

# Create storage directories with correct permissions
RUN mkdir -p /app/storage/export/temp /app/storage/export/src /app/storage/jobs /app/storage/uploads /app/storage/logs && \
    chown -R nestjs:nodejs /app/storage

USER nestjs

EXPOSE 3011

# Run migrations and start
CMD sh -c "npx prisma migrate deploy || true && node dist/src/main"
