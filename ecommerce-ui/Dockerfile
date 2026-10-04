# syntax=docker/dockerfile:1
# ecommerce-ui production-like image: static build served by unprivileged nginx, which also
# proxies /api to the API container (same origin, so no CORS). Build context: ecommerce-ui/
#   docker build -t ecommerce-ui ./ecommerce-ui

# ---- build -------------------------------------------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /src

# Install from the lockfile first so the dependency layer is cached until package*.json change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---- runtime -----------------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

LABEL org.opencontainers.image.title="ecommerce-ui" \
      org.opencontainers.image.description="Ecommerce React SPA served by nginx"

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/dist /usr/share/nginx/html

# Upstream for /api; the nginx image substitutes it into the template at startup.
ENV API_UPSTREAM=http://api:8080

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/healthz"]
