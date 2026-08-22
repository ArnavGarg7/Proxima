# Multi-stage frontend image.
#   development → Vite dev server (used by docker-compose.yml)
#   production  → static build served by nginx (used by docker-compose.prod.yml)

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Development (hot-reloading dev server) ───────────────────────────────────
FROM deps AS development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ── Production build ─────────────────────────────────────────────────────────
FROM deps AS build
# VITE_API_URL is baked into the bundle at build time; supply it as a build arg.
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
COPY . .
RUN npm run build

# ── Production static server ─────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
