/**
 * Resume Improvement Suggestions Tool
 *
 * Takes parsed resume data and analysis results, then generates
 * structured, actionable suggestions organized by priority.
 */

import type { ParsedResume } from "../index";
import type { AnalyzeResumeOutput } from "./analyze-resume";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface SuggestImprovementsInput {
  filePath?: string;
  rawText?: string;
  parsedResume: ParsedResume;
  analysisResult: AnalyzeResumeOutput["data"];
  focusAreas?: string[];
}

export interface Suggestion {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "ats" | "content" | "formatting" | "structure";
  field: string;
  title: string;
  description: string;
  currentValue: string | null;
  suggestedValue: string;
  rationale: string;
}

export interface SectionSuggestion {
  section: string;
  present: boolean;
  issues: string[];
  recommendations: string[];
}

export interface SuggestImprovementsOutput {
  success: boolean;
  data: {
    overallScore: number;
    overallGrade: string;
    criticalFixes: number;
    totalSuggestions: number;
    suggestions: Suggestion[];
    sectionSuggestions: SectionSuggestion[];
    quickWins: string[];
    longTermAdvice: string[];
  };
  metadata: {
    parserVersion: string;
    focusAreas: string[];
  };
}

// ---------------------------------------------------------------------------
// Suggestion generators
// ---------------------------------------------------------------------------

function profileSuggestions(resume: ParsedResume, analysis: AnalyzeResumeOutput["data"], focusAreas: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 1;

  // Name
  if (!resume.profile.name) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "critical",
      category: "ats",
      field: "name",
      title: "Name is not parseable by ATS",
      description: "Your resume name could not be extracted. ATS systems use your name as the primary identifier — without it, your application may be discarded.",
      currentValue: null,
      suggestedValue: "Place your full name on the first line, in bold, using only letters and spaces (e.g., 'Jane Doe').",
      rationale: "The feature scoring system expects names that contain only letters, spaces, or periods, and are typically bolded on the first line.",
    });
  } else if (!/^[a-zA-Z\s\.]+$/.test(resume.profile.name)) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "high",
      category: "formatting",
      field: "name",
      title: "Name format may confuse ATS",
      description: `Your name "${resume.profile.name}" contains non-letter characters that may cause parsing errors.`,
      currentValue: resume.profile.name,
      suggestedValue: resume.profile.name.replace(/[^a-zA-Z\s\.]/g, "").trim() || "Your Name Here",
      rationale: "Names with special characters, numbers, or symbols can confuse ATS name extraction algorithms.",
    });
  }

  // Email
  if (!resume.profile.email) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "critical",
      category: "ats",
      field: "email",
      title: "Email is not parseable by ATS",
      description: "Your email could not be extracted. Without a parseable email, recruiters cannot contact you through the ATS.",
      currentValue: null,
      suggestedValue: "Add your email on a separate line in the format name@domain.com.",
      rationale: "ATS systems match the pattern xxx@xxx.xxx. Emails embedded in other text or with unusual formatting may be missed.",
    });
  } else if (!/^\S+@\S+\.\S+$/.test(resume.profile.email)) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "medium",
      category: "formatting",
      field: "email",
      title: "Email format may cause parsing issues",
      description: `Your email "${resume.profile.email}" doesn't match the standard format exactly.`,
      currentValue: resume.profile.email,
      suggestedValue: "Use a simple email format like firstname.lastname@gmail.com",
      rationale: "Non-standard email formatting can cause ATS to misparse or miss the email entirely.",
    });
  }

  // Phone
  if (!resume.profile.phone) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "high",
      category: "ats",
      field: "phone",
      title: "Phone number is not parseable",
      description: "Your phone number could not be extracted. Some ATS systems use phone numbers as a secondary identifier.",
      currentValue: null,
      suggestedValue: "Add your phone in format (123) 456-7890 or 123-456-7890 on its own line.",
      rationale: "ATS parsers commonly use regex patterns like \\(\\d{3}\\)[\\s-]?\\d{3}[\\s-]?\\d{4} to identify phone numbers.",
    });
  } else if (!/\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/.test(resume.profile.phone)) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "medium",
      category: "formatting",
      field: "phone",
      title: "Phone format is non-standard",
      description: `Your phone "${resume.profile.phone}" may not parse correctly in all ATS systems.`,
      currentValue: resume.profile.phone,
      suggestedValue: resume.profile.phone.replace(/[^\d()\- ]/g, ""),
      rationale: "Standard US phone formats are more reliably parsed by ATS systems.",
    });
  }

  // Location
  if (!resume.profile.location) {
    if (focusAreas.includes("content") || focusAreas.includes("ats")) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "location",
        title: "Location (City, State) is missing",
        description: "Adding your location in 'City, ST' format helps ATS match you to local job opportunities.",
        currentValue: null,
        suggestedValue: "Add your location as 'City, ST' (e.g., 'San Francisco, CA')",
        rationale: "ATS systems often filter by location. The format 'City, ST' matches the regex /[A-Z][a-zA-Z\\s]+, [A-Z]{2}/.",
      });
    }
  }

  return suggestions;
}

function educationSuggestions(resume: ParsedResume, focusAreas: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 100;

  if (resume.education.length === 0) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "high",
      category: "structure",
      field: "education",
      title: "Education section not detected",
      description: "Your resume does not have a parseable education section. Most ATS systems look for this.",
      currentValue: null,
      suggestedValue: "Add an 'EDUCATION' section in uppercase and bolded. Include school name, degree, GPA, and dates.",
      rationale: "ATS systems detect education sections by looking for section headers that are uppercase and bolded.",
    });
    return suggestions;
  }

  for (let i = 0; i < resume.education.length; i++) {
    const edu = resume.education[i];

    if (!edu.school) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "education",
        title: `Education entry #${i + 1}: School name not detected`,
        description: "The school/university name could not be parsed. Include keywords like 'University', 'College', or 'Institute'.",
        currentValue: null,
        suggestedValue: "University of Example, City, ST",
        rationale: "The parser uses school keywords (College, University, School, Institute, Academy) to identify school names.",
      });
    }

    if (!edu.degree) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "education",
        title: `Education entry #${i + 1}: Degree not detected`,
        description: "The degree could not be parsed. Include degree keywords like 'Bachelor', 'Master', 'B.S.', 'M.A.', etc.",
        currentValue: null,
        suggestedValue: "Bachelor of Science, Computer Science",
        rationale: "The parser uses degree keywords (Associate, Bachelor, Master, etc.) to identify degree information.",
      });
    }

    if (!edu.date) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "low",
        category: "content",
        field: "education",
        title: `Education entry #${i + 1}: Date not detected`,
        description: "The graduation date could not be parsed. Include years (e.g., 'Expected Graduation: June 2026').",
        currentValue: null,
        suggestedValue: "Expected Graduation: June 2026",
        rationale: "ATS systems look for year patterns (e.g., 2024, 2025) to determine recency of education.",
      });
    }
  }

  return suggestions;
}

function experienceSuggestions(resume: ParsedResume, focusAreas: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 200;

  if (resume.experience.length === 0) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "high",
      category: "structure",
      field: "experience",
      title: "Work experience section not detected",
      description: "Your resume does not have a parseable experience section.",
      currentValue: null,
      suggestedValue: "Add a 'WORK EXPERIENCE' or 'EXPERIENCE' section in uppercase and bolded.",
      rationale: "ATS systems rely on section headers to locate work experience.",
    });
    return suggestions;
  }

  for (let i = 0; i < resume.experience.length; i++) {
    const exp = resume.experience[i];

    if (!exp.company) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "experience",
        title: `Experience entry #${i + 1}: Company name not detected`,
        description: "The company/organization name could not be parsed. Consider putting it on its own line in bold.",
        currentValue: null,
        suggestedValue: "Company Name, City, ST",
        rationale: "The parser identifies company names by checking bold formatting and proximity to dates.",
      });
    }

    if (!exp.jobTitle) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "experience",
        title: `Experience entry #${i + 1}: Job title not detected`,
        description: "The job title could not be parsed. Use common job title keywords (e.g., Engineer, Analyst, Manager).",
        currentValue: null,
        suggestedValue: "Job Title (e.g., Software Engineer, Data Analyst)",
        rationale: "The parser matches job titles against a keyword list including Analyst, Engineer, Manager, etc.",
      });
    }

    if (!exp.date) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "low",
        category: "content",
        field: "experience",
        title: `Experience entry #${i + 1}: Date range not detected`,
        description: "Include dates like 'June 2022–Present' on the same line as the company name.",
        currentValue: null,
        suggestedValue: "June 2022–Present",
        rationale: "ATS parsers look for year patterns and 'Present' to establish employment timelines.",
      });
    }

    if (exp.descriptions.length === 0) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "content",
        field: "experience",
        title: `Experience entry #${i + 1}: No bullet points found`,
        description: "Add bullet point descriptions for your responsibilities and achievements.",
        currentValue: null,
        suggestedValue: "• Led a team of 5 engineers to deliver project X on time\n• Improved system performance by 30%",
        rationale: "Bullet points with action verbs and quantified results improve both ATS parsing and human readability.",
      });
    } else if (exp.descriptions.length < 3 && focusAreas.includes("content")) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "low",
        category: "content",
        field: "experience",
        title: `Experience entry #${i + 1}: Consider adding more bullet points`,
        description: `Only ${exp.descriptions.length} bullet points found. Aim for 3-5 per role.`,
        currentValue: `${exp.descriptions.length} bullet points`,
        suggestedValue: "3-5 bullet points per role with quantified achievements",
        rationale: "More bullet points with action verbs and metrics improve ATS keyword matching and demonstrate impact.",
      });
    }
  }

  return suggestions;
}

function skillsSuggestions(resume: ParsedResume, focusAreas: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 300;

  if (resume.skills.length === 0) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "medium",
      category: "structure",
      field: "skills",
      title: "Skills section not detected",
      description: "A dedicated skills section helps ATS match your resume to job requirements.",
      currentValue: null,
      suggestedValue: "Add a 'SKILLS' section listing key technical and soft skills.",
      rationale: "ATS systems often extract skills from a dedicated section header. Without one, skills may be missed.",
    });
  } else if (resume.skills[0]?.descriptions.length < 3 && focusAreas.includes("content")) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "low",
      category: "content",
      field: "skills",
      title: "Skills section appears thin",
      description: `Only ${resume.skills[0]?.descriptions.length} skill items detected. Consider expanding.`,
      currentValue: `${resume.skills[0]?.descriptions.length} items`,
      suggestedValue: "8-15 relevant skills organized by category",
      rationale: "A robust skills section increases keyword match rate in ATS systems.",
    });
  }

  return suggestions;
}

function structureSuggestions(resume: ParsedResume, analysis: AnalyzeResumeOutput["data"], focusAreas: string[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  let id = 400;

  // Check for single-column layout
  if (resume.rawTextItems.length > 0) {
    const uniqueYs = new Set(resume.rawTextItems.map((i) => Math.round(i.y)));
    const textItemCount = resume.rawTextItems.length;
    const lineCount = resume.lines.length;

    if (lineCount > 0 && textItemCount / lineCount > 3) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "medium",
        category: "formatting",
        field: "structure",
        title: "Resume may use multi-column layout",
        description: "The text extraction suggests a multi-column layout, which confuses most ATS systems.",
        currentValue: "Possible multi-column layout",
        suggestedValue: "Use a single-column layout to ensure ATS reads content in the correct order.",
        rationale: "ATS systems read resumes left-to-right, top-to-bottom. Multi-column layouts cause content to interleave incorrectly.",
      });
    }
  }

  // Check section ordering
  const sectionTitles = resume.sections.map((s) => s.title);
  const expectedOrder = ["PROFILE", "SUMMARY", "OBJECTIVE", "EDUCATION", "EXPERIENCE", "SKILLS"];
  let orderIssue = false;
  let lastIndex = -1;
  for (const expected of expectedOrder) {
    const idx = sectionTitles.indexOf(expected);
    if (idx >= 0 && idx < lastIndex) {
      orderIssue = true;
      break;
    }
    if (idx >= 0) lastIndex = idx;
  }

  if (orderIssue && focusAreas.includes("structure")) {
    suggestions.push({
      id: `SUG-${id++}`,
      priority: "low",
      category: "structure",
      field: "structure",
      title: "Section ordering may not be optimal",
      description: "Consider reordering sections to: Profile/Summary → Education → Experience → Skills.",
      currentValue: `Current order: ${sectionTitles.join(" → ")}`,
      suggestedValue: "Profile → Education → Experience → Skills",
      rationale: "Standard section ordering helps ATS and recruiters find information quickly. Education before Experience is common for recent graduates.",
    });
  }

  // Check for date formatting consistency
  if (focusAreas.includes("formatting")) {
    const allDates: string[] = [];
    for (const edu of resume.education) {
      if (edu.date) allDates.push(edu.date);
    }
    for (const exp of resume.experience) {
      if (exp.date) allDates.push(exp.date);
    }

    const dateFormats = new Set<string>();
    for (const d of allDates) {
      if (/^\d{4}$/.test(d)) dateFormats.add("year-only");
      else if (/–/.test(d) || /—/.test(d)) dateFormats.add("en-dash");
      else if (/-/.test(d)) dateFormats.add("hyphen");
      else dateFormats.add("other");
    }

    if (dateFormats.size > 1) {
      suggestions.push({
        id: `SUG-${id++}`,
        priority: "low",
        category: "formatting",
        field: "formatting",
        title: "Date formats are inconsistent",
        description: "Use a consistent date format throughout your resume (e.g., 'Month Year–Month Year').",
        currentValue: `Multiple formats detected: ${Array.from(dateFormats).join(", ")}`,
        suggestedValue: "Consistent format: 'June 2022–Present' or '2022–2024'",
        rationale: "Inconsistent date formatting can cause ATS to misparse employment timelines.",
      });
    }
  }

  return suggestions;
}

// ---------------------------------------------------------------------------
// Section-level suggestions
// ---------------------------------------------------------------------------

function generateSectionSuggestions(resume: ParsedResume): SectionSuggestion[] {
  const result: SectionSuggestion[] = [];

  const desiredSections = [
    { title: "PROFILE", label: "Profile" },
    { title: "EDUCATION", label: "Education" },
    { title: "EXPERIENCE", label: "Work Experience" },
    { title: "SKILLS", label: "Skills" },
  ];

  for (const desired of desiredSections) {
    const found = resume.sections.find((s) => s.title === desired.title);
    if (found) {
      const issues: string[] = [];
      const recs: string[] = [];

      if (found.lines.length === 0) {
        issues.push("Section is empty");
        recs.push(`Add content to your ${desired.label} section`);
      }

      result.push({
        section: desired.title,
        present: true,
        issues,
        recommendations: recs,
      });
    } else {
      result.push({
        section: desired.title,
        present: false,
        issues: [`Missing ${desired.label} section`],
        recommendations: [`Add a "${desired.title}" header in bold and uppercase`],
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main suggestion function
// ---------------------------------------------------------------------------

export function suggestImprovements(input: SuggestImprovementsInput): SuggestImprovementsOutput {
  const { parsedResume, analysisResult, focusAreas = ["ats", "content", "formatting", "structure"] } = input;

  // Collect all suggestions
  const allSuggestions: Suggestion[] = [
    ...profileSuggestions(parsedResume, analysisResult, focusAreas),
    ...educationSuggestions(parsedResume, focusAreas),
    ...experienceSuggestions(parsedResume, focusAreas),
    ...skillsSuggestions(parsedResume, focusAreas),
    ...structureSuggestions(parsedResume, analysisResult, focusAreas),
  ];

  // Filter by focus areas
  const filteredSuggestions = allSuggestions.filter((s) =>
    focusAreas.includes(s.category)
  );

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  filteredSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Section suggestions
  const sectionSuggestions = generateSectionSuggestions(parsedResume);

  // Quick wins (high-impact, easy-to-fix)
  const quickWins = filteredSuggestions
    .filter((s) => s.priority === "critical" || s.priority === "high")
    .map((s) => `**${s.title}**: ${s.suggestedValue}`);

  // Long-term advice
  const longTermAdvice = [
    "Tailor your resume keywords to each job description for better ATS matching",
    "Use standard section headers (Education, Experience, Skills) in bold UPPERCASE",
    "Stick to a single-column layout for maximum ATS compatibility",
    "Use standard bullet point characters (•) for descriptions",
    "Avoid headers/footers, images, and tables — ATS often can't read them",
    "Save your resume as a text-based PDF (not scanned/image PDF)",
    "Keep date formats consistent throughout (e.g., 'Month Year–Month Year')",
    "Quantify achievements with numbers and percentages where possible",
  ];

  const criticalFixes = filteredSuggestions.filter((s) => s.priority === "critical").length;

  return {
    success: true,
    data: {
      overallScore: analysisResult.atsScore,
      overallGrade: analysisResult.atsGrade,
      criticalFixes,
      totalSuggestions: filteredSuggestions.length,
      suggestions: filteredSuggestions,
      sectionSuggestions,
      quickWins,
      longTermAdvice,
    },
    metadata: {
      parserVersion: "1.0.0",
      focusAreas,
    },
  };
}