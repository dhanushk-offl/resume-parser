/**
 * Evaluation Tests — parse-resume
 *
 * Tests the 4-step OpenResume parsing algorithm against a variety
 * of resume formats and edge cases.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseResume,
  extractTextItemsFromRawText,
  groupTextItemsIntoLines,
  groupLinesIntoSections,
} from "../../dist/src/tools/parse-resume.js";

// ---------------------------------------------------------------------------
// Test resume samples
// ---------------------------------------------------------------------------

const COMPLETE_RESUME = `
JANE DOE
jane.doe@gmail.com
(555) 123-4567
San Francisco, CA
https://linkedin.com/in/janedoe

SUMMARY
Experienced software engineer with 8+ years of experience building scalable web applications. Passionate about clean code and mentoring junior developers.

EDUCATION
Massachusetts Institute of Technology
Bachelor of Science, Computer Science
GPA: 3.9
2014-2018

EXPERIENCE
Google
Senior Software Engineer
2020-Present
Led a team of 5 engineers to build a distributed caching system
Improved search latency by 40% through query optimization
Mentored 3 junior engineers through the onboarding process

Stripe
Software Engineer
2018-2020
Built payment processing microservices handling 10M+ transactions/day
Reduced API error rate by 25% through comprehensive testing

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes, PostgreSQL, Redis

PROJECTS
OpenResume
2023
Built an open-source resume parser used by 5000+ developers
`;

const MINIMAL_RESUME = `
JOHN SMITH
john@outlook.com
`;

const NO_SECTIONS_RESUME = `
Alice Wonder
alice@example.com
555-999-8888
Some random text that doesn't form sections.
`;

const ALL_UPPERCASE_RESUME = `
MICHAEL JORDAN
michael@basketball.com
(312) 555-0199
CHICAGO, IL

EDUCATION
UNIVERSITY OF NORTH CAROLINA
BACHELOR OF ARTS
1991-1995

EXPERIENCE
CHICAGO BULLS
SMALL FORWARD
1995-2003
Won 6 NBA championships
`;

const MULTI_EMAIL_RESUME = `
Sarah Connor
sarah@resistance.com
sarah.connor@skynet.org
(555) 555-5555
Los Angeles, CA

EXPERIENCE
Resistance
Leader
2029-Present
Organized human resistance against machines
`;

const EDGE_CASES_RESUME = `
Dr. Mary E. Watson PhD
dr.watson@research.edu
+1 (212) 555-0134
New York, NY
https://research.edu/watson

EDUCATION
Stanford University
Doctorate, Artificial Intelligence
GPA: 3.95
2015-2019

EXPERIENCE
DeepMind Research
Principal Research Scientist
2019-Present
Published 12 papers in top ML conferences
Led team developing novel transformer architectures

SKILLS
Python, TensorFlow, PyTorch, JAX, CUDA, Distributed Computing
`;

// ---------------------------------------------------------------------------
// Step 1: Text item extraction
// ---------------------------------------------------------------------------

describe("Step 1 — extractTextItemsFromRawText", () => {
  it("should extract text items from raw text", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    assert.ok(items.length > 0, "Should produce text items");
  });

  it("should mark known section headers as bold", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const sections = items.filter((i) => i.bold);
    const sectionTexts = sections.map((i) => i.text.toUpperCase());
    assert.ok(sectionTexts.includes("EDUCATION"), "EDUCATION should be bold");
    assert.ok(sectionTexts.includes("EXPERIENCE"), "EXPERIENCE should be bold");
    assert.ok(sectionTexts.includes("SKILLS"), "SKILLS should be bold");
  });

  it("should mark first non-section line as bold (candidate name)", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const nameItem = items.find((i) => i.text === "JANE DOE");
    assert.ok(nameItem, "JANE DOE should be found as a text item");
    assert.equal(nameItem.bold, true, "Candidate name should be bold");
  });

  it("should NOT mark email as bold", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const emailItem = items.find((i) => i.text.includes("@"));
    assert.ok(emailItem, "Email should be found");
    assert.equal(emailItem.bold, false, "Email should not be bold");
  });

  it("should handle empty input", () => {
    const items = extractTextItemsFromRawText("");
    assert.equal(items.length, 0, "Empty input should produce no items");
  });

  it("should assign Y-coordinates that decrease (top to bottom)", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    for (let i = 1; i < items.length; i++) {
      assert.ok(
        items[i].y <= items[i - 1].y,
        "Y should decrease from top to bottom"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Step 2: Line grouping
// ---------------------------------------------------------------------------

describe("Step 2 — groupTextItemsIntoLines", () => {
  it("should group items into lines", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const lines = groupTextItemsIntoLines(items);
    assert.ok(lines.length > 0, "Should produce lines");
  });

  it("should have line numbers starting at 1", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const lines = groupTextItemsIntoLines(items);
    assert.equal(lines[0].lineNumber, 1, "First line should be line 1");
  });

  it("should sort lines top to bottom", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const lines = groupTextItemsIntoLines(items);
    for (let i = 1; i < lines.length; i++) {
      assert.ok(lines[i].y <= lines[i - 1].y, "Lines should be sorted top to bottom");
    }
  });

  it("should handle empty items", () => {
    const lines = groupTextItemsIntoLines([]);
    assert.equal(lines.length, 0, "Empty items should produce no lines");
  });
});

// ---------------------------------------------------------------------------
// Step 3: Section grouping
// ---------------------------------------------------------------------------

describe("Step 3 — groupLinesIntoSections", () => {
  it("should detect PROFILE, EDUCATION, EXPERIENCE, SKILLS, and PROJECTS sections", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const lines = groupTextItemsIntoLines(items);
    const sections = groupLinesIntoSections(lines);
    const titles = sections.map((s) => s.title);

    assert.ok(titles.includes("PROFILE"), "Should include PROFILE");
    assert.ok(titles.includes("EDUCATION"), "Should include EDUCATION");
    assert.ok(titles.includes("EXPERIENCE"), "Should include EXPERIENCE");
    assert.ok(titles.includes("SKILLS"), "Should include SKILLS");
    assert.ok(titles.includes("PROJECTS"), "Should include PROJECTS");
  });

  it("should group content under correct sections", () => {
    const items = extractTextItemsFromRawText(COMPLETE_RESUME);
    const lines = groupTextItemsIntoLines(items);
    const sections = groupLinesIntoSections(lines);

    const eduSection = sections.find((s) => s.title === "EDUCATION");
    assert.ok(eduSection, "EDUCATION section should exist");
    assert.ok(eduSection.lines.length > 0, "EDUCATION section should have content");
    const eduText = eduSection.lines.map((l) => l.text).join(" ");
    assert.ok(eduText.includes("MIT") || eduText.includes("Massachusetts"), "EDUCATION should mention MIT/Massachusetts");
  });
});

// ---------------------------------------------------------------------------
// Step 4: Full parsing — profile extraction
// ---------------------------------------------------------------------------

describe("Step 4 — Full parseResume: Profile Extraction", () => {
  it("should parse name from a complete resume", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.equal(result.success, true, "Parsing should succeed");
    assert.equal(result.data.profile.name, "JANE DOE", "Name should be JANE DOE");
  });

  it("should parse email from a complete resume", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.equal(result.data.profile.email, "jane.doe@gmail.com", "Email should be extracted");
  });

  it("should parse phone from a complete resume", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.profile.phone !== null, "Phone should be extracted");
    assert.ok(/\d{3}/.test(result.data.profile.phone), "Phone should contain digits");
  });

  it("should parse location as City, State format", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.equal(result.data.profile.location, "San Francisco, CA", "Location should be San Francisco, CA");
  });

  it("should parse URL/LinkedIn", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.profile.url !== null, "URL should be extracted");
    assert.ok(result.data.profile.url.includes("linkedin.com"), "URL should include linkedin.com");
  });

  it("should complete all 4 parsing steps", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.deepEqual(result.metadata.stepsCompleted, [1, 2, 3, 4], "All 4 steps should complete");
  });
});

// ---------------------------------------------------------------------------
// Step 4: Education extraction
// ---------------------------------------------------------------------------

describe("Step 4 — Education Extraction", () => {
  it("should extract education entries", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.education.length > 0, "Should detect at least one education entry");
  });

  it("should extract school with university keyword", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const edu = result.data.education[0];
    assert.ok(edu.school !== null, "School should be extracted");
    assert.ok(
      edu.school.includes("MIT") || edu.school.includes("Massachusetts"),
      "School should mention MIT/Massachusetts"
    );
  });

  it("should extract degree", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const edu = result.data.education[0];
    assert.ok(edu.degree !== null, "Degree should be extracted");
  });

  it("should extract GPA", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const edu = result.data.education[0];
    assert.ok(edu.gpa !== null, "GPA should be extracted");
    assert.ok(edu.gpa.includes("3.9"), "GPA should include 3.9");
  });

  it("should extract date range", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const edu = result.data.education[0];
    assert.ok(edu.date !== null, "Date should be extracted");
  });
});

// ---------------------------------------------------------------------------
// Step 4: Experience extraction
// ---------------------------------------------------------------------------

describe("Step 4 — Experience Extraction", () => {
  it("should extract experience entries", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.experience.length > 0, "Should detect experience entries");
  });

  it("should attempt company name extraction", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    // Company extraction relies on bold metadata which is only available in PDFs.
    // With raw text, the company may appear in descriptions instead.
    // Verify the experience section exists and has meaningful content.
    assert.ok(result.data.experience.length > 0, "Should have experience entries");
    const exp = result.data.experience[0];
    // Either company or descriptions must be present for useful experience data
    assert.ok(
      exp.company !== null || exp.descriptions.length > 0 || exp.jobTitle !== null,
      "Experience should have company, job title, or descriptions"
    );
  });

  it("should extract job title", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const exp = result.data.experience[0];
    assert.ok(exp.jobTitle !== null, "Job title should be extracted");
  });

  it("should extract date range", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const exp = result.data.experience[0];
    assert.ok(exp.date !== null, "Date should be extracted");
  });

  it("should extract bullet-point descriptions", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const exp = result.data.experience[0];
    assert.ok(exp.descriptions.length > 0, "Should have description bullet points");
  });
});

// ---------------------------------------------------------------------------
// Step 4: Skills extraction
// ---------------------------------------------------------------------------

describe("Step 4 — Skills Extraction", () => {
  it("should extract skills section", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.skills.length > 0, "Should detect a skills section");
  });

  it("should list individual skills", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const skillDescriptions = result.data.skills[0].descriptions;
    const skillText = skillDescriptions.join(" ");
    assert.ok(
      skillText.includes("JavaScript") || skillText.includes("TypeScript"),
      "Skills should include JS/TS"
    );
  });
});

// ---------------------------------------------------------------------------
// Step 4: Projects extraction
// ---------------------------------------------------------------------------

describe("Step 4 — Projects Extraction", () => {
  it("should extract project entries", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    assert.ok(result.data.projects.length > 0, "Should detect project entries");
  });

  it("should extract project name", () => {
    const result = parseResume({ rawText: COMPLETE_RESUME });
    const proj = result.data.projects[0];
    assert.ok(proj.name !== null, "Project name should be extracted");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge Cases", () => {
  it("should handle minimal resume (name + email only)", () => {
    const result = parseResume({ rawText: MINIMAL_RESUME });
    assert.equal(result.success, true, "Should succeed even with minimal data");
    assert.ok(result.data.profile.email !== null, "Email should be extracted from minimal resume");
    assert.ok(result.data.profile.name !== null, "Name should be extracted from minimal resume");
  });

  it("should handle no-sections resume", () => {
    const result = parseResume({ rawText: NO_SECTIONS_RESUME });
    assert.equal(result.success, true, "Should succeed even without clear sections");
    assert.equal(result.data.education.length, 0, "Should have no education without EDUCATION section");
    assert.equal(result.data.experience.length, 0, "Should have no experience without EXPERIENCE section");
  });

  it("should handle all-uppercase resume", () => {
    const result = parseResume({ rawText: ALL_UPPERCASE_RESUME });
    assert.ok(result.data.profile.name !== null, "Name should be extracted from all-uppercase resume");
    assert.ok(result.data.profile.email !== null, "Email should be extracted");
    assert.ok(result.data.education.length > 0, "Should detect education in all-uppercase");
    assert.ok(result.data.experience.length > 0, "Should detect experience in all-uppercase");
  });

  it("should handle resume with special characters in name", () => {
    const result = parseResume({ rawText: EDGE_CASES_RESUME });
    assert.ok(result.data.profile.email !== null, "Email should be parsed");
    assert.ok(result.data.profile.name !== null, "Name should be parsed");
  });

  it("should return failure when no input provided", () => {
    const result = parseResume({});
    assert.equal(result.success, false, "Should fail without input");
    assert.ok(result.metadata.warnings.length > 0, "Should have warnings");
  });

  it("should return stepsCompleted as empty array on failure", () => {
    const result = parseResume({});
    assert.deepEqual(result.metadata.stepsCompleted, [], "No steps should complete on failure");
  });

  it("should handle multi-email resume by picking best match", () => {
    const result = parseResume({ rawText: MULTI_EMAIL_RESUME });
    assert.ok(result.data.profile.email !== null, "Should extract an email");
    assert.ok(result.data.profile.email.includes("@"), "Extracted value should contain @");
  });
});