import {tyreSlipRawSound} from './config.js';
import {isSummitAttack} from './summit-attack.js';
// Audio rendering reads simulation state; all authored cues live in the bank.
import {
  SOUND_BANK,
  ENGINE_BANDS,
  SAMPLE_ENTRIES,
  AMBIENCE,
  CAR_VOICES,
} from './sound-bank.js';
import { deepEngineCutoff } from './deep/deep-audio.js';
import {sampleCourseLightPath} from './light-path.js';
import { SoundMixer } from './sound-mixer.js';
import { createAudioOutput } from './audio-output.js';
import { featureFlags } from './feature-flags.js';
import { raceFeatureFlags, wastelandRulesActive } from './wasteland-access.js';
import { createFightVoices } from './fight-voices.js';
import {point, velocity} from './combat-weapons.js';
import {actorForTarget} from './arsenal/targeting.js';
const bank = (id) => SOUND_BANK[id];
const ARSENAL_EVENT_CUES = new Set([
  'weapon.oil.deploy', 'weapon.oil.slip', 'weapon.smoke.deploy',
  'weapon.harpoon.fire', 'weapon.harpoon.hit', 'weapon.harpoon.break',
  'weapon.caltrops.deploy', 'weapon.caltrops.hit',
  'weapon.rockets.fire', 'weapon.rockets.hit', 'weapon.rockets.lock',
  'weapon.flame.start', 'weapon.flame.loop', 'weapon.flame.end',
  'weapon.magnet.hum',
]);
const ARSENAL_CORE_CUES = new Set(['weapon.smoke.deploy', 'weapon.oil.deploy', 'warlord.nitroSpent']);
const ARSENAL_WAVE_THREE_CUES = new Set([
  'weapon.mortar.fire', 'weapon.mortar.hit', 'weapon.tesla.charge',
  'weapon.tesla.pulse', 'weapon.decoy.deploy', 'weapon.decoy.burst', 'weapon.nitro.start',
]);
const BOARDING_CUES = Object.freeze({
  'crew.boarding.mount': 'vehicle.landing',
  'crew.boarding.throw': 'vehicle.landing',
  'crew.boarding.plant': 'crew.sticky.arm',
  'crew.boarding.blast': 'crew.sticky.explode',
  'crew.boarding.release': 'vehicle.landing',
});
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
    const smashPoint = event?.vehicleSmash?.point;
    const source =
      hit && [hit.x, hit.y, hit.z].every(Number.isFinite)
        ? hit
        : smashPoint && [smashPoint.x, smashPoint.z].every(Number.isFinite)
          ? smashPoint
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
  constructor({ hiddenRoadVoiceFactory, flags = raceFeatureFlags(featureFlags, () => null) } = {}) {
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
    this.arsenalFieldVoices = new Map();
    this.grandPrixVoices = new Set();
    this.grandPrixDeliveries = new WeakMap();
    this.grandPrixField = null;
    this.grandPrixStatus = null;
    this.pendingGatekeeper = null;
    this.sampleStatus = 'locked';
    this.ambience = {};
    this.landmarkHeard = new WeakSet();
    this.ambienceStatus = 'locked';
    this._ambiencePromise = null;
    this.smoothedLoad = 0;
    this.smoothedSlip = 0;
    this.tyreSlipSmoothed = 0;
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
    this.fightVoices = createFightVoices({
      enabled: () => this.flags.enabled('fight-voices'),
      audible: () => !this.muted && !this.paused && this.context?.state === 'running',
      play: id => this.cueBuffers[id] ? this._playCue(id) : null,
      duration: id => this.cueBuffers[id]?.duration,
    });
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
    this.output = createAudioOutput(ctx, this.master);
    this.vehicleBus = ctx.createGain();
    this.vehicleBus.gain.value = 1;
    this.vehicleBus.connect(this.master);
    this.mixer = new SoundMixer(ctx, this.master, {
      vehicle: this.vehicleBus,
      enabled: this.wastelandAudioEnabled === true,
      voiceEnabled: this.flags.enabled('hidden-road') || this.flags.enabled('fight-voices') || this.flags.enabled('rival-voices'),
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
    this.mud = this._noiseLayer(
      ...bank('world.muddy-hollow-churn').filter,
      this.buses.vehicle,
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

  _loadCueBuffers({summitAttack=false}={}) {
    const grandPrix = this.flags.enabled('grand-prix'), snowmen=this.flags.enabled('snowmen');
    const addSnowmen=snowmen && !this._snowmanCueStarted;
    const yeti=this.flags.enabled('yeti'),addYeti=yeti&&!this._yetiCueStarted;
    const avalanche=this.flags.enabled('summit-run'),addAvalanche=avalanche && !this._avalancheCueStarted;
    const addSummitAttack=summitAttack && avalanche && !this._summitAttackCueStarted;
    if (this._cueBuffersPromise && (!grandPrix || this._p4CueBuffersStarted) && !addSnowmen && !addAvalanche && !addYeti && !addSummitAttack)
      return this._cueBuffersPromise;
    const pending = this._cueBuffersPromise;
    // A later Grand Prix activation adds only its own batch. Existing cue and
    // fight-voice loading retains the selection made at ordinary audio startup.
    if (grandPrix) this._p4CueBuffersStarted = true;
    if(snowmen || grandPrix)this._snowmanCueStarted=true;
    if(avalanche || grandPrix)this._avalancheCueStarted=true;
    if(yeti || grandPrix)this._yetiCueStarted=true;
    if(addSummitAttack)this._summitAttackCueStarted=true;
    const loading = Promise.allSettled(
      Object.entries(SOUND_BANK)
        .filter(
          ([id, cue]) => (cue.file || cue.files) && !cue.sample && !cue.biome &&
            (cue.flag !== 'kogane-pass' || this.flags.enabled('kogane-pass')) &&
            (cue.flag !== 'eifel-crown' || this.flags.enabled('eifel-crown')) &&
            cue.flag !== 'the-deep' && cue.flag !== 'helicopter' && cue.flag !== 'driving-lessons' && cue.flag !== 'lab' &&
            (!pending || cue.flag === 'grand-prix') &&
            (cue.flag !== 'fight-voices' || this.flags.enabled('fight-voices')) &&
            (cue.flag !== 'grand-prix' || grandPrix || id==='snowman.burst' && addSnowmen || ['avalanche.rumble','avalanche.slide'].includes(id) && addAvalanche || id==='yeti.roar' && addYeti || id==='race.finish.flag' && addSummitAttack),
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
    this._cueBuffersPromise = pending ? Promise.allSettled([pending, loading]) : loading;
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
      Object.entries(AMBIENCE).filter(([,def]) => !def.flag || this.flags.enabled(def.flag)).map(async ([biome, def]) => {
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
    const chosen = environment.course?.def.ambience ?? environment.biome;
    const bed = AMBIENCE[chosen];
    const night = bed?.nightBiome ? clamp(((sampleCourseLightPath(environment.course,
      {distance:st.s})?.settings.nightAmount ?? (environment.night ? 1 : 0)) - bed.nightFrom) /
      (1-bed.nightFrom), 0, 1) : 0;
    for (const [biome, layer] of Object.entries(this.ambience)) {
      const selected =
        chosen === biome &&
        !(biome === 'alpine' && environment.night);
      const share = selected ? 1-night : biome === bed?.nightBiome ? night : 0;
      const target = active ? AMBIENCE[biome].gain * duck * share : 0;
      layer.gain.gain.setTargetAtTime(target, t, st.paused ? 0.025 : 0.65);
    }
    const landmark = environment.course?.def.landmarkSound;
    if (active && st.status === 'racing' && !this.muted && !this.paused && landmark &&
        Math.abs(st.s-landmark.s) <= landmark.reach && !this.landmarkHeard.has(environment.course) &&
        this.cueBuffers[landmark.cue] && this._playCue(landmark.cue)) this.landmarkHeard.add(environment.course);
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

  _spatialOutput(event, state, course, destination = null) {
    const ctx = this.context,
      space = combatAudioSpace(event, state, course);
    const level = ctx.createGain(),
      panner = ctx.createStereoPanner();
    level.gain.value = space.gain;
    panner.pan.value = space.pan;
    level.connect(panner);
    this._connect(
      panner,
      destination || this._cueOutput || this.buses?.impacts || this.master,
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
    this._playCue(event.audioWeapon === 'rpg' ? 'weapon.rpg.fire' : 'raider.shot', {
      destination: output.level,
      onEnd: output.disconnect,
    });
  }

  // A smash sounds as hard as the hit (CRASH-02 audio). The player's own
  // crash already plays for the same collision, so it is not doubled.
  _smashImpact(event, state, course) {
    const dv = Number(event.vehicleSmash.dvMph) || 0;
    const output = this._spatialOutput(event, state, course);
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value =
      output.space.distance > 80 ? bank('vehicle.crash-impact').farCutoff : 16000;
    filter.connect(output.level);
    return this._playCue('vehicle.crash-impact', {
      destination: filter,
      scale: clamp(0.35 + dv / 55, 0.35, 1.4),
      onEnd: () => {
        filter.disconnect();
        output.disconnect();
      },
    });
  }

  // Mud (EGG-03 audio): a squelch on entering, splats while the wheels spin,
  // and a low churn under the tyres while moving through it.
  _updateMud(st, t, touching) {
    if (!this.mud) return;
    const mud = touching ? clamp(Number(st.surfaceMud) || 0, 0, 1) : 0;
    const speed = clamp(Math.abs(Number(st.speedMph) || 0) / 60, 0, 1);
    const spin = clamp(Number(st.mudWheelSpin) || 0, 0, 1);
    this.mud.filter.frequency.setTargetAtTime(300 + speed * 380 + spin * 220, t, 0.1);
    this.mud.gain.gain.setTargetAtTime(
      mud > 0.05 ? Math.min(0.26, mud * (speed * 0.16 + spin * 0.18 + 0.02)) : 0,
      t,
      0.08,
    );
    const inMud = mud > 0.35;
    if (inMud && !this._inMud && speed > 0.05)
      this._playCue('world.muddy-hollow-mud', { scale: 0.6 + speed * 0.6 });
    else if (inMud && spin > 0.3 && t >= (this._nextMudSplat || 0)) {
      if (this._nextMudSplat) this._playCue('world.muddy-hollow-mud', { scale: 0.45 + spin * 0.4 });
      this._nextMudSplat = t + 0.32;
      return void (this._inMud = inMud);
    }
    if (!inMud || spin <= 0.3) this._nextMudSplat = inMud ? t + 0.32 : 0;
    this._inMud = inMud;
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
    delay = 0,
  ) {
    const ctx = this.context,
      start = ctx.currentTime + delay;
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
        layer.delay || 0,
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

  _syncMixer(state) {
    if (state) this.wastelandAudioEnabled = wastelandRulesActive(state);
    if (!this.mixer?.update) return;
    this.mixer.enabled = this.wastelandAudioEnabled === true;
    this.mixer.voiceEnabled = this.flags.enabled('hidden-road') || this.flags.enabled('fight-voices') || this.flags.enabled('rival-voices');
    this.mixer.update();
  }

  _playerEngineLevel() {
    const levels = [this.engineGain?.gain?.value || 0];
    for (const key of [...ENGINE_BANDS.map(band => band.key), 'coast', 'engine']) {
      const sample = this.samples[key];
      if (!sample) continue;
      levels.push(sample.gain?.gain?.value || 0, sample.body?.gain?.gain?.value || 0,
        sample.intake?.gain?.gain?.value || 0);
    }
    return Math.sqrt(levels.reduce((sum, gain) => sum + gain * gain, 0));
  }

  _vehicleEngineLevel(actor) {
    const speed = Number.isFinite(actor?.speedMph) ? Math.abs(actor.speedMph) : 0;
    return clamp(.2 + .8 * speed / 200, .2, 1);
  }

  _retireVehicleVoice(entry, immediate = false) {
    if (entry.retiring) {
      if (immediate) entry.voice?.stop({immediate: true});
      return;
    }
    entry.retiring = true;
    entry.voice?.stop({immediate});
    // Pending decoding still owns a reservation until its promise settles.
  }

  _clearVehicleVoices() {
    for (const entry of this.vehicleVoices || []) this._retireVehicleVoice(entry, true);
  }

  _updateVehicleVoices(state, environment) {
    const snapshot = environment.vehicles, listener = environment.listener;
    if (!this.flags.enabled('rival-voices') || !this.context || this.context.state !== 'running' ||
        this.muted || this.paused || state.paused || !['countdown', 'racing', 'exploring'].includes(state.status) ||
        !snapshot || !listener) {
      this._clearVehicleVoices();
      return;
    }
    this.vehicleVoices ??= new Set();
    const targets = [...snapshot.rivals.map(row => ({...row, kind: 'rival'})),
      ...snapshot.traffic.map(row => ({...row, kind: 'traffic'}))];
    const same = (entry, target) => entry.stage === snapshot.stage && entry.group === target.group &&
      entry.actor === target.actor && entry.id === target.id && entry.kind === target.kind;
    for (const entry of [...this.vehicleVoices].sort((a, b) => b.distance - a.distance)) {
      if (entry.stage !== snapshot.stage) this._retireVehicleVoice(entry, true);
      else if (!targets.some(target => same(entry, target))) this._retireVehicleVoice(entry);
    }
    const rateFor = (row, cue) => engineRate(engineTone(Number.isFinite(row.revs) ? row.revs :
      clamp(Math.abs(row.speedMph || 0) / 200, 0, 1)), cue.toneHz,
      row.kind === 'rival' ? (CAR_VOICES[row.car] || CAR_VOICES.falcone_f42).pitch : 1);
    for (const target of targets) {
      const cueId = target.kind === 'rival' ? 'vehicle.rival-engine' : 'vehicle.traffic-engine';
      const cue = bank(cueId);
      const entry = [...this.vehicleVoices].find(row => !row.retiring && same(row, target));
      if (entry) {
        Object.assign(entry, target, {listener, ownLevel: this._vehicleEngineLevel(target.actor)});
        entry.voice?.update(target.position, listener, {rate: rateFor(target, cue), volume: entry.ownLevel});
        continue;
      }
      if (this.vehicleVoices.size >= 7 || [...this.vehicleVoices].filter(row => row.kind === target.kind).length >= cue.limit) continue;
      const reservation = {...target, listener, ownLevel: this._vehicleEngineLevel(target.actor), stage: snapshot.stage, retiring: false, voice: null};
      this.vehicleVoices.add(reservation);
      const bind = () => {
        if (reservation.retiring || reservation.group !== (reservation.kind === 'rival' ? state.opponents : state.traffic) ||
            !reservation.group.includes(reservation.actor) || reservation.actor.alive === false ||
            reservation.actor.wrecked || reservation.actor.crushed || reservation.actor.finished ||
            this.context.state !== 'running' || this.muted || this.paused || state.paused ||
            !['countdown', 'racing', 'exploring'].includes(state.status) || !this.flags.enabled('rival-voices')) {
          this.vehicleVoices.delete(reservation);
          return;
        }
        const buffer = this.samples[cue.donor]?.source?.buffer ||
          (reservation.kind === 'rival' ? this.samples.engine?.source?.buffer : null);
        if (!buffer) { this.vehicleVoices.delete(reservation); return; }
        const donorCue = this.samples[cue.donor]?.source?.buffer ? cue : {...cue, toneHz: 86};
        reservation.ownLevel = this._vehicleEngineLevel(reservation.actor);
        reservation.voice = this.mixer.playMoving(cueId, buffer, reservation.position, reservation.listener, {
          loop: true, rate: rateFor(reservation, donorCue), volume: reservation.ownLevel,
          fadeIn: .4, fadeOut: .4, admitted: true,
          onEnded: () => this.vehicleVoices.delete(reservation),
        });
        if (!reservation.voice) this.vehicleVoices.delete(reservation);
      };
      if (this.samples[cue.donor]?.source?.buffer || this.samples.engine?.source?.buffer) bind();
      else Promise.resolve(this._samplesPromise).then(bind, () => this.vehicleVoices.delete(reservation));
    }
  }

  _cueBuffer(id) {
    const buffers = this.cueBuffers[bank(id)?.buffersFrom || id];
    if (!Array.isArray(buffers)) return buffers;
    const index = this.cueIndices.get(id) || 0;
    this.cueIndices.set(id, index + 1);
    return buffers[index % buffers.length];
  }

  _clearProjectiles() {
    for (const voice of this.projectileVoices.values()) voice.stop();
    this.projectileVoices.clear();
  }
  _clearArsenalFields() {
    for (const voice of this.arsenalFieldVoices.values()) voice.stop();
    this.arsenalFieldVoices.clear();
  }

  _updateArsenalFields(state, environment = {}) {
    if (!wastelandRulesActive(state) || !this.flags.enabled('arsenal') ||
        this.muted || state.paused ||
        !['racing', 'exploring'].includes(state.status)) {
      this._clearArsenalFields();
      return;
    }
    const nitroRuns = this.flags.enabled('arsenal-wave3') ? state.combat?.nitroRuns || [] : [];
    const active = new Set([...(state.combat?.flameBursts || []),
      ...(state.combat?.magnets || []), ...nitroRuns]);
    for (const [effect, voice] of this.arsenalFieldVoices)
      if (!active.has(effect)) {
        voice.stop();
        this.arsenalFieldVoices.delete(effect);
      }
    const listener = environment.listener, course = environment.course;
    if (!listener || !course || !this.context || this.context.state !== 'running') return;
    for (const run of nitroRuns) {
      const owner = actorForTarget({state}, run.ownerId);
      if (!owner) continue;
      const at = point({state, course}, owner), motion = velocity(owner, at);
      const position = {...at, vx: motion.x, vy: 0, vz: motion.z};
      let voice = this.arsenalFieldVoices.get(run);
      if (!voice) {
        const buffer = this._cueBuffer('weapon.nitro.loop');
        if (buffer) voice = this.mixer.playMoving('weapon.nitro.loop', buffer,
          position, listener, {loop: true});
        if (voice) this.arsenalFieldVoices.set(run, voice);
      }
      voice?.update(position, listener);
    }
  }

  _updateProjectiles(state, environment = {}) {
    if (
      !wastelandRulesActive(state) ||
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
    const mortarFlights = this.flags.enabled('arsenal') && this.flags.enabled('arsenal-wave3')
      ? (state.combat?.mortarShells || []).map(shell => {
        const t = clamp(shell.age / shell.lifetime, 0, 1);
        return {...shell, kind: 'mortar',
          x: shell.from.x + (shell.x - shell.from.x) * t,
          y: shell.from.y + (shell.y - shell.from.y) * t + 16 * t * (1 - t),
          z: shell.from.z + (shell.z - shell.from.z) * t,
          vx: (shell.x - shell.from.x) / shell.lifetime,
          vy: (shell.y - shell.from.y + 16 * (1 - 2 * t)) / shell.lifetime,
          vz: (shell.z - shell.from.z) / shell.lifetime};
      }) : [];
    for (const projectile of [...(state.combat?.projectiles || []), ...mortarFlights]) {
      const id = projectile.kind === 'mortar' ? 'weapon.mortar.whistle' : projectile.kind === 'rocket-pod'
        ? 'weapon.rockets.flight' : 'weapon.' + projectile.kind + '.flight';
      const cue = bank(id);
      if (!cue || !this.cueBuffers[id] ||
          (cue.flag && !this.flags.enabled(cue.flag))) continue;
      live.add(projectile.id);
      let voice = this.projectileVoices.get(projectile.id);
      if (!voice) {
        voice = this.mixer.playMoving(
          id,
          this._cueBuffer(id),
          projectile,
          listener,
          {loop: !!cue.loop},
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

  _clearGrandPrixVoices() {
    for (const voice of this.grandPrixVoices) voice.stop();
    this.grandPrixVoices.clear();
  }

  _syncGrandPrix(state) {
    const field = this.flags.enabled('grand-prix') && state?.mode === 'grandprix'
      ? state.field : null;
    const status = state?.status;
    if (field !== this.grandPrixField || !field || state?.paused || this.paused || this.muted ||
        !['countdown', 'racing', 'stage_result'].includes(status) ||
        (status === 'stage_result' && this.grandPrixStatus !== status))
      this._clearGrandPrixVoices();
    this.grandPrixField = field || null;
    this.grandPrixStatus = status;
    return field;
  }

  _grandPrixEvent(ev, state) {
    const field = this._syncGrandPrix(state);
    if (!field || !ev) return {active: false, finish: false};
    // FIELD owns race identity and emits synchronously. No audio key is written
    // into simulation state. Keep consumed keys through mute, pause and menu.
    let delivered = this.grandPrixDeliveries.get(field);
    if (!delivered) {
      delivered = {keys: new Set(), events: new WeakSet()};
      this.grandPrixDeliveries.set(field, delivered);
    }
    const finish = ev.stageResult === state.results && state.status === 'stage_result' &&
      ev.stageResult?.grandPrix === true && ev.stageResult.completed === true;
    const result = {active: true, finish};
    if (delivered.events.has(ev)) return result;
    delivered.events.add(ev);
    let key, cue;
    if (state.status === 'countdown' && !field.start.out &&
        Number.isInteger(ev.startLight) && ev.startLight >= 1 && ev.startLight <= 5 &&
        ev.startLight === field.start.lights) {
      key = 'light:' + ev.startLight;
      cue = 'race.start.light';
    } else if (state.status === 'racing' && ev.go && ev.lightsOut && field.start.out) {
      key = 'go';
      cue = 'race.start.go';
    } else if (state.status === 'racing' && ev.positionGain &&
        ev.positionGain.from === field.lastPosition && ev.positionGain.to === field.position &&
        ev.positionGain.to < ev.positionGain.from) {
      key = `position:${state.stageTimeSec}:${ev.positionGain.from}:${ev.positionGain.to}`;
      cue = 'race.position.gain';
    } else if (state.status === 'racing' && ev.finalLap && field.finalLap &&
        state.lapsTotal > 1 && state.completedLaps === state.lapsTotal - 1) {
      key = 'final';
      cue = 'race.lap.final';
    } else if (finish) {
      key = 'finish';
      cue = 'race.finish.flag';
    }
    if (!key || delivered.keys.has(key)) return result;
    delivered.keys.add(key);
    // A missed cue stays missed. Unlocking or resuming must not replay it.
    if (this.muted || this.paused || state.paused || this.context?.state !== 'running') return result;
    let voice;
    voice = this._playCue(cue, {onEnd: () => this.grandPrixVoices.delete(voice)});
    if (voice) this.grandPrixVoices.add(voice);
    return result;
  }

  _summitAttackEvent(ev, state, course) {
    if (!isSummitAttack(course?.def)) return false;
    const result=ev?.stageResult;
    if (!this.flags.enabled('summit-run') || state?.mode!=='timetrial' ||
        state.status!=='stage_result' || result!==state.results || result?.completed!==true) return true;
    const seen=this._summitAttackFinishes??=new WeakSet();
    if (seen.has(result)) return true;
    seen.add(result);
    if (this.muted || this.paused || state.paused || this.context?.state!=='running') return true;
    const epoch=this._snowmanAudioStage??0;
    const play=()=>{
      if (epoch!==(this._snowmanAudioStage??0) || this.muted || this.paused || state.paused ||
          this.context?.state!=='running' || !this.flags.enabled('summit-run') ||
          state.status!=='stage_result' || state.results!==result || !this.cueBuffers['race.finish.flag']) return;
      this._playCue('race.finish.flag',{summitAttack:true});
      if (['gold','silver','bronze'].includes(result.medal)) this._playCue('interface.win');
    };
    if (this.cueBuffers['race.finish.flag']) play();
    else this._loadCueBuffers({summitAttack:true}).then(play);
    return true;
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

  _playCue(id, { destination, scale = 1, onEnd = null, crewShock = false, summitAttack = false } = {}) {
    this._syncMixer();
    const def = bank(id);
    if (!def) throw Error('Unknown audio cue: ' + id);
    const admittedShock = crewShock === true &&
      ['weapon.tesla.charge', 'weapon.tesla.pulse'].includes(id) &&
      this.flags.enabled('warlord-cards') && this.flags.enabled('crew-gear');
    const admittedSnowman=id==='snowman.burst' && this.flags.enabled('snowmen');
    const admittedAvalanche=['avalanche.rumble','avalanche.slide'].includes(id) && this.flags.enabled('summit-run');
    const admittedAttack=id==='race.finish.flag' && summitAttack===true && this.flags.enabled('summit-run');
    if (def.flag && !this.flags.enabled(def.flag) && !admittedShock && !admittedSnowman && !admittedAvalanche && !admittedAttack && !(id==='yeti.roar'&&this.flags.enabled('yeti'))) return null;
    if (def.flag === 'arsenal-wave3' && !this.flags.enabled('arsenal')) return null;
    return this._runCue(
      id,
      () => {
        const buffer = this._cueBuffer(id);
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
    if (this.muted) this._snowmanAudioStage = (this._snowmanAudioStage ?? 0) + 1;
    try {
      localStorage.setItem('duel_audio_muted', String(this.muted));
    } catch (_) {}
    this._volume();
    if (this.muted) for (const voice of this.activeShots) this._stopShot(voice);
    if (this.muted) {
      this._clearTurbo();
      this._clearVehicleVoices();
      this._clearGrandPrixVoices();
      this.fightVoices.mute();
      this._stopHiddenRoadVoices();
      this._clearProjectiles();
      this._clearArsenalFields();
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
    if (this.paused) this._snowmanAudioStage = (this._snowmanAudioStage ?? 0) + 1;
    this._volume();
    if (this.paused) {
      for (const voice of this.activeShots) this._stopShot(voice);
      this.lastThrottle = 0;
      this.shiftStarted = this.shiftUntil = 0;
    }
    if (this.paused) {
      this._clearTurbo();
      this._clearVehicleVoices();
      this._clearGrandPrixVoices();
      this.fightVoices.clear();
      this._stopHiddenRoadVoices();
      this._clearProjectiles();
      this._clearArsenalFields();
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

  _clearTurbo() {
    this.turboLoop?.voice.stop();
    this.turboLoop = null;
    this.blowoffVoice?.stop();
    this.blowoffVoice = null;
    this.turboArmed = false;
  }

  _updateTurbo(st, running, load, throttle, t) {
    const enabled = this.carVoice.turbo && this.flags.enabled('nissan-skyline');
    if (!enabled || !running || this.muted || this.paused) {
      this._clearTurbo();
      return;
    }
    const def = bank('vehicle.turbo-whistle');
    if (load > .35 && throttle > .35 && !this.turboLoop) {
      const osc = this.context.createOscillator(), gain = this.context.createGain();
      osc.type = def.oscillator.type;
      gain.gain.value = 0;
      const voice = this._runCue('vehicle.turbo-whistle', () => {
        osc.connect(gain);
        this._connect(gain, this._cueOutput);
        osc._cueEnd = Infinity;
        osc.onended = () => { osc.disconnect(); this._disconnect(gain); };
        this._cueSources.push(osc);
        osc.start();
      });
      this.turboLoop = {osc, gain, voice};
    }
    if (this.turboLoop) {
      const {osc, gain} = this.turboLoop;
      osc.frequency.setTargetAtTime(def.oscillator.lowHz +
        clamp(st.revs, 0, 1) * (def.oscillator.highHz - def.oscillator.lowHz), t, .055);
      gain.gain.setTargetAtTime(def.volume * clamp((load - .35) / .65, 0, 1), t, .045);
      if (load <= .35 || throttle <= .35) {
        this.turboLoop.voice.stop();
        this.turboLoop = null;
      }
    }
    if (st.status === 'racing' || st.status === 'exploring') {
      if (throttle >= .7 && st.revs > .55) this.turboArmed = true;
      if (throttle < .2 && this.turboArmed && st.revs > .55 &&
          t >= (this.nextBlowoff || 0)) {
        this.blowoffVoice = this._playCue('vehicle.blowoff');
        this.nextBlowoff = t + 1.2;
      }
      if (throttle < .2) this.turboArmed = false;
    } else this.turboArmed = false;
  }

  update(st, environment = {}) {
    this._syncGrandPrix(st);
    this._syncMixer(st);
    this.updateFightVoices(st);
    this.updateHiddenRoad(st);
    this._updateProjectiles(st, environment);
    this._updateArsenalFields(st, environment);
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') { this._clearTurbo(); this._clearVehicleVoices(); return; }
    if (this.paused !== st.paused) this.setPaused(st.paused);
    const t = ctx.currentTime;
    const engineCutoff = cutoff => deepEngineCutoff(
      cutoff, environment.deepDepth, this.flags.enabled('the-deep'),
    );
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
      engineCutoff(Math.min(
        3000,
        (500 + rpm * 1700 + (throttleInput ? 600 : 0)) *
          voice.brightness *
          perspective.brightness,
      )),
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
    const tyreInput = st.tyreSlipRules === true && !st.onFoot && !st.knock && grounded
      ? tyreSlipRawSound(st.tyreSlip || 0) : 0;
    const previousTyreSlip = this.tyreSlipSmoothed || 0;
    this.tyreSlipSmoothed = previousTyreSlip + (tyreInput - previousTyreSlip) *
      (1 - Math.exp(-dt / (tyreInput > previousTyreSlip ? 0.045 : 0.12)));
    const slip = this.smoothedSlip,
      tyreLoopSlip = st.tyreSlipRules === true ? (st.onFoot || st.knock ? 0 : this.tyreSlipSmoothed) : slip,
      recordedSlip = clamp((tyreLoopSlip - 0.08) / 0.92, 0, 1),
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
        engineCutoff(Math.min(
          3400,
          (700 + rpm * 1300 + load * 1000) *
            voice.brightness *
            perspective.brightness,
        )),
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
      sample.body.filter.frequency.setTargetAtTime(
        engineCutoff(145 + rpm * 135), t, 0.1);
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
      sample.intake.filter.frequency.setTargetAtTime(
        engineCutoff(820 + rpm * 980), t, 0.09);
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
        engineCutoff((420 + rpm * 1150) * voice.brightness * perspective.brightness),
        t,
        0.07,
      );
      const coastVolume = (0.17 + rpm * 0.21) * Math.sqrt(1 - load);
      sample.gain.gain.setTargetAtTime(
        running ? coastVolume * shiftCut * voice.gain : 0,
        t,
        0.065,
      );
      sample.body.filter.frequency.setTargetAtTime(
        engineCutoff(130 + rpm * 110), t, 0.1);
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
        engineCutoff(Math.min(
          3400,
          (700 + rpm * 1300 + load * 1000) *
            voice.brightness *
            perspective.brightness,
        )),
        t,
        0.06,
      );
      const fallbackVolume = (0.26 + rpm * 0.15 + load * 0.16) * (1 - coverage);
      sample.gain.gain.setTargetAtTime(
        running ? fallbackVolume * shiftCut * voice.gain : 0,
        t,
        0.08,
      );
      sample.body.filter.frequency.setTargetAtTime(
        engineCutoff(145 + rpm * 135), t, 0.1);
      sample.body.gain.gain.setTargetAtTime(
        running
          ? fallbackVolume * voice.exhaust * perspective.exhaust * shiftCut
          : 0,
        t,
        0.09,
      );
      sample.intake.filter.frequency.setTargetAtTime(
        engineCutoff(820 + rpm * 980), t, 0.09);
      sample.intake.gain.gain.setTargetAtTime(
        running
          ? fallbackVolume * voice.intake * perspective.intake * load * shiftCut
          : 0,
        t,
        0.07,
      );
    }
    this._updateTurbo(st, running, load, throttle, t);
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
    this._updateMud(st, t, racing && grounded);
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
    this._updateVehicleVoices(st, environment);
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
    if (ev?.menu) { this._clearTurbo(); this._clearVehicleVoices(); }
    this.fightVoices.event(ev, state);
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
      this._clearTurbo();
      this.nextBlowoff = 0;
      this._clearVehicleVoices();
      this._snowmanAudioStage=(this._snowmanAudioStage ?? 0)+1;
      this._snowmanAudioHits=new Set();
      this._avalancheAudioHits=new Set();
      this._yetiAudioHits=new Set();
      this._clearProjectiles();
      this._clearArsenalFields();
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
    const grandPrix = this._grandPrixEvent(ev, state);
    const summitAttack=this._summitAttackEvent(ev,state,course);
    if (
      !this.context ||
      this.context.state !== 'running' ||
      this.muted ||
      this.paused ||
      !ev
    )
      return;
    this._syncMixer(state);
    if(ev.snowmanHit && state?.snowmenEnabled===true && this.flags.enabled('snowmen')){
      const hit=ev.snowmanHit, seen=this._snowmanAudioHits ??= new Set();
      if(typeof hit.id==='string' && !seen.has(hit.id) &&
        [hit.hitPosition?.x,hit.hitPosition?.y,hit.hitPosition?.z].every(Number.isFinite)){
        seen.add(hit.id);
        const stage=this._snowmanAudioStage ?? 0;
        const play=()=>{
          if(stage!==(this._snowmanAudioStage ?? 0) || this.muted || this.paused ||
            this.context?.state!=='running' || !this.flags.enabled('snowmen') ||
            !this.cueBuffers['snowman.burst'] || state.status!=='racing')return;
          const output=this._spatialOutput({combatHit:true,hitPosition:hit.hitPosition},state,course);
          const voice=this._playCue('snowman.burst',{destination:output.level,onEnd:output.disconnect});
          if(!voice)output.disconnect();
        };
        if(this.cueBuffers['snowman.burst'])play();
        else this._loadCueBuffers().then(play);
      }
    }
    if(ev.summitAvalanche && (course?.def.id==='summit-run'||isSummitAttack(course?.def)) && this.flags.enabled('summit-run')){
      const hit=ev.summitAvalanche,key=hit.id+':'+hit.phase,seen=this._avalancheAudioHits ??= new Set();
      const expected='avalanche.'+(hit.phase==='tell'?'rumble':'slide');
      if(['tell','slide'].includes(hit.phase) && hit.cue===expected && state?.avalanche?.id===hit.id &&
        [hit.point?.x,hit.point?.y,hit.point?.z].every(Number.isFinite) && !seen.has(key)){
        seen.add(key);const epoch=this._snowmanAudioStage??0;
        const play=()=>{
          if(epoch!==(this._snowmanAudioStage??0) || this.muted || this.paused || this.context?.state!=='running' ||
            !this.flags.enabled('summit-run') || !this.cueBuffers[hit.cue] || state.status!=='racing' ||
            state.avalanche?.id!==hit.id || state.avalanche.phase!==hit.phase)return;
          const output=this._spatialOutput({combatHit:true,hitPosition:hit.point},state,course);
          const voice=this._playCue(hit.cue,{destination:output.level,onEnd:output.disconnect});if(!voice)output.disconnect();
        };
        if(this.cueBuffers[hit.cue])play();else this._loadCueBuffers().then(play);
      }
    }
    if(ev.yetiSighting && state?.yeti?.seen===true && (course?.def.id==='summit-run'||isSummitAttack(course?.def)) &&
      this.flags.enabled('yeti') && this.flags.enabled('summit-run')){
      const hit=ev.yetiSighting,seen=this._yetiAudioHits??=new Set();
      if(hit.cue==='yeti.roar' && typeof hit.id==='string' && !seen.has(hit.id) &&
        [hit.point?.x,hit.point?.y,hit.point?.z].every(Number.isFinite)){
        seen.add(hit.id);const epoch=this._snowmanAudioStage??0;
        const play=()=>{
          if(epoch!==(this._snowmanAudioStage??0)||this.muted||this.paused||this.context?.state!=='running'||
            !this.flags.enabled('yeti')||!this.flags.enabled('summit-run')||!this.cueBuffers['yeti.roar']||state.status!=='racing')return;
          const output=this._spatialOutput({combatHit:true,hitPosition:hit.point},state,course);
          const voice=this._playCue('yeti.roar',{destination:output.level,onEnd:output.disconnect});if(!voice)output.disconnect();
        };
        if(this.cueBuffers['yeti.roar'])play();else this._loadCueBuffers().then(play);
      }
    }
    if (['pit.limiter','pit.wrench','pit.go'].includes(ev.pitCue)) this._playCue(ev.pitCue);
    const wastelandAudio =
      state?.mode === 'wasteland' &&
      Number.isFinite(state.maxArmor) &&
      state.maxArmor > 0;
    const recordedAudio = wastelandAudio && wastelandRulesActive(state);
    if (recordedAudio && this.flags.enabled('cpu-crews') &&
        (ev.cpuCrewExited || ev.cpuCrewEntered || ev.cpuCrewRespawned)) {
      const output = this._spatialOutput({hitPosition: ev.hitPosition, combatHit: true},
        state, course, this.buses.vehicle || this.buses.weapons);
      this._playCue('vehicle.landing', {scale: .25, destination: output.level,
        onEnd: output.disconnect});
    }
    if (recordedAudio && bank(ev.arsenalCue) && (
      (this.flags.enabled('arsenal') && ARSENAL_EVENT_CUES.has(ev.arsenalCue)) ||
      (this.flags.enabled('arsenal') && this.flags.enabled('arsenal-wave3') &&
        ARSENAL_WAVE_THREE_CUES.has(ev.arsenalCue)) ||
      (ev.warlordMove === true && ARSENAL_CORE_CUES.has(ev.arsenalCue)) ||
      (ev.crewShock === true && state?.wastelandGateDiscovered === true &&
        this.flags.enabled('warlord-cards') && this.flags.enabled('crew-gear') &&
        ['weapon.tesla.charge','weapon.tesla.pulse'].includes(ev.arsenalCue))
    )) {
      // One-shots use the native point; flight belongs to the moving voice map.
      // The flight event never starts a second overlapping source.
      const output = this._spatialOutput(
        {hitPosition: ev.hitPosition, combatHit: true}, state, course, this.buses.weapons,
      );
      const voice = this._playCue(ev.arsenalCue,
        {destination: output.level, onEnd: output.disconnect, ...(ev.crewShock ? {scale:.55,crewShock:state?.wastelandGateDiscovered===true} : {})});
      const field = ev.arsenalCue === 'weapon.flame.loop' ? ev.burst :
        ev.arsenalCue === 'weapon.magnet.hum' ? ev.magnet : null;
      if (field && voice) this.arsenalFieldVoices.set(field, voice);
    }
    if (ev.arsenalCue === 'weapon.flame.end' && ev.burst) {
      this.arsenalFieldVoices.get(ev.burst)?.stop();
      this.arsenalFieldVoices.delete(ev.burst);
    }
    if (ev.arsenalMagnetEnded) {
      for (const [effect, voice] of this.arsenalFieldVoices)
        if (effect.ownerId === ev.ownerId) {
          voice.stop();
          this.arsenalFieldVoices.delete(effect);
        }
    }
    if (recordedAudio && this.flags.enabled('crew-gear') && ev.crewGearCue) {
      const output = this._spatialOutput(
        {hitPosition: ev.hitPosition, combatHit: true}, state, course, this.buses.weapons,
      );
      this._playCue(ev.crewGearCue, {destination: output.level, onEnd: output.disconnect});
    }
    const boardingCue = BOARDING_CUES[ev.crewBoardingCue];
    if (recordedAudio && this.flags.enabled('crew-gear') && boardingCue) {
      const bus = ev.crewBoardingCue === 'crew.boarding.blast'
        ? this.buses.impacts || this.buses.weapons : this.buses.weapons;
      const output = this._spatialOutput(
        {hitPosition: ev.hitPosition, combatHit: true}, state, course, bus,
      );
      this._playCue(boardingCue, {destination: output.level, onEnd: output.disconnect});
    }
    if (ev.countdown && !grandPrix.active) this._playCue('interface.countdown');
    if (ev.go && !grandPrix.active) this._playCue('interface.go');
      if (state?.arena?.mode === 'convoy-raid' && this.flags.enabled('convoy-raid')) {
        if (ev.convoyWindow) this._playCue(ev.convoyWindow.soundCue);
        if (ev.arenaResult) this._playCue(ev.arenaResult.result.winnerId === 'player' ? 'interface.win' : 'interface.lose');
      }
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
    // A new medal or an earned car on the results screen (docs/EARNED_CARS.md 5.2).
    if (ev.medalEarned) this._playCue('interface.bonus');
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
    if (ev.escaped || (ev.stageResult?.won && !grandPrix.finish && !summitAttack) || (ev.complete && !summitAttack)) {
      this._playCue('interface.win');
    }
    if (!summitAttack && (ev.ticket || ev.gameover || (ev.stageResult?.won === false && !grandPrix.finish)))
      this._playCue('interface.lose');
    // These Arsenal launches already emit their own recorded native cue.
    if (ev.weaponFired && !['harpoon', 'caltrops', 'rockets',
      'flamethrower', 'magnet', 'mortar', 'tesla', 'decoy', 'nitro'].includes(ev.weaponFired)) {
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
      const repairPhase = ev.footRepairStarted ? 'start' : ev.footRepairCompleted ? 'complete' :
        ev.footRepairInterrupted ? 'interrupted' : null;
      if (repairPhase && ev.enemy && ev.hitPosition) {
        const output = this._spatialOutput({hitPosition: ev.hitPosition, combatHit: true},
          state, course, this.buses.vehicle || this.buses.weapons);
        this._playCue('repair.' + repairPhase, {destination: output.level, onEnd: output.disconnect});
      } else if (repairPhase) this._repairCue(repairPhase);
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
    if (ev.crash) this._lastCrashCueAt = this.context.currentTime;
    if (
      ev.vehicleSmash &&
      !(this.context.currentTime - (this._lastCrashCueAt ?? -Infinity) < 0.15)
    )
      this._smashImpact(ev, state, course);
    if (ev.salSaw?.position) {
      const output = this._spatialOutput(
        { hitPosition: ev.salSaw.position, combatHit: true },
        state,
        course,
      );
      this._playCue('arena.sal-saw', {
        destination: output.level,
        onEnd: output.disconnect,
      });
    }
    if (ev.arenaTell) {
      const output = this._spatialOutput(
        { hitPosition: ev.arenaTell.position, combatHit: true },
        state,
        course,
      );
      this._playCue(ev.arenaTell.cue || 'arena.tell', {
        destination: output.level,
        onEnd: output.disconnect,
      });
    }
    if (ev.warlordWindow?.open && ev.warlordWindow.soundCue)
      this._playCue(ev.warlordWindow.soundCue);
    if (state?.arena?.mode === 'bounty-hunt' && this.flags.enabled('bounty-hunt') &&
        (ev.arenaLoaded || ev.bountyMark)) this._playCue('arena.bounty-mark');
    if (state?.arena?.mode === 'ambush-alley' && this.flags.enabled('ambush-alley')) {
      if (ev.ambushWave) this._playCue('interface.go');
      if (ev.ambushWaveComplete) this._playCue('interface.bonus');
      if (ev.ambushFortHit?.source === 'ram')
        this._runCue('combat.hit', () => this._combatImpact(
          {...ev, combatHit: true, strength: ev.ambushFortHit.removed / 35,
            hitPosition: ev.ambushFortHit.hitPosition}, state, course));
      if (ev.arenaResult) this._playCue(ev.arenaResult.result.winnerId === 'player'
        ? 'interface.win' : 'interface.lose');
    }
    if (state?.arena?.mode === 'fuel-run' && this.flags.enabled('fuel-run')) {
      if (ev.arenaResult) this._playCue(ev.arenaResult.result.winnerId === 'player' ? 'interface.win' : 'interface.lose');
      if (ev.fuelPickup?.participantId === 'player') this._playCue('interface.bonus');
      if (ev.fuelDrop?.participantId === 'player') this._playCue('vehicle.landing');
      if (ev.fuelDelivery?.participantId === 'player') this._playCue('interface.go');
    }
    if (ev.arenaRespawn) this._playCue('arena.respawn');
    if (ev.arenaWreck?.creditedId === 'player')
      this._playCue('arena.wreck-credit');
    if (ev.muddyHollowSplash)
      this._playCue('world.muddy-hollow-splash', {
        scale: clamp(
          0.45 +
            Math.abs(Number(ev.muddyHollowSplash.speedMph) || 0) / 55 +
            (Number(ev.muddyHollowSplash.depth) || 0) * 0.3,
          0.45,
          1.6,
        ),
      });
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

  updateFightVoices(state) {
    this.fightVoices.update(state);
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
