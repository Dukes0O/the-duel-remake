// Engineer notes for Red Mesa Corkscrew (Claude's finishing pass, P4-FINISH-TEAMROOM). Corners keep their lap
// numbers. No brake boards stand on this road.
export const RED_MESA_INTEL = Object.freeze({
  flags: [
    {id: 'c3', kind: 'corner', s: 1635, title: 'Corner 3'},
    {id: 'c4', kind: 'corner', s: 2210, title: 'Corner 4'},
    {id: 'signature', kind: 'signature', s: 2240, title: 'Corkscrew Drop crest'},
    {id: 'overtaking', kind: 'overtaking', s: 2725, title: 'Straight into Corner 5'},
  ],
  notes: {
    c3: {line: 'Brake before the climb steepens, turn in late for the right-hander, then climb out.',
      note: 'A very steep climb takes you to the top of the Corkscrew. The crest comes 125 metres after the apex, and the road falls away beyond it.'},
    c4: {line: 'Brake in a straight line on the way down, be patient on turn-in and take a late apex on the right.',
      note: 'You come down the Corkscrew here, steeply, so finish braking before you turn. A small crest follows 30 metres after the apex; keep the car straight over it.'},
    c7: {line: 'Brake early after the run from Corner 6, turn in late and stay tight to the inside of the right-hander.',
      note: 'The last corner. Its exit leads onto the start straight, so a clean exit counts all the way round.'},
    signature: {line: 'Straighten the car right after Corner 4 and do not steer over the top.',
      note: 'A small crest that can lift a fast car, just after Corner 4. Land straight, then use the run towards Corner 5.'},
    overtaking: {line: 'Stay flat out down the straight and pull out of their slipstream early.',
      note: 'Corner 5 is a left that needs only a small lift, so the pass has to be finished before it. The road widens just beyond it.'},
  },
});
