// OPEN-PEN-DRAIN-BANK: the installed metre grid, production foot mover and scenario inputs must all cross the drain.
import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {createFighter, stepFighter, FIGHTER_STEP_SECONDS} from '../src/onfoot.js';
import {footControlInput} from '../src/input-contexts.js';
import {SCABLANDS_VENUE} from '../src/world/scablands.js';
import {scablandsNaturalHeightAt, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {installSiteGround} from '../src/world/open/site-ground.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {RATS_NEST_LAYOUT as L, ratsNestSolids} from '../src/world/open/looks/rats-nest-look.js';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {sampleWorld} from '../src/world/open/samples.js';
import {BURNED_PEN} from '../src/world/open/content/burned-pen.js';
import {pageFunctions, penApproach, gateApproach} from './scenarios/open-burned-pen.mjs';

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
let samples = 0, walks = 0, yardRoutes = 0;
for (const seed of new Set([sampleWorld('after-the-smoke').open.landSeed, 0, 12])) {
  const nest = sitePosition('rats-nest', seed), course = new Course(SCABLANDS_VENUE, seed);
  const onSite = point => ({x: nest.x + point.x, z: nest.z + point.z});
  const at = name => onSite(BURNED_PEN.spots[name] ?? L.spots[name]);
  const mouth = at('drain-out'), pen = at('drain-in'), length = distance(mouth, pen);
  const grid = createJobSolidGrid();
  const car = {arena: {worldJob: {solidGrid: grid}}};
  const restore = installSiteGround(seed, ['rats-nest']);
  try {
    grid.setOpenSolids('rats-nest', ratsNestSolids().map(solid => {
      const x = nest.x + solid.x, z = nest.z + solid.z;
      return {...solid, x, z, base: scablandsSurfaceHeightAt(x, z)};
    }));
    // Include both ends and every metre, querying the same installed ground the game walks on.
    for (let metre = 0; metre <= Math.ceil(length); metre++) {
      const t = Math.min(metre / length, 1), x = mouth.x + (pen.x - mouth.x) * t, z = mouth.z + (pen.z - mouth.z) * t;
      const pose = course.nearest(x, z), ground = course.groundAt(pose.s, pose.lateral).y;
      const floor = scablandsNaturalHeightAt(x, z) + L.drain.floor;
      assert.ok(ground <= floor + 1, `seed ${seed}, metre ${metre}: ground ${ground} blocks drain floor ${floor}`);
      samples++;
    }
    for (const [from, to] of [[mouth, pen], [pen, mouth]]) {
      const fighter = createFighter(course, car, {...course.nearest(from.x, from.z), yaw: Math.atan2(to.x - from.x, to.z - from.z)});
      for (let tick = 0; tick < 120 * 15 && distance(fighter, to) > .05; tick++)
        stepFighter(course, car, fighter, {forward: true});
      assert.ok(distance(fighter, to) <= .05, `seed ${seed}: real foot mover must reach the other end`);
      assert.equal(fighter.slopeStops, 0, 'no slope stops');
      assert.equal(fighter.contacts, 0, 'no solid contacts');
      assert.equal(fighter.respawns, 0, 'no respawns');
      walks++;

      // Execute the browser helper without graphics, feeding its keyboard and mouse inputs to the real mover.
      const walker = createFighter(course, car, course.nearest(from.x, from.z));
      const app = {duel: {state: {fighter: walker}}, keys: {}, _footPointer: {lookX: 0, lookY: 0},
        advance(seconds) {
          for (let time = 0; time < seconds - 1e-10; time += FIGHTER_STEP_SECONDS) {
            stepFighter(course, car, walker, footControlInput(this.keys, {}, this._footPointer));
            this._footPointer.lookX = this._footPointer.lookY = 0;
          }
        }};
      globalThis.window = {__qaApp: app};
      try {
        assert.equal(pageFunctions.walkTo(to, 1.5), true);
        assert.ok(distance(walker, to) < .2, 'scenario arrives through movement inputs');
        assert.equal(walker.slopeStops, 0);
        assert.equal(walker.contacts, 0);
        if (from === mouth) {
          for (const target of [at('hide-2'), ...penApproach.map(onSite), onSite(gateApproach), at('pen-gate'), pen, mouth])
            assert.equal(pageFunctions.walkTo(target, 1.5), true, 'the rest of the scenario uses open gaps');
          yardRoutes++;
        }
      }
      finally { delete globalThis.window; }
      assert.ok(walker.steps > length / 4.5 / FIGHTER_STEP_SECONDS, 'scenario advances the production mover');
      assert.equal(app.keys.KeyW, false, 'scenario releases forward');
      walks++;
    }
  } finally { restore(); }
}
console.log(`test-open-pen-drain-bank: passed (${samples} ground samples, ${walks} drain walks, ${yardRoutes} yard routes)`);
