# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas + Mongoose (`MONGODB_URI` secret)
- **Validation**: Zod (`zod/v4`)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Database Notes (MongoDB)

- Numeric auto-increment `_id` is preserved across all collections via a `Counter` collection (`getNextId(name)` helper in `lib/db/src/schema/counter.ts`).
- Each model uses a `pre("save")` hook to assign the next numeric ID for new docs.
- API server calls `connectDB()` from `@workspace/db` at startup (in `artifacts/api-server/src/index.ts`).
- Routes use `parseInt(req.params.id, 10)` because IDs remain numeric — no frontend changes were required.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/scripts run seed` — seed demo data into MongoDB
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Demo Accounts (after seeding, password `demo1234`)

- `admin@hms.demo` (admin: Muhammad Hamza)
- `dr.james@hms.demo` (Dr. Ahmed Raza), `dr.sarah@hms.demo` (Dr. Ayesha Khan), `dr.marcus@hms.demo` (Dr. Bilal Siddiqui)
- `alice@hms.demo` (Ayesha Iqbal), `bob@hms.demo` (Usman Ali), `carol@hms.demo` (Fatima Noor), `david@hms.demo` (Imran Haider), `emily@hms.demo` (Zainab Malik)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
