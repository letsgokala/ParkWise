# ---- Build stage: compile the Vite SPA ----
FROM node:20-alpine AS build
WORKDIR /app

# Vite bakes VITE_* values at build time, so they arrive as build args.
ARG VITE_API_URL="/api"
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_MAPTILER_KEY=""
ARG VITE_MAP_STYLE_URL=""

COPY package.json ./
RUN npm install
COPY . .

# vite.config reads envDir="..", so write the VITE_* values to the parent .env
# the build will read, and also expose them via the environment.
RUN printf "VITE_API_URL=%s\nVITE_GOOGLE_MAPS_API_KEY=%s\nVITE_MAPTILER_KEY=%s\nVITE_MAP_STYLE_URL=%s\n" \
      "$VITE_API_URL" "$VITE_GOOGLE_MAPS_API_KEY" "$VITE_MAPTILER_KEY" "$VITE_MAP_STYLE_URL" > /.env
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_MAPTILER_KEY=$VITE_MAPTILER_KEY \
    VITE_MAP_STYLE_URL=$VITE_MAP_STYLE_URL
RUN npm run build

# ---- Serve stage: static files via nginx + /api proxy ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
