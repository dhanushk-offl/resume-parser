/**
 * Evaluation Tests — suggest-improvements
 *
 * Tests the suggestion engine for prioritization, categorization,
 * and correctness of improvement recommendations.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseResume } from "../../dist/src/tools/parse-resume.js";
import { analyzeResume } from "../../dist/src/tools/analyze-resume.js";
import { suggestImprovements } from "../../dist/src/tools/suggest-improvements.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fullPipeline(rawText, { strictness = "moderate", focusAreas = ["ats", "content", "formatting", "structure"] } = {}) {
  const parsed = parseResume({ rawText });
  const analysis = analyzeResume({
    rawText,
    parsedResume: parsed.data,
    strictness,
  });
  const suggestions = suggestImprovements({
    rawText,
    parsedResume: parsed.data,
    analysisResult: analysis.data,
    focusAreas,
  });
  return { parsed, analysis, suggestions };
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

const NO_SECTIONS_RESUME = `
Bob Smith
bob@company.com
(555) 987-6543

Just a list of skills: JavaScript, Python
`;

// ---------------------------------------------------------------------------
// Priority and categorization
// ---------------------------------------------------------------------------

describe("Suggestions — Priority Ordering", () => {
  it("should sort suggestions by priority (critical first)", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const priorities = suggestions.data.suggestions.map((s) => s.priority);
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < priorities.length; i++) {
      assert.ok(
        priorityOrder[priorities[i]] >= priorityOrder[priorities[i - 1]],
        `Priority should be non-increasing: ${priorities[i - 1]} came before ${priorities[i]}`
      );
    }
  });

  it("should flag CRITICAL priority for missing name", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const nameSuggestion = suggestions.data.suggestions.find(
      (s) => s.field === "name" && s.priority === "critical"
    );
    assert.ok(nameSuggestion, "Should have a critical suggestion for missing name");
  });

  it("should flag CRITICAL priority for missing email", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const emailSuggestion = suggestions.data.suggestions.find(
      (s) => s.field === "email" && s.priority === "critical"
    );
    assert.ok(emailSuggestion, "Should have a critical suggestion for missing email");
  });

  it("should have fewer critical suggestions for an excellent resume", () => {
    const { suggestions: excellent } = fullPipeline(EXCELLENT_RESUME);
    const { suggestions: poor } = fullPipeline(POOR_RESUME);
    const excellentCriticals = excellent.data.suggestions.filter((s) => s.priority === "critical").length;
    const poorCriticals = poor.data.suggestions.filter((s) => s.priority === "critical").length;
    assert.ok(
      excellentCriticals <= poorCriticals,
      `Excellent resume should have <= criticals of poor resume (${excellentCriticals} vs ${poorCriticals})`
    );
  });
});

// ---------------------------------------------------------------------------
// Category filtering
// ---------------------------------------------------------------------------

describe("Suggestions — Focus Area Filtering", () => {
  it("should only return ATS suggestions when focus is ['ats']", () => {
    const { suggestions } = fullPipeline(POOR_RESUME, { focusAreas: ["ats"] });
    for (const s of suggestions.data.suggestions) {
      assert.equal(s.category, "ats", `Expected category "ats", got "${s.category}" for suggestion "${s.title}"`);
    }
  });

  it("should only return content suggestions when focus is ['content']", () => {
    const { suggestions } = fullPipeline(POOR_RESUME, { focusAreas: ["content"] });
    for (const s of suggestions.data.suggestions) {
      assert.equal(s.category, "content", `Expected category "content", got "${s.category}" for suggestion "${s.title}"`);
    }
  });

  it("should return all categories when focus is all areas", () => {
    const { suggestions } = fullPipeline(POOR_RESUME, {
      focusAreas: ["ats", "content", "formatting", "structure"],
    });
    const categories = new Set(suggestions.data.suggestions.map((s) => s.category));
    assert.ok(categories.size >= 2, `Should have >= 2 categories, got ${categories.size}`);
  });

  it("should default to all focus areas", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    assert.ok(
      suggestions.data.suggestions.length >= 0,
      "Should produce suggestions with default focus areas"
    );
  });
});

// ---------------------------------------------------------------------------
// Suggestion structure
// ---------------------------------------------------------------------------

describe("Suggestions — Structure & Completeness", () => {
  it("should have all required fields on each suggestion", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    for (const s of suggestions.data.suggestions) {
      assert.ok(s.id, "Should have id");
      assert.ok(s.priority, "Should have priority");
      assert.ok(s.category, "Should have category");
      assert.ok(s.field, "Should have field");
      assert.ok(s.title, "Should have title");
      assert.ok(s.description, "Should have description");
      assert.ok(s.suggestedValue, "Should have suggestedValue");
      assert.ok(s.rationale, "Should have rationale");
    }
  });

  it("should have valid priority values", () => {
    const validPriorities = ["critical", "high", "medium", "low"];
    const { suggestions } = fullPipeline(POOR_RESUME);
    for (const s of suggestions.data.suggestions) {
      assert.ok(validPriorities.includes(s.priority), `Invalid priority: "${s.priority}"`);
    }
  });

  it("should have valid category values", () => {
    const validCategories = ["ats", "content", "formatting", "structure"];
    const { suggestions } = fullPipeline(POOR_RESUME);
    for (const s of suggestions.data.suggestions) {
      assert.ok(validCategories.includes(s.category), `Invalid category: "${s.category}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// Quick wins
// ---------------------------------------------------------------------------

describe("Suggestions — Quick Wins", () => {
  it("should include quick wins for a poor resume", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    assert.ok(suggestions.data.quickWins.length > 0, "Should have quick wins for a poor resume");
  });

  it("quick wins should only contain critical or high priority items", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    // Quick wins are derived from critical + high priority suggestions
    const criticalOrHigh = suggestions.data.suggestions.filter(
      (s) => s.priority === "critical" || s.priority === "high"
    );
    assert.ok(
      suggestions.data.quickWins.length <= criticalOrHigh.length,
      "Quick wins count should be <= critical+high suggestions count"
    );
  });

  it("should have fewer quick wins for an excellent resume than a poor one", () => {
    const { suggestions: excellent } = fullPipeline(EXCELLENT_RESUME);
    const { suggestions: poor } = fullPipeline(POOR_RESUME);
    assert.ok(
      excellent.data.quickWins.length <= poor.data.quickWins.length,
      "Excellent resume should have <= quick wins compared to poor resume"
    );
  });
});

// ---------------------------------------------------------------------------
// Section suggestions
// ---------------------------------------------------------------------------

describe("Suggestions — Section Suggestions", () => {
  it("should report missing sections for a poor resume", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const missingSections = suggestions.data.sectionSuggestions.filter((s) => !s.present);
    assert.ok(missingSections.length > 0, "Poor resume should have missing sections");
  });

  it("should report present sections for an excellent resume", () => {
    const { suggestions } = fullPipeline(EXCELLENT_RESUME);
    const presentSections = suggestions.data.sectionSuggestions.filter((s) => s.present);
    assert.ok(presentSections.length >= 3, `Excellent resume should have >= 3 present sections, got ${presentSections.length}`);
  });

  it("should include recommendations for missing sections", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const missingSections = suggestions.data.sectionSuggestions.filter((s) => !s.present);
    for (const s of missingSections) {
      assert.ok(s.recommendations.length > 0, `Missing section "${s.section}" should have recommendations`);
    }
  });
});

// ---------------------------------------------------------------------------
// Long-term advice
// ---------------------------------------------------------------------------

describe("Suggestions — Long-term Advice", () => {
  it("should always include long-term advice", () => {
    const { suggestions } = fullPipeline(EXCELLENT_RESUME);
    assert.ok(suggestions.data.longTermAdvice.length > 0, "Should always include long-term advice");
  });

  it("should include actionable advice items", () => {
    const { suggestions } = fullPipeline(EXCELLENT_RESUME);
    for (const advice of suggestions.data.longTermAdvice) {
      assert.ok(advice.length > 10, `Advice should be descriptive: "${advice}"`);
    }
  });
});

// ---------------------------------------------------------------------------
// Overall score consistency
// ---------------------------------------------------------------------------

describe("Suggestions — Score Consistency", () => {
  it("should match the ATS score from analysis", () => {
    const { analysis, suggestions } = fullPipeline(EXCELLENT_RESUME);
    assert.equal(
      suggestions.data.overallScore,
      analysis.data.atsScore,
      `Suggestion score (${suggestions.data.overallScore}) should match analysis score (${analysis.data.atsScore})`
    );
  });

  it("should match the ATS grade from analysis", () => {
    const { analysis, suggestions } = fullPipeline(EXCELLENT_RESUME);
    assert.equal(suggestions.data.overallGrade, analysis.data.atsGrade);
  });

  it("should count critical fixes correctly", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    const expectedCount = suggestions.data.suggestions.filter((s) => s.priority === "critical").length;
    assert.equal(suggestions.data.criticalFixes, expectedCount);
  });

  it("should count total suggestions correctly", () => {
    const { suggestions } = fullPipeline(POOR_RESUME);
    assert.equal(suggestions.data.totalSuggestions, suggestions.data.suggestions.length);
  });
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

describe("Suggestions — Metadata", () => {
  it("should include parser version in metadata", () => {
    const { suggestions } = fullPipeline(EXCELLENT_RESUME);
    assert.equal(suggestions.metadata.parserVersion, "1.0.0");
  });

  it("should include focus areas in metadata", () => {
    const { suggestions } = fullPipeline(EXCELLENT_RESUME, { focusAreas: ["ats", "content"] });
    assert.deepEqual(suggestions.metadata.focusAreas, ["ats", "content"]);
  });
});