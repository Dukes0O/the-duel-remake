import { installIsolatedStorage } from '../qa-storage.js';
installIsolatedStorage();
const { EngineAudio } = await import('../../src/audio.js');
const { SOUND_BANK } = await import('../../src/sound-bank.js');
const byId = (id) => document.getElementById(id);
const audio = new EngineAudio({ flags: { enabled: () => true } });
const state = {
  car: 'falcone_f42',
  mode: 'wasteland',
  maxArmor: 100,
  status: 'racing',
  paused: false,
  speedMph: 120,
  revs: 0.85,
  gear: 3,
  input: { throttle: 1, brake: 0 },
  slipAngle: 0,
  steerVisual: 0,
  offRoad: false,
  roughness: 0,
  airborne: false,
  airHeight: 0,
  impactTimer: 0,
  police: { beep: 0, pursuit: null },
};
const course = { groundAt: () => ({ x: 0, y: 0, z: 0, heading: 0 }) };
let previewId = null;
let active = 'A',
  audition = null,
  frame = 0,
  timer = 0,
  meter,
  readyPromise,
  output,
  playing = false;
const inputs = [...document.querySelectorAll('[data-cue]')];
for (const select of inputs) {
  for (const id of Object.keys(SOUND_BANK)) select.add(new Option(id, id));
  select.value = 'weapon.crossbow.fire';
}
async function ready() {
  if (!readyPromise)
    readyPromise = (async () => {
      audio.muted = false;
      audio._build(new AudioContext());
      await Promise.all([
        audio._samplesPromise,
        audio._ambiencePromise,
        audio._cueBuffersPromise,
      ]);
      if (audio.sampleStatus !== 'ready' || audio.ambienceStatus !== 'ready')
        throw Error('Sound files could not be loaded.');
      meter = audio.context.createAnalyser();
      meter.fftSize = 2048;
      audio.output.connect(meter);
    })();
  await readyPromise;
  await audio.context.resume();
}
function updateBed() {
  audio.nextBeat = Infinity;
  audio.update(state, { biome: 'coast' });
  if (byId('bed').value === 'quiet') {
    for (const item of [
      audio.engineGain,
      previewId === 'vehicle.siren' ? null : audio.sirenGain,
      audio.wind.gain,
      audio.tires.gain,
      audio.gravel.gain,
      audio.boost.gain,
      ...Object.values(audio.samples).flatMap((s) => [
        s.gain,
        s.body?.gain,
        s.intake?.gain,
      ]),
      ...Object.values(audio.ambience).map((s) => s.gain),
    ].filter(Boolean)) {
      item.gain.cancelScheduledValues(audio.context.currentTime);
      item.gain.value = 0;
    }
  }
  if (playing) frame = requestAnimationFrame(updateBed);
}
function preview(id, index) {
  const def = SOUND_BANK[id],
    distance = byId('distance').value === 'far' ? 120 : 15;
  const original = audio.mixer.output.bind(audio.mixer);
  output = audio.mixer.movingOutput(
    id,
    { x: distance * 0.6, y: 0, z: distance * 0.8 },
    { x: 0, y: 0, z: 0 },
  );
  audio.mixer.output = () => output.input;
  try {
    if (def.files) {
      audio.cueIndices.set(id, index);
      audio._playCue(id);
    } else if (id === 'combat.blast') {
      audio.blastIndex = index;
      audio._runCue(id, () =>
        audio._combatBlast({ qaSide: 0.6, qaDistance: 15 }, state, course),
      );
    } else if (id === 'vehicle.crash')
      audio.event({ crash: true, strength: 0.7 }, state, course);
    else if (id === 'vehicle.crush') audio._crushImpact(0.7);
    else if (id === 'vehicle.flutter') audio._flutter();
    else if (id.startsWith('gate.')) {
      const bus = audio.hiddenRoadBus;
      audio.hiddenRoadBus = output.input;
      try {
        const voice = audio._createHiddenRoadVoice({
          kind: id.slice(5),
          index,
        });
        if (voice) audio.hiddenRoadVoices.add(voice);
      } finally {
        audio.hiddenRoadBus = bus;
      }
    } else if (def.file) {
      const sample =
        audio.cueBuffers[id] ||
        (def.biome ? audio.ambience[def.biome] : audio.samples[def.sample]);
      const buffer = sample?.source?.buffer || sample;
      audio._sample(
        buffer,
        def.gain ?? def.volume,
        1,
        output.input,
        def.bus === 'voice' ? buffer.duration : Math.min(2, buffer.duration),
      );
    } else if (id === 'music.sequence') {
      const note = def.pattern[index];
      audio._runCue(id, () => {
        audio._tone(
          note * 2,
          def.lead.duration[1],
          def.lead.volume[1],
          def.lead.type,
        );
        audio._tone(
          note / 2,
          def.bass.duration[1],
          def.bass.volume[1],
          def.bass.type,
        );
      });
    } else if (def.filter && def.loop) {
      const source = audio.context.createBufferSource(),
        filter = audio.context.createBiquadFilter(),
        gain = audio.context.createGain();
      source.buffer = audio.noiseBuffer;
      source.loop = true;
      [filter.type, filter.frequency.value] = def.filter;
      gain.gain.value = 0.15;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(output.input);
      source.start();
      output.stopExtra = () => {
        source.stop();
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } else if (id === 'vehicle.siren') {
      state.police.pursuit = { active: true, distanceU: 0 };
      audio.sirenGain.disconnect();
      audio.sirenGain.connect(output.input);
      output.stopExtra = () => {
        state.police.pursuit = null;
        audio.sirenGain.gain.cancelScheduledValues(audio.context.currentTime);
        audio.sirenGain.gain.value = 0;
        audio.sirenGain.disconnect();
        audio.sirenGain.connect(audio.dryVehicleBus);
      };
    } else audio._playCue(id);
  } finally {
    audio.mixer.output = original;
  }
}
async function stop() {
  playing = false;
  cancelAnimationFrame(frame);
  clearTimeout(timer);
  if (!audio.context) return;
  audio.mixer.stopAll();
  audio._stopHiddenRoadVoices();
  for (const voice of [...audio.activeShots]) audio._stopShot(voice);
  output?.stopExtra?.();
  output?.disconnect();
  output = null;
  previewId = null;
  await audio.context.suspend();
  byId('status').textContent = 'Stopped.';
}
async function play(slot) {
  await stop();
  await ready();
  active = slot;
  playing = true;
  const id = byId('cue-' + slot).value;
  previewId = id;
  updateBed();
  audition = {
    cue: id,
    variant: slot,
    distance: byId('distance').value,
    bed: byId('bed').value,
  };
  preview(id, 'ABC'.indexOf(slot));
  byId('status').textContent = `Playing ${slot}: ${id}.`;
  timer = setTimeout(
    () => stop().catch(showError),
    SOUND_BANK[id].bus === 'voice'
      ? (audio.cueBuffers[id].duration + 0.25) * 1000
      : 3200,
  );
}
function level() {
  if (!meter) return 0;
  const samples = new Float32Array(meter.fftSize);
  meter.getFloatTimeDomainData(samples);
  return Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
}
function verdict() {
  if (!audition) throw Error('Play a sound before saving a listening verdict.');
  return {
    schema: 1,
    card: byId('card').value,
    round: Number(byId('round').value),
    ...audition,
    listener: byId('listener').value,
    rating: byId('rating').value ? Number(byId('rating').value) : null,
    notes: byId('notes').value,
  };
}
function showError(error) {
  byId('status').textContent = error.message;
}
for (const button of document.querySelectorAll('[data-play]'))
  button.addEventListener('click', () =>
    play(button.dataset.play).catch(showError),
  );
byId('stop').addEventListener('click', () => stop().catch(showError));
byId('review').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/__audio/verdict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verdict()),
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Review was not saved.');
    byId('status').textContent = 'Review saved: ' + result.file;
  } catch (error) {
    showError(error);
  }
});
window.addEventListener('pagehide', () => {
  audio.context?.close();
});
window.__listeningBooth = { audio, play, stop, level, verdict };
