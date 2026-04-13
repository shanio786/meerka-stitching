# Workspace

## Overview

Stitching Production ERP — complete garment/textile production management system covering all 7 production modules: Fabric Store > Cutting > Stitching > QC > Overlock/Button > Finishing > Final Store. Plus Masters Registry, Accounts/Ledger, Dashboard, and Reports.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec) — used for Module 1 (Fabric Store)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Routing**: wouter
- **Data fetching**: TanStack React Query + Orval hooks (Module 1), direct fetch via `lib/api.ts` (Modules 2-7)
- **Object Storage**: Google Cloud Storage via Replit object storage

## Artifacts

- **API Server** (`artifacts/api-server`): Express 5 backend, port 8080, all routes in `src/routes/`
- **Fabric Store** (`artifacts/fabric-store`): React SPA frontend, deep teal + orange theme, Plus Jakarta Sans font

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/scripts run seed` — seed database with sample data

## Database Schema

### Module 1 - Fabric Store
- **articles**: article definitions (code, name, fabric type, season, category, collection)
- **article_components**: fabric components per article (shirt, trouser, dupatta, etc.) with meters/wastage
- **component_templates**: reusable component templates
- **template_items**: items within templates
- **grn_entries**: Goods Receipt Notes tracking fabric stock from suppliers

### Shared
- **masters**: all masters/workers (cutting, stitching, overlock, button, finishing) with name, phone, machine no, rate
- **sizes**: standard size definitions (XS, S, M, L, XL, XXL)
- **images**: polymorphic image attachments (entity_type + entity_id)

### Module 2 - Cutting
- **cutting_jobs**: cutting job per article with status tracking
- **cutting_assignments**: master assigned to cut specific component with fabric meters, rate, results
- **cutting_size_breakdown**: per-size quantity breakdown for each assignment

### Module 3 - Stitching
- **stitching_jobs**: stitching job per article with supervisor, linked to cutting job
- **stitching_assignments**: master assigned to stitch component with quantity, rate, transfer support

### Module 4 - Quality Control
- **qc_entries**: inspection results (received, passed, rejected qty + rejection reason)

### Module 5 - Overlock / Button
- **overlock_button_entries**: overlock and button work tracking with master, rate, completion

### Module 6 - Finishing
- **finishing_entries**: pressing, folding, packing with worker, rate, waste tracking

### Module 7 - Final Store
- **final_store_receipts**: finished goods received in store with size, qty, source

### Accounts / Ledger
- **master_accounts**: balance, total earned, total paid per master
- **master_transactions**: earning/payment/adjustment log
- **master_payments**: payment records with method (cash, bank, easypaisa, jazzcash, cheque)

## Frontend Pages

### Fabric Store (Module 1)
- Dashboard — summary cards, recent activity, low stock alerts
- Articles — list, create, detail with component management
- GRN — list and create goods receipts
- Inventory — stock overview per article with low stock alerts
- Templates — create and manage component templates
- Reports — stock summary, fabric by type, low stock tabs

### Production (Modules 2-7)
- Cutting — job list, create, detail with master assignments + size breakdown + completion
- Stitching — job list, create, detail with assignments, transfer between masters
- QC — entry list with pass/reject counts, summary cards
- Overlock/Button — overlock and button entries, filter by type/status, completion
- Finishing — entry list, completion with packed/waste tracking
- Final Store — receipts of finished goods

### Management
- Masters — registry of all masters with search, filter by type, CRUD
- Accounts — ledger overview, per-master transaction history, payment recording
- Reports — stock summary, fabric by type, low stock

## API Routes

All routes prefixed with `/api/`:
- Articles CRUD + toggle-active
- Components CRUD + bulk update
- Templates CRUD + apply to article
- GRN CRUD
- Inventory summary, low-stock alerts, per-article stock
- Dashboard summary, recent activity, fabric by type
- Masters CRUD + filter by type
- Sizes list/create/delete
- Cutting jobs CRUD + assignments + complete with auto-credit
- Stitching jobs CRUD + assignments + complete + transfer
- QC entries CRUD
- Overlock/Button entries + complete with auto-credit
- Finishing entries + complete with auto-credit
- Final Store receipts CRUD
- Accounts list, per-master ledger, payment recording
- Images CRUD (entity-based)
- Storage upload URL + object serving

## Business Logic

- When any assignment is marked "completed", the total amount (pieces x rate) is automatically credited to the master's account balance
- Payments deduct from balance
- Stitching assignments support transfer: deduct quantity from original, create new assignment for new master
- Job status auto-updates to "in_progress" when first assignment is created
- All money flows tracked in master_transactions for full audit trail

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
