// The concrete plant's sounds, played through the game's own mixer.
// Running machines are held tones; single events are short tones, each limited on its own.

/** Cue name to frequency, waveform and length in seconds. */
export const PLANT_TONES = Object.freeze({
  'plant.crusher':[58, 'sawtooth', 0], 'plant.belt':[96, 'triangle', 0], 'plant.drum':[70, 'triangle', 0],
  'plant.jaw':[140, 'square', 0.08], 'plant.gravel':[420, 'square', 0.05], 'plant.hopper':[90, 'sawtooth', 0.35],
  'plant.scoop':[160, 'sawtooth', 0.12], 'plant.bucket-tip':[230, 'square', 0.18], 'plant.batch':[120, 'triangle', 0.2],
  'plant.pour':[200, 'triangle', 0.15], 'plant.set':[520, 'sine', 0.6], 'plant.refuse':[180, 'triangle', 0.25],
});
const LOOPS = Object.freeze({'plant.crusher':0.035, 'plant.belt':0.018, 'plant.drum':0.025});
const GAPS = Object.freeze({'plant.jaw':0.32, 'plant.gravel':0.18, 'plant.scoop':0.3, 'plant.bucket-tip':0.4,
  'plant.batch':0.6, 'plant.pour':0.45, 'plant.refuse':1.5});

export function createPlantSounds(audio) {
  const loops = new Map(), next = new Map(), seen = new Map(), voices = new Set();
  const ready = () => {
    const ctx = audio?.context;
    return ctx && audio.master && !audio.muted && !audio.paused && ctx.state === 'running' ? ctx : null;
  };
  function stopLoop(cue) {
    const voice = loops.get(cue);
    if (!voice) return;
    loops.delete(cue);
    voice.oscillator.stop();
  }
  function hold(cue, on, nearness = 1) {
    const ctx = ready();
    if (!ctx || !on) { stopLoop(cue); return; }
    if (loops.has(cue)) { loops.get(cue).gain.gain.setValueAtTime(LOOPS[cue] * nearness, ctx.currentTime); return; }
    const [frequency, waveform] = PLANT_TONES[cue];
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(LOOPS[cue] * nearness, ctx.currentTime);
    oscillator.connect(gain); gain.connect(audio.master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start();
    loops.set(cue, {oscillator, gain});
  }
  function play(cue) {
    const spec = PLANT_TONES[cue], ctx = ready();
    if (!spec || !ctx || LOOPS[cue]) return;
    const now = ctx.currentTime;
    if (now < (next.get(cue) ?? 0)) return;
    next.set(cue, now + (GAPS[cue] ?? 0.3));
    const [frequency, waveform, duration] = spec;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
    oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now); oscillator.stop(now + duration);
  }
  return {
    /** Hold the running machines' tones while their events arrive, and play the rest once. */
    update(events, nearness = 1) {
      const cues = new Set(events.map(event => event.cue).filter(cue => cue?.startsWith('plant.')));
      // A frame can pass without a simulation step, so a running tone is held briefly between events.
      const now = audio?.context?.currentTime ?? 0;
      for (const cue of Object.keys(LOOPS)) {
        if (cues.has(cue)) seen.set(cue, now);
        hold(cue, now - (seen.get(cue) ?? -Infinity) < 0.25, cue === 'plant.drum' ? 1 : nearness);
      }
      for (const cue of cues) play(cue);
    },
    dispose() {
      for (const cue of [...loops.keys()]) stopLoop(cue);
      for (const voice of voices) voice.stop();
      voices.clear();
    },
  };
}
