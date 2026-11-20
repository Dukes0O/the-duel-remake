// HELI-RUSTWALL slice 3: the town's side of Kestrel One over the wall (src/town/town-heli.js). The fire on the Ridge comes as
// Old Tam's report in his year, opens the Helipad, and is put out by the pilot or by Dune; what the helicopter did comes back
// as commands; a town saved with all of it loads again. Pure town rules, memory only.
import assert from 'node:assert/strict';
import {createTown, deserializeTown, dispatchTownCommand, serializeTown, stepTown, registeredTownSystems, townReports, answerReport,
  TOWN_TIME, townNeighbourStanding} from '../src/town/index.js';
import {TOWN_HELI, townHeliOf, townHelipad, scablandsVisitRefusal, townHeliSystem, scablandsHeliInputs} from '../src/town/town-heli.js';
import {isOpen} from '../src/town/town-links.js';
import {TOWN_CAPTIONS} from '../src/town/content/lines.js';
import {REPORT_TEXT} from '../src/town/content/report-text.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const YEAR = BigInt(TOWN_TIME.ticksPerDay * TOWN_TIME.daysPerMonth * TOWN_TIME.monthsPerYear), DAY = BigInt(TOWN_TIME.ticksPerDay);
const days = (town, n) => { for (let k = 0; k < n * TOWN_TIME.ticksPerDay; k++) stepTown(town); };
const ridgeReports = town => townReports(town).filter(report => report.eventId === 'ridge-fire');

ok(registeredTownSystems().some(system => system.name === 'town-heli' && system.everyTicks === TOWN_TIME.ticksPerDay), 'the town\'s helicopter side runs once a day');
ok(TOWN_HELI.ridgeFireYear === 6, 'the Ridge fire comes in Old Tam\'s year, Year 6');

// ---- Before and in Old Tam's year ---------------------------------------------------------------------------------------------
{
  const town = createTown(77, 'Rustwall');
  town.tick = (BigInt(TOWN_HELI.ridgeFireYear - 1) * YEAR) - 2n * DAY;
  days(town, 1);
  ok(townHeliOf(town).ridgeFire === null && !town.heli, 'before Year 6 nothing burns and the town gains nothing');
  ok(isOpen(town, {}, 'helipad') === 'Wait for the fire on the Ridge.', 'the Helipad waits for the fire on the Ridge');
  days(town, 2);
  const fire = townHeliOf(town).ridgeFire;
  ok(fire?.state === 'burning', 'in Year 6 the Ridge is on fire');
  const [report] = ridgeReports(town);
  ok(report && report.who === 'Old Tam' && report.where === 'The Ridge' && report.unanswered, 'Old Tam reports it');
  same(report.answers.map(answer => answer.id), ['fly', 'send-dune', 'leave'], 'fly yourself, send Dune, or leave it for now');
  ok(isOpen(town, {}, 'helipad') === true, 'the fire opens the Helipad');
  // Ignored for the week, the report settles as "leave", and comes back on the first of the next month while it burns.
  days(town, 8);
  ok(ridgeReports(town).every(r => !r.unanswered) && townHeliOf(town).ridgeFire.state === 'burning', 'left alone, the fire keeps burning and Old Tam waits');
  days(town, TOWN_TIME.daysPerMonth - 8);
  ok(town.calendar.month === 2 && ridgeReports(town).some(r => r.unanswered), 'the report comes back on the first of next month');
  // Answering "send Dune" on the report sends him; two days later the fire is out.
  const again = ridgeReports(town).find(r => r.unanswered);
  ok(answerReport(town, again.id, 'send-dune').ok, 'send Dune');
  days(town, 1);
  ok(townHeliOf(town).ridgeFire.dune?.daysRemaining === 1, 'Dune is on his way');
  days(town, 1);
  const done = townHeliOf(town).ridgeFire;
  ok(done.state === 'dune' && done.by === 'dune' && !done.dune && !done.fire, 'Dune put the fire out, whatever the dice said');
  ok(town.book.some(entry => entry.type === 'ridge-fire' && /Dune put out the fire/.test(entry.text)), 'it goes in the Town\'s Book');
  days(town, TOWN_TIME.daysPerMonth);
  ok(!ridgeReports(town).some(r => r.unanswered), 'once it is out the report does not come back');
}

// ---- Dune by command, and the helicopter's results --------------------------------------------------------------------------
{
  const town = createTown(78, 'Rustwall');
  ok(dispatchTownCommand(town, {type: 'heliSendDune'}).ok === false, 'nothing to send Dune to before the fire');
  townHeliSystem({town, calendar: {year: 6, month: 1, day: 1, hour: 0}});
  town.dispatch = {nextId: 2n, crew: {}, active: [{id: 'dispatch-1', crewId: 'dune', kind: 'scout', daysRemaining: 3}], open: [], completed: [], totals: {}, explored: []};
  same(dispatchTownCommand(town, {type: 'heliSendDune'}), {ok: false, message: 'Dune is out on another job, so he can go to the Ridge when he is back.'}, 'Dune busy on another job');
  town.dispatch.active = [];
  const sent = dispatchTownCommand(town, {type: 'heliSendDune'});
  ok(sent.ok && sent.lineId === 'town.heli.dune', 'Dune goes, with his line');
  ok(!dispatchTownCommand(town, {type: 'heliSendDune'}).ok, 'Dune is sent once');

  const fresh = createTown(79, 'Rustwall');
  townHeliSystem({town: fresh, calendar: {year: 6, month: 1, day: 1, hour: 0}});
  const record = {id: 'ridge-fire', courseId: 'scablands', seed: 1, startDay: 0, steps: 2, engineSeconds: 40, burning: [[737656, 75]], burnt: [738681], damp: []};
  ok(dispatchTownCommand(fresh, {type: 'heliRidgeFire', state: 'burning', fire: record}).ok, 'the helicopter hands back a fire still burning');
  same(townHeliOf(fresh).ridgeFire.fire, record, 'the town keeps it for the next visit');
  same(scablandsHeliInputs(fresh).ridgeFire, {state: 'burning', fire: record}, 'and gives it back to the next visit');
  ok(!dispatchTownCommand(fresh, {type: 'heliRidgeFire', state: 'burning', fire: {burning: 'nonsense'}}).ok, 'a broken record is refused');
  ok(dispatchTownCommand(fresh, {type: 'heliRidgeFire', state: 'out'}).ok, 'the pilot put it out');
  const out = townHeliOf(fresh).ridgeFire;
  ok(out.state === 'out' && out.by === 'player' && !out.fire, 'out, by the pilot');
  ok(fresh.book.some(entry => /Kestrel One came over the wall/.test(entry.text)), 'and that goes in the Book');
  ok(!dispatchTownCommand(fresh, {type: 'heliRidgeFire', state: 'lost'}).ok, 'a fire that is out cannot be lost');

  const before = townNeighbourStanding(fresh, 'tam');
  ok(dispatchTownCommand(fresh, {type: 'heliLiftDone', liftId: 'tam-truck'}).ok, 'the pickup is up the Ridge');
  ok(townNeighbourStanding(fresh, 'tam') === before + TOWN_HELI.liftStanding, 'a delivery to Old Tam raises his standing by 10');
  ok(!dispatchTownCommand(fresh, {type: 'heliLiftDone', liftId: 'tam-truck'}).ok && !dispatchTownCommand(fresh, {type: 'heliLiftDone', liftId: 'piano'}).ok,
    'each load counts once, and only Old Tam\'s');
  same(townHeliOf(fresh).liftsDone, ['tam-truck'], 'the town remembers it');

  fresh.dispatch = {nextId: 1n, crew: {}, active: [], open: [], completed: [], totals: {}, explored: [{regionId: 'scablands', x: 0, z: 0}, {regionId: 'beyond', x: 1, z: 1}]};
  const seen = dispatchTownCommand(fresh, {type: 'heliScout', chunks: [{x: 0, z: 0}, {x: 1, z: 0}, {x: 1, z: 0}, {x: 1.5, z: 2}]});
  ok(seen.ok && seen.added === 1, 'scouting adds only new whole chunks');
  ok(fresh.dispatch.explored.some(area => area.regionId === 'scablands' && area.x === 1 && area.z === 0), 'into the same map the scouts fill');
  same(scablandsHeliInputs(fresh).explored, [{x: 0, z: 0}, {x: 1, z: 0}], 'the next visit knows what is already on the map, in the Scablands only');
  ok(townHeliOf(fresh).scouted === 1, 'the town counts what the helicopter put on the map');
  ok(dispatchTownCommand(fresh, {type: 'heliFlown'}).already === false && dispatchTownCommand(fresh, {type: 'heliFlown'}).already === true, 'the first flight over is noted once');

  // A town saved with all of it loads again.
  const loaded = deserializeTown(serializeTown(fresh));
  same(townHeliOf(loaded), townHeliOf(fresh), 'the helicopter record survives a save and a load');
  same(serializeTown(loaded), serializeTown(fresh), 'byte for byte');
}

// ---- Who can fly over ---------------------------------------------------------------------------------------------------------
{
  const town = createTown(80, 'Rustwall');
  const TRAINED = {liftoff: true, hover: true, landing: true, carry: true};
  ok(/Build a Helipad/.test(scablandsVisitRefusal(town, {lessonsDone: TRAINED})), 'no Helipad: build one first');
  town.buildings = [{id: 'building-3', buildingId: 'helipad', regionId: 'scablands', x: 10, z: 4, width: 4, depth: 4, state: 'frame'}];
  ok(townHelipad(town) === null, 'a Helipad still being built is no pad');
  town.buildings[0].state = 'finished';
  same(townHelipad(town), {id: 'building-3', x: 96, z: 48, half: 16}, 'a finished one is, at its middle');
  ok(/four flying lessons/.test(scablandsVisitRefusal(town, {lessonsDone: {...TRAINED, carry: false}})), 'no pilot yet: Brian\'s lessons first');
  ok(scablandsVisitRefusal(town, {lessonsDone: TRAINED}) === null, 'a trained pilot with a pad can fly over');
}

// ---- The words --------------------------------------------------------------------------------------------------------------
for (const id of ['town.heli.tam', 'town.heli.hollis', 'town.heli.roger', 'town.heli.dune']) {
  const text = TOWN_CAPTIONS[id].text;
  ok(text.length < 260 && !/—|–/.test(text) && /^[A-Z].*[.?!]$/.test(text) && text.split(' ').length >= 12, `${id} is a whole, plain sentence or two`);
}
for (const answer of REPORT_TEXT['ridge-fire'].answers) ok(/^[A-Z].*[.]$/.test(answer.label) && /^[A-Z].*[.]$/.test(answer.outcome), `the report's "${answer.id}" is a full sentence`);
// The same days give the same town.
{
  const run = () => { const t = createTown(81, 'Same'); t.tick = BigInt(TOWN_HELI.ridgeFireYear - 1) * YEAR; days(t, 12); return serializeTown(t); };
  ok(run() === run(), 'the same town on the same days comes out the same');
}

console.log(`test-town-heli: ${checks} checks passed`);
