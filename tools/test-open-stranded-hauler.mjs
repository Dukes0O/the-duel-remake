import assert from 'node:assert/strict';
import hauler from '../src/story/threads/content/stranded-hauler.js';
import {MISSION_KINDS} from '../src/world/open/content/mission-kinds.js';
import {LAND} from '../src/world/scablands-names.js';

const starts = [LAND.at('tin-town', 50, 50), LAND.at('tin-town', 80, 50)];
const path = [LAND.at('tin-town', 0, 0), LAND.at('tin-town', 0, 2000)];
const place = id => id === 'path' ? path : starts[Number(id)];
const view = {carPosition: path[0], missionHeightAt: () => 0};
for (const [beat, outcomes] of [['trap-fight', ['won', 'lost']], ['trap-from-behind', ['won', 'lost']],
  ['trap-run', ['away', 'caught']], ['escort', ['all-kept', 'some-kept', 'none-kept', 'car-wrecked']]]) {
  const authored = hauler.beats[beat].mission, kind = MISSION_KINDS[authored.kind];
  const mission = {...authored, rule: {...authored.rule, riderStarts: ['0', '1'], path: 'path', load: {count: 40, lostAtATime: 10}}};
  assert.deepEqual(Object.keys(mission.outcomes), outcomes);
  const route = kind.prepare(mission, place);
  assert.ok(route, beat);
  assert.equal(kind.prepare(mission, () => null), null);
  const begun = kind.begin(mission, route, view).state;
  const copy = structuredClone(begun);
  const tick = kind.step(mission, begun, view, 1);
  assert.deepEqual(begun, copy, 'a mission tick is pure');
  if (mission.kind === 'rider-fight') {
    assert.equal(tick.requests.find(row => row.type === 'riders').vehicles.length, 2);
    assert.equal(kind.step(mission, tick.state, {...view, road: {id: 'passing'}}, 1).requests.length, 0);
    assert.equal(kind.step(mission, tick.state, {...view, jobEvents: [{type: 'riderFight', id: mission.id, outcome: 'won'}]}, 1).outcome, 'won');
    assert.equal(kind.step(mission, tick.state, {...view, combatWrecking: true}, 1).outcome, 'lost');
  } else if (mission.kind === 'outrun') {
    assert.equal(kind.step(mission, tick.state, view, 60).outcome, null, 'waiting still is no escape');
    assert.equal(kind.step(mission, tick.state, {...view, carPosition: path[1]}, 60).outcome, 'away');
    assert.equal(kind.step(mission, tick.state, {...view, combatWrecking: true}, 1).outcome, 'caught');
  } else {
    assert.equal(tick.requests.some(row => row.type === 'riders'), false, 'the ridge gives half a minute');
    assert.equal(kind.step(mission, begun, view, 30).requests.find(row => row.type === 'riders').escort, mission.id);
    assert.equal(kind.step(mission, begun, {...view, combatWrecking: true}, 1).outcome, 'car-wrecked');
    for (const [tyres, outcome] of [[40, 'all-kept'], [30, 'some-kept'], [0, 'none-kept']]) {
      const last = {...begun, metres: route.length - .1, tyres};
      assert.equal(kind.step(mission, last, view, 1).outcome, outcome);
    }
    const waiting = {...begun, sentRiders: true};
    let out = kind.step(mission, waiting, view, 0);
    const cart = {id: 'buggy', x: out.state.truck.x, z: out.state.truck.z - 8, speed: out.state.speed};
    const beside = {...view, road: {id: mission.id, cars: [cart]}};
    const events = [];
    for (let tick = 0; tick < 41; tick++) {
      cart.x = out.state.truck.x;
      cart.z = out.state.truck.z - 8;
      out = kind.step(mission, out.state, beside, .1);
      events.push(...out.events);
    }
    assert.equal(out.state.tyres, 30);
    assert.equal(events.find(row => row.moment === 'tyres-lost').cue, 'open.tyres.lost');
    assert.equal(kind.step(mission, out.state, {...beside, road: {id: mission.id, cars: [{...cart, wrecked: true}]}}, 1).state.tyres, 30);
  }
}
console.log('test-open-stranded-hauler: mission rules passed');
