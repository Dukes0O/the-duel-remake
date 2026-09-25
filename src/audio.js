// Audio rendering reads simulation state; all authored cues live in the bank.
import {
  SOUND_BANK,
  ENGINE_BANDS,
  SAMPLE_ENTRIES,
  AMBIENCE,
  CAR_VOICES,
} from './sound-bank.js';
import { SoundMixer } from './sound-mixer.js';
import { featureFlags } from './feature-flags.js';
const bank = (id) => SOUND_BANK[id];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
// A continuous 18.6-semitone sweep makes each gear audible. Texture crossfades
// retain the same tonal target, so switching recordings cannot reset the pitch.
const engineTone = (revs) => 52 * 2 ** (clamp(revs, 0, 1.15) * 1.55);
const engineRate = (tone, reference, pitch, ceiling = 2.2) =>
  clamp((tone / reference) * pitch, 0.48, ceiling);
// Hit and wreck events carry their world position. Other blasts use their burst.
// These coordinates do not change simulation state.
export function combatAudioSpace(event, state, course) {
  let side = Number(event?.qaSide),
    distance = Number(event?.qaDistance);
  if (!Number.isFinite(side) || !Number.isFinite(distance)) {
    const hit =
      (event?.combatHit || event?.combatExplosion || event?.raiderShot) &&
      event.hitPosition;
    const source =
      hit && [hit.x, hit.y, hit.z].every(Number.isFinite)
        ? hit
        : state?.combat?.bursts?.at(-1);
    const listener =
      Number.isFinite(state?.s) && course?.groundAt?.(state.s, state.lateral);
    if (!source || !listener) return { pan: 0, gain: 1, distance: null };
    const dx = source.x - listener.x,
      dz = source.z - listener.z;
    distance = Math.hypot(dx, dz, (source.y || 0) - (listener.y || 0));
    const heading =
      listener.heading +
      (state.headingError || 0) +
      (state.slipAngle || 0) +
      (state.crashSpin || 0);
    side =
      distance > 0.001
        ? (dx * Math.cos(heading) - dz * Math.sin(heading)) / distance
        : 0;
  }
  return {
    pan: clamp(side * 0.7, -0.7, 0.7),
    gain: clamp(1 / (1 + Math.max(0, distance - 15) / 240), 0.5, 1),
    distance,
  };
}

export class EngineAudio {
  constructor({ hiddenRoadVoiceFactory, flags = featureFlags } = {}) {
    this.context = null;
    this.flags = flags;
    this.muted = readMuted();
    this.paused = false;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.nextRadar = 0;
    this.samples = {};
    this.cueBuffers = {};
    this.cueIndices = new Map();
    this.projectileVoices = new Map();
    this.pendingGatekeeper = null;
    this.sampleStatus = 'locked';
    this.ambience = {};
    this.ambienceStatus = 'locked';
    this._ambiencePromise = null;
    this.smoothedLoad = 0;
    this.smoothedSlip = 0;
    this.lastThrottle = 0;
    this.lastUpdateTime = 0;
    this.nextThrottle = 0;
    this.nextLift = 0;
    this.shiftStarted = 0;
    this.shiftUntil = 0;
    this.activeShots = new Set();
    this._samplesPromise = null;
    this.carVoice = CAR_VOICES.falcone_f42;
    this.blastIndex = 0;
    this.blastVoices = new Set();
    this.hiddenRoadVoiceFactory =
      hiddenRoadVoiceFactory || ((cue) => this._createHiddenRoadVoice(cue));
    this.hiddenRoadVoices = new Set();
    this.hiddenRoadCueKeys = new Set();
    this.hiddenRoadId = null;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!this.context) this._build(new AudioContext());
      if (this.context.state === 'suspended')
        this.context.resume().catch(() => {});
    } catch (_) {
      /* Driving is available on devices without Web Audio. */
    }
  }

  _build(ctx) {
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted || this.paused ? 0 : 0.42;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.knee.value = 16;
    limiter.ratio.value = 4;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);
    this.output = limiter;
    this.vehicleBus = ctx.createGain();
    this.vehicleBus.gain.value = 1;
    this.vehicleBus.connect(this.master);
    this.mixer = new SoundMixer(ctx, this.master, {
      vehicle: this.vehicleBus,
      enabled: this.flags.enabled('wasteland2'),
      voiceEnabled: this.flags.enabled('hidden-road'),
    });
    this.buses = this.mixer.buses;
    this.hiddenRoadBus = ctx.createGain();
    this.hiddenRoadBus.gain.value = 1;
    this._connect(this.hiddenRoadBus, this.buses.ambience);
    // Two quiet, fixed early reflections. No feedback or moving delay times.
    this.tunnelWet = ctx.createGain();
    this.tunnelWet.gain.value = 0;
    this.tunnelWet.connect(this.master);
    this.tunnelFilter = ctx.createBiquadFilter();
    this.tunnelFilter.type = 'lowpass';
    this.tunnelFilter.frequency.value = 1800;
    this.tunnelFilter.Q.value = 0.4;
    const tunnelHighpass = ctx.createBiquadFilter();
    tunnelHighpass.type = 'highpass';
    tunnelHighpass.frequency.value = 180;
    this.vehicleBus.connect(tunnelHighpass);
    tunnelHighpass.connect(this.tunnelFilter);
    this.tunnelTaps = [
      { time: 0.071, gain: 1 },
      { time: 0.131, gain: 0.55 },
    ].map((tap) => {
      const delay = ctx.createDelay(0.2),
        gain = ctx.createGain();
      delay.delayTime.value = tap.time;
      gain.gain.value = tap.gain;
      this.tunnelFilter.connect(delay);
      delay.connect(gain);
      gain.connect(this.tunnelWet);
      return { delay, gain };
    });
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 1100;
    this.engineFilter.Q.value = 0.65;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain);
    this._connect(this.engineGain, this.buses.engine);
    this.engine = [1, 2, 3.01].map((multiple, index) => {
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.type = index === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = 35 * multiple;
      gain.gain.value = [0.7, 0.24, 0.12][index];
      osc.connect(gain);
      gain.connect(this.engineFilter);
      osc.start();
      return { osc, multiple };
    });
    const length = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.dryVehicleBus = this.mixer.dryVehicle;
    this.wind = this._noiseLayer(
      ...bank('vehicle.wind').filter,
      this.dryVehicleBus,
    );
    this.tires = this._noiseLayer(
      ...bank('vehicle.road').filter,
      this.buses.vehicle,
    );
    this.gravel = this._noiseLayer(
      ...bank('vehicle.gravel').filter,
      this.buses.vehicle,
    );
    this.boost = this._noiseLayer(
      ...bank('vehicle.boost').filter,
      this.dryVehicleBus,
    );
    this.siren = ctx.createOscillator();
    this.siren.type = 'sine';
    this.sirenGain = ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.siren.connect(this.sirenGain);
    this._connect(this.sirenGain, this.dryVehicleBus);
    this.siren.start();
    this.sirenHarmony = ctx.createOscillator();
    this.sirenHarmony.type = 'sine';
    const harmonyGain = ctx.createGain();
    harmonyGain.gain.value = bank('vehicle.siren').harmonicGain;
    this.sirenHarmony.connect(harmonyGain);
    harmonyGain.connect(this.sirenGain);
    this.sirenHarmony.start();
    this.nextBeat = ctx.currentTime + 0.08;
    this._loadSamples();
    this._loadAmbience();
    this._loadCueBuffers();
  }

  _loadCueBuffers() {
    if (this._cueBuffersPromise) return this._cueBuffersPromise;
    this._cueBuffersPromise = Promise.allSettled(
      Object.entries(SOUND_BANK)
        .filter(
          ([, cue]) => (cue.file || cue.files) && !cue.sample && !cue.biome,
        )
        .map(async ([id, cue]) => {
          const buffers = await Promise.all(
            (cue.files || [cue.file]).map(async (file) => {
              const response = await fetch('/assets/audio/' + file);
              if (!response.ok) throw Error('Cue unavailable: ' + id);
              return this.context.decodeAudioData(await response.arrayBuffer());
            }),
          );
          this.cueBuffers[id] = cue.files ? buffers : buffers[0];
        }),
    );
    return this._cueBuffersPromise;
  }

  _loadSamples() {
    if (this._samplesPromise) return this._samplesPromise;
    this.sampleStatus = 'loading';
    const entries = SAMPLE_ENTRIES;
    this._samplesPromise = Promise.allSettled(
      entries.map(async ([key, file, oneShot]) => {
        const response = await fetch(`/assets/audio/${file}`);
        if (!response.ok) throw Error(file);
        const buffer = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (oneShot) {
          this.samples[key] = buffer;
          return;
        }
        const source = this.context.createBufferSource(),
          gain = this.context.createGain(),
          filter = this.context.createBiquadFilter();
        source.buffer = buffer;
        source.loop = true;
        gain.gain.value = 0;
        filter.type = 'lowpass';
        filter.frequency.value = key === 'squeal' ? 5800 : 2400;
        source.connect(filter);
        filter.connect(gain);
        this._connect(
          gain,
          key === 'squeal' ? this.buses.vehicle : this.buses.engine,
        );
        let body = null,
          intake = null;
        if (key !== 'squeal') {
          const bodyFilter = this.context.createBiquadFilter(),
            bodyGain = this.context.createGain();
          bodyFilter.type = 'lowpass';
          bodyFilter.frequency.value = 220;
          bodyFilter.Q.value = 0.55;
          bodyGain.gain.value = 0;
          source.connect(bodyFilter);
          bodyFilter.connect(bodyGain);
          this._connect(bodyGain, this.buses.engine);
          body = { filter: bodyFilter, gain: bodyGain };
          const intakeFilter = this.context.createBiquadFilter(),
            intakeGain = this.context.createGain();
          intakeFilter.type = 'bandpass';
          intakeFilter.frequency.value = 1250;
          intakeFilter.Q.value = 0.72;
          intakeGain.gain.value = 0;
          source.connect(intakeFilter);
          intakeFilter.connect(intakeGain);
          this._connect(intakeGain, this.buses.engine);
          intake = { filter: intakeFilter, gain: intakeGain };
        }
        source.start();
        this.samples[key] = { source, gain, filter, body, intake };
      }),
    ).then((results) => {
      this.sampleStatus = results.every((r) => r.status === 'fulfilled')
        ? 'ready'
        : 'fallback';
    });
    return this._samplesPromise;
  }

  _loadAmbience() {
    if (this._ambiencePromise) return this._ambiencePromise;
    this.ambienceStatus = 'loading';
    this._ambiencePromise = Promise.allSettled(
      Object.entries(AMBIENCE).map(async ([biome, def]) => {
        const response = await fetch(`/assets/audio/${def.file}`);
        if (!response.ok) throw Error(def.file);
        const buffer = await this.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        const source = this.context.createBufferSource(),
          filter = this.context.createBiquadFilter(),
          gain = this.context.createGain();
        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = 1;
        gain.gain.value = 0;
        filter.type = 'lowpass';
        filter.frequency.value = def.cutoff;
        filter.Q.value = 0.45;
        source.connect(filter);
        filter.connect(gain);
        this._connect(gain, this.buses.ambience);
        source.start();
        this.ambience[biome] = { source, filter, gain };
      }),
    ).then((results) => {
      this.ambienceStatus = results.every(
        (result) => result.status === 'fulfilled',
      )
        ? 'ready'
        : 'partial';
    });
    return this._ambiencePromise;
  }

  _updateAmbience(st, environment, t) {
    const active =
      ['countdown', 'racing', 'ticket'].includes(st.status) && !st.paused;
    const speed = clamp(Math.abs(Number(st.speedMph) || 0) / 180, 0, 1),
      load = clamp(
        Number(st.gear === -1 ? st.input?.brake : st.input?.throttle) || 0,
        0,
        1,
      );
    // Exterior sound stays behind the engine and fades down inside tunnels.
    const duck =
      (1 - speed * 0.38) *
      (1 - load * 0.2) *
      (1 - clamp(Number(environment.tunnel) || 0, 0, 1) * 0.88);
    for (const [biome, layer] of Object.entries(this.ambience)) {
      const selected =
        environment.biome === biome &&
        !(biome === 'alpine' && environment.night);
      const target = active && selected ? AMBIENCE[biome].gain * duck : 0;
      layer.gain.gain.setTargetAtTime(target, t, st.paused ? 0.025 : 0.65);
    }
  }

  _sample(
    buffer,
    volume = 1,
    rate = 1,
    destination = this._cueOutput || this.buses?.interface || this.master,
    maxDuration = Infinity,
    onEnd = null,
    attack = 0.008,
  ) {
    const ctx = this.context,
      source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      start = ctx.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const duration = Math.min(buffer.duration / rate, maxDuration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + attack);
    gain.gain.setValueAtTime(volume, start + Math.max(0.009, duration - 0.035));
    gain.gain.linearRampToValueAtTime(0, start + duration);
    source.connect(gain);
    this._connect(gain, destination);
    source.start();
    if (Number.isFinite(maxDuration)) source.stop(start + duration + 0.01);
    const voice = { source, gain, endAt: start + duration + 0.01 };
    this.activeShots.add(voice);
    source.onended = () => {
      source.disconnect();
      this._disconnect(gain);
      this.activeShots.delete(voice);
      onEnd?.();
    };
    this._cueSources?.push(source);
    source._cueEnd = voice.endAt;
    return voice;
  }

  _spatialOutput(event, state, course) {
    const ctx = this.context,
      space = combatAudioSpace(event, state, course);
    const level = ctx.createGain(),
      panner = ctx.createStereoPanner();
    level.gain.value = space.gain;
    panner.pan.value = space.pan;
    level.connect(panner);
    this._connect(
      panner,
      this._cueOutput || this.buses?.impacts || this.master,
      level.gain,
    );
    return {
      level,
      panner,
      space,
      disconnect: () => {
        level.disconnect();
        this._disconnect(panner);
      },
    };
  }

  _balanceBlasts() {
    const now = this.context.currentTime;
    // Only fresh attacks add coherently. The four-second recording has a long,
    // quiet tail that must not make the next isolated blast sound distant.
    const attacks = [...this.blastVoices].filter(
      (voice) => now - voice.startedAt < 0.25,
    );
    const scale = Math.max(1, attacks.length) ** -0.75;
    for (const voice of attacks) {
      voice.output.level.gain.cancelScheduledValues(now);
      voice.output.level.gain.setTargetAtTime(
        voice.output.space.gain * scale,
        now,
        0.004,
      );
    }
  }

  _combatBlast(event, state, course) {
    const output = this._spatialOutput(event, state, course);
    if (!this.samples.explosion) {
      this._layer(
        bank('combat.blast').fallback,
        output.level,
        1,
        output.disconnect,
      );
      return;
    }
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = bank('combat.blast').cutoff;
    filter.Q.value = 0.7;
    filter.connect(output.level);
    const variants = bank('combat.blast').variants;
    const variant = variants[this.blastIndex++ % variants.length];
    let voice;
    voice = this._sample(
      this.samples.explosion,
      bank('combat.blast').volume,
      variant.rate,
      filter,
      Infinity,
      () => {
        this.blastVoices.delete(voice);
        filter.disconnect();
        output.disconnect();
        this._balanceBlasts();
      },
      variant.attack,
    );
    voice.output = output;
    voice.startedAt = this.context.currentTime;
    this.blastVoices.add(voice);
    this._balanceBlasts();
  }

  _combatImpact(event, state, course) {
    const output = this._spatialOutput(event, state, course);
    const ctx = this.context,
      start = ctx.currentTime;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = 'bandpass';
    filter.frequency.value = bank('combat.hit').layers[0].frequency;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(
      bank('combat.hit').layers[0].volume,
      start + 0.009,
    );
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output.level);
    source.start();
    source.stop(start + 0.23);
    this._cueSources?.push(source);
    const voice = { source, gain, endAt: start + 0.23 };
    this.activeShots.add(voice);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      this._disconnect(gain);
      output.disconnect();
      this.activeShots.delete(voice);
    };
    this._layer(bank('combat.hit').layers[1], output.level);
  }

  _rpgImpact(event, state, course) {
    const output = this._spatialOutput(event, state, course);
    this._playCue(
      event.audioImpact === 'direct'
        ? 'combat.rpg-direct'
        : 'combat.rpg-splash',
      { destination: output.level, onEnd: output.disconnect },
    );
  }

  _raiderShot(event, state, course) {
    const output = this._spatialOutput(event, state, course);
    this._playCue('raider.shot', {
      legacy: !this.flags.enabled('wasteland2'),
      destination: output.level,
      onEnd: output.disconnect,
    });
  }

  _repairCue(phase) {
    this._playCue('repair.' + phase);
  }

  // A short shaped slice of the existing noise buffer gives a launch or
  // string release some physical texture without a new recording or network
  // request. The active-shot lifecycle still owns pause, mute and cleanup.
  _weaponNoise(
    frequency,
    duration,
    volume,
    type = 'bandpass',
    destination = this._cueOutput || this.buses?.interface || this.master,
    onEnd = null,
  ) {
    const ctx = this.context,
      start = ctx.currentTime;
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = 0.65;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    this._connect(gain, destination);
    source.start(start);
    source.stop(start + duration + 0.01);
    const voice = { source, gain, endAt: start + duration + 0.01 };
    this.activeShots.add(voice);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      this._disconnect(gain);
      this.activeShots.delete(voice);
      onEnd?.();
    };
    this._cueSources?.push(source);
    source._cueEnd = voice.endAt;
    return voice;
  }

  _weaponCue(weapon) {
    this._playCue(
      bank('weapon.' + weapon + '.fire')
        ? 'weapon.' + weapon + '.fire'
        : 'weapon.default.fire',
      { legacy: !this.flags.enabled('wasteland2') },
    );
  }

  _layer(layer, destination, scale = 1, onEnd = null) {
    if (layer.kind === 'noise')
      return this._weaponNoise(
        layer.frequency,
        layer.duration,
        layer.volume * scale,
        layer.type,
        destination,
        onEnd,
      );
    return this._tone(
      layer.frequency,
      layer.duration,
      layer.volume * scale,
      layer.type,
      layer.delay,
      layer.endFrequency,
      destination,
      onEnd,
    );
  }

  _connect(node, destination, fadeParam = node.gain) {
    if (this.mixer) this.mixer.connect(node, destination, { fadeParam });
    else node.connect(destination);
  }

  _disconnect(node) {
    this.mixer?.disconnect(node);
    node.disconnect();
  }

  _syncMixer() {
    if (!this.mixer?.update) return;
    this.mixer.enabled = this.flags.enabled('wasteland2');
    this.mixer.voiceEnabled = this.flags.enabled('hidden-road');
    this.mixer.update();
  }

  _cueBuffer(id) {
    const buffers = this.cueBuffers[id];
    if (!Array.isArray(buffers)) return buffers;
    const index = this.cueIndices.get(id) || 0;
    this.cueIndices.set(id, index + 1);
    return buffers[index % buffers.length];
  }

  _clearProjectiles() {
    for (const voice of this.projectileVoices.values()) voice.stop();
    this.projectileVoices.clear();
  }

  _updateProjectiles(state, environment = {}) {
    if (
      !this.flags.enabled('wasteland2') ||
      this.muted ||
      state.paused ||
      !['racing', 'exploring'].includes(state.status)
    ) {
      this._clearProjectiles();
      return;
    }
    const listener = environment.listener;
    if (!listener || !this.context || this.context.state !== 'running') {
      this._clearProjectiles();
      return;
    }
    const live = new Set();
    for (const projectile of state.combat?.projectiles || []) {
      const id = 'weapon.' + projectile.kind + '.flight';
      if (!bank(id) || !this.cueBuffers[id]) continue;
      live.add(projectile.id);
      let voice = this.projectileVoices.get(projectile.id);
      if (!voice) {
        voice = this.mixer.playMoving(
          id,
          this._cueBuffer(id),
          projectile,
          listener,
        );
        if (voice) this.projectileVoices.set(projectile.id, voice);
      }
      voice?.update(projectile, listener);
    }
    for (const [id, voice] of this.projectileVoices)
      if (!live.has(id)) {
        voice.stop();
        this.projectileVoices.delete(id);
      }
  }

  _recordedImpact(id, event, state, course) {
    const output = this._spatialOutput(event, state, course);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value =
      output.space.distance > 80 ? bank(id).farCutoff || 3500 : 16000;
    filter.connect(output.level);
    return this._playCue(id, {
      destination: filter,
      scale: event.crash ? 0.55 + (event.strength ?? 0.7) * 0.45 : 1,
      onEnd: () => {
        filter.disconnect();
        output.disconnect();
      },
    });
  }

  _playCue(id, { destination, scale = 1, onEnd = null, legacy = false } = {}) {
    this._syncMixer();
    const def = bank(id);
    if (!def) throw Error('Unknown audio cue: ' + id);
    if (
      def.flag &&
      !this.flags.enabled(def.flag) &&
      !(legacy && def.layers?.length)
    )
      return null;
    return this._runCue(
      id,
      () => {
        const buffer = legacy ? null : this._cueBuffer(id);
        if (buffer) this._sample(buffer, def.volume * scale);
        else
          for (const layer of def.layers || [])
            this._layer(
              layer,
              this._cueOutput,
              scale * (def.files ? 1 : def.volume),
            );
        if (def.sampleRef && this.samples[def.sampleRef])
          this._sample(this.samples[def.sampleRef], def.volume * scale);
      },
      destination,
      onEnd,
    );
  }

  _runCue(id, action, destination, onEnd) {
    const def = bank(id),
      previous = this._cueOutput,
      previousSources = this._cueSources;
    const output = this.context.createGain();
    output.gain.value = 1;
    if (this.mixer) this.mixer.registerGroup(output, id, destination);
    else output.connect(destination || this.master);
    this._cueOutput = output;
    this._cueSources = [];
    let sources;
    try {
      action();
    } finally {
      sources = this._cueSources;
      this._cueOutput = previous;
      this._cueSources = previousSources;
    }
    if (!sources.length) {
      this.mixer?.releaseGroup(output);
      output.disconnect();
      onEnd?.();
      return null;
    }
    const now = this.context.currentTime;
    const voice = {
      until: Math.max(...sources.map((source) => source._cueEnd || now + 4)),
      stop: () => {
        this.mixer?.fadeGroup(output);
        output.gain.cancelScheduledValues?.(this.context.currentTime);
        output.gain.setTargetAtTime?.(0, this.context.currentTime, 0.008);
        for (const source of sources)
          if (!source._cueEnd || source._cueEnd > this.context.currentTime)
            try {
              source.stop(
                Math.min(
                  source._cueEnd ?? Infinity,
                  this.context.currentTime + 0.04,
                ),
              );
            } catch {}
      },
    };
    const release = this.mixer?.track(id, voice);
    let pending = sources.length;
    for (const source of sources) {
      const ended = source.onended;
      source.onended = () => {
        ended?.();
        if (--pending === 0) {
          release?.();
          this.mixer?.releaseGroup(output);
          output.disconnect();
          onEnd?.();
        }
      };
    }
    if (def.duck)
      this.mixer?.duck(
        def.duck,
        Math.max(
          0.3,
          ...sources.map((source) => (source._cueEnd || now + 0.7) - now),
        ),
      );
    return voice;
  }

  _stopShot(voice) {
    if (!voice || voice.stopping || !this.activeShots.has(voice)) return;
    voice.stopping = true;
    const t = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setTargetAtTime(0, t, 0.018);
    try {
      voice.source.stop(Math.min(t + 0.08, voice.endAt ?? Infinity));
    } catch (_) {}
  }

  _noiseLayer(
    type,
    frequency,
    destination = this._cueOutput || this.buses?.interface || this.master,
  ) {
    const ctx = this.context,
      source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    this._connect(gain, destination);
    source.start();
    return { filter, gain };
  }

  setMuted(muted) {
    this.muted = !!muted;
    try {
      localStorage.setItem('duel_audio_muted', String(this.muted));
    } catch (_) {}
    this._volume();
    if (this.muted) for (const voice of this.activeShots) this._stopShot(voice);
    if (this.muted) {
      this._stopHiddenRoadVoices();
      this._clearProjectiles();
      this.mixer?.stopAll();
    }
  }
  toggleMute() {
    this.unlock();
    this.setMuted(!this.muted);
    return this.muted;
  }
  setPaused(paused) {
    this.paused = !!paused;
    this._volume();
    if (this.paused) {
      for (const voice of this.activeShots) this._stopShot(voice);
      this.lastThrottle = 0;
      this.shiftStarted = this.shiftUntil = 0;
    }
    if (this.paused) {
      this._stopHiddenRoadVoices();
      this._clearProjectiles();
      this.mixer?.stopAll();
    }
  }
  _volume() {
    if (this.context)
      this.master.gain.setTargetAtTime(
        this.muted || this.paused ? 0 : 0.42,
        this.context.currentTime,
        0.025,
      );
  }

  update(st, environment = {}) {
    this._syncMixer();
    this.updateHiddenRoad(st);
    this._updateProjectiles(st, environment);
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    if (this.paused !== st.paused) this.setPaused(st.paused);
    const t = ctx.currentTime;
    this._updateAmbience(st, environment, t);
    const dt = clamp(t - this.lastUpdateTime, 0, 0.1);
    this.lastUpdateTime = t;
    const racing =
      (st.status === 'racing' || st.status === 'exploring') && !st.paused;
    const impacting = st.impactTimer > 0;
    const running =
      (racing && !impacting) || (st.status === 'countdown' && !st.paused);
    const grounded = !st.airborne && (st.airHeight || 0) < 0.12,
      looseSurface = !!st.offRoad || !!environment.looseSurface;
    const voice = (this.carVoice =
      CAR_VOICES[st.car] || CAR_VOICES.falcone_f42);
    const perspective =
      environment.cameraMode === 'hood'
        ? { gain: 1, brightness: 1.08, exhaust: 0.58, intake: 1.38 }
        : environment.cameraMode === 'wide'
          ? { gain: 0.72, brightness: 0.82, exhaust: 0.78, intake: 0.62 }
          : { gain: 1, brightness: 1, exhaust: 1, intake: 1 };
    const gateCinematic =
      st.status === 'exploring' && st.hiddenRoadJourney?.controlsLocked;
    this.vehicleBus.gain.setTargetAtTime(
      perspective.gain * (gateCinematic ? 0.32 : 1),
      t,
      0.18,
    );
    const wet = clamp(Number(environment.tunnel) || 0, 0, 1);
    this.tunnelWet.gain.setTargetAtTime(running ? wet * 0.09 : 0, t, 0.12);
    const speed = Math.min(1.2, Math.abs(st.speedMph) / 200);
    const rpm = 0.18 + clamp(st.revs, 0, 1.15) * 0.82;
    // Input remains W/RT and S/LT; reverse swaps which pedal loads the engine.
    const throttleInput = st.gear === -1 ? st.input.brake : st.input.throttle,
      brakeInput = st.gear === -1 ? st.input.throttle : st.input.brake;
    const throttle = running ? clamp(throttleInput, 0, 1) : 0;
    this.smoothedLoad +=
      (throttle - this.smoothedLoad) *
      (1 - Math.exp(-dt / (throttle > this.smoothedLoad ? 0.045 : 0.09)));
    const load = this.smoothedLoad;
    let shiftCut = 1;
    if (t < this.shiftUntil && this.shiftUntil > this.shiftStarted) {
      const phase = clamp(
        (t - this.shiftStarted) / (this.shiftUntil - this.shiftStarted),
        0,
        1,
      );
      shiftCut = 1 - 0.72 * Math.sin(Math.PI * phase);
    }
    const bandWeights = engineBandWeights(rpm);
    const bandCoverage = ENGINE_BANDS.reduce(
      (sum, band, i) =>
        sum + (this.samples[band.key] ? bandWeights[i] ** 2 : 0),
      0,
    );
    const coverage = clamp(
      bandCoverage * load + (this.samples.coast ? 1 : 0) * (1 - load),
      0,
      1,
    );
    // Match the dominant recorded tone during crossfades. At high revs the
    // leveled steady loop is the only loaded-engine voice; no pitched overlay.
    const targetTone = engineTone(st.revs),
      carPitch = voice.pitch;
    const pitchResponse = t < this.shiftUntil ? 0.024 : 0.055;
    for (const layer of this.engine)
      layer.osc.frequency.setTargetAtTime(
        targetTone * layer.multiple * carPitch,
        t,
        pitchResponse,
      );
    this.engineFilter.frequency.setTargetAtTime(
      Math.min(
        3000,
        (500 + rpm * 1700 + (throttleInput ? 600 : 0)) *
          voice.brightness *
          perspective.brightness,
      ),
      t,
      0.08,
    );
    const synthFallback = this.samples.engine ? 0 : 1 - coverage;
    this.engineGain.gain.setTargetAtTime(
      running
        ? (0.1 + rpm * 0.12 + throttle * 0.045) *
            synthFallback *
            shiftCut *
            voice.gain
        : 0,
      t,
      0.1,
    );
    this.wind.gain.gain.setTargetAtTime(
      racing ? speed * speed * 0.085 : 0,
      t,
      0.12,
    );
    const rawSlip = Math.min(
      1,
      Math.max(
        0,
        Math.abs(st.slipAngle || 0) * 4.3 +
          Math.abs(st.steerVisual) * speed * 0.22 -
          0.2,
        brakeInput * speed * 0.9 - 0.2,
      ),
    );
    this.smoothedSlip +=
      (rawSlip - this.smoothedSlip) *
      (1 - Math.exp(-dt / (rawSlip > this.smoothedSlip ? 0.045 : 0.12)));
    const slip = this.smoothedSlip,
      recordedSlip = clamp((slip - 0.08) / 0.92, 0, 1),
      squeal = recordedSlip * recordedSlip * (3 - 2 * recordedSlip);
    for (let i = 0; i < ENGINE_BANDS.length; i++) {
      const band = ENGINE_BANDS[i],
        sample = this.samples[band.key];
      if (!sample) continue;
      // Adjacent recordings crossfade with equal power. Moderate pitch changes
      // retain exhaust texture instead of stretching a single loop sixfold.
      const rate = engineRate(targetTone, band.toneHz, carPitch);
      sample.source.playbackRate.setTargetAtTime(rate, t, pitchResponse);
      sample.filter.frequency.setTargetAtTime(
        Math.min(
          3400,
          (700 + rpm * 1300 + load * 1000) *
            voice.brightness *
            perspective.brightness,
        ),
        t,
        0.06,
      );
      const idleSupport = i === 0 ? Math.max(0, 1 - rpm / 0.46) * 0.52 : 0;
      const volume =
        bandWeights[i] * (0.58 + rpm * 0.35) * Math.sqrt(load) +
        idleSupport * Math.sqrt(1 - load);
      sample.gain.gain.setTargetAtTime(
        running ? volume * shiftCut * voice.gain : 0,
        t,
        0.05,
      );
      sample.body.filter.frequency.setTargetAtTime(145 + rpm * 135, t, 0.1);
      sample.body.gain.gain.setTargetAtTime(
        running
          ? volume *
              voice.exhaust *
              perspective.exhaust *
              (0.55 + load * 0.45) *
              shiftCut
          : 0,
        t,
        0.075,
      );
      sample.intake.filter.frequency.setTargetAtTime(820 + rpm * 980, t, 0.09);
      sample.intake.gain.gain.setTargetAtTime(
        running
          ? volume *
              voice.intake *
              perspective.intake *
              load *
              Math.max(0, (rpm - 0.25) / 0.75) *
              shiftCut
          : 0,
        t,
        0.06,
      );
    }
    if (this.samples.coast) {
      const sample = this.samples.coast;
      // Its measured fundamental is 63.5 Hz, not the high-load loop's 86 Hz.
      // Lifting changes load/brightness, without an unrelated octave drop.
      sample.source.playbackRate.setTargetAtTime(
        engineRate(targetTone, 63.5, carPitch, 3),
        t,
        pitchResponse,
      );
      sample.filter.frequency.setTargetAtTime(
        (420 + rpm * 1150) * voice.brightness * perspective.brightness,
        t,
        0.07,
      );
      const coastVolume = (0.17 + rpm * 0.21) * Math.sqrt(1 - load);
      sample.gain.gain.setTargetAtTime(
        running ? coastVolume * shiftCut * voice.gain : 0,
        t,
        0.065,
      );
      sample.body.filter.frequency.setTargetAtTime(130 + rpm * 110, t, 0.1);
      sample.body.gain.gain.setTargetAtTime(
        running
          ? coastVolume * voice.exhaust * perspective.exhaust * 0.45 * shiftCut
          : 0,
        t,
        0.09,
      );
      sample.intake.gain.gain.setTargetAtTime(0, t, 0.06);
    }
    if (this.samples.engine) {
      const sample = this.samples.engine;
      sample.source.playbackRate.setTargetAtTime(
        engineRate(targetTone, 86, carPitch),
        t,
        pitchResponse,
      );
      sample.filter.frequency.setTargetAtTime(
        Math.min(
          3400,
          (700 + rpm * 1300 + load * 1000) *
            voice.brightness *
            perspective.brightness,
        ),
        t,
        0.06,
      );
      const fallbackVolume = (0.26 + rpm * 0.15 + load * 0.16) * (1 - coverage);
      sample.gain.gain.setTargetAtTime(
        running ? fallbackVolume * shiftCut * voice.gain : 0,
        t,
        0.08,
      );
      sample.body.filter.frequency.setTargetAtTime(145 + rpm * 135, t, 0.1);
      sample.body.gain.gain.setTargetAtTime(
        running
          ? fallbackVolume * voice.exhaust * perspective.exhaust * shiftCut
          : 0,
        t,
        0.09,
      );
      sample.intake.filter.frequency.setTargetAtTime(820 + rpm * 980, t, 0.09);
      sample.intake.gain.gain.setTargetAtTime(
        running
          ? fallbackVolume * voice.intake * perspective.intake * load * shiftCut
          : 0,
        t,
        0.07,
      );
    }
    if (running && racing && !this.muted) {
      if (
        throttle > 0.6 &&
        this.lastThrottle < 0.3 &&
        t >= this.nextThrottle &&
        this.samples.throttle
      ) {
        this._stopShot(this.throttleVoice);
        this._stopShot(this.liftVoice);
        this.throttleVoice = this._sample(
          this.samples.throttle,
          (0.18 + rpm * 0.12) * voice.accent,
          clamp((0.85 + rpm * 0.28) * carPitch, 0.65, 1.4),
          this.buses.engine,
          0.32,
        );
        this.nextThrottle = t + 0.35;
      } else if (
        throttle < 0.2 &&
        this.lastThrottle > 0.65 &&
        t >= this.nextLift &&
        Math.abs(st.speedMph) > 35 &&
        this.samples.lift
      ) {
        this._stopShot(this.throttleVoice);
        this._stopShot(this.liftVoice);
        this.liftVoice = this._sample(
          this.samples.lift,
          (0.16 + rpm * 0.09) * voice.accent,
          clamp((0.85 + rpm * 0.35) * carPitch, 0.65, 1.4),
          this.buses.engine,
          0.28,
        );
        this.nextLift = t + 0.3;
      }
    }
    if (!running) {
      this._stopShot(this.throttleVoice);
      this._stopShot(this.liftVoice);
      this._stopShot(this.shiftVoice);
      this.shiftStarted = this.shiftUntil = 0;
    }
    this.lastThrottle = throttle;
    if (this.samples.squeal) {
      const sample = this.samples.squeal;
      sample.source.playbackRate.setTargetAtTime(
        0.84 + speed * 0.11 + squeal * 0.2,
        t,
        0.075,
      );
      sample.filter.frequency.setTargetAtTime(
        2500 + speed * 1800 + squeal * 1200,
        t,
        0.08,
      );
      sample.gain.gain.setTargetAtTime(
        racing && grounded && !looseSurface && !impacting ? squeal * 0.4 : 0,
        t,
        0.075,
      );
    }
    const impactGrind = impacting
      ? (0.2 * st.impactStrength * st.impactTimer) / st.impactDuration
      : 0;
    const roadBed = looseSurface
        ? 0
        : speed * speed * (0.012 + clamp(st.roughness || 0, 0, 1) * 0.02),
      roadScrub = looseSurface ? 0 : slip * 0.055;
    this.tires.filter.frequency.setTargetAtTime(
      430 + speed * 1250 + slip * 500,
      t,
      0.09,
    );
    this.tires.gain.gain.setTargetAtTime(
      racing && grounded ? Math.max(impactGrind, roadBed + roadScrub) : 0,
      t,
      0.065,
    );
    this.gravel.filter.frequency.setTargetAtTime(
      550 + speed * 1500 + clamp(st.roughness || 0, 0, 1) * 450,
      t,
      0.1,
    );
    this.gravel.gain.gain.setTargetAtTime(
      racing && grounded && looseSurface
        ? Math.min(
            0.23,
            speed * (0.055 + (st.roughness || 0) * 0.14) + slip * 0.035,
          )
        : 0,
      t,
      0.065,
    );
    this.boost.gain.gain.setTargetAtTime(
      st.boosting && racing ? 0.1 : 0,
      t,
      0.07,
    );
    const proximity = clamp(
        1 -
          (st.police.pursuit?.distanceU ?? st.police.pursuit?.gapU ?? 650) /
            650,
        0,
        1,
      ),
      wail = 710 + Math.sin(t * 2.2) * 300;
    this.siren.frequency.setTargetAtTime(wail, t, 0.04);
    this.sirenHarmony.frequency.setTargetAtTime(
      wail * bank('vehicle.siren').harmonic,
      t,
      0.04,
    );
    this.sirenGain.gain.setTargetAtTime(
      st.status === 'racing' && racing && st.police.pursuit?.active
        ? 0.012 + 0.052 * proximity * proximity
        : 0,
      t,
      0.15,
    );
    if (
      st.status === 'racing' &&
      racing &&
      st.police.beep > 0.2 &&
      !st.police.triggered &&
      t >= this.nextRadar
    ) {
      this._playCue('interface.radar');
      this.nextRadar = t + 1.2 - st.police.beep * 1.05;
    }
    if (st.paused || this.muted || st.hiddenRoadJourney?.controlsLocked) {
      this.nextBeat = t + 0.15;
      return;
    }
    if (t >= this.nextBeat) {
      // A quiet original minor-key sequencer sits behind the engine.
      const { pattern, lead, bass } = bank('music.sequence');
      const note = pattern[this.beatIndex % pattern.length];
      this._runCue('music.sequence', () => {
        this._tone(
          note * (racing ? 2 : 1),
          lead.duration[+racing],
          lead.volume[+racing],
          lead.type,
        );
        if (this.beatIndex % 4 === 0)
          this._tone(
            note / 2,
            bass.duration[+racing],
            bass.volume[+racing],
            bass.type,
          );
      });
      this.beatIndex++;
      this.nextBeat = t + (racing ? 0.25 : 0.5);
    }
  }

  event(ev, state, course) {
    // Automatic visits emit opening while the stage is prepared, then stageLoaded.
    // Preserve only that same visit's already-observed event across the reset.
    if (
      ev?.stageLoaded != null &&
      !(
        ev.hiddenRoadVisit &&
        state?.hiddenRoadJourney?.phase === 'opening' &&
        this.pendingGatekeeper === state.hiddenRoadJourney.id
      )
    )
      this.pendingGatekeeper = null;
    if (ev?.hiddenRoadPhase?.phase === 'opening')
      this.pendingGatekeeper = ev.hiddenRoadPhase.journeyId;
    if (ev?.stageLoaded != null) {
      this._clearProjectiles();
      this.mixer?.stopAll();
      this._stopHiddenRoadVoices();
      this.hiddenRoadId = null;
      this.hiddenRoadCueKeys.clear();
    }
    // Stage restart must clear old load/cut history even while muted or paused.
    // Keep the decoded sources and graph: a new race does not create new loops.
    if (ev?.stageLoaded != null) {
      for (const shot of [this.throttleVoice, this.liftVoice, this.shiftVoice])
        this._stopShot(shot);
      this.smoothedLoad = 0;
      this.lastThrottle = 0;
      this.nextThrottle = this.nextLift = 0;
      this.shiftStarted = this.shiftUntil = 0;
    }
    if (
      !this.context ||
      this.context.state !== 'running' ||
      this.muted ||
      this.paused ||
      !ev
    )
      return;
    this._syncMixer();
    const wastelandAudio =
      state?.mode === 'wasteland' &&
      Number.isFinite(state.maxArmor) &&
      state.maxArmor > 0;
    const recordedAudio = wastelandAudio && this.flags.enabled('wasteland2');
    if (ev.countdown) this._playCue('interface.countdown');
    if (ev.go) this._playCue('interface.go');
    if (ev.shift != null) {
      this.shiftStarted = this.context.currentTime;
      this.shiftUntil = this.shiftStarted + 0.18;
      this._stopShot(this.throttleVoice);
      this._stopShot(this.liftVoice);
      this._stopShot(this.shiftVoice);
      if (this.samples.shift)
        this.shiftVoice = this._sample(
          this.samples.shift,
          0.5 * this.carVoice.accent,
          this.carVoice.pitch,
          this.buses?.engine || this.vehicleBus,
          0.16,
        );
      else this._playCue('engine.shift-fallback');
    }
    if (ev.chickenBonus) {
      this._playCue('interface.bonus');
      this._flutter();
    }
    if (ev.jumpLanded)
      this._playCue('vehicle.landing', {
        scale: 1 + clamp((ev.jumpLanded.distance || 0) / 16, 0, 1),
      });
    if (ev.propCrushed?.byPlayer) this._crushImpact(ev.propCrushed.strength);
    if (ev.boostStarted) this._playCue('vehicle.boost-start');
    if (ev.nearMiss) {
      this._playCue('interface.near-miss');
    }
    if (ev.escaped || ev.stageResult?.won || ev.complete) {
      this._playCue('interface.win');
    }
    if (ev.ticket || ev.gameover || ev.stageResult?.won === false)
      this._playCue('interface.lose');
    if (ev.weaponFired) {
      if (wastelandAudio) this._weaponCue(ev.weaponFired);
      else {
        this._playCue(
          bank('weapon.' + ev.weaponFired + '.legacy')
            ? 'weapon.' + ev.weaponFired + '.legacy'
            : 'weapon.default.legacy',
        );
      }
    }
    if (wastelandAudio) {
      if (ev.footRepairStarted) this._repairCue('start');
      if (ev.footRepairCompleted) this._repairCue('complete');
      if (ev.footRepairInterrupted) this._repairCue('interrupted');
      if (ev.raiderWarning) {
        this._playCue('raider.warning');
      }
      if (ev.raiderShot) this._raiderShot(ev, state, course);
    }
    if (ev.combatExplosion) {
      if (recordedAudio && this.cueBuffers['combat.blast.recorded'])
        this._recordedImpact('combat.blast.recorded', ev, state, course);
      else if (wastelandAudio && ev.audioWeapon === 'rpg')
        this._rpgImpact(ev, state, course);
      else
        this._runCue('combat.blast', () =>
          this._combatBlast(ev, state, course),
        );
    }
    if (ev.combatHit) {
      this._runCue('combat.hit', () => this._combatImpact(ev, state, course));
      if (recordedAudio && !ev.enemy && ev.victim !== 'player')
        this._playCue('combat.hit-confirm');
    }
    if (ev.explosion) {
      if (recordedAudio && this.cueBuffers['combat.blast.recorded'])
        this._recordedImpact('combat.blast.recorded', ev, state, course);
      else if (this.samples.explosion) this._playCue('combat.explosion');
    }
    if (ev.crash && recordedAudio && this.cueBuffers['vehicle.crash.recorded'])
      this._recordedImpact('vehicle.crash.recorded', ev, state, course);
    else if (ev.crash)
      this._runCue('vehicle.crash', () => {
        const def = bank('vehicle.crash');
        const force = 0.55 + (ev.strength ?? 0.7) * 0.45;
        const ctx = this.context,
          noise = ctx.createBufferSource(),
          gain = ctx.createGain(),
          filter = ctx.createBiquadFilter();
        noise.buffer = this.noiseBuffer;
        [filter.type, filter.frequency.value] = def.filter;
        noise.connect(filter);
        filter.connect(gain);
        this._connect(gain, this._cueOutput);
        gain.gain.setValueAtTime(def.noiseVolume * force, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + def.duration,
        );
        noise.start();
        noise.stop(ctx.currentTime + def.tail);
        this._cueSources?.push(noise);
        noise._cueEnd = ctx.currentTime + def.tail;
        noise.onended = () => {
          noise.disconnect();
          filter.disconnect();
          this._disconnect(gain);
        };
        this._layer(def.layers[0], this._cueOutput, force);
        if (ev.explosion && !this.samples.explosion)
          this._playCue('combat.explosion-fallback');
      });
  }

  _flutter() {
    return this._runCue('vehicle.flutter', () => {
      const def = bank('vehicle.flutter');
      const ctx = this.context,
        start = ctx.currentTime,
        source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain();
      source.buffer = this.noiseBuffer;
      [filter.type, filter.frequency.value] = def.filter;
      filter.Q.value = def.q;
      gain.gain.setValueAtTime(0, start);
      for (let i = 0; i < def.pulses; i++) {
        const at = start + i * def.interval;
        gain.gain.linearRampToValueAtTime(
          def.peak * (1 - i * def.decay),
          at + def.attack,
        );
        gain.gain.linearRampToValueAtTime(0.001, at + def.release);
      }
      source.connect(filter);
      filter.connect(gain);
      this._connect(gain, this._cueOutput);
      source.start();
      source.stop(start + def.duration);
      this._cueSources?.push(source);
      source._cueEnd = start + def.duration;
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        this._disconnect(gain);
      };
    });
  }

  _crushImpact(strength = 0.7) {
    return this._runCue('vehicle.crush', () => {
      const def = bank('vehicle.crush');
      // Reuse the original collision-noise source at a quieter, lower rate.
      // This is harmless sheet-metal crunch, with no explosion or failure cue.
      const ctx = this.context,
        start = ctx.currentTime,
        source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        gain = ctx.createGain(),
        force = 0.6 + clamp(Number(strength) || 0, 0, 1) * 0.4;
      source.buffer = this.noiseBuffer;
      source.playbackRate.value = def.rate;
      [filter.type, filter.frequency.value] = def.filter;
      filter.Q.value = 0.65;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(def.noiseVolume * force, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + def.duration);
      source.connect(filter);
      filter.connect(gain);
      this._connect(gain, this._cueOutput);
      source.start();
      source.stop(start + def.tail);
      this._cueSources?.push(source);
      source._cueEnd = start + def.tail;
      const voice = { source, gain };
      this.activeShots.add(voice);
      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        this._disconnect(gain);
        this.activeShots.delete(voice);
      };
      this._layer(def.layers[0], this._cueOutput, force);
    });
  }

  _stopHiddenRoadVoices() {
    for (const voice of this.hiddenRoadVoices) {
      this.hiddenRoadVoices.delete(voice);
      voice.stop?.();
    }
  }

  updateHiddenRoad(state) {
    const j = state?.hiddenRoadJourney;
    const enabled = state?.status === 'exploring' && j?.departed;
    const id = enabled ? j.id : null;
    if (id !== this.hiddenRoadId) {
      this._stopHiddenRoadVoices();
      this.hiddenRoadCueKeys.clear();
      this.hiddenRoadId = id;
      if (this.pendingGatekeeper !== id) this.pendingGatekeeper = null;
    }
    if (!enabled) {
      this.pendingGatekeeper = null;
      this._stopHiddenRoadVoices();
      return;
    }
    this._updateGatekeeperWelcome(state);
    if (j.phase === 'turned-back') this._stopHiddenRoadVoices();
    const phase = j.phase,
      age = Math.max(0, Number(j.phaseElapsedSec) || 0),
      cues = [];
    if (phase === 'arriving' && age < 2.4)
      cues.push({ kind: 'drum', index: Math.floor(age / 0.8) });
    if (phase === 'opening' && age < 3) {
      cues.push({ kind: 'chain', index: Math.floor(age / 0.18) });
      if (age < 0.3 || (age >= 1.2 && age < 1.5) || (age >= 2.4 && age < 2.7))
        cues.push({ kind: 'drum', index: Math.floor(age / 1.2) });
    }
    if (phase === 'choice' && age < 0.2) cues.push({ kind: 'latch', index: 0 });
    if (state.paused || this.paused || this.muted) {
      this._stopHiddenRoadVoices();
      for (const cue of cues)
        this.hiddenRoadCueKeys.add(`${phase}/${cue.kind}/${cue.index}`);
      return;
    }
    for (const cue of cues) {
      const key = `${phase}/${cue.kind}/${cue.index}`;
      if (this.hiddenRoadCueKeys.has(key)) continue;
      this.hiddenRoadCueKeys.add(key);
      const voice = this.hiddenRoadVoiceFactory({
        journeyId: id,
        phase,
        ...cue,
        simulationTime: Number(j.elapsedSec) || 0,
      });
      if (voice) {
        this.hiddenRoadVoices.add(voice);
        if (this.hiddenRoadVoices.size > 8) {
          const first = this.hiddenRoadVoices.values().next().value;
          this.hiddenRoadVoices.delete(first);
          first.stop?.();
        }
      }
    }
  }

  _updateGatekeeperWelcome(state) {
    const j = state.hiddenRoadJourney;
    if (this.pendingGatekeeper !== j.id) return;
    if (j.phase !== 'opening') {
      this.pendingGatekeeper = null;
      return;
    }
    if (
      !this.flags.enabled('hidden-road') ||
      state.paused ||
      this.paused ||
      this.muted ||
      this.context?.state !== 'running' ||
      !this.cueBuffers['gatekeeper.welcome']
    )
      return;
    const key = 'gatekeeper.welcome';
    this.pendingGatekeeper = null;
    if (this.hiddenRoadCueKeys.has(key)) return;
    this.hiddenRoadCueKeys.add(key);
    let voice;
    voice = this._playCue(key, {
      onEnd: () => this.hiddenRoadVoices.delete(voice),
    });
    if (voice) this.hiddenRoadVoices.add(voice);
  }

  _createHiddenRoadVoice(cue) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || !this.hiddenRoadBus) return null;
    const def = bank('gate.' + cue.kind),
      start = ctx.currentTime,
      duration = def.duration;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(def.gain, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(this.hiddenRoadBus);
    const nodes = [],
      sources = [];
    const tones = def.tones.map(
      (value, i) =>
        value +
        (def.toneStep ? (cue.index % def.tonePeriod[i]) * def.toneStep[i] : 0),
    );
    for (let i = 0; i < tones.length; i++) {
      const source = ctx.createOscillator(),
        level = ctx.createGain();
      source.type = 'sine';
      level.gain.value = i === 0 ? 0.7 : 0.22;
      source.frequency.setValueAtTime(tones[i], start);
      source.frequency.exponentialRampToValueAtTime(
        tones[i] * def.pitchEnd,
        start + duration,
      );
      source.connect(level);
      level.connect(gain);
      source.start(start);
      source.stop(start + duration + 0.02);
      sources.push(source);
      nodes.push(source, level);
    }
    if (cue.kind !== 'drum' && this.noiseBuffer) {
      const source = ctx.createBufferSource(),
        filter = ctx.createBiquadFilter(),
        level = ctx.createGain();
      source.buffer = this.noiseBuffer;
      filter.type = 'bandpass';
      filter.frequency.value = 1900 + (cue.index % 3) * 230;
      filter.Q.value = 1.2;
      level.gain.setValueAtTime(0.35, start);
      level.gain.exponentialRampToValueAtTime(0.001, start + 0.055);
      source.connect(filter);
      filter.connect(level);
      level.connect(gain);
      source.start(start, (cue.index * 0.071) % 1);
      source.stop(start + 0.08);
      sources.push(source);
      nodes.push(source, filter, level);
    }
    let stopped = false,
      finished = false;
    const release = () => {
      if (finished) return;
      finished = true;
      for (const node of [...nodes, gain]) node.disconnect();
      this.hiddenRoadVoices.delete(voice);
    };
    const voice = {
      stop: () => {
        if (stopped || finished) return;
        stopped = true;
        const now = ctx.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(0.0001, now, 0.006);
        for (const source of sources) {
          try {
            source.stop(now + 0.035);
          } catch {}
        }
      },
    };
    sources[0].onended = release;
    return voice;
  }

  _tone(
    frequency,
    duration,
    volume,
    type = 'sine',
    delay = 0,
    endFrequency = null,
    destination = this._cueOutput || this.buses?.interface || this.master,
    onEnd = null,
  ) {
    const ctx = this.context,
      start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency)
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        start + duration,
      );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    this._connect(gain, destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => {
      oscillator.disconnect();
      this._disconnect(gain);
      onEnd?.();
    };
    this._cueSources?.push(oscillator);
    oscillator._cueEnd = start + duration + 0.02;
  }
}

function engineBandWeights(rpm) {
  const weights = [0, 0, 0, 0];
  if (rpm <= ENGINE_BANDS[0].rpm) {
    weights[0] = 1;
    return weights;
  }
  for (let i = 0; i < ENGINE_BANDS.length - 1; i++) {
    const low = ENGINE_BANDS[i].rpm,
      high = ENGINE_BANDS[i + 1].rpm;
    if (rpm <= high) {
      const blend = clamp((rpm - low) / (high - low), 0, 1);
      weights[i] = Math.cos((blend * Math.PI) / 2);
      weights[i + 1] = Math.sin((blend * Math.PI) / 2);
      return weights;
    }
  }
  weights[3] = 1;
  return weights;
}

function readMuted() {
  try {
    return localStorage.getItem('duel_audio_muted') === 'true';
  } catch (_) {
    return false;
  }
}
