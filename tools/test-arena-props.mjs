import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {unstuckInput} from '../src/demo-unstuck.js';
import {COURSE} from '../src/config.js';
import {addArenaCrushables} from '../src/arena-props.js';
const course=new Course(COURSE.find(c=>c.arena),1989),world=new THREE.Group(),group=addArenaCrushables(world,course);
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const bounds=object=>{world.updateMatrixWorld(true);const inverse=object.matrixWorld.clone().invert(),box=new THREE.Box3(),point=new THREE.Vector3();object.traverse(m=>{if(!m.isMesh)return;const position=m.geometry.attributes.position,matrix=inverse.clone().multiply(m.matrixWorld);for(let i=0;i<position.count;i++)box.expandByPoint(point.fromBufferAttribute(position,i).applyMatrix4(matrix));});return box;};
const original=group.children.map(bounds);
check(group.children.length===course.features.crushables.length,'Every physical salvage car has a visible shell');
for(let i=0;i<original.length;i++){
 const b=original[i],feature=course.features.crushables[i];
 check(b.min.x>=-feature.halfX-.005&&b.max.x<=feature.halfX+.005,'Intact body fits its collision width');
 check(b.min.z>=-feature.halfZ-.005&&b.max.z<=feature.halfZ+.005,'Intact body fits its collision length');
 check(b.max.y<=feature.height,'Intact body fits vertical clearance');
 check(Math.max(feature.halfX + b.min.x, feature.halfX - b.max.x, feature.halfZ + b.min.z,
   feature.halfZ - b.max.z, feature.height - b.max.y) <= .3, 'The visible wreck fills its contact bounds within 0.3 m');
}
const id=course.features.crushables[0].id;
group.userData.updateSimulation({crushedProps:[id]},.04);
const partial=bounds(group.children[0]);
check(partial.max.y<original[0].max.y&&partial.max.y>.7,'Deformation animates through a partial crush');
for(let i=0;i<120;i++)group.userData.updateSimulation({crushedProps:[id]},1/60);
const flat=bounds(group.children[0]);
check(flat.max.y<.72,'Roof and cabin collapse below the truck');
check(bounds(group.children[1]).equals(original[1]),'Other salvage cars retain their intact geometry');
group.userData.updateSimulation({crushedProps:[]},0);
for(let i=0;i<original.length;i++)check(bounds(group.children[i]).equals(original[i]),'New race resets the visible shell');
check(addArenaCrushables(new THREE.Group(),new Course(COURSE[0],1989))===null,'Paved events contain no arena salvage');

const dt = 1 / 120, titanStage = COURSE.findIndex(course => course.id === 'titan-arena');
const limited = value => Math.max(-1, Math.min(1, value));

function titanRace(car, tricks) {
  const duel = new Duel({seed: 1989});
  duel.featureFlags = {enabled: name => tricks && name === 'arena-tricks'};
  duel.startCampaign({car, startStage: titanStage, cpuDifficulty: 'easy', mode: 'duel', playerId: 'wreck-test'});
  duel.state.status = 'racing';
  return duel;
}

function placeAtWrecks(duel, actor, start = 660, lateral = -5.2) {
  const y = duel.course.groundAt(start, lateral).y;
  Object.assign(actor, {s: start, prevS: start, lateral, prevLateral: lateral, speedMph: 30, headingError: 0,
    groundHeight: y, prevGroundHeight: y, _jumpY: y, airborne: false, impactTimer: 0});
}

const laneInput = state => ({
  throttle: 1, brake: 0, steer: limited((state.lateral + 5.2) * .22 + (state.headingError || 0) * 1.4), boost: false,
});

function pastWrecks(duel, actor, chooseInput, finish = 691) {
  for (let tick = 0; tick < 10 / dt; tick++) {
    const input = chooseInput();
    if (input) duel.setInput(input);
    duel.step(dt);
    if (actor.s >= finish) return (tick + 1) * dt;
  }
  return null;
}

for (const tricks of [false, true]) {
  const duel = titanRace('dusthawk_rally', tricks), state = duel.state, driver = {};
  placeAtWrecks(duel, state);
  let waited = null;
  const elapsed = pastWrecks(duel, state, () => {
    const input = unstuckInput(driver, duel), plan = state._titanWreckDetour;
    if (plan?.lane != null && waited == null) waited = state.stageTimeSec - plan.since;
    return input ?? laneInput(state);
  });
  check(elapsed != null, 'Dusthawk goes around both intact wrecks in ten seconds with tricks ' + (tricks ? 'on' : 'off'));
  check(waited != null && waited >= 1 - 1e-8 && waited < 1 + dt, 'the detour starts after a full second held at the wreck');
  check(state.crushedProps.length === 0, 'the lighter Dusthawk leaves both wrecks intact');
  console.log('Dusthawk with tricks ' + (tricks ? 'on' : 'off') + ': past both wrecks in ' + elapsed.toFixed(2) + ' s.');
}

{
  const duel = titanRace('dusthawk_rally', false), state = duel.state;
  placeAtWrecks(duel, state);
  const demo = Object.assign(Object.create(App.prototype), {duel, _scriptedCrashDone: true});
  const elapsed = pastWrecks(duel, state, () => demo._driveAutopilot(dt));
  check(elapsed != null, 'the game’s demo driver passes both wrecks through its normal entry point');
  check(state.crushedProps.length === 0, 'the demo driver does not crush either wreck');
}

{
  const duel = titanRace('dusthawk_rally', false), rival = duel.state.opponents[0];
  rival.car = 'dusthawk_rally';
  placeAtWrecks(duel, rival);
  const elapsed = pastWrecks(duel, rival, () => ({throttle: 0, brake: 1, steer: 0, boost: false}));
  check(elapsed != null, 'the normal race rival steers around both wrecks');
  check(duel.state.crushedProps.length === 0, 'the rival likewise leaves the bodies intact');
  console.log('Dusthawk rival: past both wrecks in ' + elapsed.toFixed(2) + ' s.');
}

{
  const duel = titanRace('titan_monster', false), state = duel.state;
  placeAtWrecks(duel, state);
  const wrecks = duel.course.features.crushables.filter(prop => prop.s === 680 || prop.s === 685.5);
  check(pastWrecks(duel, state, () => laneInput(state)) != null, 'the Titan still drives through the row');
  check(wrecks.every(prop => state.crushedProps.includes(prop.id)), 'the Titan still crushes both original wrecks');
}

// The Dusthawk's rotated rectangle misses this corner. Growing the wreck
// by axis projections alone would catch it despite the visible gap.
{
  const duel = titanRace('dusthawk_rally', false), {course, state} = duel;
  const prop = course.features.crushables.find(entry => entry.s === 680);
  const cos = Math.cos(prop.heading), sin = Math.sin(prop.heading);
  const near = course.nearest(prop.x + 3 * cos - 4.1 * sin, prop.z - 3 * sin - 4.1 * cos, prop.s);
  const y = course.groundAt(near.s, near.lateral).y;
  Object.assign(state, {s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral,
    headingError: prop.heading + Math.PI / 4 - course.at(near.s).heading,
    speedMph: 30, groundHeight: y, prevGroundHeight: y});
  duel._crushProps(state);
  check(state.speedMph === 30, 'a clear rotated Dusthawk corner does not hit the visible wreck');
}


for (const [row, side] of [[330, 1], [680, -1], [960, 1]]) {
  const duel = titanRace('dusthawk_rally', false), state = duel.state, driver = {};
  const lane = side * 6.55, start = row - 20;
  placeAtWrecks(duel, state, start, lane);
  let chosenLane = null;
  const elapsed = pastWrecks(duel, state, () => {
    const input = unstuckInput(driver, duel);
    chosenLane ??= state._titanWreckDetour?.lane ?? null;
    return input ?? {...laneInput(state), steer: limited((state.lateral - lane) * .22 + (state.headingError || 0) * 1.4)};
  }, row + 11);
  check(elapsed != null && side * chosenLane > 6.55, 'the Dusthawk passes on the clear outside of the ' + row + ' m row');
  console.log('Outside approach at ' + row + ' m: past the row in ' + elapsed.toFixed(2) + ' s.');
}

console.log(`Arena salvage models and drives: ${checks} checks passed.`);
