// Engineer notes for Cloudbreak Skyway (Claude's finishing pass, P4-FINISH-TEAMROOM). Corners keep their lap
// numbers. The tunnel is in the course. No brake boards stand on this road.
export const CLOUDBREAK_SKYWAY_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 3330, title: 'Skyway crest'},
    {id: 'overtaking', kind: 'overtaking', s: 3660, title: 'Straight before Corner 5'},
  ],
  notes: {
    c2: {line: 'Brake on the climb, turn in late and aim for the inside of the right-hander.',
      note: 'A steep climb into the Cloudbreak Crest section. Corner 3 follows 260 metres later, so keep your exit tidy.'},
    c3: {line: 'Brake early in a straight line, take a late apex on the left, and finish the turn before the tunnel.',
      note: 'The tunnel starts only 30 metres after the apex. Be straight and settled before you go in.'},
    c4: {line: 'Brake in a straight line on the way down, then take a late apex on the right.',
      note: 'The road drops away steeply after the tunnel, and the corner comes up faster than it feels. Do your braking before you turn.'},
    c6: {line: 'Brake early and in a straight line, take a late apex on the right and wait for the road to straighten before the throttle.',
      note: 'The last corner of the lap. A clean exit carries over the line and into the start of the next lap.'},
    signature: {line: 'Keep the car straight over the top.',
      note: 'A small crest that can lift a fast car. A long, flat-out run follows it, so land straight and carry your speed.'},
    overtaking: {line: 'Stay on the throttle and pull out of their slipstream early.',
      note: 'Corner 5 is a gentle right that needs no braking in the reference car, so the pass has to be done on this straight. The road widens through the corner.'},
  },
});
