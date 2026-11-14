// EVERBURN-PLAY-FIXES, fourth round: the big map names each place of a job that has only places, so that they can be told apart (item 1),
// and the spoken-line subtitle and the story caption keep clear of the mirror and of each other (items 2 and 3). Drawing and layout only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {worldJobMapData, drawWorldJobMap} from '../src/route-map.js';
import {SCABLANDS_LAND} from '../src/world/scablands-land.js';
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
const box = item => ({left: item.align === 'center' ? item.x - 3 : item.x, right: item.align === 'center' ? item.x + 3 : item.x + item.text.length * 6.5, top: item.y - 10, bottom: item.y + 3});
const overlap = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
const mapOf = definition => worldJobMapData(course, {s: 0, lateral: 0, arena: {mode: 'world-job', worldJob: {definition, job: createJob(definition), actors: []}}}, {land: SCABLANDS_LAND});

// ---- 1. Job 2: three lamps 7 m apart, four pixels on the big map ------------------------------------------------------------------------
{
  const job2 = EVERBURN_JOBS[1], big = mapOf(job2), names = big.places.map(place => place.name);
  check(names.length === 3 && new Set(names).size === 3, 'job 2 has three places with three different names');
  const {context, texts, arcs, canvas} = recorder(640, 440);
  drawWorldJobMap(context, canvas, big);
  for (const [index, name] of names.entries()) {
    check(texts.filter(item => item.text === name).length === 1, `${name} is named once`);
    check(texts.some(item => item.text === String(index + 1) && item.align === 'center'), `${name} has the number ${index + 1} on its mark`);
  }
  // The names, the numbers and the land's own five names stand apart from each other and inside the picture.
  const named = texts.filter(item => names.includes(item.text) || SCABLANDS_LAND.places.some(place => place.name === item.text));
  check(SCABLANDS_LAND.places.every(place => texts.some(item => item.text === place.name)), 'the land keeps its five names beside the lamps');
  for (let i = 0; i < named.length; i++) {
    const a = box(named[i]);
    check(a.left >= 0 && a.right <= 640 && a.top >= 0 && a.bottom <= 440, `${named[i].text} lies inside the picture`);
    for (let j = i + 1; j < named.length; j++) check(!overlap(a, box(named[j])), `${named[i].text} and ${named[j].text} do not print over each other`);
  }
  // The three numbered badges are told apart: no two stand nearer than their own width, and each has a true dot where its lamp is.
  const badges = arcs.filter(arc => arc.r === 9 && arc.fill === '#ffce75'), dots = arcs.filter(arc => arc.r === 3.5);
  check(badges.length === 3 && dots.length === 3, 'three numbered badges and three true dots');
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) check(Math.hypot(badges[i].x - badges[j].x, badges[i].y - badges[j].y) >= 18, 'two badges never touch');
  check(dots.every(dot => dot.x > 0 && dot.x < 640 && dot.y > 0 && dot.y < 440), 'the true dots lie on the map');
}
// ---- 2. A job with places far apart keeps one numbered ring and one name for each; the small panel is not changed ------------------------
{
  const flags = EVERBURN_SIDE_JOBS.find(job => job.id === 'everburn-survey-flags'), pick = {...flags, steps: [{kind: 'onfoot', places: flags.steps[0].finds, returnToCar: flags.steps[0].finds[0]}]};
  const big = mapOf(pick), names = big.places.map(place => place.name);
  check(names.length === 5, 'five survey flags are five places');
  const {context, texts, canvas} = recorder(640, 440);
  drawWorldJobMap(context, canvas, big);
  for (const [index, name] of names.entries()) {
    check(texts.some(item => item.text === name), `${name} is named`);
    check(texts.some(item => item.text === String(index + 1)), `${name} is numbered ${index + 1}`);
  }
  const small = recorder(400, 280);
  drawWorldJobMap(small.context, small.canvas, {...big, land: undefined});
  check(!small.texts.some(item => /^[1-5]$/.test(item.text)), 'the small panel draws no numbers: its names are as they were');
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
