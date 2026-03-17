---
name: git-review
description: Review code changes before committing or raising a PR. Use when asked to review a diff or check changes.
---

When reviewing changes before a commit or PR:

1. Check for leftover debug artifacts:
   - console.log / print statements
   - TODO comments that should be resolved
   - Commented-out code blocks

2. Check for security issues:
   - No API keys, tokens, or secrets in the diff
   - No .env files staged
   - No hardcoded credentials or URLs that should be environment variables

3. For full stack changes, verify both sides:
   - Frontend: error states, loading states, accessibility basics
   - Backend: input validation, error handling, proper HTTP status codes

4. Check test coverage:
   - New functions or endpoints should have corresponding tests
   - Existing tests should still pass

5. Flag anything that looks incomplete or that a reviewer would question.
   Summarize findings before proceeding.
