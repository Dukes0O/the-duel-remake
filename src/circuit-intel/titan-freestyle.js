// Engineer notes for Titan Freestyle Playground (Claude's finishing pass, P4-FINISH-TEAMROOM). It is a quarry
// with no rivals and no timer. The three jumps are named after the mounds in freestyle-course.js and get bigger
// along the lap. No brake boards stand in the quarry.
export const TITAN_FREESTYLE_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 180, title: 'Warm-up jump'},
    {id: 'crest-2', kind: 'crest', s: 460, title: 'Cross-table jump'},
    {id: 'crest-3', kind: 'crest', s: 770, title: 'Big Air'},
    {id: 'overtaking', kind: 'overtaking', s: 300, title: 'Run-up to the jumps'},
  ],
  notes: {
    c1: {line: 'Brake before the turn, keep the throttle smooth and get straight for the run to Big Air.',
      note: 'The one real turn on the loop, between the middle jump and the big one.'},
    signature: {line: 'Line up straight with the ramp and keep the throttle steady.',
      note: 'The smallest of the three jumps, about 3 metres high. Land it a few times before you try the bigger ones.'},
    'crest-2': {line: 'Line up straight and hold a steady throttle up the ramp.',
      note: 'The middle jump, about 6 metres high. It needs more speed than the first.'},
    'crest-3': {line: 'Build speed on the run, keep the truck straight on the ramp and land with the wheels pointing forward.',
      note: 'The biggest jump, about 8 metres high. Take your time lining it up.'},
    overtaking: {line: 'Stay on the throttle and build speed.',
      note: 'There are no rivals in the playground, so use this stretch to build speed for the cross-table jump.'},
  },
});
