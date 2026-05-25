# AGENTS.md — Agent Configuration for Resume Parser Skill

## Skill Name
resume-parser

## Description
Deeply parses resume PDFs using the OpenResume 4-step algorithm, extracts structured information (Name, Email, Phone, Education, Work Experience, Skills, etc.), evaluates ATS compatibility, and provides actionable improvement suggestions.

## Capabilities

### Tools
| Tool | Description |
|------|-------------|
| `parse_resume` | Accepts a resume PDF file path or raw text, runs the 4-step parsing algorithm, and returns structured resume data. |
| `analyze_resume` | Parses the resume and additionally computes an ATS compatibility score with per-field extraction confidence ratings. |
| `suggest_improvements` | Parses the resume, identifies issues, and returns structured, prioritized suggestions for fixing formatting, content, and ATS readability. |

### When to Use This Skill
- When a user asks to parse, review, or analyze a resume
- When a user asks "is my resume ATS-friendly?"
- When a user asks for resume improvement suggestions
- When a user wants to compare what an ATS sees vs. what they intended
- When a user uploads or references a resume PDF

## Input Formats

### parse_resume
```json
{
  "input": {
    "filePath": "/path/to/resume.pdf",
    "rawText": "Optional: raw text if PDF not available"
  }
}
```

### analyze_resume
```json
{
  "input": {
    "filePath": "/path/to/resume.pdf",
    "rawText": "Optional: raw text if PDF not available",
    "strictness": "moderate" // "lenient" | "moderate" | "strict"
  }
}
```

### suggest_improvements
```json
{
  "input": {
    "filePath": "/path/to/resume.pdf",
    "rawText": "Optional: raw text if PDF not available",
    "focusAreas": ["ats", "content", "formatting", "structure"] // optional
  }
}
```

## Output Format

All tools return a structured JSON response:

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "parserVersion": "1.0.0",
    "stepsCompleted": [1, 2, 3, 4],
    "warnings": []
  }
}
```

## Dependencies
- Node.js >= 18
- pdfjs-dist (for PDF text extraction)
- zod (for schema validation)