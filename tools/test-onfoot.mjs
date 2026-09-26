import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {createFighter, damageFighter, FIGHTER_RULES, FIGHTER_STEP_SECONDS,
  stepFighter, strikeFighterWithCar} from '../src/onfoot.js';

const close = (actual, expected, label, tolerance = .025) => assert.ok(
  Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
  `${label}: expected ${expected}, got ${actual}`);
const pacific = new Course(COURSE.find(stage => stage.id === 'pacific-canyon'), 1989);

function flatCourse({grade = 0, waterAt = Infinity, arena = false,
  obstacles = []} = {}) {
  return {
    def: {arena},
    groundAt(s, lateral) {
      return {x: lateral, y: s >= waterAt ? -16 : lateral * grade,
        z: s, heading: 0};
    },
    nearest(x, z) { return {s: z, lateral: x}; },
    obstaclesNear() { return obstacles; },
  };
}

function advance(course, car, fighter, input, ticks) {
  for (let tick = 0; tick < ticks; tick++)
    stepFighter(course, car, fighter, input);
}

test('real Pacific ground gives exact walk and sprint speed', () => {
  const car = {s: 172, lateral: 0};
  for (const [input, speed] of [[{forward: true}, 4.5],
    [{forward: true, sprint: true}, 7.5]]) {
    const fighter = createFighter(pacific, car, {s: 172, lateral: 0});
    const start = {x: fighter.x, z: fighter.z};
    advance(pacific, car, fighter, input, 240);
    close(Math.hypot(fighter.x - start.x, fighter.z - start.z), speed * 2,
      'two seconds of travel', .08);
    close(fighter.y, pacific.groundAt(fighter.s, fighter.lateral).y,
      'feet follow course ground', 1e-8);
  }
});

test('diagonal input does not outrun a straight sprint', () => {
  const course = flatCourse(), car = {s: 0, lateral: 0};
  const fighter = createFighter(course, car, {s: 0, lateral: 0});
  advance(course, car, fighter, {forward: true, right: true, sprint: true}, 240);
  close(Math.hypot(fighter.x, fighter.z), 15, 'normalized diagonal sprint', 1e-8);
});

test('jump peaks near 1.1 m, lands, and held jump does not repeat', () => {
  const course = flatCourse(), car = {s: 0, lateral: 0};
  const fighter = createFighter(course, car, {s: 0, lateral: 0});
  let peak = 0, airborneCount = 0;
  for (let tick = 0; tick < 180; tick++) {
    stepFighter(course, car, fighter, {jump: true});
    peak = Math.max(peak, fighter.airHeight);
    if (fighter.airHeight > 0) airborneCount++;
  }
  close(peak, 1.1, 'jump peak');
  assert.equal(fighter.airHeight, 0);
  assert.ok(airborneCount > 80 && airborneCount < 140,
    'one press makes one flight, not repeated jumps');
});

test('real roadside barrier is solid and allows a tangent slide', () => {
  const car = {s: 172, lateral: 0};
  const fighter = createFighter(pacific, car, {s: 172, lateral: 0});
  // The barrier is on the fighter's left (A) since the strafe fix; before it,
  // D walked there because strafing was mirrored on screen.
  advance(pacific, car, fighter, {left: true, sprint: true}, 240);
  assert.ok(fighter.contacts > 0, 'roadside furniture catches the fighter');
  assert.ok(fighter.lateral > 8 && fighter.lateral < 9.1,
    'fighter stays on the near side of the barrier');
  const before = fighter.s;
  advance(pacific, car, fighter, {forward: true, left: true}, 120);
  assert.ok(fighter.s > before + 1, 'fighter can slide along the barrier');
});

test('slopes over 40 degrees and water block movement', () => {
  const car = {s: 0, lateral: 0};
  const steep = flatCourse({grade: 1});
  const fighter = createFighter(steep, car, {s: 0, lateral: 0});
  stepFighter(steep, car, fighter, {left: true});
  assert.equal(fighter.lateral, 0);
  assert.equal(fighter.slopeStops, 1);

  const gentle = flatCourse({grade: .5});
  const walker = createFighter(gentle, car, {s: 0, lateral: 0});
  stepFighter(gentle, car, walker, {left: true});
  assert.ok(walker.lateral > 0);
  close(walker.y, walker.lateral * .5, 'gentle uphill ground', 1e-9);

  const coast = flatCourse({waterAt: 1});
  const dry = createFighter(coast, car, {s: 0, lateral: 0});
  advance(coast, car, dry, {forward: true}, 40);
  assert.ok(dry.s < 1 && dry.boundaryStops > 0,
    'no-swim boundary stops before submerged ground');
});

test('150 m race limit follows the car; arena walls use their own boundary', () => {
  const course = flatCourse(), car = {s: 0, lateral: 0};
  const fighter = createFighter(course, car, {s: 0, lateral: 0});
  advance(course, car, fighter, {forward: true, sprint: true}, 3000);
  assert.ok(fighter.s <= 150 + 1e-8 && fighter.boundaryStops > 0);
  car.s = 100;
  advance(course, car, fighter, {forward: true, sprint: true}, 1200);
  assert.ok(fighter.s > 200 && fighter.s <= 250 + 1e-8,
    'moving the car moves the permitted range');

  const arena = flatCourse({arena: true});
  const arenaFighter = createFighter(arena, {s: 0, lateral: 0},
    {s: 0, lateral: 0});
  advance(arena, {s: 0, lateral: 0}, arenaFighter,
    {forward: true, sprint: true}, 3200);
  assert.ok(arenaFighter.s > 150, 'arena does not use the road race radius');
  advance(arena, {s: 0, lateral: 0}, arenaFighter,
    {right: true, sprint: true}, 400);
  assert.ok(arenaFighter.lateral <= FIGHTER_RULES.arenaLateralLimit + 1e-8);
});

test('zero health or a car above 30 km/h gives a three-second knockdown', () => {
  const course = flatCourse(), car = {s: 0, lateral: 0};
  const fighter = createFighter(course, car);
  assert.equal(damageFighter(fighter, 35), true);
  assert.equal(fighter.health, 65);
  assert.equal(damageFighter(fighter, 65), true);
  assert.equal(fighter.knockedDown, true);
  const fallen = {x: fighter.x, z: fighter.z};
  car.s = 40;
  advance(course, car, fighter, {forward: true}, 359);
  assert.equal(fighter.knockedDown, true);
  assert.deepEqual({x: fighter.x, z: fighter.z}, fallen,
    'fighter cannot walk during knockdown');
  stepFighter(course, car, fighter, {forward: true});
  assert.equal(fighter.knockedDown, false);
  assert.equal(fighter.health, 100);
  assert.equal(fighter.respawns, 1);
  assert.ok(Math.hypot(fighter.x - car.lateral, fighter.z - car.s) <= 4,
    'fighter respawns beside the current car position');
  assert.equal(strikeFighterWithCar(fighter, 30), false);
  assert.equal(strikeFighterWithCar(fighter, 30.01), true);
  assert.equal(fighter.knockedDown, true);
});

test('finite low scenery can be jumped; unknown-height scenery remains solid', () => {
  const low = {id: 'low', kind: 'prop', shape: 'box',
    x: 0, y: 0, z: 1.2, heading: 0, halfX: .4, halfZ: .1, height: .35};
  const course = flatCourse({obstacles: [low]}), car = {s: 0, lateral: 0};
  const jumper = createFighter(course, car, {s: 0, lateral: 0});
  advance(course, car, jumper, {jump: true}, 55);
  advance(course, car, jumper, {forward: true, sprint: true}, 40);
  assert.ok(jumper.s > low.z + 1,
    'feet above the known obstacle top clear the low prop');

  const unknown = flatCourse({obstacles: [{...low, height: undefined}]});
  const blocked = createFighter(unknown, car, {s: 0, lateral: 0});
  advance(unknown, car, blocked, {jump: true}, 55);
  advance(unknown, car, blocked, {forward: true, sprint: true}, 40);
  assert.ok(blocked.s < low.z && blocked.contacts > 0,
    'an obstacle without vertical bounds remains solid');
});

test('the fixed step and scripted inputs replay identically at 30, 60 and 144 FPS', () => {
  const course = flatCourse(), car = {s: 0, lateral: 0};
  function replay(fps) {
    const fighter = createFighter(course, car, {s: 0, lateral: 0});
    let tick = 0;
    for (let frame = 1; frame <= 8 * fps; frame++) {
      const target = Math.floor(frame * 120 / fps + 1e-9);
      while (tick < target) {
        stepFighter(course, car, fighter, {
          forward: tick < 300 || tick >= 650,
          right: tick >= 300 && tick < 650,
          sprint: tick >= 550,
          jump: tick === 430,
          lookX: tick % 90 === 0 ? 6 : 0,
        }, FIGHTER_STEP_SECONDS);
        tick++;
      }
    }
    assert.equal(tick, 960);
    return fighter;
  }
  assert.deepEqual(replay(30), replay(60));
  assert.deepEqual(replay(30), replay(144));
});
