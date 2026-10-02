import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, readdirSync, readFileSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const recipe = join(root, 'tools/blender/salt-flats.py');
const fit = join(root, 'tools/art/salt-flats-fit.json');
const seed = JSON.parse(readFileSync(fit, 'utf8')).seed;
// These are the recipe's current generated files. All three PNGs are packed
// into the GLB during the native build; none is installed separately.
const atlases = ['salvage-wear.png', 'seeded-salt-color.png', 'seeded-salt-normal.png'];
const fixtures = ['a', 'b'].map(label => mkdtempSync(join(tmpdir(), 'duel-salt-output-' + label + '-')));
let checks = 0;
const failures = [];
function check(label, action) {
  checks++;
  try {action();} catch (error) {failures.push(label + ': ' + error.message);}
}
try {
  for (const [index, fixture] of fixtures.entries()) {
    check('Salt actual plain-Python output plan ' + (index + 1), () => {
      const output = join(fixture, '.qa-dist', 'salt-private');
      const call = spawnSync('python', ['-I', '-B', '-S', recipe, '--',
        '--root', fixture, '--output-dir', output, '--fit-config', fit,
        '--seed', String(seed), '--paths-only'],
      {cwd: root, encoding: 'utf8', windowsHide: true, timeout: 10000});
      assert.deepEqual(readdirSync(fixture), [], 'planning must not create the private output directory or any file');
      assert.equal(call.error, undefined, call.error?.message);
      assert.equal(call.status, 0, 'actual Salt --paths-only must run without Blender: ' + call.stderr.trim());
      const plan = JSON.parse(call.stdout);
      assert.deepEqual(plan.blend, [], 'Salt native recipe creates no editable Blend');
      assert.deepEqual(plan.glb, [join(output, 'venue.glb')], 'current model uses the exact requested private output');
      assert.deepEqual(plan.json, [join(output, 'manifest.json')], 'current native manifest uses the exact requested private output');
      assert.deepEqual(plan.atlas, atlases.map(name => join(output, name)),
        'current disposable packed PNG atlas paths use the exact requested private output');
    });
  }
  check('Salt path planning leaves both temporary roots empty', () => {
    for (const fixture of fixtures) assert.deepEqual(readdirSync(fixture), [], 'no source or output can be written while planning');
  });
} finally {
  // Each root is the exact empty directory returned by mkdtempSync. Remove it
  // non-recursively; unexpected recipe output is retained as failure evidence.
  for (const fixture of fixtures) if (readdirSync(fixture).length === 0) rmdirSync(fixture);
}
console.log('Salt output planning: ' + checks + ' checks; ' + failures.length + ' failed.');
for (const failure of failures) console.error('FAIL ' + failure);
if (failures.length) process.exitCode = 1;
