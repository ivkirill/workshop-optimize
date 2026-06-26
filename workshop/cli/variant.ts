/**
 * variant — pick a task variant. Copies variant-N/TASK.md into apps/angular-demo/TASK.md and
 * records the active scenario so scenario:reset / scenario:verify / workshop:run* target it.
 *
 *   npm run variant -- 1   # catalog pagination
 *   npm run variant -- 2   # orders search
 *   npm run variant -- 3   # edit card (validation & XSS)
 */
import { resolve } from 'node:path';
import { copyFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { REPO_ROOT, die } from './_lib';

const VARIANTS: Record<string, { dir: string; scenario: string }> = {
  '1': { dir: 'variant-1', scenario: 'catalog-pagination' },
  '2': { dir: 'variant-2', scenario: 'orders-search' },
  '3': { dir: 'variant-3', scenario: 'editcard-validation' },
};

const choice = process.argv[2];
const variant = choice ? VARIANTS[choice] : undefined;
if (!variant) die('usage: npm run variant -- <1|2|3>');

const taskSrc = resolve(REPO_ROOT, variant.dir, 'TASK.md');
if (!existsSync(taskSrc)) die(`missing ${variant.dir}/TASK.md`);

// Copy TASK.md into the Angular app directory — the participant's agent starts there.
const appDir = resolve(REPO_ROOT, 'apps', 'angular-demo');
copyFileSync(taskSrc, resolve(appDir, 'TASK.md'));
mkdirSync(resolve(REPO_ROOT, '.workshop'), { recursive: true });
writeFileSync(resolve(REPO_ROOT, '.workshop/active-scenario'), `${variant.scenario}\n`);

process.stdout.write(`variant ${choice} selected → apps/angular-demo/TASK.md (scenario: ${variant.scenario})\n`);
