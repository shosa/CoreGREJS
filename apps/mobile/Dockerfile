# Multi-stage build for Next.js Mobile PWA in Monorepo

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY apps/mobile/package.json ./apps/mobile/

# Install dependencies
RUN npm install

# Stage 2: Builder
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy root workspace config
COPY package.json package-lock.json* ./

# Copy mobile source code
COPY apps/mobile ./apps/mobile

WORKDIR /app/apps/mobile

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Pass NEXT_PUBLIC_* environment variables at build time
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build Next.js app
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/mobile/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/mobile/.next/static ./apps/mobile/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/mobile/public ./apps/mobile/public

USER nextjs

EXPOSE 3012

ENV PORT=3012
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/mobile/server.js"]
