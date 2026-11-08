import { describe, expect, it } from 'vitest';
import { MAX_COMMANDS, MAX_REQUEST_CHARS, handleAssist, runAssist } from '../server/assist';
import type { AssistOutputT, ModelCall } from '../server/assist';
import { parseCommand } from '../src/model/commandSchema';
import { createSequentialIds } from '../src/model/ids';
import { sampleProject } from './helpers';

/** A fake model: records what it was asked and returns a canned answer. No network, no cost. */
function fakeModel(answer: Partial<AssistOutputT> | null, stopReason: string | null = 'end_turn') {
  const calls: { system: string; user: string }[] = [];
  const call: ModelCall = async (args) => {
    calls.push(args);
    return {
      parsed: answer === null ? null : { summary: 'ok', commands: [], missingFacts: [], needsIntegration: [], ...answer },
      stopReason,
      model: 'claude-opus-5-5',
    };
  };
  return { call, calls };
}

const project = sampleProject();
const page = project.pages[0];
const hero = page.sections.find((s) => s.type === 'hero')!;
const ids = createSequentialIds(9900);

describe('command parsing', () => {
  it('accepts a well-formed command and rejects bad JSON, unknown kinds and bad ids', () => {
    expect(parseCommand(JSON.stringify({ kind: 'renameProject', name: 'New' })).ok).toBe(true);
    expect(parseCommand('{not json')).toEqual({ ok: false, error: 'not valid JSON' });
    expect(parseCommand(JSON.stringify({ kind: 'deleteEverything' })).ok).toBe(false);
    expect(parseCommand(JSON.stringify({ kind: 'removeSection', pageId: 'page_x', sectionId: 'DROP TABLE' })).ok).toBe(false);
  });
});

describe('runAssist', () => {
  it('sends the master prompt, the project and the request, and returns validated proposals', async () => {
    const { call, calls } = fakeModel({
      summary: 'Sharper hero',
      commands: [
        JSON.stringify({ kind: 'updateContent', pageId: page.id, sectionId: hero.id, patch: { heading: '[A sharper headline]' } }),
        JSON.stringify({ kind: 'addAnimation', pageId: page.id, sectionId: hero.id, animationType: 'reveal' }),
      ],
      missingFacts: ['Opening hours'],
    });
    const result = await runAssist({ project, request: 'Make the hero sharper' }, call, ids);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposals.map((p) => p.ok)).toEqual([true, true]);
    expect(result.missingFacts).toEqual(['Opening hours']);
    expect(calls[0].system).toContain('Dynaweb is not specialised in any industry');
    expect(calls[0].system).toContain('Each entry of "commands" is one Dynaweb command');
    expect(calls[0].user).toContain(`"id":"${hero.id}"`);
    expect(calls[0].user).toContain('OWNER REQUEST\nMake the hero sharper');
  });

  it('rejects invalid commands but keeps the valid ones, applied in order', async () => {
    const { call } = fakeModel({
      commands: [
        'not json at all',
        JSON.stringify({ kind: 'removeSection', pageId: page.id, sectionId: 'sec_doesnotexist' }),
        JSON.stringify({ kind: 'updateStyle', pageId: page.id, sectionId: hero.id, patch: { paddingY: 99999 } }),
        JSON.stringify({ kind: 'updateStyle', pageId: page.id, sectionId: hero.id, patch: { paddingY: 40 } }),
        // Hero already has a parallax animation in the sample, so a second one is refused by the model rules.
        JSON.stringify({ kind: 'addAnimation', pageId: page.id, sectionId: hero.id, animationType: 'parallax' }),
      ],
    });
    const result = await runAssist({ project, request: 'Tidy up' }, call, ids);
    if (!result.ok) throw new Error(result.error);
    expect(result.proposals.map((p) => p.ok)).toEqual([false, false, false, true, false]);
    expect(result.proposals[0].error).toBe('not valid JSON');
    expect(result.proposals[1].error).toContain('section not found');
    expect(result.proposals[2].error).toContain('invalid result');
  });

  it('caps the number of commands', async () => {
    const one = JSON.stringify({ kind: 'renameProject', name: 'X' });
    const { call } = fakeModel({ commands: Array.from({ length: MAX_COMMANDS + 5 }, () => one) });
    const result = await runAssist({ project, request: 'Rename a lot' }, call, ids);
    if (!result.ok) throw new Error(result.error);
    expect(result.proposals).toHaveLength(MAX_COMMANDS + 1);
    expect(result.proposals.at(-1)?.error).toContain(`first ${MAX_COMMANDS}`);
  });

  it('reports refusals, cut-off answers and unreadable answers honestly', async () => {
    expect(await runAssist({ project, request: 'x' }, fakeModel({}, 'refusal').call)).toMatchObject({ ok: false, status: 422 });
    expect(await runAssist({ project, request: 'x' }, fakeModel({}, 'max_tokens').call)).toMatchObject({ ok: false, status: 502 });
    expect(await runAssist({ project, request: 'x' }, fakeModel(null).call)).toMatchObject({ ok: false, status: 502 });
  });

  it('validates the request and the project before calling the model', async () => {
    const { call, calls } = fakeModel({});
    expect(await runAssist({ project, request: '   ' }, call)).toMatchObject({ ok: false, status: 400 });
    expect(await runAssist({ project, request: 'x'.repeat(MAX_REQUEST_CHARS + 1) }, call)).toMatchObject({ ok: false, status: 400 });
    expect(await runAssist({ project: { name: 'fake' }, request: 'hi' }, call)).toMatchObject({ ok: false, status: 400 });
    expect(calls).toHaveLength(0);
  });

  it('turns unexpected model errors into a generic message', async () => {
    const failing: ModelCall = async () => { throw new Error('secret internal detail'); };
    const result = await runAssist({ project, request: 'hi' }, failing);
    expect(result).toEqual({ ok: false, status: 500, error: 'Unexpected error in the assistant.' });
  });
});

describe('handleAssist', () => {
  it('rejects a body that is not JSON without calling anything', async () => {
    expect(await handleAssist('<html>')).toMatchObject({ status: 400 });
  });
});

describe('missing credentials', () => {
  it('explains how to configure the key instead of a generic error', async () => {
    const noKey: ModelCall = async () => { throw new Error('Could not resolve authentication method. Expected one of apiKey, authToken...'); };
    const result = await runAssist({ project, request: 'hi' }, noKey);
    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(!result.ok && result.error).toContain('ANTHROPIC_API_KEY');
  });
});

describe('chat mode (no API key)', () => {
  it('builds one self-contained prompt with the rules, the project and the request', async () => {
    const { buildChatPrompt } = await import('../src/ai/proposals');
    const prompt = buildChatPrompt(project, 'Add a video section');
    expect(prompt).toContain('Dynaweb is not specialised in any industry');
    expect(prompt).toContain('ANSWER FORMAT FOR THIS CHAT');
    expect(prompt).toContain(`"id":"${hero.id}"`);
    expect(prompt.trimEnd().endsWith('OWNER REQUEST\nAdd a video section')).toBe(true);
  });

  it('reads an answer wrapped in a code fence with chatty text around it, commands as objects', async () => {
    const { parseAssistAnswer, validateProposals } = await import('../src/ai/proposals');
    const pasted = `Sure! Here are the changes:\n\n\`\`\`json\n${JSON.stringify({
      summary: 'Adds a video section',
      commands: [{ kind: 'addSection', pageId: page.id, sectionType: 'media', index: 2 }, { kind: 'renameProject', name: '' }],
      missingFacts: ['Link to the video'],
    })}\n\`\`\`\n\nLet me know if you want more.`;
    const parsed = parseAssistAnswer(pasted);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.output.needsIntegration).toEqual([]);
    const proposals = validateProposals(project, parsed.output.commands, ids);
    expect(proposals.map((p) => p.ok)).toEqual([true, false]); // an empty project name is rejected
  });

  it('explains what is wrong with an unusable answer', async () => {
    const { parseAssistAnswer } = await import('../src/ai/proposals');
    expect(parseAssistAnswer('I cannot help with that.')).toMatchObject({ ok: false, error: expect.stringContaining('No JSON object') });
    expect(parseAssistAnswer('```json\n{"summary": "x", "commands": [\n```')).toMatchObject({ ok: false, error: expect.stringContaining('looks incomplete') });
    expect(parseAssistAnswer('{"summary": "x", "commands": [,]}')).toMatchObject({ ok: false, error: expect.stringContaining('not valid JSON') });
    expect(parseAssistAnswer('{"summary": "x"}')).toMatchObject({ ok: false, error: expect.stringContaining('expected fields') });
  });
});
