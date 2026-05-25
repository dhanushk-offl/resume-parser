# Contributing to Resume Parser

First off, thank you for considering contributing! 🎉

This project is a resume parsing agent skill, npm CLI tool, and MCP server. Contributions of all kinds are welcome: bug fixes, features, documentation improvements, test cases, and more.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Running Tests](#running-tests)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Feature Requests](#feature-requests)

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to make resume parsing better for everyone.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/resume-parser.git
   cd resume-parser
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Build** the project:
   ```bash
   npm run build
   ```

## Development Setup

### Prerequisites

- **Node.js** >= 18 (tested on 18, 20, 22)
- **npm** >= 9

### Key Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run all evaluation tests |
| `npm run lint` | Lint source files |
| `npm run dev` | Run index.ts directly with ts-node |
| `npm run mcp` | Start the MCP server locally |

### Verify Everything Works

```bash
# Build and test
npm run build && npm test

# Verify CLI
node bin/cli.js --help

# Quick parse test
node bin/cli.js parse "John Doe
john@example.com
(555) 123-4567
Software Engineer"
```

## Project Structure

```
resume-parser/
├── resume-parser-ats/         # Agent skill directory (npx skills add)
│   ├── SKILL.md               # Skill manifest & agent instructions
│   └── references/
│       └── algorithm.md       # Full 4-step algorithm spec
├── src/                       # TypeScript source code
│   ├── index.ts               # Main entry, exports, fullPipeline()
│   ├── tools/
│   │   ├── parse-resume.ts    # Step 1-4 parsing engine
│   │   ├── analyze-resume.ts # ATS scoring & analysis
│   │   └── suggest-improvements.ts  # Suggestion generator
│   └── prompts/
│       ├── parser-prompt.ts   # Parsing prompt templates
│       └── insights-prompt.ts # Insights prompt templates
├── bin/
│   └── cli.js                 # CLI entry point (npx resume-parser-ats)
├── mcp-server/
│   └── server.ts              # MCP server implementation
├── test/evals/                # Test suites
│   ├── parse-resume.test.mjs
│   ├── analyze-resume.test.mjs
│   └── suggest-improvements.test.mjs
├── AGENTS.md                  # Agent configuration (skills spec)
├── package.json
├── tsconfig.json
└── README.md
```

## Making Changes

### Branch Naming

Use descriptive branch names:

```
feature/add-bullet-point-parsing
fix/education-date-extraction
docs/mcp-setup-guide
test/strict-mode-edge-cases
```

### Code Changes

1. **Create a branch** from `master`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make your changes** — follow the existing code patterns

3. **Update tests** — add or modify tests in `test/evals/`

4. **Update documentation** — if you add a feature, update:
   - `SKILL.md` if it affects agent-facing instructions
   - `README.md` if it affects user-facing docs
   - `references/algorithm.md` if it changes the parsing algorithm

5. **Verify** — build and test:
   ```bash
   npm run build && npm test
   ```

### Important Files to Update

| If you change... | Also update |
|---|---|
| Parsing logic in `src/tools/parse-resume.ts` | `resume-parser-ats/references/algorithm.md` |
| Output format of any tool | `resume-parser-ats/SKILL.md` and `README.md` |
| CLI commands or flags | `bin/cli.js` help text and `README.md` |
| MCP tool definitions | `mcp-server/server.ts` and `README.md` |
| Scoring or grading | `resume-parser-ats/SKILL.md` scoring tables |

## Running Tests

```bash
# Run all 86 tests
npm test

# Run specific test suite
node --test test/evals/parse-resume.test.mjs
node --test test/evals/analyze-resume.test.mjs
node --test test/evals/suggest-improvements.test.mjs

# Run a single test with verbose output
node --test test/evals/parse-resume.test.mjs --test-name-pattern "Step 1"
```

Tests use Node.js built-in test runner (`node:test`) and assert module (`node:assert/strict`). No additional test framework needed.

### Writing New Tests

Add test cases in the appropriate file under `test/evals/`:

```javascript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseResume } from "../../dist/src/tools/parse-resume.js";

describe("My New Feature", () => {
  it("should handle the new case correctly", () => {
    const result = parseResume({ rawText: "..." });
    assert.equal(result.success, true);
    assert.equal(result.data.profile.name, "Expected Name");
  });
});
```

## Code Style

- **TypeScript** for all source code (`src/` and `mcp-server/`)
- **ES modules** with CommonJS compilation output
- **2-space indentation**
- Run `npm run lint` before committing — ESLint with TypeScript plugin

Key conventions:
- Use Zod for input validation schemas
- Always return `{ success: boolean, data: T, metadata: {...} }` format
- Include `warnings` array in metadata for non-fatal issues
- Feature scoring uses additive positive and negative scores

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bullet-point parsing for experience sections
fix: handle edge case in date extraction for seasonal dates
docs: add MCP setup guide for Claude Desktop
test: add strict mode edge cases for phone parsing
refactor: simplify section grouping logic
chore: update dependencies
```

Prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`, `ci:`

## Pull Requests

1. **Push** your branch to your fork:
   ```bash
   git push origin feature/your-feature
   ```

2. **Open a Pull Request** against the `master` branch

3. **Describe your changes** — what, why, and how to test

4. **Ensure CI passes** — all tests must pass across Node 18, 20, 22

5. **Respond to review feedback** promptly

### PR Checklist

- [ ] Code compiles (`npm run build` succeeds)
- [ ] All tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] New features have tests
- [ ] Documentation updated (SKILL.md, README.md, algorithm.md as needed)
- [ ] Commit messages follow conventional commits format

## Reporting Bugs

Open a [GitHub Issue](https://github.com/dhanushk-offl/resume-parser/issues/new) with:

1. **What you did** — exact command or input
2. **What happened** — actual output or error
3. **What you expected** — desired output
4. **Environment** — Node.js version, OS, how you're using it (CLI, library, MCP, skill)

## Feature Requests

Open a [GitHub Issue](https://github.com/dhanushk-offl/resume-parser/issues/new) with:

1. **Use case** — what problem does this solve?
2. **Proposed solution** — how should it work?
3. **Alternatives considered** — other approaches you thought of
4. **Which interface** — does this affect the skill, CLI, library, or MCP?

## Release Process

Maintainers only:

```bash
# Bump version
npm version patch   # or minor, major

# Push with tags
git push --follow-tags

# CI automatically publishes to npm and creates a GitHub release
```

---

Thank you for contributing! 💛