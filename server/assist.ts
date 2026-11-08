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
import { AssistOutput, MAX_REQUEST_CHARS, buildPromptParts, validateProposals } from '../src/ai/proposals';
import type { AssistOutputT, Proposal } from '../src/ai/proposals';
import { createRandomIds } from '../src/model/ids';
import type { IdGenerator } from '../src/model/ids';
import { validateProject } from '../src/model/schema';

export const MODEL = process.env.DYNAWEB_AI_MODEL || 'claude-opus-5-5';
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORTS)[number];
const EFFORT: Effort = (EFFORTS as readonly string[]).includes(process.env.DYNAWEB_AI_EFFORT ?? '') ? (process.env.DYNAWEB_AI_EFFORT as Effort) : 'medium';

export { MAX_COMMANDS, MAX_REQUEST_CHARS } from '../src/ai/proposals';
export type { AssistOutputT, Proposal } from '../src/ai/proposals';

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

export type AssistResult =
  | { ok: true; summary: string; proposals: Proposal[]; missingFacts: string[]; needsIntegration: string[]; model: string }
  | { ok: false; status: number; error: string };

export async function runAssist(input: { project: unknown; request: unknown }, call: ModelCall, ids: IdGenerator = createRandomIds()): Promise<AssistResult> {
  if (typeof input.request !== 'string' || !input.request.trim()) return { ok: false, status: 400, error: 'Describe what you want to change.' };
  if (input.request.length > MAX_REQUEST_CHARS) return { ok: false, status: 400, error: `Requests are limited to ${MAX_REQUEST_CHARS} characters.` };
  const checked = validateProject(input.project);
  if (!checked.ok) return { ok: false, status: 400, error: `The project could not be read: ${checked.errors[0]}` };
  const project = checked.project;

  let answer: Awaited<ReturnType<ModelCall>>;
  try {
    answer = await call(buildPromptParts(project, input.request));
  } catch (err) {
    return describeError(err);
  }
  if (answer.stopReason === 'refusal') return { ok: false, status: 422, error: 'The assistant declined this request. Try rephrasing it.' };
  if (answer.stopReason === 'max_tokens') return { ok: false, status: 502, error: 'The answer was too long and got cut off. Try a smaller request.' };
  if (!answer.parsed) return { ok: false, status: 502, error: 'The assistant answer could not be read. Please try again.' };

  const proposals = validateProposals(project, answer.parsed.commands, ids);
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
