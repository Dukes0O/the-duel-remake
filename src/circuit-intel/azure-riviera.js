// Engineer notes for Azure Riviera (Claude's finishing pass, P4-FINISH-TEAMROOM). Corners keep their lap numbers.
// No brake boards stand on this road.
export const AZURE_RIVIERA_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 2905, title: 'Olive Ridge crest'},
    {id: 'overtaking', kind: 'overtaking', s: 4015, title: 'Straight into Corner 7'},
  ],
  notes: {
    c3: {line: 'Brake in a straight line, turn in late and aim for the inside of the right-hander, then straighten the car for the left that follows.',
      note: 'The first of three bends in a row up Olive Ridge. Corners 4 and 5 follow within 450 metres, so do not spend everything here.'},
    c4: {line: 'A short brake, a late apex on the left, and keep the car steady as you leave it.',
      note: 'A crest comes 65 metres after the apex and can unsettle the car. Be straight, with the throttle on gently, by then.'},
    c5: {line: 'Brake in a straight line after the crest, then stay tight to the inside of the right-hander.',
      note: 'The tightest corner on this stretch, and the road drops away on the exit. Let the car settle before you use all the throttle.'},
    c7: {line: 'Brake early and in a straight line, take a late apex on the right and open the wheel as the road straightens.',
      note: 'The hardest braking on the lap, and the last corner. A clean exit carries over the line.'},
    signature: {line: 'Keep the car straight over the top.',
      note: 'A fast crest on the open ridge. Corner 6 is a wide right-hander straight after it, flat out in the reference car, so let the car settle before you turn.'},
    overtaking: {line: 'Pull out of their slipstream early and brake in a straight line.',
      note: 'The longest straight on the lap, about 680 metres, and it ends at the hardest braking. Make your move early.'},
  },
});
