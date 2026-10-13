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
  const buffers = new Map(), loops = new Map(), voices = new Set();
  const enabled = () => !disposed && audio.flags.enabled('the-deep');
  const audible = state => enabled() && !audio.muted && !audio.paused && !state?.paused &&
    audio.context?.state === 'running';

  function stopVoices() {
    pendingEntry = null;
    for (const voice of voices) voice.stop();
    voices.clear();
    loops.clear();
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
  function play(id, {loop = false, scale = 1} = {}) {
    const buffer = buffers.get(id), ctx = audio.context;
    if (!buffer || ctx !== context || !audible()) return null;
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
    if (ev.deepLanded) play('deep.sand-land');
    if (ev.deepLogged) play('deep.logged');
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
