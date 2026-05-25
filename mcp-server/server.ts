/**
 * Resume Parser — MCP Server
 *
 * Exposes the resume parsing, analysis, and suggestion tools
 * via the Model Context Protocol (MCP).
 *
 * Tools:
 *   - parse_resume: Parse a resume PDF/text and return structured data
 *   - analyze_resume: Parse + compute ATS compatibility score
 *   - suggest_improvements: Generate actionable fix suggestions
 *
 * Usage:
 *   npm run mcp
 *
 * The server communicates via stdio using the MCP protocol.
 */

import { parseResume } from "../src/tools/parse-resume";
import { analyzeResume } from "../src/tools/analyze-resume";
import { suggestImprovements } from "../src/tools/suggest-improvements";
import type { ParsedResume } from "../src/index";
import type { AnalyzeResumeOutput } from "../src/tools/analyze-resume";

// ---------------------------------------------------------------------------
// MCP Server Implementation
// ---------------------------------------------------------------------------

// Minimal MCP server over stdio
// In production, you would use the @modelcontextprotocol/sdk package

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  handler: (args: Record<string, any>) => Promise<Record<string, any>>;
}

const tools: MCPTool[] = [
  {
    name: "parse_resume",
    description: `Parse a resume (PDF file or raw text) using the 4-step OpenResume algorithm:
1. Extract text items from PDF
2. Group text items into lines
3. Group lines into sections
4. Extract resume attributes using feature scoring

Returns structured resume data including profile, education, experience, skills, and projects.`,
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the resume PDF file",
        },
        rawText: {
          type: "string",
          description: "Raw resume text (use if PDF is not available)",
        },
      },
    },
    handler: async (args) => {
      const result = parseResume({
        filePath: args.filePath,
        rawText: args.rawText,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  },
  {
    name: "analyze_resume",
    description: `Parse a resume and compute an ATS (Application Tracking System) compatibility score.

Returns:
- ATS compatibility score (0-100) and grade
- Per-field extraction confidence ratings
- Section detection analysis
- Format issues grouped by severity (critical/high/medium/low)`,
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the resume PDF file",
        },
        rawText: {
          type: "string",
          description: "Raw resume text (use if PDF is not available)",
        },
        strictness: {
          type: "string",
          enum: ["lenient", "moderate", "strict"],
          description: "ATS scoring strictness level (default: moderate)",
        },
      },
    },
    handler: async (args) => {
      // First parse
      const parsed = parseResume({
        filePath: args.filePath,
        rawText: args.rawText,
      });

      // Then analyze
      const result = analyzeResume({
        filePath: args.filePath,
        rawText: args.rawText,
        parsedResume: parsed.data,
        strictness: args.strictness || "moderate",
      });

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  },
  {
    name: "suggest_improvements",
    description: `Parse a resume, analyze it, and generate actionable improvement suggestions.

Returns:
- ATS compatibility score and grade
- Prioritized list of suggestions (critical → low)
- Quick wins for immediate fixes
- Section-by-section analysis and recommendations
- Long-term improvement advice`,
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the resume PDF file",
        },
        rawText: {
          type: "string",
          description: "Raw resume text (use if PDF is not available)",
        },
        focusAreas: {
          type: "array",
          items: {
            type: "string",
            enum: ["ats", "content", "formatting", "structure"],
          },
          description: "Areas to focus suggestions on (default: all)",
        },
      },
    },
    handler: async (args) => {
      // Full pipeline
      const parsed = parseResume({
        filePath: args.filePath,
        rawText: args.rawText,
      });

      const analyzed = analyzeResume({
        filePath: args.filePath,
        rawText: args.rawText,
        parsedResume: parsed.data,
        strictness: "moderate",
      });

      const result = suggestImprovements({
        filePath: args.filePath,
        rawText: args.rawText,
        parsedResume: parsed.data,
        analysisResult: analyzed.data,
        focusAreas: args.focusAreas || ["ats", "content", "formatting", "structure"],
      });

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  },
];

// ---------------------------------------------------------------------------
// Stdio MCP Server
// ---------------------------------------------------------------------------

async function handleRequest(request: any): Promise<any> {
  const { method, params, id } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "resume-parser",
            version: "1.0.0",
          },
        },
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      };

    case "tools/call": {
      const toolName = params?.name;
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        };
      }
      try {
        const result = await tool.handler(params?.arguments || {});
        return { jsonrpc: "2.0", id, result };
      } catch (error: any) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32603, message: error.message },
        };
      }
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Unknown method: ${method}` },
      };
  }
}

// Main loop: read JSON-RPC from stdin, write to stdout
async function main() {
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin });

  let buffer = "";

  rl.on("line", (line) => {
    buffer += line + "\n";

    // Try to parse as JSON-RPC request
    try {
      const request = JSON.parse(buffer.trim());
      buffer = "";

      handleRequest(request).then((response) => {
        process.stdout.write(JSON.stringify(response) + "\n");
      });
    } catch {
      // Not a complete JSON yet, keep buffering
    }
  });

  rl.on("close", () => {
    process.exit(0);
  });

  // Log to stderr so it doesn't interfere with MCP protocol on stdout
  process.stderr.write("Resume Parser MCP Server running on stdio\n");
  process.stderr.write(`Available tools: ${tools.map((t) => t.name).join(", ")}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message}\n`);
  process.exit(1);
});