// How the Scablands' shape is driven (SCABLANDS-LAND round 4, slice 2b): the shape that is drawn is the shape that is driven. Pure numbers and
// rules, repeatable from the same inputs and run without graphics; src/sim-scablands.js applies them to a car and src/arena/modes/world-job.js to
// the raiders, Big Bess and the furnace. Nothing here changes a height: it only says what a slope does to a car.
export const MPH_TO_KMH = 1.609344;

export const GROUND = Object.freeze({
  // The steepest slope (rise over run) a tyre grips: .30 is a little over 16 degrees. A road never climbs more than .12; the dry river's banks
  // climb .46 at their steepest and a scarp .75, so neither can be climbed by any car.
  gripGrade: .30,
  // The Steps are a rough ramp of rock ledges: climbed at or under this speed the risers are driven (a slope of up to ledgeGrade), faster
  // and a car is thrown back as it would be by any slope too steep to grip. Slopes pull a car less there (the ledges are cut for wheels).
  ledgeClimbKmh: 25, ledgeGrade: 1, ledgeSlopeShare: .25,
  // The pull of a slope along it, in mph a second for a slope of sine 1: gravity (as `limitClimb` and `slopeSpeedDelta` have it for a truck).
  slope: Object.freeze({slopeGravityMphPerSec: 9.80665 * 2.2369362921}),
  // Gravity as the sim's flights have it (src/sim-driving.js `_jump`), metres a second squared.
  gravity: 18,
  // A hit at the foot of a slope: the car is pushed back this far along the slope's own downhill, metres, for a hit straight on.
  pushBack: .35,
});

// A fall is a hit sized by the drop. `drop` is the height in metres a car fell from rest to reach the speed it met the ground at (a car that
// leaves a bank at speed and lands on the bed has fallen the bank's height, a little less when it landed on a slope). Under a metre it is
// nothing; at 3 m it is hard; off the 8 m bank it takes half of a light car's armour and puts the ember out (the ember takes 1.5 for each km/h
// shed, 100 to 0 at 67 km/h). A fall never takes the last of the armour: it cannot end a job by itself.
export const FALL = Object.freeze({freeDrop: 1, kmhAtOneMore: 20, kmhExponent: .75, armorShareAtEight: .5, armorFullDrop: 8});
export function fallHit(drop) {
  if (!(drop > FALL.freeDrop)) return {kmh: 0, armorShare: 0};
  const over = drop - FALL.freeDrop;
  return {kmh: FALL.kmhAtOneMore * over ** FALL.kmhExponent, armorShare: FALL.armorShareAtEight * Math.min(1, over / (FALL.armorFullDrop - FALL.freeDrop))};
}
// Metres of free fall that give this closing speed (metres a second) in the sim's gravity.
export const dropFor = closingMps => closingMps * closingMps / (2 * GROUND.gravity);

// The steepest slope a car may climb at this speed (km/h), on this ground: the Steps' ledges give way to a slow car.
export function climbLimit(kmh, onLedges) {
  return onLedges && kmh <= GROUND.ledgeClimbKmh ? GROUND.ledgeGrade : GROUND.gripGrade;
}
