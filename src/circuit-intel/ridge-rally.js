// Engineer notes for Ridge Rally (Claude's finishing pass, P4-FINISH-TEAMROOM). The road is loose underfoot, which
// the notes say where it matters. The three routes bend differently, so each carries its own flags and notes.
// Only the corners that ask for a real lift get a flag. No brake boards stand on this road.
const SLOWEST = {line: 'Brake early on the loose surface, wide on entry, apex on the right, and let the car run out on the exit.',
  note: 'The slowest corner of the lap, and the surface is loose, so there is less grip than it looks. The climb up Timberline Ridge begins around here.'};
const CREST = {line: 'Go straight over the top with the throttle light.',
  note: 'Near the highest point of the lap, just after the tunnel. A long descent follows, so settle the car before you open the throttle.'};
const straight = (metres, after) => ({line: 'Stay flat and pull out of their slipstream early.',
  note: `The longest straight on the lap, only about ${metres} metres. The surface is loose, so leave room to brake. ${after}`});

export const RIDGE_RALLY_INTEL = Object.freeze({
  routes: {
    route_a: {
      flags: [
        {id: 'c1', kind: 'corner', s: 1710, title: 'Corner 1'},
        {id: 'signature', kind: 'signature', s: 2665, title: 'Timberline Ridge crest'},
        {id: 'overtaking', kind: 'overtaking', s: 1060, title: 'Dry Creek straight'},
      ],
      notes: {c1: SLOWEST, signature: CREST, overtaking: straight(420, 'Corner 1 is 300 metres further on.')},
    },
    route_b: {
      flags: [
        {id: 'c2', kind: 'corner', s: 1655, title: 'Corner 2'},
        {id: 'signature', kind: 'signature', s: 2665, title: 'Timberline Ridge crest'},
        {id: 'overtaking', kind: 'overtaking', s: 875, title: 'Dry Creek straight'},
      ],
      notes: {c2: SLOWEST, signature: CREST, overtaking: straight(430, 'Corner 2 is 450 metres further on.')},
    },
    route_c: {
      flags: [
        {id: 'c2', kind: 'corner', s: 1800, title: 'Corner 2'},
        {id: 'c4', kind: 'corner', s: 3460, title: 'Corner 4'},
        {id: 'signature', kind: 'signature', s: 2665, title: 'Timberline Ridge crest'},
        {id: 'overtaking', kind: 'overtaking', s: 455, title: 'Dry Creek straight'},
      ],
      notes: {
        c2: SLOWEST,
        c4: {line: 'Brake in a straight line on the way down, turn in late and get the throttle on early.',
          note: 'The last corner, only 60 metres before the line. The surface is loose, so get the car straight before you open the throttle.'},
        signature: CREST,
        overtaking: straight(250, 'Corner 1 is a gentle right that needs no braking.'),
      },
    },
  },
});
