import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {LAND} from '../src/world/scablands-names.js';

// These lines have no existing event at their written moment. The allow-list may only shrink.
const notYet = new Set(['story.ember.cinder.7', 'story.ember.moss.2']);
// The remade pickup replaces this opening, but the story keeps its line ID.
const replaced = new Set(['story.ember.cinder.2', 'story.ember.auntie-solder.3',
  'story.ember.cinder.5', 'story.ember.cinder.6', 'story.ember.auntie-solder.4', 'story.ember.cinder.9']);
const sources = ['src/world/jobs/everburn.js', 'src/world/jobs/gas-run.js', 'src/world/jobs/bellows-rule.js', 'src/arena/modes/world-job.js']
  .map(path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')).join('\n');
const referenced = new Set([...sources.matchAll(/['"](story\.ember\.[a-z0-9.-]+)['"]/g)].map(match => match[1]));
for (const id of replaced) assert.ok(EMBER_CAPTIONS[id]?.text, `replaced line ${id} remains available`);
const missing = Object.keys(EMBER_CAPTIONS).filter(id => !referenced.has(id));
assert.deepEqual(missing.filter(id => !notYet.has(id) && !replaced.has(id)), [], 'every written line is used or explicitly awaiting a moment');
console.log('Unasked lines:', missing.filter(id => !replaced.has(id)).map(id => `${id} | ${EMBER_CAPTIONS[id].who} | ${EMBER_CAPTIONS[id].where}`).join('\n'));

function checkLineIds(value, key = '') {
  if (typeof value === 'string' && (key.endsWith('LineId') || key === 'lineId' || key === 'hint' || key === 'opening' || key === 'closing' || key.endsWith('LineIds'))) {
    assert.ok(EMBER_CAPTIONS[value]?.text, `job line ${value} has written words`);
  } else if (Array.isArray(value)) {
    for (const item of value) checkLineIds(item, key);
  } else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) checkLineIds(item, name);
  }
}
for (const job of [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS]) checkLineIds(job);


function heard(definition, views, initial = {}) {
  let job = createJob(definition, 1), lines = [];
  job.stepState = {...initial};
  for (const [view, ticks] of views) for (let i=0; i<ticks; i++) {
    job = stepJob(job, view, .1);
    lines.push(...job.requests.filter(request => request.type === 'say').map(request => request.lineId));
  }
  return {job, lines};
}
const far = {player:{position:{x:0,y:0,z:0}}, actors:[]};

for (const [jobIndex, id, x, z, radius] of [
  [0,'story.ember.cinder.3',...Object.values(LAND.at('ash-barricade-1')),60], [0,'story.ember.auntie-solder.1',...Object.values(LAND.at('tin-town')),170],
  [2,'story.ember.cinder.8',...Object.values(LAND.at('boneyard',-144,76)),70], [4,'story.ember.cinder.12',...Object.values(LAND.at('dead-mall',-12,0)),22],
]) {
  const cue=EVERBURN_JOBS[jobIndex].steps[0].sayNear.find(item=>item.lineId===id);
  assert.deepEqual([cue.place.position.x,cue.place.position.z,cue.radius],[x,z,radius], `${id} uses the agreed place and radius`);
}

// The view's walker is authoritative on foot, even when the parked car is far away.
const mallView = {onFoot:true, player:{position:{x:0,y:0,z:0}}, fighter:{position:{x:LAND.at('dead-mall',-12,0).x,y:0,z:LAND.at('dead-mall',-12,0).z}}, actors:[]};
const mall = heard(EVERBURN_JOBS[4], [[mallView,55]]);
assert.equal(mall.lines.filter(id => id === 'story.ember.cinder.12').length, 1, 'mall proximity uses walker and speaks once');
for (const [index, {x, z}, id] of [[0,LAND.at('ash-barricade-1'),'story.ember.cinder.3'], [0,LAND.at('tin-town'),'story.ember.auntie-solder.1'], [2,LAND.at('boneyard',-144,76),'story.ember.cinder.8']]) {
  const near=heard(EVERBURN_JOBS[index], [[{player:{position:{x,y:0,z}},actors:[]},70]]);
  assert.equal(near.lines.filter(line => line === id).length, 1, `${id} speaks once near its place`);
}

const pickup = EVERBURN_JOBS[0].steps[0].pickup;
const one = heard(EVERBURN_JOBS[0], [[{player:{position:pickup.place.position},speedKmh:0,actors:[]}, 150]]);
assert.deepEqual(one.lines.slice(0,3), pickup.lines, 'job 1 pickup lines play in order');
const townStep=EVERBURN_JOBS[1].steps[0];
const two=heard(EVERBURN_JOBS[1],[[{...far,player:{position:townStep.meeting.position},speedKmh:0},100]]);
assert.deepEqual(two.lines.slice(0,3),['brand.lamps','brand.alleys','brand.brand'], 'job 2 briefing plays the three designed lines in order');
const lamp=townStep.places[0];
const lit=heard(EVERBURN_JOBS[1],[[{...far,onFoot:true,speedKmh:0,
  fighter:{position:lamp.position}},25]],{brandBriefed:true,brandSeconds:90,brandsUsed:1});
assert.equal(lit.job.stepState.lamps[lamp.id],true,'the first lamp takes a burning brand held for two seconds');
assert.ok(!lit.lines.includes('story.ember.cinder.6'),'the replaced first-lamp caption is no longer requested');
const heist=EVERBURN_JOBS[4].steps[0];
const taken=heard(EVERBURN_JOBS[4], [[far,30],[{...far,onFoot:true,fighter:{position:heist.zone.position},thingsHit:[{id:heist.takeId}]},60]]);
assert.ok(taken.lines.includes('story.ember.cinder.13'), 'taking the key requests its line');
const alarmView = {...far, onFoot:true, fighter:{position:{x:0,y:0,z:5}},
  lamps:[{position:{x:0,z:0},direction:{x:0,z:1},range:12}]};
const alarm=heard(EVERBURN_JOBS[4], [[far,30],[alarmView,35]]);
assert.ok(alarm.lines.includes('story.ember.cinder.14'), 'a search lamp raises the alarm line');
// EVERBURN-REMAKE: job 1's spill line is said when the pot goes out (rough ground taken fast), no longer for one crash above a limit.
const atPickup = {player:{position:pickup.place.position}, speedKmh:0, actors:[]};
const spill=heard(EVERBURN_JOBS[0], [[atPickup,150],[{...far,speedKmh:300,safeKmh:50,difficulty:'medium'},35]]);
assert.ok(spill.lines.includes('story.ember.cinder.4'), 'the pot going out raises the spill line');
assert.ok(!heard(EVERBURN_JOBS[0], [[atPickup,150],[{...far,crashSize:9},35]]).lines.includes('story.ember.cinder.4'), 'a crash size no longer spills job 1');

const restart=heard(EVERBURN_JOBS[5], [[far,30],[{...far,placeHealth:0},1],[{...far,placeHealth:120},35]]);
assert.ok(restart.lines.includes('story.ember.cinder.26'), 'failed defence requests the wave restart line');
const soup=heard(EVERBURN_SIDE_JOBS[2], [[{...far,crashSize:11},1],[far,30]]);
assert.ok(soup.lines.includes('story.ember.auntie-solder.12'), 'spilling soup requests its line');

const result = arenaResultsScreen({arena:{mode:'world-job',result:{winnerId:'player'},worldJob:{definition:EVERBURN_JOBS[4]}}}, {metric:()=>'', action:()=>'', escapeHTML:String});
assert.equal(result.description, EMBER_CAPTIONS['story.ember.old-smoke.1'].text, 'job 5 result shows Old Smoke once');
const waves=heard(EVERBURN_JOBS[5], [[far,30],[{...far,waveCleared:true},90]]);
assert.ok(waves.lines.includes('story.ember.cinder.16'), 'the last cleared wave plays its line');
const jobFourResult=arenaResultsScreen({arena:{mode:'world-job',result:{winnerId:'player'},worldJob:{definition:EVERBURN_JOBS[3]}}}, {metric:()=>'',action:()=>'',escapeHTML:String});
assert.notEqual(jobFourResult.description, EMBER_CAPTIONS['story.ember.auntie-solder.6'].text, 'job 4 does not repeat its closing line on the result');
assert.deepEqual(EVERBURN_JOBS[5].steps[0].closing,['story.ember.cinder.16'], 'waves-over line closes defence');
assert.deepEqual(EVERBURN_JOBS[5].steps[1].closing,['story.ember.cinder.20','story.ember.cinder.21'], 'job 6 won lines close in order');
console.log('test-everburn-line-audit: audit, all job line IDs, and 21 behaviour checks passed');
