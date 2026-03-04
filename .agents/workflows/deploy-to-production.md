---
description: How to deploy changes to the production environment for Violla
---

# Deploying to Production

**WARNING: Ensure changes have been deployed to staging and explicitly approved by the user before proceeding.**

1. **Database Migrations (If applicable)**:
   - If there are any schema changes, manually run the SQL scripts in the **Production** Supabase project's SQL Editor. This must be done BEFORE the Vercel deployment if it's a non-breaking or forward-compatible migration, or managed carefully if breaking.
2. **Merge to Main**:
   - Merge the approved changes into the `main` branch locally.
// turbo
3. **Push to Production Branch**:
   - Run: `git push origin main`
4. **Verify Deployment**:
   - Vercel will automatically build and deploy the `main` branch.
   - The production URLs are: `violla.mk` and `violla-one.vercel.app`.
