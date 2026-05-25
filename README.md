<div align="center">

# 📄 Resume Parser

**Deep resume parsing • ATS compatibility scoring • Actionable improvement insights**

An agent skill, CLI tool, npm library, and MCP server that deeply parses resumes using the **OpenResume 4-step algorithm**, extracts structured information (Name, Email, Phone, Education, Work Experience, Skills, Projects), evaluates ATS compatibility, and provides prioritized, actionable suggestions.

Made with ❤️ by **Dhanush Kandhan**

[![npm version](https://img.shields.io/npm/v/resume-parser-ats.svg)](https://www.npmjs.com/package/resume-parser-ats)
[![CI](https://github.com/dhanushk-offl/resume-parser/actions/workflows/ci.yml/badge.svg)](https://github.com/dhanushk-offl/resume-parser/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

</div>

---

## ✨ Features

- **🔍 Deep Parsing** — Extracts 10+ fields from raw text or PDF using a feature-scoring engine
- **📊 ATS Scoring** — Grades your resume A+ through F with per-field confidence ratings
- **💡 Smart Suggestions** — Prioritized, categorized fixes (critical → low) with before/after examples
- **🤖 Agent Skill** — Install via `npx skills add` for pi, Claude Code, Codex, Gemini CLI, and more
- **🖥️ CLI** — Use directly from the command line
- **📡 MCP Server** — Plug into Claude Desktop, ChatGPT, and other MCP-compatible apps
- **📖 Library** — Import as an npm package for programmatic use
- **⚙️ Configurable** — Lenient, moderate, or strict ATS evaluation modes
- **🔒 Privacy-first** — Runs entirely locally, no external API calls

---

## 🚀 Quick Start

Choose how you want to use Resume Parser:

| Method | Install | Best for |
|--------|---------|----------|
| **Agent Skill** | `npx skills add dhanushk-offl/resume-parser` | AI agents (pi, Claude Code, Codex, Gemini CLI) |
| **CLI** | `npm install -g resume-parser-ats` | Quick one-off resume analysis |
| **Library** | `npm install resume-parser-ats` | Building apps, batch processing |
| **MCP Server** | `claude mcp add resume-parser -- npx -y resume-parser-ats --mcp` | Claude Code, Codex, Claude Desktop, Cursor |

---

## 🤖 1. Agent Skill

Install as an agent skill for automatic activation in AI coding assistants:

```bash
npx skills add dhanushk-offl/resume-parser
```

Once installed, the skill activates automatically when you:

- Ask to parse, review, or analyze a resume
- Ask "is my resume ATS-friendly?"
- Ask for resume improvement suggestions
- Upload or reference a resume PDF

**Works with:** pi, Claude Code, OpenAI Codex, Gemini CLI, Cursor, Continue, and all [Agent Skills](https://agentskills.io) compatible tools.

### What the Agent Gets

| Tool | Description |
|------|-------------|
| `parse_resume` | Parse a resume PDF/text → structured data |
| `analyze_resume` | Parse + compute ATS compatibility score with per-field confidence |
| `suggest_improvements` | Parse + analyze + generate prioritized improvement suggestions |

### Example Agent Prompts

```
"Is my resume ATS-friendly? Here's the PDF path: ./my-resume.pdf"
"Parse this resume and extract the contact info"
"Analyze my resume for ATS compatibility with strict grading"
"What can I improve on my resume to get past ATS filters?"
```

---

## 🖥️ 2. CLI

Install globally for command-line use:

```bash
npm install -g resume-parser-ats
```

```bash
# Parse a resume and output structured data
resume-parser-ats parse resume.pdf

# Parse + analyze ATS compatibility
resume-parser-ats analyze resume.pdf

# Full pipeline: parse + analyze + suggestions
resume-parser-ats insights resume.pdf

# Parse from raw text
resume-parser-ats parse "John Doe\njohn@email.com\nSoftware Engineer"

# Adjust ATS strictness
resume-parser-ats analyze resume.pdf --strictness strict

# Focus on specific areas
resume-parser-ats insights resume.pdf --focus ats,formatting

# Output as JSON
resume-parser-ats insights resume.pdf --json
```

Or use without installing:

```bash
npx resume-parser-ats parse resume.pdf
```

---

## 📖 3. Library (npm Package)

Install as a dependency for programmatic use:

```bash
npm install resume-parser-ats
```

```typescript
import { parseResume, analyzeResume, suggestImprovements } from "resume-parser-ats";

// Parse — extract structured data
const parsed = parseResume({ filePath: "./resume.pdf" });
// or: parseResume({ rawText: "John Doe\njohn@email.com\n..." })

console.log(parsed.data.profile.name);    // "Jane Doe"
console.log(parsed.data.profile.email);   // "jane@example.com"
console.log(parsed.data.education[0]?.school);  // "MIT"

// Analyze — ATS compatibility scoring
const analysis = analyzeResume({
  filePath: "./resume.pdf",
  parsedResume: parsed.data,
  strictness: "strict",
});

console.log(analysis.data.atsScore);  // 72
console.log(analysis.data.atsGrade);  // "B-"
console.log(analysis.data.fieldAnalyses);
console.log(analysis.data.formatIssues);

// Suggest — prioritized improvement recommendations
const suggestions = suggestImprovements({
  filePath: "./resume.pdf",
  parsedResume: parsed.data,
  analysisResult: analysis.data,
  focusAreas: ["ats", "content", "formatting"],
});

console.log(suggestions.data.quickWins);
console.log(suggestions.data.suggestions);
```

### Full Pipeline

```typescript
import { fullPipeline } from "resume-parser-ats";

const { parsed, analyzed, suggestions } = fullPipeline({
  filePath: "./resume.pdf",
  strictness: "moderate",
});

console.log(`ATS Score: ${analyzed.data.atsScore}/100 (${analyzed.data.atsGrade})`);
```

### TypeScript Types

All types are exported:

```typescript
import type {
  ParseResumeInput,
  ParseResumeOutput,
  AnalyzeResumeInput,
  AnalyzeResumeOutput,
  SuggestImprovementsInput,
  SuggestImprovementsOutput,
  ParsedResume,
  TextItem,
  LineItem,
  SectionItem,
} from "resume-parser-ats";
```

---

## 📡 4. MCP Server

Use Resume Parser as a Model Context Protocol (MCP) server to give AI assistants direct access to the parsing tools.

### Quick Install

**One command to add to each app:**

```bash
# Claude Code
claude mcp add resume-parser -- npx -y resume-parser-ats --mcp

# OpenAI Codex
codex mcp add resume-parser -- npx -y resume-parser-ats --mcp
```

That's it. Restart the app and the tools are available.

---

### Claude Code (CLI)

```bash
claude mcp add resume-parser -- npx -y resume-parser-ats --mcp
```

Add to a specific scope:

```bash
# User scope (available in all projects)
claude mcp add --scope user resume-parser -- npx -y resume-parser-ats --mcp

# Project scope (available in current project only)
claude mcp add --scope project resume-parser -- npx -y resume-parser-ats --mcp
```

Remove with:

```bash
claude mcp remove resume-parser
```

### OpenAI Codex (CLI)

```bash
codex mcp add resume-parser -- npx -y resume-parser-ats --mcp
```

Remove with:

```bash
codex mcp remove resume-parser
```

### Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "resume-parser": {
      "command": "npx",
      "args": ["-y", "resume-parser-ats", "--mcp"]
    }
  }
}
```

Restart Claude Desktop. You can now ask Claude to parse and analyze resumes:

```
"Can you analyze my resume for ATS compatibility? The file is at ~/Documents/my-resume.pdf"
```

### Cursor

Add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "resume-parser": {
      "command": "npx",
      "args": ["-y", "resume-parser-ats", "--mcp"]
    }
  }
}
```

### Other MCP-Compatible Apps

The server uses stdio transport. For any MCP-compatible application, configure:

```json
{
  "mcpServers": {
    "resume-parser": {
      "command": "npx",
      "args": ["-y", "resume-parser-ats", "--mcp"]
    }
  }
}
```

If you have `resume-parser-ats` installed globally:

```json
{
  "mcpServers": {
    "resume-parser": {
      "command": "resume-parser-ats",
      "args": ["--mcp"]
    }
  }
}
```

### MCP Tools Available

| Tool | Description | Parameters |
|------|-------------|------------|
| `parse_resume` | Parse resume PDF/text → structured data | `filePath`, `rawText` |
| `analyze_resume` | Parse + ATS scoring | `filePath`, `rawText`, `strictness` |
| `suggest_improvements` | Parse + analyze + suggestions | `filePath`, `rawText`, `focusAreas` |

---

## 🧠 How It Works: The 4-Step Algorithm

The parser implements the **OpenResume algorithm**, the same methodology used by real ATS systems:

### Step 1 — Read Text Items from PDF

Extract every text item with position, bold, and newline metadata:

```typescript
{ text: "John Doe", x1: 72, x2: 144, y: 720, bold: true, newLine: true }
```

### Step 2 — Group Text Items into Lines

Merge adjacent items when their horizontal gap is less than average character width. Group by Y-coordinate to reconstruct the natural reading order.

### Step 3 — Group Lines into Sections

Detect section titles using two heuristics:
1. **Primary**: Only text item in line + bold + ALL UPPERCASE
2. **Fallback**: Keyword match (EDUCATION, EXPERIENCE, SKILLS, etc.)

### Step 4 — Extract Attributes via Feature Scoring

Each attribute has feature sets with scoring functions. The text item with the **highest total score** wins:

| Attribute | Core Pattern | Example |
|-----------|-------------|---------|
| Name | Only letters/spaces/periods | `John Doe` |
| Email | Email format | `john@email.com` |
| Phone | `(xxx) xxx-xxxx` | `(555) 123-4567` |
| Location | `City, ST` | `New York, NY` |
| School | Contains "University" etc. | `MIT` |
| Degree | Contains "B.S.", "M.A." etc. | `B.S. Computer Science` |

**Name scoring example**: Only letters (+3), bolded (+2), uppercase (+2), has @ (-4), has digit (-4)

See [`resume-parser-ats/references/algorithm.md`](resume-parser-ats/references/algorithm.md) for the full specification.

---

## 📊 ATS Compatibility Scoring

| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Name extraction | 20 pts | Can the parser identify a full name? |
| Email extraction | 20 pts | Is there a valid email address? |
| Phone extraction | 10 pts | Is there a parseable phone number? |
| Section detection | 15 pts | Are sections properly structured? |
| Education parsing | 10 pts | Are school, degree, and date parsed? |
| Experience parsing | 15 pts | Are company, title, and date parsed? |
| Skills parsing | 10 pts | Are skills extracted correctly? |

### Grading Scale

| Grade | Score | Meaning |
|-------|-------|---------|
| A+ | 90-100 | Excellent — ATS will parse everything correctly |
| A | 85-89 | Great — minor issues only |
| B+ | 80-84 | Good — most fields parse correctly |
| B | 75-79 | Adequate — some sections need improvement |
| B- | 70-74 | Below average — multiple parsing issues |
| C+ | 65-69 | Needs work — significant ATS problems |
| C | 60-64 | Poor — many fields fail to parse |
| D | 50-59 | Bad — critical fields missing |
| F | 0-49 | Failing — unrecognizable as a resume |

### Issue Severity Levels

- 🔴 **CRITICAL** — Name or email cannot be parsed (ATS will discard)
- 🟠 **HIGH** — Sections missing, dates unparseable, phone not found
- 🟡 **MEDIUM** — Skills not clean, formatting merge issues
- 🟢 **LOW** — Minor inconsistencies, optional fields missing

---

## 📊 Use Cases

### 🎯 Job Seeker — ATS Optimization

Before applying, see what an ATS actually extracts:

```bash
resume-parser-ats insights my-resume.pdf --strictness strict --json
```

### 🏢 Recruiter — Bulk Resume Screening

```typescript
import { parseResume, analyzeResume } from "resume-parser-ats";
import fs from "fs";

const files = fs.readdirSync("resumes/");
for (const file of files) {
  const parsed = parseResume({ filePath: `resumes/${file}` });
  const analysis = analyzeResume({ parsedResume: parsed.data, strictness: "moderate" });
  console.log(`${file}: ${analysis.data.atsScore}/100 (${analysis.data.atsGrade})`);
}
```

### 📈 Career Platform — Resume Health Dashboard

Parse on upload → store ATS score → visualize → suggest improvements → track progress.

### 🎓 University Career Center — Student Reviews

Batch-parse resumes, flag common issues, generate improvement templates.

---

## 🏗️ Architecture

```
resume-parser/
├── resume-parser-ats/           # Agent skill (npx skills add)
│   ├── SKILL.md                # Skill manifest & instructions
│   └── references/
│       └── algorithm.md        # Full algorithm specification
├── src/                        # TypeScript source
│   ├── index.ts                # Exports + fullPipeline()
│   ├── tools/
│   │   ├── parse-resume.ts    # Step 1-4 parsing engine
│   │   ├── analyze-resume.ts  # ATS scoring & analysis
│   │   └── suggest-improvements.ts  # Suggestion generator
│   └── prompts/
│       ├── parser-prompt.ts    # Parsing prompt templates
│       └── insights-prompt.ts  # Insights prompt templates
├── bin/
│   └── cli.js                 # CLI entry point
├── mcp-server/
│   └── server.ts              # MCP server implementation
├── test/evals/                # Test suites (86 tests)
├── AGENTS.md                  # Agent configuration
├── CONTRIBUTING.md            # Contributing guide
├── package.json
└── tsconfig.json
```

---

## 🧪 Testing

```bash
# Run all 86 tests
npm test

# Run a specific suite
node --test test/evals/parse-resume.test.mjs
node --test test/evals/analyze-resume.test.mjs
node --test test/evals/suggest-improvements.test.mjs

# Filter by test name
node --test test/evals/parse-resume.test.mjs --test-name-pattern "Step 1"
```

---

## ☁️ CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **Build & Test** | Push/PR to `master` | Lint, build, and test across Node 18, 20, 22 |
| **Publish to npm** | Tag push `v*` | Builds and publishes to npmjs with provenance |

To publish a new version:

```bash
npm version patch   # or minor, major
git push --follow-tags
```

---

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup
- Project structure guide
- Code style and testing conventions
- Commit message format
- Pull request checklist

---

## 📄 License

MIT License — Copyright (c) 2026 **Dhanush Kandhan**. See [LICENSE](./LICENSE) for details.

---

<div align="center">

Made with ❤️ by **Dhanush Kandhan**

If this project helped you, consider giving it a ⭐ on [GitHub](https://github.com/dhanushk-offl/resume-parser)!

</div>