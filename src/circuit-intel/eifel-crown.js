// Engineer notes for Eifel Crown (Claude's finishing pass, P4-FINISH-TEAMROOM). Corners are unnamed on this
// course, so they keep their lap numbers. Target speeds and gears come from the reference lap, and there are
// no brake boards on this road. Sectors stay the default thirds, so the reference lap is unchanged.
export const EIFEL_CROWN_INTEL = Object.freeze({
  flags: [
    {id: 'c8', kind: 'corner', s: 3415, title: 'Corner 8'},
    {id: 'signature', kind: 'signature', s: 1820, title: 'Forest Esses crest'},
    {id: 'overtaking', kind: 'overtaking', s: 3960, title: 'Straight into Corner 9'},
  ],
  notes: {
    c6: {line: 'Brake in a straight line at the top, turn in late and keep to the inside of the right-hander, then let the car run out wide.',
      note: 'The hill drops away steeply from here. Finish your braking before you turn in, or the car runs wide.'},
    c7: {line: 'Cross to the right before you brake, then take a late apex on the left.',
      note: 'The bottom of the hill, and Corner 8 follows straight after. Settle the car and bring the throttle in gently.'},
    c8: {line: 'Straighten the car after Corner 7, brake in a straight line, then turn in late for the right.',
      note: 'Exit speed is the prize. A straight follows, and whatever you carry out of here you carry along it.'},
    c12: {line: 'Brake early and in a straight line, turn in late, and point the car down the straight before you open the throttle.',
      note: 'The last corner. A tidy exit carries over the line and into the first bend; a rushed one costs you the whole straight.'},
    signature: {line: 'Keep the car straight and in the middle of the road over the top.',
      note: 'A small crest that can lift a fast car off the ground. The apex of Corner 4, a right-hander, is 65 metres beyond it, so land first and turn after.'},
    overtaking: {line: 'Get a clean exit from Corner 8, stay on the throttle and pull out of their slipstream early.',
      note: 'The longest straight on the lap. Corner 9 is a gentle left that needs almost no braking, so finish the pass before you reach it.'},
  },
});
