---
name: git-cleanup
description: Clean up a branch before raising a PR. Use when tidying up work in progress.
---

When cleaning up a branch before a PR:

1. Check for and remove:
   - console.log / debug statements
   - Commented-out code
   - Unused imports or variables
   - Temporary files or test scripts not meant for production

2. Review commit history with `git log --oneline`:
   - If there are WIP, fixup, or unclear commits, offer to squash them
     into clean logical commits before pushing
   - Each commit should represent one coherent change

3. Rebase on main to avoid merge conflicts:
   `git fetch origin && git rebase origin/main`
   Flag any conflicts for the user to resolve manually.

4. Confirm the branch name follows naming conventions before pushing.

5. Run a final `git diff origin/main` summary so the user can
   see exactly what will go into the PR.
