# Workspace

## Overview

Stitching Production ERP — pnpm workspace monorepo using TypeScript. Step 1: Fabric Store Module for garment/textile factories to track articles, fabric components, GRN stock receipts, and inventory.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui
- **Routing**: wouter
- **Data fetching**: TanStack React Query + Orval-generated hooks

## Artifacts

- **API Server** (`artifacts/api-server`): Express 5 backend, port 8080, all routes in `src/routes/`
- **Fabric Store** (`artifacts/fabric-store`): React SPA frontend, deep teal + orange theme, Plus Jakarta Sans font

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `cd scripts && npx tsx src/seed.ts` — seed database with sample data

## Database Schema

- **articles**: article definitions (code, name, fabric type, season, category, collection)
- **article_components**: fabric components per article (shirt, trouser, dupatta, etc.) with meters/wastage
- **component_templates**: reusable component templates
- **template_items**: items within templates
- **grn_entries**: Goods Receipt Notes tracking fabric stock from suppliers

## Frontend Pages

- Dashboard — summary cards, recent activity, low stock alerts
- Articles — list, create, detail with component management
- GRN — list and create goods receipts
- Inventory — stock overview per article with low stock alerts
- Templates — create and manage component templates
- Reports — stock summary, fabric by type, low stock tabs

## API Routes

All routes prefixed with `/api/`:
- Articles CRUD + toggle-active
- Components CRUD + bulk update
- Templates CRUD + apply to article
- GRN CRUD
- Inventory summary, low-stock alerts, per-article stock
- Dashboard summary, recent activity, fabric by type

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
