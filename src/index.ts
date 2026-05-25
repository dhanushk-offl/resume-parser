/**
 * Resume Parser Skill — Main Entry Point
 *
 * Implements the OpenResume 4-step parsing algorithm:
 *   Step 1: Read text items from PDF
 *   Step 2: Group text items into lines
 *   Step 3: Group lines into sections
 *   Step 4: Extract resume attributes from sections
 */

import { parseResume, ParseResumeInput, ParseResumeOutput } from "./tools/parse-resume";
import { analyzeResume, AnalyzeResumeInput, AnalyzeResumeOutput } from "./tools/analyze-resume";
import { suggestImprovements, SuggestImprovementsInput, SuggestImprovementsOutput } from "./tools/suggest-improvements";

export { parseResume, analyzeResume, suggestImprovements };
export type { ParseResumeInput, ParseResumeOutput, AnalyzeResumeInput, AnalyzeResumeOutput, SuggestImprovementsInput, SuggestImprovementsOutput };

// ---------------------------------------------------------------------------
// Re-export core types used across the skill
// ---------------------------------------------------------------------------

export interface TextItem {
  /** The text content of the item */
  text: string;
  /** Left X position */
  x1: number;
  /** Right X position */
  x2: number;
  /** Y position (from bottom of page) */
  y: number;
  /** Whether the text item is bold */
  bold: boolean;
  /** Whether this item starts a new line */
  newLine: boolean;
}

export interface LineItem {
  /** Line number (1-indexed) */
  lineNumber: number;
  /** The concatenated text content of the line */
  text: string;
  /** Constituent text items in this line */
  items: TextItem[];
  /** Y position of this line */
  y: number;
}

export interface SectionItem {
  /** Section title (e.g., "EDUCATION", "EXPERIENCE") */
  title: string;
  /** Lines belonging to this section */
  lines: LineItem[];
}

export interface ResumeProfile {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  url: string | null;
  summary: string | null;
}

export interface ResumeEducation {
  school: string | null;
  degree: string | null;
  gpa: string | null;
  date: string | null;
  descriptions: string[];
}

export interface ResumeExperience {
  company: string | null;
  jobTitle: string | null;
  date: string | null;
  descriptions: string[];
}

export interface ResumeSkills {
  descriptions: string[];
}

export interface ResumeProject {
  name: string | null;
  date: string | null;
  descriptions: string[];
}

export interface ParsedResume {
  profile: ResumeProfile;
  education: ResumeEducation[];
  experience: ResumeExperience[];
  skills: ResumeSkills[];
  projects: ResumeProject[];
  sections: SectionItem[];
  rawTextItems: TextItem[];
  lines: LineItem[];
}

/**
 * Main function — orchestrates the full pipeline:
 * parse → analyze → suggest
 */
export function fullPipeline(
  input: ParseResumeInput & { strictness?: string; focusAreas?: string[] }
): {
  parsed: ParseResumeOutput;
  analyzed: AnalyzeResumeOutput;
  suggestions: SuggestImprovementsOutput;
} {
  const parsed = parseResume(input);

  const analyzed = analyzeResume({
    ...input,
    parsedResume: parsed.data,
    strictness: (input.strictness as "lenient" | "moderate" | "strict") ?? "moderate",
  });

  const suggestions = suggestImprovements({
    ...input,
    parsedResume: parsed.data,
    analysisResult: analyzed.data,
    focusAreas: input.focusAreas ?? ["ats", "content", "formatting", "structure"],
  });

  return { parsed, analyzed, suggestions };
}