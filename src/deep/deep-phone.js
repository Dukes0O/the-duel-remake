// Ana's through-water phone (docs/THE_DEEP.md section 6.7): the helicopter's
// radio chain (src/lessons/radio-voice.js) with a slow warble, a pitch wobble
// of about 0.3% at about 2 Hz, and a soft bubble bed under the voice, so the
// speech sounds carried through water. Sound only: nothing here changes a race.
import {RADIO_FILTER, createRadioChain} from '../lessons/radio-voice.js';

// The phone's filter: the radio's, a little duller and with less hiss.
export const DEEP_PHONE_FILTER = Object.freeze({...RADIO_FILTER, lowpass: 2600, hiss: .02});

// The warble: a short delay whose time swings slowly. A delay of D + A*sin(2*pi*f*t)
// changes the pitch by 2*pi*f*A at its steepest, so a pitch wobble of `depth` at
// `hz` needs a swing of depth / (2*pi*hz) seconds.
export const DEEP_PHONE_WARBLE = Object.freeze({hz: 2, depth: .003, baseDelay: .006});
export const warbleSwingSeconds = (warble = DEEP_PHONE_WARBLE) => warble.depth / (2 * Math.PI * warble.hz);

// The bubble bed: seeded little rising "bloops" (a sine whose pitch climbs while it
// dies away), spread at random, wrapped round the end so the loop has no seam.
// Repeatable from the seed, like the radio's hiss; the peak is exactly 1.
export const DEEP_PHONE_BED = Object.freeze({seconds: 4, perSecond: 7, level: .07, seed: 1966});

export function bubbleBedSamples(rate = 48000, {seconds, perSecond, seed} = DEEP_PHONE_BED) {
  const length = Math.max(8, Math.round(rate * seconds)), data = new Float32Array(length);
  let state = seed >>> 0;
  const next = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const count = Math.round(seconds * perSecond);
  for (let bubble = 0; bubble < count; bubble++) {
    const start = Math.floor(next() * length), base = 350 + next() * 1050, rise = 1.5 + next() * 2.5;
    const tau = .012 + next() * .02, loud = .25 + next() * .75, span = Math.floor(rate * tau * 6);
    let phase = 0;
    for (let index = 0; index < span; index++) {
      const time = index / rate;
      phase += 2 * Math.PI * base * (1 + rise * time / tau * .15) / rate;
      data[(start + index) % length] += Math.sin(phase) * Math.exp(-time / tau) * loud * Math.min(1, index / (rate * .002));
    }
  }
  let peak = 0;
  for (const value of data) peak = Math.max(peak, Math.abs(value));
  if (peak > 0) for (let index = 0; index < length; index++) data[index] /= peak;
  return data;
}

// input -> warble -> radio chain -> destination, with the bubble bed joining
// the chain beside the voice, so it is filtered and clipped with it.
// keyOn and keyOff are the press and release, like the radio's.
export function createDeepPhoneChain(context, destination, {filter = DEEP_PHONE_FILTER, warble = DEEP_PHONE_WARBLE, bed = DEEP_PHONE_BED} = {}) {
  const radio = createRadioChain(context, destination, filter);
  const input = context.createGain(), delay = context.createDelay(.05);
  delay.delayTime.value = warble.baseDelay;
  input.connect(delay); delay.connect(radio.input);
  const lfo = context.createOscillator(), swing = context.createGain();
  lfo.type = 'sine'; lfo.frequency.value = warble.hz;
  swing.gain.value = warbleSwingSeconds(warble);
  lfo.connect(swing); swing.connect(delay.delayTime);
  lfo.start();
  const bedGain = context.createGain();
  bedGain.gain.value = 0;
  bedGain.connect(radio.input);
  const rate = context.sampleRate || 48000, bedBuffer = context.createBuffer(1, Math.max(8, Math.round(rate * bed.seconds)), rate);
  bedBuffer.getChannelData(0).set(bubbleBedSamples(rate, bed));
  let bubbles = null, disposed = false;

  function keyOn() {
    if (disposed || !radio.keyOn()) return false;
    const now = context.currentTime, source = context.createBufferSource();
    source.buffer = bedBuffer;
    source.loop = true;
    source.connect(bedGain);
    bubbles = source;
    source.start(now);
    bedGain.gain.cancelScheduledValues(now);
    bedGain.gain.setValueAtTime(0, now);
    bedGain.gain.linearRampToValueAtTime(bed.level, now + .12);
    return true;
  }
  function keyOff() {
    if (disposed || !radio.keyOff()) return false;
    const now = context.currentTime, source = bubbles;
    bubbles = null;
    bedGain.gain.cancelScheduledValues(now);
    bedGain.gain.setValueAtTime(bed.level, now);
    bedGain.gain.linearRampToValueAtTime(0, now + .2);
    if (source) {
      source.onended = () => source.disconnect();
      try { source.stop(now + .22); } catch { /* already ended */ }
    }
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (bubbles) try { bubbles.stop(); } catch { /* already ended */ }
    try { lfo.stop(); } catch { /* already ended */ }
    radio.dispose();
    for (const node of [input, delay, lfo, swing, bedGain]) node.disconnect();
  }
  return {input, output: radio.output, keyOn, keyOff, dispose, get keyed() { return radio.keyed; }};
}
