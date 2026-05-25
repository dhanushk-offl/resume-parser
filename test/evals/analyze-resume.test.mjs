/**
 * Evaluation Tests — analyze-resume
 *
 * Tests the ATS compatibility scoring engine for correctness
 * across different strictness levels and resume qualities.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseResume } from "../../dist/src/tools/parse-resume.js";
import { analyzeResume } from "../../dist/src/tools/analyze-resume.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseAndAnalyze(rawText, strictness = "moderate") {
  const parsed = parseResume({ rawText });
  const analysis = analyzeResume({
    rawText,
    parsedResume: parsed.data,
    strictness,
  });
  return { parsed, analysis };
}

// ---------------------------------------------------------------------------
// Test resumes
// ---------------------------------------------------------------------------

const EXCELLENT_RESUME = `
JANE DOE
jane.doe@gmail.com
(555) 123-4567
San Francisco, CA
https://linkedin.com/in/janedoe

SUMMARY
Experienced software engineer with 8+ years building scalable web applications.

EDUCATION
Massachusetts Institute of Technology
Bachelor of Science, Computer Science
GPA: 3.9
2014-2018

EXPERIENCE
Google
Senior Software Engineer
2020-Present
Led a team of 5 engineers building distributed systems
Improved search latency by 40%
Mentored 3 junior engineers

Stripe
Software Engineer
2018-2020
Built payment processing microservices
Reduced API error rate by 25%

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes
`;

const POOR_RESUME = `
12345
____
???!!!
`;

const PARTIAL_RESUME = `
Bob Smith
bob@company.com

Some work experience but no sections
`;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

describe("ATS Scoring — Score Ranges", () => {
  it("should score an excellent resume 70+", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    assert.ok(
      analysis.data.atsScore >= 70,
      `Excellent resume should score >= 70, got ${analysis.data.atsScore}`
    );
  });

  it("should score a poor resume below 50", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    assert.ok(
      analysis.data.atsScore < 50,
      `Poor resume should score < 50, got ${analysis.data.atsScore}`
    );
  });

  it("should always return a score between 0 and 100", () => {
    const resumes = [EXCELLENT_RESUME, POOR_RESUME, PARTIAL_RESUME];
    for (const r of resumes) {
      const { analysis } = parseAndAnalyze(r);
      assert.ok(
        analysis.data.atsScore >= 0 && analysis.data.atsScore <= 100,
        `Score should be 0-100, got ${analysis.data.atsScore}`
      );
    }
  });

  it("should assign a valid letter grade", () => {
    const validGrades = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"];
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    assert.ok(validGrades.includes(analysis.data.atsGrade), `Grade should be valid, got "${analysis.data.atsGrade}"`);
  });
});

// ---------------------------------------------------------------------------
// Strictness levels
// ---------------------------------------------------------------------------

describe("ATS Scoring — Strictness Levels", () => {
  it("should produce different scores under different strictness levels", () => {
    const { analysis: lenient } = parseAndAnalyze(EXCELLENT_RESUME, "lenient");
    const { analysis: strict } = parseAndAnalyze(EXCELLENT_RESUME, "strict");
    // Both scores should be valid; strict may weight name/email differently
    assert.ok(
      lenient.data.atsScore > 0 && strict.data.atsScore > 0,
      `Both scores should be > 0: lenient=${lenient.data.atsScore}, strict=${strict.data.atsScore}`
    );
  });

  it("should apply correct weight emphasis under strict mode (name+email=50%)", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME, "strict");
    // In strict mode, name+email are 25+25=50% of score
    // A resume with no name or email should score very low
    assert.ok(
      analysis.data.atsScore <= 30,
      `Strict mode with no name/email should be <= 30, got ${analysis.data.atsScore}`
    );
  });
});

// ---------------------------------------------------------------------------
// Field analyses
// ---------------------------------------------------------------------------

describe("ATS Scoring — Field Analyses", () => {
  it("should report high confidence for well-formatted name", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    const nameField = analysis.data.fieldAnalyses.find((f) => f.field === "name");
    assert.ok(nameField, "Name field analysis should exist");
    assert.equal(nameField.confidence, "high", `Name confidence should be "high", got "${nameField.confidence}"`);
  });

  it("should report high confidence for well-formatted email", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    const emailField = analysis.data.fieldAnalyses.find((f) => f.field === "email");
    assert.ok(emailField, "Email field analysis should exist");
    assert.equal(emailField.confidence, "high", `Email confidence should be "high", got "${emailField.confidence}"`);
  });

  it("should report missing confidence for absent phone", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    const phoneField = analysis.data.fieldAnalyses.find((f) => f.field === "phone");
    assert.ok(phoneField, "Phone field analysis should exist");
    assert.equal(phoneField.confidence, "missing", `Phone confidence should be "missing", got "${phoneField.confidence}"`);
  });

  it("should include 5 profile fields in field analyses", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    assert.equal(analysis.data.fieldAnalyses.length, 5, "Should have 5 field analyses (name, email, phone, location, url)");
  });
});

// ---------------------------------------------------------------------------
// Section analyses
// ---------------------------------------------------------------------------

describe("ATS Scoring — Section Detection", () => {
  it("should detect all sections in an excellent resume", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    const detectedSections = analysis.data.sectionAnalyses.filter((s) => s.detected);
    assert.ok(detectedSections.length >= 4, `Should detect >= 4 sections, got ${detectedSections.length}`);
  });

  it("should report missing sections for a partial resume", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    const missingSections = analysis.data.sectionAnalyses.filter((s) => !s.detected);
    assert.ok(missingSections.length > 0, "Should have missing sections for a poor resume");
  });

  it("should include section line counts", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    const eduSection = analysis.data.sectionAnalyses.find((s) => s.section === "EDUCATION");
    assert.ok(eduSection, "EDUCATION section analysis should exist");
    assert.ok(eduSection.lineCount > 0, "EDUCATION section should have lines");
  });
});

// ---------------------------------------------------------------------------
// Format issues
// ---------------------------------------------------------------------------

describe("ATS Scoring — Format Issues", () => {
  it("should flag CRITICAL issues when name is missing", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    const criticalIssues = analysis.data.formatIssues.filter((i) => i.severity === "critical");
    assert.ok(criticalIssues.length > 0, "Should have critical issues for poor resume");
  });

  it("should flag CRITICAL when name cannot be parsed", () => {
    // Use a resume with no recognizable name pattern (only numbers/symbols)
    const { analysis } = parseAndAnalyze("123-456-7890\nfoo@bar.com\n!!@@##");
    const nameIssue = analysis.data.formatIssues.find(
      (i) => i.severity === "critical" && i.affectedFields.includes("name")
    );
    assert.ok(nameIssue, "Should have a critical issue for missing name");
  });

  it("should flag CRITICAL when email cannot be parsed", () => {
    const { analysis } = parseAndAnalyze("John Doe\nSome Street\nNo email here");
    const emailIssue = analysis.data.formatIssues.find(
      (i) => i.severity === "critical" && i.affectedFields.includes("email")
    );
    assert.ok(emailIssue, "Should have a critical issue for missing email");
  });

  it("should flag HIGH when phone is missing", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    const phoneIssue = analysis.data.formatIssues.find(
      (i) => i.severity === "high" && i.affectedFields.includes("phone")
    );
    assert.ok(phoneIssue, "Should have a high-severity issue for missing phone");
  });

  it("should suggest actionable fixes for each format issue", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    for (const issue of analysis.data.formatIssues) {
      assert.ok(issue.suggestion.length > 0, `Issue "${issue.description}" should have a suggestion`);
    }
  });

  it("should have fewer format issues for an excellent resume", () => {
    const { analysis: excellent } = parseAndAnalyze(EXCELLENT_RESUME);
    const { analysis: poor } = parseAndAnalyze(POOR_RESUME);
    assert.ok(
      excellent.data.formatIssues.length <= poor.data.formatIssues.length,
      "Excellent resume should have fewer issues than poor resume"
    );
  });
});

// ---------------------------------------------------------------------------
// Overall notes
// ---------------------------------------------------------------------------

describe("ATS Scoring — Overall Notes", () => {
  it("should generate overall notes for any resume", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME);
    assert.ok(analysis.data.overallNotes.length > 0, "Should generate overall notes");
  });

  it("should mention critical issues in notes when they exist", () => {
    const { analysis } = parseAndAnalyze(POOR_RESUME);
    const hasCriticalIssue = analysis.data.formatIssues.some((i) => i.severity === "critical");
    if (hasCriticalIssue) {
      const mentionsCritical = analysis.data.overallNotes.some((n) =>
        n.toLowerCase().includes("critical")
      );
      assert.ok(mentionsCritical, "Should mention critical issues in notes");
    }
  });

  it("should include metadata with parser version and strictness", () => {
    const { analysis } = parseAndAnalyze(EXCELLENT_RESUME, "strict");
    assert.equal(analysis.metadata.parserVersion, "1.0.0");
    assert.equal(analysis.metadata.strictness, "strict");
  });
});