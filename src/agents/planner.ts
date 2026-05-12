import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { UIRequest, Plan } from "../types.js";
import { PlanSchema } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SYSTEM_PROMPT = readFileSync(
  join(__dirname, "prompts/planner.md"),
  "utf-8"
);

export async function runPlanner(
  client: Anthropic,
  model: string,
  request: UIRequest
): Promise<Plan> {
  const userMessage = [
    `## UI Request\n\n${request.description}`,
    request.context ? `## Context\n\n${request.context}` : null,
    request.existingCode
      ? `## Existing Code (to be modified)\n\n\`\`\`tsx\n${request.existingCode}\n\`\`\``
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("");

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]+?)```/) ?? [null, text];
  const raw = jsonMatch[1]?.trim() ?? text.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Planner returned invalid JSON:\n${raw.slice(0, 500)}`);
  }

  const result = PlanSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Planner output failed schema validation:\n${result.error.message}`);
  }

  return result.data;
}
