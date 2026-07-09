# Backend API for Bioma — Production Dockerfile
# Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Copy backend package files
COPY Backend/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy backend source code
COPY Backend/ ./

# Generate Prisma client and build
RUN npm run prisma:generate && npm run build

# Production stage
FROM node:22-slim AS production

WORKDIR /app

# Create non-root user for security
RUN groupadd -r bioma && useradd -r -g bioma bioma

# Copy backend package files
COPY Backend/package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built artifacts and Prisma client from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Change ownership to non-root user
RUN chown -R bioma:bioma /app

USER bioma

# Expose the application port
EXPOSE 3000

# Docker-level healthcheck. Pings /health every 30s with a 5s timeout.
# This makes `docker ps` report unhealthy containers and lets orchestrators
# restart them automatically. The /health endpoint already returns 503 when
# the DB is unreachable, so it doubles as a liveness + readiness signal.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health',r=>process.exit(r.statusCode<400?0:1)).on('error',()=>process.exit(1))"

# Apply pending database migrations and start the server
# In production, env vars are injected by the host (Render, Railway, etc.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
