// Engineer notes for Timberline Checkpoint Rush (Claude's finishing pass, P4-FINISH-TEAMROOM). The road is loose
// and bumpy all the way round, so there are many small crests; the notes cover the signature view, the long straight
// and the one corner that asks for a real lift. The tunnel is in the course. No brake boards stand on this road.
export const TIMBERLINE_RUSH_INTEL = Object.freeze({
  flags: [
    {id: 'c2', kind: 'corner', s: 3775, title: 'Corner 2'},
    {id: 'signature', kind: 'signature', s: 2850, title: 'Timberline Summit crest'},
    {id: 'overtaking', kind: 'overtaking', s: 3210, title: 'Straight into Corner 2'},
  ],
  notes: {
    c2: {line: 'Brake in a straight line at the end of the descent, apex on the right, and get the throttle on early.',
      note: 'The last corner, only 25 metres before the line. The surface is loose, so settle the car before you open the throttle.'},
    signature: {line: 'Keep the car straight and the throttle steady.',
      note: 'A crest in the middle of the long descent from the summit. The road is bumpy all the way down, so do not steer sharply over the top.'},
    overtaking: {line: 'Stay flat out, tuck in behind them and pull out early.',
      note: 'The longest straight, about 660 metres, running down from the summit. Corner 2 needs real braking, but not for another 230 metres.'},
  },
});
