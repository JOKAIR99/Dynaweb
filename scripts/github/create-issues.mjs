// Creates the contributor issues from issues.mjs with the GitHub CLI.
// Dry run by default. Create the labels first (labels.mjs --apply).
//   node scripts/github/create-issues.mjs           (prints titles and labels)
//   node scripts/github/create-issues.mjs --apply   (creates issues, skips titles that already exist)
import { execFileSync } from 'node:child_process';
import { ISSUES } from './issues.mjs';

const REPO = 'JOKAIR99/Dynaweb';
const apply = process.argv.includes('--apply');

const existing = apply
  ? new Set(JSON.parse(execFileSync('gh', ['issue', 'list', '--repo', REPO, '--state', 'all', '--limit', '500', '--json', 'title'], { encoding: 'utf8' })).map((i) => i.title))
  : new Set();

for (const { title, labels, body } of ISSUES) {
  if (!apply) { console.warn(`[dry run] ${title}  [${labels.join(', ')}]`); continue; }
  if (existing.has(title)) { console.warn(`skip (exists): ${title}`); continue; }
  execFileSync('gh', ['issue', 'create', '--repo', REPO, '--title', title, '--body', body, ...labels.flatMap((l) => ['--label', l])], { stdio: 'inherit' });
}
if (!apply) console.warn(`\n${ISSUES.length} issues. Re-run with --apply to create them.`);
