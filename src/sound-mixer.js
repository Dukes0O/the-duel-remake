import { BUS_NAMES, SOUND_BANK, DUCKING } from './sound-bank.js';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const number = (value) => (Number.isFinite(value) ? value : 0);

// Return listener-relative positions and a bounded physical doppler ratio.
// World data is read only. Teleports never produce unbounded playback rates.
export function spatialMotion(source, listener) {
  const dx = number(source.x) - number(listener.x),
    dy = number(source.y) - number(listener.y),
    dz = number(source.z) - number(listener.z);
  const distance = Math.hypot(dx, dy, dz),
    divisor = Math.max(0.001, distance);
  const radial = (object) =>
    (number(object.vx) * dx + number(object.vy) * dy + number(object.vz) * dz) /
    divisor;
  const heading = number(listener.heading),
    cosine = Math.cos(heading),
    sine = Math.sin(heading);
  return {
    x: dx * cosine - dz * sine,
    y: dy,
    z: -(dx * sine + dz * cosine),
    distance,
    rate: clamp(
      (343 + clamp(radial(listener), -150, 150)) /
        (343 + clamp(radial(source), -150, 150)),
      0.5,
      2,
    ),
  };
}

export class SoundMixer {
  constructor(
    context,
    master,
    { vehicle = master, enabled = false, voiceEnabled = false } = {},
  ) {
    this.context = context;
    this.enabled = enabled;
    this.voiceEnabled = voiceEnabled;
    this.voices = new Map();
    this.ducks = [];
    this.dryVehicle = context.createGain();
    this.dryVehicle.connect(master);
    this.dryEngine = context.createGain();
    this.dryEngine.connect(master);
    this.buses = Object.fromEntries(
      BUS_NAMES.map((name) => {
        const bus = context.createGain();
        bus.gain.value = 1;
        bus.connect(['engine', 'vehicle'].includes(name) ? vehicle : master);
        return [name, bus];
      }),
    );
  }
  output(id) {
    const cue = SOUND_BANK[id];
    if (!cue) throw Error('Unknown audio cue: ' + id);
    if (cue.dry) return cue.bus === 'engine' ? this.dryEngine : this.dryVehicle;
    return this.buses[cue.bus];
  }
  duck(kind, duration) {
    if (
      (!this.enabled && !(kind === 'voice' && this.voiceEnabled)) ||
      !DUCKING[kind]
    )
      return;
    this.ducks.push({ kind, until: this.context.currentTime + duration });
    this.update();
  }
  update() {
    const now = this.context.currentTime;
    this.ducks = this.ducks.filter(
      (d) =>
        d.until > now &&
        (this.enabled || (d.kind === 'voice' && this.voiceEnabled)),
    );
    for (const name of ['music', 'ambience']) {
      const target = Math.min(
        1,
        ...this.ducks.map((d) => DUCKING[d.kind][name] ?? 1),
      );
      this.buses[name].gain.setTargetAtTime(
        target,
        now,
        target < 1 ? 0.018 : 0.18,
      );
    }
  }
  track(id, voice) {
    const cue = SOUND_BANK[id];
    if (!cue) throw Error('Unknown audio cue: ' + id);
    for (const group of this.voices.values())
      for (const old of group)
        if (old.until <= this.context.currentTime) group.delete(old);
    const all = [...this.voices].flatMap(([key, group]) =>
      [...group].map((item) => ({
        key,
        group,
        item,
        priority: SOUND_BANK[key].priority,
      })),
    );
    if (all.length >= 64) {
      const victim = all.sort((a, b) => a.priority - b.priority)[0];
      if (victim.priority > cue.priority) {
        voice.stop();
        return () => {};
      }
      victim.group.delete(victim.item);
      victim.item.stop();
    }
    const set = this.voices.get(id) || new Set();
    this.voices.set(id, set);
    for (const old of set)
      if (old.until <= this.context.currentTime) set.delete(old);
    while (set.size >= cue.limit) {
      const oldest = set.values().next().value;
      set.delete(oldest);
      oldest.stop();
    }
    set.add(voice);
    return () => set.delete(voice);
  }
  stopAll() {
    for (const set of this.voices.values()) {
      for (const voice of set) voice.stop();
      set.clear();
    }
    this.ducks = [];
    this.update();
  }
  playMoving(
    id,
    buffer,
    position,
    listener,
    { rate = 1, volume = 1, loop = false } = {},
  ) {
    if (!this.enabled) return null;
    const cue = SOUND_BANK[id];
    if (!cue) throw Error('Unknown audio cue: ' + id);
    const source = this.context.createBufferSource(),
      gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = cue.volume * volume;
    const output = this.movingOutput(id, position, listener);
    source.connect(gain);
    gain.connect(output.input);
    let finished = false,
      stopping = false,
      release;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      source.disconnect();
      gain.disconnect();
      output.disconnect();
      release?.();
    };
    source.onended = cleanup;
    const voice = {
      source,
      gain,
      output,
      update: (next, ear) => {
        if (!finished && !stopping)
          output.update(next, ear, source.playbackRate, rate);
      },
      stop: () => {
        if (finished || stopping) return;
        stopping = true;
        const now = this.context.currentTime;
        gain.gain.setTargetAtTime(0, now, 0.008);
        try {
          source.stop(now + 0.04);
        } catch {
          cleanup();
        }
      },
    };
    voice.update(position, listener);
    source.start();
    release = this.track(id, voice);
    if (cue.duck) this.duck(cue.duck, buffer.duration / rate);
    return voice;
  }
  movingOutput(id, source, listener) {
    const cue = SOUND_BANK[id];
    if (!cue) throw Error('Unknown audio cue: ' + id);
    const panner = this.context.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = cue.spatial?.refDistance ?? 15;
    panner.maxDistance = cue.spatial?.maxDistance ?? 1200;
    panner.rolloffFactor = cue.spatial?.rolloff ?? 1;
    panner.connect(this.buses[cue.bus]);
    const update = (position, ear, playbackRate, baseRate = 1) => {
      const motion = spatialMotion(position, ear),
        now = this.context.currentTime;
      for (const axis of ['X', 'Y', 'Z'])
        panner['position' + axis].setTargetAtTime(
          motion[axis.toLowerCase()],
          now,
          0.025,
        );
      playbackRate?.setTargetAtTime(baseRate * motion.rate, now, 0.025);
      return motion;
    };
    update(source, listener);
    return { input: panner, update, disconnect: () => panner.disconnect() };
  }
}
