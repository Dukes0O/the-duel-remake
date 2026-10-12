// Course-owned fixtures. Reading these files never starts a suite or a race.
import {readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {COURSE} from '../src/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function courseFiles(folder) {
  return readdirSync(folder).filter(name => /^[a-z][a-z0-9-]*\.json$/.test(name)).sort()
    .map(name => ({path: join(folder, name), value: read(join(folder, name))}));
}
export function loadWorldSignatures() {
  const signatures = {};
  for (const {value} of courseFiles(join(root, 'tools/fixtures/world-signatures')))
    for (const [id, signature] of Object.entries(value)) {
      if (Object.hasOwn(signatures, id)) throw Error('Duplicate world signature: ' + id);
      signatures[id] = signature;
    }
  return signatures;
}
export function loadReplayCatalog({definitions = COURSE} = {}) {
  const fixture = read(join(root, 'tools/replays/recorded-inputs.json'));
  const expected = read(join(root, 'tools/replays/expected-fingerprints.json'));
  const files = courseFiles(join(root, 'tools/replays/courses'));
  for (const definition of definitions) {
    const owned = files.find(row => row.value.eventId === definition.id);
    if (!owned) continue;
    fixture.cases.push(...owned.value.cases);
    for (const [id, fingerprints] of Object.entries(owned.value.fingerprints)) {
      if (Object.hasOwn(expected.fingerprints, id)) throw Error('Duplicate replay fingerprint: ' + id);
      expected.fingerprints[id] = fingerprints;
    }
  }
  return {fixture, expected};
}
export function writeReplayFingerprints(baseline) {
  const basePath = join(root, 'tools/replays/expected-fingerprints.json');
  const base = read(basePath);
  for (const id of Object.keys(base.fingerprints)) base.fingerprints[id] = baseline.fingerprints[id];
  writeFileSync(basePath, JSON.stringify(base, null, 2) + '\n');
  for (const {path, value} of courseFiles(join(root, 'tools/replays/courses'))) {
    for (const id of Object.keys(value.fingerprints)) {
      if (Object.hasOwn(baseline.fingerprints, id)) value.fingerprints[id] = baseline.fingerprints[id];
    }
    writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
  }
}
