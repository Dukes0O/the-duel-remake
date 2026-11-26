// Where the storylines of the open Scablands cross (docs/story/open-scablands.md, sections 12, 18 and 19).
//
// No storyline's file names another. Two cross because a fact one of them writes is a fact another reads, so nobody
// can see the crossings from one file. This reads every storyline in src/story/threads/content/ (or another folder
// with --dir) and prints:
//   1. what checkThread says of each storyline,
//   2. what each reads and writes, found by walking the file and not from its `reads` and `writes` lists,
//   3. the crossings: writer, the fact, reader; the marks read and never written; the facts written and never read,
//   4. a walk of every storyline's beats and ends without graphics: an end nobody reaches, a beat nobody reaches,
//      a beat with no way out that is not an end.
//
//   node tools/thread-crossings.mjs                      print it
//   node tools/thread-crossings.mjs --html [file]        also write one page (default .qa-dist/thread-crossings.html)
//   node tools/thread-crossings.mjs --check              exit 1 when a storyline fails checkThread or the walk finds a fault
//   node tools/thread-crossings.mjs --dir <folder>       read the storylines from another folder
//
// A fact or an effect is named as a reader would say it: `word of glasshouse`, `feud of road-rats`, `mark
// burned-camp/drove-on`, `stage of a camp` (a role, where the storyline does not name the site), `found radio-hill`,
// `favour of walkers`, `stock embers`, `scrap`. A role is named by the role, and two storylines' roles are never
// taken to be the same thing, so a role's fact is listed in the table and not as a crossing.
import {readdirSync, mkdirSync, writeFileSync} from 'node:fs';
import {join, dirname, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {checkThread} from '../src/world/open/check-tables.js';
import {LEDGER_EFFECTS, OPEN_EFFECTS} from '../src/world/open/open-effects.js';
import {isRole} from '../src/world/open/roles.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const THREADS_FOLDER = join(ROOT, 'src/story/threads/content');
export const DEFAULT_PAGE = join(ROOT, '.qa-dist/thread-crossings.html');

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const KNOWN_EFFECTS = [...LEDGER_EFFECTS, ...OPEN_EFFECTS];
// Facts and effects that are not crossings: a night is the clock, a draw is the seed, a thread effect moves the
// storyline itself. Marks and `made` are the things that are written by a storyline and nowhere else.
const NOT_CROSSINGS = ['night', 'draw', 'thread'];
const MARKS = ['mark', 'made'];

// ---- Loading ----------------------------------------------------------------------------------------------------

// Every storyline in a folder: [{file, thread}] and [{file, error}] for a file that does not load.
export async function loadThreads(folder = THREADS_FOLDER) {
  let files = [];
  try { files = readdirSync(folder).filter(name => /\.m?js$/.test(name)).sort(); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const threads = [], broken = [];
  for (const file of files) {
    try {
      const module = await import(pathToFileURL(join(folder, file)).href);
      if (!isObject(module.default)) broken.push({file, error: 'The file has no default export that is a storyline.'});
      else threads.push({file, thread: module.default});
    } catch (error) { broken.push({file, error: String(error.message ?? error)}); }
  }
  return {threads, broken};
}

// ---- Naming facts and effects -----------------------------------------------------------------------------------

const article = word => (/^[aeiou]/i.test(word) ? 'an ' : 'a ') + word;
// A name as written: a role '@camp' is "a camp", '@camp.people' is "the people of a camp"; anything else is as it is.
function subjectName(value) {
  if (typeof value !== 'string') return null;
  if (!isRole(value)) return {text: value, role: false};
  const [role, word] = value.slice(1).split('.');
  return {text: word === 'people' ? 'the people of ' + article(role) : article(role), role: true};
}
// What a role's own condition (`cast.<role>.where`) is asked of when it names nobody: the candidate itself.
function candidate(thread, path) {
  if (path[0] !== 'cast' || !path.includes('where')) return null;
  const role = path[1], from = thread.cast?.[role]?.from;
  return {text: from === 'sites' ? 'the people of ' + article(role) : article(role), site: article(role), role: true};
}

const key = (kind, text, role) => ({kind, text: kind + (text ? ' ' + text : ''), role});
const named = (kind, joiner, subject) => key(kind, subject ? joiner + subject.text : joiner + 'somebody', subject?.role ?? false);

// The keys a fact asks, as [{kind, text, role}]. A fact that is not a crossing gives none.
function factKeys(node, thread, path) {
  const given = candidate(thread, path);
  const of = subjectName(node.of) ?? (given && {text: given.text, role: true});
  const site = subjectName(node.site) ?? (given && {text: given.site, role: true});
  switch (node.fact) {
    case 'word': case 'feud': case 'favour': return [named(node.fact, 'of ', of)];
    case 'found': return [site ? named('found', '', site) : key('found', 'a site', true)];
    case 'stage': return [named('stage', 'of ', site)];
    case 'mark': case 'made': case 'promise': return typeof node.id === 'string' ? [key(node.fact, node.id, false)] : [];
    case 'debt': {
      if (typeof node.id === 'string') return [key('debt', node.id, false)];
      const who = subjectName(node.person);
      return who ? [key('debt', 'of ' + who.text, who.role)] : [];
    }
    case 'stock': return typeof node.of === 'string' ? [key('stock', node.of, false)] : [];
    case 'scrap': case 'roadWord': return [key(node.fact, '', false)];
    case 'town': return typeof node.has === 'string' ? [key('town', 'has ' + node.has, false)] : [];
    default: return [];
  }
}

// The keys an effect writes.
function effectKeys(node) {
  switch (node.type) {
    case 'word': return [named('word', 'of ', subjectName(node.person))];
    case 'favour': return [named('favour', 'of ', subjectName(node.person))];
    case 'feud': return [named('feud', 'of ', subjectName(node.of ?? 'ash-men'))];
    case 'find': return [named('found', '', subjectName(node.site))];
    case 'site': return [named('stage', 'of ', subjectName(node.id))];
    case 'mark': case 'made': case 'promise': return typeof node.id === 'string' ? [key(node.type, node.id, false)] : [];
    case 'debt': {
      const out = typeof node.id === 'string' ? [key('debt', node.id, false)] : [], who = subjectName(node.person);
      if (who) out.push(key('debt', 'of ' + who.text, who.role));
      return out;
    }
    case 'stock': return typeof node.stock === 'string' ? [key('stock', node.stock, false)] : [];
    case 'scrap': case 'roadWord': return [key(node.type, '', false)];
    case 'town': return typeof node.post === 'string' ? [key('town', 'post ' + node.post, false)] : [];
    default: return [];
  }
}

// Every object inside a value, with the keys that lead to it.
function* everyObject(value, path = []) {
  if (Array.isArray(value)) { for (const item of value) yield* everyObject(item, path); return; }
  if (!isObject(value)) return;
  yield [value, path];
  for (const [name, item] of Object.entries(value)) yield* everyObject(item, [...path, name]);
}

// Where in the storyline a node sits, in words a writer finds: the beat, or the part of the storyline.
const placeOf = path => (path[0] === 'beats' && path[1] !== undefined ? 'beat ' + path[1] : path[0] ? String(path[0]) : 'the storyline');

// What one storyline reads and writes, by walking it: {reads: Map(text => {key, places}), writes: ...}.
export function readsAndWrites(thread) {
  const reads = new Map(), writes = new Map();
  const add = (map, one, place) => {
    if (!map.has(one.text)) map.set(one.text, {...one, places: []});
    const entry = map.get(one.text);
    if (!entry.places.includes(place)) entry.places.push(place);
  };
  for (const [node, path] of everyObject(thread)) {
    if (typeof node.type === 'string' && KNOWN_EFFECTS.includes(node.type)) {
      if (!NOT_CROSSINGS.includes(node.type)) for (const one of effectKeys(node)) add(writes, one, placeOf(path));
      continue;
    }
    if (typeof node.fact === 'string' && !NOT_CROSSINGS.includes(node.fact))
      for (const one of factKeys(node, thread, path)) add(reads, one, placeOf(path));
  }
  return {reads, writes};
}

// ---- Walking the beats ------------------------------------------------------------------------------------------

// The beats and the ends of a storyline as a graph. An edge runs from a beat to what it leads to:
//   - every `next` inside it (the beat's own, a choice's, an explore line's, an outcome's), written as a name, a list
//     of names or `{when, to}` rows,
//   - every `to` and every `end` inside it (a choice or an outcome that moves or closes the storyline), which covers
//     the `{type: 'thread', to}` and `{type: 'thread', end}` effects,
//   - each value of its `outcomes` that is itself a name,
//   - and into a beat from the beat or beats it says it follows: `when: {after: 'asking'}` or `{after: ['a', 'b']}`
//     is an edge from each of them,
//   - and a beat that is live `when: 'any-time'` stands beside the story, so it is reached from the first beat and is
//     not a dead end for having no way out.
// The storyline begins at its first beat, and `ignored` is read as if it were part of that beat. A name that is both
// a beat and an end is taken for both, so that a slip never costs a writer a false alarm.
// The names in a value that leads somewhere: 'a', ['a', 'b'], {when, to: 'a'}, {when, is: 'a'} and lists of those.
function namesIn(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(namesIn);
  if (isObject(value)) return namesIn(value.to ?? value.is);
  return [];
}

export function walkThread(thread) {
  const beats = isObject(thread.beats) ? Object.keys(thread.beats) : [];
  const ends = Array.isArray(thread.ends) ? thread.ends.filter(end => typeof end === 'string') : [];
  const edges = new Map(beats.map(beat => [beat, new Set()]));
  const start = beats[0] ?? null;
  const reach = (from, name) => {
    if (typeof name !== 'string' || !edges.has(from)) return;
    if (beats.includes(name)) edges.get(from).add('beat:' + name);
    if (ends.includes(name)) edges.get(from).add('end:' + name);
  };
  const scan = (from, body) => {
    for (const [node, path] of everyObject(body)) {
      for (const name of namesIn(node.next)) reach(from, name);
      for (const name of namesIn(node.to)) reach(from, name);
      for (const name of namesIn(node.end)) if (ends.includes(name)) edges.get(from)?.add('end:' + name);
      if (path[path.length - 1] === 'outcomes') for (const value of Object.values(node)) for (const name of namesIn(value)) reach(from, name);
    }
  };
  for (const beat of beats) {
    const body = thread.beats[beat];
    scan(beat, body);
    // `after` is an edge into this beat, from the beat it follows.
    if (isObject(body?.when)) for (const [node] of everyObject(body.when)) for (const name of namesIn(node.after)) reach(name, beat);
  }
  if (start) scan(start, thread.ignored);
  const standing = beats.filter(beat => thread.beats[beat]?.when === 'any-time');
  for (const beat of standing) reach(start, beat);
  const seen = new Set(start ? ['beat:' + start] : []), queue = start ? [start] : [];
  while (queue.length) {
    for (const to of edges.get(queue.shift()) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      if (to.startsWith('beat:')) queue.push(to.slice(5));
    }
  }
  const faults = [];
  for (const end of ends) if (!seen.has('end:' + end)) faults.push('The end "' + end + '" cannot be reached by any path.');
  for (const beat of beats) {
    if (!seen.has('beat:' + beat)) faults.push('The beat "' + beat + '" cannot be reached by any path.');
    if (!edges.get(beat).size && !ends.includes(beat) && !standing.includes(beat)) {
      const notes = thread.beats[beat].notes;
      const nextCard = typeof notes === 'string' && /^OPEN-[A-Z0-9-]+ /.test(notes) ? ' ' + notes : '';
      faults.push('The beat "' + beat + '" has no way out and is not an end.' + nextCard);
    }
  }
  return {beats, ends, start, edges, faults};
}

// ---- The whole picture ------------------------------------------------------------------------------------------

export function analyse({threads, broken = []}) {
  const rows = threads.map(({file, thread}) => {
    const id = typeof thread.id === 'string' ? thread.id : file;
    return {file, id, title: typeof thread.title === 'string' ? thread.title : id, kind: thread.kind ?? '?',
      problems: checkThread(thread), ...readsAndWrites(thread), walk: walkThread(thread)};
  });
  // For every key that is not a role's: who writes it and who reads it.
  const writers = new Map(), readers = new Map();
  const note = (map, text, row, entry) => {
    if (!map.has(text)) map.set(text, []);
    map.get(text).push({id: row.id, places: entry.places});
  };
  for (const row of rows) {
    for (const [text, entry] of row.writes) if (!entry.role) note(writers, text, row, entry);
    for (const [text, entry] of row.reads) if (!entry.role) note(readers, text, row, entry);
  }
  const crossings = [];
  for (const [text, from] of writers) for (const to of readers.get(text) ?? []) for (const writer of from)
    if (writer.id !== to.id) crossings.push({writer: writer.id, fact: text, reader: to.id, writtenIn: writer.places, readIn: to.places});
  crossings.sort((a, b) => a.fact.localeCompare(b.fact) || a.writer.localeCompare(b.writer) || a.reader.localeCompare(b.reader));
  const kindOf = text => text.split(' ')[0];
  const readNeverWritten = [], writtenNeverRead = [];
  for (const [text, list] of readers) if (MARKS.includes(kindOf(text)) && !writers.has(text))
    readNeverWritten.push({fact: text, readBy: list.map(item => ({id: item.id, places: item.places}))});
  for (const [text, list] of writers) if (!readers.has(text)) writtenNeverRead.push({fact: text, writtenBy: list.map(item => item.id)});
  const byFact = (a, b) => a.fact.localeCompare(b.fact);
  readNeverWritten.sort(byFact); writtenNeverRead.sort(byFact);
  const faults = rows.reduce((count, row) => count + row.problems.length + row.walk.faults.length, 0) + broken.length;
  return {rows, broken, crossings, readNeverWritten, writtenNeverRead, faults};
}

// ---- Printing ---------------------------------------------------------------------------------------------------

const list = items => (items.length ? items.join(', ') : 'nothing');
const namesOf = map => [...map.keys()].sort();

export function renderText(report, folder = THREADS_FOLDER) {
  const out = [];
  const say = (text = '') => out.push(text);
  const {rows, broken, crossings, readNeverWritten, writtenNeverRead} = report;
  say('Storylines in ' + folder + ': ' + rows.length + (rows.length === 1 ? ' storyline' : ' storylines') + (broken.length ? ', ' + broken.length + ' that did not load' : ''));
  say();
  say('CHECKS (checkThread, then the walk of beats and ends)');
  for (const {file, error} of broken) say('  ' + file + ' did not load: ' + error);
  for (const row of rows) {
    say('  ' + row.title + ' (' + row.id + ')');
    const sentences = [...row.problems, ...row.walk.faults];
    if (!sentences.length) say('    sound');
    for (const sentence of sentences) say('    - ' + sentence);
  }
  if (!rows.length && !broken.length) say('  There are no storylines yet.');
  say();
  say('READS AND WRITES (found by walking each file)');
  for (const row of rows) {
    say('  ' + row.title + ' (' + row.id + ', ' + row.kind + ')');
    say('    reads:  ' + list(namesOf(row.reads)));
    say('    writes: ' + list(namesOf(row.writes)));
  }
  say();
  say('CROSSINGS: writer, the fact, reader');
  if (!crossings.length) say('  none');
  for (const c of crossings) say('  ' + c.writer + '  --[ ' + c.fact + ' ]-->  ' + c.reader);
  say();
  say('READ AND NEVER WRITTEN (a mark no storyline writes; a table of the land or the main story may, so this is a warning)');
  if (!readNeverWritten.length) say('  none');
  for (const item of readNeverWritten) say('  ' + item.fact + '   read in ' + item.readBy.map(r => r.id + ' (' + r.places.join(', ') + ')').join('; '));
  say();
  say('WRITTEN AND NEVER READ (what nobody has used yet)');
  if (!writtenNeverRead.length) say('  none');
  for (const item of writtenNeverRead) say('  ' + item.fact + '   written by ' + item.writtenBy.join(', '));
  say();
  say(report.faults ? report.faults + (report.faults === 1 ? ' fault' : ' faults') + ' (checkThread and the walk).' : 'No faults.');
  return out.join('\n') + '\n';
}

// ---- The page ---------------------------------------------------------------------------------------------------

const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (text, longest) => (text.length > longest ? text.slice(0, longest - 1) + '…' : text);

export function renderHtml(report) {
  const {rows, broken, crossings, readNeverWritten, writtenNeverRead} = report;
  const W = 1200, H = 980, cx = W / 2, cy = H / 2, ring = Math.min(cx - 110, cy - 70), boxW = 150, boxH = 44;
  const at = new Map(rows.map((row, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / Math.max(1, rows.length);
    return [row.id, {x: cx + ring * Math.cos(angle), y: cy + ring * Math.sin(angle)}];
  }));
  // The point where a line from the middle of a box towards (tx, ty) leaves the box.
  const edge = (from, tx, ty) => {
    const dx = tx - from.x, dy = ty - from.y, scale = Math.min(dx ? (boxW / 2) / Math.abs(dx) : Infinity, dy ? (boxH / 2) / Math.abs(dy) : Infinity);
    return {x: from.x + dx * scale, y: from.y + dy * scale};
  };
  const pair = (a, b) => [a, b].sort().join('|');
  const seenPairs = new Map();
  const lines = crossings.map(c => {
    const from = at.get(c.writer), to = at.get(c.reader);
    if (!from || !to) return '';
    const index = seenPairs.get(pair(c.writer, c.reader)) ?? 0;
    seenPairs.set(pair(c.writer, c.reader), index + 1);
    // The line bows in towards the middle of the ring, and each further line between the same two bows a little more
    // or less, so that they do not lie on top of each other.
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2, pull = 0.45 + (index % 2 ? -1 : 1) * Math.ceil(index / 2) * 0.12;
    const control = {x: mx + (cx - mx) * pull, y: my + (cy - my) * pull};
    const start = edge(from, control.x, control.y), finish = edge(to, control.x, control.y);
    const label = {x: .25 * start.x + .5 * control.x + .25 * finish.x, y: .25 * start.y + .5 * control.y + .25 * finish.y};
    return '<g class="crossing"><title>' + escape(c.writer + ' writes ' + c.fact + ', ' + c.reader + ' reads it') + '</title>' +
      '<path d="M' + start.x.toFixed(1) + ' ' + start.y.toFixed(1) + ' Q' + control.x.toFixed(1) + ' ' + control.y.toFixed(1) + ' ' +
      finish.x.toFixed(1) + ' ' + finish.y.toFixed(1) + '" marker-end="url(#arrow)"/>' +
      '<text x="' + label.x.toFixed(1) + '" y="' + label.y.toFixed(1) + '" text-anchor="middle">' + escape(c.fact) + '</text></g>';
  });
  const boxes = rows.map(row => {
    const {x, y} = at.get(row.id), bad = row.problems.length + row.walk.faults.length;
    return '<g class="box' + (bad ? ' bad' : '') + '"><title>' + escape(row.title + ' (' + row.id + ', ' + row.kind + ')') + '</title>' +
      '<rect x="' + (x - boxW / 2).toFixed(1) + '" y="' + (y - boxH / 2).toFixed(1) + '" width="' + boxW + '" height="' + boxH + '" rx="6"/>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" class="name">' + escape(clip(row.title, 24)) + '</text>' +
      '<text x="' + x.toFixed(1) + '" y="' + (y + 13).toFixed(1) + '" text-anchor="middle" class="sub">' + escape(row.kind + (bad ? ', ' + bad + ' faults' : '')) + '</text></g>';
  });
  const svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Where the storylines cross">' +
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0 0 L10 5 L0 10 z" class="head"/></marker></defs>' + lines.join('') + boxes.join('') + '</svg>';

  const table = (head, body) => '<table><thead><tr>' + head.map(h => '<th>' + escape(h) + '</th>').join('') + '</tr></thead><tbody>' +
    (body.length ? body.map(cells => '<tr>' + cells.map(cell => '<td>' + escape(cell) + '</td>').join('') + '</tr>').join('') :
      '<tr><td colspan="' + head.length + '">none</td></tr>') + '</tbody></table>';
  const sections = [
    '<h2>Reads and writes</h2>' + table(['Storyline', 'Kind', 'Reads', 'Writes'],
      rows.map(row => [row.title + ' (' + row.id + ')', row.kind, list(namesOf(row.reads)), list(namesOf(row.writes))])),
    '<h2>Crossings</h2>' + table(['Writer', 'The fact', 'Reader'], crossings.map(c => [c.writer, c.fact, c.reader])),
    '<h2>Read and never written</h2><p>A mark that a storyline reads and that no storyline writes. A table of the land or the main story may write it, so this is a warning.</p>' +
      table(['The fact', 'Read in'], readNeverWritten.map(item => [item.fact, item.readBy.map(r => r.id + ' (' + r.places.join(', ') + ')').join('; ')])),
    '<h2>Written and never read</h2><p>What nobody has used yet.</p>' +
      table(['The fact', 'Written by'], writtenNeverRead.map(item => [item.fact, item.writtenBy.join(', ')])),
    '<h2>Checks and the walk</h2>' + table(['Storyline', 'What is wrong'],
      [...broken.map(b => [b.file, 'Did not load: ' + b.error]),
        ...rows.flatMap(row => [...row.problems, ...row.walk.faults].map(text => [row.id, text]))]),
  ];
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>Where the storylines cross</title><style>' +
    ':root{--bg:#fbfaf7;--ink:#211e1a;--soft:#6a645b;--box:#fff;--edge:#8b8274;--line:#2f6f8f;--bad:#b3261e;--rule:#d9d3c8}' +
    '@media (prefers-color-scheme:dark){:root{--bg:#1b1a18;--ink:#ece8df;--soft:#a39b8d;--box:#262421;--edge:#6e675b;--line:#7cb7d6;--bad:#ff8a80;--rule:#3a3732}}' +
    'body{margin:0;padding:16px;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    'main{max-width:1240px;margin:0 auto}h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.15rem;margin:1.6em 0 .4em}p{color:var(--soft);margin:.2em 0 .6em}' +
    'svg{width:100%;height:auto;display:block}.crossing path{fill:none;stroke:var(--line);stroke-width:1.3;opacity:.8}.head{fill:var(--line)}' +
    '.crossing text{font-size:10px;fill:var(--ink);paint-order:stroke;stroke:var(--bg);stroke-width:3px;stroke-linejoin:round}' +
    '.box rect{fill:var(--box);stroke:var(--edge);stroke-width:1.3}.box.bad rect{stroke:var(--bad);stroke-width:2.4}' +
    '.box .name{font-size:12.5px;font-weight:600;fill:var(--ink)}.box .sub{font-size:10.5px;fill:var(--soft)}.box.bad .sub{fill:var(--bad)}' +
    'table{border-collapse:collapse;width:100%;font-size:.88rem}th,td{text-align:left;vertical-align:top;padding:5px 8px;border-bottom:1px solid var(--rule)}' +
    'th{color:var(--soft);font-weight:600}.scroll{overflow-x:auto}</style></head><body><main>' +
    '<h1>Where the storylines cross</h1><p>' + rows.length + (rows.length === 1 ? ' storyline' : ' storylines') + ', ' + crossings.length +
    (crossings.length === 1 ? ' crossing' : ' crossings') + ', ' + report.faults + (report.faults === 1 ? ' fault' : ' faults') +
    '. A line runs from the storyline that writes a fact to the one that reads it.</p>' + svg +
    '<div class="scroll">' + sections.join('') + '</div></main></body></html>\n';
}

// ---- The command ------------------------------------------------------------------------------------------------

export async function main(argv, {out = text => process.stdout.write(text)} = {}) {
  let folder = THREADS_FOLDER, page = null, check = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check') check = true;
    else if (arg === '--dir') folder = resolve(argv[++i] ?? '');
    else if (arg === '--html') page = argv[i + 1] && !argv[i + 1].startsWith('--') ? resolve(argv[++i]) : DEFAULT_PAGE;
    else { out('Unknown option: ' + arg + '\nUse: node tools/thread-crossings.mjs [--dir folder] [--html [file]] [--check]\n'); return 2; }
  }
  const report = analyse(await loadThreads(folder));
  const shown = relative(ROOT, folder);
  out(renderText(report, !shown ? '.' : shown.startsWith('..') || isAbsolute(shown) ? folder : shown.replaceAll('\\', '/')));
  if (page) {
    mkdirSync(dirname(page), {recursive: true});
    writeFileSync(page, renderHtml(report));
    out('Page written to ' + page + '\n');
  }
  return check && report.faults ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
