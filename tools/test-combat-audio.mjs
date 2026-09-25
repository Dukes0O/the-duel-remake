import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EngineAudio } from '../src/audio.js';
import { SOUND_BANK } from '../src/sound-bank.js';

test('approved combat recipes declare compressed variants and provenance', async () => {
  const { COMBAT_RECIPES } = await import('./audio/build-combat.mjs');
  const ids = new Set(COMBAT_RECIPES.flatMap((r) => r.sources));
  for (const id of [
    '523089',
    '397691',
    '592388',
    '854476',
    '854473',
    '384905',
    '394180',
  ])
    assert(ids.has(id), id);
  for (const id of [
    'weapon.crossbow.fire',
    'weapon.crossbow.flight',
    'weapon.rpg.fire',
    'combat.blast.recorded',
    'vehicle.crash.recorded',
    'combat.hit-confirm',
  ]) {
    const cue = SOUND_BANK[id];
    assert(cue?.files?.length === 3, id);
    assert.equal(cue.flag, 'wasteland2');
    for (const file of cue.files) {
      assert(file.endsWith('.ogg'));
      assert.equal(
        readFileSync('public/assets/audio/' + file).toString('ascii', 0, 4),
        'OggS',
      );
    }
  }
});
test('recorded variants rotate without immediate repetition and flag-off cannot play them', () => {
  const a = new EngineAudio({ flags: { enabled: () => true } }),
    calls = [];
  a.cueBuffers['weapon.crossbow.fire'] = [{ v: 0 }, { v: 1 }, { v: 2 }];
  a._runCue = (id, fn) => {
    fn();
    return {};
  };
  a._sample = (b) => calls.push(b.v);
  a._layer = () =>
    assert.fail('loaded recording must replace placeholder layers');
  for (let i = 0; i < 7; i++) a._playCue('weapon.crossbow.fire');
  assert.deepEqual(calls, [0, 1, 2, 0, 1, 2, 0]);
  a.flags = { enabled: () => false };
  a._playCue('weapon.crossbow.fire');
  assert.equal(calls.length, 7);
});
function moving() {
  const a = new EngineAudio({ flags: { enabled: () => true } }),
    calls = [];
  a.context = { state: 'running' };
  a.muted = false;
  a.cueBuffers['weapon.crossbow.flight'] = [
    { duration: 1 },
    { duration: 1 },
    { duration: 1 },
  ];
  a.mixer = {
    playMoving(id, buffer, p, ear) {
      const v = {
        stops: 0,
        updates: [],
        stop() {
          this.stops++;
        },
        update(p, e) {
          this.updates.push([structuredClone(p), structuredClone(e)]);
        },
      };
      calls.push({ id, p, ear, v });
      return v;
    },
  };
  const s = {
    status: 'racing',
    paused: false,
    combat: {
      projectiles: [
        {
          id: 1,
          kind: 'crossbow',
          x: 2,
          y: 1,
          z: 5,
          vx: 8,
          vy: 0,
          vz: 40,
          age: 0,
        },
      ],
    },
  };
  return { a, calls, s, ear: { x: 0, y: 1, z: 0, heading: 0, vz: 20 } };
}
test('flight follows each projectile once, reads state only, and stops on removal', () => {
  const { a, calls, s, ear } = moving(),
    before = JSON.stringify(s);
  a._updateProjectiles(s, { listener: ear });
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify(s), before);
  s.combat.projectiles[0].x = 30;
  a._updateProjectiles(s, { listener: ear });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].v.updates.at(-1)[0].x, 30);
  s.combat.projectiles = [];
  a._updateProjectiles(s, { listener: ear });
  assert.equal(calls[0].v.stops, 1);
  assert.equal(a.projectileVoices.size, 0);
});
test('pause/menu/mute/flag-off clear flight ownership and missing buffers stay silent', () => {
  for (const change of [
    (s) => (s.paused = true),
    (s) => (s.status = 'menu'),
    (_, a) => (a.muted = true),
    (_, a) => (a.flags = { enabled: () => false }),
  ]) {
    const { a, calls, s, ear } = moving();
    a._updateProjectiles(s, { listener: ear });
    change(s, a);
    a._updateProjectiles(s, { listener: ear });
    assert.equal(calls[0].v.stops, 1);
    assert.equal(a.projectileVoices.size, 0);
  }
  const { a, calls, s, ear } = moving();
  a.cueBuffers = {};
  a._updateProjectiles(s, { listener: ear });
  assert.equal(calls.length, 0);
});

test('every driving weapon has an arcade signature and real projectiles have flight cues', () => {
  for (const id of [
    'weapon.ufo.fire',
    'weapon.bomb.fire',
    'weapon.star.fire',
    'raider.shot',
    'weapon.bomb.flight',
    'weapon.rpg.flight',
  ]) {
    assert.equal(SOUND_BANK[id]?.flag, 'wasteland2');
    assert.equal(SOUND_BANK[id]?.files?.length, 3, id);
  }
});

test('wasteland2 off preserves pre-migration Wasteland weapon layers even when recordings are loaded', () => {
  const a = new EngineAudio({ flags: { enabled: () => false } }),
    layers = [];
  a.cueBuffers['weapon.crossbow.fire'] = [{}];
  a._runCue = (id, fn) => fn();
  a._sample = () => assert.fail('off cannot play replacement recording');
  a._layer = (layer, destination, scale) => layers.push({ layer, scale });
  a._weaponCue('crossbow');
  assert.equal(layers.length, 3);
  assert(layers.every((row) => row.scale === 1));
});
