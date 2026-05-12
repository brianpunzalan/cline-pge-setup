import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Plan, GeneratedCode, GenerationFeedback } from "../types.js";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = readFileSync(
  join(__dirname, "prompts/generator.md"),
  "utf-8"
);

const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.enum(["tsx", "ts", "css", "scss"]),
});

const GeneratedCodeSchema = z.object({
  files: z.array(GeneratedFileSchema).min(1),
  entryPoint: z.string(),
});

export async function runGenerator(
  client: Anthropic,
  model: string,
  plan: Plan,
  feedback?: GenerationFeedback
): Promise<GeneratedCode> {
  const userMessage = buildUserMessage(plan, feedback);

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]+?)```/) ?? [null, text];
  const raw = jsonMatch[1]?.trim() ?? text.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Generator returned invalid JSON:\n${raw.slice(0, 500)}`);
  }

  const result = GeneratedCodeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Generator output failed schema validation:\n${result.error.message}`);
  }

  return result.data;
}

function buildUserMessage(plan: Plan, feedback?: GenerationFeedback): string {
  const parts: string[] = [
    "## Component Plan\n\n```json\n" + JSON.stringify(plan, null, 2) + "\n```",
  ];

  if (feedback) {
    parts.push(
      `## Evaluation Feedback (Attempt ${feedback.attempt})\n\n` +
      "The previous generation had the following design system violations.\n" +
      "Fix ALL of them in this new attempt.\n\n" +
      feedback.evaluation.feedback
    );

    parts.push(
      "## Previous Code (for reference)\n\n" +
      feedback.previousCode.files
        .map(f => `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
        .join("\n\n")
    );
  }

  return parts.join("\n\n---\n\n");
}
