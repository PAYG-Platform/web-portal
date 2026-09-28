# 📱 Client & Admin Workspace Feature Specifications

This document specifies the interactive UI features, real-time polling engines, modals, and workflow pipelines implemented across the **Client** and **Admin** portals.

---

## 📑 Table of Contents

- [1. Client Workspace (`/client`)](#1-client-workspace-client)
  - [1.1 Hero Wallet & Usable Credit Display](#11-hero-wallet--usable-credit-display)
  - [1.2 Universal Subscription & QR Engine](#12-universal-subscription--qr-engine)
  - [1.3 Dual-Axis 30-Day Usage & Top-Up Telemetry](#13-dual-axis-30-day-usage--top-up-telemetry)
  - [1.4 CIDR-Based ISP Traffic Attribution](#14-cidr-based-isp-traffic-attribution)
  - [1.5 Self-Service Route Replacement Flow](#15-self-service-route-replacement-flow)
  - [1.6 Deposit Checkout & Verification Slip Submission](#16-deposit-checkout--verification-slip-submission)
  - [1.7 AML Bank Refund Claim Wizard](#17-aml-bank-refund-claim-wizard)
  - [1.8 Client Support & Diagnostic Chat](#18-client-support--diagnostic-chat)
  - [1.9 Account Settings & Telegram Linking](#19-account-settings--telegram-linking)
- [2. Admin Workspace (`/admin`)](#2-admin-workspace-admin)
  - [2.1 Platform Revenue & Telemetry Overview](#21-platform-revenue--telemetry-overview)
  - [2.2 Server Fleet Orchestrator & Inbound Scanner](#22-server-fleet-orchestrator--inbound-scanner)
  - [2.3 User Directory & Manual Route Re-Assignment](#23-user-directory--manual-route-re-assignment)
  - [2.4 Top-Up & Refund Audit Queues](#24-top-up--refund-audit-queues)
  - [2.5 Support Ticket Triage & Canned Templates](#25-support-ticket-triage--canned-templates)
  - [2.6 Real-Time 3X-UI HTTP System Logs](#26-real-time-3x-ui-http-system-logs)
  - [2.7 Platform Settings & Maintenance Lockdown](#27-platform-settings--maintenance-lockdown)

---

## 1. Client Workspace (`/client`)

### 1.1 Hero Wallet & Usable Credit Display
* **Usable Credit Formula:**
  $$\text{Usable Credit} = \text{GIFT Balance} + \max(0, \text{PAID Balance})$$
* **Debt Protection:** If paid credit is negative due to delayed sync overages, the negative debt is displayed directly in red (`-150 Toman (Overdue Debt)`), preventing gift credits from hiding outstanding debt.
* **Locked Amount Tag:** Shows pending refund amounts currently locked in escrow.

---

### 1.2 Universal Subscription & QR Engine
* Generates the Base64 `/sub/{token}` link for 1-tap import into `v2rayNG`, `Sing-box`, `Shadowrocket`, and `Streisand`.
* Renders scannable SVG vector QR codes with 1-click clipboard URI copying.

---

### 1.3 Dual-Axis 30-Day Usage & Top-Up Telemetry
* **Left Y-Axis (Blue Area):** Daily bandwidth consumption in MB/GB with 35% visual headroom.
* **Right Y-Axis (Green Line):** Approved top-up payments and gift credit receipts.
* Rendered via Recharts with responsive tooltips and legend filters.

---

### 1.4 CIDR-Based ISP Traffic Attribution
* Visualizes real-time distribution of client device traffic across mobile and broadband providers (MCI, Irancell, Rightel, Shatel, TCI, etc.).
* Aggregates multiple simultaneous device IPs under the appropriate telecom provider name and displays assigned hex color codes.

---

### 1.5 Self-Service Route Replacement Flow
1. Client clicks **Replace Blocked Route** on any node.
2. Checks `/configs/{id}/replace-status` to evaluate replacement limits, cooldowns, and server availability.
3. If an alternative SNI/server is available: provisions a new working node and revokes the old credentials on 3X-UI.
4. If cooldown is active or region is full: prompts the user for their carrier ISP and automatically opens an urgent support ticket for administrators.

---

### 1.6 Deposit Checkout & Verification Slip Submission
* **Dual Currency Support:**
  * Iranian accounts (`IRT`): Choose between Shetab card-to-card transfer and Crypto (USDT/TON).
  * Global accounts (`USD`): Locked strictly into Crypto deposits (USDT TRC20 / TON).
* **Drag-and-Drop Uploader:** Supports JPEG, PNG, and PDF receipts up to 10MB with image compression.
* **Quick Presets:** Instant deposit buttons for common denominations.

---

### 1.7 AML Bank Refund Claim Wizard
* Evaluates refundable deposit balances (promotional gift credits are excluded).
* Enforces the dynamic AML cooldown timer (e.g., 1 refund every 30 days).
* Validates 16-digit Shetab card numbers and cardholder names.

---

### 1.8 Client Support & Diagnostic Chat
* Threaded helpdesk supporting message replies and screenshot uploads.
* **Attach Diagnostic Log Summary:** Automatically appends active session IDs, timestamps, and node metadata to assist support staff.
* Receives real-time replies via Server-Sent Events (SSE).

---

### 1.9 Account Settings & Telegram Linking
* **12 Recovery Keys Manager:** View or regenerate emergency account recovery keys behind password verification.
* **VPN Pause Toggle:** Self-service client toggle to pause/resume VPN credentials on 3X-UI panels.
* **Telegram Bot Integration:** Single-use deep link generator (`https://t.me/<bot>?start=tk_...`) for receiving instant push alerts.

---

## 2. Admin Workspace (`/admin`)

### 2.1 Platform Revenue & Telemetry Overview
* **Separated Financial KPIs:** Gross deposits, net revenue, consumed credit, and pending refund escrows independently totaled for Toman and USD.
* **System Capacity Meter:** Aggregates available configuration slots across all regions.
* **Multi-Series Trends:** Visualizes 30-day bandwidth vs. Toman deposits vs. USD deposits.

---

### 2.2 Server Fleet Orchestrator & Inbound Scanner
* **Connect 3X-UI Panels:** Register panels via URL, API Bearer token, and protocol type.
* **Inbound Auto-Detection:** Automatically inspects 3X-UI panels, extracting active Reality SNIs, XHTTP paths, and user capacities.
* **Reachability Probes:** Pings panels every 60 seconds and marks unreachable nodes.
* **Safe Force Deletion:** Requires re-typing server node names before purging, automatically migrating users to other reachable servers in that region.

---

### 2.3 User Directory & Manual Route Re-Assignment
* Filterable table of all registered users with live balance breakdowns.
* **User Inspection Drawer:**
  * Shows 30-day individual usage diagrams and ISP traffic shares.
  * Lists active configurations and previously blocked route history.
  * **Manual Reassignment:** Move a user's configuration to any server/inbound in that region.
  * **Add Configuration:** Assign multiple configurations in the same region.
  * **Direct Top-Up & Refund:** Directly credit or debit user balances.

---

### 2.4 Top-Up & Refund Audit Queues
* **Top-Up Auditing:** Review uploaded receipts with fullscreen zoom lightbox, confirm credited amounts, and approve/reject transactions.
* **Capacity Full Fallback:** Approve payments as *Flexible Store Credit* if the target region is full.
* **Refund Processing:** Enter bank tracking numbers, upload proof of payout screenshots, and release locked escrow funds.

---

### 2.5 Support Ticket Triage & Canned Templates
* Split-screen triage interface with category and status filters.
* Quick-canned response templates (e.g., *Server IP Updated*, *Under Investigation*, *Request Traceroute Logs*).
* Process connection requests directly inside ticket threads.

---

### 2.6 Real-Time 3X-UI HTTP System Logs
* Audit table recording every outgoing API call between the platform and 3X-UI server panels.
* Displays response latency (ms), HTTP status codes, and expandable raw JSON payloads.

---

### 2.7 Platform Settings & Maintenance Lockdown
* Update brand name, default currency, and timezone.
* Configure dynamic PAYG cron sync intervals and 3X-UI request timeouts.
* Set global financial rules (minimum deposit, grace period days, safety cutoff thresholds).
* Toggle platform maintenance mode with broadcast notifications via email and Telegram.