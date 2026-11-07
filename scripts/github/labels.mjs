// Creates or updates the repository's labels with the GitHub CLI.
// Dry run by default. Requires `gh auth login` with access to the repository.
//   node scripts/github/labels.mjs            (prints what it would do)
//   node scripts/github/labels.mjs --apply    (creates or updates labels)
import { execFileSync } from 'node:child_process';

const REPO = 'JOKAIR99/Dynaweb';

export const LABELS = [
  // Contribution categories
  ['frontend', '1d76db', 'Editor UI and client-side code'],
  ['backend', '5319e7', 'Server-side code: publishing, storage, AI service'],
  ['ai-integration', '8a2be2', 'AI design assistant and the command contract'],
  ['ui-ux', 'd876e3', 'Editor usability and interaction design'],
  ['design', 'e99695', 'Visual design: presets, typography, colour, layout'],
  ['animation', 'fbca04', 'Any animation work'],
  ['animation-engine', 'f9d0c4', 'Shared animation runtime'],
  ['parallax', 'fef2c0', 'Parallax depth effects'],
  ['scroll-reveal', 'fef2c0', 'Scroll-triggered animations'],
  ['horizontal-scroll', 'fef2c0', 'Horizontal scrolling sections'],
  ['templates', 'c2e0c6', 'Section types, components and templates'],
  ['documentation', '0075ca', 'Docs and guides'],
  ['testing', 'bfd4f2', 'Tests and quality assurance'],
  ['performance', 'b60205', 'Speed, bundle size, runtime cost'],
  ['accessibility', '0e8a16', 'Keyboard, screen readers, contrast, reduced motion'],
  // Workflow
  ['good first issue', '7057ff', 'Good for newcomers'],
  ['help wanted', '008672', 'Extra attention is needed'],
  ['bug', 'd73a4a', 'Something is not working'],
  ['enhancement', 'a2eeef', 'New feature or request'],
  ['security', 'ee0701', 'Security hardening (report vulnerabilities privately)'],
  ['needs review', 'ededed', 'Waiting for maintainer triage'],
  ['dependencies', '0366d6', 'Dependency updates'],
  // Difficulty
  ['difficulty: easy', 'c5def5', 'A few hours, little context needed'],
  ['difficulty: medium', '9fc5e8', 'A day or two, some context needed'],
  ['difficulty: hard', '6fa8dc', 'Several days, design discussion likely'],
];

const apply = process.argv.includes('--apply');
for (const [name, color, description] of LABELS) {
  const args = ['label', 'create', name, '--repo', REPO, '--color', color, '--description', description, '--force'];
  if (!apply) { console.warn(`[dry run] gh ${args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`); continue; }
  execFileSync('gh', args, { stdio: 'inherit' });
}
if (!apply) console.warn(`\n${LABELS.length} labels. Re-run with --apply to create them.`);
