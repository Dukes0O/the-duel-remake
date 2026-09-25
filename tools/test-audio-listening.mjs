import { resolvePitchOctaves } from './audio-analysis.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, relative } from 'node:path';
import { createServer } from 'node:http';
import { verdictMiddleware } from './audio/booth-server.mjs';
import {
  measureLoudness,
  loopSeam,
  repetition,
} from './audio/measurements.mjs';
import { validateVerdict, saveVerdict } from './audio/verdicts.mjs';
import { wavFromPcm } from './scenarios/audio-race.mjs';

function tone(amplitude, frequency = 1000, phase = 0, seconds = 3) {
  const rate = 48000,
    length = rate * seconds,
    pcm = Buffer.alloc(length * 4);
  for (let i = 0; i < length; i++) {
    const value = Math.round(
      Math.sin((i * 2 * Math.PI * frequency) / rate + phase) *
        amplitude *
        32767,
    );
    pcm.writeInt16LE(value, i * 4);
    pcm.writeInt16LE(value, i * 4 + 2);
  }
  return wavFromPcm(pcm, rate);
}

test('LUFS follows a known 6.02 dB gain change and silence is not a pass', () => {
  const quiet = measureLoudness(tone(0.1));
  const loud = measureLoudness(tone(0.2));
  assert.equal(quiet.available, true);
  assert(Math.abs(loud.integratedLufs - quiet.integratedLufs - 6.0206) < 0.12);
  assert(Math.abs(loud.truePeakDbtp - quiet.truePeakDbtp - 6.0206) < 0.12);
  assert.equal(measureLoudness(tone(0)).available, false);
});

test('true peak detects a peak between samples that PCM sample peak misses', () => {
  // Samples are +/- .8485 but the reconstructed 12 kHz tone reaches 1.2.
  const result = measureLoudness(tone(1.2, 12000, Math.PI / 4));
  assert(result.truePeakDbtp > 0, JSON.stringify(result));
  assert.equal(result.targets.truePeak.pass, false);
});

test('loop seam detects a discontinuous wrap without rejecting an integral sine loop', () => {
  const rate = 48000;
  const clean = Float32Array.from(
    { length: rate },
    (_, i) => 0.1 * Math.sin((2 * Math.PI * 100 * i) / rate),
  );
  const broken = Float32Array.from({ length: rate }, (_, i) => i / rate - 0.5);
  assert.equal(loopSeam([clean], rate).pass, true);
  assert.equal(loopSeam([broken], rate).pass, false);
  assert.equal(loopSeam([new Float32Array()], rate).available, false);
});

test('repetition separates one repeated take from varied takes and insufficient evidence', () => {
  const events = (variants) =>
    variants.map((variant, i) => ({
      cue: 'weapon.crossbow.fire',
      variant,
      audioTimeSec: i,
    }));
  const repeated = repetition(events(['A', 'A', 'A', 'A', 'A']));
  const varied = repetition(events(['A', 'B', 'C', 'A', 'B']));
  assert.equal(repeated.pass, false);
  assert.equal(repeated.longestRun, 5);
  assert.equal(varied.pass, true);
  assert.equal(repetition(events(['A'])).available, false);
  assert.equal(
    repetition([{ cue: 'x' }, { cue: 'x' }, { cue: 'x' }]).available,
    false,
  );
});

const valid = {
  schema: 1,
  card: 'AUD-11',
  round: 1,
  cue: 'weapon.crossbow.fire',
  variant: 'A',
  distance: 'near',
  bed: 'full-throttle',
  listener: 'QA fixture',
  rating: 4,
  notes: 'Test fixture only; never a human listening verdict.',
};

test('verdicts require an explicit human rating and safe bounded fields', () => {
  assert.equal(validateVerdict(valid).rating, 4);
  for (const change of [
    { rating: 0 },
    { rating: 6 },
    { rating: null },
    { rating: '4' },
    { round: -1 },
    { listener: '' },
    { notes: 'x'.repeat(4001) },
    { card: '../../outside' },
    { cue: '../../outside' },
    { variant: 'unbounded' },
    { distance: 'unknown' },
  ]) {
    assert.throws(() => validateVerdict({ ...valid, ...change }));
  }
});

test('verdict persistence preserves explicit ratings without overwriting another review', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'duel-listening-test-'));
  try {
    const a = await saveVerdict(valid, folder);
    const b = await saveVerdict({ ...valid, rating: 2 }, folder);
    assert.notEqual(a.file, b.file);
    assert.equal((await readdir(folder)).length, 2);
    assert.equal(
      JSON.parse(await readFile(join(folder, a.file), 'utf8')).rating,
      4,
    );
    assert.equal(
      JSON.parse(await readFile(join(folder, b.file), 'utf8')).rating,
      2,
    );
    await assert.rejects(saveVerdict({ ...valid, card: '../escape' }, folder));
  } finally {
    assert(
      !relative(resolve(tmpdir()), resolve(folder)).startsWith('..') &&
        resolve(folder) !== resolve(tmpdir()),
    );
    await rm(folder, { recursive: true, force: true });
  }
});

test('local verdict endpoint rejects foreign origins and saves one valid explicit review', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'duel-booth-http-'));
  const handler = verdictMiddleware({ folder });
  const server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  try {
    const send = (originHeader, body) =>
      fetch(origin + '/__audio/verdict', {
        method: 'POST',
        headers: { Origin: originHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    assert.equal((await send('https://foreign.example', valid)).status, 403);
    assert.equal((await send(origin, { ...valid, rating: null })).status, 400);
    assert.equal((await readdir(folder)).length, 0);
    const response = await send(origin, valid);
    assert.equal(response.status, 201);
    const saved = await response.json();
    assert.equal(
      JSON.parse(await readFile(join(folder, saved.file), 'utf8')).rating,
      4,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert(
      !relative(resolve(tmpdir()), resolve(folder)).startsWith('..') &&
        resolve(folder) !== resolve(tmpdir()),
    );
    await rm(folder, { recursive: true, force: true });
  }
});

test('octave recovery uses the audio trend through a brief ambiguous reading', () => {
  const trace = [50, 60, 70, 50, 95, 52.5, 60].map((rawPitchHz, i) => ({
    rawPitchHz,
    timeSec: i * 0.12,
  }));
  assert.deepEqual(
    resolvePitchOctaves(trace).map((row) => row.pitchHz),
    [50, 60, 70, 100, 95, 105, 120],
  );
  const falling = [120, 110, 100, 45, 80, 70].map((rawPitchHz, i) => ({
    rawPitchHz,
    timeSec: i * 0.12,
  }));
  assert.deepEqual(
    resolvePitchOctaves(falling).map((row) => row.pitchHz),
    [120, 110, 100, 90, 80, 70],
  );
});

// Run the real booth module with a deferred file load, not a copy of play/stop.
async function pendingBooth() {
  let loaded;
  const loading = new Promise((resolve) => {
    loaded = resolve;
  });
  const played = [];
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id))
      elements.set(id, {
        value:
          id === 'bed'
            ? 'full-throttle'
            : id === 'distance'
              ? 'near'
              : 'weapon.crossbow.fire',
        textContent: '',
        add() {},
        addEventListener() {},
      });
    return elements.get(id);
  };
  class Context {
    state = 'suspended';
    async resume() {
      this.state = 'running';
    }
    async suspend() {
      this.state = 'suspended';
    }
    createAnalyser() {
      return {};
    }
  }
  class Audio {
    activeShots = new Set();
    cueIndices = new Map();
    output = { connect() {} };
    mixer = {
      output() {},
      stopAll() {
        played.length = 0;
      },
      movingOutput() {
        return { input: {}, disconnect() {} };
      },
    };
    _build(context) {
      this.context = context;
      this._samplesPromise = loading;
      this._ambiencePromise = Promise.resolve();
      this._cueBuffersPromise = Promise.resolve();
      this.sampleStatus = this.ambienceStatus = 'ready';
    }
    update() {}
    _stopHiddenRoadVoices() {}
    _playCue(id) {
      played.push(this.cueIndices.get(id));
    }
  }
  const window = { addEventListener() {} };
  const source = (
    await readFile(new URL('./audio/listening.js', import.meta.url), 'utf8')
  )
    .replace(/^import .*;$/m, '')
    .replace(/^const \{ EngineAudio \} = await import.*;$/m, '')
    .replace(/^const \{ SOUND_BANK \} = await import.*;$/m, '');
  await runInNewContext('(async()=>{' + source + '\n})()', {
    installIsolatedStorage() {},
    EngineAudio: Audio,
    AudioContext: Context,
    SOUND_BANK: {
      'weapon.crossbow.fire': { files: ['a', 'b', 'c'], bus: 'weapons' },
    },
    document: { getElementById: element, querySelectorAll: () => [] },
    window,
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
  });
  return { booth: window.__listeningBooth, played, loaded, element };
}

test('newest booth selection owns playback when A/B arrive during file loading', async () => {
  const { booth, played, loaded } = await pendingBooth();
  const a = booth.play('A');
  const b = booth.play('B');
  await new Promise(setImmediate);
  loaded();
  await Promise.all([a, b]);
  assert.deepEqual(played, [1], 'only the requested B take may play');
  assert.equal(booth.verdict().variant, 'B');
  await booth.stop();
});

test('Stop during booth loading cancels pending playback and leaves context suspended', async () => {
  const { booth, played, loaded, element } = await pendingBooth();
  const play = booth.play('A');
  await new Promise(setImmediate);
  await booth.stop();
  loaded();
  await play;
  assert.deepEqual(
    played,
    [],
    'loading completion must not restart a stopped audition',
  );
  assert.equal(booth.audio.context.state, 'suspended');
  assert.equal(element('status').textContent, 'Stopped.');
  assert.throws(() => booth.verdict(), /Play a sound/);
});
