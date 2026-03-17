---
name: git-branch
description: Create or name git branches. Use when starting new work or creating a branch.
---

When creating a branch:

1. Always branch off the latest main/master — run `git pull origin main` first
2. Use this naming format: `type/short-description`
   - feat/user-authentication
   - fix/login-redirect-bug
   - chore/update-dependencies
   - docs/api-readme

3. Use lowercase and hyphens only — no spaces, no camelCase
4. Keep it short but descriptive — 3 to 5 words max after the prefix
5. If tied to a GitHub issue, optionally include the number:
   `feat/42-user-authentication`
6. Never commit directly to main or master
