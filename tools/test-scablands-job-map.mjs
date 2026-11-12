import assert from 'node:assert/strict';
import {worldJobMapData} from '../src/route-map.js';
import {gasRunJob} from '../src/world/jobs/gas-run.js';
import {createJob} from '../src/world/jobs/job-engine.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
const course = {worldAt: (s, lateral) => ({x: s, z: lateral})};
const definition = gasRunJob({road: 'boneyard'});
const worldJob = {definition, job: createJob(definition), actors: []};
const state = {s: 10, lateral: 20, arena: {mode: 'world-job', worldJob}};
const data = () => worldJobMapData(course, state);
const before = JSON.stringify(state);
data();
check(JSON.stringify(state) === before, 'map data does not change job state');
const marks = kind => data().marks.filter(mark => mark.kind === kind);
check(JSON.stringify(data().path) === JSON.stringify(worldJob.job.steps[0].path.map(p => p.position)), 'road is the current step path');
check(data().destination.name === 'TIN TOWN', 'destination named');
check(data().jobName === 'GAS RUN' && data().roadName === 'BONEYARD ROAD', 'headings');
check(marks('player').length === 1, 'player present');
const cachedPath = data().path;
check(data().path === cachedPath, 'step path is reused');
check(data().start.name === 'EVERBURN', 'start place is named');
state.onFoot = true; state.fighter = {x: 77, z: 88};
check(marks('player')[0].position === state.fighter, 'on-foot player uses fighter position');
state.onFoot = false;
for (const kind of ['escort', 'hunter', 'rider']) check(marks(kind).length === 0, `${kind} absent`);
worldJob.actors.push({id: 'big-bess', position: {x: 2, z: 3}}, {id: 'old-smoke-furnace', furnace: {}, position: {x: 4, z: 5}},
  {id: 'ambush:1:0', ambushKey: 'ambush:1', x: 6, z: 7}, {id: 'ambush:1:1', ambushKey: 'ambush:1', x: 8, z: 9});
check(marks('escort').length === 1, 'escort present');
check(marks('hunter').length === 1, 'hunter present');
check(marks('rider').length === 2, 'each rider present');
worldJob.actors.splice(0);
for (const kind of ['escort', 'hunter', 'rider']) check(marks(kind).length === 0, `${kind} removed`);
worldJob.job.steps[0].path = undefined;
check(data() === null, 'job without path uses ordinary map');
check(worldJobMapData(course, {s: 0, arena: null}) === null, 'race uses ordinary map');
check(worldJobMapData(course, {s: 0, arena: {mode: 'fuel-run', worldJob}}) === null, 'Scrapdome uses ordinary map');
console.log(`scablands job map: ${checks} checks passed`);
