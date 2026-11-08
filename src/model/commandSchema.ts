import { z } from 'zod';
import type { Command } from './commands';
import { SECTION_TYPES } from './schema';

/**
 * Runtime shape check for Commands that come from outside the editor (the AI
 * assistant, imported scripts). It checks structure only: which fields exist
 * and their basic types. Value ranges and cross-references are then enforced
 * by applyCommand, which validates the whole resulting project.
 */
const id = z.string().regex(/^[a-z]+_[a-z0-9]+$/);
const at = { pageId: id, sectionId: id };
const loose = z.record(z.string(), z.unknown());

export const commandSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('renameProject'), name: z.string().min(1).max(120) }),
  z.object({ kind: z.literal('updateMeta'), patch: loose }),
  z.object({ kind: z.literal('addSection'), pageId: id, sectionType: z.enum(SECTION_TYPES), index: z.number().int().min(0).optional() }),
  z.object({ kind: z.literal('removeSection'), ...at }),
  z.object({ kind: z.literal('duplicateSection'), ...at }),
  z.object({ kind: z.literal('moveSection'), ...at, toIndex: z.number().int().min(0) }),
  z.object({ kind: z.literal('renameSection'), ...at, name: z.string().min(1).max(80) }),
  z.object({ kind: z.literal('updateContent'), ...at, patch: loose }),
  z.object({ kind: z.literal('updateItem'), ...at, itemId: id, patch: loose }),
  z.object({ kind: z.literal('addItem'), ...at }),
  z.object({ kind: z.literal('removeItem'), ...at, itemId: id }),
  z.object({ kind: z.literal('updateStyle'), ...at, patch: loose }),
  z.object({ kind: z.literal('addAnimation'), ...at, animationType: z.enum(['parallax', 'reveal', 'horizontal']) }),
  z.object({ kind: z.literal('removeAnimation'), ...at, animationId: id }),
  z.object({ kind: z.literal('updateAnimation'), ...at, animationId: id, enabled: z.boolean().optional(), settings: loose.optional() }),
  z.object({ kind: z.literal('setElementAnimation'), ...at, element: z.string().max(80), enabled: z.boolean().optional(), settings: loose.optional(), remove: z.boolean().optional() }),
  z.object({ kind: z.literal('updateTheme'), patch: loose }),
  z.object({ kind: z.literal('replaceTheme'), theme: loose }),
]);

export type ParsedCommand = { ok: true; command: Command } | { ok: false; error: string };

/** Parses one command from untrusted JSON text. Never throws. */
export function parseCommand(text: string): ParsedCommand {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'not valid JSON' };
  }
  const result = commandSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return { ok: false, error: `invalid command at ${issue.path.join('.') || 'root'}: ${issue.message}` };
  }
  // Shape is checked here; values are checked when applyCommand validates the resulting project.
  return { ok: true, command: result.data as unknown as Command };
}
