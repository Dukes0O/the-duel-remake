// The instructor's radio (docs/DRIVING_LESSONS.md section 2): Brian's voice
// and the radio filter, chain, click and hiss, shared by the helicopter's
// lessons (docs/HELICOPTER.md section 7) and driving lessons. Sound only:
// nothing here changes a race or a flight.

// The instructor's stock voice.
export const HELI_RADIO_VOICE = Object.freeze({name: 'Brian', voiceId: 'nPczCjzI2devNBz1zQrb'});

// The radio filter (docs/HELICOPTER.md section 7): band-pass 300 to 3,000 Hz, a soft clip for
// crackle, a faint hiss under the voice and a click when the radio keys on and off.
export const RADIO_FILTER = Object.freeze({highpass: 300, lowpass: 3000, drive: 2.5, hiss: .03, clickMs: 14});

// A soft clip: smooth, odd (the same for both swings), bounded by 1 and rising
// all the way, so loud peaks round off instead of cutting flat.
export function softClipCurve(count = 1024, drive = RADIO_FILTER.drive) {
  const curve = new Float32Array(Math.max(3, Math.floor(count)));
  const top = Math.tanh(drive);
  for (let index = 0; index < curve.length; index++) {
    const input = 2 * index / (curve.length - 1) - 1;
    curve[index] = Math.tanh(drive * input) / top;
  }
  return curve;
}

// Plain repeatable noise, so nothing about the radio depends on chance.
function noiseBuffer(context, seconds) {
  const rate = context.sampleRate || 48000, buffer = context.createBuffer(1, Math.max(8, Math.round(rate * seconds)), rate);
  const data = buffer.getChannelData(0);
  let seed = 22695477;
  for (let index = 0; index < data.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    data[index] = seed / 2147483648 - 1;
  }
  return buffer;
}

// input -> high-pass 300 -> low-pass 3,000 -> soft clip -> output. The hiss and
// the clicks join after the clip. keyOn and keyOff are the press and release.
export function createRadioChain(context, destination, filter = RADIO_FILTER) {
  const input = context.createGain(), output = context.createGain();
  const high = context.createBiquadFilter(), low = context.createBiquadFilter(), clip = context.createWaveShaper();
  high.type = 'highpass'; high.frequency.value = filter.highpass; high.Q.value = .7;
  low.type = 'lowpass'; low.frequency.value = filter.lowpass; low.Q.value = .7;
  clip.curve = softClipCurve(1024, filter.drive);
  output.gain.value = 1.3;
  input.connect(high); high.connect(low); low.connect(clip); clip.connect(output); output.connect(destination);
  const hissGain = context.createGain(), hissFilter = context.createBiquadFilter();
  hissGain.gain.value = 0;
  hissFilter.type = 'bandpass'; hissFilter.frequency.value = 3200; hissFilter.Q.value = .6;
  hissFilter.connect(hissGain); hissGain.connect(output);
  const hissBuffer = noiseBuffer(context, 2), clickBuffer = noiseBuffer(context, .05);
  const live = new Set();
  let hiss = null, keyed = false, disposed = false;

  function stopSource(source, when = 0) {
    try { source.stop(when); } catch { /* already ended */ }
  }
  function click() {
    const source = context.createBufferSource(), shape = context.createBiquadFilter(), level = context.createGain();
    const now = context.currentTime, length = filter.clickMs / 1000;
    source.buffer = clickBuffer;
    shape.type = 'bandpass'; shape.frequency.value = 1800; shape.Q.value = .8;
    level.gain.setValueAtTime(.4, now);
    level.gain.linearRampToValueAtTime(0, now + length);
    source.connect(shape); shape.connect(level); level.connect(output);
    live.add(source);
    source.onended = () => { live.delete(source); source.disconnect(); shape.disconnect(); level.disconnect(); };
    source.start(now);
    stopSource(source, now + length + .01);
  }
  function keyOn() {
    if (disposed || keyed) return false;
    keyed = true;
    click();
    const source = context.createBufferSource(), now = context.currentTime;
    source.buffer = hissBuffer;
    source.loop = true;
    source.connect(hissFilter);
    hiss = source;
    live.add(source);
    source.start(now);
    hissGain.gain.cancelScheduledValues(now);
    hissGain.gain.setValueAtTime(0, now);
    hissGain.gain.linearRampToValueAtTime(filter.hiss, now + .04);
    return true;
  }
  function keyOff() {
    if (disposed || !keyed) return false;
    keyed = false;
    click();
    const now = context.currentTime, source = hiss;
    hiss = null;
    hissGain.gain.cancelScheduledValues(now);
    hissGain.gain.setValueAtTime(filter.hiss, now);
    hissGain.gain.linearRampToValueAtTime(0, now + .08);
    if (source) {
      source.onended = () => { live.delete(source); source.disconnect(); };
      stopSource(source, now + .1);
    }
    return true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    keyed = false;
    for (const source of live) stopSource(source);
    live.clear();
    for (const node of [input, high, low, clip, output, hissGain, hissFilter]) node.disconnect();
  }
  return {input, output, keyOn, keyOff, dispose, get keyed() { return keyed; }};
}
