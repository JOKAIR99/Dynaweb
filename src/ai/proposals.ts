import { z } from 'zod';
import { buildMasterPrompt } from './masterPrompt';
import { applyCommand } from '../model/commands';
import type { Command } from '../model/commands';
import { parseCommand } from '../model/commandSchema';
import type { IdGenerator } from '../model/ids';
import type { Project } from '../model/schema';

/**
 * Shared by both ways of using the AI assistant:
 * - chat mode (no API key): the owner copies a prompt into their own Claude
 *   chat and pastes the answer back; everything runs in the browser.
 * - server mode (optional): server/assist.ts calls the API with a key.
 * Either way, every proposed command is validated here before it is shown.
 */
export const MAX_REQUEST_CHARS = 2000;
export const MAX_COMMANDS = 50;
export const MAX_ANSWER_CHARS = 200_000;

/** The answer format. Commands may be JSON strings (server structured output) or objects (chat answers). */
export const AssistOutput = z.object({
  summary: z.string().describe('One or two sentences: what these changes do, in the owner language.'),
  commands: z.array(z.string()).describe('Dynaweb commands, each one a JSON object encoded as a string, in the order to apply them.'),
  missingFacts: z.array(z.string()).describe('Real facts the owner still has to provide (never invent them).'),
  needsIntegration: z.array(z.string()).describe('Requested functionality that needs an external service or credentials.'),
});
export type AssistOutputT = z.infer<typeof AssistOutput>;

const PastedAnswer = z.object({
  summary: z.string().default(''),
  commands: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])),
  missingFacts: z.array(z.string()).default([]),
  needsIntegration: z.array(z.string()).default([]),
});

export interface Proposal {
  /** The command as the model wrote it (JSON text), for display and debugging. */
  raw: string;
  /** The parsed command when it is valid and applies cleanly on top of the earlier accepted ones. */
  command: Command | null;
  ok: boolean;
  error?: string;
}

/** The project as the model sees it: everything needed to address sections, items and animations by id. */
export function describeProject(project: Project): string {
  return JSON.stringify({
    name: project.name,
    meta: project.meta,
    theme: project.theme,
    pages: project.pages.map((page) => ({
      id: page.id,
      title: page.title,
      sections: page.sections.map((s) => ({
        id: s.id, type: s.type, name: s.name, content: s.content, style: s.style,
        animations: s.animations, elementAnimations: s.elementAnimations,
      })),
    })),
  });
}

export const COMMAND_RULES = `
Answer only through the required JSON structure. Each entry of "commands" is one Dynaweb command encoded as a JSON string, for example:
"{\\"kind\\":\\"updateContent\\",\\"pageId\\":\\"page_x\\",\\"sectionId\\":\\"sec_y\\",\\"patch\\":{\\"heading\\":\\"[Your headline]\\"}}"
Use only ids that appear in the project JSON. Commands apply in order; a command may refer to a section added by an earlier one only if you know its id, so prefer editing existing sections. Keep [placeholders] for any fact the owner has not given and list those facts in "missingFacts".`;

export function buildPromptParts(project: Project, request: string): { system: string; user: string } {
  return {
    system: `${buildMasterPrompt(project)}\n${COMMAND_RULES}`,
    user: `PROJECT JSON\n${describeProject(project)}\n\nOWNER REQUEST\n${request.trim()}`,
  };
}

/** One self-contained prompt to paste into a Claude chat (no API key needed). */
export function buildChatPrompt(project: Project, request: string): string {
  const { system, user } = buildPromptParts(project, request);
  return `${system}

ANSWER FORMAT FOR THIS CHAT
Reply with exactly one JSON object inside a single \`\`\`json code block, and nothing else:
{"summary": "...", "commands": [ {...command...}, ... ], "missingFacts": ["..."], "needsIntegration": ["..."]}
Here each command may be written as a JSON object directly.

${user}`;
}

/** Reads an answer pasted from a chat: tolerant of code fences and surrounding text, strict on content. */
export function parseAssistAnswer(text: string): { ok: true; output: AssistOutputT } | { ok: false; error: string } {
  if (text.length > MAX_ANSWER_CHARS) return { ok: false, error: 'The answer is too long.' };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0) return { ok: false, error: 'No JSON object found in the answer. Paste the whole reply from Claude.' };
  if (end <= start) return { ok: false, error: 'The answer looks incomplete (it may have been cut off). Ask Claude to send the full JSON again.' };
  let raw: unknown;
  try {
    raw = JSON.parse(body.slice(start, end + 1));
  } catch {
    return { ok: false, error: 'The answer is not valid JSON. Ask Claude to reply with only the JSON block, then paste it again.' };
  }
  const parsed = PastedAnswer.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'The answer does not have the expected fields (summary, commands, missingFacts, needsIntegration).' };
  const a = parsed.data;
  return {
    ok: true,
    output: {
      summary: a.summary,
      commands: a.commands.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))),
      missingFacts: a.missingFacts,
      needsIntegration: a.needsIntegration,
    },
  };
}

/** Applies each command to a working copy; keeps the ones that validate, reports the rest with the reason. */
export function validateProposals(project: Project, commands: string[], ids: IdGenerator): Proposal[] {
  let working = project;
  const proposals: Proposal[] = commands.slice(0, MAX_COMMANDS).map((raw) => {
    const parsed = parseCommand(raw);
    if (!parsed.ok) return { raw, command: null, ok: false, error: parsed.error };
    const result = applyCommand(working, parsed.command, ids);
    if (!result.ok) return { raw, command: null, ok: false, error: result.error };
    working = result.project;
    return { raw, command: parsed.command, ok: true };
  });
  if (commands.length > MAX_COMMANDS) {
    proposals.push({ raw: '', command: null, ok: false, error: `Only the first ${MAX_COMMANDS} commands were considered.` });
  }
  return proposals;
}
