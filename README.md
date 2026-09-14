# Cookie Chain cApp

A Vite + React frontend for Cookie Chain — wallet connect, token balances, and token swaps via the Candy Shop aggregator.

## Architecture

```
browser (Vite/React)
    │  fetch /api/*  (Vite proxies to :3001 in dev)
    ▼
server/  ← Express proxy  (localhost:3001)
    │  MCP stdio          │  HTTPS
    ▼                     ▼
cookie-mcp            https://swap.cookiescan.io/api
(balance, quote,      (quote, build unsigned tx,
 token info)           submit signed tx, confirm)
```

The proxy has two integration points:

- **cookie-mcp** (stdio child process via MCP SDK) — read-only tools: `get_balance`, `get_token_info`. No key needed.
- **Candy Shop aggregator HTTP API** — swap quotes, unsigned transaction building, submission, and confirmation polling. The server never holds or uses a wallet key; it only relays.

Signing always happens client-side in the user's Nightly wallet.

## Requirements

- **Node ≥ 22** (cookie-mcp requires it; check with `node --version`)
- [Nightly wallet](https://nightly.app) browser extension

## Setup

```bash
# 1. Install all dependencies (root + server workspace)
npm install

# 2. Copy the env template and review the defaults
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
| Express proxy (cookie-mcp + Candy Shop bridge) | http://localhost:3001 |

Vite proxies all `/api/*` requests to the Express server automatically. The proxy warms the cookie-mcp connection on startup — wait for `[mcp] ready` in the terminal before expecting balance data.

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
| `GET`  | `/api/balances?wallet=` | Token balances via cookie-mcp |
| `POST` | `/api/swap/quote` | Swap quote from Candy Shop |
| `POST` | `/api/swap/build` | Build unsigned transaction |
| `POST` | `/api/swap/submit` | Submit signed transaction |
| `GET`  | `/api/swap/confirm/:sig` | Poll confirmation status |

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `VITE_COOKIE_RPC_URL` | `.env.local` | `https://rpc.cookiescan.io` | RPC endpoint used by the frontend wallet adapter |
| `COOKIE_RPC_URL` | `.env.local` | `https://rpc.cookiescan.io` | RPC forwarded to cookie-mcp (server-side) |
| `COOKIE_SWAP_API_URL` | `.env.local` | `https://swap.cookiescan.io/api` | Candy Shop aggregator base URL |
| `PORT` | shell / `.env.local` | `3001` | Proxy listen port |
| `CORS_ORIGIN` | shell / `.env.local` | `http://localhost:5173` | Allowed CORS origin for the proxy |

> **Never commit** `COOKIE_PRIVATE_KEY` or any other secret.  
> The `.gitignore` excludes `.env.local` and all `.env.*.local` files.  
> The proxy intentionally starts with **no** `COOKIE_PRIVATE_KEY` — swap signing is done client-side only.

## Scripts

```bash
npm run dev        # start both servers (proxy + Vite)
npm run build      # production Vite build
npm run preview    # preview production build locally
npm run typecheck  # tsc --noEmit for both frontend and server
```

## cookie-mcp tools used

| Tool | Purpose | Key needed |
|------|---------|------------|
| `get_balance` | Token balances for a wallet | No |
| `get_token_info` | Resolve token decimals for quote math | No |

Full tool reference: [github.com/cookiechain/cookie-mcp](https://github.com/cookiechain/cookie-mcp)

## Mainnet notice

Cookie Chain is **mainnet-only**. Every transaction spends real value.  
All swap actions require explicit confirmation in both the app UI and the Nightly wallet before any transaction is signed or sent.

## Licence

MIT
