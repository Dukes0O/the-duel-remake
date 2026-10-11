// How much the underwater look draws on each quality setting. Numbers only.
// High matches the game's High (post-processing, sharp shadows, edge smoothing);
// Performance matches its direct, lighter path. Every count is a hard cap.
export const LOOK_QUALITY = Object.freeze({
  high: Object.freeze({
    pipeline: 'composite', shadowSize: 2048, pixelRatioMax: 1.6,
    snowSpecks: 1400, lightShafts: 34, kelpStems: 560, seagrassTufts: 1700, rocks: 90, fish: 480,
    kelpBlades: 'full', kelpDistance: 150, shadowKelp: true, bloom: true,
  }),
  performance: Object.freeze({
    pipeline: 'direct', shadowSize: 1024, pixelRatioMax: 1,
    snowSpecks: 650, lightShafts: 18, kelpStems: 380, seagrassTufts: 1000, rocks: 60, fish: 320,
    kelpBlades: 'light', kelpDistance: 110, shadowKelp: false, bloom: false,
  }),
});

export function lookQuality(name) {
  return Object.hasOwn(LOOK_QUALITY, name) ? LOOK_QUALITY[name] : LOOK_QUALITY.high;
}
