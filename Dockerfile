# Backend API for Bioma
FROM node:22-slim

WORKDIR /app

# Copy backend package files
COPY Backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy backend source code
COPY Backend/ ./

# Generate Prisma client
RUN npm run prisma:generate

# Build TypeScript
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the server (env vars injected by Render)
CMD ["node", "dist/server.js"]
