# Cookie Chain cApp

A Vite + React frontend for Cookie Chain — wallet connect, token balances, and token swaps via the Candy Shop aggregator.

## Architecture

```
browser (Vite/React)
    │  fetch /api/*
    ▼
Vercel serverless function  (/api/index.ts)
    │  same-process call
    ▼
Express app  (server/src/index.ts)
    │  HTTPS                     │  @solana/web3.js → RPC
    ▼                            ▼
https://swap.cookiescan.io   https://rpc.cookiescan.io
(Candy Shop aggregator —     (Cookie Chain RPC —
 quote, build unsigned tx,    native balance, SPL balances,
 submit signed tx, confirm)   transaction history)
```

The serverless function and the frontend are deployed together as a single Vercel project. In local development, `npm run dev` starts both an Express process on port 3001 and Vite on port 5173; Vite proxies all `/api/*` requests to Express.

Signing always happens client-side in the user's Nightly wallet. The server never holds or uses a wallet key.

## Requirements

- **Node ≥ 22** (check with `node --version`)
- [Nightly wallet](https://nightly.app) browser extension

## Setup

```bash
# 1. Install all dependencies (root + server workspace)
npm install

# 2. Copy the env template and set values
cp .env.example .env.local
# edit .env.local if you want a custom RPC or swap API URL
```

## Running locally

```bash
npm run dev
```

This starts two processes concurrently:

| Process | URL |
|---------|-----|
| Vite dev server (frontend) | http://localhost:5173 |
| Express proxy (API routes) | http://localhost:3001 |

Vite proxies all `/api/*` requests to the Express server automatically.

## Deploying to Vercel

The project is pre-configured for Vercel via `vercel.json`. One-time setup:

```bash
# Install Vercel CLI if you don't have it
npm i -g vercel

# Link and deploy (first time — follow the prompts)
vercel

# Subsequent deploys
vercel --prod
```

Set these environment variables in your Vercel project settings
(Dashboard → Project → Settings → Environment Variables):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `COOKIE_RPC_URL` | No | `https://rpc.cookiescan.io` | Cookie Chain RPC endpoint |
| `COOKIE_SWAP_API_URL` | No | `https://swap.cookiescan.io/api` | Candy Shop aggregator base URL |
| `CORS_ORIGIN` | No | `*` | Restrict CORS origin if needed |

The `VITE_COOKIE_RPC_URL` variable (frontend) is only needed in local `.env.local` — in production the frontend and API share the same origin so no explicit RPC URL is required in the browser bundle.

## Swap flow

1. Enter an amount and select input/output tokens in the Swap panel.
2. A quote is fetched automatically (debounced 600 ms) — rate, price impact, min received, and route are displayed before any action.
3. Click **Review swap** to open the confirmation modal.
4. Read the mainnet warning, verify the details, then click **Confirm & sign**.
5. Nightly prompts for approval — the transaction is built server-side as an *unsigned* VersionedTransaction and signed entirely in your browser.
6. The signed transaction is submitted via the Candy Shop relay and confirmation is polled until on-chain.
7. A link to the Cookie Chain explorer appears once confirmed.

Every step that could spend value requires explicit user action. There is no auto-submit anywhere in the codebase.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/health` | Liveness probe |
| `GET`  | `/api/balances?wallet=` | Native COOK + SPL token balances via RPC |
| `GET`  | `/api/activity?wallet=` | Recent transaction history via RPC |
| `POST` | `/api/swap/quote` | Swap quote from Candy Shop |
| `POST` | `/api/swap/build` | Build unsigned transaction |
| `POST` | `/api/swap/submit` | Submit signed transaction |
| `GET`  | `/api/swap/confirm/:sig` | Poll confirmation status |

## Environment variables

### Local development (`.env.local`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_COOKIE_RPC_URL` | `https://rpc.cookiescan.io` | RPC endpoint used by the frontend wallet adapter |
| `COOKIE_RPC_URL` | `https://rpc.cookiescan.io` | RPC used server-side for balances and activity |
| `COOKIE_SWAP_API_URL` | `https://swap.cookiescan.io/api` | Candy Shop aggregator base URL |
| `PORT` | `3001` | Local Express server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin for local dev |

> **Never commit** a `.env.local` file or any file containing secrets.
> `.gitignore` excludes `.env.local` and all `.env.*.local` files.

## Scripts

```bash
npm run dev        # start both servers (Express + Vite)
npm run build      # production Vite build
npm run preview    # preview production build locally
npm run typecheck  # tsc --noEmit for both frontend and server
```

## Mainnet notice

Cookie Chain is **mainnet-only**. Every transaction spends real value.
All swap actions require explicit confirmation in both the app UI and the Nightly wallet before any transaction is signed or sent.

## Licence

MIT
