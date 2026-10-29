# 🌍 Internationalization (i18n) & Dual-Theme Architecture

This document details the multi-language localization engine, RTL layout handling, font typography, and dual-theme color systems implemented in the **PAYG MNG Web Portal**.

---

## 📑 Table of Contents

- [1. Supported Languages & Locales](#1-supported-languages--locales)
- [2. Dynamic RTL / LTR Document Direction](#2-dynamic-rtl--ltr-document-direction)
- [3. Vazirmatn Typography for Persian](#3-vazirmatn-typography-for-persian)
- [4. Cookie Persistence & Database Synchronization](#4-cookie-persistence--database-synchronization)
- [5. Dual-Theme Palette System (Tailwind CSS 4)](#5-dual-theme-palette-system-tailwind-css-4)
- [6. Dual-Currency Display (Toman & USD)](#6-dual-currency-display-toman--usd)

---

## 1. Supported Languages & Locales

The application provides first-class support for three languages:

| Language | Code | Direction | Primary Target Users | Typography / Font |
| :--- | :---: | :---: | :--- | :--- |
| **English** | `en` | `ltr` | International / Default | System Sans-Serif |
| **Persian / Farsi** | `fa` | `rtl` | Iranian Clients & Admins | `Vazirmatn` Google Font |
| **Russian** | `ru` | `ltr` | Russian & CIS Clients | System Sans-Serif |

Translation dictionaries are maintained as clean JSON files inside `src/i18n/locales/`:
* `src/i18n/locales/en.json`
* `src/i18n/locales/fa.json`
* `src/i18n/locales/ru.json`

---

## 2. Dynamic RTL / LTR Document Direction

When a user switches language to Persian (`fa`), the application executes `updateDocumentDirection`:

```typescript
// src/i18n/i18n.ts
export function updateDocumentDirection(lang: string, persistCookie: boolean = true) {
  const dir = lang === 'fa' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  if (lang === 'fa') {
    document.body.classList.add('font-fa');
  } else {
    document.body.classList.remove('font-fa');
  }

  if (persistCookie) {
    setCookie('payg_lang', lang);
    localStorage.setItem('payg_vpn_lang', lang);
  }
}
```

* **Tailwind Logical Properties:** All margins, paddings, and absolute positioning utilize Tailwind logical classes (`start-0`, `end-0`, `ps-4`, `pe-4`, `ms-2`, `me-2`) so layouts flip automatically without CSS duplication.

---

## 3. Vazirmatn Typography for Persian

When `document.body.classList.contains('font-fa')` is active, the application loads the **`Vazirmatn`** font family (imported via Google Fonts in `src/assets/styles/index.css`), ensuring crisp legibility for Persian numerals and Nastaliq-inspired letterforms.

---

## 4. Cookie Persistence & Database Synchronization

Language selection follows a two-tier persistence model:

1. **Guest / Public Mode:** Language is stored in a 1-year client cookie (`payg_lang`). If no cookie exists, the portal fetches the administrator's default platform language setting via `GET /api/config/public`.
2. **Authenticated Mode:** Switching language makes an asynchronous call to `PATCH /api/iam/users/me/language`, permanently updating the user's record in `iam_db`. Subsequent logins on other devices automatically restore their preferred language.

---

## 5. Dual-Theme Palette System (Tailwind CSS 4)

Themes are configured via Tailwind CSS 4 variables in `src/assets/styles/index.css`:

### Eye-Comfort Dark Mode (`.dark`)
Designed with deep charcoal and slate tones to reduce eye strain:
* Canvas: `#0f141c` (Deep slate, avoiding harsh pitch black)
* Cards / Surfaces: `#171d27` (Distinct elevated layers)
* Borders: `#2b364a` (Crisp discernible boundaries)
* Primary Accent: `#10b981` (Emerald 500)

### Glare-Free Light Mode
Uses soothing pearl gray and crisp white surfaces:
* Canvas: `#f0f3f7` (Soft pearl gray, avoiding glare)
* Cards / Surfaces: `#ffffff` (White elevation popping against canvas)
* Borders: `#d9e0ea` (Clear component borders)

Themes are toggled via `ThemeContext` and persisted in the `payg_theme` cookie.

---

## 6. Dual-Currency Display (Toman & USD)

Financial formatting adapts to the client's registered account currency (`billing_currency`):

```typescript
// src/utils/formatters.ts
export function formatCurrency(amount: number, currency: 'IRT' | 'USD' | string = 'IRT'): string {
  if (String(currency).toUpperCase() === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  }
  return `${Math.round(amount).toLocaleString()} تومان`;
}
```

* **Iran Accounts (`IRT`):** Display balances and rates formatted as `Toman` (`T`).
* **International Accounts (`USD`):** Display balances formatted in standard USD (`$`).