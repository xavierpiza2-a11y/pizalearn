# Multi-stage build with Bun for ultra-fast, lightweight deployment on Freebox VM
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy package definitions (supports bun.lock, bun.lockb and package.json)
COPY package.json bun.lock* bun.lockb* package-lock.json* ./

# Install dependencies using Bun
RUN bun install

# Copy application source code
COPY . ./

# Build frontend production bundle with Bun
RUN bun run build

# Production runner stage with Bun
FROM oven/bun:1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only using Bun
COPY package.json bun.lock* bun.lockb* package-lock.json* ./
RUN bun install --production

# Copy build artifacts and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create persistent storage folder for SQLite/JSON database and photos
RUN mkdir -p /app/data/uploads

# Expose app port
EXPOSE 3000

# Start server directly with Bun (native TypeScript execution, ultra-fast)
CMD ["bun", "run", "server.ts"]
