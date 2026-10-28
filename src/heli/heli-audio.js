// The helicopter's sound (docs/HELICOPTER.md sections 7 and 8): the instructor's
// radio lines through a radio filter, the rotor and wind loops that follow the
// flight readout, and one-shot cues for flight and cable events. Nothing here
// changes the flight or the cable; it only listens. HELI_CUES holds the same
// fields as the sound bank, so one line in sound-bank.js can map it
// (HELI-HOOKS), the way fight-voices.js keeps its lines.
import {SKI_CUES, skiEventCue, skiBeds} from '../ski/ski-lines.js';
import {HELI_RADIO_LINES} from './heli-radio-lines.js';
import {RADIO_FILTER, softClipCurve, createRadioChain} from '../lessons/radio-voice.js';

// The radio filter and chain are shared with driving lessons (src/lessons/).
export {RADIO_FILTER, softClipCurve, createRadioChain};

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };

// ---- Cue table -------------------------------------------------------------

const cue = (bus, data = {}) => ({
  bus, volume: 1, pitchRange: [1, 1], volumeRange: [1, 1], priority: 50, limit: 12,
  spatial: null, duck: null, flag: 'helicopter', ...data,
});
const tone = (frequency, duration, volume, type = 'sine', delay = 0, endFrequency = null) =>
  ({kind: 'tone', frequency, duration, volume, type, delay, endFrequency});
const noise = (frequency, duration, volume, type = 'bandpass') =>
  ({kind: 'noise', frequency, duration, volume, type});


export const HELI_LIBRARY_CUES = Object.freeze({
  'heli.rotor': cue('engine', {file: 'heli/rotor.ogg', volume: .55, loop: true, priority: 70, limit: 1}),
  'heli.engine.start': cue('engine', {file: 'heli/engine-start.ogg', volume: .7, priority: 70, limit: 1}),
  'heli.engine.stop': cue('engine', {file: 'heli/engine-stop.ogg', volume: .7, priority: 70, limit: 1}),
  'heli.wind': cue('ambience', {file: 'heli/wind.ogg', volume: .6, loop: true, priority: 40, limit: 1}),
  'heli.cable.creak': cue('vehicle', {file: 'heli/cable-creak.ogg', volume: .7, priority: 50, limit: 2}),
  'heli.hook.release': cue('vehicle', {file: 'heli/hook-release.ogg', volume: .8, priority: 60, limit: 2}),
  'heli.setdown.thud': cue('vehicle', {file: 'heli/setdown-thud.ogg', volume: .9, priority: 65, limit: 2}),
  // H2 Fire (docs/HELI_FIRE.md section 11). The crackle sits under the rotor
  // and the game scales it with the burning cells and the distance (400 m).
  'heli.fire.crackle': cue('ambience', {file: 'heli/fire-crackle.ogg', volume: .5, loop: true, priority: 45, limit: 1}),
  'heli.bucket.scoop': cue('vehicle', {file: 'heli/bucket-scoop.ogg', volume: .7, loop: true, priority: 55, limit: 1}),
  'heli.bucket.pour': cue('vehicle', {file: 'heli/bucket-pour.ogg', volume: .8, loop: true, priority: 60, limit: 1}),
  'heli.bucket.dent': cue('vehicle', {file: 'heli/bucket-dent.ogg', volume: .85, priority: 65, limit: 2}),
  // Steam where water lands on fire; the game scales it by the litres.
  'heli.fire.hiss': cue('ambience', {file: 'heli/fire-hiss.ogg', volume: .7, priority: 50, limit: 3}),
  // H4 Rescue (docs/HELI_RESCUE.md section 9).
  'heli.flare': cue('ambience', {file: 'heli/flare.ogg', volume: .7, priority: 55, limit: 1}),
  'heli.snow.dig': cue('vehicle', {file: 'heli/snow-dig.ogg', volume: .6, loop: true, priority: 50, limit: 1}),
  'heli.rescue.clip': cue('vehicle', {file: 'heli/rescue-clip.ogg', volume: .8, priority: 60, limit: 2}),
  // H3 Wildlife (docs/HELI_WILDLIFE.md section 9): a camera shutter as an
  // animal is counted, the pressure washer at the pad, the winch motor while
  // it reels, and a call when the helicopter hovers within 80 m of a herd.
  'heli.survey.click': cue('interface', {file: 'heli/survey-click.ogg', volume: .6, priority: 55, limit: 3}),
  'heli.wash': cue('vehicle', {file: 'heli/wash.ogg', volume: .7, priority: 55, limit: 1}),
  'heli.winch': cue('vehicle', {file: 'heli/winch.ogg', volume: .6, loop: true, priority: 55, limit: 1}),
  ...Object.fromEntries(['moose', 'wolf', 'bear', 'kookaburra', 'cockatoo', 'sheep', 'marmot', 'raven'].map(species =>
    [`heli.animal.${species}`, cue('ambience', {file: `heli/animal-${species}.ogg`, volume: .7, priority: 45, limit: 2})])),
});

// Chime, horn, click and hiss are made from tones and noise, with no file.
// The click and the hiss are played by the radio chain itself.
export const HELI_TONE_CUES = Object.freeze({
  'heli.fuel.low': cue('interface', {priority: 85, limit: 1, volume: .6, layers: [
    tone(1319, .5, .14, 'sine', 0), tone(988, .7, .14, 'sine', .24),
    tone(1319, .5, .14, 'sine', 1.1), tone(988, .7, .14, 'sine', 1.34)]}),
  'heli.rotor.low': cue('interface', {priority: 90, limit: 1, volume: .55, layers: [
    tone(330, .3, .1, 'sawtooth', 0), tone(335, .3, .1, 'sawtooth', 0),
    tone(330, .3, .1, 'sawtooth', .45), tone(335, .3, .1, 'sawtooth', .45),
    tone(330, .3, .1, 'sawtooth', .9), tone(335, .3, .1, 'sawtooth', .9)]}),
  'heli.radio.click': cue('interface', {priority: 80, limit: 2, volume: .8,
    layers: [noise(1800, RADIO_FILTER.clickMs / 1000, .16)]}),
  'heli.radio.hiss': cue('ambience', {priority: 20, limit: 1, volume: 1, loop: true,
    layers: [noise(3200, 1, RADIO_FILTER.hiss)]}),
  // H2 Fire: the dispatch alert before a call, two soft alternating tones no
  // louder than the low-fuel chime; a short tick when the aim ring locks; a
  // rising chime with the badge.
  'heli.fire.alert': cue('interface', {priority: 88, limit: 1, volume: .6, layers: [
    tone(880, .28, .12, 'triangle', 0), tone(660, .28, .12, 'triangle', .32),
    tone(880, .28, .12, 'triangle', .64), tone(660, .28, .12, 'triangle', .96)]}),
  'heli.aim.lock': cue('interface', {priority: 70, limit: 1, volume: .6,
    layers: [tone(1760, .05, .12, 'sine', 0), tone(2349, .06, .1, 'sine', .05)]}),
  // H4 Rescue: the beacon's beep, played above the rotor at a pitch the game
  // sets as you close in (900 to 1,400 Hz); a soft tick each second in a
  // rescue clock's last minute, under the rotor.
  'heli.beacon.beep': cue('interface', {priority: 75, limit: 2, volume: .7, layers: [tone(1000, .07, .16, 'sine', 0)]}),
  'heli.clock.tick': cue('interface', {priority: 30, limit: 1, volume: .35, layers: [tone(2200, .025, .08, 'triangle', 0)]}),
  // The pilot's map (docs/PILOT_MAP.md section 5): a secret found from the air, three rising tones, softer than the badge.
  'heli.found': cue('interface', {priority: 80, limit: 1, volume: .6, layers: [
    tone(659, .22, .1, 'sine', 0), tone(880, .22, .1, 'sine', .16), tone(1319, .6, .1, 'sine', .32)]}),
  // The pilot's map screen (MAP-VIEW, docs/PILOT_MAP.md section 6): paper unfolding and folding, and a pin pushed in when a
  // destination is set. Made here from noise and tones; the laptop may render library versions from the same cue ids later.
  'map.open': cue('interface', {priority: 40, limit: 1, volume: .5, layers: [
    noise(2600, .22, .18, 'bandpass'), noise(1400, .45, .14, 'bandpass'), tone(180, .3, .05, 'triangle', 0, 120)]}),
  'map.close': cue('interface', {priority: 40, limit: 1, volume: .5, layers: [
    noise(1500, .3, .15, 'bandpass'), noise(3000, .18, .12, 'bandpass'), tone(150, .2, .05, 'triangle', 0, 220)]}),
  'map.pin': cue('interface', {priority: 70, limit: 1, volume: .6, layers: [
    tone(1800, .04, .2, 'triangle', 0), tone(900, .09, .12, 'sine', .03, 600), noise(4000, .03, .1, 'highpass')]}),
  'heli.badge': cue('interface', {priority: 85, limit: 1, volume: .7, layers: [
    tone(784, .3, .12, 'sine', 0), tone(988, .3, .12, 'sine', .14), tone(1175, .3, .12, 'sine', .28),
    tone(1568, .7, .12, 'sine', .42)]}),
  // The Lab (docs/LAB.md 4.1): water on a buoy, a soft bell, for the projectile challenge; and fire retardant
  // letting go, a slow heavy whump and a thick slurry rush, played on the bucket's pourStart when it carries retardant.
  'heli.buoy-hit': cue('impacts', {priority: 60, limit: 3, volume: .8, layers: [
    noise(1300, .25, .45, 'bandpass'), tone(880, 1.2, .26, 'sine'), tone(1760, .8, .1, 'sine'), tone(2349, .5, .05, 'sine')]}),
  'heli.retardant': cue('vehicle', {priority: 62, limit: 1, volume: .9, layers: [
    tone(70, .7, .45, 'sine', 0, 40), noise(500, 1.4, .5, 'lowpass'), noise(1500, .8, .22, 'bandpass')]}),
});

export const HELI_RADIO_CUES = Object.freeze(Object.fromEntries(Object.entries(HELI_RADIO_LINES).map(
  ([id, line]) => [id, cue('voice', {file: `voices/${line.file}`, volume: line.gain || 1,
    priority: 90, limit: 1, duck: 'voice'})])));

export const HELI_CUES = Object.freeze({...HELI_RADIO_CUES, ...HELI_LIBRARY_CUES, ...HELI_TONE_CUES});
// The H2 Fire recordings: loaded only when a fire needs them.
export const FIRE_CUE_IDS = Object.freeze(['heli.fire.crackle', 'heli.bucket.scoop', 'heli.bucket.pour', 'heli.bucket.dent', 'heli.fire.hiss',
  // H4 Rescue's recordings load with the missions too.
  'heli.flare', 'heli.snow.dig', 'heli.rescue.clip']);
// The H3 Wildlife recordings: loaded only when wildlife needs them (preloadWildlife).
export const WILDLIFE_CUE_IDS = Object.freeze(Object.keys(HELI_LIBRARY_CUES).filter(id =>
  id === 'heli.survey.click' || id === 'heli.wash' || id === 'heli.winch' || id.startsWith('heli.animal.')));

// Flight and cable events (heli-flight.js, heli-cable.js) and what they sound like.
// scale and rate change the cue's volume and pitch for that one play.
const sinkScale = event => clamp(.2 + (Number(event.sink) || 0) / 4, .2, 1);
export const HELI_EVENT_CUES = Object.freeze({
  // A crash on touchdown sounds once, from the crash event that follows.
  touchdown: event => event.result === 'crash' ? [] : [['heli.setdown.thud', {scale: sinkScale(event)}]],
  liftoff: () => [],
  lowFuel: () => [['heli.fuel.low']],
  engineOut: () => [['heli.rotor.low']],
  lowRotor: () => [['heli.rotor.low']],
  crash: () => [['heli.setdown.thud', {scale: 1}]],
  hooked: () => [['heli.hook.release', {scale: .8, rate: .85}]],
  // H that does not take (FIX-HELI-HOOK): the hook's own click, quieter and
  // much lower, a dull "not yet" under the panel's one-line hint.
  hookRefused: () => [['heli.hook.release', {scale: .4, rate: .55}]],
  releasedHigh: () => [['heli.hook.release']],
  released: () => [['heli.hook.release']],
  setDown: () => [['heli.setdown.thud', {scale: .6}]],
  drop: () => [['heli.setdown.thud', {scale: 1}]],
  cargoHit: () => [['heli.cable.creak', {scale: .8}], ['heli.setdown.thud', {scale: .55}]],
  // Retardant is thicker than water: the bucket's pourStart carries `retardant: true` (heli-bucket.js).
  pourStart: event => event.retardant === true ? [['heli.retardant']] : [],
  secretFound: () => [['heli.found']],
  tableFound: () => [['heli.found']],
});
// The instructor reacts to the same events (the session may also ask for them;
// a line already queued, playing or just played is not repeated).
export const HELI_EVENT_LINES = Object.freeze({
  lowFuel: () => 'heli.radio.fuel.low',
  engineOut: () => 'heli.radio.fuel.out',
  crash: () => 'heli.radio.crash',
  drop: () => 'heli.radio.drop',
  cargoHit: () => 'heli.radio.cargo.hit',
  touchdown: event => event.result === 'hard' ? 'heli.radio.landing.hard' : null,
});

// ---- Rotor and wind --------------------------------------------------------

// The heaviest takeoff the Kestrel is built for (heli-flight.js: 1,150 empty,
// 80 pilot, 400 fuel and 1,500 load).
const HEAVIEST_KG = 3130;
const TOP_SPEED_MS = 60;
const KNOTS_TO_MS = 1 / 1.943844;

// The rotor loop gets lower and slower as the helicopter gets heavier and as
// the rotor loses speed, and goes silent when the rotor has stopped. readout
// comes from heliReadout(state) without the load; loadKg is the load on the cable.
export function rotorVoice(readout, {loadKg = 0} = {}) {
  const speed = clamp((Number(readout?.rotorPct) || 0) / 100, 0, 1.1);
  const weight = clamp(((Number(readout?.weightKg) || 0) + Math.max(0, Number(loadKg) || 0)) / HEAVIEST_KG, .35, 1.15);
  if (speed < .02) return {rate: .3, gain: 0, lowpass: 700};
  return {
    rate: clamp((1.1 - .28 * weight) * (.35 + .65 * speed), .25, 1.2),
    gain: Math.min(1, speed / .35) * (.7 + .3 * Math.min(1, weight)),
    lowpass: 700 + 1900 * Math.min(1, speed),
  };
}

// Wind rises with airspeed and stops rising at the helicopter's top speed.
export function windVoice(readout) {
  const share = clamp((Number(readout?.airspeedKts) || 0) * KNOTS_TO_MS / TOP_SPEED_MS, 0, 1);
  return {gain: share ** 1.2, rate: .85 + .3 * share, lowpass: 600 + 2000 * share};
}

// ---- The player ------------------------------------------------------------

const LEAD_SEC = .12;  // the click comes first, then the voice
const GAP_SEC = .3;    // a breath between two lines
const REPEAT_SEC = 6;  // the same line is not repeated this soon
const MAX_QUEUE = 8;

// A short text of the readout, to tell a frozen crashed helicopter from a new one.
const readoutSignature = readout => ['altitudeM', 'fuelKg', 'headingDeg', 'weightKg', 'rotorPct',
  'airspeedKts', 'climbMs', 'pitchDeg', 'rollDeg', 'engine'].map(key => readout[key]).join('|');

export function createHeliAudio({audio, cues = HELI_CUES, fetchImpl, enabled, autoRadio = true}) {
  cues = {...SKI_CUES, ...cues};
  const skiEnabled = () => audio.flags?.enabled('heli-skiing') === true;
  const isEnabled = enabled || (() => { try { return !!audio.flags?.enabled('helicopter'); } catch { return false; } });
  const buffers = new Map(), pending = new Map(), failed = new Set(), active = new Map(), loops = new Map();
  const lastLine = new Map(), seen = new WeakSet();
  let context = null, chain = null, disposed = false, preloaded = null;
  let queue = [], current = null, nextAt = 0;
  let engineWas = null, crashHold = null, lastHorn = -Infinity, lastCreak = -Infinity;

  const audible = () => !disposed && isEnabled() && !audio.muted && !audio.paused &&
    audio.context?.state === 'running';
  const now = () => audio.context?.currentTime ?? 0;

  // A cue the sound bank already holds goes through the mixer (limits, ducking,
  // loudness groups); until HELI-HOOKS maps them, they join their bus directly.
  function banked(id) {
    try { return !!audio.mixer?.output(id); } catch { return false; }
  }
  function destination(id) {
    const def = cues[id];
    if (banked(id)) return {node: audio.mixer.output(id), mixer: true};
    return {node: audio.buses?.[def.bus] ?? audio.master ?? audio.context.destination, mixer: false};
  }
  function connect(node, target) {
    if (target.mixer && audio._connect) audio._connect(node, target.node);
    else node.connect(target.node);
  }

  function follow() {
    if (context === audio.context) return;
    stopAll();
    chain?.dispose();
    chain = null;
    context = audio.context;
    buffers.clear();
    pending.clear();
    failed.clear();
  }
  function ensureChain() {
    if (!chain) chain = createRadioChain(context, destination('heli.radio.welcome').node);
    return chain;
  }

  async function fetchBuffer(id) {
    const captured = context, request = fetchImpl || globalThis.fetch;
    let buffer;
    try {
      const response = await request('/assets/audio/' + cues[id].file);
      if (!response.ok) throw Error(`Helicopter cue unavailable: ${id}`);
      buffer = await captured.decodeAudioData(await response.arrayBuffer());
    } catch (error) {
      // A file that will not load is not asked for again every frame.
      if (context === captured) failed.add(id);
      throw error;
    }
    if (!disposed && context === captured) buffers.set(id, buffer);
    return buffer;
  }
  function load(ids) {
    if (disposed || !audio.context) return Promise.resolve([]);
    follow();
    // A flight loads its own sounds; the fire sounds wait until a fire needs them (preloadFire).
    const wanted = ids || Object.keys(cues).filter(id => cues[id].file && !id.startsWith('heli.radio.') && !FIRE_CUE_IDS.includes(id) &&
      !WILDLIFE_CUE_IDS.includes(id) && !id.startsWith('ski.'));
    return Promise.allSettled(wanted.filter(id => cues[id]?.file && !failed.has(id)).map(id => {
      if (buffers.has(id)) return Promise.resolve(buffers.get(id));
      if (!pending.has(id)) pending.set(id, fetchBuffer(id).finally(() => pending.delete(id)));
      return pending.get(id);
    }));
  }

  function remember(id, voice) {
    const set = active.get(id) || new Set();
    active.set(id, set);
    while (set.size >= (cues[id].limit || 12)) {
      const oldest = set.values().next().value;
      set.delete(oldest);
      oldest.stop();
    }
    set.add(voice);
    return () => set.delete(voice);
  }

  // One buffer through its own gain to its bus. A loop keeps going until stopped.
  function start(id, {loop = false, scale = 1, rate = 1, node = null, filterHz = null} = {}) {
    const buffer = buffers.get(id), ctx = audio.context;
    if (!buffer || ctx !== context || !audible()) return null;
    const def = cues[id], target = destination(id);
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    let shape = null;
    source.buffer = buffer;
    source.loop = loop;
    source.playbackRate.value = rate;
    gain.gain.value = def.volume * scale;
    if (filterHz) {
      shape = ctx.createBiquadFilter();
      shape.type = 'lowpass';
      shape.frequency.value = filterHz;
      source.connect(shape); shape.connect(gain);
    } else source.connect(gain);
    if (node) gain.connect(node); else connect(gain, target);
    let live = true, release = null, trackRelease = null;
    const voice = {
      source, gain, shape, until: loop ? Infinity : ctx.currentTime + buffer.duration / Math.max(.1, rate),
      get active() { return live; },
      stop() {
        if (!live) return;
        live = false;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, .008);
        try { source.stop(ctx.currentTime + .04); } catch { /* already ended */ }
      },
    };
    source.onended = () => {
      live = false;
      source.disconnect(); gain.disconnect(); shape?.disconnect();
      if (target.mixer) audio.mixer.disconnect?.(gain);
      release?.(); trackRelease?.();
      voice.ended?.();
    };
    release = remember(id, voice);
    if (target.mixer) trackRelease = audio.mixer.track?.(id, voice);
    source.start(ctx.currentTime);
    return voice;
  }

  // Tones and noise made on the spot (the chime and the horn). rate raises
  // every tone's pitch (the beacon's beep, 900 to 1,400 Hz from a 1,000 Hz cue).
  function startLayers(id, scale = 1, rate = 1) {
    const ctx = audio.context, def = cues[id];
    if (!audible() || ctx !== context) return null;
    const tones = def.layers.filter(layer => layer.kind === 'tone');
    if (!tones.length) return null;
    const target = destination(id), bus = ctx.createGain();
    bus.gain.value = def.volume * scale;
    connect(bus, target);
    const stops = [];
    let end = ctx.currentTime;
    for (const layer of tones) {
      const at = ctx.currentTime + (layer.delay || 0), finish = at + layer.duration;
      const level = ctx.createGain(), osc = ctx.createOscillator();
      osc.type = layer.type;
      osc.frequency.setValueAtTime(layer.frequency * rate, at);
      if (layer.endFrequency) osc.frequency.linearRampToValueAtTime(layer.endFrequency * rate, finish);
      level.gain.setValueAtTime(0, at);
      level.gain.linearRampToValueAtTime(layer.volume, at + .01);
      level.gain.linearRampToValueAtTime(0, finish);
      osc.connect(level); level.connect(bus);
      osc.start(at); osc.stop(finish + .02);
      stops.push(osc);
      end = Math.max(end, finish + .02);
    }
    let live = true;
    const voice = {
      until: end,
      get active() { return live; },
      stop() {
        if (!live) return;
        live = false;
        bus.gain.cancelScheduledValues(ctx.currentTime);
        bus.gain.setTargetAtTime(0, ctx.currentTime, .008);
        for (const osc of stops) try { osc.stop(ctx.currentTime + .04); } catch { /* ended */ }
      },
    };
    const release = remember(id, voice);
    stops.at(-1).onended = () => { live = false; release(); bus.disconnect(); };
    return voice;
  }

  // Any one-shot cue by id. Returns the voice, or null when it cannot play now.
  function play(id, options = {}) {
    const def = cues[id];
    if (disposed || !def || id.startsWith('heli.radio.') || !audible() ||
      id.startsWith('ski.') && !skiEnabled()) return null;
    follow();
    if (def.loop || def.bus === 'voice') return null;
    if (def.layers) return startLayers(id, options.scale ?? 1, options.rate ?? 1);
    if (!buffers.has(id)) { void load([id]); return null; }
    return start(id, options);
  }

  // ---- Radio lines: one at a time, in order, and a line can be skipped.

  function finishLine(line) {
    if (current !== line) return;
    current = null;
    line.voice?.stop();
    chain?.keyOff();
    nextAt = now() + GAP_SEC;
  }
  function startLine(line) {
    follow();
    const ready = buffers.get(line.id);
    if (!ready) {
      void load([line.id]).then(() => {
        if (current !== line || line.voice) return;
        if (buffers.has(line.id)) startLine(line);
        else { current = null; nextAt = now() + GAP_SEC; }
      });
      return;
    }
    if (!audible()) { current = null; return; }
    const radio = ensureChain();
    radio.keyOn();
    const ctx = audio.context, voice = start(line.id, {node: radio.input});
    if (!voice) { radio.keyOff(); current = null; return; }
    line.voice = voice;
    line.until = ctx.currentTime + ready.duration + .05;
    voice.ended = () => finishLine(line);
    audio.mixer?.duck?.('voice', ready.duration + .6);
  }
  function advance() {
    if (current || disposed) return;
    if (!queue.length || now() < nextAt) return;
    if (!audible()) { queue = []; return; }
    const id = queue.shift();
    current = {id, voice: null, until: Infinity};
    lastLine.set(id, now());
    startLine(current);
  }
  // Ask for a line. Unknown lines, repeats and a muted game are ignored.
  function say(id) {
    if (disposed || !HELI_RADIO_LINES[id] || !cues[id]) return false;
    if (current?.id === id || queue.includes(id)) return false;
    if (now() - (lastLine.get(id) ?? -Infinity) < REPEAT_SEC) return false;
    if (!audible()) return false;
    queue.push(id);
    while (queue.length > MAX_QUEUE) queue.shift();
    advance();
    return true;
  }
  // Skip the line being said; the next one in the queue follows after a breath.
  function skip() {
    if (!current) return false;
    finishLine(current);
    return true;
  }
  function clearRadio() {
    queue = [];
    if (current) finishLine(current);
  }
  const subtitle = () => current ? {id: current.id, text: HELI_RADIO_LINES[current.id].text} : null;

  // ---- Loops that follow the flight, and the events.

  function bed(id, wanted, voice) {
    const held = loops.get(id);
    if (!wanted) { held?.stop(); loops.delete(id); return null; }
    if (held?.active) return held;
    if (!buffers.has(id)) { void load([id]); return null; }
    const started = start(id, {loop: true, scale: 0, rate: voice.rate, filterHz: voice.lowpass});
    if (started) loops.set(id, started);
    return started;
  }
  function steer(loop, voice, def) {
    if (!loop) return;
    const t = audio.context.currentTime;
    loop.gain.gain.setTargetAtTime(def.volume * voice.gain, t, .12);
    loop.source.playbackRate.setTargetAtTime(voice.rate, t, .15);
    loop.shape?.frequency.setTargetAtTime(voice.lowpass, t, .15);
  }

  // Call every frame with heliReadout(state) and the load on the cable.
  function update(readout, {loadKg = 0, ski = null, deepSnow = 0} = {}) {
    if (disposed) return;
    if (!isEnabled() || !audio.context) { stopAll(); return; }
    follow();
    if (preloaded !== context) {
      preloaded = context; void load();
      if (skiEnabled()) void load(Object.keys(SKI_CUES));
    }
    advance();
    if (current && current.until <= now()) finishLine(current);
    if (!audible()) { stopLoops(); return; }
    if (!readout) return;
    const engine = readout.engine === true;
    if (engineWas === false && engine) {
      crashHold = null;
      const sound = play('heli.engine.start');
      if (!sound) void load(['heli.engine.start']);
    } else if (engineWas === true && !engine && !crashHold) play('heli.engine.stop');
    engineWas = engine;
    // After a crash the loops stay off until the flight is made new: the session's
    // entered event, an engine start, or a readout that is no longer the frozen one.
    if (crashHold) {
      const signature = readoutSignature(readout);
      if (crashHold.signature === null) crashHold.signature = signature;
      else if (crashHold.signature !== signature) crashHold = null;
    }
    if (crashHold) { stopLoops(); return; }
    const run = skiEnabled() ? ski?.run : null;
    for (const [id, voice] of Object.entries(skiBeds(run, deepSnow))) {
      steer(bed(id, voice.gain > 0, voice), voice, cues[id]);
    }
    // The parked helicopter's frozen readout must not drone over the ski run.
    if (run) {
      for (const id of ['heli.rotor', 'heli.wind']) bed(id, false, {});
      return;
    }
    const rotor = rotorVoice(readout, {loadKg}), wind = windVoice(readout);
    steer(bed('heli.rotor', rotor.gain > 0, rotor), rotor, cues['heli.rotor']);
    steer(bed('heli.wind', rotor.gain > 0 && wind.gain > .001, wind), wind, cues['heli.wind']);
  }

  // H2 Fire's loops, each 0 to 1, called every frame with update: the
  // crackle (louder with more burning and nearer, heard within 400 m), the
  // scoop (with the fill rate) and the pour (while H pours). Retardant pours through the same recording, slower
  // and duller: a thicker liquid than water.
  function fireBeds({crackle = 0, scoop = 0, pour = 0, retardant = false} = {}) {
    if (disposed || !isEnabled() || !audio.context || !audible() || crashHold) return;
    for (const [id, level] of [['heli.fire.crackle', crackle], ['heli.bucket.scoop', scoop], ['heli.bucket.pour', pour]]) {
      const thick = id === 'heli.bucket.pour' && retardant === true;
      const voice = {gain: clamp(level, 0, 1), rate: thick ? .8 : 1, lowpass: thick ? 2400 : 9000};
      steer(bed(id, voice.gain > .01, voice), voice, cues[id]);
    }
  }

  // The mission loops, each 0 to 1, called every frame with update: H4's
  // shovel in snow while the rescuer digs, and the winch while it reels
  // (medevac). Like fireBeds, a level of 0 lets the loop go.
  function missionBeds({dig = 0, winch = 0} = {}) {
    if (disposed || !isEnabled() || !audio.context || !audible() || crashHold) return;
    for (const [id, level] of [['heli.snow.dig', dig], ['heli.winch', winch]]) {
      const voice = {gain: clamp(level, 0, 1), rate: 1, lowpass: 9000};
      steer(bed(id, voice.gain > .01, voice), voice, cues[id]);
    }
  }

  function event(ev, state = {}) {
    if (Array.isArray(ev)) { for (const item of ev) event(item, state); return; }
    if (!ev || typeof ev !== 'object' || disposed || seen.has(ev)) return;
    seen.add(ev);
    const skiCue = skiEventCue(ev);
    if (skiCue) { play(skiCue); return; }
    if (ev.type === 'skiPickup') {
      for (const id of ['ski.carve', 'ski.skid', 'ski.wind', 'ski.powder']) bed(id, false, {});
      return;
    }
    if (ev.type === 'entered') { crashHold = null; return; }
    const sounds = HELI_EVENT_CUES[ev.type];
    if (!sounds || !isEnabled()) return;
    const time = now();
    for (const [id, options] of sounds(ev, state)) {
      // The horn and the creak repeat while the cause lasts; keep them apart.
      if (id === 'heli.rotor.low' && time - lastHorn < 3) continue;
      if (id === 'heli.cable.creak' && time - lastCreak < .8) continue;
      if (play(id, options)) {
        if (id === 'heli.rotor.low') lastHorn = time;
        if (id === 'heli.cable.creak') lastCreak = time;
      } else if (cues[id]?.file) void load([id]);
    }
    if (ev.type === 'crash') crashHold = {signature: null};
    if (autoRadio) {
      const line = HELI_EVENT_LINES[ev.type]?.(ev, state);
      if (line) say(line);
    }
  }

  function stopLoops() {
    for (const voice of loops.values()) voice.stop();
    loops.clear();
  }
  function stopAll() {
    stopLoops();
    queue = [];
    if (current) finishLine(current);
    for (const set of active.values()) for (const voice of [...set]) voice.stop();
    active.clear();
    chain?.keyOff();
  }
  function stop() {
    stopAll();
    engineWas = null;
    crashHold = null;
  }
  function dispose() {
    if (disposed) return;
    stop();
    disposed = true;
    chain?.dispose();
    chain = null;
    buffers.clear();
    pending.clear();
  }
  const preloadFire = () => load(FIRE_CUE_IDS.filter(id => cues[id]));
  const preloadWildlife = () => load(WILDLIFE_CUE_IDS.filter(id => cues[id]));
  return {load, preloadFire, preloadWildlife, fireBeds, missionBeds, say, skip, clearRadio, subtitle, update, event, play, stop, dispose,
    get busy() { return !!current || queue.length > 0; }, get queued() { return [...queue]; }};
}
