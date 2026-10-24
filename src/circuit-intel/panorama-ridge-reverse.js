// Engineer notes for Panorama Ridge Reverse (Claude's finishing pass, TEAMROOM-VARIANT-NOTES). The road is the
// parent's driven the other way, so every bend turns the opposite direction, the corners come in the opposite
// order, and the parent's downhill stretches are climbs: the Esses now go up to Skyline and The Cutting is a steep
// descent. Target speeds and gears come from the reference lap. Boards stand at Murray Corner, Forrest Elbow,
// The Cutting and Hell Gate. No sectors, so the reference lap is unchanged.
export const PANORAMA_RIDGE_REVERSE_INTEL = Object.freeze({
  flags: [
    {id: 'skyline', kind: 'signature', s: 2606, title: 'Skyline'},
    {id: 'overtaking', kind: 'overtaking', s: 2076, title: 'Conrod Straight into Forrest Elbow'},
    {id: 'mountain', kind: 'overtaking', s: 4595, title: 'Mountain Straight into Hell Gate'},
  ],
  notes: {
    'murray-corner': {brakeBoard: 100, line: 'Stay left on the way in, brake in a straight line at the board, turn in late and clip the inside kerb of the right-hander.',
      note: 'The first corner after the long Pit Straight, where cars bunch up on the first lap, so brake early.'},
    'the-chase': {line: 'Keep to the inside kerb of the left and let the car run out to the right with a steady throttle.',
      note: 'A fast left that sets up Conrod Straight, so a clean exit matters more than a fast entry.'},
    'forrest-elbow': {brakeBoard: 100, line: 'Stay left, brake in a straight line at the board, turn in late and clip the inside kerb of the right-hander as the road climbs.',
      note: 'Heavy braking at the end of Conrod Straight, and the climb after the turn rewards a late, tidy line.'},
    'the-esses-3': {line: 'Settle the car before the Dipper crest, then take the right kerb to kerb and carry on into the next left.',
      note: 'Uphill and narrow, so a car sliding wide is slow and a smooth one is fast.'},
    'the-esses-2': {line: 'Cut straight across to the inside of the left, kerb to kerb.',
      note: 'Keep the rhythm, because the climb continues through all of the esses.'},
    'the-esses-1': {line: 'Take the inside kerb of the last right and line up for the inside of Skyline.',
      note: 'Skyline follows immediately, so there is no time to correct a bad exit.'},
    skyline: {line: 'Hold the inside of the left, steer smoothly and keep the throttle steady over the top.',
      note: 'The road crests right at the apex, so the car goes light while you are still turning.'},
    'summit-park': {line: 'Hold the inside of the right-hander and keep the car straight over the crests, steering again once the road settles.',
      note: 'Fast and wide, with the road falling away after the crests, so do your braking before the top and not on it.'},
    'reid-rise': {line: 'Hold the inside of the left-hander and let the car run out as the road drops away.',
      note: 'The drop gets steeper after this and The Cutting comes up 200 metres further on, so start slowing early.'},
    'the-cutting': {brakeBoard: 100, line: 'Brake in a straight line at the board, well before the corner, turn in late and stay tight to the inside of the right-hander.',
      note: 'The steepest downhill on the lap, so the car needs more distance to slow, and Griffin Bend follows after a short straight.'},
    'griffin-bend': {line: 'Cross to the right after The Cutting, then hold the inside of the left-hander.',
      note: 'Downhill and sweeping, and exit speed counts, because Mountain Straight follows.'},
    'hell-gate': {brakeBoard: 100, line: 'Stay left, brake in a straight line at the board, turn in late and clip the inside kerb of the right-hander.',
      note: 'The last corner of the lap, and a clean exit carries you down the Pit Straight, over the line and on to Murray Corner.'},
    overtaking: {line: 'Stay in their slipstream along Conrod Straight, pull out before the 150 board and out-brake them at the 100 board.',
      note: 'The longest straight on the lap ends in a tight right, which makes it the best place to pass.'},
    mountain: {line: 'Pull out of their slipstream early, then out-brake them at the 100 board.',
      note: 'A second place to pass: nearly a kilometre of straight ends in another tight right.'},
  },
});
