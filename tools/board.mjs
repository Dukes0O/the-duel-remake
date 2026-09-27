// What can be worked on now, and by whom (docs/board/board.yaml).
//
//   node tools/board.mjs            the split between Codex, Claude and Kyle
//   node tools/board.mjs --json     the same, machine-readable
//
// Rules (docs/CODEX_PLAYBOOK.md section 6): a card's `owner` is codex, claude
// or kyle; cards without one are Codex's. Codex starts only codex cards with
// status `ready` whose `needs` are all done. Claude's cards are never started
// by Codex, even when they look ready. `waiting_on: claude | kyle` marks a
// card paused for a review or a go-ahead.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const DONE = new Set(['merged', 'integrated', 'released', 'closed', 'spike-complete', 'replaced', 'superseded']);
export const OPEN = new Set(['ready', 'blocked', 'backlog', 'building', 'in-progress', 'active', 'review', 'ready-to-merge']);
export const WORKING = new Set(['building', 'in-progress', 'active', 'review', 'ready-to-merge']);
export const OWNERS = new Set(['codex', 'claude', 'kyle']);

const scalar = value => value.trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
const list = value => value.trim().replace(/^\[|\]$/g, '').split(',').map(scalar).filter(Boolean);

// The board is a fixed, simple shape: parse only the fields this tool uses.
export function parseBoard(text) {
  const cards = [];
  let card = null;
  for (const line of text.split(/\r?\n/)) {
    const start = line.match(/^  - id: (.+)$/);
    if (start) { card = { id: scalar(start[1]), needs: [] }; cards.push(card); continue; }
    const field = card && line.match(/^    ([a-z_]+): (.*)$/);
    if (!field) continue;
    const [, key, value] = field;
    if (key === 'needs') card.needs = list(value);
    else if (['title', 'lane', 'status', 'owner', 'claimed_by', 'waiting_on', 'size'].includes(key)) card[key] = scalar(value);
  }
  return cards;
}

export function ownerOf(card) {
  const owner = String(card.owner || 'codex').toLowerCase();
  return owner.startsWith('claude') ? 'claude' : owner.startsWith('kyle') ? 'kyle' : 'codex';
}

export function workSplit(cards) {
  const byId = new Map(cards.map(card => [card.id, card]));
  // Standing decisions (D1, D2 ...) are approved in SPEC.md and count as done.
  const settled = id => /^D\d+$/.test(id) || DONE.has(byId.get(id)?.status);
  const needsDone = card => card.needs.every(settled);
  const open = cards.filter(card => OPEN.has(card.status));
  const line = card => ({ id: card.id, title: card.title, lane: card.lane, status: card.status,
    claimedBy: card.claimed_by || null, waitingOn: card.waiting_on || null,
    blockedBy: card.needs.filter(id => !settled(id)) });
  const mine = owner => open.filter(card => ownerOf(card) === owner);
  const codex = mine('codex'), claude = mine('claude');
  return {
    codexCanStart: codex.filter(card => card.status === 'ready' && !card.waiting_on && needsDone(card)).map(line),
    codexWorking: codex.filter(card => WORKING.has(card.status) && !card.waiting_on).map(line),
    codexWaiting: codex.filter(card => card.status === 'ready' && !needsDone(card)).map(line),
    claudeWorking: claude.filter(card => WORKING.has(card.status)).map(line),
    claudeNext: claude.filter(card => !WORKING.has(card.status)).map(line),
    waitingOnClaude: open.filter(card => card.waiting_on === 'claude').map(line),
    waitingOnKyle: open.filter(card => card.waiting_on === 'kyle' || ownerOf(card) === 'kyle').map(line),
  };
}

function print(split) {
  const section = (heading, items, detail = item => '') => {
    console.log(`\n${heading}`);
    if (!items.length) console.log('  (none)');
    for (const item of items) console.log(`  ${item.id.padEnd(20)} ${item.title}${detail(item)}`);
  };
  section('CODEX CAN START NOW', split.codexCanStart);
  section('CODEX IN PROGRESS', split.codexWorking, item => item.claimedBy ? `  [${item.claimedBy}]` : '');
  section('CODEX, WAITING ON OTHER CARDS', split.codexWaiting, item => `  (needs ${item.blockedBy.join(', ')})`);
  section('CLAUDE IS WORKING ON (do not start)', split.claudeWorking, item => item.claimedBy ? `  [${item.claimedBy}]` : '');
  section('CLAUDE NEXT (do not start)', split.claudeNext, item => item.blockedBy.length ? `  (needs ${item.blockedBy.join(', ')})` : '');
  section('WAITING FOR CLAUDE\'S REVIEW', split.waitingOnClaude);
  section('WAITING FOR KYLE', split.waitingOnKyle);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const split = workSplit(parseBoard(readFileSync(new URL('../docs/board/board.yaml', import.meta.url), 'utf8')));
  if (process.argv.includes('--json')) console.log(JSON.stringify(split, null, 2));
  else print(split);
}
