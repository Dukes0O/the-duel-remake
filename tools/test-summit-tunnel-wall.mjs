import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';

// Native contact resolution on the actual course, without graphics or saves.
const original = COURSE[0];
let probes = 0;
try {
  COURSE[0] = SUMMIT_RUN;
  const duel = new Duel({seed:1989,featureFlags:{'summit-run':true}});
  duel.startCampaign({startStage:0,car:'viper_proto'});
  const course = duel.course, state = duel.state;
  assert.ok(course.features.tunnels.length > 0, 'exercise every actual covered stretch');
  for (const tunnel of course.features.tunnels) {
    // One-metre spacing includes the open spaces, portals and wall-cell joins.
    for (let s = tunnel.start; s <= tunnel.end; s++) for (const side of [-1,1]) for (const airHeight of [0,3.8]) {
      const groundHeight = airHeight ? course.groundAt(s,0).y : null;
      Object.assign(state, {status:'racing',prevS:s,s,prevLateral:0,lateral:side*12,
        headingError:side*Math.PI/2,speedMph:100,pushVelocity:0,
        airborne:airHeight>0,airHeight,prevAirHeight:airHeight,groundHeight,prevGroundHeight:groundHeight,
        invulnerableSec:0,impactTimer:0,damageCooldown:0});
      duel._staticContacts(state,true);
      assert.ok(side*state.lateral < tunnel.width,
        `${tunnel.id} at ${s}, side ${side}, air ${airHeight}: hard sideways steering stays inside (${state.lateral})`);
      probes++;
    }
    for (let s = tunnel.start; s < tunnel.end; s += 4) {
      for (const lateral of [0,course.shortcutOffset(course.features.shortcuts.find(row=>row.id==='summit-open-road'),s)]) {
        Object.assign(state, {status:'racing',prevS:s,s:s+1,prevLateral:lateral,lateral,
          headingError:0,speedMph:40,pushVelocity:0,airborne:false,airHeight:0,prevAirHeight:0,
          groundHeight:null,prevGroundHeight:null,invulnerableSec:0,impactTimer:0,damageCooldown:0});
        duel._staticContacts(state,true);
        assert.ok(Math.abs(state.s-s-1)<1e-6 && Math.abs(state.lateral-lateral)<1e-6,
          `${s}/${lateral}: centre and separate bypass remain drivable`);
      }
    }
  }
} finally {
  COURSE[0] = original;
}
console.log(`Summit tunnel walls: ${probes} native sideways contacts held; centre and bypass clear.`);
