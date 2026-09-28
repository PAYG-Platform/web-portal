# 📚 PAYG VPN Web Portal — Documentation Suite

Welcome to the technical documentation suite for the **PAYG VPN Frontend Web Portal**. This directory details the React 19 architecture, routing models, localization systems, UI component catalogs, and production deployment patterns.

---

## 🗂️ Documentation Navigation

### [01. Local Development (`01-development/`)](./01-development/)
* [📘 **Development & Routing Architecture (`README.md`)**](./01-development/README.md): Node/npm vs Docker development runbook, Vite reverse proxy setup, React Router v7 routes hierarchy, and RBAC protected route guards.

---

### [02. Localization & Styling (`02-i18n-and-theming/`)](./02-i18n-and-theming/)
* [🌍 **i18n & Theming Engine (`I18N_AND_THEMING.md`)**](./02-i18n-and-theming/I18N_AND_THEMING.md): Comprehensive documentation of the trilingual engine (English, Persian RTL with Vazirmatn font, Russian), cookie synchronization, and Tailwind CSS 4 dual-theme variables.

---

### [03. Features & Specifications (`03-features/`)](./03-features/)
* [📱 **Client & Admin Feature Specs (`CLIENT_AND_ADMIN_SPECS.md`)**](./03-features/CLIENT_AND_ADMIN_SPECS.md): Exhaustive specifications for Client Portal (Universal Subscription, QR engine, route replacement, payment histories) and Admin Portal (Fleet management, user route re-assignment, top-up/refund audit queues, live logs).

---

### [04. Production & Deployment (`04-production/`)](./04-production/)
* [🏭 **Production Deployment Runbook (`PRODUCTION_DEPLOYMENT.md`)**](./04-production/PRODUCTION_DEPLOYMENT.md): Multi-stage Docker packaging (Node 20 Alpine $\to$ Nginx Alpine), SPA fallback configurations, asset caching headers, and multi-subdomain routing resolution.