# syntax=docker/dockerfile:1

# ---- build stage ----------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- runtime stage --------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

# Injected by the workflow so the running app can report what it was built from
ARG GIT_SHA=local
ARG BUILD_TIME=local
ENV GIT_SHA=$GIT_SHA \
    BUILD_TIME=$BUILD_TIME \
    NODE_ENV=production \
    PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./

# Run as a non-root user; the node image already ships one
USER node

EXPOSE 8080

# Foreground process, no shell wrapper — Container Apps restarts the container
# if PID 1 exits, and a shell would swallow SIGTERM during revision drain.
CMD ["node", "server.js"]
