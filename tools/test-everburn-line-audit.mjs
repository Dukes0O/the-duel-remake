import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMBER_CAPTIONS} from '../src/story/ember-lines.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {createJob, stepJob} from '../src/world/jobs/job-engine.js';
import {arenaResultsScreen} from '../src/screen-arena.js';

// These lines have no existing event at their written moment. The allow-list may only shrink.
const notYet = new Set(['story.ember.cinder.3', 'story.ember.auntie-solder.1',
  'story.ember.cinder.7', 'story.ember.cinder.8', 'story.ember.cinder.12', 'story.ember.moss.2']);
const sources = ['src/world/jobs/everburn.js', 'src/world/jobs/gas-run.js', 'src/arena/modes/world-job.js']
  .map(path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')).join('\n');
const referenced = new Set([...sources.matchAll(/['"](story\.ember\.[a-z0-9.-]+)['"]/g)].map(match => match[1]));
const missing = Object.keys(EMBER_CAPTIONS).filter(id => !referenced.has(id));
assert.deepEqual(missing.filter(id => !notYet.has(id)), [], 'every written line is used or explicitly awaiting a moment');
console.log('Unasked lines:', missing.map(id => `${id} | ${EMBER_CAPTIONS[id].who} | ${EMBER_CAPTIONS[id].where}`).join('\n'));

function heard(definition, views) {
  let job = createJob(definition, 1), lines = [];
  for (const [view, ticks] of views) for (let i=0; i<ticks; i++) {
    job = stepJob(job, view, .1);
    lines.push(...job.requests.filter(request => request.type === 'say').map(request => request.lineId));
  }
  return {job, lines};
}
const far = {player:{position:{x:0,y:0,z:0}}, actors:[]};
const one = heard(EVERBURN_JOBS[0], [[far, 48]]);
assert.deepEqual(one.lines.slice(0,2), ['story.ember.cinder.1','story.ember.cinder.2'], 'job 1 start lines play in order');
const two = heard(EVERBURN_JOBS[1], [[far, 70]]);
assert.ok(two.lines.indexOf('story.ember.auntie-solder.3') >= 0 && two.lines.indexOf('story.ember.cinder.5') > two.lines.indexOf('story.ember.auntie-solder.3'), 'job 2 start lines play in order');
const lamp=EVERBURN_JOBS[1].steps[0].places[0];
const lit=heard(EVERBURN_JOBS[1], [[{...far,onFoot:true,fighter:{position:lamp.position}},100]]);
assert.ok(lit.lines.includes('story.ember.cinder.6'), 'first lamp lights Cinder line');
const heist=EVERBURN_JOBS[4].steps[0];
const taken=heard(EVERBURN_JOBS[4], [[far,30],[{...far,onFoot:true,fighter:{position:heist.zone.position},thingsHit:[{id:heist.takeId}]},60]]);
assert.ok(taken.lines.includes('story.ember.cinder.13'), 'taking the key requests its line');
const alarmView = {...far, onFoot:true, fighter:{position:{x:0,y:0,z:5}},
  lamps:[{position:{x:0,z:0},direction:{x:0,z:1},range:12}]};
const alarm=heard(EVERBURN_JOBS[4], [[far,30],[alarmView,35]]);
assert.ok(alarm.lines.includes('story.ember.cinder.14'), 'a search lamp raises the alarm line');
const spill=heard(EVERBURN_JOBS[0], [[far,50],[{...far,crashSize:9},35]]);
assert.ok(spill.lines.includes('story.ember.cinder.4'), 'a hard crash raises the spill line');
const result = arenaResultsScreen({arena:{mode:'world-job',result:{winnerId:'player'},worldJob:{definition:EVERBURN_JOBS[4]}}}, {metric:()=>'', action:()=>'', escapeHTML:String});
assert.equal(result.description, EMBER_CAPTIONS['story.ember.old-smoke.1'].text, 'job 5 result shows Old Smoke once');
const waves=heard(EVERBURN_JOBS[5], [[far,30],[{...far,waveCleared:true},90]]);
assert.ok(waves.lines.includes('story.ember.cinder.16'), 'the last cleared wave plays its line');
const jobFourResult=arenaResultsScreen({arena:{mode:'world-job',result:{winnerId:'player'},worldJob:{definition:EVERBURN_JOBS[3]}}}, {metric:()=>'',action:()=>'',escapeHTML:String});
assert.notEqual(jobFourResult.description, EMBER_CAPTIONS['story.ember.auntie-solder.6'].text, 'job 4 does not repeat its closing line on the result');
assert.deepEqual(EVERBURN_JOBS[5].steps[0].closing,['story.ember.cinder.16'], 'waves-over line closes defence');
assert.deepEqual(EVERBURN_JOBS[5].steps[1].closing,['story.ember.cinder.20','story.ember.cinder.21'], 'job 6 won lines close in order');
console.log('test-everburn-line-audit: audit and 11 behaviour checks passed');
