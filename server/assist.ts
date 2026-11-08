/// <reference types="node" />
/**
 * Dynaweb AI assistant, server side. This module runs only on the server
 * (the Vite dev server today, a hosted endpoint later): the Anthropic API key
 * is read from the environment here and never reaches the browser.
 *
 * Flow: the editor sends the project and a request in plain language. Claude
 * answers with Dynaweb commands (structured output). Every command is parsed,
 * shape-checked and applied to a copy of the project with applyCommand, so the
 * editor only ever receives proposals that are already validated, plus the
 * ones that were rejected and why. Nothing is applied until the owner accepts.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { buildMasterPrompt } from '../src/ai/masterPrompt';
import { applyCommand } from '../src/model/commands';
import type { Command } from '../src/model/commands';
import { parseCommand } from '../src/model/commandSchema';
import { createRandomIds } from '../src/model/ids';
import type { IdGenerator } from '../src/model/ids';
import { validateProject } from '../src/model/schema';
import type { Project } from '../src/model/schema';

export const MODEL = process.env.DYNAWEB_AI_MODEL || 'claude-opus-5-5';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];
const EFFORT: Effort = (EFFORTS as readonly string[]).includes(process.env.DYNAWEB_AI_EFFORT ?? '') ? (process.env.DYNAWEB_AI_EFFORT as Effort) : 'medium';

export const MAX_REQUEST_CHARS = 2000;
export const MAX_COMMANDS = 50;

/** What Claude must return. Each command is a JSON string so the outer schema stays simple and strict. */
export const AssistOutput = z.object({
  summary: z.string().describe('One or two sentences: what these changes do, in the owner language.'),
  commands: z.array(z.string()).describe('Dynaweb commands, each one a JSON object encoded as a string, in the order to apply them.'),
  missingFacts: z.array(z.string()).describe('Real facts the owner still has to provide (never invent them).'),
  needsIntegration: z.array(z.string()).describe('Requested functionality that needs an external service or credentials.'),
});
export type AssistOutputT = z.infer<typeof AssistOutput>;

/** The model call, injectable so tests never hit the network. */
export type ModelCall = (args: { system: string; user: string }) => Promise<{ parsed: AssistOutputT | null; stopReason: string | null; model: string }>;

export function anthropicModelCall(client: Anthropic = new Anthropic()): ModelCall {
  return async ({ system, user }) => {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Opus 5.5 always thinks adaptively; effort is the depth control (its default is medium, so set it explicitly).
      output_config: { effort: EFFORT, format: betaZodOutputFormat(AssistOutput) },
      // Server-side refusal fallback: a declined request is retried on a suitable model in the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: [{ role: 'user', content: user }],
    });
    return { parsed: response.parsed_output ?? null, stopReason: response.stop_reason, model: response.model };
  };
}

export interface Proposal {
  /** The command as Claude wrote it (JSON text), for display and debugging. */
  raw: string;
  /** The parsed command when it is valid and applies cleanly on top of the earlier accepted ones. */
  command: Command | null;
  ok: boolean;
  error?: string;
}

export type AssistResult =
  | { ok: true; summary: string; proposals: Proposal[]; missingFacts: string[]; needsIntegration: string[]; model: string }
  | { ok: false; status: number; error: string };

/** The project as Claude sees it: everything needed to address sections, items and animations by id. */
function describeProject(project: Project): string {
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

const COMMAND_RULES = `
Answer only through the required JSON structure. Each entry of "commands" is one Dynaweb command encoded as a JSON string, for example:
"{\\"kind\\":\\"updateContent\\",\\"pageId\\":\\"page_x\\",\\"sectionId\\":\\"sec_y\\",\\"patch\\":{\\"heading\\":\\"[Your headline]\\"}}"
Use only ids that appear in the project JSON. Commands apply in order; a command may refer to a section added by an earlier one only if you know its id, so prefer editing existing sections. Keep [placeholders] for any fact the owner has not given and list those facts in "missingFacts".`;

export async function runAssist(input: { project: unknown; request: unknown }, call: ModelCall, ids: IdGenerator = createRandomIds()): Promise<AssistResult> {
  if (typeof input.request !== 'string' || !input.request.trim()) return { ok: false, status: 400, error: 'Describe what you want to change.' };
  if (input.request.length > MAX_REQUEST_CHARS) return { ok: false, status: 400, error: `Requests are limited to ${MAX_REQUEST_CHARS} characters.` };
  const checked = validateProject(input.project);
  if (!checked.ok) return { ok: false, status: 400, error: `The project could not be read: ${checked.errors[0]}` };
  const project = checked.project;

  let answer: Awaited<ReturnType<ModelCall>>;
  try {
    answer = await call({
      system: `${buildMasterPrompt(project)}\n${COMMAND_RULES}`,
      user: `PROJECT JSON\n${describeProject(project)}\n\nOWNER REQUEST\n${input.request.trim()}`,
    });
  } catch (err) {
    return describeError(err);
  }
  if (answer.stopReason === 'refusal') return { ok: false, status: 422, error: 'The assistant declined this request. Try rephrasing it.' };
  if (answer.stopReason === 'max_tokens') return { ok: false, status: 502, error: 'The answer was too long and got cut off. Try a smaller request.' };
  if (!answer.parsed) return { ok: false, status: 502, error: 'The assistant answer could not be read. Please try again.' };

  // Apply each command to a working copy; keep the ones that validate, report the rest.
  let working = project;
  const proposals: Proposal[] = answer.parsed.commands.slice(0, MAX_COMMANDS).map((raw) => {
    const parsed = parseCommand(raw);
    if (!parsed.ok) return { raw, command: null, ok: false, error: parsed.error };
    const result = applyCommand(working, parsed.command, ids);
    if (!result.ok) return { raw, command: null, ok: false, error: result.error };
    working = result.project;
    return { raw, command: parsed.command, ok: true };
  });
  if (answer.parsed.commands.length > MAX_COMMANDS) {
    proposals.push({ raw: '', command: null, ok: false, error: `Only the first ${MAX_COMMANDS} commands were considered.` });
  }
  return {
    ok: true,
    summary: answer.parsed.summary,
    proposals,
    missingFacts: answer.parsed.missingFacts,
    needsIntegration: answer.parsed.needsIntegration,
    model: answer.model,
  };
}

const NOT_CONFIGURED: AssistResult = {
  ok: false, status: 503,
  error: 'The AI assistant is not configured. Set ANTHROPIC_API_KEY (or run "ant auth login") where the server runs, then restart it.',
};

/** Maps SDK errors to messages the owner can act on. Never includes the key or raw request. */
function describeError(err: unknown): AssistResult {
  if (err instanceof Anthropic.AuthenticationError) return { ok: false, status: 401, error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY on the server.' };
  if (err instanceof Anthropic.PermissionDeniedError) return { ok: false, status: 403, error: 'This API key cannot use the selected model.' };
  if (err instanceof Anthropic.RateLimitError) return { ok: false, status: 429, error: 'Too many requests right now. Wait a moment and try again.' };
  if (err instanceof Anthropic.BadRequestError) return { ok: false, status: 400, error: `The request was rejected: ${err.message}` };
  if (err instanceof Anthropic.APIConnectionError) return { ok: false, status: 503, error: 'Could not reach the Anthropic API. Check the internet connection.' };
  if (err instanceof Anthropic.APIError) return { ok: false, status: 502, error: `The Anthropic API returned an error (${err.status ?? 'unknown'}).` };
  // Missing credentials: the SDK (1.3.0) throws a plain Error with no typed class before any network call,
  // so this one documented message is the only reliable signal.
  if (err instanceof Error && err.message.startsWith('Could not resolve authentication method')) return NOT_CONFIGURED;
  return { ok: false, status: 500, error: 'Unexpected error in the assistant.' };
}

let sharedCall: ModelCall | null = null;

/**
 * HTTP-facing entry point: takes the raw request body, returns a status and JSON.
 * The client is created lazily so a missing key gives a clear message instead of crashing the server.
 */
export async function handleAssist(body: string): Promise<{ status: number; json: AssistResult }> {
  let input: { project: unknown; request: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return { status: 400, json: { ok: false, status: 400, error: 'Invalid request.' } };
  }
  if (!sharedCall) {
    try {
      sharedCall = anthropicModelCall(new Anthropic());
    } catch {
      return { status: 503, json: NOT_CONFIGURED };
    }
  }
  const json = await runAssist(input, sharedCall);
  return { status: json.ok ? 200 : json.status, json };
}
