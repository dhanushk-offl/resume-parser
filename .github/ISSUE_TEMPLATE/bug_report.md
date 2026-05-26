---
name: Bug Report
about: Report a bug or unexpected behavior
title: "[BUG] "
labels: bug
assignees: ''
---

## 🐛 Bug Description

A clear and concise description of what the bug is.

## 📋 Steps to Reproduce

1. Run `resume-parser-ats ...`
2. With input: `...`
3. See error

## ✅ Expected Behavior

What you expected to happen.

## ❌ Actual Behavior

What actually happened (include error output, unexpected data, etc.).

## 📎 Input / Sample

Paste the exact command, file, or raw text you used:

```bash
resume-parser-ats parse "Your raw text here..."
# or
resume-parser-ats analyze /path/to/resume.pdf
```

If using the library or MCP, include the code/config:

```typescript
// Library usage
import { parseResume } from "resume-parser-ats";
const result = parseResume({ filePath: "./resume.pdf" });
```

## 🖥️ Environment

- **Node.js version**: 
- **OS**: 
- **resume-parser-ats version**: 
- **Usage mode**: [ ] CLI [ ] Library [ ] MCP Server [ ] Agent Skill

## 📸 Additional Context

Add any other context, logs, or screenshots here.