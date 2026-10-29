# 💻 Local Development & Routing Architecture Runbook

This document details how to configure, run, and develop the **PAYG MNG Web Portal** using local Node toolchains or Docker, explaining the Vite proxy integration, React Router hierarchy, and RBAC security guards.

---

## 📑 Table of Contents

- [1. Prerequisites & Environment Setup](#1-prerequisites--environment-setup)
- [2. Development Workflows](#2-development-workflows)
  - [2.1 Option A: Local Node / Vite (Fastest HMR)](#21-option-a-local-node--vite-fastest-hmr)
  - [2.2 Option B: Containerized Development (Docker Compose)](#22-option-b-containerized-development-docker-compose)
- [3. Vite Proxy Configuration & Backend Target](#3-vite-proxy-configuration--backend-target)
- [4. Application Routing Hierarchy (`AppRoutes.tsx`)](#4-application-routing-hierarchy-approutestsx)
- [5. Role-Based Route Guards (`ProtectedRoute.tsx`)](#5-role-based-route-guards-protectedroutetsx)
- [6. Global State Context Architecture](#6-global-state-context-architecture)
- [7. Code Quality & Linting](#7-code-quality--linting)

---

## 1. Prerequisites & Environment Setup

* **Node.js:** `v20.0+` (LTS recommended)
* **npm:** `v10.0+`
* **API Gateway Running:** Core Services backend operational at `http://127.0.0.1:8000`

### Initializing Environment
Create `.env` in the web portal root:
```bash
cp .env.example .env
```

Ensure `VITE_PROXY_TARGET` points to your active backend API Gateway:
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_PROXY_TARGET=http://127.0.0.1:8000
PORT=3000
```

---

## 2. Development Workflows

### 2.1 Option A: Local Node / Vite (Fastest HMR)
Running Vite directly on the host machine provides instant Hot Module Replacement (HMR) and fast debugging:

```bash
# Install dependencies
npm install

# Run Vite dev server on port 3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 2.2 Option B: Containerized Development (Docker Compose)
Runs the development server inside an isolated Node 20 Alpine container with volume mounts:

```bash
docker compose --profile development up --build -d
```

* **Live Code Mount:** Changes made on the host in `./src` are reflected immediately inside the running container.
* **Container Name:** `mng-frontend-dev`
* **Internal Network:** Joins the shared `vpn_net` Docker network to reach `api-gateway-dev`.

---

## 3. Vite Proxy Configuration & Backend Target

To prevent browser Cross-Origin Resource Sharing (CORS) blocks during development, `vite.config.ts` proxies API, subscription, and upload routes directly to the API Gateway:

```typescript
// vite.config.ts
export default defineConfig(() => {
  const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/sub': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
```

---

## 4. Application Routing Hierarchy (`AppRoutes.tsx`)

The application routing is built using **React Router v7**:

```text
/ (Landing Page - Public)
│
├── /login (Auth Portal: Sign In, Sign Up, Forgot Password)
│
├── /admin (AdminLayout - Protected: Role === 'Admin')
│   ├── /admin (AdminOverview)
│   ├── /admin/servers (AdminServers)
│   ├── /admin/users (AdminUsers)
│   ├── /admin/topups (AdminClientTopups)
│   ├── /admin/support (AdminSupport)
│   ├── /admin/logs (AdminLogs)
│   ├── /admin/settings (AdminSettings)
│   └── /admin/edit-account (EditAccount)
│
└── /client (ClientLayout - Protected: Role === 'Client')
    ├── /client (ClientOverview)
    ├── /client/vpn-servers (ClientServers)
    ├── /client/wallet (ClientTopupWallet)
    ├── /client/history (ClientPaymentHistories)
    ├── /client/guides (ClientConnectionGuides)
    ├── /client/support (ClientSupportTickets)
    ├── /client/settings (ClientSettings)
    └── /client/edit-account (EditAccount)
```

---

## 5. Role-Based Route Guards (`ProtectedRoute.tsx`)

Protected routes wrap workspaces to enforce authentication and role separation:

1. **Unauthenticated Redirect:** Users attempting to access `/admin` or `/client` without an active session cookie are redirected to `/login`.
2. **Role Boundary Enforcement:** Clients navigating to `/admin` are automatically redirected to `/client`, and vice versa.
3. **Session Verification State:** Prevents flickering or premature redirects while `/api/iam/auth/me` verifies cookies on initial page reload.

---

## 6. Global State Context Architecture

The web application coordinates state through three decoupled React Context providers:

1. **`AuthContext` (`src/contexts/AuthContext.tsx`):**
   * Manages current user object (`UserProfile`), user role (`Admin` | `Client`), and authentication state.
   * Handles sign-in, registration, password recovery, session verification, and language preference syncing.
2. **`ThemeContext` (`src/contexts/ThemeContext.tsx`):**
   * Persists light/dark mode preference via cookies (`payg_theme`) and applies the `.dark` class to `document.documentElement`.
3. **`SSEContext` (`src/contexts/SSEContext.tsx`):**
   * Maintains a persistent Server-Sent Events (SSE) connection to `/api/notifications/stream`.
   * Dispatches live tick triggers for incoming support replies, new notifications, and admin top-up requests.

---

## 7. Code Quality & Linting

Verify TypeScript types and build hygiene before committing:

```bash
# Strict TypeScript compilation check (noEmit)
npm run lint

# Dry-run production build
npm run build
```