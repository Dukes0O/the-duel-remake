// Engineer notes for Neon Drift Trial (Claude's finishing pass, P4-FINISH-TEAMROOM). The lap is four right-hand
// corners of the same shape joined by straights. Drift points come from the scoring rules in drift-scoring.js: a
// slide builds points and a bigger multiplier for as long as it lasts, a straight stretch banks them, and a hit,
// a spin or leaving the road loses the points not yet banked. Midnight Muscle Chase runs the same road and has
// its own notes in midnight-chase.js. No brake boards stand on this road.
export const NEON_DRIFT_TRIAL_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 520, title: 'Neon District corner', camera: {back: 70, ahead: 140}},
    {id: 'overtaking', kind: 'overtaking', s: 1285, title: 'Straight into Corner 2'},
  ],
  notes: {
    c1: {line: 'Turn in with speed, start the slide before the apex and hold it through the exit.',
      note: 'The first of four right-handers. Points build while you slide, and a hit, a spin or leaving the road loses them.'},
    c2: {line: 'Brake on the straight, then start the slide early and keep it going to the exit.',
      note: 'The corner is long enough to build the full multiplier, but only if the slide starts early and does not stop.'},
    c3: {line: 'Turn in with speed, start the slide before the apex and hold it through the exit.',
      note: 'The straights bank your points, so each corner starts again from a multiplier of one. Make each one count.'},
    c4: {line: 'Start the slide early, hold it to the exit and keep it clean.',
      note: 'The last corner, with the finish line 75 metres beyond the apex. Do not spin or touch anything this close to the end.'},
    signature: {line: 'Turn in with speed, start the slide before the apex and hold it through the exit.',
      note: 'Corner 1 from further back, so you can see the road that follows it. All four corners are the same shape.'},
    overtaking: {line: 'Stay flat out down the straight and brake in a straight line.',
      note: 'The longest straight on the lap, about 680 metres. There is no one to pass in the trial; use the straight to bank your points and get set for Corner 2.'},
  },
});
