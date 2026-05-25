#!/usr/bin/env node

/**
 * Resume Parser — CLI Entry Point
 *
 * Usage:
 *   resume-parser parse <file|text>          Parse a resume and output structured data
 *   resume-parser analyze <file|text>         Parse + analyze ATS compatibility
 *   resume-parser insights <file|text>       Full pipeline: parse + analyze + suggestions
 */

const path = require("path");
const fs = require("fs");
const { parseResume } = require("../dist/src/tools/parse-resume");
const { analyzeResume } = require("../dist/src/tools/analyze-resume");
const { suggestImprovements } = require("../dist/src/tools/suggest-improvements");

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function printUsage() {
  console.log(`
Resume Parser CLI — Deep resume parsing with ATS insights

Usage:
  resume-parser <command> <input> [options]

Commands:
  parse <file|text>       Parse a resume and output structured data
  analyze <file|text>     Parse + analyze ATS compatibility
  insights <file|text>    Full pipeline: parse + analyze + suggestions

Options:
  --strictness <level>    ATS strictness: lenient, moderate, strict (default: moderate)
  --focus <areas>         Focus areas: ats,content,formatting,structure (default: all)
  --json                  Output raw JSON instead of formatted report
  --help                  Show this help message

Examples:
  resume-parser parse resume.pdf
  resume-parser analyze resume.pdf --strictness strict
  resume-parser insights resume.pdf --focus ats,formatting --json
  resume-parser parse "John Doe\\njohn@email.com\\nSoftware Engineer"
`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(0);
  }

  const command = args[0];
  const inputArg = args[1];

  if (!inputArg) {
    console.error("Error: Please provide a file path or text input.");
    printUsage();
    process.exit(1);
  }

  // Parse options
  const strictnessIdx = args.indexOf("--strictness");
  const strictness = strictnessIdx >= 0 ? args[strictnessIdx + 1] : "moderate";

  const focusIdx = args.indexOf("--focus");
  const focusAreas = focusIdx >= 0
    ? args[focusIdx + 1].split(",")
    : ["ats", "content", "formatting", "structure"];

  const jsonOutput = args.includes("--json");

  // Determine input type: file path or raw text
  let filePath;
  let rawText;

  if (fs.existsSync(inputArg)) {
    filePath = path.resolve(inputArg);
  } else {
    rawText = inputArg.replace(/\\n/g, "\n");
  }

  // Execute command
  switch (command) {
    case "parse": {
      const result = parseResume({ filePath, rawText });
      if (jsonOutput) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printParseResult(result);
      }
      break;
    }

    case "analyze": {
      const parsed = parseResume({ filePath, rawText });
      const analyzed = analyzeResume({
        filePath,
        rawText,
        parsedResume: parsed.data,
        strictness,
      });
      if (jsonOutput) {
        console.log(JSON.stringify(analyzed, null, 2));
      } else {
        printAnalysisResult(analyzed);
      }
      break;
    }

    case "insights": {
      const parsed = parseResume({ filePath, rawText });
      const analyzed = analyzeResume({
        filePath,
        rawText,
        parsedResume: parsed.data,
        strictness,
      });
      const suggestions = suggestImprovements({
        filePath,
        rawText,
        parsedResume: parsed.data,
        analysisResult: analyzed.data,
        focusAreas,
      });
      if (jsonOutput) {
        console.log(JSON.stringify(suggestions, null, 2));
      } else {
        printInsightsResult(suggestions);
      }
      break;
    }

    default:
      console.error("Unknown command: " + command);
      printUsage();
      process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Formatted output helpers
// ---------------------------------------------------------------------------

function printParseResult(result) {
  if (!result.success) {
    console.log("❌ Failed to parse resume");
    console.log("Warnings:", result.metadata.warnings.join(", "));
    return;
  }

  const { profile, education, experience, skills, projects } = result.data;

  console.log("\n📄 Resume Parsing Results\n");
  console.log("━".repeat(50));

  // Profile
  console.log("\n✨ Profile");
  console.log("─".repeat(30));
  console.log("  Name:      " + (profile.name || "Not parsed"));
  console.log("  Email:     " + (profile.email || "Not parsed"));
  console.log("  Phone:     " + (profile.phone || "Not parsed"));
  console.log("  Location:  " + (profile.location || "Not parsed"));
  console.log("  Link:      " + (profile.url || "Not parsed"));

  if (profile.summary) {
    console.log("  Summary:   " + profile.summary);
  }

  // Education
  if (education.length > 0) {
    console.log("\n🎓 Education");
    console.log("─".repeat(30));
    for (const edu of education) {
      console.log("  School:       " + (edu.school || "Not parsed"));
      console.log("  Degree:       " + (edu.degree || "Not parsed"));
      console.log("  GPA:          " + (edu.gpa || "Not parsed"));
      console.log("  Date:         " + (edu.date || "Not parsed"));
      if (edu.descriptions.length > 0) {
        console.log("  Descriptions: " + edu.descriptions.join("; "));
      }
      console.log();
    }
  }

  // Work Experience
  if (experience.length > 0) {
    console.log("💼 Work Experience");
    console.log("─".repeat(30));
    for (const exp of experience) {
      console.log("  Company:      " + (exp.company || "Not parsed"));
      console.log("  Job Title:    " + (exp.jobTitle || "Not parsed"));
      console.log("  Date:         " + (exp.date || "Not parsed"));
      if (exp.descriptions.length > 0) {
        console.log("  Descriptions:");
        for (const d of exp.descriptions) {
          console.log("    • " + d);
        }
      }
      console.log();
    }
  }

  // Skills
  if (skills.length > 0) {
    console.log("🛠️  Skills");
    console.log("─".repeat(30));
    for (const skill of skills) {
      for (const d of skill.descriptions) {
        console.log("  • " + d);
      }
    }
  }

  // Projects
  if (projects.length > 0) {
    console.log("\n🚀 Projects");
    console.log("─".repeat(30));
    for (const proj of projects) {
      console.log("  Name:         " + (proj.name || "Not parsed"));
      console.log("  Date:         " + (proj.date || "Not parsed"));
      if (proj.descriptions.length > 0) {
        console.log("  Descriptions:");
        for (const d of proj.descriptions) {
          console.log("    • " + d);
        }
      }
      console.log();
    }
  }

  // Metadata
  console.log("\n" + "━".repeat(50));
  console.log("Steps completed: " + result.metadata.stepsCompleted.join(" → "));
  if (result.metadata.warnings.length > 0) {
    console.log("Warnings: " + result.metadata.warnings.join(", "));
  }
}

function printAnalysisResult(result) {
  if (!result.success) {
    console.log("❌ Failed to analyze resume");
    return;
  }

  const { atsScore, atsGrade, fieldAnalyses, sectionAnalyses, overallNotes, formatIssues } = result.data;

  console.log("\n📊 Resume Analysis Report\n");
  console.log("━".repeat(50));
  console.log("\n🎯 ATS Compatibility Score: " + atsScore + "/100 (Grade: " + atsGrade + ")\n");

  // Field analyses
  console.log("📋 Field Extraction Analysis");
  console.log("─".repeat(40));
  for (const field of fieldAnalyses) {
    let icon = "❌";
    if (field.confidence === "high") icon = "✅";
    else if (field.confidence === "medium") icon = "⚠️";
    else if (field.confidence === "low") icon = "🔶";
    const val = field.value || "Not parsed";
    console.log("  " + icon + " " + field.field.padEnd(12) + " | " + val.padEnd(30) + " | " + field.confidence);
  }

  // Section analyses
  console.log("\n📑 Section Detection");
  console.log("─".repeat(40));
  for (const section of sectionAnalyses) {
    const icon = section.detected ? "✅" : "❌";
    const issues = section.issues.length > 0 ? section.issues.join(", ") : "OK";
    console.log("  " + icon + " " + section.section.padEnd(25) + " | Lines: " + section.lineCount + " | " + issues);
  }

  // Format issues
  if (formatIssues.length > 0) {
    console.log("\n⚠️  Format Issues");
    console.log("─".repeat(40));
    for (const issue of formatIssues) {
      let severityIcon = "🟢";
      if (issue.severity === "critical") severityIcon = "🔴";
      else if (issue.severity === "high") severityIcon = "🟠";
      else if (issue.severity === "medium") severityIcon = "🟡";
      console.log("  " + severityIcon + " [" + issue.severity.toUpperCase() + "] " + issue.description);
      console.log("     Affected: " + issue.affectedFields.join(", "));
      console.log("     Fix: " + issue.suggestion);
    }
  }

  // Overall notes
  console.log("\n📝 Overall Notes");
  console.log("─".repeat(40));
  for (const note of overallNotes) {
    console.log("  • " + note);
  }

  console.log("\n" + "━".repeat(50));
}

function printInsightsResult(result) {
  const { overallScore, overallGrade, criticalFixes, totalSuggestions, suggestions, sectionSuggestions, quickWins, longTermAdvice } = result.data;

  console.log("\n🔍 Resume Insights Report\n");
  console.log("━".repeat(50));
  console.log("\n🎯 ATS Compatibility Score: " + overallScore + "/100 (Grade: " + overallGrade + ")");
  console.log("🔴 Critical fixes needed: " + criticalFixes);
  console.log("📝 Total suggestions: " + totalSuggestions + "\n");

  // Quick wins
  if (quickWins.length > 0) {
    console.log("⚡ Quick Wins (fix these first):");
    console.log("─".repeat(40));
    for (let i = 0; i < quickWins.length; i++) {
      console.log("  " + (i + 1) + ". " + quickWins[i]);
    }
    console.log();
  }

  // All suggestions
  if (suggestions.length > 0) {
    console.log("📋 All Suggestions (sorted by priority):");
    console.log("─".repeat(40));
    for (const sug of suggestions) {
      let icon = "🟢";
      if (sug.priority === "critical") icon = "🔴";
      else if (sug.priority === "high") icon = "🟠";
      else if (sug.priority === "medium") icon = "🟡";
      console.log("\n  " + icon + " [" + sug.priority.toUpperCase() + "] " + sug.title);
      console.log("     Field: " + sug.field);
      console.log("     Issue: " + sug.description);
      console.log("     Current: " + (sug.currentValue || "Not parsed"));
      console.log("     Suggested: " + sug.suggestedValue);
      console.log("     Why: " + sug.rationale);
    }
    console.log();
  }

  // Section suggestions
  console.log("📑 Section Status:");
  console.log("─".repeat(40));
  for (const section of sectionSuggestions) {
    const icon = section.present ? "✅" : "❌";
    console.log("  " + icon + " " + section.section);
    if (section.issues.length > 0) {
      for (const issue of section.issues) {
        console.log("     ⚠️  " + issue);
      }
    }
    if (section.recommendations.length > 0) {
      for (const rec of section.recommendations) {
        console.log("     💡 " + rec);
      }
    }
  }

  // Long-term advice
  console.log("\n🌟 Long-term Improvement Advice:");
  console.log("─".repeat(40));
  for (const advice of longTermAdvice) {
    console.log("  • " + advice);
  }

  console.log("\n" + "━".repeat(50));
}

// Run
main();