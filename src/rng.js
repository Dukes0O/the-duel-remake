// rng.js — deterministic seedable RNG (mulberry32), seeded from ?seed=N.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    float: next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    range: (min, max) => min + next() * (max - min),
  };
}

export function seedFromUrl(defaultSeed = 1989) {
  if (typeof window === 'undefined') return defaultSeed;
  const p = new URLSearchParams(window.location.search);
  const s = p.get('seed');
  return s != null ? (parseInt(s, 10) >>> 0) : defaultSeed;
}
