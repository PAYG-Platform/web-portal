# 🏭 Web Portal Production Deployment & Nginx Guide

This guide specifies the procedures for compiling, containerizing, and serving the **PAYG MNG Web Portal** using production multi-stage Docker builds and Nginx reverse proxying.

---

## 📑 Table of Contents

- [1. Production Architecture Overview](#1-production-architecture-overview)
- [2. Multi-Stage Dockerfile (`Dockerfile.prod`)](#2-multi-stage-dockerfile-dockerfileprod)
- [3. Nginx Single-Page Application Configuration (`nginx.conf`)](#3-nginx-single-page-application-configuration-nginxconf)
- [4. Environment Variables Injection at Build Time](#4-environment-variables-injection-at-build-time)
- [5. Production Deployment Commands](#5-production-deployment-commands)
- [6. Automated CI/CD Pipeline (GitHub Actions)](#6-automated-cicd-pipeline-github-actions)
- [7. Multi-Subdomain Routing Architecture](#7-multi-subdomain-routing-architecture)
- [8. Production Asset Caching & Performance](#8-production-asset-caching--performance)

---

## 1. Production Architecture Overview

The production frontend is packaged into a hardened, lightweight **Nginx Alpine** container.

```
[ Internet Traffic ]
        │ HTTPS :443
        ▼
[ Host Nginx / Cloudflare CDN ]
        │ Reverse Proxy :80
        ▼
[ Frontend Container (mng-frontend-prod) : 127.0.0.1:3000:80 ]
        │
   Nginx Alpine
   ├── /usr/share/nginx/html (Compiled Static JS/CSS Assets)
   └── /etc/nginx/conf.d/default.conf (SPA Fallback & Caching Rules)
```

---

## 2. Multi-Stage Dockerfile (`Dockerfile.prod`)

The build uses a two-stage process to eliminate Node.js dependencies from the final production image:

```dockerfile
# ==========================================
# STAGE 1: Build React/Vite Bundle
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

# Accept build arguments from Docker Compose / .env
ARG VITE_API_URL
ARG VITE_APP_TITLE
ARG VITE_DEFAULT_LANGUAGE
ARG VITE_DEFAULT_CURRENCY

# Inject build args into environment for Vite compiler
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE
ENV VITE_DEFAULT_LANGUAGE=$VITE_DEFAULT_LANGUAGE
ENV VITE_DEFAULT_CURRENCY=$VITE_DEFAULT_CURRENCY

# Install dependencies with frozen lockfile
COPY package.json ./
RUN npm install

# Copy source files & compile static bundle to /app/dist
COPY . .
RUN npm run build

# ==========================================
# STAGE 2: Serve with Production Nginx
# ==========================================
FROM nginx:alpine AS production

# Copy compiled static distribution files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx SPA routing configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 3. Nginx Single-Page Application Configuration (`nginx.conf`)

Single-Page Applications using React Router require all non-file requests to fall back to `index.html` to support deep linking:

```nginx
server {
    listen 80;
    server_name localhost;

    # Root directory containing compiled bundle
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # High-Performance Static Asset Caching (1 Year)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 4. Environment Variables Injection at Build Time

Because Vite bundles environment variables into compiled JavaScript at build time, production values must be provided during `docker compose build`:

```env
# .env (Production)
VITE_API_URL=https://api.yourdomain.com
VITE_APP_TITLE="PAYG MNG Portal"
VITE_DEFAULT_LANGUAGE=en
VITE_DEFAULT_CURRENCY=IRT
```

---

## 5. Production Deployment Commands

### Build & Run via Docker Compose
```bash
# Build the production image with embedded environment args
docker compose --profile production build

# Launch the production container in the background
docker compose --profile production up -d

# Check running status
docker ps --filter "name=mng-frontend-prod"
```

*The frontend container binds to `127.0.0.1:3000:80` on the host, ready for host-level Nginx reverse proxying.*

---

## 6. Multi-Subdomain Routing Architecture

When deploying across custom subdomains (e.g., `app.yourdomain.com` for web, `api.yourdomain.com` for backend), `src/services/api.ts` resolves endpoints dynamically:

```typescript
// src/services/api.ts
export const resolveEndpointUrl = (endpoint: string): string => {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const domain = getRootDomain();

  // If local or dev gateway mode: return relative path
  if (!domain) return cleanPath;

  // Subdomain production resolution mode:
  const protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

  if (cleanPath.startsWith('/api/iam')) {
    return `${protocol}//iam.${domain}${cleanPath.replace('/api/iam', '')}`;
  }
  if (cleanPath.startsWith('/api/node')) {
    return `${protocol}//node.${domain}${cleanPath.replace('/api/node', '')}`;
  }
  if (cleanPath.startsWith('/api/billing')) {
    return `${protocol}//billing.${domain}${cleanPath.replace('/api/billing', '')}`;
  }
  if (cleanPath.startsWith('/sub/')) {
    return `${protocol}//node.${domain}${cleanPath}`;
  }
  if (cleanPath.startsWith('/uploads')) {
    return `${protocol}//support.${domain}${cleanPath}`;
  }

  return cleanPath;
};
```

---

## 7. Production Asset Caching & Performance

* **Vite Rollup Chunking:** Hashes bundle filenames (`index-BqL9x0.js`, `index-C2a1b.css`) to ensure seamless browser cache invalidation upon releasing new deployments.
* **Gzip Compression:** The host reverse proxy compresses all text, CSS, and JSON payloads.
* **Zero Node.js Runtime in Production:** The final container image is approximately **~25 MB**, containing only Nginx Alpine and static assets.

---

## 8. Automated CI/CD Pipeline (GitHub Actions)

The repository includes an automated pipeline in `.github/workflows/ci-cd.yml` executing on every push and pull request:

### 1. Quality Gates (Automated on PR & Push):
* **TypeScript Strictness (`npm run lint`):** Compiles code with `tsc --noEmit` to verify type safety.
* **Build Verification (`npm run build`):** Verifies that the Vite compiler produces bundles with zero errors.

### 2. Container Delivery & CVE Scanning:
* On push to `main`, Docker Buildx compiles the production multi-stage image.
* **Trivy Vulnerability Scanner** audits the image for `CRITICAL` and `HIGH` CVEs.
* The image is tagged and pushed to GitHub Container Registry (`ghcr.io/<owner>/mng-web-portal:latest`).

### 3. Rolling Host Deployment:
* Deploys to your frontend host over SSH using secret credentials (`FRONTEND_HOST`, `FRONTEND_USER`, `FRONTEND_KEY`).
* Executes `docker compose up -d --no-deps frontend-prod` for zero-downtime serving.