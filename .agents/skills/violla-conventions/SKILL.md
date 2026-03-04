---
name: Violla Project Conventions
description: Core architecture, tech stack, and ways of working for the Violla project.
---

# Violla Codebase Conventions and Way of Working

## Tech Stack
- **Frontend Framework**: React with Vite (`vite_react_shadcn_ts`)
- **Language**: TypeScript throughout
- **Styling**: Tailwind CSS
- **Component Library**: shadcn/ui (Radix UI, Lucide React)
- **State Management / Data Fetching**: React Query (`@tanstack/react-query`)
- **Routing**: React Router (`react-router-dom`)
- **Database / Backend**: Supabase (PostgreSQL) + Prisma (if used in specific parts, though mainly Supabase JS client)
- **Forms & Validation**: `react-hook-form` + `zod`
- **Testing**: Vitest (`vitest`) and Testing Library

## Architecture & Features
- **Mobile-First**: The application is designed to be mobile-first and fully responsive, serving as a Hair Salon Appointment System.
- **Dynamic Branding**: The UI theme and branding dynamically adjust based on uploaded images.
- **Core Entities**: Focuses on managing services (with category and duration), appointments, calendar views, and conflicting working hours.
- **Admin Dashboard**: Contains functionalities for managing appointments, working hours, non-working days (including category-specific unavailability), and branding.

## Ways of Working & Deployment Rules
1. **Local Development**: Use `npm run dev` to start the local Vite server (not `npm run server`).
2. **Environment Strategy**: There are strictly separate environments for **staging** and **production**.
3. **Database Migrations**: 
   - Supabase has separate databases for staging and production.
   - Any SQL migration must be run **manually** via the Supabase SQL Editor in BOTH projects.
   - Always run the migration on staging first, before the staging deployment. 
   - After staging is approved by the user, run the migration on production before the production deployment.
4. **Vercel Deployments**:
   - `staging` branch pushes automatically deploy to a permanent preview URL: `https://violla-git-staging-mikis-projects-07c0ec41.vercel.app`.
   - `main` branch pushes automatically deploy to production (`violla.mk` and `violla-one.vercel.app`).
   - ALWAYS deploy to staging first. Push to `staging`, wait for the user to test and approve, and ONLY THEN deploy to `main`.
   - Never push directly to `main` without user sign-off.
