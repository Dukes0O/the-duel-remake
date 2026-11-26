// OPEN-CROSSINGS: tools/thread-crossings.mjs, on small storylines made here. Nothing touches the real folder.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyse, loadThreads, readsAndWrites, walkThread, renderText, renderHtml} from './thread-crossings.mjs';
import {checkThread} from '../src/world/open/check-tables.js';

const TOOL = fileURLToPath(new URL('./thread-crossings.mjs', import.meta.url));
const scratch = mkdtempSync(join(tmpdir(), 'thread-crossings-'));
process.on('exit', () => rmSync(scratch, {recursive: true, force: true}));

// A storyline that passes checkThread, with a straight way through: sign -> middle -> the end "done".
function story(id, more = {}) {
  return {
    id, title: 'Story ' + id, kind: 'need',
    reads: ['night'], writes: ['mark'],
    cast: {},
    starts: {fact: 'night', atLeast: 2},
    sign: {kind: 'smoke', at: 'tin-town'},
    beats: {
      sign: {when: 'sign-seen', next: 'middle'},
      middle: {when: {after: 'sign'}, choices: [{id: id + '/finish', effects: [{type: 'mark', id: id + '/finished'}], next: 'done'}]},
    },
    ends: ['done'],
    ignored: {afterNights: 3, says: 'dot', line: 'Nobody came.'},
    ...more,
  };
}
const withEffects = (id, effects, writes = ['mark']) => story(id, {
  writes,
  beats: {sign: {when: 'sign-seen', next: 'middle'},
    middle: {when: {after: 'sign'}, choices: [{id: id + '/finish', effects: [...effects], next: 'done'}]}},
});
const reading = (id, facts, reads) => story(id, {
  reads: ['night', ...reads],
  starts: {all: [{fact: 'night', atLeast: 2}, ...facts]},
});

// The small storylines themselves must be sound, or every check below would be reading faults it did not mean to.
for (const one of [story('plain'), withEffects('w', [{type: 'mark', id: 'w/seen'}]), reading('r', [{fact: 'mark', id: 'w/seen'}], ['mark'])])
  assert.deepEqual(checkThread(one), [], one.id);

// ---- Reads and writes are found by walking the file, and named as a reader would say them -----------------------
{
  const walked = story('walker', {
    reads: ['night', 'word', 'feud', 'found', 'stage', 'stock', 'scrap', 'made'],
    writes: ['word', 'mark', 'site', 'find', 'favour', 'stock', 'scrap', 'feud'],
    cast: {camp: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'camp'}]}}},
    starts: {all: [{fact: 'night', atLeast: 2}, {fact: 'word', of: 'glasshouse', atLeast: 'Friendly'},
      {fact: 'feud', of: 'road-rats', atLeast: 'Raiding'}, {fact: 'found', site: 'radio-hill'},
      {fact: 'stock', of: 'embers', atLeast: 2}, {fact: 'scrap', atLeast: 20}, {fact: 'made', id: 'tower/west-fence'},
      {fact: 'stage', site: '@camp', is: 'camp'}]},
    sign: {kind: 'smoke', at: '@camp'},
    beats: {
      sign: {when: 'sign-seen', next: 'middle'},
      // Effects under `gives` and `outcomes` count as well as those under `effects`.
      middle: {when: {after: 'sign'}, choices: [{id: 'walker/go', effects: [
        {type: 'word', person: '@camp.people', by: -1}, {type: 'mark', id: 'burned-camp/drove-on'},
        {type: 'site', id: '@camp', stage: 'burned'}, {type: 'find', site: 'radio-hill'}, {type: 'favour', person: 'walkers', by: 1}], next: 'done'}],
        outcomes: {seen: [{type: 'feud', of: 'road-rats', by: 1}, {type: 'stock', stock: 'embers', by: -1}, {type: 'scrap', by: -6}]}},
    },
  });
  const {reads, writes} = readsAndWrites(walked);
  assert.deepEqual([...reads.keys()].sort(), ['feud of road-rats', 'found a camp', 'found radio-hill', 'made tower/west-fence', 'scrap', 'stage of a camp',
    'stock embers', 'word of glasshouse'].sort());
  // `found a camp` and the second `stage of a camp` are the role's own condition, asked of each candidate.
  assert.deepEqual(reads.get('found a camp').places, ['cast']);
  assert.deepEqual([...writes.keys()].sort(), ['favour of walkers', 'feud of road-rats', 'found radio-hill', 'mark burned-camp/drove-on', 'scrap',
    'stage of a camp', 'stock embers', 'word of the people of a camp'].sort());
  assert.equal(reads.get('stage of a camp').role, true);
  assert.equal(writes.get('word of the people of a camp').role, true);
  assert.equal(writes.get('mark burned-camp/drove-on').role, false);
  // Where a fact is asked is kept, so a warning can say where.
  assert.deepEqual(reads.get('made tower/west-fence').places, ['starts']);
  assert.deepEqual(writes.get('scrap').places, ['beat middle']);
  // The lists a writer wrote are not what is read: a write left out of `writes` is still found.
  assert.ok(readsAndWrites(story('liar', {writes: []})).writes.has('mark liar/finished'));
}

// ---- A crossing is found in both directions of the table ---------------------------------------------------------
{
  const writer = withEffects('writer', [{type: 'mark', id: 'writer/gate-broken'}, {type: 'mark', id: 'writer/unused'}]);
  const reader = reading('reader', [{fact: 'mark', id: 'writer/gate-broken'}], ['mark']);
  const report = analyse({threads: [{file: 'writer.js', thread: writer}, {file: 'reader.js', thread: reader}]});
  const row = report.crossings.find(c => c.fact === 'mark writer/gate-broken');
  assert.ok(row, 'the crossing is listed');
  assert.equal(row.writer, 'writer');
  assert.equal(row.reader, 'reader');
  assert.deepEqual(row.readIn, ['starts']);
  // The same crossing, from the reader's side: what the writer writes that nobody else reads is not it.
  assert.ok(!report.crossings.some(c => c.writer === 'reader' || c.reader === 'writer'));
  assert.ok(!report.crossings.some(c => c.fact === 'mark writer/unused'));
  // Read here, so it is not "written and never read"; and the one the reader never reads is.
  assert.ok(!report.writtenNeverRead.some(item => item.fact === 'mark writer/gate-broken'));
  assert.ok(report.writtenNeverRead.some(item => item.fact === 'mark writer/unused'));
  const text = renderText(report, 'tests');
  assert.match(text, /writer\s+--\[ mark writer\/gate-broken ]-->\s+reader/);
  // Two roles are never taken for one thing: a fact of "a camp" in two storylines is not a crossing.
  const roleA = story('role-a', {reads: ['night', 'found'], writes: ['site'], cast: {camp: {from: 'sites', where: {fact: 'found'}}}, sign: {kind: 'smoke', at: '@camp'},
    beats: {sign: {when: 'sign-seen', next: 'middle'},
      middle: {when: {after: 'sign'}, choices: [{id: 'role-a/x', effects: [{type: 'site', id: '@camp', stage: 'burned'}], next: 'done'}]}}});
  const roleB = story('role-b', {reads: ['night', 'stage', 'found'], cast: {camp: {from: 'sites', where: {fact: 'found'}}}, sign: {kind: 'smoke', at: '@camp'},
    starts: {all: [{fact: 'night', atLeast: 2}, {fact: 'stage', site: '@camp', is: 'burned'}]}});
  assert.deepEqual(checkThread(roleA), []); assert.deepEqual(checkThread(roleB), []);
  assert.equal(analyse({threads: [{file: 'a.js', thread: roleA}, {file: 'b.js', thread: roleB}]}).crossings.length, 0);
}

// ---- A mark read and never written is listed, with where it is read -----------------------------------------------
{
  const lonely = reading('lonely', [{fact: 'mark', id: 'told-walkers-of-mall'}, {fact: 'word', of: 'walkers', atLeast: 'Friendly'}], ['mark', 'word']);
  const report = analyse({threads: [{file: 'lonely.js', thread: lonely}]});
  assert.deepEqual(report.readNeverWritten.map(item => item.fact), ['mark told-walkers-of-mall']);
  assert.deepEqual(report.readNeverWritten[0].readBy, [{id: 'lonely', places: ['starts']}]);
  // A word is the land's to write, so only a mark (or a thing made) is a warning.
  assert.ok(!report.readNeverWritten.some(item => item.fact.startsWith('word')));
  // A warning is not a fault.
  assert.equal(report.faults, 0);
  assert.match(renderText(report, 'tests'), /READ AND NEVER WRITTEN[^\n]*\n\s+mark told-walkers-of-mall\s+read in lonely \(starts\)/);
}

// ---- The walk: an end nobody reaches, a beat nobody reaches, a beat with no way out ------------------------------
{
  const sound = walkThread(story('sound'));
  assert.deepEqual(sound.faults, []);
  assert.equal(sound.start, 'sign');

  const noEnd = walkThread(story('no-end', {ends: ['done', 'never']}));
  assert.deepEqual(noEnd.faults, ['The end "never" cannot be reached by any path.']);

  const noBeat = walkThread(story('no-beat', {beats: {
    sign: {when: 'sign-seen', next: 'middle'},
    middle: {when: {after: 'sign'}, choices: [{id: 'x', next: 'done'}]},
    orphan: {when: {fact: 'night', atLeast: 9}, choices: [{id: 'y', next: 'done'}]},
  }}));
  assert.deepEqual(noBeat.faults, ['The beat "orphan" cannot be reached by any path.']);

  const stuck = walkThread(story('stuck', {beats: {
    sign: {when: 'sign-seen', next: 'middle'},
    middle: {when: {after: 'sign'}, choices: [{id: 'x', next: 'dead'}, {id: 'z', next: 'done'}]},
    dead: {when: {after: 'middle'}, lines: [{speaker: 'dot', words: 'Nothing more.'}]},
  }}));
  assert.deepEqual(stuck.faults, ['The beat "dead" has no way out and is not an end.']);

  // Every way of going on counts: a list of names, `{when, to}` rows, `to` and `end` as properties, an outcome that is a
  // name, `when: {after}` (one beat or several), and `ignored`.
  const ways = walkThread(story('ways', {
    ends: ['one', 'two', 'three'],
    beats: {
      sign: {when: 'sign-seen', next: ['a', {when: {fact: 'night', atLeast: 3}, to: 'b'}]},
      a: {choices: [{id: 'a1', to: 'c'}], outcomes: {late: 'd'}},
      b: {when: {after: ['sign']}, choices: [{id: 'b1', end: [{when: {fact: 'night', atLeast: 4}, is: 'one'}, {is: 'two'}]}]},
      c: {when: {after: ['a', 'b']}, choices: [{id: 'c1', next: 'three'}]},
      d: {when: {after: 'a'}, next: 'c'},
    },
  }));
  assert.deepEqual(ways.faults, []);
  // A beat live at any time stands beside the story: it is reached, and it need not lead anywhere.
  assert.deepEqual(walkThread(story('standing', {beats: {
    sign: {when: 'sign-seen', next: 'middle'},
    middle: {when: {after: 'sign'}, choices: [{id: 'x', next: 'done'}]},
    afterwards: {when: 'any-time', rows: []},
  }})).faults, []);
  // An end named only by the storyline's own ignore rule is reached.
  assert.deepEqual(walkThread(story('ignored-end', {ends: ['done', 'quiet'], ignored: {afterNights: 4, end: 'quiet'}})).faults, []);
}

// ---- Files: loading, --check, --dir, the page --------------------------------------------------------------------
const folder = join(scratch, 'content');
mkdirSync(folder);
writeFileSync(join(scratch, 'package.json'), '{"type": "module"}\n');
const save = (name, thread) => writeFileSync(join(folder, name + '.js'), '// written by the test\nexport default ' + JSON.stringify(thread, null, 1) + ';\n');
const run = (...args) => spawnSync(process.execPath, [TOOL, ...args], {encoding: 'utf8'});

// No storylines at all: it works, prints so, and passes.
{
  const empty = mkdirSync(join(scratch, 'empty'));
  void empty;
  const result = run('--dir', join(scratch, 'empty'), '--check');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /0 storylines/);
  assert.match(result.stdout, /There are no storylines yet\./);
  assert.equal(run('--dir', join(scratch, 'not-there'), '--check').status, 0);
}

save('writer', withEffects('writer', [{type: 'mark', id: 'writer/gate-broken'}]));
save('reader', reading('reader', [{fact: 'mark', id: 'writer/gate-broken'}], ['mark']));
{
  const loaded = await loadThreads(folder);
  assert.deepEqual(loaded.threads.map(item => item.thread.id).sort(), ['reader', 'writer']);
  const result = run('--dir', folder, '--check');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /2 storylines/);
  assert.match(result.stdout, /writer\s+--\[ mark writer\/gate-broken ]-->\s+reader/);
  assert.match(result.stdout, /No faults\./);
}

// --check exits 1 for a storyline checkThread refuses, and for a fault of the walk; 0 otherwise.
{
  save('slip', story('slip', {kind: 'nonsense'}));
  const refused = run('--dir', folder, '--check');
  assert.equal(refused.status, 1);
  assert.match(refused.stdout, /slip: It needs a kind/);
  assert.equal(run('--dir', folder).status, 0, 'without --check the exit is 0 even with a fault');
  rmSync(join(folder, 'slip.js'));

  save('lost', story('lost', {ends: ['done', 'never']}));
  const lost = run('--dir', folder, '--check');
  assert.equal(lost.status, 1);
  assert.match(lost.stdout, /The end "never" cannot be reached by any path\./);
  rmSync(join(folder, 'lost.js'));

  writeFileSync(join(folder, 'broken.js'), 'export default {;\n');
  const broken = run('--dir', folder, '--check');
  assert.equal(broken.status, 1);
  assert.match(broken.stdout, /broken\.js did not load/);
  rmSync(join(folder, 'broken.js'));

  assert.equal(run('--dir', folder, '--check').status, 0);
  assert.equal(run('--no-such-option').status, 2);
}

// The page stands alone, holds one <svg>, names every storyline, and needs no script.
{
  const page = join(scratch, 'out', 'crossings.html');
  const result = run('--dir', folder, '--html', page, '--check');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(existsSync(page));
  const html = readFileSync(page, 'utf8');
  assert.equal(html.match(/<svg[ >]/g).length, 1);
  assert.ok(!/<script/i.test(html));
  assert.ok(!/(src|href)="https?:/i.test(html), 'it loads nothing from outside');
  assert.match(html, /prefers-color-scheme:dark/);
  for (const title of ['Story writer', 'Story reader']) assert.ok(html.includes(title), title);
  assert.ok(html.includes('mark writer/gate-broken'));
  assert.match(html, /<path d="M[^"]+" marker-end="url\(#arrow\)"\/>/);
  // Names are escaped.
  const tricky = renderHtml(analyse({threads: [{file: 't.js', thread: story('tricky', {title: 'A <b>&"</b> title'})}]}));
  assert.ok(tricky.includes('A &lt;b&gt;&amp;&quot;&lt;/b&gt; title') && !tricky.includes('<b>'));
  // Without a file name it goes to .qa-dist/thread-crossings.html (checked on the printed line, so nothing is left to clean).
  assert.match(run('--dir', folder, '--html').stdout, /Page written to .*\.qa-dist[\\/]thread-crossings\.html/);
}

console.log('test-thread-crossings: ok');
