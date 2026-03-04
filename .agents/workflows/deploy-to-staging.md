---
description: How to deploy changes to the staging environment for Violla
---

# Deploying to Staging

1. **Database Migrations (If applicable)**:
   - If there are any schema changes, manually run the SQL scripts in the **Staging** Supabase project's SQL Editor first.
2. **Commit Changes**:
   - Ensure all code changes are committed locally.
// turbo
3. **Push to Staging Branch**:
   - Run: `git push origin HEAD:staging` (or merge your branch into `staging` and push `staging`).
4. **Verify Deployment**:
   - Vercel will automatically build and deploy the `staging` branch.
   - The permanent staging URL is: https://violla-git-staging-mikis-projects-07c0ec41.vercel.app
5. **Await User Approval**:
   - Do NOT proceed to production until the user has explicitly tested and approved the changes on the staging environment.
