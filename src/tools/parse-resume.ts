/**
 * Step 1–4: Resume Parsing Engine
 *
 * Implements the full OpenResume algorithm:
 *   Step 1: Read text items from PDF
 *   Step 2: Group text items into lines
 *   Step 3: Group lines into sections
 *   Step 4: Extract resume attributes from sections via feature scoring
 */

import type {
  TextItem,
  LineItem,
  SectionItem,
  ResumeProfile,
  ResumeEducation,
  ResumeExperience,
  ResumeSkills,
  ResumeProject,
  ParsedResume,
} from "../index";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface ParseResumeInput {
  /** Path to a PDF file */
  filePath?: string;
  /** Raw text (fallback if PDF not available) */
  rawText?: string;
}

export interface ParseResumeOutput {
  success: boolean;
  data: ParsedResume;
  metadata: {
    parserVersion: string;
    stepsCompleted: number[];
    warnings: string[];
  };
}

// ---------------------------------------------------------------------------
// Step 1: Read text items from PDF
// ---------------------------------------------------------------------------

/**
 * Extract text items from raw resume text (simplified version).
 *
 * In a full implementation this would use pdfjs-dist to extract
 * text items with position, bold, and newline metadata from a PDF.
 * Here we simulate the extraction from raw text input.
 */
export async function extractTextItemsFromPDF(
  filePath: string
): Promise<{ items: TextItem[]; warnings: string[] }> {
  const warnings: string[] = [];

  try {
    // In production: use pdfjs-dist to read the PDF and extract text items
    // with (x1, x2, y, bold, newLine) metadata.
    //
    // const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    // const doc = await pdfjsLib.getDocument(filePath).promise;
    // ... iterate pages, get textContent, map to TextItem[]
    //
    // For now we fall back to a simplified extraction:

    const fs = await import("fs");
    const pdfBuffer = fs.readFileSync(filePath);

    // Attempt to extract text from the PDF buffer using a simple approach.
    // The full implementation should use pdfjs-dist for accurate positioning.
    const text = pdfBuffer.toString("latin1");

    // Extract readable text portions (simplified heuristic)
    const textItems: TextItem[] = [];
    const lines = text
      .split(/[\r\n]+/)
      .filter((l) => l.trim().length > 0);

    let y = 800;
    for (const line of lines) {
      const cleanLine = line.replace(/[^\x20-\x7E]/g, "").trim();
      if (cleanLine.length === 0) continue;

      // Determine if line is likely a section header
      const isBold = /^[A-Z\s/&]+$/.test(cleanLine) && cleanLine.length < 40;
      const isSectionTitle = isBold && cleanLine.length > 2;

      textItems.push({
        text: cleanLine,
        x1: 36,
        x2: 36 + cleanLine.length * 5,
        y: y,
        bold: isSectionTitle,
        newLine: true,
      });

      y -= 14;
    }

    if (textItems.length === 0) {
      warnings.push("Could not extract any text items from the PDF. The file may be image-based or corrupted.");
    }

    return { items: textItems, warnings };
  } catch (error: any) {
    warnings.push(`Error reading PDF: ${error.message}`);
    return { items: [], warnings };
  }
}

/**
 * Fallback: parse text items from raw text input
 *
 * Heuristics for determining bold/section-title:
 *   1. Known section headers (EDUCATION, EXPERIENCE, etc.) → bold + section title
 *   2. Short ALL-CAPS lines (≤ 40 chars) → bold (but NOT a section title if
 *      they look like a name — i.e., only letters, spaces, periods, and → )
 *   3. First non-empty line is treated as the candidate name → bold, NOT section title
 */
export function extractTextItemsFromRawText(rawText: string): TextItem[] {
  const lines = rawText.split(/\n/);
  const items: TextItem[] = [];
  let y = 800;

  // Detect which line is likely the name (first non-empty line that is NOT a section title)
  let firstNameLine: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (!SECTION_TITLE_KEYWORDS.includes(trimmed.toUpperCase())) {
      firstNameLine = trimmed;
      break;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    const upperTrimmed = trimmed.toUpperCase();
    const isKnownSection = SECTION_TITLE_KEYWORDS.includes(upperTrimmed);
    const isAllCapsShort = /^[A-Z\s/&]+$/.test(trimmed) && trimmed.length <= 40 && trimmed.length > 2;
    const looksLikeName = /^[A-Z][a-zA-Z\s\.]+$/.test(trimmed) && trimmed.length > 2 && trimmed.length < 50;
    const isFirstName = firstNameLine !== null && trimmed === firstNameLine;

    // Determine bold and section-title flags
    let bold = false;
    let treatAsSectionTitle = false;

    if (isKnownSection) {
      // Known section headers are always section titles
      bold = true;
      treatAsSectionTitle = true;
    } else if (isAllCapsShort && !looksLikeName && !isFirstName) {
      // Short ALL-CAPS that don't look like names → bold, treat as section title
      bold = true;
      treatAsSectionTitle = true;
    } else if (isFirstName && looksLikeName) {
      // First line that looks like a name → bold, NOT a section title
      bold = true;
    } else if (isAllCapsShort) {
      // Could be a name in all caps — bold but not a section title
      bold = true;
    }

    items.push({
      text: trimmed,
      x1: 36,
      x2: 36 + trimmed.length * 5,
      y,
      bold,
      newLine: true,
    });

    y -= 14;
  }

  return items;
}

// ---------------------------------------------------------------------------
// Step 2: Group text items into lines
// ---------------------------------------------------------------------------

/**
 * Merge adjacent text items on the same Y-coordinate if their horizontal
 * distance is smaller than the average character width.
 */
export function groupTextItemsIntoLines(items: TextItem[]): LineItem[] {
  if (items.length === 0) return [];

  // Calculate average character width
  const charWidthItems = items.filter((i) => !i.bold && i.text.trim().length > 0);
  let totalWidth = 0;
  let totalChars = 0;

  for (const item of charWidthItems) {
    totalWidth += item.x2 - item.x1;
    totalChars += item.text.length;
  }

  const avgCharWidth = totalChars > 0 ? totalWidth / totalChars : 5;

  // Group items by Y-coordinate (same line)
  const yGroups = new Map<number, TextItem[]>();
  const yTolerance = 3; // Pixels tolerance for same line

  const sortedItems = [...items].sort((a, b) => b.y - a.y); // Top to bottom

  const yKeys: number[] = [];
  for (const item of sortedItems) {
    let matched = false;
    for (const key of yKeys) {
      if (Math.abs(item.y - key) <= yTolerance) {
        yGroups.get(key)!.push(item);
        matched = true;
        break;
      }
    }
    if (!matched) {
      yKeys.push(item.y);
      yGroups.set(item.y, [item]);
    }
  }

  // Sort groups by Y (top to bottom)
  yKeys.sort((a, b) => b - a);

  const lines: LineItem[] = [];

  for (const yKey of yKeys) {
    const groupItems = yGroups.get(yKey)!;
    // Sort items left to right
    groupItems.sort((a, b) => a.x1 - b.x1);

    // Merge adjacent items
    const merged: TextItem[] = [];
    for (const item of groupItems) {
      if (merged.length === 0) {
        merged.push({ ...item });
        continue;
      }

      const prev = merged[merged.length - 1];
      const distance = item.x1 - prev.x2;

      if (distance < avgCharWidth && !item.newLine) {
        // Merge with previous item
        prev.text += item.text;
        prev.x2 = item.x2;
      } else {
        // Add separator and new item
        merged.push({ ...item });
      }
    }

    const lineText = merged.map((i) => i.text).join(" ").trim();
    lines.push({
      lineNumber: lines.length + 1,
      text: lineText,
      items: merged,
      y: yKey,
    });
  }

  return lines;
}

// ---------------------------------------------------------------------------
// Step 3: Group lines into sections
// ---------------------------------------------------------------------------

/** Known section title keywords for fallback heuristic */
const SECTION_TITLE_KEYWORDS = [
  "PROFILE", "SUMMARY", "OBJECTIVE", "ABOUT", "ABOUT ME",
  "EDUCATION", "ACADEMIC", "DEGREES", "ACADEMICS",
  "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT", "PROFESSIONAL EXPERIENCE",
  "WORK HISTORY", "CAREER HISTORY",
  "SKILLS", "TECHNICAL SKILLS", "COMPETENCIES", "AREAS OF EXPERTISE",
  "PROJECTS", "PORTFOLIO", "PERSONAL PROJECTS",
  "CERTIFICATIONS", "LICENSES", "HONORS", "AWARDS", "HONORS & AWARDS",
  "VOLUNTEER", "VOLUNTEER EXPERIENCE", "COMMUNITY", "COMMUNITY SERVICE",
  "LEADERSHIP", "LEADERSHIP EXPERIENCE",
  "PUBLICATIONS", "RESEARCH", "RESEARCH EXPERIENCE",
  "INTERESTS", "ACTIVITIES", "HOBBIES", "EXTRACURRICULAR",
  "LANGUAGES", "REFERENCES",
];

/**
 * Determine if a line is a section title.
 * Primary heuristic: only text item, bold, all UPPERCASE.
 * Fallback heuristic: keyword match.
 */
function isSectionTitle(line: LineItem): boolean {
  const text = line.text.trim();
  const upperText = text.toUpperCase();

  // Fallback heuristic first: exact keyword match (handles raw-text case cleanly)
  const cleanUpper = upperText.replace(/[^A-Z\s/&]/g, "").trim();
  if (SECTION_TITLE_KEYWORDS.includes(cleanUpper)) {
    return true;
  }

  // Primary heuristic: only text item, bold, all UPPERCASE
  // But exclude names — "Leo Leopard" etc. should NOT be detected as section titles
  if (line.items.length === 1 && line.items[0].bold && /^[A-Z\s/&]+$/.test(text)) {
    // If it looks like a name (mixed case or typical name pattern), it's not a section title
    if (/^[A-Z][a-zA-Z\s\.]+$/.test(text) && text.length < 50) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Group lines into sections based on section titles.
 */
export function groupLinesIntoSections(lines: LineItem[]): SectionItem[] {
  if (lines.length === 0) return [];

  const sections: SectionItem[] = [];
  let currentSection: SectionItem = { title: "PROFILE", lines: [] };

  for (const line of lines) {
    if (isSectionTitle(line)) {
      // Save the current section if it has lines
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { title: line.text.trim().toUpperCase(), lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }

  // Push the last section
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Step 4: Extract resume attributes from sections
// ---------------------------------------------------------------------------

// --- Feature scoring system ---

interface FeatureSet {
  /** Feature matching function that returns true if the text matches */
  match: (text: string, item: TextItem) => boolean;
  /** Score to add if matched (can be negative) */
  score: number;
}

// --- Profile feature sets ---

const NAME_FEATURE_SETS: FeatureSet[] = [
  { match: (text) => /^[a-zA-Z\s\.]+$/.test(text), score: 3 },
  { match: (_text, item) => item.bold, score: 2 },
  { match: (text) => text === text.toUpperCase() && /[A-Z]/.test(text), score: 2 },
  { match: (text) => text.includes("@"), score: -4 },
  { match: (text) => /\d/.test(text), score: -4 },
  { match: (text) => text.includes(","), score: -4 },
  { match: (text) => text.includes("/"), score: -4 },
];

const EMAIL_FEATURE_SETS: FeatureSet[] = [
  { match: (text) => /\S+@\S+\.\S+/.test(text), score: 4 },
  { match: (text) => /^[a-zA-Z\s\.]+$/.test(text) && !text.includes("@"), score: -1 },
  { match: (text) => /\d/.test(text) && !text.includes("@"), score: -2 },
  { match: (text) => text.includes("@"), score: 4 },
];

const PHONE_FEATURE_SETS: FeatureSet[] = [
  { match: (text) => /\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(text), score: 4 },
  { match: (text) => /^[a-zA-Z\s\.]+$/.test(text), score: -4 },
  { match: (text) => text.includes("@"), score: -4 },
  { match: (text) => /\d/.test(text) && !/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(text), score: -1 },
];

const LOCATION_FEATURE_SETS: FeatureSet[] = [
  { match: (text) => /[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/.test(text), score: 4 },
  { match: (text) => text.includes("@"), score: -4 },
  { match: (text) => !text.includes(","), score: -2 },
];

const URL_FEATURE_SETS: FeatureSet[] = [
  { match: (text) => /\S+\.[a-z]+\/\S+/.test(text), score: 4 },
  { match: (text) => /https?:\/\//i.test(text), score: 4 },
  { match: (text) => /linkedin\.com/i.test(text), score: 4 },
  { match: (text) => /github\.com/i.test(text), score: 4 },
  { match: (text) => /^[a-zA-Z\s\.]+$/.test(text), score: -4 },
];

// --- Education / Experience feature sets ---

const SCHOOL_KEYWORDS = /college|university|school|institute|academy|faculty/i;
const DEGREE_KEYWORDS = /associate|bachelor|master|doctorate|b\.s\.|b\.a\.|m\.s\.|m\.a\.|ph\.d|bsc|msc|ba|ma|mba|bs|ms/i;
const GPA_REGEX = /[0-4]\.\d{1,2}/;
const DATE_REGEX = /(?:19|20)\d{2}/;
const JOB_TITLE_KEYWORDS = /analyst|engineer|intern|manager|developer|coordinator|director|associate|consultant|specialist|lead|architect|designer|administrator|assistant|officer|executive|president|vice|chief|head|supervisor|technician|clerk|trainee|volunteer/i;

// --- Feature scoring function ---

function computeFeatureScore(text: string, item: TextItem, featureSets: FeatureSet[]): number {
  let totalScore = 0;
  for (const fs of featureSets) {
    if (fs.match(text, item)) {
      totalScore += fs.score;
    }
  }
  return totalScore;
}

/**
 * From a list of text items, find the one with the highest feature score
 * for a given set of feature sets.
 */
function extractBestMatch(items: TextItem[], featureSets: FeatureSet[]): string | null {
  let bestScore = -Infinity;
  let bestText: string | null = null;

  for (const item of items) {
    const text = item.text.trim();
    if (text.length === 0) continue;
    const score = computeFeatureScore(text, item, featureSets);
    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  return bestScore > 0 ? bestText : null;
}

// --- Subsection detection ---

/**
 * Detect subsection boundaries within a section.
 * Primary: vertical line gap > typical line gap × 1.4
 * Fallback: text item is bolded
 */
function detectSubsections(section: SectionItem): LineItem[][] {
  const { lines } = section;
  if (lines.length === 0) return [];

  // Calculate typical line gap
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    gaps.push(Math.abs(lines[i].y - lines[i - 1].y));
  }

  const typicalGap = gaps.length > 0
    ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)]
    : 14;

  const subsectionGapThreshold = typicalGap * 1.4;

  // Split lines into subsections
  const subsections: LineItem[][] = [];
  let currentSubsection: LineItem[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const gap = Math.abs(lines[i].y - lines[i - 1].y);
    const isBoldStart = lines[i].items.some((item) => item.bold);

    if (gap > subsectionGapThreshold || (isBoldStart && currentSubsection.length > 1)) {
      subsections.push(currentSubsection);
      currentSubsection = [lines[i]];
    } else {
      currentSubsection.push(lines[i]);
    }
  }

  subsections.push(currentSubsection);
  return subsections;
}

// --- Section-specific extractors ---

function extractProfile(sections: SectionItem[]): ResumeProfile {
  const profileSection = sections.find((s) => s.title === "PROFILE");
  if (!profileSection) {
    // Try SUMMARY or OBJECTIVE
    const fallback = sections.find((s) => ["SUMMARY", "OBJECTIVE", "ABOUT"].includes(s.title));
    if (fallback) {
      return extractProfileFromSection(fallback);
    }
    return { name: null, email: null, phone: null, location: null, url: null, summary: null };
  }
  return extractProfileFromSection(profileSection);
}

function extractProfileFromSection(section: SectionItem): ResumeProfile {
  const allItems = section.lines.flatMap((l) => l.items);
  const allTexts = allItems.map((i) => i.text.trim()).filter((t) => t.length > 0);

  const name = extractBestMatch(allItems, NAME_FEATURE_SETS);
  const email = extractBestMatch(allItems, EMAIL_FEATURE_SETS);
  const phone = extractBestMatch(allItems, PHONE_FEATURE_SETS);
  const location = extractBestMatch(allItems, LOCATION_FEATURE_SETS);
  const url = extractBestMatch(allItems, URL_FEATURE_SETS);

  // Summary: everything that isn't name/email/phone/location/url
  const summaryTexts = allTexts.filter(
    (t) =>
      t !== name &&
      t !== email &&
      t !== phone &&
      t !== location &&
      t !== url &&
      !SECTION_TITLE_KEYWORDS.includes(t.toUpperCase().replace(/[^A-Z\s/&]/g, "").trim())
  );
  const summary = summaryTexts.length > 0 ? summaryTexts.join(" ") : null;

  return { name, email, phone, location, url, summary };
}

function extractEducation(sections: SectionItem[]): ResumeEducation[] {
  const eduSection = sections.find((s) =>
    ["EDUCATION", "ACADEMIC", "DEGREES", "ACADEMICS"].includes(s.title)
  );
  if (!eduSection) return [];

  const subsections = detectSubsections(eduSection);
  const educations: ResumeEducation[] = [];

  for (const sub of subsections) {
    const allItems = sub.flatMap((l) => l.items);
    const allTexts = allItems.map((i) => i.text.trim()).filter((t) => t.length > 0);

    // Find school
    const school = allTexts.find((t) => SCHOOL_KEYWORDS.test(t)) || null;

    // Find degree
    const degree = allTexts.find((t) => DEGREE_KEYWORDS.test(t)) || null;

    // Find GPA
    const gpa = allTexts.find((t) => GPA_REGEX.test(t)) || null;

    // Find date
    const date = allTexts.find((t) => DATE_REGEX.test(t)) || null;

    // Find descriptions (bullet points)
    const descriptions = allTexts.filter(
      (t) =>
        t !== school &&
        t !== degree &&
        t !== gpa &&
        t !== date &&
        !SECTION_TITLE_KEYWORDS.includes(t.toUpperCase())
    );

    educations.push({ school, degree, gpa, date, descriptions });
  }

  return educations;
}

function extractExperience(sections: SectionItem[]): ResumeExperience[] {
  const expSection = sections.find((s) =>
    [
      "EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT",
      "PROFESSIONAL EXPERIENCE", "WORK HISTORY", "CAREER HISTORY",
      "VOLUNTEER", "VOLUNTEER EXPERIENCE", "COMMUNITY",
      "COMMUNITY SERVICE",
    ].includes(s.title)
  );
  if (!expSection) return [];

  const subsections = detectSubsections(expSection);
  const experiences: ResumeExperience[] = [];

  for (const sub of subsections) {
    const allItems = sub.flatMap((l) => l.items);
    const allTexts = allItems.map((i) => i.text.trim()).filter((t) => t.length > 0);

    // Find company (bolded or no job title match)
    const company = allTexts.find((t) => {
      const item = allItems.find((i) => i.text.trim() === t);
      return item?.bold && !JOB_TITLE_KEYWORDS.test(t);
    }) || null;

    // Find job title
    const jobTitle = allTexts.find((t) => JOB_TITLE_KEYWORDS.test(t)) || null;

    // Find date
    const date = allTexts.find((t) => DATE_REGEX.test(t)) || null;

    // Descriptions (bullet points)
    const descriptions = allTexts.filter(
      (t) =>
        t !== company &&
        t !== jobTitle &&
        t !== date &&
        !SECTION_TITLE_KEYWORDS.includes(t.toUpperCase())
    );

    experiences.push({ company, jobTitle, date, descriptions });
  }

  return experiences;
}

function extractSkills(sections: SectionItem[]): ResumeSkills[] {
  const skillSection = sections.find((s) =>
    ["SKILLS", "TECHNICAL SKILLS", "COMPETENCIES", "AREAS OF EXPERTISE"].includes(s.title)
  );
  if (!skillSection) return [];

  const allTexts = skillSection.lines.flatMap((l) =>
    l.items.map((i) => i.text.trim()).filter((t) => t.length > 0)
  );

  const descriptions = allTexts.filter(
    (t) => !SECTION_TITLE_KEYWORDS.includes(t.toUpperCase())
  );

  return [{ descriptions }];
}

function extractProjects(sections: SectionItem[]): ResumeProject[] {
  const projSection = sections.find((s) =>
    ["PROJECTS", "PORTFOLIO", "PERSONAL PROJECTS"].includes(s.title)
  );
  if (!projSection) return [];

  const subsections = detectSubsections(projSection);
  const projects: ResumeProject[] = [];

  for (const sub of subsections) {
    const allTexts = sub.flatMap((l) =>
      l.items.map((i) => i.text.trim()).filter((t) => t.length > 0)
    );

    const name = allTexts[0] || null;
    const date = allTexts.find((t) => DATE_REGEX.test(t)) || null;
    const descriptions = allTexts.filter(
      (t) => t !== name && t !== date && !SECTION_TITLE_KEYWORDS.includes(t.toUpperCase())
    );

    projects.push({ name, date, descriptions });
  }

  return projects;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export function parseResume(input: ParseResumeInput): ParseResumeOutput {
  const warnings: string[] = [];
  const stepsCompleted: number[] = [];

  let textItems: TextItem[];

  // Step 1: Extract text items
  if (input.rawText) {
    textItems = extractTextItemsFromRawText(input.rawText);
    stepsCompleted.push(1);
  } else if (input.filePath) {
    // For synchronous version we use the raw text approach;
    // in production this would be async with pdfjs-dist
    try {
      const fs = require("fs");
      const content = fs.readFileSync(input.filePath, "utf-8");
      textItems = extractTextItemsFromRawText(content);
      stepsCompleted.push(1);
    } catch {
      warnings.push(`Could not read file: ${input.filePath}`);
      textItems = [];
    }
  } else {
    warnings.push("No input provided. Please provide either filePath or rawText.");
    return {
      success: false,
      data: {
        profile: { name: null, email: null, phone: null, location: null, url: null, summary: null },
        education: [],
        experience: [],
        skills: [],
        projects: [],
        sections: [],
        rawTextItems: [],
        lines: [],
      },
      metadata: { parserVersion: "1.0.0", stepsCompleted: [], warnings },
    };
  }

  // Step 2: Group text items into lines
  const lines = groupTextItemsIntoLines(textItems);
  stepsCompleted.push(2);

  // Step 3: Group lines into sections
  const sections = groupLinesIntoSections(lines);
  stepsCompleted.push(3);

  // Step 4: Extract resume attributes from sections
  const profile = extractProfile(sections);
  const education = extractEducation(sections);
  const experience = extractExperience(sections);
  const skills = extractSkills(sections);
  const projects = extractProjects(sections);
  stepsCompleted.push(4);

  const parsedResume: ParsedResume = {
    profile,
    education,
    experience,
    skills,
    projects,
    sections,
    rawTextItems: textItems,
    lines,
  };

  return {
    success: true,
    data: parsedResume,
    metadata: { parserVersion: "1.0.0", stepsCompleted, warnings },
  };
}