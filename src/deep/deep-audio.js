// The Deep owns its buffers and voices. The App supplies the existing audio host.
import {SOUND_BANK} from '../sound-bank.js';

export const DEEP_CUE_IDS = Object.freeze([
  'deep.splash', 'deep.engine-muffle', 'deep.bubbles', 'deep.sand-land',
  'deep.logged', 'deep.pearl', 'deep.whale', 'deep.cave',
]);

// Wrap only the engine's existing low-pass targets; ordinary values stay exact.
export function deepEngineCutoff(cutoff, depth, enabled) {
  return enabled && Number.isFinite(depth) && depth > 0 ? Math.min(cutoff, 520) : cutoff;
}

export function createDeepAudio({audio}) {
  let zoneId = null, context = null, loading = null, disposed = false;
  let whaleAfter = 0, placeSound = null, seen = new WeakSet();
  let pendingEntry = null, latestState = {};
  let liftVoice = null;
  const buffers = new Map(), loops = new Map(), voices = new Set();
  const enabled = () => !disposed && audio.flags.enabled('the-deep');
  const audible = state => enabled() && !audio.muted && !audio.paused && !state?.paused &&
    audio.context?.state === 'running';

  function stopVoices() {
    pendingEntry = null;
    for (const voice of voices) voice.stop();
    voices.clear();
    loops.clear();
    liftVoice = null;
  }
  function stop() {
    stopVoices();
    zoneId = null;
    placeSound = null;
    whaleAfter = 0;
  }
  function load() {
    if (!enabled() || !audio.context) return Promise.resolve([]);
    if (context !== audio.context) {
      stopVoices();
      context = audio.context;
      buffers.clear();
      loading = null;
    }
    if (loading) return loading;
    const captured = context;
    loading = Promise.allSettled(DEEP_CUE_IDS.map(async id => {
      const response = await fetch('/assets/audio/' + SOUND_BANK[id].file);
      if (!response.ok) throw Error(`Deep cue unavailable: ${id}`);
      const buffer = await captured.decodeAudioData(await response.arrayBuffer());
      if (!disposed && context === captured) buffers.set(id, buffer);
    }));
    return loading;
  }
  // Like the helicopter's synthesized cues, each layer owns a source and gain.
  // Noise reuses the host's noise buffer; all layers join the existing mixer.
  function playLayers(id, seconds) {
    const ctx = audio.context, def = SOUND_BANK[id], bus = ctx.createGain(), nodes = [], sources = [];
    bus.gain.value = def.volume;
    audio._connect(bus, audio.mixer.output(id));
    for (const layer of def.layers) {
      const duration = seconds ?? layer.duration, at = ctx.currentTime + (layer.delay || 0);
      const end = at + duration, gain = ctx.createGain();
      const source = layer.kind === 'tone' ? ctx.createOscillator() : ctx.createBufferSource();
      let filter;
      if (layer.kind === 'tone') {
        source.type = layer.type;
        source.frequency.setValueAtTime(layer.frequency, at);
        if (layer.endFrequency) source.frequency.linearRampToValueAtTime(layer.endFrequency, end);
        source.connect(gain);
      } else {
        source.buffer = audio.noiseBuffer; source.loop = true;
        filter = ctx.createBiquadFilter(); filter.type = layer.type;
        filter.frequency.setValueAtTime(layer.frequency, at);
        filter.frequency.linearRampToValueAtTime(layer.endFrequency || layer.frequency, end);
        source.connect(filter); filter.connect(gain); nodes.push(filter);
      }
      gain.gain.setValueAtTime(0, at);
      const attack = layer.attack ? duration * layer.attack / layer.duration : .01;
      gain.gain.linearRampToValueAtTime(layer.volume, at + attack);
      gain.gain.linearRampToValueAtTime(0, end);
      gain.connect(bus); nodes.push(gain); sources.push(source);
      source.start(at); source.stop(end + .02);
    }
    let active = true, pending = sources.length;
    const voice = {get active() { return active; }, stop() {
      if (!active) return;
      active = false;
      bus.gain.cancelScheduledValues(ctx.currentTime);
      bus.gain.setTargetAtTime(0, ctx.currentTime, .008);
      for (const source of sources) try { source.stop(ctx.currentTime + .04); } catch { /* ended */ }
    }};
    voices.add(voice);
    const release = audio.mixer.track(id, voice);
    for (const source of sources) source.onended = () => {
      source.disconnect();
      if (--pending) return;
      active = false; release?.(); voices.delete(voice);
      for (const node of nodes) node.disconnect();
      audio.mixer.disconnect(bus); bus.disconnect();
    };
    return voice;
  }
  function play(id, {loop = false, scale = 1, seconds} = {}) {
    const buffer = buffers.get(id), ctx = audio.context;
    if (ctx !== context || !audible()) return null;
    if (SOUND_BANK[id]?.layers) return playLayers(id, seconds);
    if (!buffer) return null;
    const def = SOUND_BANK[id], source = ctx.createBufferSource(), gain = ctx.createGain();
    const mixer = audio.mixer;
    source.buffer = buffer;
    source.loop = loop;
    gain.gain.value = def.volume * scale;
    source.connect(gain);
    audio._connect(gain, audio.mixer.output(id));
    let active = true, release;
    const voice = {
      until: loop ? Infinity : ctx.currentTime + buffer.duration,
      get active() { return active; },
      stop() {
        if (!active) return;
        active = false;
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setTargetAtTime(0, ctx.currentTime, .008);
        try { source.stop(ctx.currentTime + .04); } catch { /* already ended */ }
      },
    };
    source.onended = () => {
      active = false;
      source.disconnect();
      mixer.disconnect(gain);
      gain.disconnect();
      release?.();
      voices.delete(voice);
    };
    voices.add(voice);
    source.start();
    release = mixer.track(id, voice);
    return voice;
  }
  function bed(id, wanted) {
    const voice = loops.get(id);
    if (!wanted) {
      voice?.stop();
      loops.delete(id);
    } else if (!voice) {
      const started = play(id, {loop: true});
      if (started) loops.set(id, started);
    }
    // A pool-evicted loop waits for the next pause/visit, avoiding frame churn.
  }
  function whale() {
    if (audio.context.currentTime < whaleAfter) return;
    const voice = play('deep.whale');
    if (voice) whaleAfter = audio.context.currentTime + 30;
  }
  function event(ev, state = {}) {
    if (!ev || typeof ev !== 'object' || disposed || seen.has(ev)) return;
    seen.add(ev);
    latestState = state;
    if (ev.deepExited || ev.menu || ev.stageLoaded != null || ev.arenaLoaded != null) {
      stop();
      // Keep this exit delivered even if the same object is presented again.
      seen.add(ev);
      return;
    }
    if (!enabled()) { stop(); return; }
    if (ev.deepEntered?.zoneId) {
      if (zoneId === ev.deepEntered.zoneId) return;
      stopVoices();
      zoneId = ev.deepEntered.zoneId;
      placeSound = null;
      whaleAfter = 0;
      const ready = load();
      if (audible(state)) {
        const missing = ['deep.splash', 'deep.engine-muffle'].filter(id => !play(id));
        if (missing.length) {
          const entry = {zoneId, context};
          pendingEntry = entry;
          void ready.then(() => {
            if (pendingEntry !== entry) return;
            pendingEntry = null;
            if (zoneId !== entry.zoneId || audio.context !== entry.context || !audible(latestState)) return;
            for (const id of missing) play(id);
          });
        }
      }
    }
    if (!zoneId) return;
    if (ev.deepPlace) {
      const sound = ev.deepPlace.place?.sound;
      placeSound = sound === 'deep.cave' || sound === 'deep.whale' ? sound : null;
    }
    if (!audible(state)) return;
    if (ev.deepSonar) play('deep.sonar');
    if (ev.deepLift) {
      liftVoice?.stop();
      liftVoice = play('deep.liftbag', {seconds: ev.deepLift.seconds});
    }
    if (ev.deepLiftCancel || ev.deepRaised) { liftVoice?.stop(); liftVoice = null; }
    if (ev.deepLiftCancel) play('deep.lift-cancel');
    if (ev.deepRaised) play('deep.raised');
    if (ev.deepLanded) play('deep.sand-land');
    if (ev.deepLogged || ev.deepObjective) play('deep.logged'); // DEEP-EXPLORER: checklist tick
    if (ev.deepPearl) play('deep.pearl');
    if (ev.deepPlace && placeSound === 'deep.whale') whale();
  }
  function update(state = {}, environment = {}) {
    if (disposed) return;
    latestState = state;
    if (!enabled() || state.status === 'menu') { stop(); return; }
    // Preload on the submerged ramp, before the Deep-entered event.
    if (Number.isFinite(environment.deepDepth) && environment.deepDepth > 0) void load();
    if (!zoneId || state.status !== 'exploring' || !audible(state)) {
      stopVoices();
      return;
    }
    void load();
    bed('deep.bubbles', true);
    bed('deep.cave', placeSound === 'deep.cave');
  }
  return {load, event, update, stop, dispose() { stop(); disposed = true; buffers.clear(); }};
}
