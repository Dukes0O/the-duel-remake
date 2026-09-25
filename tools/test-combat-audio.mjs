import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EngineAudio } from '../src/audio.js';
import { SoundMixer } from '../src/sound-mixer.js';
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

test('procedural arcade variants rebuild deterministically without simulation randomness', async () => {
  const { COMBAT_RECIPES, synthesize } =
    await import('./audio/build-combat.mjs');
  const source = () =>
    Float32Array.from({ length: 48000 }, (_, i) => Math.sin(i * 0.18) * 0.5);
  for (const recipe of COMBAT_RECIPES.filter((r) => r.kind !== 'recording')) {
    const a = synthesize(recipe, 0, source),
      b = synthesize(recipe, 0, source),
      c = synthesize(recipe, 1, source);
    assert.deepEqual(a, b, recipe.cue);
    assert.notDeepEqual(a, c, recipe.cue + ' variants differ');
    assert(a.every(Number.isFinite));
    assert.equal(a[0], 0);
    assert.equal(a.at(-1), 0);
  }
});

test('all compressed variants retain true-peak headroom and a valid runtime home', async () => {
  const { measureLoudness } = await import('./audio/measurements.mjs');
  for (const [id, cue] of Object.entries(SOUND_BANK))
    for (const file of cue.files || []) {
      const bytes = readFileSync('public/assets/audio/' + file);
      assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
      const measurement = measureLoudness(bytes);
      assert(measurement.available, id);
      assert(measurement.truePeakDbtp <= -1, id + ' codec true peak');
    }
});

// Exercise the real renderer ownership and mixer, with only Web Audio mocked.
function finiteFlight() {
  const fixture = moving();
  const nodes = [],
    sources = [];
  const param = () => ({
    value: 0,
    writes: 0,
    cancelScheduledValues() {},
    setTargetAtTime(value) {
      this.value = value;
      this.writes++;
    },
  });
  const node = () => {
    const item = {
      connections: new Set(),
      gain: param(),
      playbackRate: param(),
      positionX: param(),
      positionY: param(),
      positionZ: param(),
      connect(target) {
        this.connections.add(target);
      },
      disconnect(target) {
        if (target) this.connections.delete(target);
        else this.connections.clear();
      },
    };
    nodes.push(item);
    return item;
  };
  fixture.a.context = {
    state: 'running',
    currentTime: 0,
    createGain: node,
    createPanner: node,
    createBufferSource() {
      const source = node();
      source.starts = 0;
      source.stops = [];
      source.start = () => source.starts++;
      source.stop = (time) => source.stops.push(time);
      sources.push(source);
      return source;
    },
  };
  fixture.a.mixer = new SoundMixer(fixture.a.context, node(), {
    enabled: true,
  });
  return { ...fixture, nodes, sources };
}

test('a naturally ended flight tail remains silent until that projectile is removed', () => {
  const { a, s, ear, sources } = finiteFlight();
  a._updateProjectiles(s, { listener: ear });
  const voice = a.projectileVoices.get(1);
  assert.equal(sources[0].loop, false, 'flight tails are finite one-shots');
  sources[0].onended();
  assert.equal(a.mixer.voices.get('weapon.crossbow.flight').size, 0);
  assert.equal(
    voice.output.input.connections.size,
    0,
    'ended spatial route releases',
  );
  const writes = voice.output.input.positionX.writes;
  for (let i = 0; i < 120; i++) {
    s.combat.projectiles[0].x++;
    a._updateProjectiles(s, { listener: ear });
  }
  assert.equal(
    sources.length,
    1,
    'a still-live projectile never restarts its tail',
  );
  assert.equal(
    a.projectileVoices.get(1),
    voice,
    'identity suppresses reacquisition',
  );
  assert.equal(
    voice.output.input.positionX.writes,
    writes,
    'ended routes receive no updates',
  );
  s.combat.projectiles = [];
  a._updateProjectiles(s, { listener: ear });
  assert.equal(a.projectileVoices.size, 0);
  assert.deepEqual(
    sources[0].stops,
    [],
    'natural end does not cause a second stop',
  );
});

test('cue-capacity stealing fades the oldest flight once without frame-by-frame reacquisition', () => {
  const { a, s, ear, sources } = finiteFlight();
  const limit = SOUND_BANK['weapon.crossbow.flight'].limit;
  const projectile = s.combat.projectiles[0];
  s.combat.projectiles = Array.from({ length: limit + 1 }, (_, id) => ({
    ...projectile,
    id,
  }));
  a._updateProjectiles(s, { listener: ear });
  const stolen = a.projectileVoices.get(0);
  assert.deepEqual(
    sources[0].stops,
    [0.04],
    'capacity uses the existing short fade',
  );
  assert.equal(a.mixer.voices.get('weapon.crossbow.flight').size, limit);
  sources[0].onended();
  assert.equal(stolen.output.input.connections.size, 0);
  for (let i = 0; i < 120; i++) a._updateProjectiles(s, { listener: ear });
  assert.equal(
    sources.length,
    limit + 1,
    'stolen projectile does not churn the voice pool',
  );
  assert.deepEqual(sources[0].stops, [0.04]);
  assert.equal(a.projectileVoices.get(0), stolen);
  s.combat.projectiles = [];
  a._updateProjectiles(s, { listener: ear });
  for (const source of sources) source.onended();
  assert.equal(a.projectileVoices.size, 0);
  assert.equal(a.mixer.voices.get('weapon.crossbow.flight').size, 0);
});
