# syntax=docker/dockerfile:1

FROM node:26-alpine AS base
WORKDIR /app

# ---- all dependencies (for building) ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- compile TypeScript ----
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ---- production dependencies only ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- final runtime image ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run node directly (not via npm) so SIGTERM reaches the app for graceful shutdown.
CMD ["node", "dist/main.js"]
