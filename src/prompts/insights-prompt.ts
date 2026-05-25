/**
 * Insights prompt templates for generating human-readable
 * resume analysis reports and improvement summaries.
 */

// ---------------------------------------------------------------------------
// Report template — structured output format
// ---------------------------------------------------------------------------

export const REPORT_TEMPLATE = `## 📊 Resume Parsing Report

### ATS Compatibility Score: {{atsScore}}/100 (Grade: {{atsGrade}})

---

### ✅ Successfully Parsed Fields

| Field       | Parsed Value                  | Confidence |
|-------------|-------------------------------|------------|
{{#each fieldAnalyses}}
| {{field}}   | {{value}}                     | {{confidence}} |
{{/each}}

---

### ⚠️ Issues Found

| #  | Severity   | Field         | Issue                              | Suggestion                         |
|----|-----------|---------------|------------------------------------|------------------------------------|
{{#each formatIssues}}
| {{@index}} | {{severity}} | {{affectedFields}} | {{description}} | {{suggestion}} |
{{/each}}

---

### 📝 Priority Fixes

{{#each priorityFixes}}
{{@index}}. **{{title}}**: {{description}}
   - Before: \`{{currentValue}}\`
   - After: \`{{suggestedValue}}\`
{{/each}}

---

### 💡 Structural Suggestions

{{#each structuralSuggestions}}
- {{this}}
{{/each}}

---

### 📋 Section-by-Section Analysis

{{#each sectionAnalyses}}
#### {{section}}
- **Present**: {{present}}
- **Issues**: {{issues}}
- **Recommendations**: {{recommendations}}
{{/each}}
`;

// ---------------------------------------------------------------------------
// Quick summary template
// ---------------------------------------------------------------------------

export const QUICK_SUMMARY_TEMPLATE = `
🎯 **Quick Summary**

- **ATS Score**: {{atsScore}}/100 ({{atsGrade}})
- **Critical Issues**: {{criticalFixes}}
- **Total Suggestions**: {{totalSuggestions}}

**Top 3 Quick Wins:**
{{#each quickWins}}
{{@index}}. {{this}}
{{/each}}

**Long-term Improvements:**
{{#each longTermAdvice}}
- {{this}}
{{/each}}
`;

// ---------------------------------------------------------------------------
// Detailed section analysis templates
// ---------------------------------------------------------------------------

export const SECTION_ANALYSIS_TEMPLATES = {
  profile: `#### Profile Section Analysis
The profile section is the first thing an ATS reads. It contains the most critical fields:
- **Name**: Must be bolded, on the first line, letters only
- **Email**: Must follow xxx@xxx.xxx format, ideally on its own line
- **Phone**: Use standard format (123) 456-7890 or 123-456-7890
- **Location**: Use "City, ST" format for best ATS matching
`,

  education: `#### Education Section Analysis
Education sections should be structured with:
- School name (bolded, with keywords like University, College)
- Degree and field (include degree keywords like Bachelor, Master)
- GPA in x.xx format
- Date with year (e.g., "Expected Graduation: June 2026")

Ensure subsections are separated by consistent spacing or bold headers.
`,

  experience: `#### Work Experience Section Analysis
Each experience entry should have:
- Company name (bolded, with location)
- Job title (include job title keywords)
- Date range on same line as company (e.g., "June 2022–Present")
- 3-5 bullet points with action verbs and quantified results

Avoid multi-column layouts that interleave company/title/date.
`,

  skills: `#### Skills Section Analysis
A skills section should:
- Be titled "SKILLS" in bold uppercase
- Categorize skills (Technical, Languages, Soft Skills)
- Use comma-separated lists within categories
- Include keywords from target job descriptions
`,
};

// ---------------------------------------------------------------------------
// Export all templates
// ---------------------------------------------------------------------------

export default {
  REPORT_TEMPLATE,
  QUICK_SUMMARY_TEMPLATE,
  SECTION_ANALYSIS_TEMPLATES,
};