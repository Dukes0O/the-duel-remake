// Engineer notes for Harbour Lights Reverse (Claude's finishing pass, TEAMROOM-VARIANT-NOTES). The street circuit
// is the parent's driven the other way: every bend turns the opposite direction and the corners come in the
// opposite order, so the Old Town Esses are met as 4, 3, 2 and 1. Target speeds and gears come from the reference
// lap. Boards stand at the Lantern Hairpin (50 m only), Bell Tower Bend and Casino Corner. No sectors, so the
// reference lap is unchanged.
export const HARBOUR_LIGHTS_REVERSE_INTEL = Object.freeze({
  flags: [
    {id: 'signature', kind: 'signature', s: 2576, title: 'Old Town Esses crest'},
    {id: 'overtaking', kind: 'overtaking', s: 1740, title: 'Reservoir Run into Fishmarket Bend'},
    {id: 'seafront', kind: 'overtaking', s: 4000, title: 'Seafront Straight into Harbour Turn'},
  ],
  notes: {
    'harbour-turn': {line: 'Brake in a straight line on the right of the road, turn in late and clip the inside kerb of the left-hander.',
      note: 'The first corner after the start line, so on the first lap leave a gap and brake early.'},
    'reservoir-sweep': {line: 'Turn in early, keep to the inside and let the car drift out to the right on the exit.',
      note: 'A fast, wide left with walls close on the outside, so it needs only a small lift, and more if a car is alongside.'},
    'fishmarket-bend': {line: 'Brake hard in a straight line on the left, turn in late and hold the inside kerb of the right-hander.',
      note: 'The end of Reservoir Run asks for big braking, and the hairpin follows after a short straight, so get the car straight again quickly.'},
    'lantern-hairpin': {brakeBoard: 50, line: 'Move right on the short straight, brake early, turn in late and use the whole road round the left.',
      note: 'The slowest corner on the lap, at about 60 km/h, and rushing it loses more than braking early.'},
    'precinct-bend': {line: 'Brake in a straight line on the left, hold the inside of the right-hander, then cross to the right on the Hillside to line up the esses.',
      note: 'The road climbs through the bend and the esses follow almost at once, so be smooth and settle the car.'},
    'old-town-esses-4': {line: 'Take the first left over the inside kerb and keep the car in the middle of the road.',
      note: 'The esses count down in this direction, 4 then 3, 2 and 1, and the road is twelve metres wide, so pick one smooth line and commit.'},
    'old-town-esses-3': {line: 'Kerb to kerb, one smooth line through the right.',
      note: 'Keep the rhythm and keep your steering smooth; a wall is close if you have to correct.'},
    'old-town-esses-2': {line: 'Kerb to kerb again, and let the left carry you across the road.',
      note: 'The road is about to crest, so keep your steering smooth and your line tidy.'},
    'old-town-esses-1': {line: 'Brake lightly for the last right, take the inside kerb, then straighten up for Bell Tower Bend.',
      note: 'The slowest of the four, because the road crests at its start and then falls away downhill.'},
    'bell-tower-bend': {brakeBoard: 100, line: 'Stay right, brake in a straight line at the board, turn in late and clip the inside of the left-hander.',
      note: 'The road drops away steeply here, so finish your braking before you turn in; Temple Hill follows after a short straight.'},
    'temple-hill': {line: 'Cross to the left on the short straight, brake lightly and hold the inside of the right-hander.',
      note: 'A steep downhill with walls on both sides, so neat beats brave.'},
    'casino-corner': {brakeBoard: 100, line: 'Brake in a straight line on the right, turn in late and aim for the inside barrier of the left-hander.',
      note: 'The last tight corner of the lap, and the power you put down here carries you most of the way to the line.'},
    signature: {line: 'Keep to the middle of the road over the crest, between the last two bends of the esses.',
      note: 'The road tops out here and then falls away downhill, so learn this view and be settled before the top.'},
    overtaking: {line: 'Follow them closely down Reservoir Run, pull out of the slipstream early and out-brake them into Fishmarket Bend.',
      note: 'The longest straight on the lap is the best place to pass, and the right-hander at the end is a hard stop for everyone.'},
    seafront: {line: 'Stay in their slipstream along Seafront Straight and pull out before the line.',
      note: 'The run from Casino Corner to the line is long and Harbour Turn just after it is a real braking point, so this is a second place to pass.'},
  },
});
