# Stage 1: Install dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Override DATABASE_URL during build to use a temporary build database inside the container
RUN DATABASE_URL=file:./payload-build.db npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Install curl in alpine (uses apk, which is highly reliable and cached)
RUN apk add --no-cache curl

# Copy build artifacts and dependencies (including next.config.ts)
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/payload.config.ts ./payload.config.ts
COPY --from=builder /app/.next ./.next

EXPOSE 3000

CMD ["npm", "start"]
