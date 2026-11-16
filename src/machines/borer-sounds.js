// The head and conveyor run continuously while the machine is working.
const TONES = Object.freeze({
  'borer.stall':[85, 'square', 0.4],
  'borer.call':[260, 'triangle', 0.6],
  'borer.refuse':[180, 'triangle', 0.25],
  'borer.breakthrough':[460, 'triangle', 0.45],
  'borer.daylight':[360, 'triangle', 0.8],
});

export function createBorerSounds(audio) {
  const loops = new Map(), voices = new Set();
  function stopLoop(name) {
    const voice = loops.get(name);
    if (!voice) return;
    loops.delete(name);
    voice.oscillator.stop();
  }
  function loop(name, frequency, volume, waveform) {
    const ctx = audio?.context;
    if (!ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running' || volume <= 0) {
      stopLoop(name);
      return;
    }
    let voice = loops.get(name);
    if (!voice) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = waveform;
      oscillator.connect(gain); gain.connect(audio.master);
      voice = {oscillator, gain}; loops.set(name, voice);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start();
    }
    voice.oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    voice.gain.gain.setValueAtTime(volume, ctx.currentTime);
  }
  return {
    update(headSpeed, movingMuck) {
      const speed = Math.max(0, Math.min(1, Number.isFinite(headSpeed) ? headSpeed : 0));
      loop('borer.head', 55 + speed * 105, speed > 0 ? 0.035 : 0, 'sawtooth');
      loop('borer.muck', 65, movingMuck ? 0.025 : 0, 'triangle');
    },
    play(cue) {
      const spec = TONES[cue], ctx = audio?.context;
      if (!spec || !ctx || !audio.master || audio.muted || audio.paused || ctx.state !== 'running') return;
      const [frequency, waveform, duration] = spec, now = ctx.currentTime;
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = waveform; oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain); gain.connect(audio.master); voices.add(oscillator);
      oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now); oscillator.stop(now + duration);
    },
    dispose() {
      for (const name of [...loops.keys()]) stopLoop(name);
      for (const voice of voices) voice.stop();
      voices.clear();
    },
  };
}
