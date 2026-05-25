# 📄 Resume Parser — Agent Skill

<p align="center">
  <strong>Deep resume parsing • ATS compatibility scoring • Actionable improvement insights</strong>
</p>

<p align="center">
  Made with ❤️ by <strong>Dhanush Kandhan</strong>
</p>

---

An **agent skill** that deeply parses resumes using the **OpenResume 4-step algorithm**, extracts structured information (Name, Email, Phone, Education, Work Experience, Skills, Projects), evaluates ATS (Applicant Tracking System) compatibility, and provides prioritized, actionable suggestions to improve your resume.

## ✨ Features

- **🔍 Deep Parsing** — Extracts 10+ fields from raw text or PDF using a feature-scoring engine
- **📊 ATS Scoring** — Grades your resume A+ through F with detailed per-field confidence ratings
- **💡 Smart Suggestions** — Prioritized, categorized fixes (critical → low) with before/after examples
- **🤖 Agent Skill** — Install via `npx skills add` and use directly in your agent
- **🛠️ CLI & MCP Server** — Use interactively from the command line or as an MCP tool
- **⚙️ Configurable Strictness** — Lenient, moderate, or strict ATS evaluation modes
- **🔒 Zero Dependencies on Proprietary APIs** — Runs entirely locally with no external calls

## 📦 Installation

### As an Agent Skill (recommended)

```bash
npx skills add dhanushk-offl/resume-parser-skill
```

After installing, the skill is automatically available to your agent. When the agent encounters a resume-related task, it will load the skill and use it.

### Manual Setup

```bash
# Clone the repo
git clone https://github.com/dhanushk-offl/resume-parser-skill.git
cd resume-parser-skill

# Install dependencies
npm install

# Build
npm run build
```

## 🚀 Usage

### As an Agent Skill

Once installed via `npx skills add`, the agent will automatically use this skill when you:

- Ask to parse, review, or analyze a resume
- Ask "is my resume ATS-friendly?"
- Ask for resume improvement suggestions
- Upload or reference a resume PDF

The agent can invoke three tools:

| Tool | Description |
|------|-------------|
| `parse_resume` | Parse a resume PDF or raw text → structured data |
| `analyze_resume` | Parse + compute ATS compatibility score with per-field confidence |
| `suggest_improvements` | Parse + analyze + generate prioritized improvement suggestions |

### From the CLI (after manual setup)

```bash
# Parse a resume and output structured data
node resume-parser-ats/scripts/parse.mjs resume.pdf

# Parse + analyze ATS compatibility
node resume-parser-ats/scripts/analyze.mjs resume.pdf

# Full pipeline: parse + analyze + actionable suggestions
node resume-parser-ats/scripts/insights.mjs resume.pdf --strictness strict --focus ats,formatting
```

### As a Library

```typescript
import { parseResume, analyzeResume, suggestImprovements } from "resume-parser-ats";

// Step 1: Parse
const parsed = parseResume({ rawText: "..." });
console.log(parsed.data.profile.name);     // "Jane Doe"
console.log(parsed.data.profile.email);    // "jane@example.com"
console.log(parsed.data.education[0]?.school);  // "MIT"

// Step 2: Analyze ATS compatibility
const analysis = analyzeResume({
  rawText: "...",
  parsedResume: parsed.data,
  strictness: "moderate",
});
console.log(analysis.data.atsScore);  // 72
console.log(analysis.data.atsGrade);  // "B-"

// Step 3: Get improvement suggestions
const suggestions = suggestImprovements({
  rawText: "...",
  parsedResume: parsed.data,
  analysisResult: analysis.data,
  focusAreas: ["ats", "content", "formatting", "structure"],
});
console.log(suggestions.data.quickWins);           // ["Fix your name format...", ...]
console.log(suggestions.data.suggestions[0].title); // "Name is not parseable by ATS"
```

### As an MCP Server

```bash
npm run mcp
```

Starts a Model Context Protocol server exposing three tools:

| Tool | Description |
|------|-------------|
| `parse_resume` | Parse a resume PDF or raw text and return structured data |
| `analyze_resume` | Parse + compute ATS compatibility score with per-field confidence |
| `suggest_improvements` | Parse + analyze + generate prioritized improvement suggestions |

## 🧠 How It Works: The 4-Step Algorithm

The parser follows the **OpenResume algorithm**, a proven methodology used by real ATS systems:

### Step 1 — Read Text Items

Extracts all text items from the resume, including:
- Text content
- X/Y positions (relative to bottom-left origin)
- Bold metadata
- Newline markers

### Step 2 — Group Into Lines

Merges adjacent text items on the same Y-coordinate when their horizontal distance is less than the average character width. Groups by Y-coordinate to reconstruct the line-by-line reading order.

### Step 3 — Group Into Sections

Detects section titles using two heuristics:
1. **Primary**: Only text item in line + bold + ALL UPPERCASE
2. **Fallback**: Keyword match against known headers (EDUCATION, EXPERIENCE, SKILLS, etc.)

### Step 4 — Extract Attributes via Feature Scoring

Each attribute (Name, Email, Phone, etc.) has **feature sets** — matching functions with positive/negative scores. The text item with the highest total score wins. This is how real ATS systems rank candidates:

| Feature (Name) | Score | Feature (Email) | Score |
|---|---|---|---|
| Contains only letters/spaces/periods | +3 | Matches email regex | +4 |
| Is bolded | +2 | Contains @ symbol | +4 |
| Is ALL UPPERCASE | +2 | Looks like a name (no @) | -1 |
| Contains @ (probably email) | -4 | Contains digits (no @) | -2 |
| Contains numbers (probably phone) | -4 | — | — |

## 📊 Use Cases

### 1. 🎯 Job Seeker — ATS Optimization

> *Before applying to jobs, run your resume through the parser to see what an ATS actually extracts.*

```bash
node resume-parser-ats/scripts/insights.mjs my-resume.pdf --strictness strict
```

Identify critical issues like a missing email, unparseable name, or sections an ATS can't detect — and fix them *before* you apply.

### 2. 🏢 Recruiter — Bulk Resume Screening

> *Programmatically parse and score hundreds of resumes to rank candidates by ATS readability.*

```typescript
import { parseResume, analyzeResume } from "resume-parser-ats";
import fs from "fs";

const files = fs.readdirSync("resumes/");
for (const file of files) {
  const parsed = parseResume({ filePath: `resumes/${file}` });
  const analysis = analyzeResume({
    filePath: `resumes/${file}`,
    parsedResume: parsed.data,
    strictness: "moderate",
  });
  console.log(`${file}: ATS Score ${analysis.data.atsScore}/100 (${analysis.data.atsGrade})`);
}
```

### 3. 🤖 Agent Integration — AI-Powered Resume Coach

> *Embed the skill into an AI agent that reviews resumes and gives personalized coaching.*

```typescript
import { fullPipeline } from "resume-parser-ats";

const result = fullPipeline({ rawText: resumeText, strictness: "strict" });

// Feed to an LLM for natural-language coaching
const prompt = `You are a resume coach. Here is the analysis:
${JSON.stringify(result.analyzed.data)}
Suggest improvements in a friendly, encouraging tone.`;
```

### 4. 📈 Career Platform — Resume Health Dashboard

> *Show users a "resume health score" on your career platform dashboard.*

- Parse on upload → store `atsScore`, `atsGrade`, and `fieldAnalyses`
- Display a visual dashboard with color-coded field ratings
- Surface `quickWins` as a checklist
- Track score improvements over time as users update their resumes

### 5. 🎓 University Career Center — Student Resume Reviews

> *Automate initial resume screening for career centers at scale.*

- Batch-parse student resumes and generate summary reports
- Flag common issues (missing dates, non-standard section headers)
- Provide standardized improvement templates

## 🏗️ Architecture

```
resume-parser-skill/
├── resume-parser-ats/           # Agent skill directory
│   ├── SKILL.md                # Skill manifest & instructions
│   ├── scripts/                # Executable scripts for agent use
│   │   ├── parse.mjs           # Parse a resume → JSON
│   │   ├── analyze.mjs         # Parse + ATS scoring → JSON
│   │   └── insights.mjs        # Full pipeline → JSON
│   └── references/             # Detailed docs loaded on-demand
│       └── algorithm.md        # Full algorithm specification
├── src/                        # TypeScript source
│   ├── index.ts                # Main entry point + fullPipeline()
│   ├── tools/
│   │   ├── parse-resume.ts
│   │   ├── analyze-resume.ts
│   │   └── suggest-improvements.ts
│   └── prompts/
│       ├── parser-prompt.ts
│       └── insights-prompt.ts
├── bin/
│   └── cli.js                  # CLI entry point
├── mcp-server/
│   └── server.ts               # MCP server implementation
├── test/
│   └── evals/                  # Evaluation test suites
├── AGENTS.md                   # Agent configuration
├── package.json
└── README.md
```

## 🧪 Testing

```bash
# Run all tests
npm test
```

86 tests covering parsing, analysis, and suggestion generation across all strictness levels.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ☁️ CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| **Build & Test** | Push/PR to `master` | Lint, build, and test across Node 18/20/22 |
| **Publish to npm** | Tag push `v*` | Builds and publishes to npmjs with provenance |

## 📄 License

MIT License — Copyright (c) 2025 **Dhanush Kandhan**. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <strong>Dhanush Kandhan</strong><br>
  <em>If this project helped you, consider giving it a ⭐ on GitHub!</em>
</p>