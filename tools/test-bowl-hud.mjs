import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {bowlHudView, sayBowlLine} from '../src/bowl/bowl-night.js';
import {bowlHealth, bowlHealthHit, bowlResultReady, bowlStrip, bowlTrickPopup, bowlTrickPopups, bowlWaypoint,
  freestyleBestLabel, playBowlHudCue} from '../src/bowl/bowl-hud.js';
import {SHOW_NIGHTS} from '../src/bowl/bowl-show.js';
import {BIG_MO, freestyleLines} from '../src/bowl/bowl-lines.js';
import {rearViewActive} from '../src/rear-view.js';
import {combatXpCue} from '../src/combat-hud.js';
import {presentJumpHeight} from '../src/screen-hud.js';
import {stepBowlTricks} from '../src/bowl/bowl-tricks.js';

const duel = new Duel({seed: 1989});
duel.featureFlags = {enabled: name => name === 'titan-bowl'};
const captions = [];
duel.onChange((_, event) => { if (event.bowlCaption) captions.push(event.bowlCaption.id); });

function start(night, eventIndex, options = {}) {
  captions.length = 0;
  assert.ok(duel.startBowlNight({night, eventIndex, cpuDifficulty: 'easy', ...options}));
  return duel.state.bowlNight;
}

for (const [night, index, name, goal] of [
  [1, 0, 'Car Crush', 'Crush 13 pieces.'],
  [1, 1, 'Freestyle', `Beat Old Bess's ${SHOW_NIGHTS[0].freestyle.target.easy.toLocaleString('en-US')} points.`],
  [1, 2, 'Side by Side', 'Beat Old Bess over two laps.'],
  [3, 2, 'Last Truck Rolling', 'Be the last truck rolling.'],
  [5, 2, 'The Scrapasaurus', 'WATCH THE SCRAPASAURUS'],
]) {
  start(night, index);
  const strip = bowlStrip(duel.state, bowlHudView(duel.state, duel.course));
  assert.equal(strip.name, name);
  assert.equal(strip.goal, goal);
  assert.ok(strip.goal.split(/\s+/).length <= (name === 'The Scrapasaurus' ? 5 : 8));
  assert.equal(strip.points, name === 'Freestyle' ? '' : '0 points');
  assert.equal(strip.crowdLabel, 'CROWD x1.0');
  assert.match(strip.time, /^\d+:\d{2}$/, 'every current Bowl event has a visible clock');
  assert.equal(captions.length, 1, 'one caption starts an event');
  assert.equal(rearViewActive(duel.state, duel.course), false, 'the Bowl skips the rear-view render pass');
}

{
  const night = start(1, 0);
  assert.deepEqual(captions, ['event.carCrush.intro'], 'the opening and loan lines stay on the opening card');
  sayBowlLine(duel, 'rex.tell');
  sayBowlLine(duel, 'rex.rest');
  sayBowlLine(duel, 'rex.scorch');
  while (night.clock < 66) duel.step(1 / 60);
  assert.deepEqual(captions, ['event.carCrush.intro', 'rex.tell', 'crush.hint', 'event.lost.carCrush'],
    'stale queued lines never play, and the fresh idle-run result still plays');
}

{
  start(1, 0, {turn: {driver: 'Gratian'}});
  assert.deepEqual(captions, ['turn.open'], 'the next driver hears one welcome');
  const night = duel.state.bowlNight;
  Object.assign(night.event, {count: 7, chain: 3});
  const view = {...bowlHudView(duel.state, duel.course), crowd: 40};
  const strip = bowlStrip(duel.state, view);
  assert.equal(strip.crushLabel, 'CRUSHED 7 OF 13');
  assert.equal(strip.chainLabel, 'CHAIN x3');
  assert.equal(strip.crowdLabel, 'CROWD x1.4');
  night.event.count = 13;
  assert.equal(bowlStrip(duel.state, view).crushLabel, 'CRUSHED 13 OF 31 · GOAL MET');
  night.event.count = 15;
  assert.equal(bowlStrip(duel.state, view).crushLabel, 'CRUSHED 15 OF 31 · GOAL MET');
}

{
  const actor = {armor: 50, maxArmor: 60, damageZones: {front: 1, right: 0, rear: 2.5, left: 0}};
  const before = bowlHealth(actor);
  assert.deepEqual(before.segments.map(segment => Number(segment.toFixed(2))), [1, 1, 1, 1, .17]);
  assert.deepEqual(before.zones, {front: .8, right: 1, rear: .5, left: 1});
  assert.equal(before.danger, false);
  actor.armor = 12;
  actor.damageZones.front = 4.5;
  const after = bowlHealth(actor);
  assert.deepEqual(after.segments, [1, 0, 0, 0, 0]);
  assert.equal(after.danger, true);
  assert.deepEqual(bowlHealthHit(before, after), {zone: 'front', lost: 38});
  assert.equal(bowlHealthHit(after, before), null);
  const scorched = bowlHealth(actor, {value: 4, max: 5});
  assert.deepEqual(bowlHealthHit(bowlHealth(actor, {value: 5, max: 5}), scorched), {zone: null, lost: 1});
}

{
  const record = {kind: 'backflip', turns: 2, base: 200, multiplier: 1.4, points: 280, fresh: true, at: 4};
  assert.deepEqual(bowlTrickPopup(record, 5.49), {name: 'DOUBLE BACKFLIP', points: '200 x1.4 = 280', fresh: true});
  assert.equal(bowlTrickPopup({...record, multiplier: 1.44, points: 288}, 4).points, '200 x1.44 = 288');
  assert.equal(bowlTrickPopup({...record, multiplier: 1.436, points: 287}, 4).points, '200 x1.44 ≈ 287');
  assert.equal(bowlTrickPopup(record, 5.5), null);
  const state = {bowlNight: {event: {trickPopups: [record]}, clock: 5.49}};
  const view = {event: 'freestyle', target: SHOW_NIGHTS[0].freestyle.target.easy, crowd: 83, score: 280};
  assert.equal(bowlStrip(state, view).crowdLabel, 'CROWD x1.4');
  assert.equal(bowlStrip(state, view).crowd, 40);
  state.bowlNight.clock = 5.5;
  assert.equal(bowlStrip(state, view).crowdLabel, 'CROWD x1.8');
  assert.equal(bowlResultReady({clock: 11.99, resultAt: 10, lastResult: {won: true, event: 'freestyle'}}), false);
  assert.equal(bowlResultReady({clock: 12, resultAt: 10, lastResult: {won: true, event: 'freestyle'}}), true);
  assert.equal(bowlResultReady({clock: 19.99, resultAt: 10, lastResult: {won: true, event: 'scrapasaurus'}}), false);
  assert.equal(bowlResultReady({clock: 20, resultAt: 10, lastResult: {won: true, event: 'scrapasaurus'}}), true);
}

{
  const night = start(1, 1), {event} = night;
  const view = () => bowlStrip(duel.state, bowlHudView(duel.state, duel.course));
  assert.equal(view().gapLabel, 'YOU 0, OLD BESS 0, TIED');
  Object.assign(event, {score: 640, rivalScore: 520, rivalPopup: {trick: 'Donut', points: 40, at: 8}});
  night.clock = 8;
  assert.equal(view().gapLabel, 'YOU 640, OLD BESS 520, AHEAD BY 120');
  assert.match(view().chainLabel, /BACKFLIP x2/);
  assert.equal(view().freestylePopup, 'OLD BESS: DONUT 40');
  event.score = 440;
  night.clock = 9.5;
  assert.equal(view().gapLabel, 'YOU 440, OLD BESS 520, BEHIND BY 80');
  assert.equal(view().freestylePopup, '');
  assert.equal(freestyleBestLabel(view(), 2140), '');
  event.rivalBeaten = true;
  assert.equal(freestyleBestLabel(view(), 2140), 'OLD BESS BEATEN · YOUR BEST 2,140');
  for (const {freestyle} of SHOW_NIGHTS.filter(night => night.freestyle)) {
    assert.ok(Object.values(freestyleLines(freestyle.name)).every(line => !/\b(?:wall|stands|car park)\b/i.test(line)));
  }
}

{
  start(1, 2);
  const state = duel.state, rival = state.opponents[0];
  const strip = () => bowlStrip(state, bowlHudView(state, duel.course));
  assert.equal(strip().gapLabel, 'LEVEL 0 m');
  state.s += 17;
  assert.equal(strip().gapLabel, 'AHEAD 17 m');
  rival.s += 23;
  assert.equal(strip().gapLabel, 'BEHIND 6 m');
}

{
  const night = start(1, 1);
  const state = duel.state;
  state.status = 'racing';
  duel.emit({bowlTrick: {kind: 'backflip', turns: 2, points: 200, fresh: true, landing: 'clean'}});
  assert.deepEqual(night.trickKinds, ['backflip']);
  assert.equal(night.event.trickPopups[0].points, night.event.score);
  assert.equal(bowlTrickPopup(night.event.trickPopups[0], night.clock).fresh, true);
  assert.equal(rearViewActive({status: 'racing'}, duel.course), true, 'a course alone does not disable the rear view');
}

{
  const night = start(5, 2);
  duel.state.status = 'racing';
  for (const phase of ['lift', 'throw']) {
    night.event.rex.phase = phase;
    const view = bowlHudView(duel.state, duel.course);
    assert.equal(bowlStrip(duel.state, view).goal, 'Dodge the thrown car.');
  }
  night.clock = 8;
  duel.emit({bowlRex: {type: 'fall'}});
  assert.equal(night.event.resultHoldSince, 8);
  const result = {...night, resultAt: 11, lastResult: {won: true, event: 'scrapasaurus'}};
  assert.equal(bowlResultReady({...result, clock: 17.99}), false);
  assert.equal(bowlResultReady({...result, clock: 18}), true, 'the wait starts when the Rex falls');
}

{
  const calls = [], output = {};
  const audio = {paused: true, muted: false, output, context: {state: 'running'}, _playCue: (...args) => calls.push(args)};
  playBowlHudCue({audio}, 'bowl.card.open');
  assert.deepEqual(calls, [['bowl.card.open', {destination: output, scale: .42}]]);
  audio.muted = true;
  playBowlHudCue({audio}, 'bowl.card.open');
  assert.equal(calls.length, 1, 'the paused cue still respects mute');
}

{
  const jump = {phase: 'landed', peakMeters: 2, heightMeters: 0};
  const readout = {update: () => jump};
  const ui = {'jump-height-panel': {dataset: {}}};
  const app = {duel: {course: {def: {}}}};
  const wreck = {combatWreck: true, victim: 'rival', owner: 'player'};
  presentJumpHeight(readout, {}, app, ui, () => {});
  assert.equal(ui['jump-height-panel'].hidden, false);
  assert.match(combatXpCue(wreck, {}), /NOTORIETY/);
  start(3, 2);
  app.duel.course = duel.course;
  presentJumpHeight(readout, duel.state, app, ui, () => {});
  assert.equal(ui['jump-height-panel'].hidden, true);
  assert.equal(combatXpCue(wreck, duel.state), null);
  presentJumpHeight(readout, {}, app, ui, () => {});
  assert.equal(ui['jump-height-panel'].hidden, true, 'a standalone Bowl course also suppresses the jump panel');
  assert.equal(combatXpCue(wreck, {}, duel.course), null);
  for (const event of ['sideBySide', 'lastTruckRolling'])
    assert.match(BIG_MO['event.won.' + event], /belongs to our driver/);
}

for (const [eventType, result, label] of [
  ['longJump', 4, 'BEST GO: 4 BUSES'],
  ['highJump', 8, 'BEST GO: 8 m'],
  ['bestTrick', 270, 'BEST GO: 270 POINTS'],
]) {
  const night = start(1, 0, {eventType});
  const strip = () => bowlStrip(duel.state, bowlHudView(duel.state, duel.course));
  assert.equal(strip().bestGoLabel, '');
  night.event.bestGo = {result};
  assert.equal(strip().bestGoLabel, label);
}

{
  start(1, 1);
  const {state, course} = duel;
  const gate = course.features.bowl.gates[1], aim = course.worldAt(gate.s + 10, gate.lateral);
  state.bowlOutside = {where: 'carpark', gate: {...gate, aim, metres: 63.5}};
  const strip = () => bowlStrip(state, bowlHudView(state, course));
  assert.equal(strip().gateLabel, gate.name.toUpperCase() + ' · 64 m');
  const visible = bowlWaypoint(state, course, () => ({x: .6, y: .4, visible: true}));
  assert.deepEqual(visible, {x: .6, y: .4, angle: 180, edge: false});
  const offscreen = bowlWaypoint(state, course, () => ({x: 0, y: .5, visible: false}));
  assert.ok(offscreen.edge && offscreen.x < .05 && offscreen.angle === -90);
  delete state.bowlOutside;
  assert.equal(strip().gateLabel, '');
  assert.equal(bowlWaypoint(state, course, () => null), null);
}

{
  const night = start(1, 0);
  const {state, course} = duel;
  const pile = course.features.crushables.find(piece => piece.bowlCrushGroup === 'bowl-bus-pile');
  Object.assign(state, {status: 'racing', s: pile.s - 4, lateral: pile.off});
  const cues = [];
  const unsubscribe = duel.onChange((_, ev) => {
    if (ev.bowlCaption?.id === 'crush.hint') cues.push(ev.bowlCaption.cue);
  });
  const view = () => bowlHudView(state, course);
  while (state.stageTimeSec < 7.9) duel.step(1 / 120);
  assert.equal(night.event.crushHint, undefined);
  while (state.stageTimeSec < 8.1) duel.step(1 / 120);
  const target = night.event.crushHint;
  const here = course.worldAt(state.s, state.lateral);
  assert.equal(target.id, pile.id);
  assert.ok(course.features.crushables.every(piece =>
    Math.hypot(target.x - here.x, target.z - here.z) <= Math.hypot(piece.x - here.x, piece.z - here.z)));
  assert.equal(view().caption, 'Steer for the Bus Pile!');
  assert.ok(bowlWaypoint(state, course, point => {
    assert.equal(point, target);
    return {visible: true, x: .68, y: .45};
  }).edge);
  while (state.stageTimeSec < 16.2) duel.step(1 / 120);
  assert.deepEqual(cues, ['bowl.crush.hint']);
  assert.equal(night.event.crushHint, target, 'the arrow stays on its selected piece until another crush');
  const car = course.features.crushables.find(piece => piece.bowlPancakeRamp);
  duel.emit({propCrushed: {id: car.id, kind: car.sourceKind, pancake: true, byPlayer: true}});
  assert.equal(night.event.crushHint, undefined);
  assert.equal(bowlWaypoint(state, course, () => null), null);
  assert.equal(bowlTrickPopups(night.event, night.clock).at(-1).name, 'PANCAKE x3');
  assert.equal(bowlTrickPopups(night.event, night.clock + 1.51).length, 0);
  while (state.stageTimeSec < 24.4) duel.step(1 / 120);
  assert.deepEqual(cues, ['bowl.crush.hint', 'bowl.crush.hint'], 'a different dry spell can earn one new cue');
  unsubscribe();
}

for (const [height, visible] of [[.8, false], [1, true]]) {
  const night = start(1, 1);
  const {state, course} = duel;
  const lateral = course.features.bowl.outside.wall + 1;
  Object.assign(state, {status: 'racing', airborne: true, airHeight: height,
    lateral, prevLateral: lateral, _verticalSpeed: 0});
  duel.setInput({throttle: 0, brake: 0, boost: false, steer: 0});
  stepBowlTricks(duel, state, 1 / 120);
  let late = 0;
  const unsubscribe = duel.onChange((_, ev) => { if (ev.bowlTrickLate) late++; });
  duel.setInput({brake: 1});
  stepBowlTricks(duel, state, 1 / 120);
  assert.equal(late, Number(visible));
  assert.equal(bowlTrickPopups(night.event, night.clock).some(popup => popup.name === 'NOT ENOUGH AIR'), visible);
  duel.emit({bowlTrick: {kind: 'backflip', turns: 1, points: 50, repeat: 1, landing: 'clean'}});
  assert.ok(night.event.score > 0, 'the height cutoff applies to the message');
  assert.equal(bowlTrickPopups(night.event, night.clock).some(popup => popup.name === 'BACKFLIP'), visible);
  unsubscribe();
}

for (const eventType of ['freestyle', 'longJump', 'highJump', 'bestTrick']) {
  const night = eventType === 'freestyle' ? start(1, 1) : start(1, 0, {eventType});
  const {state, course} = duel;
  state.status = 'racing';
  let leaked = false;
  const unsubscribe = duel.onChange((_, ev) => { if (ev.bowlSchool?.type === 'why') leaked = true; });
  for (const reason of ['wheelieSpeed', 'heldThrottle']) duel.emit({bowlTrickTry: {reason}});
  assert.equal(leaked, false);
  assert.doesNotMatch(bowlHudView(state, course).caption, /too fast for a wheelie|kept W held/);
  if (eventType !== 'freestyle') {
    duel.setInput({throttle: 1, boost: true, brake: 0, steer: 0});
    for (let tick = 0; tick < 120 && !state.boosting; tick++) {
      duel.step(1 / 120);
      assert.equal(state.bowlGroundTrick, null, eventType + ' run-up never starts a ground trick');
    }
    assert.ok(state.boosting && !night.event.go.launched, eventType + ' run-up uses nitro');
  }
  unsubscribe();
}

{
  const night = start(1, 0, {school: {completed: ['wheelie', 'stoppie']}});
  const {state, course} = duel;
  const table = course.features.ramps.find(ramp => ramp.id === 'table');
  duel.setInput({throttle: 1, boost: true, steer: 1, brake: 0});
  for (let tick = 0; tick < 600 && night.event.lesson === 'donut'; tick++) duel.step(1 / 120);
  assert.equal(night.event.lesson, 'spin');
  for (let tick = 0; tick < 120; tick++) duel.step(1 / 120);
  assert.deepEqual([state.s, state.lateral, state.headingError, state.speedMph], [table.start - 27, table.off, 0, 0]);
  assert.equal(state.bowlGroundTrick, null, 'the old donut chord leaves the new run-up lined up');
  duel.setInput({throttle: 1, boost: false, steer: 0});
  for (let tick = 0; tick < 60; tick++) duel.step(1 / 120);
  assert.ok(state.s > table.start - 27 && state.speedMph > 0, 'the truck drives toward the Table on release');
}

console.log('Bowl HUD goals, caption timing, trick results, damage and result timing passed.');
