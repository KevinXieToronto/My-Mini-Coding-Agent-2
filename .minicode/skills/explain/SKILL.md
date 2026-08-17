---
name: explain
description: Explain how a file or feature works, top-down. Usage: /explain <path or question>
---
Explain the following to a developer new to this codebase: $ARGUMENTS

Method:
1. Read whatever files are relevant (search for them if needed).
2. Explain top-down: purpose first, then structure, then the interesting details.
3. Reference concrete code locations as path:line so I can jump there.
4. End with the two or three things most likely to surprise a newcomer.
