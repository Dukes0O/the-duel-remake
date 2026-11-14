// EVERBURN-PLAY-FIXES, fourth round: the big map shows a job that has only places one place at a time and keeps the land's names (items 1; rewritten for the
// whole-land map of SCABLANDS-LAND round 4, slice 4), and the spoken-line subtitle and the story caption keep clear of the mirror and of each other (items 2
// and 3). Drawing and layout only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldJobMapData} from '../src/route-map.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {createLandPicture} from '../src/world/scablands-picture.js';
import {drawBigMap, createKnowledge} from '../src/world/scablands-map.js';
import {createJob} from '../src/world/jobs/job-engine.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const course = {worldAt: (s, lateral) => ({x: s, z: lateral})};

// A drawing recorder: every fillText with its place and text alignment, and every arc.
globalThis.Path2D = class {moveTo() {} lineTo() {}};
function recorder(width, height) {
  const texts = [], arcs = [];
  const target = {measureText: text => ({width: String(text).length * 6.5}), fillText: (text, x, y) => texts.push({text: String(text), x, y, align: context.textAlign}),
    arc: (x, y, r) => arcs.push({x, y, r, fill: context.fillStyle})};
  const context = new Proxy(target, {get: (t, key) => t[key] ?? (() => {}), set: (t, key, value) => (t[key] = value, true)});
  return {context, texts, arcs, canvas: {width, height, getContext: () => context}};
}

// SCABLANDS-LAND round 4, slice 4 (replaces EVERBURN-PLAY-FIXES' numbered rings): the big map is the whole land (src/world/scablands-map.js). It names every place
// of the land, Tin Town among them (the old map left a name off where a job's own ring stood within 4 pixels of it), marks the one place the job asks for next, and
// does not draw a job's several places at once: the marker follows the next lamp, the next flag, the next person.
const picture = createLandPicture();
const placeNames = picture.marks.places.map(place => place.name.replace(/^The /i, '').toUpperCase());
function bigMapOf(definition, {index = 0} = {}) {
  const job = createJob(definition); job.stepState.index = index;
  const worldJob = {definition, job, actors: []}, state = {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob}};
  const model = worldHudModel({worldJob, player: {x: 0, z: 0}});
  const {context, texts, arcs} = recorder(1400, 1000);
  drawBigMap(context, {picture, canvas: null, car: {x: 0, z: 0, heading: 0}, target: model.target, knowledge: createKnowledge(), actors: [], ways: []}, {width: 1400, height: 1000});
  return {model, texts, arcs, data: worldJobMapData(course, state)};
}
// ---- 1. Job 2: three lamps 7 m apart: the land keeps every name, and the marker is the next lamp --------------------------------------------------------
{
  const job2 = EVERBURN_JOBS[1], first = bigMapOf(job2), second = bigMapOf(job2, {index: 1});
  const lamps = first.data.places.map(place => place.name);
  check(lamps.length === 3 && new Set(lamps).size === 3, 'job 2 has three places with three different names');
  for (const name of placeNames) check(first.texts.some(item => item.text === name), `${name} is named on the big map beside the lamps (no exemption: Tin Town is named too)`);
  check(first.model.target && second.model.target && first.model.target.name !== second.model.target.name, 'the marker is the next lamp: it moves from one lamp to the next');
  check(first.arcs.some(arc => arc.fill === '#ffce75'), 'the next lamp is marked in gold');
}
// ---- 2. A job with places far apart: the marker is the next find, and the land's names are as before ----------------------------------------------------------
{
  const flags = EVERBURN_SIDE_JOBS.find(job => job.id === 'everburn-survey-flags'), pick = {...flags, steps: [{kind: 'onfoot', places: flags.steps[0].finds, returnToCar: flags.steps[0].finds[0]}]};
  const first = bigMapOf(pick), fifth = bigMapOf(pick, {index: 4});
  check(first.data.places.length === 5, 'five survey flags are five places');
  check(first.model.target.name.toUpperCase() === first.data.places[0].name && fifth.model.target.name.toUpperCase() === first.data.places[4].name, 'the marker is the first flag, then the fifth');
  for (const name of placeNames) check(fifth.texts.some(item => item.text === name), `${name} is named`);
}
// ---- 3. The subtitle and the caption keep clear of the mirror (the rules in the style sheets, read as text) ---------------------------------
{
  const hud = readFileSync(new URL('../src/combat-hud.css', import.meta.url), 'utf8'), screen = readFileSync(new URL('../src/screen-hud.css', import.meta.url), 'utf8');
  const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8'), world = readFileSync(new URL('../src/world/world-hud.css', import.meta.url), 'utf8');
  check(/\.rear-view-frame\{[^}]*top:90px[^}]*width:30vw;aspect-ratio:3\.2/.test(style), 'the mirror stands 90 px down, 30vw wide, 3.2 to 1');
  check(/\.in-race \.race-callout\{top:calc\(90px \+ 30vw \/ 3\.2 \+ 24px\)\}/.test(screen), 'the caption starts 24 px under the mirror');
  const rule = hud.match(/\.is-world-job \.combat-fight-subtitle\{top:calc\(90px \+ 30vw \/ 3\.2 \+ 24px \+ (\d+)px\)\}/);
  check(rule, 'in a world job the spoken-line subtitle has its own place under the caption');
  const below = Number(rule[1]);
  // The caption is at most three lines of 34 px at 1.2 line height with its kicker, and the subtitle stands clear of all of it, at every width.
  check(below >= 3 * 34 * 1.2 + 8 + 12, `the subtitle stands ${below} px under the caption's top, clear of three lines and the kicker`);
  for (const width of [1280, 1366, 1536, 1920, 2560]) {
    const mirrorBottom = 90 + width * 0.3 / 3.2, subtitleTop = mirrorBottom + 24 + below;
    check(subtitleTop > mirrorBottom + 24 + 3 * 34 * 1.2, `at ${width} px wide the subtitle (${subtitleTop.toFixed(0)}) is under the mirror (${mirrorBottom.toFixed(0)}) and the caption`);
  }
  // Go-live round: the key prompt and the wave and well bars are drawn clear of the mirror (and so of the caption and subtitle under it), at every width.
  const prompt = world.match(/\n\.world-hud-prompt\{left:calc\(65vw \+ (\d+)px\);max-width:calc\(35vw - (\d+)px - (\d+)px\)\}/);
  const bars = world.match(/\n\.world-hud-progress\{left:(\d+)px;top:(\d+)px;width:min\((\d+)px,calc\(35vw - (\d+)px\)\);/);
  const top = world.match(/\.world-hud-prompt,\.world-hud-progress\{position:absolute;top:(\d+)px;/);
  check(prompt && bars && top, 'the prompt stands right of the mirror and the bars left of it, both level with the mirror\'s top');
  for (const width of [1280, 1366, 1536, 1920, 2560]) {
    const mirrorLeft = width * .35, mirrorRight = width * .65;
    const promptLeft = mirrorRight + Number(prompt[1]), promptRight = promptLeft + (width * .35 - Number(prompt[2]) - Number(prompt[3]));
    const barsLeft = Number(bars[1]), barsRight = barsLeft + Math.min(Number(bars[3]), width * .35 - Number(bars[4]));
    check(promptLeft >= mirrorRight + 1 && promptRight <= width - 22 - 58, `at ${width} px wide the prompt (${promptLeft.toFixed(0)} to ${promptRight.toFixed(0)}) is right of the mirror and inside the compass's column`);
    check(barsRight + 24 <= mirrorLeft, `at ${width} px wide the wave and well bars (${barsLeft} to ${barsRight.toFixed(0)}) are left of the mirror (${mirrorLeft.toFixed(0)})`);
  }
  check(Number(top[1]) >= 90 && Number(top[1]) + 60 < 90 + 1280 * .3 / 3.2 + 24, 'the prompt starts at the mirror\'s top, above the caption');
  check(Number(bars[2]) >= 160 && Number(bars[2]) <= 200, 'the bars stand under the job\'s heading (which ends about 150 px down) and above the small map');
  check(/ui\.stage\.classList\.toggle\('is-world-job',worldJob\)/.test(readFileSync(new URL('../src/screen-hud.js', import.meta.url), 'utf8')), 'the screen marks the stage while a world job runs');
  check(/\.world-map-open \.race-callout\{z-index:9;/.test(world), 'while the big map is open the caption is drawn above it, on its own plate');
  check(/classList\?\.toggle\('world-map-open', mapOpen\)/.test(readFileSync(new URL('../src/world/world-hud.js', import.meta.url), 'utf8')), 'opening and closing the big map marks the stage');
}
console.log(`everburn play fixes, fourth round: ${checks} checks passed`);
