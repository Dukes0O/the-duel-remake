// How big the solid kit pieces are, in metres (the sizes in
// public/assets/models/circuits/kits/manifest.json; tools/test-circuit-ground.mjs
// keeps them equal). A circuit marks a piece in its `kitPlacements` with
// `solid: true` and src/track-script-course.js turns it into a box a car hits:
// `width` along the piece's own x axis, `height` up, `depth` through it.
export const KIT_FOOTPRINTS = Object.freeze({
  'armco-white': { width: 4, height: .85, depth: .349 },
  'stone-retaining-wall': { width: 4, height: 2.54, depth: .796 },
  'drystone-wall': { width: 4, height: 1.347, depth: 0.691 },
  'hedge-row': { width: 4, height: 1.767, depth: 0.906 },
  'armco': { width: 4, height: .85, depth: .349 },
  'tyre-wall': { width: 4, height: 1, depth: .8 },
  'catch-fence': { width: 4, height: 3.7, depth: .38 },
  'concrete-wall': { width: 4, height: 1.05, depth: .72 },
  'pit-wall': { width: 4, height: 1.68, depth: .605 },
  'pit-garage': { width: 7.005, height: 5.2, depth: 8.02 },
  'grandstand': { width: 12, height: 8, depth: 8 },
  'marshal-post': { width: 2.5, height: 3.2, depth: 2.2 },
  'chairlift-tower': { width: 4, height: 10, depth: 1.5 },
});
