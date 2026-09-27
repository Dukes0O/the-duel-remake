// Records which integration commit the Preview was built from, so a later
// click can tell whether newer work is waiting (docs/OPERATIONS.md).
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

const [dir, commit] = process.argv.slice(2);
if (!dir || !commit) {
  console.error('Usage: node tools/preview-stamp.mjs <preview folder> <commit>');
  process.exit(1);
}
writeFileSync(join(dir, 'preview-build.json'),
  JSON.stringify({commit, builtAt: new Date().toISOString()}) + '\n');
