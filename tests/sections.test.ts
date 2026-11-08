import { describe, expect, it } from 'vitest';
import { planSections } from '../src/generator/generate';
import { createSection } from '../src/model/defaults';
import { createSequentialIds } from '../src/model/ids';
import { SECTION_TYPES, SECTION_VARIANTS, validateProject } from '../src/model/schema';
import { renderPage, renderSection } from '../src/render/html';
import { sampleMeta, sampleProject } from './helpers';

const ids = createSequentialIds(9000);

describe('new section types', () => {
  it('every section type has defaults that validate and at least two layouts', () => {
    for (const type of SECTION_TYPES) {
      const section = createSection(type, ids);
      const p = sampleProject();
      const project = { ...p, pages: [{ ...p.pages[0], sections: [section] }] };
      expect(validateProject(project).ok, type).toBe(true);
      expect(SECTION_VARIANTS[type].length, type).toBeGreaterThanOrEqual(2);
    }
  });

  it('statistics never ship an invented number', () => {
    const stats = createSection('statistics', ids);
    stats.content.items.forEach((i) => expect(i.title).toMatch(/^\[Figure \d\]$/));
    const html = renderSection(stats);
    expect(html).toContain('<dl class="dw-grid dw-stats">');
    expect(html).toMatch(/<dt class="dw-muted">\[What the figure measures\]<\/dt><dd>\[Figure 1\]<\/dd>/);
  });

  it('renders team members as a list with photo slots', () => {
    const html = renderSection(createSection('team', ids));
    expect(html).toContain('<ul class="dw-grid dw-team">');
    expect((html.match(/<li class="dw-person"/g) ?? []).length).toBe(3);
  });

  it('renders a product showcase with its call to action', () => {
    const html = renderSection(createSection('showcase', ids));
    expect((html.match(/<article class="dw-card dw-product"/g) ?? []).length).toBe(3);
    expect(html).toContain('<a class="dw-btn" data-dw-el="primary" href="#">[Shop or order]</a>'); // placeholder link is neutralised
  });
});

describe('planner rules for the new sections', () => {
  it('uses a product showcase when the goal is sales', () => {
    const plan = planSections(sampleMeta({ goal: 'sales', brief: '' }));
    expect(plan).toContain('showcase');
    expect(plan).not.toContain('features');
  });

  it('adds a team section when the brief talks about people', () => {
    expect(planSections(sampleMeta({ brief: 'meet our team' }))).toContain('team');
    expect(planSections(sampleMeta({ brief: '' }))).not.toContain('team');
  });

  it('adds key figures only when asked', () => {
    expect(planSections(sampleMeta({ brief: 'show key figures' }))).toContain('statistics');
    expect(planSections(sampleMeta({ brief: '' }))).not.toContain('statistics');
  });

  it('renders a complete generated sales site', () => {
    const p = sampleProject('our team and key figures', 2, { goal: 'sales' }, 'planned');
    const html = renderPage(p, { mode: 'export', runtimeJs: '' });
    for (const anchor of ['statistics', 'showcase', 'team', 'contact']) expect(html).toContain(`id="${anchor}"`);
  });
});
