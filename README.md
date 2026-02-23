<p align="center">
  <img src="/app/public/icon.svg" alt="Fidex Logo" width="160"/>
</p>

## Fidex

**Your finances and documents, organized with trust and clarity.**

Fidex is a full‑stack Next.js application that helps you stay in control of your money and important documents.  
It is designed for individuals and professionals who care about structure, privacy, and long‑term traceability of their records.

---

### What Fidex Does

- **Track transactions and balances**  
  Manually manage accounts, incomes, expenses, and transfers with a clean ledger and dashboards.

- **Organize and link documents**  
  Store contracts, receipts, bills, and other files and link them to transactions for a complete audit trail.

- **Category‑based insights**  
  Categorize spending and earnings and get monthly / yearly overviews of where your money goes.

- **Manual account monitoring**  
  No screen‑scraping or automatic bank connections: you control exactly what data is stored.

- **Themed, multi‑palette UI**  
  Light/dark modes plus multiple color palettes, switchable from the avatar morphing dialog.

---

### Tech Stack (Current)

- **Framework**: Next.js 15 (App Router, TypeScript, `app/` directory)
- **Database**: PostgreSQL with Prisma ORM (`app/prisma/schema.prisma`)
- **Auth**: NextAuth v5 (credentials + OAuth) with:
  - Email/password (bcrypt)
  - Optional OAuth providers
  - WebAuthn passkeys (via `@simplewebauthn/*`)
- **UI**: React 19, Tailwind CSS, Radix UI, shadcn‑style components, Recharts for charts
- **Uploads**: UploadThing for document uploads and file handling
- **State Management**: Jotai atoms for client state (profile, theme, etc.)

---

## 🚀 Getting Started (Local Development)

Fidex is a **single Next.js application** in the `app/` directory (there is no separate backend service).

### Prerequisites

- Node.js **20+**
- PostgreSQL instance (local Docker or hosted)
- `npm` (or `pnpm`/`yarn` if you prefer)

### 1. Clone and install

```bash
git clone <repository-url>
cd Fidex/app
npm install
```

### 2. Configure environment

Create `app/.env.local` (from scratch) and set at least:

- `DATABASE_URL` – PostgreSQL connection string
- `NEXTAUTH_SECRET` – random secret for NextAuth JWTs
- `NEXTAUTH_URL` – base URL of the app in your environment (e.g. `http://localhost:3000`)

Optional but recommended:

- `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` – for password reset and verification emails (see `lib/email.ts`)
- UploadThing keys (for document upload) – see `app/app/api/uploadthing/core.ts` if you enable uploads

> If you’re unsure which variables are required for a specific feature, look at the corresponding `lib/*` or `app/app/api/*` file – the code is the single source of truth.

### 3. Run database migrations

From `app/`:

```bash
npx prisma migrate dev
```

This will create/update the PostgreSQL schema defined in `prisma/schema.prisma`.

### 4. Start the dev server

From `app/`:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

---

## Domain Model Overview

The core models are defined in `app/prisma/schema.prisma`:

- **User**  
  Basic identity, optional password, theme preference, and WebAuthn authenticators.

- **Account**  
  User‑owned accounts (name, number, color, icon, currency, balance).

- **Category**  
  Per‑user categories with optional color and icon, used for transactions and documents.

- **Transaction**  
  Incomes, expenses, and transfers with interval, pending flag, category, and links to documents.

- **Document**  
  Metadata for uploaded or stored documents (title, notes, kind, storage key, URL, size, mime type).

- **DocumentTransaction**  
  Join table linking documents to one or more transactions.

Authentication‑related tables (sessions, OAuth accounts, tokens, authenticators) are also defined there and used by NextAuth.

---

## Authentication & Security (High Level)

- **NextAuth v5** with Prisma adapter
- Credentials login (email + password with bcrypt)
- Optional OAuth providers
- WebAuthn passkeys for stronger auth
- Protected routes are implemented via:
  - NextAuth session checks (client and server)
  - Route handlers under `app/app/api/*` that validate the current session before touching data

For deeper details, inspect:

- `app/app/api/auth/[...nextauth]/route.ts`
- `app/auth.ts`
- `app/middleware.ts`

These files reflect the actual, current behavior more reliably than any diagram.

---

## Scripts

All commands below are run from the `app/` directory:

- `npm run dev` – start the development server
- `npm run build` – generate Prisma client (no engine) and build the Next.js app
- `npm run start` – start the production server
- `npm run lint` – run ESLint

---

## Project Structure (Simplified)

```text
Fidex/
├── app/                 # Next.js fullstack app
│   ├── app/             # Routes, layouts, API route handlers
│   ├── components/      # UI + feature components (dashboard, sidebar, dialogs, etc.)
│   ├── lib/             # Server/client utilities (auth, prisma, email, uploadthing)
│   ├── prisma/          # Prisma schema + migrations
│   ├── public/          # Static assets (icons, logo, etc.)
│   ├── state/           # Jotai atoms for client state (theme, profile, accounts, categories)
│   ├── types/           # Shared TypeScript types
│   └── ...              # Config (eslint, tailwind, next, turbo, etc.)
└── docs/                # Docusaurus‑based documentation (may still contain some historical diagrams)
```

---

**Fidex — Where your finances and documents find structure.**  
If something in this README ever diverges from the actual behavior, treat the code as canonical.