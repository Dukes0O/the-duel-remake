// EVERBURN-REMAKE, slice 1: Claude runs this memory-only browser walk to take the pictures of Hot Delivery's ember: the start with the
// pot bright; on the road; on scab rock at speed with sparks and the gauge flashing; the pot out with the marker at a brazier; a scoop;
// and the arrival. The car is put on each spot the way a job puts its car at its start, then driven by the game's own rules.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

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
  await place(c, 60, 39, 230, 150, 100);
  await key(c, 'keyDown', 'w', 'KeyW', 87);
  await c.evaluate(`window.__qaApp.advance(1.5)`);
  await c.screenshot('2-road');
  const road = await held(c);

  // 3. On scab rock at speed: sparks off the pot, the gauge flickering, ember falling fast.
  await place(c, 150, 0, 600, 0, 140);
  await c.evaluate(`window.__qaApp.advance(2)`);
  await c.screenshot('3-rock-at-speed');
  const rock = await held(c);

  // 3b. A hit: the pot throws sparks and the gauge flashes. The car runs at the pair of junk cars by the Boneyard and is stopped on the first jolt.
  await place(c, 460, 200, 460, 289, 70);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<120&&!(a.duel.state.arena.worldJob.job.stepState.joltCount>0);i++)a.advance(0.05)})()`);
  await c.evaluate(`window.__qaApp.advance(0.1)`);
  await c.screenshot('3b-hit');
  const hit = await held(c);

  // 4. The pot out: nothing ends, the marker is at the nearest brazier.
  await place(c, 120, 0, 600, 0, 150);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<40&&!a.duel.state.arena.worldJob.job.stepState.out;i++)a.advance(0.5)})()`);
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
  await place(c, 595, 70, 600, 0, 55);
  await key(c, 'keyDown', 'w', 'KeyW', 87);
  await c.evaluate(`(()=>{const a=window.__qaApp;for(let i=0;i<80&&a.duel.state.status!=='arena_result';i++)a.advance(0.25)})()`);
  await key(c, 'keyUp', 'w', 'KeyW', 87);
  await c.waitFor('window.__qaApp.duel.state.status==="arena_result"', 'Hot Delivery result', 30000);
  await c.waitFor('document.querySelector(".result-panel")', 'the results screen');
  const text = await c.evaluate(`document.querySelector('.result-panel').innerText`);
  if (!/The ember arrived/.test(text)) throw Error('The results screen does not say how the ember arrived: ' + text);
  await c.screenshot('6-arrival');
  const summary = {road: road.ember, rock: rock.ember, hit: hit.ember, hitJolts: hit.joltCount, out: out.out, outMarker: out.marker, scoopRelights: scoop.relights, scoopEmber: scoop.ember, result: text.slice(0, 400)};
  if (!(road.ember > 95)) throw Error('On the road the ember should barely fall: ' + JSON.stringify(summary));
  if (!(rock.ember < road.ember - 10)) throw Error('On rock at speed the ember should fall fast: ' + JSON.stringify(summary));
  if (!(hit.joltCount > 0)) throw Error('The hit did not jolt the pot: ' + JSON.stringify(summary));
  if (out.out !== true || out.marker !== 'yard-gate') throw Error('The pot did not go out with the marker at the yard brazier: ' + JSON.stringify(summary));
  if (!(scoop.relights >= 1 && scoop.ember > 95)) throw Error('The scoop did not light the pot again: ' + JSON.stringify(summary));
  await writeFile(join(c.outputDir, 'everburn-ember.json'), JSON.stringify(summary) + '\n');
}
