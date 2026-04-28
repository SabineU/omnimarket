<!--
  README.md – OmniMarket
  A multi-vendor e-commerce platform for learning PERN full-stack development.
  This file serves as the entry point for anyone visiting the repository.
-->

# 🚀 OmniMarket

## 🎯 Overview

> A multi‑vendor e‑commerce platform where customers can buy anything, sellers can manage their stores, and admins oversee the entire marketplace. Built for learning full‑stack PERN development with modern tooling and rigorous testing.

<!--
  Badges: These are dynamic images from services like GitHub Actions, Codecov, etc.
  We will replace placeholders with real badges once CI is set up.
-->

[![CI](https://github.com/<your-username>/omnimarket/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-username>/omnimarket/actions)
[![codecov](https://codecov.io/gh/<your-username>/omnimarket/branch/main/graph/badge.svg)](https://codecov.io/gh/<your-username>/omnimarket)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🏗️Architecture

<!--
  A simple text diagram to show the big picture.
  Replace <your-username> with your actual GitHub username when you push.
-->

```text
┌────────────────┐
│  Customer App  │ (React + Vite)
│   Seller App   │
│   Admin App    │
└───────┬────────┘
        │ HTTPS / REST
┌───────▼────────┐
│  Express API   │ (Node + TypeScript)
│   Prisma ORM   │
└───────┬────────┘
        │
┌───────▼────────┐
│   PostgreSQL   │ (Neon Serverless)
└────────────────┘
```

---

## 🌐 + 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS, React Router, React Query
- **Backend:** Node.js 24, Express 5, TypeScript, Prisma, PostgreSQL
- **Testing:** Vitest, React Testing Library, Cypress (API), Playwright (E2E), k6 (Performance)
- **Quality Gates:** ESLint (flat config), Prettier, Husky, lint‑staged, Allure Reports
- **CI/CD:** GitHub Actions, Render (backend), Vercel (frontend)

---

## 📌 Prerequisites

- **Node.js** ≥ 24.12.0 (with npm)
- **pnpm** ≥ 10.33.2 → install globally: `npm install -g pnpm`
- **PostgreSQL** (local install or Neon free tier connection string)
- **Git** and a GitHub account

---

## 📝 Setup Instructions

### 1. Clone the repository

```bash
git clone git@github.com:<your-username>/omnimarket.git
cd omnimarket
```

### 2. Install dependencies

```bash
pnpm install
```

This will also set up Husky Git hooks automatically.

### 3. Set up environment variables

```bash
cp .env.example .env   # (we'll create .env.example later)
```

Fill in the required values (database URL, Stripe keys, etc.) in .env.

### 4. Set up the database

```bash
cd backend
pnpm prisma migrate dev --name init
pnpm prisma db seed
cd ..
```

### 5. Start development servers

```bash
pnpm dev
```

- Backend runs on http://localhost:5000
- Frontend (Customer) runs on http://localhost:5173
- Seller and Admin apps can be started similarly later.

---

## 🤖 Available Scripts

| Command             | Description                                          |
| :------------------ | :--------------------------------------------------- |
| `pnpm dev`          | Start all dev servers in parallel                    |
| `pnpm build`        | Build all workspaces for production                  |
| `pnpm lint`         | Run ESLint on the entire repo (zero‑warnings policy) |
| `pnpm lint:fix`     | Auto‑fix lint errors where possible                  |
| `pnpm format`       | Format code with Prettier                            |
| `pnpm format:check` | Check formatting without writing changes             |
| `pnpm test`         | Run unit tests in all workspaces                     |
| `pnpm test:e2e`     | Run end‑to‑end tests (Playwright)                    |
| `pnpm type-check`   | Run TypeScript compiler in check‑only mode           |

---

## 🛂 🚦 Quality Gates

Every change to the codebase must pass these automated checks before it can be merged or deployed.

| Gate                    | Tool                                    | What It Checks                                  | When It Runs                         |
| :---------------------- | :-------------------------------------- | :---------------------------------------------- | :----------------------------------- |
| **Linting**             | ESLint (flat config), TypeScript‑ESLint | Code quality, type safety, best practices       | Pre‑commit (Husky + lint‑staged), CI |
| **Formatting**          | Prettier                                | Consistent code style                           | Pre‑commit, CI                       |
| **Required Files**      | `check‑req` script (custom)             | README.md, eslint.config.js, package.json exist | CI                                   |
| **Unit Tests**          | Vitest + React Testing Library          | Individual components, hooks, utilities         | CI                                   |
| **API Contract Tests**  | Vitest                                  | API endpoints match contract                    | CI                                   |
| **Integration Tests**   | Supertest + real DB                     | Backend routes work end‑to‑end with DB          | CI                                   |
| **E2E Tests**           | Playwright (POM)                        | Complete user journeys                          | CI                                   |
| **Code Coverage**       | Vitest (v8 provider)                    | ≥70% statements, branches, functions, lines     | CI                                   |
| **Accessibility Audit** | axe‑core (Playwright integration)       | 0 accessibility violations                      | E2E suite                            |
| **Performance Audit**   | Lighthouse (programmatic)               | Performance & A11y scores meet threshold        | Manual trigger                       |
| **Code Review**         | GitHub Pull Requests                    | At least one approving review                   | Manual (branch protection)           |

All gates except Code Review run automatically in GitHub Actions.

---

## 🌐 Deployment

The app is deployed using free-tier services:

- Frontend: Vercel (automatic deploys from main branch)
- Backend: Render (web service) or Railway
- Database: Neon (serverless PostgreSQL) or Supabase
- Image storage: Cloudinary
- Detailed deployment guide coming soon.

---

## 🌎 + 🤝 Contributing

This project is primarily a learning resource, but contributions are welcome! Please follow the quality gates, write tests for new features, and use conventional commits.

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

Sabine U. – [GitHub](https://github.com/SabineU) | [LinkedIn](https://www.linkedin.com/in/sabine-umuhoza/)
