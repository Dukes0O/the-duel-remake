// Engineer notes for Alpine Serpent (Claude's finishing pass, P4-FINISH-TEAMROOM). The gallery tunnel and the
// wider passing stretches named here are in the course. No brake boards stand on this road.
export const ALPINE_SERPENT_INTEL = Object.freeze({
  flags: [
    {id: 'c1', kind: 'corner', s: 350, title: 'Corner 1'},
    {id: 'c6', kind: 'corner', s: 2750, title: 'Corner 6'},
    {id: 'signature', kind: 'signature', s: 1895, title: 'Avalanche Gallery crest'},
    {id: 'overtaking', kind: 'overtaking', s: 1970, title: 'Straight into Corner 5'},
  ],
  notes: {
    c1: {line: 'Brake early on the start straight, use the full width of the road, take a late apex on the left.',
      note: 'The road climbs through the turn, so you need less brake than you think. The road is wider here; use it.'},
    c5: {line: 'Brake in a straight line on the climb, turn in late and clip the inside of the right-hander, then power up the hill.',
      note: 'A steep climb. A good exit takes you towards the gallery at speed; a poor one leaves you crawling up the slope.'},
    c6: {line: 'Come out of the tunnel already slowed, keep to the right, then take a late apex on the left.',
      note: 'The tunnel ends 80 metres before the apex, and the road falls steeply beyond it. Do your braking before you go in.'},
    c10: {line: 'Brake early and in a straight line, take a late apex on the right and wait for the road to straighten before the throttle.',
      note: 'The last corner of the lap. A clean exit carries over the line and up the Glacier Climb.'},
    signature: {line: 'Stay straight and settled over the top.',
      note: 'A small crest that can lift a fast car. Braking for the tight right-hander at Corner 5 starts just after it, so land straight and brake in a straight line.'},
    overtaking: {line: 'Stay on the throttle past the crest and pull out of their slipstream before the braking point.',
      note: 'The road widens just beyond this point on the climb to Corner 5, so there is room for two cars. Brake late but in a straight line.'},
  },
});
