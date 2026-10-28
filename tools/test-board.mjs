import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, mkdtempSync, cpSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DONE, OPEN, OWNERS, ownerOf, parseBoard, workSplit } from './board.mjs';
import { stampLine } from './new-line-cards.mjs';

// The work board stays pullable: every card is well formed, and Codex is
// never offered a card that belongs to Claude or Kyle.
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const text = readFileSync(new URL('../docs/board/board.yaml', import.meta.url), 'utf8');
const cards = parseBoard(text);
const ids = cards.map(card => card.id);

check(cards.length > 0, `the open board parses (${cards.length} cards)`);
check(cards.every(card => OPEN.has(card.status)), 'finished cards leave the open board');
check(cards.completed instanceof Set, 'removed completed prerequisites remain explicit');
const yaml = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', 'import json,sys,yaml; print(json.dumps(yaml.safe_load(sys.stdin.read())))'], {input:text,encoding:'utf8',windowsHide:true});
assert.equal(yaml.status, 0, 'the board loads as standard YAML: '+yaml.stderr);
assert.equal(JSON.parse(yaml.stdout).tasks.length,cards.length);
checks+=2;
for(const card of cards)check(card.details&&existsSync(new URL('../'+card.details,import.meta.url)),`${card.id} has its own detail note`);
check(new Set(ids).size === ids.length, 'card ids are unique');
check((text.match(/^  - id: /gm) || []).length === cards.length, 'every card entry is read');
for (const card of cards) {
  check(DONE.has(card.status) || OPEN.has(card.status), `${card.id} has a known status (${card.status})`);
  // Needs name cards, or Kyle's standing decisions D1, D2 ... in SPEC.md.
  for (const need of card.needs) check(ids.includes(need) || cards.completed.has(need) || /^D\d+$/.test(need), `${card.id} needs an existing card or decision (${need})`);
  if (card.owner) {
    const owner = String(card.owner).toLowerCase();
    check(OWNERS.has(owner) || /^(kyle|claude|codex|future)/.test(owner), `${card.id} has a known owner`);
  }
  if (card.waiting_on) check(['claude', 'kyle'].includes(card.waiting_on), `${card.id} waits on Claude or Kyle`);
  if (ownerOf(card) === 'claude' && ['building', 'in-progress', 'active', 'review'].includes(card.status))
    check(!!card.claimed_by, `${card.id}: Claude's work in progress says who and since when`);
}

const split = workSplit(cards);
const offered = new Set(split.codexCanStart.map(item => item.id));
check([...offered].every(id => ownerOf(cards.find(card => card.id === id)) === 'codex'),
  'Codex is only offered Codex cards');
check(![...offered].some(id => cards.find(card => card.id === id).waiting_on),
  'a card waiting on a review or go-ahead is not offered');
check(split.codexCanStart.every(item => item.blockedBy.length === 0), 'offered cards have every need done');

// The rules on a tiny board.
const tiny = parseBoard(`tasks:
  - id: A
    title: "Done thing"
    status: merged
  - id: B
    title: "Codex next"
    status: ready
    needs: [A]
  - id: C
    title: "Claude's"
    owner: claude
    status: ready
    needs: []
  - id: D
    title: "Blocked by B"
    owner: codex
    status: ready
    needs: [B]
  - id: E
    title: "Claude working"
    owner: Claude
    status: building
    claimed_by: "Claude, today"
  - id: F
    title: "Needs a go-ahead"
    owner: claude
    status: ready
    waiting_on: kyle
`);
const tinySplit = workSplit(tiny);
assert.deepEqual(tinySplit.codexCanStart.map(item => item.id), ['B']);
assert.deepEqual(tinySplit.codexWaiting.map(item => item.id), ['D']);
assert.deepEqual(tinySplit.claudeWorking.map(item => item.id), ['E']);
assert.deepEqual(tinySplit.claudeNext.map(item => item.id), ['C', 'F']);
assert.deepEqual(tinySplit.waitingOnKyle.map(item => item.id), ['F']);
checks += 5;


// Removed completed cards still settle dependencies; unknown ids cannot unlock work.
const lean = parseBoard(`completed: [DONE-1]
tasks:
  - id: HOLDER
    title: "Course lock holder"
    owner: codex
    status: building
    locks: [circuit-registry, reference-laps]
  - id: NEXT
    title: "Another course"
    owner: codex
    status: ready
    needs: [DONE-1]
    locks: [circuit-registry]
  - id: FREE
    title: "Independent feature"
    owner: codex
    status: ready
    needs: [DONE-1]
    locks: [save-shape]
  - id: UNKNOWN
    title: "Unknown prerequisite"
    status: ready
    needs: [MISSING]
  - id: REVIEW
    title: "Waiting for Claude"
    status: building
    waiting_on: claude
    locks: [save-shape]
`);
assert.deepEqual(workSplit(lean).codexCanStart.map(row=>row.id),['FREE']);
assert.deepEqual(workSplit(lean).waitingOnLocks.map(row=>[row.id,row.lockedBy]),[['NEXT',[{lock:'circuit-registry',holder:'HOLDER'}]]]);
assert.deepEqual(workSplit(lean).codexWaiting.map(row=>row.id),['UNKNOWN']);
const doneHolder=parseBoard(`completed: [DONE-1]
tasks:
  - id: NEXT
    status: ready
    needs: [DONE-1]
    locks: [circuit-registry]
`);
assert.deepEqual(workSplit(doneHolder).codexCanStart.map(row=>row.id),['NEXT']);
checks+=4;

// A claimant must acquire all of its locks before it holds any of them.
const collision=parseBoard(`tasks:
  - id: A
    owner: codex
    status: building
    locks: [X]
  - id: B
    owner: claude
    status: building
    claimed_by: Claude
    locks: [X, Y]
  - id: C
    owner: codex
    status: ready
    locks: [Y]
`);
const collisionSplit=workSplit(collision);
assert.deepEqual(collisionSplit.codexWorking.map(row=>row.id),['A']);
assert.deepEqual(collisionSplit.claudeWorking,[]);
assert.deepEqual(collisionSplit.waitingOnLocks.map(row=>[row.id,row.lockedBy]),[['B',[{lock:'X',holder:'A'}]]]);
assert.deepEqual(collisionSplit.codexCanStart.map(row=>row.id),['C']);
checks+=4;

// Run the same board checks on an isolated copy, without recursively stamping.
// These file fixtures require Windows Recycle Bin cleanup. Pure board checks
// above remain portable; cloud lanes report this laptop-only coverage as unrun.
if (!process.env.DUEL_STAMP_FIXTURE && process.platform === 'win32') {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const scratch = resolve(root, '.qa-dist');
  mkdirSync(scratch, { recursive: true });
  const fixture = mkdtempSync(join(scratch, 'line-stamp-'));
  const quiet = { root: fixture, log: () => {} };
  const snapshot = () => {
    const files = {};
    const walk = path => {
      for (const item of readdirSync(join(fixture, path), { withFileTypes: true })) {
        const next = join(path, item.name);
        if (item.isDirectory()) walk(next);
        else files[next] = readFileSync(join(fixture, next), 'utf8');
      }
    };
    walk('');
    return files;
  };
  try {
    cpSync(join(root, 'docs/board'), join(fixture, 'docs/board'), { recursive: true });
    cpSync(join(root, 'docs/FACTORY.md'), join(fixture, 'docs/FACTORY.md'));
    mkdirSync(join(fixture, 'tools'));
    for (const name of ['board.mjs', 'test-board.mjs', 'new-line-cards.mjs'])
      cpSync(join(root, 'tools', name), join(fixture, 'tools', name));
    const before = snapshot();
    const preview = [];
    stampLine(['course', 'test-coast', 'Test "Coast": #1', '--dry-run'], { root: fixture, log: text => preview.push(text) });
    assert.deepEqual(snapshot(), before, 'dry run writes no file or directory');
    check(preview.join('\n').includes('TEST-COAST-C7'), 'dry run lists planned cards');
    for (const id of ['Upper', '../escape', 'bad_id', '-bad', 'bad-', 'bad--id', '']) {
      assert.throws(() => stampLine(['course', id, 'Invalid'], quiet), /Id must/);
      assert.deepEqual(snapshot(), before, 'invalid id changes no files');
      checks++;
    }
    for (const id of ['con', 'prn', 'aux', 'nul']) {
      assert.throws(() => stampLine(['course', id, 'Invalid'], quiet), /reserved Windows/);
      assert.deepEqual(snapshot(), before, 'reserved filename refuses before any write');
      checks++;
    }
    const graphs = {
      course: [[], [], [2], [1], [2, 4], [3, 5], [6]],
      car: [[], [1], [2], [], [], [3, 4, 5], [6]],
    };
    for (const [kind, graph] of Object.entries(graphs)) {
      const id = kind === 'course' ? 'test-coast' : 'test-car';
      const prefix = kind === 'course' ? 'C' : 'V';
      const args = [kind, id, 'Test "Name": #1'];
      const rows = stampLine(args, quiet);
      check(rows.every(row => row.status === 'backlog'), 'default leaves all stages in backlog');
      const parsed = parseBoard(readFileSync(join(fixture, 'docs/board/board.yaml'), 'utf8'));
      for (let index = 0; index < 7; index++) {
        const row = parsed.find(row => row.id === `${id.toUpperCase()}-${prefix}${index + 1}`);
        assert.deepEqual(row.needs, graph[index].map(n => `${id.toUpperCase()}-${prefix}${n}`));
        assert.equal(row.owner, (kind === 'course' && index === 5) || index === 6 ? 'claude' : 'codex');
        const detail = readFileSync(join(fixture, row.details), 'utf8');
        check(detail.includes(rows[index].gate) && detail.includes('## Prerequisites and graph'), 'card includes gate and graph');
      }
      const folder = kind === 'course' ? 'docs/courses' : 'docs/cars';
      const packet = join(fixture, folder, `${id}.md`);
      const contents = readFileSync(packet, 'utf8');
      assert.equal((contents.match(/^## \d+\./gm) || []).length, 10);
      check(contents.includes('fire bucket') && contents.includes('Claude must'), 'packet retains wrapped checklist text and approval prerequisite');
      const stamped = snapshot();
      assert.throws(() => stampLine(args, quiet), /already exists/);
      assert.deepEqual(snapshot(), stamped, 'duplicate refusal writes nothing');
      checks++;
      const readyId = `${id}-ready`;
      const readyPacket = join(fixture, folder, `${readyId}.md`);
      writeFileSync(readyPacket, 'Claude approved this packet.\n');
      const ready = stampLine([kind, readyId, 'Ready line', '--ready'], quiet);
      assert.deepEqual(ready.filter(row => row.status === 'ready').map(row => row.number), kind === 'course' ? [1, 2] : [1, 4, 5]);
      assert.equal(readFileSync(readyPacket, 'utf8'), 'Claude approved this packet.\n');
      checks += 2;
    }
    // Collision in the final stage must refuse the whole operation, including packet creation.
    for (const completed of [false, true]) {
      const boardPath = join(fixture, 'docs/board/board.yaml');
      const original = readFileSync(boardPath, 'utf8');
      writeFileSync(boardPath, completed ? original.replace('completed: [', 'completed: [COLLISION-C7, ')
        : original + '\n  - id: COLLISION-C7\n    status: backlog\n');
      const colliding = snapshot();
      assert.throws(() => stampLine(['course', 'collision', 'Collision'], quiet), /already exists/);
      assert.deepEqual(snapshot(), colliding);
      writeFileSync(boardPath, original);
      checks++;
    }
    writeFileSync(join(fixture, 'docs/board/cards/ORPHAN-V7.md'), 'Keep this original.');
    const orphan = snapshot();
    assert.throws(() => stampLine(['car', 'orphan', 'Orphan'], quiet), /already exists/);
    assert.deepEqual(snapshot(), orphan);
    checks++;
    const validated = spawnSync(process.execPath, [join(fixture, 'tools/test-board.mjs')], {
      encoding: 'utf8', windowsHide: true, env: { ...process.env, DUEL_STAMP_FIXTURE: '1' },
    });
    assert.equal(validated.status, 0, validated.stdout + validated.stderr);
    checks++;
    const cli = spawnSync(process.execPath, [join(fixture, 'tools/new-line-cards.mjs'), 'car', 'test-car', 'Duplicate'], { encoding: 'utf8', windowsHide: true });
    check(cli.status !== 0 && cli.stderr.includes('already exists'), 'CLI duplicate exits nonzero');
  } finally {
    assert.equal(process.platform, 'win32', 'test cleanup requires the Recycle Bin');
    assert.ok(fixture.startsWith(scratch + '\\') && /^line-stamp-[a-zA-Z0-9]+$/.test(fixture.slice(scratch.length + 1)));
    const literal = "'" + fixture.replaceAll("'", "''") + "'";
    const recycled = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory('
      + literal + ',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)'],
    { encoding: 'utf8', windowsHide: true });
    assert.equal(recycled.status, 0, recycled.stderr);
  }
}

if (!process.env.DUEL_STAMP_FIXTURE && process.platform !== 'win32')
  console.log('Line stamp file fixtures: not run here; require Windows Recycle Bin cleanup.');

console.log(`Work board: ${checks} checks passed; Codex can start ${split.codexCanStart.length} card(s).`);
