import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { DONE, OPEN, OWNERS, ownerOf, parseBoard, workSplit } from './board.mjs';

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

console.log(`Work board: ${checks} checks passed; Codex can start ${split.codexCanStart.length} card(s).`);
