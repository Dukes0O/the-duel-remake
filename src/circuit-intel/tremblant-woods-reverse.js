// Engineer notes for Tremblant Woods Reverse (Claude's finishing pass, TEAMROOM-VARIANT-NOTES). The road is the
// parent's driven the other way, so every bend turns the opposite direction and the corners come in the opposite
// order; the names stay the parent's. Final Turn is now the first bend after the start line, and the two halves of
// Devil's Chicane are met as 2 then 1. Target speeds and gears come from the reference lap. Brake boards stand at
// the Final Turn, Lodge Bend, Beaver Hairpin and Ridge Corner; the boards by the chicane stand before its first
// half, so neither half names one. No sectors, so the reference lap is unchanged.
export const TREMBLANT_WOODS_REVERSE_INTEL = Object.freeze({
  flags: [
    {id: 'chairlift', kind: 'signature', s: 1742, title: 'Timber Straight and the chairlift', camera: {back: 40, ahead: 90}},
    {id: 'overtaking', kind: 'overtaking', s: 2440, title: 'Timber Straight into Beaver Hairpin'},
  ],
  notes: {
    'final-turn': {brakeBoard: 100, line: 'Stay right on the way in, brake in a straight line, turn in late and clip the inside kerb of the left-hander.',
      note: 'The first bend after the start line, so on the first lap the grid is close and you should brake early.'},
    'lodge-bend': {brakeBoard: 100, line: 'Brake in a straight line on the right, turn in late and hold the inside kerb of the left as the road falls away.',
      note: 'The road runs downhill through this long left, so finish your braking before you turn and bring the throttle in gently.'},
    'devil-s-chicane-2': {line: 'Stay left on the way in, brake in a straight line by the boards, then turn right over the kerb and be ready to flick back left.',
      note: 'This direction meets Chicane 2 first, a right, and Chicane 1 follows as a left, so a tidy first half sets up the second.'},
    'devil-s-chicane-1': {line: 'Turn left over the second kerb, let the car run out to the right edge and get the throttle down once it is straight.',
      note: 'The slower half of the chicane, and Timber Straight follows, so every kilometre per hour you carry out lasts the length of it.'},
    'beaver-hairpin': {brakeBoard: 100, line: 'Stay right on the way in, brake in a straight line at the board, turn in late and use the whole road round the left.',
      note: 'The slowest corner on the lap, at the end of the longest straight in the game, and Beaver Kink follows after a short straight.'},
    'beaver-kink': {line: 'Cross to the left on The Spur, then take the inside of the right-hander and let the car run out to the left.',
      note: 'It comes right after the hairpin, so square the car up on The Spur and keep your steering smooth.'},
    'ridge-corner': {brakeBoard: 100, line: 'Brake in a straight line on the right, turn in late and keep to the inside of the left-hander.',
      note: 'The road crests at the start of the bend and falls away through it, so finish your braking before you turn in.'},
    'fir-esses-2': {line: 'Brake in a straight line on the left, then take the right-hander kerb to kerb with one smooth movement.',
      note: 'The Ridge Run crest is behind you, so land, brake in a straight line and have the car settled before you turn.'},
    'fir-esses-1': {line: 'Flick left over the kerb straight after the right, then use Lakeshore to move across to the left.',
      note: 'The slower half of the esses, with Lakeside Plunge following after a short straight, so stay smooth.'},
    'lakeside-plunge': {line: 'Brake in a straight line on the left, turn in late and hold the inside of the right-hander as the road starts to climb.',
      note: 'Despite its name this is a climb in this direction, and a steep one on the exit, so keep the car tidy before Pine Drop.'},
    'pine-drop': {line: 'Keep to the inside of the left-hander and let the car run out as the road flattens at the top.',
      note: 'A steep climb with the crest right at the apex, so ease the throttle as the road tops out and be straight for Lodge Straight.'},
    chairlift: {line: 'Hold the middle of the road and look down the straight along the chairlift.',
      note: 'The longest straight in the game runs beside the chairlift, and it ends at the Beaver Hairpin and the heaviest braking on the lap.'},
    overtaking: {line: 'Stay in their slipstream down the straight, pull out before the 150 board and out-brake them at the 100 board.',
      note: 'The best place to pass: the longest straight in the game ends at the Beaver Hairpin, the slowest corner on the lap.'},
  },
});
