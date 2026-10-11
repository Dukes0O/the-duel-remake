// Keep quiet gain exact while giving sustained backgrounds transient headroom.
// The native crash capture must certify sample and reconstructed peaks after
// 4x resampling; the curve bound alone is not the final-output ceiling.
const QUIET = .25;
const TAPER_END = .41;
const BED_CREST = .33;
const IMPACT_START = .65;
const CEILING = .70;
const curve = new Float32Array(8193);
for (let index = 0; index < curve.length; index++) {
  const input = (index * 2) / (curve.length - 1) - 1;
  const magnitude = Math.abs(input);
  let limited;
  if (magnitude <= QUIET) limited = magnitude;
  else if (magnitude < TAPER_END) {
    const excess = magnitude - QUIET;
    limited = QUIET + excess - excess * excess / (2 * (TAPER_END - QUIET));
  } else if (magnitude <= IMPACT_START) limited = BED_CREST;
  else {
    const blend = (magnitude - IMPACT_START) / (1 - IMPACT_START);
    limited = BED_CREST + (CEILING - BED_CREST) * blend * blend * (3 - 2 * blend);
  }
  curve[index] = Math.sign(input) * limited;
}

export function createAudioOutput(context, master) {
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.attack.value = 0.003;
  compressor.knee.value = 16;
  compressor.ratio.value = 4;
  const ceiling = context.createWaveShaper();
  ceiling.curve = curve;
  ceiling.oversample = '4x';
  master.connect(compressor);
  const raceLevel = context.createGain();
  raceLevel.gain.value = 10 ** (6.4 / 20);
  compressor.connect(raceLevel);
  raceLevel.connect(ceiling);
  ceiling.connect(context.destination);
  return ceiling;
}
