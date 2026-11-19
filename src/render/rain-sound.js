// FAR-RAIN: the sound `far.rain`, light to heavy. Drawn in code from noise until a recording is chosen: a hiss of the
// rain falling all round, a low body of it on the roof and the ground, and one short tick for each drop that lands on
// the glass, so the first drop is heard as well as seen. It plays on the game's ambience bus, so mute and pause
// silence it like every other sound. It reads no race state.
import {makeRng} from '../rng.js';
import {RAIN_LOOK} from './rain-look.js';

export const RAIN_SOUND_CUE = RAIN_LOOK.sound.cue;

export function createRainSound(look = RAIN_LOOK.sound) {
  let audio = null, nodes = null, tickTimes = [], level = 0;
  const rng = makeRng(0x7261696e);
  const ready = () => audio?.context && audio.context.state === 'running' && !audio.muted && !audio.paused;
  function build() {
    const ctx = audio.context, out = audio.buses?.ambience ?? audio.master;
    if (!out) return null;
    const length = Math.floor(ctx.sampleRate * 2.4), buffer = ctx.createBuffer(1, length, ctx.sampleRate), data = buffer.getChannelData(0);
    // Pinkish noise: rain is broad, with less at the top than white noise has.
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = rng.float() * 2 - 1;
      b0 = .99765 * b0 + white * .099; b1 = .963 * b1 + white * .2965; b2 = .57 * b2 + white * 1.0526;
      data[i] = (b0 + b1 + b2 + white * .1848) * .2;
    }
    const layer = (type, frequency, q) => {
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = buffer; source.loop = true; source.loopStart = rng.float() * 1.2; source.loopEnd = length / ctx.sampleRate;
      filter.type = type; filter.frequency.value = frequency; filter.Q.value = q; gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(out); source.start(ctx.currentTime, source.loopStart);
      return {source, filter, gain};
    };
    return {buffer, out, hiss: layer('bandpass', look.hiss.frequency, look.hiss.q), body: layer('lowpass', look.body.frequency, look.body.q)};
  }
  return {
    get level() { return level; },
    // `level`: 0 to 1, how far the rain has come. `inside`: the driver's seat. `sheltered`: under cover.
    update({audio: engine, level: next = 0, inside = false, sheltered = false} = {}) {
      if (engine !== audio) { this.dispose(); audio = engine ?? null; }
      level = next;
      if (!ready()) return;
      nodes ??= build();
      if (!nodes) return;
      const t = audio.context.currentTime, cover = sheltered ? look.shelterShare : 1;
      nodes.hiss.gain.gain.setTargetAtTime(look.hiss.gain * Math.pow(level, 1.4) * cover, t, look.smoothing);
      nodes.body.gain.gain.setTargetAtTime(look.body.gain * level * (inside ? 1 : .7) * cover, t, look.smoothing);
    },
    // One drop on the glass. `size`: 0 to 1.
    tick({size = .5, inside = true} = {}) {
      if (!ready() || !nodes) return false;
      const ctx = audio.context, now = ctx.currentTime;
      tickTimes = tickTimes.filter(time => now - time < 1);
      if (tickTimes.length >= look.tick.perSecond) return false;
      tickTimes.push(now);
      const [low, high] = look.tick.frequency, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      source.buffer = nodes.buffer;
      filter.type = 'bandpass'; filter.Q.value = 1.4;
      filter.frequency.value = high - (high - low) * Math.min(1, Math.max(0, size)) * (.6 + rng.float() * .4);
      const peak = look.tick.gain * (.4 + .6 * size) * (inside ? 1 : look.outsideShare);
      gain.gain.setValueAtTime(peak, now); gain.gain.exponentialRampToValueAtTime(.0001, now + look.tick.seconds);
      source.connect(filter); filter.connect(gain); gain.connect(nodes.out);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      source.start(now, rng.float() * 2); source.stop(now + look.tick.seconds + .01);
      return true;
    },
    dispose() {
      if (nodes) for (const layer of [nodes.hiss, nodes.body]) {
        try { layer.source.stop(); } catch {}
        layer.source.disconnect(); layer.filter.disconnect(); layer.gain.disconnect();
      }
      nodes = null; tickTimes = [];
    },
  };
}
