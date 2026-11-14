// EVERBURN-REMAKE, slice 1: Claude runs this memory-only browser walk to take the pictures of Hot Delivery's ember: the start with the
// pot bright; on the road; on scab rock at speed with sparks and the gauge flashing; the pot out with the marker at a brazier; a scoop;
// and the arrival. The car is put on each spot the way a job puts its car at its start, then driven by the game's own rules.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {EAST_ROAD} from '../../src/world/scablands-road.js';
import {pointAlong} from '../../src/world/scablands-road-geometry.js';

// SCABLANDS-LAND round 4, slice 2a: every spot is written from the land's names and the East Road (it was typed at the first land's positions).
const on = (point, dx = 0, dz = 0) => ({x: point.x + dx, z: point.z + dz});
const eastRoad = metres => pointAlong(EAST_ROAD.points, metres);

async function click(c, selector) {
  return c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
}
const key = (c, type, name, code, windowsVirtualKeyCode) => c.command('Input.dispatchKeyEvent', {type, key: name, code, windowsVirtualKeyCode});
// Stands the car on (x, z) facing (tx, tz) at `kmh`, the way initializeWorldJob puts a car at its start.
const place = (c, x, z, tx, tz, kmh) => c.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state,wrap=v=>Math.atan2(Math.sin(v),Math.cos(v));
  const pose=d.course.nearest(${x},${z});s.s=s.prevS=pose.s;s.lateral=s.prevLateral=pose.lateral;
  s.headingError=wrap(Math.atan2((${tx})-(${x}),(${tz})-(${z}))-d.course.at(pose.s).heading);s.speedMph=${kmh}/1.609344;s.yawVelocity=0;s.pushVelocity=0;
  s.arena.worldJob.lastKmh=${kmh};return true})()`);
const held = c => c.evaluate(`(()=>{const j=window.__qaApp.duel.state.arena.worldJob;return {...j.job.stepState,marker:j.marker?.id??null,done:window.__qaApp.duel.state.status==='arena_result'}})()`);

export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-ember');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"', 'memory-only Everburn menu', 60000);
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');
    a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true}};a._saveProfile();})()`);
  await click(c, '#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 60000);
  await click(c, '[data-action="yard-cards"]');
  await c.waitFor('document.querySelector(".ember-wall")', 'Hollis note on Story Wall');
  await click(c, '[data-ember-step="read"]');
  await c.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
  await click(c, '[data-ember-step="hot-delivery"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"', 'first Everburn job', 60000);
  // The rule is the same on every difficulty but Easy halves jolts; the pictures are taken on Medium so that a short run shows the damage.
  await c.evaluate(`window.__qaApp.duel.state.cpuDifficulty='medium'`);
  await c.waitFor('window.__qaApp.duel.state.status==="racing"', 'the job racing', 30000);
  await c.evaluate(`window.__qaApp.advance(0.3)`);

  // 1. The start: the pot bright on the back of the car, the gauge full, the brazier beside the yard gate.
  await c.screenshot('1-start');

  // 2. On the road: the darker band under the wheels, the gauge nearly full and not falling faster than cold.
  const road = eastRoad(300), ahead = eastRoad(360);
  await place(c, road.x, road.z, ahead.x, ahead.z, 100);
  await key(c, 'keyDown', 'w', 'KeyW', 87);
  await c.evaluate(`window.__qaApp.advance(1.5)`);
  await c.screenshot('2-road');
  const onRoad = await held(c);

  // 3. On scab rock at speed: sparks off the pot, the gauge flickering, ember falling fast.
  // (the straight way to Tin Town crosses the scab plates from 600 m east of the yard; 140 km/h there is far over the plates' safe 50)
  const plates = LAND.at('yard', 1200, 0), town = LAND.place('tin-town');
  await place(c, plates.x, plates.z, town.x, town.z, 140);
  await c.evaluate(`window.__qaApp.advance(4)`);
  await c.screenshot('3-rock-at-speed');
  const rock = await held(c);

  // 3b. A hit: the pot throws sparks and the gauge flashes. The car runs at the pair of junk cars by the Boneyard and is stopped on the first jolt.
  const junk = LAND.at('yard', 460, 289), before = on(junk, 0, -89);
  await place(c, before.x, before.z, junk.x, junk.z, 70);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<120&&!(a.duel.state.arena.worldJob.job.stepState.joltCount>0);i++)a.advance(0.05)})()`);
  await c.evaluate(`window.__qaApp.advance(0.1)`);
  await c.screenshot('3b-hit');
  const hit = await held(c);

  // 4. The pot out: nothing ends, the marker is at the nearest brazier.
  const start = LAND.at('yard', 1200, 0);
  await place(c, start.x, start.z, town.x, town.z, 150);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<80&&!a.duel.state.arena.worldJob.job.stepState.out;i++)a.advance(0.5)})()`);
  await key(c, 'keyUp', 'w', 'KeyW', 87);
  await c.evaluate(`window.__qaApp.advance(0.4)`);
  await place(c, 36, -8, 0, 0, 25);
  await c.evaluate(`window.__qaApp.advance(0.2)`);
  await c.screenshot('4-out');
  const out = await held(c);

  // 5. A scoop: rolling slowly into the brazier's ring lights the pot again.
  await place(c, 26, -6, 0, 0, 16);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<60&&a.duel.state.arena.worldJob.job.stepState.out;i++)a.advance(0.1)})()`);
  await c.evaluate(`window.__qaApp.advance(0.2)`);
  await c.screenshot('5-scoop');
  const scoop = await held(c);

  // 6. The arrival: the results screen says how the ember arrived.
  const gate = LAND.at('tin-town', -25, 70); // slice 2b: the gate's fence stands at -5 (it is solid now): the car starts on the road, in line with the opening
  await place(c, gate.x, gate.z, town.x, town.z, 55);
  await key(c, 'keyDown', 'w', 'KeyW', 87);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<80&&a.duel.state.status!=='arena_result';i++)a.advance(0.25)})()`);
  await key(c, 'keyUp', 'w', 'KeyW', 87);
  await c.waitFor('window.__qaApp.duel.state.status==="arena_result"', 'Hot Delivery result', 30000);
  await c.waitFor('document.querySelector(".result-panel")', 'the results screen');
  const text = await c.evaluate(`document.querySelector('.result-panel').innerText`);
  if (!/The ember arrived/.test(text)) throw Error('The results screen does not say how the ember arrived: ' + text);
  await c.screenshot('6-arrival');
  const summary = {road: onRoad.ember, rock: rock.ember, hit: hit.ember, hitJolts: hit.joltCount, out: out.out, outMarker: out.marker, scoopRelights: scoop.relights, scoopEmber: scoop.ember, result: text.slice(0, 400)};
  if (!(onRoad.ember > 95)) throw Error('On the road the ember should barely fall: ' + JSON.stringify(summary));
  if (!(rock.ember < onRoad.ember - 10)) throw Error('On rock at speed the ember should fall fast: ' + JSON.stringify(summary));
  if (!(hit.joltCount > 0)) throw Error('The hit did not jolt the pot: ' + JSON.stringify(summary));
  if (out.out !== true || out.marker !== 'yard-gate') throw Error('The pot did not go out with the marker at the yard brazier: ' + JSON.stringify(summary));
  if (!(scoop.relights >= 1 && scoop.ember > 95)) throw Error('The scoop did not light the pot again: ' + JSON.stringify(summary));
  await writeFile(join(c.outputDir, 'everburn-ember.json'), JSON.stringify(summary) + '\n');
}
