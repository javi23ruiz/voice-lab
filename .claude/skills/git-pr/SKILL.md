---
name: git-pr
description: Create pull requests. Use when preparing or writing a PR for GitHub.
---

When creating a pull request:

1. Use this title format: `type: short description (#issue-number)`
   e.g. `feat: add user authentication (#42)`

2. Write the PR description using this structure:
   ## What changed
   Brief explanation of what was implemented or fixed.

   ## Why
   The problem this solves or the GitHub issue it closes.
   Use "Closes #123" to auto-close the linked issue.

   ## How to test
   Step-by-step instructions to verify the change works.
   Include both frontend and backend aspects if both are affected.

   ## Notes
   Any gotchas, follow-up tasks, or things reviewers should pay attention to.

3. Never write vague titles like "various fixes" or "updates"
4. Never leave the "How to test" section empty
5. Link the related GitHub issue using "Closes #N" or "Related to #N"
