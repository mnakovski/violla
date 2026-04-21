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
- **Admin Dashboard**: Contains functionalities for managing appointments, working hours, non-working days (including category-specific unavailability), branding, and a **Notes** section.
  - *Notes*: A dedicated tab within the Admin panel using Supabase (`notes` table). Enables admins to store private business notes with title, description, and optional dates. Notes are private by default (`user_id` driven) but support an `is_shared` flag allowing visibility across multiple admin accounts. Robust Row Level Security (RLS) policies are essential to enforce this isolation.
## Ways of Working & Deployment Rules
1. **Local Development**: Use `npm run dev` to start the local Vite server (not `npm run server`).
2. **Environment Strategy**: There are strictly separate environments for **staging** and **production** across both Vercel and Supabase.
3. **Database Migrations**: 
   - Supabase has separate databases for staging and production.
   - Any SQL migration must be run **manually** via the Supabase SQL Editor in BOTH projects.
   - Always run the migration on staging first, before the staging deployment. 
   - After staging is approved by the user, run the migration on production before the production deployment.
4. **Vercel Deployments**:
   - The permanent staging URL is `https://violla-git-staging-mikis-projects-07c0ec41.vercel.app`.
   - A fresh preview can be deployed with `vercel --target preview`, then repointed with `vercel alias set <preview-url> violla-git-staging-mikis-projects-07c0ec41.vercel.app` when needed.
   - `main` branch pushes automatically deploy to production (`violla.mk` and `violla-one.vercel.app`).
   - ALWAYS deploy to staging first, wait for the user to test and approve, and ONLY THEN deploy to production.
   - Never push directly to `main` without user sign-off.
5. **Supabase Edge Functions**:
   - Booking Telegram notifications live in `supabase/functions/send-telegram-booking/index.ts`.
   - This function must be deployed separately from Vercel. A frontend deploy alone does not update it.
   - For public booking flow, deploy it with `--no-verify-jwt`.
   - Staging deploy: `supabase functions deploy send-telegram-booking --project-ref qdyqmvwvadrdlbdowfsg --no-verify-jwt`
   - Production deploy: `supabase functions deploy send-telegram-booking --project-ref suffvdkcwwpdacrxnccm --no-verify-jwt`
6. **Frontend → Supabase Function URL rule**:
   - Never hardcode the production Supabase function URL in the frontend.
   - `src/pages/Index.tsx` must build the function URL from `import.meta.env.VITE_SUPABASE_URL`, so staging points to staging Supabase and production points to production Supabase.
7. **Error Alert Emails**:
   - `send-telegram-booking` sends error alerts through AgentMail.
   - Required Supabase secrets per environment: `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`, `ALERT_EMAIL_TO`, `ENVIRONMENT_LABEL`.
   - Keep `ALERT_EMAIL_FROM` as the inbox email address if it is needed again later, but the current stable AgentMail payload works without explicitly sending `from` in the request body.
   - Current environment labels: `Violla Staging` and `Violla Production`.

## Booking Flow Rules

### Time Slot Intervals
- **Client-facing UI** (TimeSlots.tsx, useAvailability.ts): Shows **30-minute intervals only** (e.g. 09:00, 09:30, 10:00…).
  - Uses `generateTimeSlotsForDate30()` from `src/utils/workingHours.ts`.
- **Admin panel** (Admin.tsx dialog, WeekCalendar.tsx positioning): Retains **15-minute precision** and supports expanded time limits from **07:00 AM to 23:00 PM**.
  - Uses custom internal `generateTimeOptions()` rather than the old default and has **no impact on frontend availability**.

### Nails Category Slot Restriction
- Applies **only to the "Nails" (Нокти) category**, **only on client-facing UI**.
- On **Monday, Wednesday, Friday** (second-shift days: 13:00–20:00): the last available slot is **18:30**. Slots 19:00 and 19:30 are hidden.
- On all other days (Tue, Thu, Sat): Nails shows full 30-min slots up to the working day end.
- Implemented via `generateNailsSlots()` in `src/utils/workingHours.ts`.
- Does **NOT** affect admin scheduling — admin can still book any time manually.

### Date Picker Behavior
- All date pickers close automatically when a date is selected.
- **Client DatePicker** (`src/components/DatePicker.tsx`): controlled via `open`/`setOpen(false)` in `handleSelect`.
- **Admin WeekCalendar** (`src/components/admin/WeekCalendar.tsx`): controlled via `isCalendarOpen`/`setIsCalendarOpen(false)` in `jumpToDate`.
- **Admin Appointment Date Picker** (`src/pages/Admin.tsx`): controlled via `isApptDateOpen`/`setIsApptDateOpen(false)`.
- **Admin Non-Working Day Date Picker** (`src/pages/Admin.tsx`): controlled via `isNwdDateOpen`/`setIsNwdDateOpen(false)`.
