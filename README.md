# Oasis — Hydration & Creatine Coach

A luxury, installable web app for water + creatine tracking with **Dima**, a built-in AI performance coach. Vanilla HTML/CSS/JS, deployed on GitHub Pages, works offline as a PWA.

## Features

- 💧 Hydration tracking with smart daily goal (weight + activity based)
- 💊 Creatine tracking with loading-phase support and saturation estimate
- ⭐ Wellness score with transparent point breakdown
- 🤖 Dima AI coach — personalized, data-aware chat (local engine, optional Claude API)
- 🔥 Streaks, badges, confetti, haptics, smart reminders
- 📲 Installable PWA with offline support
- 👑 Pro tier with 7-day trial, license keys, and Stripe checkout

## Monetization setup (owner guide)

Pro is gated through `PAYMENT_CONFIG` at the top of the Pro section in `scripts.js`.

### 1. Create Stripe Payment Links
1. Stripe Dashboard → Payment Links → create one for **$4.99/mo** and one for **$39.99/yr**.
2. Paste the URLs into `PAYMENT_CONFIG.stripeMonthlyUrl` / `stripeYearlyUrl`.
3. Until the URLs are set, the upgrade button starts a 7-day free trial instead.

### 2. Deliver license keys
After checkout, deliver a license key to the customer (Stripe confirmation page custom message, or an email automation like Zapier/Make on `checkout.session.completed`).

Generate keys: open the deployed app, open the browser console, run:
```js
generateLicenseKey()   // → "OASIS-XXXX-XXXX-XXXX"
```
Customers activate via **Upgrade modal → "Have a license key?"**.

### 3. Harden it later (recommended)
Keys are checksum-validated client-side, which is fine for launch but forgeable by a determined user. When ready, deploy a tiny endpoint (Cloudflare Worker / Vercel function) that verifies keys against your Stripe customer list and set `PAYMENT_CONFIG.verifyEndpoint`. `TODO(backend)` markers show exactly where it plugs in.

## AI Coach

- Works out of the box with a local intent engine (18 intents, real user-data responses).
- Optional: paste an Anthropic API key in Settings → AI Coach for full LLM chat.
  For production, proxy API calls through a backend instead of client-side keys.

## Development

No build step. Edit `index.html` / `style.css` / `scripts.js`, push to `main`, GitHub Actions deploys to Pages. All user data lives in `localStorage` — nothing is uploaded.
