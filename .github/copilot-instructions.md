# ADMS4 Next.js - AI Coding Assistant Instructions

## Architecture Overview

This is a Next.js 15 TypeScript enterprise application using the **App Router** with domain-driven component organization. The codebase follows a dual-service architecture:

- **Main App**: Next.js on port 3033 (production) / 3000 (development)
- **Socket Server**: Standalone Node.js WebSocket server on port 4000
- **Deployment**: PM2 process manager for production

## Project Structure Patterns

### Component Organization by Business Domain
Components are organized by business domain, not technical layers:
```
src/components/
├── usermgmt/          # User management domain
├── purchasing/        # Purchase order domain  
├── assetmgmt/         # Asset management domain
├── compliance/        # Compliance domain
├── stockinventory/    # Inventory domain
├── layouts/           # Layout components
└── ui/               # Reusable UI primitives
```

**Key Pattern**: When adding features, group components by business domain, not by technical function. New feature? Create a new domain folder.

### Path Aliases (Critical for Imports)
Always use these TypeScript path aliases defined in `tsconfig.json`:
```typescript
import Component from '@components/usermgmt/user-account'
import { authenticatedApi } from '@/config/api'
import store from '@store/index'
```

### App Router Structure
Uses Next.js App Router with route groups:
- `src/app/(defaults)/` - Main authenticated routes
- `src/app/(blank)/` - Auth/landing pages without layout

## State Management Architecture

### Dual State Pattern
The app uses **both** Redux Toolkit and React Context:

1. **Redux Toolkit** (`src/store/`) - Global UI state (theme, settings)
2. **React Context** (`src/store/AuthContext.tsx`) - Authentication state

**Usage Pattern**:
```typescript
// For auth data
const { user, isAuthenticated } = useContext(AuthContext)

// For theme/UI state  
const themeConfig = useSelector((state: IRootState) => state.themeConfig)
```

### API Layer Pattern
Two axios instances in `src/config/api.ts`:
- `api` - Unauthenticated requests
- `authenticatedApi` - Auto-includes JWT Bearer token from localStorage

## Development Workflows

### Dual-Service Development
**Always start both services together**:
```bash
npm run dev:all    # Starts both Next.js app + socket server
# OR separately:
npm run dev        # Next.js (Terminal 1)
npm run socket:dev # Socket server (Terminal 2)
```

### Production Deployment
Uses PM2 ecosystem with two processes:
```bash
./scripts/deploy.sh  # Full build and PM2 deployment
npm run pm2:status   # Check running services
npm run pm2:logs     # View combined logs
```

**Critical**: Socket server must be running for real-time features to work.

## UI/Component Patterns

### Shadcn/ui + Radix Integration
Heavy use of Radix UI primitives with custom styling:
- Base components in `src/components/ui/`
- Extended with Tailwind CSS v4
- Configured in `components.json`

### Form Patterns
Consistent form handling with:
- **Formik** for form state
- **Yup** for validation schemas
- **react-hook-form** in some newer components

## Key Integration Points

### WebSocket Communication
Socket.IO client connects to standalone server:
```typescript
// Pattern: Always check socket connection status
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL)
```

### Data Import/Export System
Dedicated `src/components/data-importer/` handles:
- Excel parsing with ExcelJS
- CSV processing with PapaParse  
- PDF generation with jsPDF + Tesseract.js OCR

### Multi-language Support
i18next integration:
- Translations in `public/locales/`
- Configuration in `i18n.ts` and `ni18n.config.ts.js`
- Component: `src/components/language-dropdown.tsx`

## Database & External APIs

### MySQL Integration
- Connection config: `src/config/db.ts`
- Uses mysql2 driver
- API routes in `pages/api/` (Pages Router for API)

### Authentication Flow
JWT-based with:
- Token stored in localStorage as 'authData'
- Auto-refresh scheduling in `src/config/scheduleTokenRefresh.ts`
- User inactivity detection in `src/config/detectUserInactivity.tsx`

## Critical Development Notes

1. **Mixed Routing**: App Router for pages, Pages Router for API routes
2. **Socket Dependency**: Many features require the socket server - always check it's running
3. **PM2 Logs**: Check `./logs/` directory for production debugging
4. **Path Aliases**: Always use `@/` imports, never relative paths for cross-domain imports
5. **Domain Components**: Add new features to appropriate domain folders, not generic locations

## Testing & Debugging

### Socket Connection Testing
Use `scripts/test-socket-client.js` to verify WebSocket connectivity.

### Common Debugging Commands
```bash
lsof -ti:4000 | xargs kill -9  # Kill socket server if port stuck
npm run pm2:restart            # Restart all production services
tail -f logs/app-combined.log  # Monitor production logs
```

When implementing new features, follow the domain-driven organization and always consider both the HTTP API and WebSocket communication patterns established in this codebase.