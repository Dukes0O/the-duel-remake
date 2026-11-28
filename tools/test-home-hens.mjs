// HOME-GROUND-2: hens, nest boxes, the real clock and the board at the gate, without graphics
// (docs/board/cards/HOME-GROUND-2.md). Laying over real time, full boxes, gathering, the clock capped and set back, a save
// and a reload, the saves made before this card (none, and step 1's), the switch off, Moss's talk, the board, the hammer
// in his hands and the drive of step 1's fixes. Memory-only storage: no real save is read or written.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAYERS_KEY, activePlayer, loadPlayers, replacePlayerProfile, savePlayers} from '../src/progression.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {newWorld} from '../src/world/open/open-record.js';
import {savedOpenRecord, settleOpenWorld} from '../src/world/open/open-save.js';
import {worldForProfile} from '../src/world/open/open-world.js';
import {openRoamJob} from '../src/world/open/roam-job.js';
import {homePart} from '../src/world/open/parts/home.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {AWAY_LONGEST, BOARD_WORDS, BOX_HOLDS, DAY_SECONDS, HEN_SETTLE_SECONDS, HOME_CELLS, HOME_CRATES, HOME_CUES, HOME_WORDS,
  MOSS_HENS, MOSS_HENS_ID, MOSS_TALK} from '../src/world/open/content/home-ground.js';
import {awayFor, boardLines, boxInLand, boxRefusal, boxSlotInFront, build, refusal, buildBox, crateSpot, cratesLeft, facedThing, fenceClosed,
  gatherBox, giveHens, groundPoint, hensWaiting, homeSolids, liftBox, nameHen, newHome, newsBoardSpot, readableHome, ripen,
  upgradeHome, markBuild, raiseBuild, buildInLand, coopBoxes, gatherCoop, roostAt} from '../src/world/open/home-rule.js';
import {selectFirstPersonPresentation} from '../src/first-person-presentation.js';
import {hammerSwing} from '../src/first-person-gear.js';
import {footActionPresentation} from '../src/combat-hud.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const equal = (a, b, message) => { assert.deepEqual(a, b, message); checks++; };
const DT = 1 / 60;
const parts = [homePart];
const cues = events => events.filter(event => event.type === 'homeCue').map(event => event.cue);
const says = requests => requests.filter(request => request.type === 'say').map(request => request.text);

// A ground fenced all the way round, with the gate in the north fence from node 8 to node 12.
function fenced(name = 'G-Town') {
  let home = build(newHome(name), {kind: 'gate', i: 8, j: 0, axis: 'x'});
  for (let n = 0; n < HOME_CELLS; n++) {
    if (n < 8 || n >= 12) home = build(home, {kind: 'panel', i: n, j: 0, axis: 'x'});
    home = build(home, {kind: 'panel', i: n, j: HOME_CELLS, axis: 'x'});
    home = build(home, {kind: 'panel', i: 0, j: n, axis: 'z'});
    home = build(home, {kind: 'panel', i: HOME_CELLS, j: n, axis: 'z'});
  }
  return home;
}
const withBoxes = (home, cells) => cells.reduce((record, [i, j]) => buildBox(record, {kind: 'box', i, j}), home);

// A snapped nest box stays a step ahead at different places and headings, and is offered by the same reach.
{
  for (const [a, b] of [[4.5, 6.3], [4.5, 6.5], [4, 6], [4.05, 6.95], [4, 4.4]]) {
    for (let turn = 0; turn < 72; turn++) {
      const yaw = turn * Math.PI / 36, me = groundPoint(a, b), slot = boxSlotInFront(me, yaw), at = boxInLand(slot);
      check((at.x - me.x) * Math.sin(yaw) + (at.z - me.z) * Math.cos(yaw) >= 1 - 1e-9,
        'the nest box is a step ahead instead of under his feet');
      check(Math.abs(Math.atan2(Math.sin(Math.atan2(at.x - me.x, at.z - me.z) - yaw),
        Math.cos(Math.atan2(at.x - me.x, at.z - me.z) - yaw))) < Math.PI / 5,
        'the nest box stays in the forward view');
      const home = buildBox(giveHens(fenced()), slot);
      check(facedThing(home, me, yaw)?.kind === 'box', 'without moving or turning he can reach the box he just built');
    }
  }
}

// ---- The rules of laying, over any stretch of real time. ---------------------------------------------------------
{
  const home = withBoxes(giveHens(fenced()), [[3, 4]]);
  check(fenceClosed(fenced()) && !fenceClosed(build(newHome('x'), {kind: 'gate', i: 8, j: 0, axis: 'x'})), 'the fence is closed only when every edge step stands');
  check(hensWaiting(fenced()) && !hensWaiting(home), 'Moss brings the hens once the fence is closed, and only once');
  const day = ripen(home, DAY_SECONDS);
  equal(day.laid.length, 12, 'two Tin Town Browns lay twelve eggs in a real day, six each');
  equal(day.home.boxes[0].eggs, 12, 'the eggs are in the box');
  check(day.home.hens.every(hen => hen.due > 0), 'neither hen is waiting while the box has room');
  const three = ripen(home, 3 * DAY_SECONDS);
  equal(three.home.boxes[0].eggs, BOX_HOLDS, 'one box holds three days of one hen\'s eggs, eighteen');
  equal(three.laid.length, BOX_HOLDS, 'no egg is laid beyond what the box holds');
  check(three.home.hens.every(hen => hen.due === 0), 'with every box full the hens wait');
  equal(ripen(three.home, DAY_SECONDS).laid.length, 0, 'waiting hens lay nothing more, however long he is away');
  // Two boxes: the eggs go to the box with fewer, and hold three days of both hens.
  const two = ripen(withBoxes(giveHens(fenced()), [[3, 4], [5, 4]]), 3 * DAY_SECONDS);
  equal(two.home.boxes.map(box => box.eggs), [18, 18], 'two boxes share the eggs and hold three days of both hens');
  // The same stretch cut into pieces lays the same eggs, at the same moments.
  let pieces = home;
  for (let t = 0; t < DAY_SECONDS; t += 997) pieces = ripen(pieces, Math.min(997, DAY_SECONDS - t)).home;
  equal(pieces.boxes, day.home.boxes, 'a day in pieces lays the same eggs as a day at once');
  check(pieces.hens.every((hen, index) => Math.abs(hen.due - day.home.hens[index].due) < 1e-6), 'and leaves each hen as far from her next egg');
  equal(ripen(home, 0).home, home, 'no time lays nothing');
  equal(ripen(home, -500).home, home, 'time running back lays nothing and takes nothing');
  // Gathering, and the room it makes.
  const gathered = gatherBox(three.home, 0);
  equal([gathered.eggs, gathered.boxes[0].eggs], [BOX_HOLDS, 0], 'gathering takes every egg into his store');
  check(gathered.hens.every(hen => hen.due === HEN_SETTLE_SECONDS), 'with room made the waiting hens settle and lay again');
  equal(liftBox(three.home, 0).eggs, BOX_HOLDS, 'picking up a full box gathers its eggs first');
  equal(cratesLeft(liftBox(three.home, 0)), HOME_CRATES, 'and puts the old crate back in his hands');
  // Where a box may stand.
  const lane = giveHens(fenced());
  equal(boxRefusal(lane, {kind: 'box', i: 9, j: 6}), 'boxLane', 'a nest box in the lane from the gate is refused');
  equal(boxRefusal(lane, {kind: 'box', i: 20, j: 6}), 'offGround', 'a nest box off the ground is refused');
  equal(boxRefusal(withBoxes(lane, [[3, 3]]), {kind: 'box', i: 3, j: 3}), 'boxCell', 'two nest boxes cannot share a cell');
  equal(boxRefusal(withBoxes(lane, [[3, 3], [4, 3]]), {kind: 'box', i: 5, j: 3}), 'noCrates', 'he has two old crates');
  equal(boxRefusal(fenced(), {kind: 'box', i: 3, j: 3}), 'noCrates', 'before the hens come he has no crate');
  for (const reason of ['boxLane', 'boxCell', 'noCrates']) check(/^[A-Z].*\.$/.test(HOME_WORDS[reason]), 'the refusal "' + reason + '" is a sentence');
  // The gate, moved, keeps its lane clear of nest boxes too.
  // The gate taken down, and four panels beside where it stood, so that it could hang from node 2 to node 6.
  const moved = {...withBoxes(giveHens(fenced()), [[3, 6]]), pieces: fenced().pieces.filter(piece => piece.kind !== 'gate' &&
    !(piece.j === 0 && piece.axis === 'x' && piece.i >= 2 && piece.i < 6))};
  equal(refusal(moved, {kind: 'gate', i: 2, j: 0, axis: 'x'}), 'gateLaneBox', 'a gate whose lane a nest box stands in is refused');
  equal(refusal({...moved, boxes: []}, {kind: 'gate', i: 2, j: 0, axis: 'x'}), null, 'and hangs there once the box is moved');
  const solids = homeSolids(withBoxes(lane, [[3, 3]]), {heightAt: scablandsSurfaceHeightAt});
  check(solids.some(row => row.id === 'home/box/3/3'), 'a nest box is solid');
}

// ---- The real clock: one number, capped, never less than nothing. -----------------------------------------------
{
  const seen = 1_800_000_000;
  equal(awayFor(seen, seen + 3600), 3600, 'the time since his last visit is the clock less the last visit');
  equal(awayFor(seen, seen - 86400), 0, 'a clock set back counts as no time');
  equal(awayFor(seen, seen + 40 * DAY_SECONDS), AWAY_LONGEST, 'a clock far ahead counts no more than three days');
  equal([awayFor(null, seen), awayFor(seen, null), awayFor(seen, NaN)], [0, 0, 0], 'an unknown moment counts as no time');
}

// ---- A small open land with only this part, and a way to step it. ----------------------------------------------
const auntie = {id: 'auntie-solder', position: {x: 5980, y: 0, z: 10}};
function landWith(home, seed = 5) {
  const world = newWorld({seed, night: 2});
  return beginOpenLand({id: 'roam-test', steps: [{kind: 'roam'}], open: {world: home ? {...world, open: {...world.open, home}} : world}});
}
function viewOf(fighter, keys = {}, extra = {}) {
  return {openRoam: true, homeGround: true, onFoot: !!fighter, fighter: fighter && {position: {x: fighter.x, y: 0, z: fighter.z}, yaw: fighter.yaw},
    carPosition: null, interact: false, people: [auntie], playerName: 'Gratian', jobEvents: [], homeKeys: keys, ...extra};
}
function run(open, view, seconds) {
  const events = [], requests = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const out = stepOpenLand(open, view, DT, parts);
    open = out.open; events.push(...out.events); requests.push(...out.requests);
    view = {...view, jobEvents: [], homeName: null};
  }
  return {open, events, requests};
}
const homeOf = open => open.world.open.home;
const partOf = open => open.parts.home;

// ---- The switch off: nothing read, written or drawn, whatever the clock says. ------------------------------------
{
  const home = {...withBoxes(giveHens(fenced()), [[3, 4]]), lastSeen: 1_800_000_000};
  const open = landWith(home);
  const before = JSON.stringify(open.world.open);
  const view = {...viewOf({...groundPoint(4, 6), yaw: Math.PI}, {build: true, fire: true}, {interact: true, homeClock: 1_800_000_000 + DAY_SECONDS}), homeGround: undefined};
  const out = run(open, view, 1);
  equal([out.events, out.requests], [[], []], 'with the switch off the hens raise no event and ask for nothing');
  equal(JSON.stringify(out.open.world.open), before, 'with the switch off a day on the clock lays nothing and writes nothing');
  check(partOf(out.open)?.on !== true, 'with the switch off nothing of the ground is drawn');
}

// ---- Moss, the crate and the hens' names. -----------------------------------------------------------------------
{
  let open = landWith(fenced());
  const crate = crateSpot({kind: 'gate', i: 8, j: 0, axis: 'x'});
  const me = {x: crate.x, z: crate.z + .5, yaw: Math.PI};
  let out = run(open, viewOf(me), DT);
  equal(partOf(out.open).prompt, HOME_WORDS.crateWaiting, 'by the crate he is told that Moss has brought two hens');
  out = run(out.open, viewOf(me, {}, {interact: true}), DT);
  const talk = out.requests.find(request => request.type === 'talk');
  check(talk?.id === MOSS_HENS_ID && talk.speaker === 'moss' && talk.scene === MOSS_TALK && talk.anchorPosition === true,
    'F at the crate opens Moss\'s one talk, standing there');
  check(MOSS_TALK.lines.length === 4 && MOSS_TALK.lines.every(line => !line.words.includes('—')), 'the talk is four plain lines');
  out = run(out.open, viewOf(me, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: MOSS_HENS_ID}]}), DT);
  equal(homeOf(out.open).hens.map(hen => hen.name), MOSS_HENS.map(hen => hen.name), 'his answer brings the two hens onto his ground');
  check(cues(out.events).includes(HOME_CUES.crateOpen) && cues(out.events).includes(HOME_CUES.cluck), 'the crate opening and a cluck have their cues');
  check(partOf(out.open).naming && partOf(out.open).namingHen === 0, 'he is asked to name the first hen');
  out = run(out.open, viewOf(me, {}, {homeName: {name: ' Henrietta '}}), DT);
  check(partOf(out.open).naming && partOf(out.open).namingHen === 1 && partOf(out.open).namingKey === 'hen-1', 'then the second');
  out = run(out.open, viewOf(me, {}, {homeName: {cancel: true}}), DT);
  equal(homeOf(out.open).hens.map(hen => hen.name), ['Henrietta', MOSS_HENS[1].name], 'a name typed is kept, and Escape keeps hers');
  check(!partOf(out.open).naming, 'the name box closes');
  equal(partOf(out.open).flock.length, 2, 'both hens are about his ground');
  // Another talk choice does not bring two more.
  out = run(out.open, viewOf(me, {}, {jobEvents: [{type: 'talkChoice', id: 'take', scene: MOSS_HENS_ID}]}), DT);
  equal(homeOf(out.open).hens.length, 2, 'Moss brings his hens once');
  check(!hensWaiting(homeOf(out.open)), 'and the crate is gone');
  equal(nameHen(homeOf(out.open), 0, '<b>'), homeOf(out.open), 'an odd name for a hen is refused');
}

// ---- In play: a box, the first egg before he leaves, gathering, the hen's name, the hammer. ---------------------
{
  let open = landWith(giveHens(fenced()));
  const me = {...groundPoint(4.5, 6.3), yaw: Math.PI};
  let out = run(open, viewOf(me), DT);
  equal(partOf(out.open).prompt, HOME_WORDS.firstBox, 'with hens and no nest box he is told how to make one');
  equal(partOf(out.open).outline, null, 'no outline stands in front of him until he presses B');
  equal(partOf(out.open).tool, null, 'and nothing is in his hands to build with');
  // B shows the outline; G until he holds an old crate.
  out = run(out.open, viewOf(me, {build: true}), DT);
  out = run(out.open, viewOf(me), DT);
  equal(partOf(out.open).tool, 'hammer', 'once he builds he holds a hammer');
  out = run(out.open, viewOf(me, {piece: true}), DT);
  out = run(out.open, viewOf(me), DT);
  equal(partOf(out.open).kind, 'box', 'with the gate hung, G goes from the panel to an old crate');
  equal(partOf(out.open).outline.piece, {kind: 'box', i: 4, j: 4}, 'the nest box stands in the cell in front of him');
  check(partOf(out.open).prompt.startsWith(HOME_WORDS.holdBox), 'the sentence tells him to hold B to make the nest box');
  out = run(out.open, viewOf(me, {build: true}), 1.2);
  check(partOf(out.open).strike !== null && partOf(out.open).outline.progress > .4, 'each strike is in the hammer\'s swing, and the box rises');
  check(cues(out.events).filter(name => name === HOME_CUES.hammer).length >= 2, 'each strike has its cue');
  out = run(out.open, viewOf(me, {build: true}), 1.4);
  equal(homeOf(out.open).boxes, [{i: 4, j: 4, eggs: 0}], 'two and a half seconds of hammering make the nest box');
  check(cues(out.events).includes(HOME_CUES.boxUp), 'the box going up has its cue');
  // The first egg comes within a few minutes, before he leaves.
  const stand = {...groundPoint(8, 12), yaw: 0};
  out = run(out.open, viewOf(stand), 130);
  check(homeOf(out.open).boxes[0].eggs >= 1, 'the first egg is laid within a couple of minutes of the box');
  check(cues(out.events).includes(HOME_CUES.lay) && says(out.requests).some(text => text.endsWith('laid an egg in the nest box.')),
    'laying has its cue and its sentence');
  // A hen whose egg is near goes to the box and sits: Nutmeg's comes about seven minutes after she arrived.
  let sat = false, settle = out.open;
  for (let t = 0; t < 320 && !sat; t += 2) { settle = run(settle, viewOf(stand), 2).open; sat = partOf(settle).flock.some(row => row.mode === 'sit'); }
  check(sat, 'a hen whose egg is near goes to the nest box and sits in it');
  check(partOf(out.open).flock.every(hen => {
    const at = {x: hen.x - groundPoint(0, 0).x, z: hen.z - groundPoint(0, 0).z};
    return at.x > 1 && at.x < 39 && at.z > 1 && at.z < 39;
  }), 'the hens stay on his ground');
  // Gathering: F at the box.
  const box = boxInLand({i: 4, j: 4});
  const atBox = {x: box.x, z: box.z + 1.2, yaw: Math.PI};
  out = run(out.open, viewOf(atBox), DT);
  const inBox = homeOf(out.open).boxes[0].eggs;
  check(partOf(out.open).prompt.startsWith('Press F to gather'), 'facing the box he is told to press F to gather its eggs');
  out = run(out.open, viewOf(atBox, {}, {interact: true}), DT);
  equal([homeOf(out.open).boxes[0].eggs, homeOf(out.open).eggs], [0, inBox], 'one press gathers the box into his store');
  check(cues(out.events).includes(HOME_CUES.gather), 'gathering has its cue');
  // His hen's name, when he looks at her.
  let flockLand = run(landWith(giveHens(fenced())), viewOf({...groundPoint(15, 15), yaw: 0}), 1).open;
  const hen = partOf(flockLand).flock[0];
  const look = {x: hen.x, z: hen.z - 2, yaw: 0};
  flockLand = run(flockLand, viewOf(look), DT).open;
  equal(partOf(flockLand).prompt, 'Clover, a Tin Town Brown. Press F to give her a new name.', 'facing a hen he sees her name');
  flockLand = run(flockLand, viewOf(look, {}, {interact: true}), DT).open;
  check(partOf(flockLand).naming && partOf(flockLand).namingHen === 0 && !partOf(flockLand).namingChain, 'F there asks for her new name');
  // The same inputs walk the hens and lay the eggs the same way.
  const again = (() => { let o = landWith(withBoxes(giveHens(fenced()), [[4, 5]])); return run(o, viewOf(stand), 30).open; })();
  const twice = (() => { let o = landWith(withBoxes(giveHens(fenced()), [[4, 5]])); return run(o, viewOf(stand), 30).open; })();
  equal(JSON.stringify([partOf(again).flock, homeOf(again)]), JSON.stringify([partOf(twice).flock, homeOf(twice)]), 'the hens are repeatable from their inputs');
}

// ---- The hammer, the wrench, the launcher and the car-aim words (the drive of step 1, items 1 and 2). -----------
{
  let open = landWith(newHome('Test'));
  const me = {...groundPoint(6.5, 5.8), yaw: Math.PI};
  let out = run(open, viewOf(me, {build: true}), .7);
  const part = partOf(out.open);
  equal([part.tool, part.onGround, part.armed], ['hammer', true, false], 'building on his ground he holds the hammer, the launcher lowered');
  check(part.strike !== null && part.strike >= 0 && part.strike < 1, 'the strike says how far through a blow he is');
  const presented = selectFirstPersonPresentation({fighter: {crewId: 'rook', speed: 0}, input: {}, weapons: {selected: 'rpg', ammo: 2}, homeTool: 'hammer', homeStrike: .6}, {time: 1});
  equal([presented.weapon, presented.aim, presented.loaded, presented.lowered], ['hammer', false, false, false], 'his hands show the hammer, not the launcher');
  check(hammerSwing(.3) > .5 && hammerSwing(.69) < 0 && hammerSwing(null) === 0, 'the hammer is drawn back and brought down through each blow');
  const wrench = selectFirstPersonPresentation({fighter: {crewId: 'rook', speed: 0}, input: {}, weapons: {selected: 'rpg', ammo: 2}, homeTool: 'wrench', homeStrike: .4}, {time: 1});
  equal([wrench.weapon, wrench.action], ['wrench', 'repair'], 'for the gate\'s hinges he turns a wrench');
  out = run(out.open, viewOf(me), DT);
  out = run(out.open, viewOf(me, {piece: true}), DT);
  equal(partOf(out.open).tool, 'wrench', 'holding the gate he has the wrench');
  out = run(out.open, viewOf(me, {fire: true}), DT);
  equal([partOf(out.open).tool, partOf(out.open).armed, partOf(out.open).outline], [null, true, null], 'the fire key takes the launcher back at once');
  out = run(out.open, viewOf(me, {build: true}), DT);
  equal([partOf(out.open).tool, partOf(out.open).armed], ['wrench', false], 'and B puts the tool back in his hands');
  // The car-aim words are not shown on his ground.
  const state = {footGear: {name: 'LONGHORN RPG', ammo: 3}, footWeapons: {lockTargetIndex: null, nextFireAt: 0}, stageTimeSec: 5,
    arena: {worldJob: {open: {parts: {home: {onGround: true}}}}}};
  equal(footActionPresentation(state).text, '', 'on his own ground there is no "HOLD AIM ON A CAR"');
  equal(footActionPresentation({...state, arena: null}).text, 'HOLD AIM ON A CAR', 'elsewhere it is shown as before');
  // Walking off his ground puts the tool away and the outline with it.
  out = run(out.open, viewOf({x: groundPoint(10, -6).x, z: groundPoint(10, -6).z, yaw: 0}), DT);
  equal([partOf(out.open).tool, partOf(out.open).onGround, partOf(out.open).outline], [null, true, null],
    'outside his gate nothing is in his hands, and the aim words stay hidden as far out as the board');
  out = run(out.open, viewOf({x: groundPoint(10, -12).x, z: groundPoint(10, -12).z, yaw: 0}), DT);
  equal(partOf(out.open).onGround, false, 'further out the launcher is his again');
  // Left alone, the outline goes away.
  out = run(out.open, viewOf(me, {build: true}), DT);
  out = run(out.open, viewOf(me), 10.2);
  equal(partOf(out.open).outline, null, 'ten seconds without a build key put the outline away');
}

// ---- Facing a piece he built offers to pick it up (item 4); the gate's refusal says to step up (item 5). ---------
{
  const home = build(newHome('Test'), {kind: 'panel', i: 6, j: 5, axis: 'x'});
  const close = {...groundPoint(6.5, 5.4), yaw: Math.PI};
  equal(facedThing(home, close, close.yaw)?.piece, {kind: 'panel', i: 6, j: 5, axis: 'x'}, 'a panel just in front of him is the one he faces');
  let out = run(landWith(home), viewOf(close), DT);
  equal(partOf(out.open).prompt, 'Press B to pick up this tin panel.', 'facing it the sentence offers to pick it up, not to build beyond it');
  out = run(out.open, viewOf(close, {build: true}), DT);
  equal(homeOf(out.open).pieces, [], 'and one press of B picks it up');
  equal(HOME_WORDS.gateEdge, 'Step up to the edge of your ground to hang the gate.', 'the gate refused off the edge says to step up');
}

// ---- Opening an outing with the clock; the board at the gate. ---------------------------------------------------
{
  const seen = 1_800_000_000;
  const home = {...withBoxes(giveHens(fenced()), [[3, 4]]), lastSeen: seen};
  const news = newsBoardSpot({kind: 'gate', i: 8, j: 0, axis: 'x'});
  const far = {...groundPoint(10, 10), yaw: 0};
  // A day and a half away.
  let out = run(landWith(home), viewOf(far, {}, {homeClock: seen + 1.5 * DAY_SECONDS}), DT);
  const opened = homeOf(out.open);
  equal(opened.boxes[0].eggs, 18, 'a day and a half away fills the one box');
  equal(opened.lastSeen, seen + 1.5 * DAY_SECONDS + DT, 'the last visit includes the outing clock at its first tick');
  equal(partOf(out.open).opened.laid, 18, 'the outing knows what was laid while he was away');
  // The board shows itself as he comes to the gate, in three or four plain sentences.
  out = run(out.open, viewOf({x: news.x, z: news.z + 6, yaw: 0}, {}, {homeClock: seen + 1.5 * DAY_SECONDS}), DT);
  const lines = partOf(out.open).board?.lines;
  equal(lines, ['You were away for 1 day and 12 hours.', 'Your hens laid 18 eggs while you were gone.', BOARD_WORDS.full, BOARD_WORDS.storeNone, BOARD_WORDS.firstBuildings],
    'the board says how long he was away, what was laid, that the boxes are full and what is in his store');
  check(lines.every(line => /^[A-Z].*\.$/.test(line) && !line.includes('—')), 'every line is a plain sentence');
  check(cues(out.events).includes(HOME_CUES.boardRead), 'the board has its cue');
  out = run(out.open, viewOf({x: news.x, z: news.z + 30, yaw: 0}), DT);
  equal(partOf(out.open).board, null, 'walking away puts the board away');
  out = run(out.open, viewOf({x: news.x, z: news.z + .5, yaw: 0}), DT);
  equal(partOf(out.open).prompt, HOME_WORDS.boardHint, 'at the board he is told F reads it again');
  out = run(out.open, viewOf({x: news.x, z: news.z + .5, yaw: 0}, {}, {interact: true}), DT);
  equal(partOf(out.open).board?.lines, lines, 'F at the board shows all of the same news again');
  // The clock set back: nothing lost, nothing laid.
  out = run(landWith(opened), viewOf(far, {}, {homeClock: seen}), DT);
  equal(homeOf(out.open).boxes, opened.boxes, 'a clock set back loses no egg');
  equal(partOf(out.open).opened.away, 0, 'and counts as no time away');
  equal(homeOf(out.open).lastSeen, opened.lastSeen, 'a clock set back keeps the saved moment so returning to the correct clock cannot count time twice');
  // The clock far ahead: no more than three days, and a box full is full.
  const empty = {...withBoxes(giveHens(fenced()), [[3, 4], [5, 4]]), lastSeen: seen};
  out = run(landWith(empty), viewOf(far, {}, {homeClock: seen + 400 * DAY_SECONDS}), DT);
  equal(homeOf(out.open).boxes.map(box => box.eggs), [18, 18], 'a clock a year ahead counts as three days');
  check(partOf(out.open).opened.long, 'and the board says he was away more than three days');
  equal(boardLines(partOf(out.open).opened, homeOf(out.open))[0], BOARD_WORDS.awayLong, 'in a plain sentence');
  // Before the hens.
  equal(boardLines({away: 7200, laid: 0}, build(newHome('x'), {kind: 'gate', i: 8, j: 0, axis: 'x'})),
    ['You were away for 2 hours.', BOARD_WORDS.fenceFirst], 'before the fence is closed the board says how to get the hens');
  equal(boardLines({away: 30, laid: 0}, fenced())[0], BOARD_WORDS.crate, 'a short gap opens with the news that Moss has left the hens');
  for (const away of [0, 30, 3599])
    check(!boardLines({away, laid: 0}, home).some(line => line.startsWith('You were')),
      'a visit less than an hour apart has no away line');
  check(boardLines({away: 3600, laid: 0}, home)[0].startsWith('You were away'), 'an hour away is reported');
  // Laying in play counts from the clock's one reading: the last visit moves on with the outing's own seconds.
  const box = {...withBoxes(giveHens(fenced()), [[3, 4]]), lastSeen: seen};
  out = run(landWith(box), viewOf(far, {}, {homeClock: seen + 60}), 200);
  // A minute away brought Clover's first egg a minute nearer: it comes 60 seconds into the outing, and the record is
  // then true of the clock's reading plus those 60 seconds.
  equal(homeOf(out.open).boxes[0].eggs, 1, 'her first egg is laid in play');
  check(Math.abs(homeOf(out.open).lastSeen - (seen + 60 + 60)) < .05,
    'an egg laid in play leaves the last visit at the clock\'s reading plus the seconds played when it was laid');
}

// The board stays beside the board, disappears from above, and reads the current store after a gather.
{
  let record = withBoxes(giveHens(fenced()), [[13, 1]]);
  record = {...record, boxes: record.boxes.map(box => ({...box, eggs: 3}))};
  const news = newsBoardSpot(record.pieces.find(piece => piece.kind === 'gate'));
  const me = {x: news.x, z: news.z + 5, yaw: 0};
  let out = run(landWith(record), viewOf(me), DT);
  check(partOf(out.open).board, 'the board can be read beside the gate');
  out = run(out.open, viewOf({...me, z: news.z + 7}), DT);
  equal(partOf(out.open).board, null, 'the board is hidden more than about six metres away');
  out = run(landWith(record), viewOf(me), DT);
  out = run(out.open, viewOf(me, {view: true}), DT);
  equal(partOf(out.open).board, null, 'the board is hidden in the overhead view');
  const at = boxInLand(record.boxes[0]);
  const gatherAt = {x: at.x, z: at.z - 1.5, yaw: 0};
  out = run(landWith(record), viewOf(gatherAt), DT);
  check(partOf(out.open).board?.lines.includes(BOARD_WORDS.storeNone), 'the board starts with the empty store');
  out = run(out.open, viewOf(gatherAt, {}, {interact: true}), DT);
  check(partOf(out.open).board?.lines.includes('You have 3 eggs in your store.') && homeOf(out.open).eggs === 3,
    'gathering refreshes the board with the new store count');
}

// ---- The save: written, reloaded, and the saves made before this card. ------------------------------------------
const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/26-story-open.json', import.meta.url))).storage;
const memory = values => {
  const map = new Map(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)]));
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key)};
};
{
  const store = memory(fixture), before = store.getItem(PLAYERS_KEY);
  const old = activePlayer(loadPlayers(store)).profile;
  const record = savedOpenRecord(old);
  check(record && !Object.hasOwn(record, 'home'), 'the save made before Home Ground has no ground');
  equal(store.getItem(PLAYERS_KEY), before, 'reading it writes nothing to storage');
  // A step 1 ground (version 1) in that save: read as it is, and left as it is with the switch off.
  const stepOne = {version: 1, name: 'G-Town', pieces: [{kind: 'gate', i: 8, j: 0, axis: 'x'}, {kind: 'panel', i: 2, j: 0, axis: 'x'}], marks: []};
  check(readableHome(stepOne), 'a ground saved by step 1 is readable');
  const oldProfile = {...old, story: {...old.story, open: {...record, home: stepOne}}};
  check(savedOpenRecord(oldProfile)?.home === stepOne || JSON.stringify(savedOpenRecord(oldProfile).home) === JSON.stringify(stepOne),
    'and loads unchanged');
  const world = worldForProfile(oldProfile, 0);
  equal(world.open.home, stepOne, 'the next outing begins with it as it was');
  const offView = {...viewOf({...groundPoint(5, 5), yaw: 0}, {build: true}, {homeClock: 1_800_000_000}), homeGround: undefined};
  const off = run(beginOpenLand({id: 'roam-off', steps: [{kind: 'roam'}], open: {world}}), offView, 1);
  const settledOff = settleOpenWorld(oldProfile, off.open.world, {atStart: world, savedAtStart: {ledger: oldProfile.story.ledger, open: savedOpenRecord(oldProfile)}});
  check(settledOff.ok, 'with the switch off the step 1 save settles');
  equal(JSON.stringify(settledOff.profile), JSON.stringify(oldProfile), 'and is exactly as it was');
  // With the switch on it becomes step 2's record, with every piece where it stood.
  const on = run(beginOpenLand({id: 'roam-on', steps: [{kind: 'roam'}], open: {world}}), viewOf({...groundPoint(10, 10), yaw: 0}, {}, {homeClock: 1_800_000_000}), DT);
  const upgraded = homeOf(on.open);
  equal({version: upgraded.version, pieces: upgraded.pieces, marks: upgraded.marks, name: upgraded.name},
    {version: 9, pieces: stepOne.pieces, marks: [], name: 'G-Town'}, 'with the switch on the step 1 ground keeps every piece');
  equal([upgraded.hens, upgraded.boxes, upgraded.eggs, upgraded.lastSeen], [[], [], 0, 1_800_000_000 + DT], 'and gains no hens yet, and the last visit');
  equal(upgradeHome(stepOne), {...newHome('G-Town'), pieces: stepOne.pieces}, 'the upgrade adds the step 2 and 3 fields and keeps every old field');

  // A step 2 ground, through a real outing's opening, saved and read back from memory storage.
  const job = openRoamJob(oldProfile, 0, {playerName: 'Gratian', homeClock: 1_800_000_000});
  equal(job.open.homeClock, 1_800_000_000, 'the outing carries the clock read as it opened');
  equal(Object.hasOwn(openRoamJob(oldProfile, 0, {playerName: 'Gratian'}).open, 'homeClock'), false, 'and none when no clock was read');
  let open = beginOpenLand(job);
  const kept = {...withBoxes(giveHens(fenced()), [[3, 4]]), lastSeen: 1_800_000_000 - DAY_SECONDS};
  open = {...open, world: applyEffects(open.world, {id: 'home-ground/test', effects: [{type: 'home', record: kept}]}).world};
  open = run(open, viewOf({...groundPoint(10, 10), yaw: 0}, {}, {homeClock: job.open.homeClock}), DT).open;
  const home = homeOf(open);
  equal(home.boxes[0].eggs, 12, 'a day away has laid twelve eggs');
  const saved = settleOpenWorld(oldProfile, open.world, {atStart: world, savedAtStart: {ledger: oldProfile.story.ledger, open: savedOpenRecord(oldProfile)}});
  check(saved.ok && saved.changed, 'the outing settles');
  const registry = loadPlayers(store);
  check(savePlayers(replacePlayerProfile(registry, registry.activePlayerId, saved.profile), store), 'the profile is written to memory storage');
  const reloaded = activePlayer(loadPlayers(store)).profile;
  equal(savedOpenRecord(reloaded).home, home, 'after a reload the hens, boxes, eggs and last visit are as he left them');
  // Records that cannot be read are refused, as with every part of the open record.
  for (const [what, bad] of [
    ['a hen of an unknown breed', {...home, hens: [{...home.hens[0], breed: 'dodo'}]}],
    ['a hen with no name', {...home, hens: [{...home.hens[0], name: ''}]}],
    ['an egg count below nothing', {...home, eggs: -1}],
    ['a box off the ground', {...home, boxes: [{i: 20, j: 0, eggs: 0}]}],
    ['a box with more eggs than it holds', {...home, boxes: [{i: 3, j: 4, eggs: BOX_HOLDS + 1}]}],
    ['two boxes in one cell', {...home, boxes: [{i: 3, j: 4, eggs: 0}, {i: 3, j: 4, eggs: 0}]}],
    ['a last visit that is not a time', {...home, lastSeen: 'yesterday'}],
    ['three hens', {...home, hens: [...home.hens, home.hens[0]]}],
  ]) check(!readableHome(bad), what + ' is not readable');
  check(readableHome({...home, lastSeen: null}) && readableHome({...home, lastSeen: 9e12}), 'a last visit unknown, or far ahead, is readable');
}

// Step 3: the coop's three nests use the same laying, gathering and saved egg records.
{
  let home = markBuild(withBoxes(giveHens(fenced()), [[3, 4]]), {kind: 'coop', i: 2, j: 8, turn: 1, stage: 0});
  home = {...home, loads: {...home.loads, coop: {i: 2, j: 8}}};
  for (let n = 0; n < 4; n++) home = raiseBuild(home, 'coop');
  equal(coopBoxes(home).length, 3, 'a finished coop has three built-in nests');
  equal(cratesLeft(home), 1, 'the coop uses no old crates');
  const full = ripen(home, 12 * DAY_SECONDS).home;
  equal(full.boxes.map(box => box.eggs), [18, 18, 18, 18], 'every standalone and built-in nest holds eighteen eggs');
  const gathered = gatherCoop(full);
  equal([gathered.eggs, gathered.boxes.map(box => box.eggs)], [54, [18, 0, 0, 0]], 'gathering the coop empties all three nests and leaves the old crate alone');
  equal(liftBox(full, 1), full, 'a built-in nest cannot be picked up as a spare crate');
  check(readableHome(full) && readableHome(gathered), 'full and gathered coop records can both be saved');
  const split = ripen(ripen(home, DAY_SECONDS).home, DAY_SECONDS).home;
  equal(split, ripen(home, 2 * DAY_SECONDS).home, 'the coop lays the same eggs over a split stretch');
  check(roostAt(home, 0, 'dusk') && roostAt(home, 1, 'dark'), 'hens have a place inside at dusk and in the dark');
  equal(roostAt(home, 0, 'dawn'), null, 'at dawn the hens come out');
  equal(roostAt(home, 6, 'dusk'), null, 'the coop houses at most six hens');
  const at = buildInLand(home.builds[0]);
  let out = run(landWith(home), viewOf({...at, yaw: 0}, {}, {partOfDay: 'dusk'}), 100);
  check(partOf(out.open).flock.every(hen => hen.mode === 'roost'), 'in play the hens walk into the coop at dusk');
  equal(cues(out.events).filter(name => name === HOME_CUES.roost).length, 2, 'each hen has one roosting cue on arrival');
  out = run(out.open, viewOf({...at, yaw: 0}, {}, {partOfDay: 'dawn'}), 1);
  check(partOf(out.open).flock.every(hen => hen.mode !== 'roost'), 'at dawn both hens leave their roost');
  const before = JSON.stringify(full);
  out = run(landWith(full), viewOf({...at, yaw: 0}, {}, {interact: true}), DT);
  equal(homeOf(out.open).eggs, 54, 'one press of F at the coop gathers its three nests');
  equal(JSON.stringify(full), before, 'neither laying nor interaction mutates the input record');
  // Save a completed coop, a half-raised shed, a named flock, both loads and the truck through real profile storage.
  let kept = markBuild(full, {kind: 'shed', i: 13, j: 8, turn: 3, stage: 0});
  kept = {...kept, loads: {...kept.loads, shed: {i: 13, j: 8}}, flatbed: {x: 5940, z: 90, yaw: .5}};
  kept = raiseBuild(raiseBuild(kept, 'shed'), 'shed');
  kept = nameHen(kept, 0, 'Pepper');
  const store = memory(fixture), registry = loadPlayers(store), profile = activePlayer(registry).profile;
  const original = worldForProfile(profile, 0);
  const changed = applyEffects(original, {id: 'home-ground/buildings', effects: [{type: 'home', record: kept}]}).world;
  const saved = settleOpenWorld(profile, changed, {atStart: original,
    savedAtStart: {ledger: profile.story.ledger, open: savedOpenRecord(profile)}});
  check(saved.ok && saved.changed, 'version 4 settles through the existing home effect');
  check(savePlayers(replacePlayerProfile(registry, registry.activePlayerId, saved.profile), store), 'version 4 writes to memory-only storage');
  const loaded = activePlayer(loadPlayers(store)).profile;
  equal(savedOpenRecord(loaded).home, kept, 'reload keeps every building stage, load, truck pose, name, due and egg');
  const withoutStory = value => { const {story, ...rest} = value; return rest; };
  equal(withoutStory(loaded), withoutStory(profile), 'saving buildings changes no money, cars, records or other profile fields');
}

// A literal version 2 stays byte-for-byte intact when read or when the switch is off.
{
  const {builds, loads, flatbed, crew, raids, ...oldFields} = withBoxes(giveHens(fenced()), [[3, 4]]);
  const old = {...oldFields, version: 2, eggs: 31, lastSeen: 1800000000};
  old.hens[0] = {...old.hens[0], name: 'Pepper', due: 123}; old.boxes[0].eggs = 17;
  const before = JSON.stringify(old), world = landWith(old).world;
  check(readableHome(old), 'version 2 remains readable');
  for (const builds of [{}, 'damaged', [null]]) {
    const legacy = {...old, builds};
    check(readableHome(legacy), 'a version 2 reader ignores an unknown step 3 field');
    equal(savedOpenRecord({story: {version: 1, open: {...world.open, home: legacy}}}).home, legacy,
      'unknown step 3 fields cannot throw or hide an older save');
  }
  equal(savedOpenRecord({story: {version: 1, open: world.open}}).home, old, 'reading a version 2 record adds nothing');
  const off = run(landWith(old), {...viewOf({...groundPoint(2, 2), yaw: 0}), homeGround: false}, 1);
  equal(JSON.stringify(homeOf(off.open)), before, 'the switch off preserves version 2 exactly');
  const upgraded = upgradeHome(old);
  equal({...upgraded, version: 2, builds: undefined, loads: undefined, flatbed: undefined, crew: undefined, raids: undefined},
    {...old, builds: undefined, loads: undefined, flatbed: undefined, crew: undefined, raids: undefined}, 'upgrading preserves every version 2 field');
  equal(upgradeHome(upgraded), upgraded, 'upgrading version 4 changes nothing');
  equal(JSON.stringify(old), before, 'the old record is not changed in place');
  for (const bad of [null, {}, {coop: 'bed', shed: 'bed'}, {coop: {i: -1, j: 1}, shed: 'stack'}])
    check(!readableHome({...upgraded, loads: bad}), 'invalid load records are rejected');
  check(!readableHome({...upgraded, flatbed: {x: NaN, z: 1, yaw: 0}}), 'a flatbed without a finite position is rejected');
}

console.log(`Home hens: ${checks} checks passed.`);
