// Keep the released compressor's quiet gain and timing. Only its loud peaks
// reach the final ceiling; oversampling limits the new harmonics before output.
// 0.8 leaves headroom for native resampling overshoot; the final path is
// measured for both sample and intersample peaks, not just the curve bound.
const KNEE = 0.65;
const CEILING = 0.8;
const WIDTH = 2 * (CEILING - KNEE);
const curve = new Float32Array(8193);
for (let index = 0; index < curve.length; index++) {
  const input = (index * 2) / (curve.length - 1) - 1;
  const magnitude = Math.abs(input);
  const excess = Math.min(WIDTH, Math.max(0, magnitude - KNEE));
  const limited = magnitude <= KNEE
    ? magnitude
    : KNEE + excess - (excess * excess) / (2 * WIDTH);
  curve[index] = Math.sign(input) * limited;
}

export function createAudioOutput(context, master) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 16;
  compressor.ratio.value = 4;
  const ceiling = context.createWaveShaper();
  ceiling.curve = curve;
  ceiling.oversample = '4x';
  master.connect(compressor);
  compressor.connect(ceiling);
  ceiling.connect(context.destination);
  return ceiling;
}
