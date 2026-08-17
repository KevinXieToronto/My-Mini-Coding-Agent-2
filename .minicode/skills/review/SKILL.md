---
name: review
description: Review a file or directory for bugs and design problems. Usage: /review <path>
---
Perform a thorough code review of: $ARGUMENTS

Method:
1. Read the target file(s) completely. If $ARGUMENTS is a directory, list it and
   read the most important files first.
2. Judge, in this order: correctness bugs, unhandled errors and edge cases,
   security problems, misleading names or comments, needless complexity.
3. Do NOT comment on formatting or style preferences.

Report format:
- One finding per bullet: `path:line — severity(high/med/low) — issue and why it matters`
- Then a short overall verdict (2-3 sentences).
- If the code is genuinely fine, say so — do not invent findings.
