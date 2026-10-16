// Engineer notes for Neon Docks Circuit (Claude's finishing pass, P4-FINISH-TEAMROOM). Corners keep their lap
// numbers. The two tight corners are the same shape. No brake boards stand on this road.
export const NEON_DOCKS_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 1750, title: 'Breakwater Bend crest'},
    {id: 'overtaking', kind: 'overtaking', s: 1795, title: 'Straight into Corner 3'},
  ],
  notes: {
    c3: {line: 'Brake in a straight line, turn in late and stay tight to the inside of the right-hander, then let the car run out.',
      note: 'The tightest corner of the lap. Brake before you turn: the car runs wide if you carry speed in.'},
    c6: {line: 'Brake early and in a straight line, take a late apex on the right and open the wheel as the road straightens.',
      note: 'The last corner, and the same shape as Corner 3. Its exit leads onto the start straight, so a clean exit is worth a lot.'},
    signature: {line: 'Keep the car straight over the top.',
      note: 'A small crest that can lift a fast car, with the braking for Corner 3 already under way. Slow down before you reach it, because a car in the air cannot brake.'},
    overtaking: {line: 'Use the extra width of the road, pull out of their slipstream early and brake in a straight line.',
      note: 'The road is wider here, which gives room for two cars before Corner 3. Make the move before the braking point.'},
  },
});
