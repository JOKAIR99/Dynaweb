import { projectSchema } from './schema';
import type {
  Animation, AnimationType, Page, Project, Section, SectionContent, SectionStyle, SectionType, Theme,
} from './schema';
import { createAnimation, createSection } from './defaults';
import type { IdGenerator } from './ids';

/**
 * Every edit to a project is a Command. The editor UI, and later the AI
 * assistant, only ever produce Commands; `applyCommand` is the single
 * deterministic place that changes a project. Results are validated against
 * the schema, so an invalid command can never corrupt a project.
 */
export type Command =
  | { kind: 'renameProject'; name: string }
  | { kind: 'addSection'; pageId: string; sectionType: SectionType; index?: number }
  | { kind: 'removeSection'; pageId: string; sectionId: string }
  | { kind: 'duplicateSection'; pageId: string; sectionId: string }
  | { kind: 'moveSection'; pageId: string; sectionId: string; toIndex: number }
  | { kind: 'renameSection'; pageId: string; sectionId: string; name: string }
  | { kind: 'updateContent'; pageId: string; sectionId: string; patch: Partial<SectionContent> }
  | { kind: 'updateItem'; pageId: string; sectionId: string; itemId: string; patch: { title?: string; text?: string; imageUrl?: string } }
  | { kind: 'addItem'; pageId: string; sectionId: string }
  | { kind: 'removeItem'; pageId: string; sectionId: string; itemId: string }
  | { kind: 'updateStyle'; pageId: string; sectionId: string; patch: Partial<SectionStyle> }
  | { kind: 'addAnimation'; pageId: string; sectionId: string; animationType: AnimationType }
  | { kind: 'removeAnimation'; pageId: string; sectionId: string; animationId: string }
  | { kind: 'updateAnimation'; pageId: string; sectionId: string; animationId: string; enabled?: boolean; settings?: Record<string, unknown> }
  | { kind: 'updateTheme'; patch: Partial<Omit<Theme, 'colors' | 'fonts'>> & { colors?: Partial<Theme['colors']>; fonts?: Partial<Theme['fonts']> } }
  | { kind: 'replaceTheme'; theme: Theme };

export type CommandResult = { ok: true; project: Project } | { ok: false; error: string };

class CommandError extends Error {}

function fail(message: string): never {
  throw new CommandError(message);
}

function mapPage(project: Project, pageId: string, fn: (page: Page) => Page): Project {
  if (!project.pages.some((p) => p.id === pageId)) fail(`page not found: ${pageId}`);
  return { ...project, pages: project.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

function mapSection(project: Project, pageId: string, sectionId: string, fn: (s: Section) => Section): Project {
  return mapPage(project, pageId, (page) => {
    if (!page.sections.some((s) => s.id === sectionId)) fail(`section not found: ${sectionId}`);
    return { ...page, sections: page.sections.map((s) => (s.id === sectionId ? fn(s) : s)) };
  });
}

/** Horizontal scroll and parallax both own the section's scroll transform; they cannot coexist. */
const EXCLUSIVE: Record<AnimationType, AnimationType[]> = { parallax: ['horizontal'], horizontal: ['parallax'], reveal: [] };

function reIdSection(section: Section, ids: IdGenerator): Section {
  return {
    ...section,
    id: ids('sec'),
    name: `${section.name} copy`,
    content: { ...section.content, items: section.content.items.map((i) => ({ ...i, id: ids('item') })) },
    animations: section.animations.map((a) => {
      const copy = { ...a, id: ids('anim') } as Animation;
      if (copy.type === 'parallax') {
        return { ...copy, settings: { ...copy.settings, layers: copy.settings.layers.map((l) => ({ ...l, id: ids('layer') })) } };
      }
      return copy;
    }),
  };
}

function reduce(project: Project, cmd: Command, ids: IdGenerator): Project {
  switch (cmd.kind) {
    case 'renameProject':
      return { ...project, name: cmd.name };

    case 'addSection':
      return mapPage(project, cmd.pageId, (page) => {
        const sections = [...page.sections];
        const at = cmd.index === undefined ? sections.length : Math.max(0, Math.min(cmd.index, sections.length));
        sections.splice(at, 0, createSection(cmd.sectionType, ids));
        return { ...page, sections };
      });

    case 'removeSection':
      return mapPage(project, cmd.pageId, (page) => {
        if (!page.sections.some((s) => s.id === cmd.sectionId)) fail(`section not found: ${cmd.sectionId}`);
        return { ...page, sections: page.sections.filter((s) => s.id !== cmd.sectionId) };
      });

    case 'duplicateSection':
      return mapPage(project, cmd.pageId, (page) => {
        const index = page.sections.findIndex((s) => s.id === cmd.sectionId);
        if (index < 0) fail(`section not found: ${cmd.sectionId}`);
        const sections = [...page.sections];
        sections.splice(index + 1, 0, reIdSection(page.sections[index], ids));
        return { ...page, sections };
      });

    case 'moveSection':
      return mapPage(project, cmd.pageId, (page) => {
        const from = page.sections.findIndex((s) => s.id === cmd.sectionId);
        if (from < 0) fail(`section not found: ${cmd.sectionId}`);
        const to = Math.max(0, Math.min(cmd.toIndex, page.sections.length - 1));
        const sections = [...page.sections];
        const [moved] = sections.splice(from, 1);
        sections.splice(to, 0, moved);
        return { ...page, sections };
      });

    case 'renameSection':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({ ...s, name: cmd.name }));

    case 'updateContent':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({ ...s, content: { ...s.content, ...cmd.patch } }));

    case 'updateItem':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => {
        if (!s.content.items.some((i) => i.id === cmd.itemId)) fail(`item not found: ${cmd.itemId}`);
        return { ...s, content: { ...s.content, items: s.content.items.map((i) => (i.id === cmd.itemId ? { ...i, ...cmd.patch } : i)) } };
      });

    case 'addItem':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({
        ...s,
        content: { ...s.content, items: [...s.content.items, { id: ids('item'), title: '[New item]', text: '', imageUrl: '' }] },
      }));

    case 'removeItem':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({
        ...s, content: { ...s.content, items: s.content.items.filter((i) => i.id !== cmd.itemId) },
      }));

    case 'updateStyle':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({ ...s, style: { ...s.style, ...cmd.patch } }));

    case 'addAnimation':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => {
        if (s.animations.some((a) => a.type === cmd.animationType)) fail(`section already has a ${cmd.animationType} animation`);
        const clash = s.animations.find((a) => EXCLUSIVE[cmd.animationType].includes(a.type));
        if (clash) fail(`${cmd.animationType} cannot be combined with ${clash.type} on the same section`);
        return { ...s, animations: [...s.animations, createAnimation(cmd.animationType, ids)] };
      });

    case 'removeAnimation':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => ({ ...s, animations: s.animations.filter((a) => a.id !== cmd.animationId) }));

    case 'updateAnimation':
      return mapSection(project, cmd.pageId, cmd.sectionId, (s) => {
        if (!s.animations.some((a) => a.id === cmd.animationId)) fail(`animation not found: ${cmd.animationId}`);
        return {
          ...s,
          animations: s.animations.map((a) =>
            a.id === cmd.animationId
              ? ({ ...a, enabled: cmd.enabled ?? a.enabled, settings: { ...a.settings, ...(cmd.settings ?? {}) } } as Animation)
              : a,
          ),
        };
      });

    case 'updateTheme': {
      const { colors, fonts, ...rest } = cmd.patch;
      const theme = project.theme;
      return { ...project, theme: { ...theme, ...rest, colors: { ...theme.colors, ...colors }, fonts: { ...theme.fonts, ...fonts } } };
    }

    case 'replaceTheme':
      return { ...project, theme: cmd.theme };
  }
}

export function applyCommand(project: Project, cmd: Command, ids: IdGenerator, now: () => string = () => new Date().toISOString()): CommandResult {
  let next: Project;
  try {
    next = reduce(project, cmd, ids);
  } catch (err) {
    if (err instanceof CommandError) return { ok: false, error: err.message };
    throw err;
  }
  const parsed = projectSchema.safeParse({ ...next, updatedAt: now() });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `invalid result at ${issue.path.join('.')}: ${issue.message}` };
  }
  return { ok: true, project: parsed.data };
}
