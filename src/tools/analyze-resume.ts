/**
 * Resume Analysis Tool
 *
 * Takes parsed resume data and computes an ATS compatibility score
 * along with per-field extraction confidence ratings.
 */

import type { ParsedResume } from "../index";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface AnalyzeResumeInput {
  filePath?: string;
  rawText?: string;
  parsedResume: ParsedResume;
  strictness?: "lenient" | "moderate" | "strict";
}

export interface FieldAnalysis {
  field: string;
  value: string | null;
  confidence: "high" | "medium" | "low" | "missing";
  score: number;
  maxScore: number;
  notes: string[];
}

export interface SectionAnalysis {
  section: string;
  detected: boolean;
  lineCount: number;
  subsectionCount: number;
  issues: string[];
}

export interface AnalyzeResumeOutput {
  success: boolean;
  data: {
    atsScore: number;
    atsGrade: string;
    fieldAnalyses: FieldAnalysis[];
    sectionAnalyses: SectionAnalysis[];
    overallNotes: string[];
    formatIssues: FormatIssue[];
  };
  metadata: {
    parserVersion: string;
    strictness: string;
  };
}

export interface FormatIssue {
  severity: "critical" | "high" | "medium" | "low";
  category: "parsing" | "formatting" | "content" | "structure";
  description: string;
  affectedFields: string[];
  suggestion: string;
}

// ---------------------------------------------------------------------------
// Scoring weights based on strictness
// ---------------------------------------------------------------------------

const SCORING_WEIGHTS = {
  lenient: {
    name: 15,
    email: 15,
    phone: 5,
    location: 5,
    sections: 15,
    education: 10,
    experience: 15,
    skills: 10,
    formatting: 10,
  },
  moderate: {
    name: 20,
    email: 20,
    phone: 10,
    location: 5,
    sections: 15,
    education: 10,
    experience: 15,
    skills: 10,
    formatting: 5,
  },
  strict: {
    name: 25,
    email: 25,
    phone: 10,
    location: 5,
    sections: 10,
    education: 10,
    experience: 15,
    skills: 10,
    formatting: 0,
  },
};

type WeightKey = keyof typeof SCORING_WEIGHTS.moderate;

// ---------------------------------------------------------------------------
// Field analysis helpers
// ---------------------------------------------------------------------------

function analyzeField(
  field: string,
  value: string | null,
  regex: RegExp | null,
  strictness: "lenient" | "moderate" | "strict"
): FieldAnalysis {
  const notes: string[] = [];
  let confidence: "high" | "medium" | "low" | "missing" = "missing";
  let score = 0;
  const maxScore = 10;

  if (!value) {
    notes.push(`${field} could not be extracted from the resume`);
    if (strictness === "strict") notes.push("Critical for ATS — most systems require this field");
  } else {
    if (regex && regex.test(value)) {
      confidence = "high";
      score = 10;
      notes.push(`${field} was successfully parsed and matches expected format`);
    } else if (value.length > 0) {
      confidence = "medium";
      score = 7;
      notes.push(`${field} was extracted but may not match expected format`);
      if (regex) notes.push(`Expected pattern: ${regex.source}`);
    }
  }

  return { field, value, confidence, score, maxScore, notes };
}

// ---------------------------------------------------------------------------
// Format issue detection
// ---------------------------------------------------------------------------

function detectFormatIssues(resume: ParsedResume, fieldAnalyses: FieldAnalysis[]): FormatIssue[] {
  const issues: FormatIssue[] = [];

  // CRITICAL: Name or Email missing
  if (!resume.profile.name) {
    issues.push({
      severity: "critical",
      category: "parsing",
      description: "Name could not be parsed from the resume",
      affectedFields: ["name"],
      suggestion: "Ensure your name is on the first line, is bolded, and contains only letters and spaces. Avoid special characters or formatting that could confuse an ATS.",
    });
  }

  if (!resume.profile.email) {
    issues.push({
      severity: "critical",
      category: "parsing",
      description: "Email could not be parsed from the resume",
      affectedFields: ["email"],
      suggestion: "Ensure your email follows the format name@domain.com and is on its own line. Avoid embedding it in other text.",
    });
  }

  // HIGH: Phone missing
  if (!resume.profile.phone) {
    issues.push({
      severity: "high",
      category: "parsing",
      description: "Phone number could not be parsed",
      affectedFields: ["phone"],
      suggestion: "Use a standard phone format like (123) 456-7890 or 123-456-7890. Avoid formatting like +1.234.567.8901 that may confuse parsers.",
    });
  }

  // MEDIUM: Section detection issues
  const expectedSections = ["EDUCATION", "EXPERIENCE", "SKILLS"];
  for (const expected of expectedSections) {
    const found = resume.sections.some(
      (s) => s.title.toUpperCase() === expected
    );
    if (!found) {
      issues.push({
        severity: "medium",
        category: "structure",
        description: `Expected section "${expected}" was not detected`,
        affectedFields: [expected.toLowerCase()],
        suggestion: `Add a clearly titled "${expected}" section in UPPERCASE and bolded so ATS can identify it.`,
      });
    }
  }

  // MEDIUM: Empty descriptions in experience
  for (const exp of resume.experience) {
    if (exp.descriptions.length === 0) {
      issues.push({
        severity: "medium",
        category: "content",
        description: `Work experience at "${exp.company || "unknown company"}" has no bullet points`,
        affectedFields: ["experience"],
        suggestion: "Add bullet points starting with • or - describing your achievements and responsibilities. Use action verbs and quantify results when possible.",
      });
    }
  }

  // LOW: Location missing
  if (!resume.profile.location) {
    issues.push({
      severity: "low",
      category: "content",
      description: "Location (City, State) could not be parsed",
      affectedFields: ["location"],
      suggestion: "Add your location in the format 'City, ST' (e.g., 'San Francisco, CA') so ATS can match you to local jobs.",
    });
  }

  // MEDIUM: Check for text item merging issues
  const hasMergIssues = resume.rawTextItems.some(
    (item) => item.text.includes("@") && item.text.length > 50
  );
  if (hasMergIssues) {
    issues.push({
      severity: "medium",
      category: "formatting",
      description: "Some text items appear to be improperly merged",
      affectedFields: ["formatting"],
      suggestion: "Use consistent spacing between elements. Avoid placing email, phone, and other contact info on the same line.",
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Grade helper
// ---------------------------------------------------------------------------

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 85) return "A";
  if (score >= 80) return "A-";
  if (score >= 75) return "B+";
  if (score >= 70) return "B";
  if (score >= 65) return "B-";
  if (score >= 60) return "C+";
  if (score >= 55) return "C";
  if (score >= 50) return "C-";
  if (score >= 40) return "D";
  return "F";
}

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export function analyzeResume(input: AnalyzeResumeInput): AnalyzeResumeOutput {
  const { parsedResume, strictness = "moderate" } = input;
  const weights = SCORING_WEIGHTS[strictness];

  // Field analyses
  const fieldAnalyses: FieldAnalysis[] = [
    analyzeField("name", parsedResume.profile.name, /^[a-zA-Z\s\.]+$/, strictness),
    analyzeField("email", parsedResume.profile.email, /\S+@\S+\.\S+/, strictness),
    analyzeField("phone", parsedResume.profile.phone, /\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/, strictness),
    analyzeField("location", parsedResume.profile.location, /[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/, strictness),
    analyzeField("url", parsedResume.profile.url, /\S+\.[a-z]+\/\S+/, strictness),
  ];

  // Section analyses
  const sectionAnalyses: SectionAnalysis[] = parsedResume.sections.map((s) => ({
    section: s.title,
    detected: true,
    lineCount: s.lines.length,
    subsectionCount: s.lines.length > 0 ? 1 : 0,
    issues: s.lines.length === 0 ? [`${s.title} section is empty`] : [],
  }));

  // Check for missing common sections
  const commonSections = ["EDUCATION", "EXPERIENCE", "SKILLS"];
  for (const cs of commonSections) {
    const found = parsedResume.sections.some((s) => s.title === cs);
    if (!found) {
      sectionAnalyses.push({
        section: cs,
        detected: false,
        lineCount: 0,
        subsectionCount: 0,
        issues: [`${cs} section was not found in the resume`],
      });
    }
  }

  // Detect format issues
  const formatIssues = detectFormatIssues(parsedResume, fieldAnalyses);

  // Calculate weighted ATS score
  const nameScore = fieldAnalyses.find((f) => f.field === "name")!.score;
  const emailScore = fieldAnalyses.find((f) => f.field === "email")!.score;
  const phoneScore = fieldAnalyses.find((f) => f.field === "phone")!.score;
  const locationScore = fieldAnalyses.find((f) => f.field === "location")!.score;

  const sectionsWithContent = parsedResume.sections.filter((s) => s.lines.length > 0).length;
  const maxSections = 5;
  const sectionScore = Math.min(10, (sectionsWithContent / maxSections) * 10);

  const hasEducation = parsedResume.education.length > 0;
  const educationScore = hasEducation ? 10 : 0;

  const hasExperience = parsedResume.experience.length > 0;
  const experienceScore = hasExperience ? 10 : 0;

  const hasSkills = parsedResume.skills.length > 0;
  const skillsScore = hasSkills ? 10 : 0;

  const formatScore = formatIssues.filter((i) => i.severity === "low" || i.severity === "medium").length === 0 ? 10 : 5;

  const rawScore =
    (nameScore / 10) * weights.name +
    (emailScore / 10) * weights.email +
    (phoneScore / 10) * weights.phone +
    (locationScore / 10) * weights.location +
    (sectionScore / 10) * weights.sections +
    (educationScore / 10) * weights.education +
    (experienceScore / 10) * weights.experience +
    (skillsScore / 10) * weights.skills +
    (formatScore / 10) * weights.formatting;

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const atsScore = Math.round((rawScore / totalWeight) * 100);

  const atsGrade = scoreToGrade(atsScore);

  // Overall notes
  const overallNotes: string[] = [];
  if (atsScore >= 85) {
    overallNotes.push("Resume is well-formatted and should parse correctly in most ATS systems.");
  } else if (atsScore >= 70) {
    overallNotes.push("Resume is reasonably formatted but has some issues that could affect ATS parsing.");
  } else if (atsScore >= 50) {
    overallNotes.push("Resume has significant formatting issues that will likely cause ATS parsing problems.");
  } else {
    overallNotes.push("Resume has critical formatting issues that will severely impact ATS parsing. Immediate action required.");
  }

  if (formatIssues.filter((i) => i.severity === "critical").length > 0) {
    overallNotes.push("Critical issues detected: Name and/or Email cannot be reliably parsed. This will significantly reduce your chances of being found by recruiters.");
  }

  return {
    success: true,
    data: {
      atsScore: Math.min(100, Math.max(0, atsScore)),
      atsGrade,
      fieldAnalyses,
      sectionAnalyses,
      overallNotes,
      formatIssues,
    },
    metadata: {
      parserVersion: "1.0.0",
      strictness,
    },
  };
}