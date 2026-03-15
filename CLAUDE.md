# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev:all      # Start both Next.js (port 3000) + socket server (port 4000) — preferred
npm run dev          # Next.js only
npm run socket:dev   # Socket server only

# Build & Production
npm run build        # Production build
npm run start        # Start on port 3033
./scripts/deploy.sh  # Full build + PM2 deployment

# PM2 Process Management
npm run pm2:status   # Check running services
npm run pm2:logs     # View combined logs
npm run pm2:restart  # Restart all services

# Code Quality
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
```

No test framework is configured in this project.

## Architecture

Enterprise asset and compliance management system (ADMS). Two services:
- **Main App**: Next.js App Router on port 3000 (dev) / 3033 (prod)
- **Socket Server**: Standalone Socket.IO server (`socket-server.js`) on port 4000

### Routing: Dual Route Groups

```
src/app/
├── (defaults)/    # Authenticated routes — full layout with sidebar/header
└── (blank)/       # Unauthenticated — auth pages, portals, error pages
```

Authentication is enforced in `src/app/(defaults)/layout.tsx` (redirects to `/auth/login`). There is no `middleware.ts`.

**Mixed Routing**: App Router handles pages; Pages Router (`pages/api/`) handles API routes that need direct MySQL access. All other API calls go to the external backend at `NEXT_PUBLIC_API_URL` (default: `http://localhost:3030`).

### State Management: Dual Pattern

- **React Context** (`src/store/AuthContext.tsx`): Auth state — user data, roles, permissions, nav tree. Access via `useContext(AuthContext)`.
- **Redux Toolkit** (`src/store/`): UI/theme state only. Access via `useSelector`.

### API Layer

Two axios instances in `src/config/api.ts`:
- `api` — unauthenticated requests
- `authenticatedApi` — auto-injects JWT Bearer token from `localStorage.authData`

JWT tokens are auto-refreshed via `src/config/scheduleTokenRefresh.ts`. Session inactivity detection (default 2-minute timeout) is in `src/config/detectUserInactivity.tsx`.

### Component Organization

Components are organized by **business domain**, not technical layer:

```
src/components/
├── assetmgmt/       # Asset management
├── usermgmt/        # User management
├── purchasing/      # Purchase orders
├── compliance/      # Compliance assessments
├── stockinventory/  # Inventory
├── billings/        # Billing & reports
├── training/        # Training module
├── projectmgmt/     # Project management
├── layouts/         # Header, sidebar, footer
├── ui/              # Shadcn/Radix UI primitives
└── data-importer/   # Excel/CSV import, PDF export
```

New features go into the appropriate domain folder (or a new domain folder).

### Path Aliases

Always use TypeScript path aliases — never relative paths for cross-domain imports:

```typescript
import Component from '@components/usermgmt/user-account'
import { authenticatedApi } from '@/config/api'
import store from '@store/index'
// @app/*, @components/*, @store/*, @styles/*, @/*
```

### Database

Direct MySQL via `mysql2` (no ORM). Connection pool in `src/config/db.ts`. Used only in `pages/api/` routes. Most data operations go through the external backend API.

### Forms

Newer components use `react-hook-form`. Some older components use Formik + Yup. Follow the pattern of the file you're editing.

## Key Notes

- **Socket server required**: Real-time features break without it. If port 4000 is stuck: `lsof -ti:4000 | xargs kill -9`
- **Production logs**: `./logs/` directory or `npm run pm2:logs`
- **Socket test**: `node scripts/test-socket-client.js`
- **i18n**: Translations live in `public/locales/`. Config in `i18n.ts` and `ni18n.config.ts.js`.
- **UI components**: Shadcn/ui primitives in `src/components/ui/`, styled with Tailwind CSS v4.
