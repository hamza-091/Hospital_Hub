# 🏥 Hospital Hub — Hospital Management System

A full-stack **Hospital Management System** with role-based dashboards for administrators, doctors, and patients. Built with React, Express, and MongoDB.

---

## ✨ Features

- **Admin Dashboard** — Manage users, doctors, appointments, medicines, and invoices
- **Doctor Dashboard** — View appointments, manage medical records, and write prescriptions
- **Patient Dashboard** — Book appointments, view records, prescriptions, and invoices
- **Authentication** — JWT-based login & registration with role-based access control
- **PDF Generation** — Generate invoices and prescriptions as PDFs
- **Responsive UI** — Built with shadcn/ui components and Tailwind CSS

---

## 🗂️ Project Structure

```
Hospital-Hub/
├── frontend/               # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/     # Reusable UI components (shadcn/ui)
│   │   ├── hooks/          # Custom React hooks (auth, toast)
│   │   ├── lib/            # Utilities (currency, cn helper)
│   │   └── pages/          # Page components
│   │       ├── admin/      # Admin pages
│   │       ├── doctor/     # Doctor pages
│   │       └── patient/    # Patient pages
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                # Express 5 API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── lib/            # Auth helpers, logger
│   │   ├── middlewares/    # Express middlewares
│   │   ├── app.ts          # Express app setup
│   │   └── index.ts        # Server entry point
│   ├── build.mjs           # esbuild config
│   └── package.json
│
├── shared/                 # Shared libraries
│   ├── db/                 # Mongoose models & connection
│   ├── api-zod/            # Zod validation schemas
│   ├── api-client-react/   # Generated React Query hooks
│   └── api-spec/           # OpenAPI spec + Orval codegen
│
├── scripts/                # Seed scripts & utilities
│   └── src/seed.ts         # Database seeder
│
├── .env.example            # Environment variables template
├── package.json            # Root workspace config
├── pnpm-workspace.yaml     # PNPM workspace definition
└── tsconfig.base.json      # Shared TypeScript config
```

---

## 🛠️ Tech Stack

| Layer       | Technology                                    |
| ----------- | --------------------------------------------- |
| Frontend    | React 19, Vite, Tailwind CSS 4, shadcn/ui     |
| Backend     | Express 5, Node.js, esbuild                   |
| Database    | MongoDB Atlas + Mongoose                       |
| Validation  | Zod                                           |
| Auth        | JWT (jsonwebtoken + bcryptjs)                  |
| API Client  | TanStack React Query (auto-generated via Orval)|
| Language    | TypeScript 5.9                                |
| Monorepo    | pnpm workspaces                               |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **pnpm** ≥ 10 (`npm install -g pnpm`)
- **MongoDB Atlas** account (or a local MongoDB instance)

### 1. Clone the repository

```bash
git clone https://github.com/hamza-091/Hospital_Hub.git
cd Hospital_Hub
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your MongoDB connection string and a session secret.

### 3. Install dependencies

```bash
pnpm install
```

### 4. Seed the database (optional)

```bash
pnpm seed
```

This populates the database with demo data including admin, doctor, and patient accounts.

### 5. Run the development servers

```bash
# Start backend API server
pnpm dev:backend

# In another terminal — start frontend dev server
pnpm dev:frontend
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api

---

## 👤 Demo Accounts

After seeding, use password **`demo1234`** for all accounts:

| Role    | Email                | Name             |
| ------- | -------------------- | ---------------- |
| Admin   | admin@hms.demo       | Muhammad Hamza   |
| Doctor  | dr.james@hms.demo    | Dr. Ahmed Raza   |
| Doctor  | dr.sarah@hms.demo    | Dr. Ayesha Khan  |
| Doctor  | dr.marcus@hms.demo   | Dr. Bilal Siddiqui |
| Patient | alice@hms.demo       | Ayesha Iqbal     |
| Patient | bob@hms.demo         | Usman Ali        |
| Patient | carol@hms.demo       | Fatima Noor      |
| Patient | david@hms.demo       | Imran Haider     |
| Patient | emily@hms.demo       | Zainab Malik     |

---

## 📜 Available Scripts

| Command              | Description                                  |
| -------------------- | -------------------------------------------- |
| `pnpm dev:frontend`  | Start frontend Vite dev server               |
| `pnpm dev:backend`   | Build & start backend Express server         |
| `pnpm build`         | Typecheck + build all packages               |
| `pnpm typecheck`     | Run TypeScript type checking                 |
| `pnpm seed`          | Seed database with demo data                 |

---

## 📄 License

MIT
