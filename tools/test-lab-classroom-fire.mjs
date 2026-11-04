// LAB-CLASSROOM-FIRE (docs/board/cards/LAB-CLASSROOM-FIRE.md): Fire triangle as a classroom lesson.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassroomSession, PARTS, SHOW_ME_S} from '../src/lab/classroom/classroom-frame.js';
import {CLASSROOM_LESSONS} from '../src/lab/classroom/classroom-lessons.js';
import {STEPS, COLS, ROWS, ROAD, STRIP, MIDDLE, SIDES, BUCKET_L, FLAT_OUT_L, COAT_L, TANK_L, MINUTES, JOB_HEAD_START, TRY_HEAD_START, OPEN_SPREADS,
  CHALLENGE_CARD, forestGrid, litFire, grown, reachedRoad, front, frontCell, dropOn, coatStrip, litresFor, pitBurning, pitMissing} from '../src/lab/lessons/fire-classroom.js';
import {drawBoard, drawPicture, hitTest, hoverInfo, targetPoint} from '../src/lab/lessons/fire-board.js';
import {fireBench, TAKES_AWAY} from '../src/lab/benches/fire.js';
import {CHALLENGE_RULES, createChallenge} from '../src/lab/lab-challenges.js';
import {FIRE, RETARDANT, spreadStep, cellIJ} from '../src/heli/heli-fire.js';
import {BUCKET, RETARDANT_LITRES} from '../src/heli/heli-bucket.js';

const lesson = CLASSROOM_LESSONS.fire;
const run = (session, seconds) => { for (let t = 0; t < seconds; t += .05) session.tick(.05); };
const until = (session, test, limit = 40) => { for (let t = 0; t < limit && !test(session.view()); t += .05) session.tick(.05); assert.ok(test(session.view()), `condition not reached on ${session.view().step.id}`); };
const say = session => session.view().brian.text;
const side = name => String(SIDES.indexOf(name));
// Brian's job, done as the pointer says: drop on the flames nearest the road, wait for the spread, again.
function followPointer(session) {
  for (let n = 0; n < 40 && !session.view().ready; n++) {
    const v = session.view();
    if (v.keys.Space === 'drop') session.act(v.target); else run(session, .25);
  }
  assert.ok(session.view().ready, 'the job is done');
}
function playThroughTo(session, id) {
  while (session.view().step.id !== id) {
    const step = session.view().step.id;
    if (step === 'wonder' || step === 'watch') until(session, x => x.ready);
    else if (step === 'word-fuel') session.act('wood:in');
    else if (step === 'word-heat') { session.act('gas:on'); until(session, x => x.ready); }
    else if (step === 'word-oxygen') { session.act('lid:shut'); until(session, x => x.ready); }
    else if (step === 'word-triangle') { session.act('lid:open'); until(session, x => x.ready); }
    else if (step === 'try-water') { session.act(`answer:${side('heat')}`); session.act('tip'); until(session, x => x.ready); }
    else if (step === 'try-sand') { session.act(`answer:${side('air')}`); session.act('tip'); until(session, x => x.ready); }
    else if (step === 'try-strip') { session.act('rake'); session.act(`answer:${side('fuel')}`); session.act('burn'); until(session, x => x.ready); }
    else if (step === 'word-retardant') { session.act('coat'); until(session, x => x.ready); }
    else if (step === 'alone') followPointer(session);
    else if (step === 'check-lid') session.act(`answer:${side('air')}`);
    else if (step === 'check-coat' || step === 'check-game') session.act('answer:0');
    assert.ok(session.view().ready, `${step} is ready`);
    session.act('next');
  }
}

test('the lesson walks the seven parts in order, keeps the old notebook words, and goes to the flying challenge', () => {
  assert.deepEqual([...new Set(STEPS.map(s => s.part))], PARTS.map((_, i) => i));
  assert.ok(STEPS.every((s, i) => i === 0 || s.part >= STEPS[i - 1].part));
  assert.deepEqual(STEPS.filter(s => s.word).map(s => s.word), ['fire-fuel', 'fire-heat', 'fire-oxygen', 'fire-fire-triangle', 'fire-retardant'], 'the old lesson’s notebook ids');
  assert.deepEqual(lesson.words.map(w => w.word), ['Fuel', 'Heat', 'Oxygen', 'Fire triangle', 'Retardant']);
  assert.equal(lesson.name, 'Fire triangle');
  assert.equal(lesson.finishLabel, undefined, 'the challenge is the helicopter one, not a bench run');
  assert.equal(STEPS.find(s => s.id === 'watch').voice, 'lab.brian.fire.intro');
  assert.equal(STEPS.find(s => s.id === 'recap').voice, 'lab.brian.fire.explain');
  // The challenge card says the challenge's own rule.
  assert.equal(MINUTES * 60, CHALLENGE_RULES.fire.seconds);
  assert.match(CHALLENGE_CARD.text, new RegExp(`Keep it off the road for ${MINUTES} minutes, or put it out`));
});

test('every number is the game’s own: the bench, the challenge’s forest, the bucket and the retardant tank', () => {
  // The pit: the bench says what burns and which side each tool takes away.
  const all = {fuel: true, heat: true, air: true, putOut: 'nothing'};
  assert.equal(pitBurning(all), true);
  for (const s of SIDES) { assert.equal(pitBurning({...all, [s]: false}), false); assert.deepEqual(pitMissing({...all, [s]: false}), [s]); }
  for (const [tool, gone] of Object.entries(TAKES_AWAY)) assert.deepEqual(fireBench.run({putOut: tool}).missing, [gone]);
  assert.deepEqual(TAKES_AWAY, {water: 'heat', sand: 'air', 'cleared strip': 'fuel'});
  // Litres: the bucket, a cell burning flat out, the tank and a coat.
  assert.equal(BUCKET_L, BUCKET.litres); assert.equal(BUCKET_L, 600);
  assert.equal(FLAT_OUT_L, FIRE.litresPerPoint); assert.equal(litresFor(100), 180); assert.equal(litresFor(75), 135);
  assert.equal(COAT_L, RETARDANT.litresPerCell); assert.equal(TANK_L, RETARDANT_LITRES); assert.equal(TANK_L / COAT_L, 4);
  // The forest is the challenge's: its size, seed and start cell, and it spreads exactly as the challenge's does.
  const rule = CHALLENGE_RULES.fire;
  assert.equal(COLS, rule.columns); assert.equal(ROWS, rule.rows); assert.equal(ROAD, COLS - 1);
  const ch = createChallenge('fire', {fire: {i0: 40, j0: -7, y: 0}});
  assert.equal(ch.roadColumn - 40, ROAD);
  const ours = grown(litFire(), forestGrid(), JOB_HEAD_START);
  let theirs = ch.fire; for (let k = 0; k < JOB_HEAD_START; k++) theirs = spreadStep(theirs, ch.grid, null);
  const local = fire => fire.burning.map(([cell, p]) => [...cellIJ(cell), p].join(',')).sort();
  assert.deepEqual(local(ours), local({burning: theirs.burning.map(([cell, p]) => [cell - 40 * 1024 + 7, p])}), 'the same fire, three spreads in');
  // A drop on a cell burning flat out puts it out, and the rest runs on to its neighbours.
  const r = dropOn(ours, forestGrid(), ...frontCell(ours));
  assert.ok(r.cellsOut >= 1 && r.litresOnFire <= BUCKET_L);
  // With nothing in its way the try's fire reaches the road; a raked strip or a coat of retardant stops it.
  assert.equal(OPEN_SPREADS, 4);
  const open = grown(grown(litFire(), forestGrid(), TRY_HEAD_START), forestGrid(), OPEN_SPREADS);
  assert.equal(reachedRoad(open), true);
  const raked = grown(grown(litFire(), forestGrid({raked: true}), TRY_HEAD_START), forestGrid({raked: true}), 12);
  assert.equal(front(raked), STRIP - 1); assert.equal(reachedRoad(raked), false);
  const coated = grown(coatStrip(grown(litFire(), forestGrid(), TRY_HEAD_START), forestGrid()).fire, forestGrid(), 12);
  assert.equal(front(coated), STRIP - 1); assert.equal(coated.retardant.length, ROWS);
});

test('a child who does exactly what each prompt says passes every step', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  assert.equal(session.view().ready, true);
  assert.equal(session.view().ideas.length, 3);
  assert.equal(session.view().last, true);
});

test('the words: wood alone does not burn, heat lights it, the lid puts it out, and the triangle shows each side', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-fuel');
  assert.deepEqual(session.view().keys, {1: 'wood:in'});
  assert.equal(session.act('gas:on') && session.view().pit.heat, false, 'only the step’s own switch works');
  session.act('wood:in');
  assert.equal(session.view().pit.fuel, true); assert.equal(session.view().pit.burning, false);
  assert.match(say(session), /does not burn on its own\. It needs heat/);
  session.act('next');
  session.act('gas:on'); run(session, .4);
  assert.equal(session.view().ready, false, 'the flames take a moment to catch');
  until(session, x => x.ready);
  assert.equal(session.view().pit.flame, 1); assert.deepEqual(session.view().pit.missing, []);
  session.act('next');
  session.act('lid:shut'); until(session, x => x.ready);
  assert.equal(session.view().pit.flame, 0); assert.deepEqual(session.view().pit.missing, ['air']);
  assert.match(say(session), /though the gas is on and the wood is there\. That is why my lid worked/);
  session.act('next');
  assert.deepEqual(session.view().pit.missing, ['air']);
  session.act('lid:open'); until(session, x => x.ready);
  assert.equal(session.view().pit.burning, true);
  assert.match(say(session), /all three together/);
});

test('the guided tries set up first, then ask, then test; a wrong guess says why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'try-water');
  assert.equal(session.view().cards.length, 3, 'the guess comes first, with the fire burning');
  assert.equal(session.act('tip') && session.view().pit.pour, null, 'no tipping before the guess');
  session.act(`answer:${side('fuel')}`);
  assert.deepEqual(session.view().keys, {Space: 'tip'});
  session.act('tip'); until(session, x => x.ready);
  assert.deepEqual(session.view().pit.missing, ['heat']);
  assert.match(say(session), /It took the heat\. The wood is still there, wet and black: the fuel was not taken\. Water soaks up the heat/);
  assert.equal(session.view().cards.find(c => c.state === 'right').label, 'Heat');
  assert.equal(session.view().cards.find(c => c.state === 'wrong').label, 'Fuel');
  session.act('next');
  session.act(`answer:${side('heat')}`); session.act('tip'); until(session, x => x.ready);
  assert.deepEqual(session.view().pit.missing, ['air']);
  assert.match(say(session), /The gas is still on under the sand: the heat was not taken\. The sand covers the wood/);
  session.act('next');
  // The strip: rake first, then the guess, then let it burn; it stops at the strip.
  assert.deepEqual(session.view().keys, {Space: 'rake'});
  assert.equal(session.act('answer:0') && session.view().cards.length, 0, 'no guess before the strip is raked');
  session.act('rake');
  assert.equal(session.view().forest.raked, true);
  session.act(`answer:${side('air')}`); session.act('burn'); until(session, x => x.ready);
  assert.equal(session.view().forest.front, STRIP - 1);
  assert.equal(session.view().forest.cells.filter(c => c.i === STRIP).every(c => c.state === 'raked'), true, 'the raked strip stays in the picture');
  assert.match(say(session), new RegExp(`It took the fuel\\. Air blows across the strip all the time: the oxygen was not taken\\. There was nothing in the strip to burn.*reaches the road after the flames spread ${OPEN_SPREADS} more times`));
  session.act('next');
  session.act('coat'); until(session, x => x.ready);
  assert.equal(session.view().forest.front, STRIP - 1);
  assert.ok(session.view().forest.cells.filter(c => c.i === STRIP).every(c => c.state === 'coated'), 'the coat stays in the picture');
  assert.match(say(session), /Retardant never puts out flames already burning, so it goes in front/);
});

test('Brian’s job: following the pointer puts it out; water at the back loses the road and says why; wasted drops say why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'alone');
  assert.deepEqual(session.view().forest.aim, [0, MIDDLE], 'the bucket starts at the lake end');
  followPointer(session);
  assert.equal(session.view().job.trips, 3);
  assert.equal(session.view().forest.burning, 0); assert.equal(session.view().forest.road, false);
  assert.match(say(session), /Out! 3 trips, and the fire never reached the road/);
  // The back first: the front reaches the road, Brian says why and the job starts again.
  const s = createClassroomSession(lesson);
  playThroughTo(s, 'alone');
  const back = () => { const v = s.view(), c = v.forest.cells.filter(k => k.state === 'burning').sort((a, b) => a.i - b.i || b.percent - a.percent)[0]; s.act(`drop:${c.i}:${c.j}`); };
  back(); assert.match(say(s), /Splash: .* out\. Small flames take less water than the 180 litres a cell burning at full strength takes, and the water left over ran on to the flames next to it/);
  until(s, x => x.keys.Space === 'drop' || x.job.lost, 5);
  back(); until(s, x => x.job.lost, 5);
  assert.match(say(s), /The fire reached the road\. The flames at the front kept spreading while the water fell behind them\. Drop on the flames nearest the road first/);
  assert.equal(s.view().help, 1, 'a lost job climbs the help');
  until(s, x => x.keys.Space === 'drop', 5);
  assert.equal(s.view().job.trips, 0); assert.match(say(s), /The job starts again/);
  // Water on burnt ground or on green trees.
  s.act(`drop:0:${MIDDLE}`); until(s, x => x.keys.Space === 'drop', 5);
  const burnt = s.view().forest.cells.find(c => c.state === 'burnt');
  s.act(`drop:${burnt.i}:${burnt.j}`);
  assert.match(say(s), /That cell is out already: nothing is burning there, so the water did nothing/);
  // Water on green trees, on a fresh job: the trees by the road are not burning yet.
  const g = createClassroomSession(lesson);
  playThroughTo(g, 'alone');
  assert.equal(g.view().forest.cells.find(c => c.i === ROAD && c.j === 0).state, 'trees');
  g.act(`drop:${ROAD}:0`);
  assert.match(say(g), /Those trees are damp now, slower to catch for 2 spreads\. But the flames are still burning/);
  run(g, 1.2); assert.equal(g.view().forest.cells.find(c => c.i === ROAD && c.j === 0).state, 'damp');
  // Put out another way, Brian does not praise the order: only the pointer's order earns "each time".
  for (let n = 0; n < 40 && !g.view().ready; n++) { const v = g.view(); if (v.keys.Space === 'drop') g.act(v.target); else run(g, .25); }
  if (g.view().ready) assert.match(say(g), /Next time start with the flames nearest the road/);
  else assert.equal(g.view().job.lost, true);
  // Arrow keys aim and stop at the edge; a drop at the aim.
  const k = createClassroomSession(lesson);
  playThroughTo(k, 'alone');
  k.act('aim:left'); assert.deepEqual(k.view().forest.aim, [0, MIDDLE]);
  for (let n = 0; n < 9; n++) k.act('aim:right');
  assert.deepEqual(k.view().forest.aim, [COLS - 1, MIDDLE]);
  k.act('aim:up'); k.act('drop'); assert.equal(k.view().forest.splash.i, COLS - 1); assert.equal(k.view().forest.splash.j, MIDDLE - 1);
});

test('the questions: each wrong answer says why', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  const wrong = {
    'check-lid': [[side('heat'), /The stove is still hot under the pan/], [side('fuel'), /The oil is still in the pan under the lid/]],
    'check-coat': [['1', /Retardant never puts out flames that are already burning/], ['2', /Behind the flames the forest has burnt already/]],
    'check-game': [['1', /only makes them damp, slower to catch for 2 spreads/], ['2', /furthest from the road\. While you put them out, the front reaches the road/]],
  };
  for (const id of ['check-lid', 'check-coat', 'check-game']) {
    for (const [answer, why] of wrong[id]) {
      session.act('back'); session.act(`go:${STEPS.findIndex(s => s.id === id)}`);
      session.act(`answer:${answer}`);
      assert.match(say(session), why, `${id} answer ${answer}`);
      assert.equal(session.view().ready, true, 'a wrong answer is a lesson, not a wall');
    }
  }
  session.act('back'); session.act(`go:${STEPS.findIndex(s => s.id === 'check-coat')}`); session.act('answer:0');
  assert.match(say(session), /The tank’s 600 litres coat 4 cells of forest, 150 litres each/);
  session.act('back'); session.act(`go:${STEPS.findIndex(s => s.id === 'check-game')}`); session.act('answer:0');
  assert.match(say(session), /A cell burning at full strength takes 180 litres to put out, so one full bucket puts out 3 of those; smaller flames take less/);
});

test('help climbs from a nudge to a plain step to Brian pointing at the exact control, and Show me presses it', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-fuel');
  for (const rung of [1, 2, 3]) { session.help(); assert.equal(session.view().help, rung); assert.equal(say(session), session.view().hints[rung - 1]); }
  assert.equal(session.view().pointer.action, 'wood:in');
  run(session, SHOW_ME_S + .1);
  assert.equal(session.view().pit.fuel, true);
  assert.match(say(session), /^That is how it is done./);
  playThroughTo(session, 'try-water');
  session.act('answer:0');
  session.help(); session.help(); session.help();
  assert.equal(session.view().pointer.action, 'tip');
  run(session, SHOW_ME_S + .1);
  assert.ok(session.view().pit.pour, 'Brian tipped the bucket');
  playThroughTo(session, 'alone');
  session.help(); session.help(); session.help();
  const target = session.view().target;
  assert.match(target, /^drop:\d:\d$/);
  run(session, SHOW_ME_S + .1);
  assert.equal(session.view().job.trips, 1);
  // Stuck: an offer at 12 s, the first hint at 25 s.
  const s = createClassroomSession(lesson);
  playThroughTo(s, 'word-heat');
  run(s, 13); assert.match(s.view().nudge.text, /Stuck\?/);
  run(s, 13); assert.equal(s.view().help, 1);
});

test('the board draws every step and card, hit-tests its controls and points at every target', () => {
  const calls = new Set();
  const fake = () => new Proxy({}, {get: (target, name) => {
    if (name in target) return target[name];
    if (name === 'measureText') return value => ({width: String(value).length * 9});
    if (['createLinearGradient', 'createRadialGradient'].includes(name)) return () => ({addColorStop() {}});
    return () => { calls.add(name); };
  }, set: (target, name, value) => { target[name] = value; return true; }});
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'recap');
  for (let i = 0; i < STEPS.length; i++) {
    session.act(`go:${i}`);
    for (const t of [0, 1, 4]) {
      run(session, t);
      calls.clear(); drawBoard(fake(), session.view(), 1000, 680);
      assert.ok(calls.has('fillText') && (calls.has('fillRect') || calls.has('fill')), `${STEPS[i].id} draws its board`);
      const v = session.view();
      if (v.target) assert.equal(hitTest(v, ...targetPoint(v, v.target))?.action, v.target, `${STEPS[i].id}: a click where the pointer is does ${v.target}`);
    }
    for (const c of session.view().cards) { calls.clear(); drawPicture(fake(), c.picture, 220, 110); assert.ok(calls.has('fill') || calls.has('fillRect') || calls.has('stroke'), `${c.id} draws a picture`); }
  }
  // Every step of every phase: a click where the pointer is does what the pointer shows, and the plates take clicks.
  const s = createClassroomSession(lesson);
  for (const id of ['word-fuel', 'word-heat', 'word-oxygen', 'word-triangle']) {
    playThroughTo(s, id);
    const v = s.view();
    assert.equal(hitTest(v, ...targetPoint(v, v.target)).action, v.target, id);
    assert.match(hoverInfo(v, ...targetPoint(v, v.target)), /switch: it gives the fire its/);
  }
  playThroughTo(s, 'try-water'); s.act('answer:1');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'tip')).action, 'tip');
  playThroughTo(s, 'try-strip');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'rake')).action, 'rake');
  s.act('rake'); s.act('answer:0');
  assert.equal(hitTest(s.view(), ...targetPoint(s.view(), 'burn')).action, 'burn');
  playThroughTo(s, 'alone');
  for (let n = 0; n < 6 && !s.view().ready; n++) {
    const v = s.view();
    if (v.keys.Space !== 'drop') { run(s, .25); n--; continue; }
    assert.equal(hitTest(v, ...targetPoint(v, v.target)).action, v.target, 'a click on the pointed cell drops there');
    assert.match(hoverInfo(v, ...targetPoint(v, v.target)), /Burning at \d+% strength: it takes \d+ litres of water to put out/);
    s.act(v.target);
  }
  // The keys drawn on the board take clicks too: Space under the job drops at the aim.
  const k = createClassroomSession(lesson);
  playThroughTo(k, 'alone');
  assert.equal(hitTest(k.view(), 280, 546).action, 'drop');
  const r = createClassroomSession(lesson);
  playThroughTo(r, 'word-retardant');
  assert.equal(hitTest(r.view(), 482, 156).action, 'coat');
});

test('Previous step shows a finished word as it was, and Watch again plays the Watch from the start', () => {
  const session = createClassroomSession(lesson);
  playThroughTo(session, 'word-triangle');
  session.act('back');
  assert.equal(session.view().step.id, 'word-oxygen');
  assert.equal(session.view().pit.air, false); assert.equal(session.view().pit.flame, 0);
  assert.match(say(session), /That is why my lid worked/);
  assert.equal(session.view().ready, true);
  playThroughTo(session, 'watch');
  until(session, x => x.ready);
  assert.equal(session.view().table.filter(Boolean).length, 3);
  session.act('replay');
  assert.equal(session.view().table.filter(Boolean).length, 0);
  until(session, x => x.table.filter(Boolean).length === 3);
  until(session, x => /R to watch again/.test(x.prompt));
  assert.match(say(session), /Each time one side went, the fire died/);
});
