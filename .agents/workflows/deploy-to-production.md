---
description: How to deploy changes to the production environment for Violla
---

# Deploying to Production

> **⚠️ ALWAYS ask the user for explicit confirmation before ANY production step.**
> Never run DB migrations on Production or push to `main` without the user saying "yes, deploy to prod" or equivalent.

**Ensure changes have been deployed to staging and explicitly approved by the user before proceeding.**

1. **Database Migrations (If applicable)**:
   - Ask the user to manually run the SQL scripts in the **Production** Supabase project's SQL Editor. Remind them to do this BEFORE the Vercel deployment.
2. **Merge to Main**:
   - Merge the approved changes into the `main` branch locally.
// turbo
3. **Push to Production Branch**:
   - Run: `git push origin main`
4. **Verify Deployment**:
   - Vercel will automatically build and deploy the `main` branch.
   - The production URLs are: `violla.mk` and `violla-one.vercel.app`.
