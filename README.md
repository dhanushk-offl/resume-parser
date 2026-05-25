# Resume Parser Agent Skill

A powerful agent skill that deeply parses resumes, extracts structured information, and provides actionable insights to improve ATS (Application Tracking System) compatibility and overall resume quality.

## Overview

This skill follows the **OpenResume parsing algorithm** — a proven 4-step methodology:

1. **Extract text items** from a PDF file (positions, boldness, line breaks)
2. **Group text items into lines** (merge adjacent items, reconstruct line-by-line reading)
3. **Group lines into sections** (detect section titles via bold+UPPERCASE heuristics)
4. **Extract resume attributes from sections** (feature scoring system for Name, Email, Phone, etc.)

Beyond parsing, this skill provides:

- **Deep structural analysis** — how well the resume is organized
- **ATS compatibility scoring** — how likely an ATS will correctly parse key fields
- **Actionable suggestions** — specific fixes for formatting, content, and structure issues
- **Side-by-side comparison** — parsed output vs. expected output to surface gaps

## Installation

```bash
npm install
```

## Usage as an Agent Skill

Point your agent (e.g., pi) to this skill directory:

```bash
pi --skill /path/to/resume-parser
```

The agent will automatically load `SKILL.md` and use the parsing/insight tools defined in `src/tools/`.

## Usage as a CLI Tool

```bash
# Parse a resume PDF
npx resume-parser parse resume.pdf

# Parse and get improvement suggestions
npx resume-parser analyze resume.pdf

# Full report with insights
npx resume-parser insights resume.pdf
```

## Usage as an MCP Server

```bash
npm run mcp
```

This starts a Model Context Protocol server exposing the following tools:

- `parse_resume` — Parse a resume PDF and return structured data
- `analyze_resume` — Parse + score ATS compatibility
- `suggest_improvements` — Generate actionable fix suggestions

## Architecture

```
resume-parser/
├── package.json          # Project metadata & scripts
├── README.md             # This file
├── AGENTS.md             # Agent-facing configuration
├── SKILL.md              # Skill definition for agent consumption
├── src/
│   ├── index.ts          # Main entry point
│   ├── tools/
│   │   ├── parse-resume.ts        # Step 1-4 parsing engine
│   │   ├── analyze-resume.ts       # ATS scoring & analysis
│   │   └── suggest-improvements.ts # Fix suggestions generator
│   └── prompts/
│       ├── parser-prompt.ts        # Prompt templates for parsing
│       └── insights-prompt.ts      # Prompt templates for insights
├── mcp-server/
│   └── server.ts         # MCP server implementation
└── bin/
    └── cli.js            # CLI entry point
```

## Parsing Algorithm

### Step 1: Read Text Items from PDF

Uses `pdfjs-dist` to extract all text items including:
- Text content
- X/Y positions (relative to bottom-left origin)
- Bold metadata
- New line markers

### Step 2: Group Text Items into Lines

- **Merges adjacent items** whose distance < average character width
- **Groups by Y-coordinate** to form lines
- Produces a line-by-line reconstruction of the resume

### Step 3: Group Lines into Sections

- Detects section titles using heuristics:
  1. Only text item in the line
  2. Bolded
  3. All UPPERCASE
- Fallback: keyword matching against known section titles
- Groups lines under their closest preceding section title

### Step 4: Extract Resume Attributes

Uses a **feature scoring system**:
- Each attribute (Name, Email, Phone, etc.) has custom feature sets
- Feature sets contain a matching function + score (positive/negative)
- Text item with highest total score is identified as the attribute value
- Sections with multiple entries (Education, Work Experience) are split into subsections

## License

MIT