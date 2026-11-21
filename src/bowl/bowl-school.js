// Trick School teaches the public Bowl moves. The secret moves remain a
// discovery even after the driver finishes the last lesson.
export const BOWL_SCHOOL_LESSONS = Object.freeze([
  {kind: 'wheelie', meaning: 'A wheelie is driving on the back wheels with the front wheels in the air.',
    how: 'From a crawl, hold W and Space until the front wheels have been up for a second.'},
  {kind: 'stoppie', meaning: 'A stoppie is braking on the front wheels with the back wheels in the air.',
    how: 'Get above 25 mph, then hold S and Space for a second.'},
  {kind: 'donut', meaning: 'A donut is one full turn on the ground while the truck slides around.',
    how: 'From a crawl, hold W, Space and an arrow key until the truck turns all the way around.'},
  {kind: 'spin', air: true, meaning: 'A spin is a full turn in the air with the truck kept level.',
    how: 'Drive off the Table, then tap an arrow key in the air.'},
  {kind: 'backflip', air: true, meaning: 'A backflip is a full turn in the air with the back of the truck going first.',
    how: 'Tap S in the air for one turn, or keep it held for another turn if there is time.'},
  {kind: 'frontFlip', air: true, meaning: 'A front flip is a full turn in the air with the nose of the truck going first.',
    how: 'Let go of W as you leave the ramp, then tap it for one turn or hold it for another.'},
  {kind: 'barrelRoll', air: true, meaning: 'A barrel roll is a full roll in the air with the nose pointing along the jump.',
    how: 'In the air, hold Space and tap an arrow key while the truck is still pointing forward.'},
  {kind: 'sideFlip', air: true, meaning: 'A side flip is a full roll in the air with the truck turned sideways.',
    how: 'Tap an arrow to turn sideways, then hold Space and press that arrow again.'},
].map(Object.freeze));

export const BOWL_SCHOOL_REASONS = Object.freeze({
  wheelieSpeed: 'You were going too fast for a wheelie, so slow right down first.',
  stoppieSpeed: 'You were going too slowly for a stoppie, so get above 25 mph first.',
  heldThrottle: 'You kept W held from the run-up, so let go after takeoff and tap it again.',
  keyLate: 'You tapped the key too late to turn, so try it earlier on the next jump.',
  roof: 'You landed on the roof, so give the truck time to turn all the way around.',
  shortDouble: 'There was time for just one turn, so take a bigger jump for a double.',
  rollDirection: 'The nose was still pointing forward, so turn sideways before you roll.',
});

export const isSchoolTrick = kind => BOWL_SCHOOL_LESSONS.some(lesson => lesson.kind === kind);
export const nextSchoolLesson = done => BOWL_SCHOOL_LESSONS.find(lesson => !done.includes(lesson.kind)) ?? null;

export function featuredSchoolTrick(trick, featured = []) {
  return featured.includes(trick.kind) || (trick.turns === 2 && featured.includes('doubles'));
}
