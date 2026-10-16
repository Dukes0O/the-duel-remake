// Engineer notes for Midnight Muscle Chase (Claude's finishing pass, P4-FINISH-TEAMROOM). The lap is four right-hand
// corners of the same shape joined by straights, so the notes tell them apart by what comes before and after.
// Neon Drift Trial runs the same road and has its own notes in neon-drift-trial.js. No brake boards stand on it.
export const MIDNIGHT_CHASE_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 520, title: 'Old Harbor corner', camera: {back: 70, ahead: 140}},
    {id: 'overtaking', kind: 'overtaking', s: 1285, title: 'Straight into Corner 2'},
  ],
  notes: {
    c1: {line: 'Brake in a straight line, turn in late and stay tight to the inside of the right-hander.',
      note: 'The first of four right-handers of the same shape. Learn this one and you know them all. A crash is penalised, so brake early rather than late.'},
    c2: {line: 'Brake in a straight line from the first sign of the corner, then stay tight to the inside.',
      note: 'You arrive from the longest straight on the lap at full speed, so do all your braking before you turn.'},
    c3: {line: 'Brake in a straight line, turn in late and get the throttle on early.',
      note: 'The same shape as Corner 1, with a long run to the next corner. A good exit here pays all the way along it.'},
    c4: {line: 'Brake in a straight line, stay tight to the inside and open the wheel early.',
      note: 'The last corner. The finish line is only 75 metres beyond the apex, so every km/h on the exit counts.'},
    signature: {line: 'Brake in a straight line, turn in late and stay tight to the inside of the right-hander.',
      note: 'Corner 1 from further back, so you can see the road that follows it. All four corners are the same shape.'},
    overtaking: {line: 'Stay flat out down the straight and brake in a straight line at the end of it.',
      note: 'The longest straight on the lap, about 680 metres, ending at a hard right. Use it to make up time, and leave room to stop before the corner.'},
  },
});
