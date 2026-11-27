// HOME-GROUND-1: the player's own ground, without graphics (docs/board/cards/HOME-GROUND-1.md). Placing, refusing,
// lifting, the lane from the gate, marks made from above, the solids, the burst, a save and a reload, the save made
// before this card, and the switch off. Memory-only storage: no real save is read or written.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAYERS_KEY, activePlayer, loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {newWorld} from '../src/world/open/open-record.js';
import {savedOpenRecord, settleOpenWorld} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {homePart} from '../src/world/open/parts/home.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {createJobSolidGrid, SOLID_GRID, SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {distanceToNet} from '../src/world/scablands-road.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {tinTownGateFor} from '../src/world/tin-town-gate.js';
import {LAND} from '../src/world/scablands-names.js';
import {FOOT_BURST, HOME_CELLS, HOME_CORNER, HOME_CUES, HOME_OFFER_ID, HOME_PANELS, HOME_SIZE, HOME_WORDS,
  defaultHomeName} from '../src/world/open/content/home-ground.js';
import {boardSpot, build, cleanHomeName, groundPoint, homeSolids, lift, newHome, outlineFor, panelsLeft, pieceInLand,
  readableHome, refusal, slotInFront, toggleMark} from '../src/world/open/home-rule.js';
import {homeCameraPose, stepHomeLift} from '../src/world/open/home-camera.js';
import {FEATURE_STATES} from '../src/feature-flags.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const DT = 1 / 60;
const parts = [homePart];

check(FEATURE_STATES['home-ground'] === 'dev', 'the ground is behind the development switch home-ground');

// ---- The place: flat, clear of roads, solids and other places, a short walk from Tin Town's gate. ----------------
{
  let low = Infinity, high = -Infinity, road = Infinity;
  for (let x = 0; x <= HOME_SIZE; x += 2) for (let z = 0; z <= HOME_SIZE; z += 2) {
    const h = scablandsSurfaceHeightAt(HOME_CORNER.x + x, HOME_CORNER.z + z);
    low = Math.min(low, h); high = Math.max(high, h);
    if (x % 4 === 0 && z % 4 === 0) road = Math.min(road, distanceToNet(HOME_CORNER.x + x, HOME_CORNER.z + z));
  }
  check(high - low < .8, 'the ground rises less than 0.8 m across its 40 m');
  check(road - 14 > 15, 'the ground is more than 15 m from the edge of any road');
  const clear = SCABLANDS_SOLIDS.every(solid => solid.x < HOME_CORNER.x - 15 || solid.x > HOME_CORNER.x + HOME_SIZE + 15 ||
    solid.z < HOME_CORNER.z - 15 || solid.z > HOME_CORNER.z + HOME_SIZE + 15);
  check(clear, 'no solid of the land stands within 15 m of the ground');
  const gate = tinTownGateFor(LAND).gate;
  const walk = Math.hypot(HOME_CORNER.x + HOME_SIZE - gate.x, HOME_CORNER.z - gate.z);
  check(walk < 60, 'the ground\'s nearest corner is less than 60 m from Tin Town\'s gate');
}

// ---- A small open land with only this part, and a way to step it. ----------------------------------------------
function openLand(world = newWorld({seed: 5, night: 2})) {
  return beginOpenLand({id: 'roam-test', steps: [{kind: 'roam'}], open: {world}});
}
const auntie = {id: 'auntie-solder', position: {x: 5980, y: 0, z: 10}};
function viewOf(fighter, keys = {}, extra = {}) {
  return {openRoam: true, homeGround: true, onFoot: !!fighter, fighter: fighter && {position: {x: fighter.x, y: 0, z: fighter.z}, yaw: fighter.yaw},
    carPosition: null, interact: false, people: [auntie], playerName: 'Gratian', jobEvents: [], homeKeys: keys, ...extra};
}
function run(open, view, seconds) {
  const events = [], requests = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const out = stepOpenLand(open, view, DT, parts);
    open = out.open; events.push(...out.events); requests.push(...out.requests);
    view = {...view, jobEvents: []};
  }
  return {open, events, requests};
}
const cues = events => events.filter(event => event.type === 'homeCue').map(event => event.cue);
const homeOf = open => open.world.open.home;
const given = () => {
  let open = openLand();
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT).open;
  return run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT).open;
};

// ---- The switch off: nothing is read, written or asked to be drawn. ---------------------------------------------
{
  let open = openLand();
  const record = JSON.stringify(open.world.open);
  const view = {...viewOf({x: 5920, z: 120, yaw: 0}, {build: true, view: true, burst: true, forward: true}), homeGround: undefined};
  const out = run(open, view, 1);
  equal(out.events, [], 'with the switch off the ground raises no event');
  equal(out.requests, [], 'with the switch off the ground asks for nothing');
  equal(JSON.stringify(out.open.world.open), record, 'with the switch off the open record is unchanged');
  check(out.open.parts.home?.on !== true, 'with the switch off the drawing has nothing to draw');
  // Even a saved ground is not read: the part does not look at it while its switch is off.
  const withHome = {...open.world, open: {...open.world.open, home: build(newHome('Kept'), {kind: 'panel', i: 3, j: 3, axis: 'x'})}};
  const kept = run(openLand(withHome), view, .5);
  equal(kept.requests, [], 'with the switch off a saved ground stands no solids and asks for nothing');
}

// ---- Auntie Solder gives him the ground. ------------------------------------------------------------------------
{
  let open = openLand();
  let out = run(open, viewOf({x: 5915, z: 110, yaw: 0}), DT);
  equal(out.open.parts.home.prompt, HOME_WORDS.askAuntie, 'at the bare ground before the talk he is told to ask Auntie Solder');
  out = run(out.open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT);
  const talk = out.requests.find(request => request.type === 'talk');
  check(talk?.id === HOME_OFFER_ID && talk.speaker === 'auntie-solder' && talk.threadPriority === true,
    'pressing F beside Auntie Solder opens her one talk about the ground');
  check(homeOf(out.open) === undefined, 'the ground is not his before he answers');
  out = run(out.open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT);
  equal(homeOf(out.open), newHome(defaultHomeName('Gratian')), 'his answer gives him the ground under his own name');
  check(out.requests.some(request => request.type === 'marker' && request.place), 'the ground is marked for him');
  check(out.requests.some(request => request.type === 'say' && request.text === HOME_WORDS.given), 'he is told where the panels are');
}

// ---- Placing by hand: three seconds of the build key, at the outline in front of him. ---------------------------
const standAt = (i, j, yaw = Math.PI) => ({...groundPoint(i, j), yaw});
{
  let open = given();
  // He stands 1.6 m south of the line j = 5, facing north: the panel runs east and west across his way.
  const me = {...groundPoint(6.5, 5.8), yaw: Math.PI};
  const expected = slotInFront('panel', me, me.yaw);
  equal(expected, {kind: 'panel', i: 6, j: 5, axis: 'x'}, 'the outline stands across the way he faces, on the 2 m grid');
  let out = run(open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'build', 'the outline is ready to build on clear ground');
  check(out.open.parts.home.prompt.includes('Hold B'), 'the sentence tells him to hold B');
  out = run(out.open, viewOf(me, {build: true}), 2);
  equal(homeOf(out.open).pieces, [], 'two seconds of hammering do not raise a panel');
  check(out.open.parts.home.outline.progress > .6 && out.open.parts.home.outline.progress < .7, 'the outline fills as he hammers');
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.progress, 0, 'letting go of B starts the hammering again');
  out = run(out.open, viewOf(me, {build: true}), 3.05);
  equal(homeOf(out.open).pieces, [expected], 'three seconds of holding B hammer the panel up where the outline stood');
  const heard = cues(out.events);
  check(heard.filter(cue => cue === HOME_CUES.hammer).length >= 5 && heard.includes(HOME_CUES.up), 'each strike and the panel going up have their cues');
  equal(panelsLeft(homeOf(out.open)), HOME_PANELS - 1, 'one panel fewer is carried');
  // Turning a quarter: R turns the outline to run north and south.
  out = run(out.open, viewOf({...groundPoint(9.5, 6.3), yaw: Math.PI}, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'z', 'R turns the piece a quarter');
  out = run(out.open, viewOf({...groundPoint(9.5, 6.3), yaw: Math.PI}, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'z', 'holding R does not keep turning it');

  out = run(out.open, viewOf(me), DT);
  out = run(out.open, viewOf(me, {turn: true}), DT);
  equal(out.open.parts.home.outline.piece.axis, 'x', 'a second press turns it back');
  // Lifting: the panel he faces is offered, and one press of B picks it up, free.
  out = run(out.open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'lift', 'facing a panel offers to pick it up');
  equal(out.open.parts.home.prompt, 'Press B to pick up this tin panel.', 'the sentence says so');
  out = run(out.open, viewOf(me, {build: true}), DT);
  equal(homeOf(out.open).pieces, [], 'one press of B picks the panel up');
  check(cues(out.events).includes(HOME_CUES.lift), 'picking up has its cue');
  equal(panelsLeft(homeOf(out.open)), HOME_PANELS, 'the panel is back in his hands');
  out = run(out.open, viewOf(me, {build: true}), .5);
  equal(homeOf(out.open).pieces, [], 'the same press does not hammer the panel back up at once');
}

// ---- Refusing, with a plain sentence for each. ------------------------------------------------------------------
{
  const home = newHome('Test');
  equal(refusal(home, {kind: 'panel', i: 20, j: 3, axis: 'x'}), 'offGround', 'a panel off the ground is refused');
  equal(refusal(home, {kind: 'panel', i: -1, j: 3, axis: 'x'}), 'offGround', 'a panel west of the ground is refused');
  equal(refusal(home, {kind: 'gate', i: 6, j: 6, axis: 'x'}), 'gateEdge', 'the gate must hang in the outside fence');
  const one = build(home, {kind: 'panel', i: 4, j: 0, axis: 'x'});
  equal(refusal(one, {kind: 'gate', i: 3, j: 0, axis: 'x'}), 'onTop', 'the gate cannot stand on top of a panel');
  // The gate hangs in the north fence from node 8 to node 12; its lane runs south from there to the far fence.
  const gated = build(home, {kind: 'gate', i: 8, j: 0, axis: 'x'});
  equal(gated.pieces.length, 1, 'the gate hangs in the north fence');
  equal(refusal(gated, {kind: 'panel', i: 9, j: 5, axis: 'x'}), 'lane', 'a panel across the lane is refused');
  equal(refusal(gated, {kind: 'panel', i: 10, j: 12, axis: 'z'}), 'lane', 'a panel standing in the middle of the lane is refused');
  equal(refusal(gated, {kind: 'panel', i: 8, j: 5, axis: 'z'}), null, 'a panel along the lane\'s side is allowed');
  equal(refusal(gated, {kind: 'panel', i: 9, j: HOME_CELLS, axis: 'x'}), null, 'the far fence may close the lane\'s end');
  equal(refusal(gated, {kind: 'panel', i: 2, j: 5, axis: 'x'}), null, 'a panel beside the lane is allowed');
  const blocked = build(home, {kind: 'panel', i: 9, j: 5, axis: 'x'});
  equal(refusal(blocked, {kind: 'gate', i: 8, j: 0, axis: 'x'}), 'gateLane', 'a gate whose lane a panel crosses is refused');
  equal(refusal(gated, {kind: 'gate', i: 0, j: 4, axis: 'z'}), 'noGate', 'he has one gate');
  equal(refusal(gated, {kind: 'panel', i: 9, j: 0, axis: 'x'}), 'onTop', 'nothing stands on the gate');
  for (const reason of ['offGround', 'gateEdge', 'onTop', 'lane', 'gateLane', 'noPanels', 'noGate'])
    check(/^[A-Z].*\.$/.test(HOME_WORDS[reason]) && !HOME_WORDS[reason].includes('—'), 'the refusal "' + reason + '" is a plain sentence');
  let full = newHome('Full');
  for (let n = 0; n < HOME_PANELS; n++) full = build(full, {kind: 'panel', i: n % 20, j: 1 + Math.floor(n / 20) * 2, axis: 'x'});
  equal(refusal(full, {kind: 'panel', i: 0, j: 10, axis: 'x'}), 'noPanels', 'with no panels left another is refused');
  equal(outlineFor(gated, {kind: 'panel', i: 9, j: 0, axis: 'x'}).mode, 'lift', 'a panel aimed at the gate offers to take it down');

  // In play: the red outline says why, and pressing B is answered with its cue and nothing built.
  let open = given();
  open = {...open, world: applyEffects(open.world, {id: 'home-ground/test', effects: [{type: 'home', record: gated}]}).world};
  const me = {...groundPoint(10.5, 5.8), yaw: Math.PI};
  let out = run(open, viewOf(me), DT);
  equal(out.open.parts.home.outline.mode, 'refused', 'the outline across the lane turns red');
  equal(out.open.parts.home.prompt, HOME_WORDS.lane, 'and says why in a sentence');
  out = run(out.open, viewOf(me, {build: true}), 3.5);
  equal(homeOf(out.open).pieces.length, 1, 'holding B on a red outline builds nothing');
  check(cues(out.events).includes(HOME_CUES.refused), 'the refusal has its cue');
}

// ---- The gate, the name, the board and the solids. --------------------------------------------------------------
{
  let open = given();
  const me = {...groundPoint(10, .8), yaw: Math.PI};
  let out = run(open, viewOf(me, {piece: true}), DT);
  equal(out.open.parts.home.kind, 'gate', 'G changes the piece to the gate');
  equal(out.open.parts.home.outline.piece, {kind: 'gate', i: 8, j: 0, axis: 'x'}, 'the gate\'s outline stands centred in front of him');
  out = run(out.open, viewOf(me, {build: true}), 4.05);
  equal(homeOf(out.open).pieces, [{kind: 'gate', i: 8, j: 0, axis: 'x'}], 'four seconds of hammering hang the gate');
  check(cues(out.events).includes(HOME_CUES.gate), 'hanging the gate has its cue');
  check(out.open.parts.home.naming && out.open.parts.home.kind === 'panel', 'hanging the gate asks for a name and puts a panel back in his hands');
  out = run(out.open, viewOf(me, {}, {homeName: {name: '  G-Town '}}), DT);
  equal(homeOf(out.open).name, 'G-Town', 'the name he types is on the record');
  check(!out.open.parts.home.naming, 'the name box closes');
  equal([cleanHomeName(''), cleanHomeName('x'.repeat(25)), cleanHomeName('<b>')], [null, null, null], 'an empty, long or odd name is refused');
  // Every player name the game allows (progression.js: up to 24 characters that are not control characters) gives a
  // starting name the record can hold.
  for (const player of ['Gratian', 'Abcdefghijklmnop', 'Kyle_B', 'Dad (Kyle)', 'x'.repeat(24), '   ', '***', 'Zoë 2', 'abcdefghijklmn' + String.fromCodePoint(0x1D400) + 'x',
    String.fromCodePoint(0x1D400).repeat(12), '', null])
    check(readableHome(newHome(defaultHomeName(player))), 'the player name ' + JSON.stringify(player) + ' gives a name the ground can keep');
  equal([defaultHomeName('Kyle_B'), defaultHomeName('***')], ["KyleB's Ground", 'My Ground'], 'odd marks are left out of the starting name');
  // At the board he can rename it.
  const board = boardSpot(homeOf(out.open).pieces[0]);
  out = run(out.open, viewOf({x: board.x, z: board.z, yaw: 0}, {}, {interact: true}), DT);
  check(out.open.parts.home.naming, 'F at the board opens the name box again');
  out = run(out.open, viewOf({x: board.x, z: board.z, yaw: 0}, {}, {homeName: {cancel: true}}), DT);
  check(!out.open.parts.home.naming && homeOf(out.open).name === 'G-Town', 'Escape keeps the name');

  // Solids: a panel is a thin wall; the gate's posts always, its leaves only while it is shut.
  const record = build(homeOf(out.open), {kind: 'panel', i: 3, j: 0, axis: 'x'});
  const shut = homeSolids(record, {gateOpen: false, heightAt: scablandsSurfaceHeightAt});
  const open2 = homeSolids(record, {gateOpen: true, heightAt: scablandsSurfaceHeightAt});
  equal(shut.length - open2.length, 1, 'the open gate takes away only its leaves');
  const panel = shut.find(row => row.id.startsWith('home/panel'));
  const at = pieceInLand({kind: 'panel', i: 3, j: 0, axis: 'x'});
  check(Math.abs(panel.x - at.x) < 1e-9 && panel.halfX === 1 && panel.height >= 1.8, 'the panel\'s solid is where it is drawn, 2 m long');
  const grid = createJobSolidGrid(SOLID_GRID);
  grid.setOpenSolids('home-ground', shut);
  const near = grid.near(at.x - .5, at.z - 2, at.x + .5, at.z + 2, 1).map(row => row.id);
  check(near.includes(panel.id), 'the job\'s collision grid holds the fence for walkers and cars');
  // In play the part stands the solids, and stands them again when the gate opens for him.
  out = run(out.open, viewOf({...groundPoint(10, 6), yaw: 0}), DT);
  const requests = run(out.open, viewOf({...groundPoint(10, 1.5), yaw: 0}), DT).requests.filter(request => request.type === 'solids');
  check(requests.length === 1 && requests[0].id === 'home-ground' && requests[0].solids.length === 2, 'the gate opens as he comes to it');
}

// ---- Marks made from above, built on the ground. ----------------------------------------------------------------
{
  let open = given();
  const me = {...groundPoint(4, 4), yaw: Math.PI};
  let out = run(open, viewOf(me, {view: true}), DT);
  check(out.open.parts.home.above && cues(out.events).includes(HOME_CUES.viewUp), 'V lifts the view straight above the ground');
  const start = out.open.parts.home.cursor;
  out = run(out.open, viewOf(me, {view: true, turnRight: true}), 1);
  check(out.open.parts.home.cursor.a > start.a + 4, 'D moves the outline east from above');
  out = run(out.open, viewOf(me, {build: true}), DT);
  const mark = out.open.parts.home.outline.piece;
  equal(homeOf(out.open).marks, [mark], 'B marks where the piece will go');
  equal(homeOf(out.open).pieces, [], 'nothing is built from above');
  check(cues(out.events).includes(HOME_CUES.mark), 'a mark has its cue');
  out = run(out.open, viewOf(me, {view: true}), DT);
  check(!out.open.parts.home.above && cues(out.events).includes(HOME_CUES.viewDown), 'V again brings the view back down');
  equal(homeOf(out.open).marks, [mark], 'the mark stays on the ground');
  // Down on the ground, the outline in front of him takes the mark, and hammering it builds it and clears the mark.
  const on = pieceInLand(mark);
  const there = {x: on.x, z: on.z + 1.4, yaw: Math.PI};
  out = run(out.open, viewOf(there), DT);
  equal(out.open.parts.home.outline.piece, mark, 'the outline settles on his mark');
  check(out.open.parts.home.outline.marked && out.open.parts.home.prompt.startsWith('Hold B to hammer up the tin panel you marked'), 'and says it is his mark');
  out = run(out.open, viewOf(there, {build: true}), 3.05);
  equal([homeOf(out.open).pieces, homeOf(out.open).marks], [[mark], []], 'building the mark clears it');
  // A mark can be cleared from above.
  let record = toggleMark(newHome('M'), {kind: 'panel', i: 1, j: 1, axis: 'x'});
  record = toggleMark(record, {kind: 'panel', i: 1, j: 1, axis: 'x'});
  equal(record.marks, [], 'B on a mark from above clears it');
  // The camera's pose is a pure reading of the lift.
  const foot = {position: {x: 0, y: 2, z: 0}, target: {x: 0, y: 2, z: 8}, fov: 72};
  equal(homeCameraPose(foot, 0), foot, 'with no lift the camera is the walker\'s own');
  const top = homeCameraPose(foot, 1, 1);
  check(top.position.y > 50 && Math.abs(top.position.x - top.target.x) < 1e-9, 'fully lifted the camera looks straight down');
  check(stepHomeLift(0, true, .35) > .4 && stepHomeLift(.5, false, 1) === 0, 'the lift rises and falls in under a second');
}

// ---- Sprint and the burst. --------------------------------------------------------------------------------------
{
  let open = given();
  const me = {x: 5800, z: 300, yaw: 0};
  let out = run(open, viewOf(me, {forward: true, sprint: true}), .2);
  check(cues(out.events).includes(HOME_CUES.sprint), 'the sprint has its cue');
  check(!out.open.parts.home.burst.shown, 'the burst bar is not shown before it is used');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), 1);
  check(out.open.parts.home.burst.active && out.open.parts.home.burst.shown, 'X while walking forward is the burst, with its bar');
  check(cues(out.events).includes(HOME_CUES.burst), 'the burst has its cue');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), FOOT_BURST.seconds - 1 + .05);
  check(!out.open.parts.home.burst.active && out.open.parts.home.burst.spent, 'the burst empties in three seconds');
  check(cues(out.events).includes(HOME_CUES.spent), 'running out has its cue');
  out = run(out.open, viewOf(me, {forward: true, burst: true}), 2);
  check(!out.open.parts.home.burst.active, 'a spent burst cannot be used until it has refilled');
  out = run(out.open, viewOf(me, {forward: true}), FOOT_BURST.refillSeconds - 2 + .1);
  check(out.open.parts.home.burst.charge === 1 && !out.open.parts.home.burst.spent && !out.open.parts.home.burst.shown,
    'it refills in six seconds and the bar goes');
}

// ---- The save: written, reloaded, and the save made before this card. -------------------------------------------
const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/26-story-open.json', import.meta.url))).storage;
const memory = values => {
  const map = new Map(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key)};
};
{
  const store = memory(fixture), before = store.getItem(PLAYERS_KEY);
  const old = activePlayer(loadPlayers(store)).profile;
  const record = savedOpenRecord(old);
  check(record && !Object.hasOwn(record, 'home'), 'the save made before this card is read and has no ground');
  const world = worldForProfile(old, 0);
  check(!Object.hasOwn(world.open, 'home'), 'reading the older save makes no ground');
  // An outing with the switch off, stepped through the open land, settles the record exactly as it was read.
  const offView = {...viewOf({...groundPoint(5, 5), yaw: 0}, {build: true, view: true, burst: true, forward: true}), homeGround: undefined};
  const offRun = run(beginOpenLand({id: 'roam-off', steps: [{kind: 'roam'}], open: {world}}), offView, 2);
  const settled = settleOpenWorld(old, offRun.open.world, {atStart: world, savedAtStart: {ledger: old.story.ledger, open: record}});
  check(settled.ok, 'the older save settles');
  equal(settled.profile.story.open, record, 'with the switch off the saved open land is unchanged');
  equal(JSON.stringify(settled.profile), JSON.stringify(old), 'with the switch off the whole profile is unchanged');
  equal(store.getItem(PLAYERS_KEY), before, 'reading the older save writes nothing to storage');

  // With the switch on: given the ground, a fence and the gate, then saved, then read back from storage.
  let open = beginOpenLand({id: 'roam-save', steps: [{kind: 'roam'}], open: {world}});
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {interact: true}), DT).open;
  open = run(open, viewOf({x: 5980, z: 11, yaw: 0}, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: HOME_OFFER_ID}]}), DT).open;
  open = run(open, viewOf({...groundPoint(2.5, .8), yaw: Math.PI}, {build: true}), 3.05).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {piece: true}), DT).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {build: true}), 4.05).open;
  open = run(open, viewOf({...groundPoint(10, .8), yaw: Math.PI}, {}, {homeName: {name: 'G-Town'}}), DT).open;
  const home = open.world.open.home;
  equal(home.pieces, [{kind: 'panel', i: 2, j: 0, axis: 'x'}, {kind: 'gate', i: 8, j: 0, axis: 'x'}], 'the fence and the gate stand where he hammered them');
  const saved = settleOpenWorld(old, open.world, {atStart: world, savedAtStart: {ledger: old.story.ledger, open: record}});
  check(saved.ok && saved.changed, 'the outing with the ground settles');
  const registry = loadPlayers(store);
  check(savePlayers(replacePlayerProfile(registry, registry.activePlayerId, saved.profile), store), 'the profile is written to memory storage');
  const reloaded = activePlayer(loadPlayers(store)).profile;
  equal(savedOpenRecord(reloaded).home, home, 'after a reload his ground is exactly where he left it');
  equal(worldForProfile(reloaded, 0).open.home, home, 'the next outing begins with his ground');
  // Everything else of the record is as it was.
  const {home: _home, ...rest} = savedOpenRecord(reloaded);
  equal({...rest, journal: rest.journal.length}, {...record, journal: record.journal.length}, 'the ground changes nothing else of the open record');
  check(rest.journal.length === record.journal.length, 'the ground writes no journal rows');
  // A record whose ground cannot be read is not read at all, as with every other part of the open record.
  check(savedOpenRecord({story: {version: 1, open: {...record, home: {version: 1, name: '', pieces: [], marks: []}}}}) === null,
    'a ground with no name is not readable');
  check(!readableHome({...home, pieces: [{kind: 'gate', i: 6, j: 6, axis: 'x'}]}), 'a gate inside the ground is not readable');
  check(!readableHome({...home, pieces: [{kind: 'tower', i: 0, j: 0, axis: 'x'}]}), 'a piece of an unknown kind is not readable');
  check(readableHome(lift(home, home.pieces[0])), 'a ground with a piece picked up is readable');
}

console.log(`Home ground: ${checks} checks passed.`);
