// A full coat takes 12 km on a road, or 4 km across country.
export function dirtAfter(dirt, metres, ground, onRoad) {
  const dust = Math.max(0, metres) * (onRoad ? 1 : 3) / 12000;
  return Math.min(1, Math.max(0, dirt + dust + (ground === 'ash-hit' ? .35 : 0)));
}
