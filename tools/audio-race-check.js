// QA-only real-time recording. The page replaces storage before importing App.
import { installIsolatedStorage } from './qa-storage.js';
installIsolatedStorage();
const { App } = await import('../src/app.js');
const { combatAudioSpace } = await import('../src/audio.js');
const app = new App();
const qa = { limiter: null, recorder: null, category: null };
const originalConnect = AudioNode.prototype.connect;
AudioNode.prototype.connect = function(destination, ...rest) {
  if (destination instanceof DynamicsCompressorNode && this === app.audio.master) qa.limiter = destination;
  const recorder = qa.recorder;
  if (recorder && (destination === app.audio.master || destination === app.audio.vehicleBus)) {
    const kind = qa.category || 'ui';
    originalConnect.call(this, recorder.buses[kind]);
  }
  return originalConnect.call(this, destination, ...rest);
};
const originalEvent = app.audio.event.bind(app.audio);
app.audio.event = event => {
  qa.category = event.crash || event.combatExplosion || event.combatHit || event.explosion || event.weaponFired || event.propCrushed || event.jumpLanded ? 'weapons' : event.shift != null ? 'engine' : 'ui';
  try { originalEvent(event); } finally { qa.category = null; }
};

const TRACKS = ['mix', 'engine', 'tires', 'weapons', 'ambience', 'ui'];
const DIVISOR = 3;
function createRecorder(audio) {
  const context = audio.context;
  const recorder = { buses: {}, processors: {}, chunks: {}, firstPlayback: {}, startTime: context.currentTime,
    sampleRate: context.sampleRate / DIVISOR, events: [], frames: [] };
  const silent = context.createGain(); silent.gain.value = 0; silent.connect(context.destination);
  recorder.silent = silent;
  for (const track of TRACKS) {
    const bus = context.createGain(), processor = context.createScriptProcessor(2048, 2, 2);
    bus.gain.value = track === 'mix' ? 1 : .42;
    bus.connect(processor); processor.connect(silent);
    recorder.buses[track] = bus; recorder.processors[track] = processor; recorder.chunks[track] = [];
    processor.onaudioprocess = event => {
      if (recorder.firstPlayback[track] == null) recorder.firstPlayback[track] = event.playbackTime;
      const left = event.inputBuffer.getChannelData(0), right = event.inputBuffer.getChannelData(1);
      const chunk = new Int16Array(Math.ceil(left.length / DIVISOR) * 2);
      let at = 0;
      for (let index = 0; index < left.length; index += DIVISOR) {
        chunk[at++] = Math.round(Math.max(-1, Math.min(1, left[index])) * 32767);
        chunk[at++] = Math.round(Math.max(-1, Math.min(1, right[index])) * 32767);
      }
      recorder.chunks[track].push(chunk);
    };
  }
  if (!qa.limiter) throw Error('The game audio limiter was not found.');
  originalConnect.call(qa.limiter, recorder.buses.mix);
  const engineNodes = [audio.engineGain];
  for (const key of ['idle', 'loadLow', 'loadMid', 'loadHigh', 'coast', 'engine']) {
    const sample = audio.samples[key];
    if (sample?.gain) engineNodes.push(sample.gain, sample.body?.gain, sample.intake?.gain);
  }
  for (const node of engineNodes.filter(Boolean)) originalConnect.call(node, recorder.buses.engine);
  for (const node of [audio.tires.gain, audio.gravel.gain, audio.samples.squeal?.gain].filter(Boolean))
    originalConnect.call(node, recorder.buses.tires);
  for (const node of [audio.wind.gain, audio.sirenGain, ...Object.values(audio.ambience).map(layer => layer.gain)])
    originalConnect.call(node, recorder.buses.ambience);
  return recorder;
}

window.__audioQaStart = async () => {
  if (qa.recorder) throw Error('Recording already started.');
  app.audio.unlock();
  await Promise.all([app.audio._samplesPromise, app.audio._ambiencePromise]);
  if (app.audio.context.state !== 'running') throw Error('AudioContext did not start.');
  qa.recorder = createRecorder(app.audio);
  const recorder = qa.recorder;
  const eventKinds = ['combatExplosion', 'combatHit', 'weaponFired', 'shift', 'jumpLanded', 'powerupCollected', 'crash', 'propCrushed'];
  recorder.detach = app.duel.onChange((state, event) => {
    for (const kind of eventKinds) if (event[kind] != null && event[kind] !== false) recorder.events.push({
      kind, audioTimeSec: app.audio.context.currentTime - recorder.startTime,
      simTimeSec: state.stageTimeSec, source: event.qaProbe ? 'qa-probe' : 'race',
      detail: kind === 'combatHit' ? { victim: event.victim, enemy: event.enemy } : event.qaProbe ? { side: event.qaSide, distance: event.qaDistance, stress: !!event.qaStress } : null,
      audioSpatial: ['combatExplosion','combatHit'].includes(kind) ? combatAudioSpace(event,state,app.duel.course) : null,
    });
  });
  app.autopilot = true;
  app._scriptedCrashDone = true;
  if (!app.startCampaign({ mode: 'wasteland', car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium', seed: 1989 }))
    throw Error('The isolated Wasteland race did not start.');
  let fired = false, firstProbe = false, secondProbe = false, stressProbe = false;
  app.onFrame = state => {
    recorder.frames.push({ audioTimeSec: app.audio.context.currentTime - recorder.startTime,
      simTimeSec: state.stageTimeSec, revs: state.revs, speedMph: state.speedMph,
      throttle: state.input.throttle, gear: state.gear, status: state.status, impacting: state.impactTimer > 0,
      slipAngle: state.slipAngle, steerVisual: state.steerVisual, offRoad: state.offRoad,
      rivalS: state.rival?.s ?? null, playerS: state.s });
    if (state.status !== 'racing') return;
    if (!fired && state.stageTimeSec >= 1) { fired = true; app.duel.fireWeapon('crossbow'); app.duel.fireWeapon('bomb'); }
    // Calibrated in-race event probes guarantee two explosion transients even
    // when the scripted projectile misses. They do not change race physics.
    if (!firstProbe && state.stageTimeSec >= 2) { firstProbe = true; app.duel.emit({ combatExplosion: true, qaProbe: true, qaSide: -1, qaDistance: 15 }); }
    if (!secondProbe && state.stageTimeSec >= 6) { secondProbe = true; app.duel.emit({ combatExplosion: true, qaProbe: true, qaSide: 1, qaDistance: 80 }); }
    if (!stressProbe && state.stageTimeSec >= 9) {
      stressProbe = true;
      for (let index = 0; index < 6; index++) app.duel.emit({ combatExplosion: true, qaProbe: true, qaStress: true, qaSide: index % 2 ? 1 : -1, qaDistance: 20 });
    }
  };
  app.start();
  return { sampleRate: recorder.sampleRate, storageIsMemory: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value };
};

window.__audioQaFinish = () => {
  const recorder = qa.recorder;
  if (!recorder) throw Error('Recording was not started.');
  app.stop(); recorder.detach();
  const tracks = {};
  for (const track of TRACKS) {
    const chunks = recorder.chunks[track], size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const samples = new Int16Array(size);
    let offset = 0;
    for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
    const bytes = new Uint8Array(samples.buffer);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    // ScriptProcessor's playbackTime includes its output buffering delay in
    // headless Chrome. The captured input begins at recorder.startTime.
    tracks[track] = { pcmBase64: btoa(binary), audioStartSec: 0,
      firstPlaybackSec: recorder.firstPlayback[track] - recorder.startTime, frames: samples.length / 2 };
    recorder.processors[track].disconnect(); recorder.buses[track].disconnect();
  }
  recorder.silent.disconnect(); qa.recorder = null;
  return { sampleRate: recorder.sampleRate, channels: 2, tracks, events: recorder.events, frames: recorder.frames,
    memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value,
    sampleStatus: app.audio.sampleStatus, ambienceStatus: app.audio.ambienceStatus };
};
window.__audioQaReady = true;
