// LAB-LOOK: Brian's painted faces in the classroom panel. Four moods show four pictures, all four are asked for when the
// classroom opens, and a picture that fails leaves the letter B (the old 3D render, brian-portrait.js, is gone).
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {BRIAN_FACES, mountBrianFaces} from '../src/lab/classroom/brian-faces.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const MOODS = ['talk', 'cheer', 'hint', 'explain'];

// The width and height of a JPG, read from its frame header.
function jpegSize(buffer) {
  let at = 2;
  while (at < buffer.length) {
    if (buffer[at] !== 0xff) throw Error('Not a JPG.');
    const marker = buffer[at + 1], length = buffer.readUInt16BE(at + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return {height: buffer.readUInt16BE(at + 5), width: buffer.readUInt16BE(at + 7)};
    at += 2 + length;
  }
  throw Error('No frame header.');
}

test('four moods map to four different picture files, each a 512 by 512 JPG that is in the repository', () => {
  assert.deepEqual(Object.keys(BRIAN_FACES), MOODS);
  assert.equal(new Set(Object.values(BRIAN_FACES)).size, 4);
  for (const [mood, url] of Object.entries(BRIAN_FACES)) {
    assert.equal(url, `/assets/lab/brian-${mood}.jpg`);
    const file = new URL(`public${url}`, root);
    assert.ok(existsSync(file), `${url} is in public/`);
    assert.deepEqual(jpegSize(readFileSync(file)), {width: 512, height: 512}, `${url} is 512 x 512`);
  }
  assert.ok(existsSync(new URL('public/assets/lab/CREDITS.md', root)), 'the pictures have a credits page');
});

test('every mood the classroom gives Brian has a picture, and the page paints the matching one with the old border colours', () => {
  const moods = new Set([...read('src/lab/classroom/classroom-frame.js').matchAll(/mood: '(\w+)'/g)].map(m => m[1]));
  const lessonMoods = [...read('src/lab/classroom/classroom-ui.js').matchAll(/mood: '(\w+)'/g)].map(m => m[1]);
  for (const mood of [...moods, ...lessonMoods]) assert.ok(MOODS.includes(mood), `${mood} has a face`);
  const css = read('src/lab/classroom/classroom.css');
  for (const mood of MOODS) assert.match(css, new RegExp(`\\.lc-portrait\\[data-mood="${mood}"\\] \\.lc-face\\[data-face="${mood}"\\]\\.ready`), `${mood} shows its own face`);
  assert.match(css, /\.lc-portrait\[data-mood="cheer"\] \{ border-color: #56d683; \}/);
  assert.match(css, /\.lc-portrait\[data-mood="hint"\] \{ border-color: #edc557; \}/);
  assert.match(css, /\.lc-portrait\[data-mood="explain"\] \{ border-color: #f0a148; \}/);
});

test('the portrait is 132 pixels square with a 14 pixel corner, and a change of mood fades in 150 ms with no other movement', () => {
  const css = read('src/lab/classroom/classroom.css');
  const portrait = css.match(/\.lc-portrait \{[^}]*\}/)[0];
  assert.match(portrait, /width: 132px; height: 132px; border-radius: 14px/);
  assert.match(css.match(/\.lc-face \{[^}]*\}/)[0], /transition: opacity \.15s/);
  assert.doesNotMatch(css, /\.lc-portrait\[data-mood[^{]*\{[^}]*transform/, 'a mood changes no size or position');
});

// A small stand-in for the page: just enough to see what the classroom asks for.
function fakePage() {
  const make = () => ({
    dataset: {}, listeners: {}, removed: false, classes: new Set(),
    classList: {add(name) { this.owner.classes.add(name); }},
    addEventListener(type, fn) { this.listeners[type] = fn; },
    remove() { this.removed = true; },
  });
  const portrait = {children: [], append(child) { this.children.push(child); }, ownerDocument: {createElement() { const el = make(); el.classList.owner = el; return el; }}};
  return portrait;
}

test('opening the classroom asks for all four faces at once; a loaded face is ready and a missing face is removed, leaving the letter B', () => {
  const portrait = fakePage();
  mountBrianFaces(portrait);
  assert.deepEqual(portrait.children.map(face => face.dataset.face), MOODS);
  assert.deepEqual(portrait.children.map(face => face.src), Object.values(BRIAN_FACES), 'every picture is requested before it is needed');
  const [talk, cheer] = portrait.children;
  talk.listeners.load(); cheer.listeners.error();
  assert.ok(talk.classes.has('ready') && !talk.removed);
  assert.ok(cheer.removed && !cheer.classes.has('ready'), 'a failed picture is taken away and never shown');
});

test('the old 3D render of Brian is gone and the classroom uses the painted faces', () => {
  assert.ok(!existsSync(new URL('src/lab/classroom/brian-portrait.js', root)));
  const source = read('src/lab/classroom/classroom-ui.js');
  assert.doesNotMatch(source, /brian-portrait/);
  assert.match(source, /mountBrianFaces\(\$\('\.lc-portrait'\)\)/);
});
