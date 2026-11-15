import assert from 'node:assert/strict';
import {machineDefinition} from '../src/machines/content/machines.js';
import {BORER_NO_FACE, BORER_OBSTRUCTION, BORER_OPEN_GROUND, BORER_STALL, borerHasFace, borerMuckPile, createBorerState, stepBorer} from '../src/machines/borer.js';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {borerYardControls, closeDigSandbox, createDigBorer, createDigSandbox, digSandboxMachineState, exportDigTunnels, importDigTunnels, stepDigSandbox} from '../src/machines/dig-sandbox.js';
import {SCARPS} from '../src/world/scablands-scarps.js';
import {scablandsNaturalHeightAt} from '../src/world/scablands-ground.js';

const flat = createGroundEdit({region:{editable:true}, naturalHeight:()=>0});
const hill = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0});
const blocked = createGroundEdit({region:{editable:true}, naturalHeight:()=>6, reservedShapes:[{x:0,z:0,radius:1}]});
const strata = createGroundEdit({region:{editable:true}, naturalHeight:()=>20, seed:19});
assert.equal(strata.materialAt(0, 20, 0), 'topsoil');
assert.equal(strata.materialAt(0, 17, 0), 'clay');
assert.equal(strata.materialAt(0, 5, 0), 'rock');
const sampledMaterial = strata.materialAt(0, 12, 0);
const sampledCut = strata.cut({x:0,z:0,radius:0.1}, 12, 8);
assert.ok(sampledCut.volumes[sampledMaterial] > 0, 'The face query agrees with the ground cut layers.');
const pile = createGroundEdit({region:{editable:true}, naturalHeight:()=>0});
pile.fill({x:0,z:0,radius:1}, 'gravel', 10);
assert.equal(pile.materialAt(0, 1, 0), 'gravel');
assert.throws(() => pile.materialAt(NaN, 0, 0), TypeError);
assert.equal(machineDefinition('borer').name, 'Mabel');
assert.equal(machineDefinition('borer').boreRadiusM, 3);
assert.deepEqual(borerYardControls({KeyW:true,KeyA:true,ArrowUp:true}), {forward:1,steer:-1,slope:1});
assert.deepEqual(borerYardControls({KeyS:true,KeyD:true,ArrowDown:true}), {forward:-1,steer:1,slope:-1});
assert.deepEqual(borerYardControls({}, {axes:[0.4,-0.6]}, {drive:{steer:0,forward:1}}),
  {forward:0.6,steer:0.4,slope:0}, 'The borer uses the existing mapped machine axes.');
assert.equal(borerHasFace(flat, {x:0,z:0}, 0), false);
assert.equal(borerHasFace(hill, {x:0,z:0}, 0), true);
assert.equal(stepBorer(createBorerState(), {thrust:1}, flat, 'clay', 1).state.message, BORER_NO_FACE);
assert.equal(stepBorer(createBorerState(), {thrust:1}, blocked, 'clay', 1).state.message, BORER_OBSTRUCTION);
const protectedEdge = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0,
  reservedShapes:[{x:0,z:20,radius:1,sentence:"That's Tin Town. Auntie Solder would have words."}]});
const edgeStop = stepBorer(createBorerState(), {thrust:1}, protectedEdge, 'topsoil', 50);
assert.ok(edgeStop.state.z <= 16, 'The cutting radius stays outside the protected place.');
assert.equal(edgeStop.state.message, "That's Tin Town. Auntie Solder would have words.");
assert.equal(edgeStop.events.filter(event => event.cue === 'borer.refuse').length, 1);
const cutting = createGroundEdit({region:{editable:true}, naturalHeight:()=>6});
cutting.cut({x:0,z:0,radius:2}, 0);
assert.equal(borerHasFace(cutting, {x:0,z:0}, 0), true, 'A dug cutting exposes a face.');
let result = stepBorer(createBorerState(), {thrust:1}, hill, 'rock', 2);
assert.equal(result.state.stalled, true);
assert.equal(result.state.message, BORER_STALL);
assert.equal(result.events.at(-1).cue, 'borer.stall');
const deepRock = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 25 : 0});
const fromFace = stepBorer({...createBorerState({z:10}), started:true}, {thrust:1}, deepRock, null, 2);
assert.equal(fromFace.state.stalled, true, 'The head uses the material at the face.');
result = stepBorer(result.state, {}, hill, 'rock', 1);
assert.equal(result.state.stalled, false);
let running = stepBorer(createBorerState(), {thrust:1,steer:1,slope:1}, hill, 'topsoil', 20).state;
assert.ok(Math.abs(running.distanceM - 10) < 1e-8);
assert.ok(running.heading <= running.distanceM * Math.PI / 360 + 1e-9);
assert.ok(running.slope <= running.distanceM * Math.PI / 600 + 1e-9);
const stopped = stepBorer(running, {steer:1,slope:1}, hill, 'rock', 2).state;
assert.equal(stopped.heading, running.heading);
assert.equal(stopped.slope, running.slope);
const initial = createBorerState();
const forty = stepBorer(initial, {thrust:1}, hill, 'topsoil', 80).state;
const sandbox = createDigSandbox({ground:hill});
let digBorer = {...sandbox, activeMachine:'borer', mode:'work', borer:createBorerState()};
digBorer = stepDigSandbox(digBorer, {controls:{forward:1}}, 1);
assert.ok(digBorer.borer.distanceM > 0, 'Work controls advance the Dig borer.');
assert.deepEqual(exportDigTunnels(digBorer), digBorer.borer.segments, 'The Dig exposes the new cut as tunnel geometry.');
assert.equal(digSandboxMachineState(digBorer), digBorer.borer);
const cutDistance = digBorer.borer.distanceM;
digBorer = stepDigSandbox(digBorer, {controls:{forward:-1}}, 0.1);
assert.ok(digBorer.borer.travelM < cutDistance, 'Reverse follows the cut.');
assert.equal(digBorer.borer.distanceM, cutDistance);
let driving = {...sandbox, activeMachine:'borer', mode:'drive', borer:createBorerState()};
driving = stepDigSandbox(driving, {controls:{forward:1}}, 1);
assert.ok(Math.abs(driving.borer.z - 4 / 3.6) < 1e-8, 'Open ground speed is four kilometres per hour.');
assert.equal(driving.borer.segments.length, 0, 'Driving does not cut.');
const parked = createDigBorer(hill);
const scarp = SCARPS.find(item => item.id === 'scab-west').stretches[0];
const middle = {x:(scarp.a.x + scarp.b.x) / 2, z:(scarp.a.z + scarp.b.z) / 2};
assert.ok(Math.abs(Math.hypot(parked.x - middle.x, parked.z - middle.z) - 30) < 1e-8);
assert.ok(Math.hypot(parked.x + 30 * Math.sin(parked.heading) - middle.x,
  parked.z + 30 * Math.cos(parked.heading) - middle.z) < 1e-8, 'Mabel faces the scarp from its open side.');
assert.equal(parked.y, hill.heightAt(parked.x, parked.z));
const realGround = {heightAt:scablandsNaturalHeightAt};
const realParked = createDigBorer(realGround);
const foot = {x:realParked.x + 33 * Math.sin(realParked.heading), z:realParked.z + 33 * Math.cos(realParked.heading)};
assert.equal(borerHasFace(realGround, foot, realParked.heading), true, 'The real scarp offers a face after the approach.');
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
Object.defineProperty(globalThis, 'localStorage', {configurable:true, get() { throw new Error('Tunnel exchange must not access storage.'); }});
const restored = importDigTunnels(sandbox, JSON.parse(JSON.stringify(forty.segments)));
assert.deepEqual(exportDigTunnels(restored), forty.segments, 'A bored tunnel survives a plain-data round trip.');
const exported = exportDigTunnels(restored);
exported[0].start.x += 100;
assert.deepEqual(exportDigTunnels(restored), forty.segments, 'Exported data cannot alter the visit.');
assert.deepEqual(exportDigTunnels(importDigTunnels(restored)), [], 'Missing tunnel data means no tunnels.');
if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
else delete globalThis.localStorage;
closeDigSandbox();
const muckGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0});
const muckCut = stepBorer(createBorerState(), {thrust:1}, muckGround, 'topsoil', 80).state;
const pileVolume = () => muckGround.toSave().chunks.reduce((sum, chunk) =>
  sum + chunk.delta.reduce((total, height) => total + height, 0), 0) * 1.25;
const expectedMuck = Math.PI * 3 ** 2 * 40 * 1.25;
assert.ok(Math.abs(pileVolume() / expectedMuck - 1) < 0.02, 'The pile contains the bulked bore volume.');
const beforeReverse = pileVolume();
stepBorer(muckCut, {thrust:-1}, muckGround, 'topsoil', 5);
assert.equal(pileVolume(), beforeReverse, 'Returning through the tunnel creates no muck.');
const blockedPile = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0,
  reservedShapes:[{x:10,z:0,radius:1,sentence:'This place is protected.'}]});
const pileStop = stepBorer(createBorerState(), {thrust:1}, blockedPile, 'topsoil', 2);
assert.equal(pileStop.state.distanceM, 0);
assert.equal(pileStop.state.message, 'This place is protected.');
assert.equal(blockedPile.chunkCount, 0, 'A protected pile cannot lose the cut material.');
assert.equal(borerMuckPile([]), null);
assert.deepEqual(borerMuckPile(forty.segments), {x:10,z:0,radius:0.75});
assert.deepEqual(borerMuckPile([{start:{x:2,z:3},end:{x:7,z:3}}]), {x:2,z:-7,radius:0.75});
assert.throws(() => borerMuckPile([{start:{x:0,z:0},end:{x:0,z:0}}]), RangeError);
assert.deepEqual(initial.segments, [], 'Cutting does not alter the prior state.');
assert.equal(forty.segments.length, 1, 'A straight cut stays one segment.');
const bore = createGroundTunnels(forty.segments, {heightAt:(x,z)=>hill.heightAt(x,z)});
assert.ok(Math.abs(bore.length - 40) < 1e-7);
assert.equal(bore.startOpen, true);
assert.equal(bore.endOpen, false);
assert.equal(bore.constrainMotion({x:0,y:0,z:39}, {x:0,y:0,z:41}).hit, true);
const reversed = stepBorer(forty, {thrust:-1, steer:1, slope:1}, hill, 'topsoil', 10).state;
assert.ok(Math.abs(reversed.z - 26) < 1e-6, 'Reverse follows the cut at walking pace.');
assert.equal(reversed.headSpeed, 0);
assert.deepEqual(reversed.segments, forty.segments, 'Reverse does not remove the tunnel.');
assert.equal(reversed.distanceM, forty.distanceM);
const returned = stepBorer(reversed, {thrust:1}, hill, 'topsoil', 28).state;
assert.ok(Math.abs(returned.z - 40) < 1e-6, 'Forward travel returns to the cutting face.');
assert.deepEqual(returned.segments, forty.segments, 'Travelling through a cut does not cut it again.');
const bent = stepBorer(createBorerState(), {thrust:1, steer:1, slope:1}, hill, 'topsoil', 20).state;
const backedToMouth = stepBorer(bent, {thrust:-1, steer:-1}, hill, 'topsoil', 20).state;
assert.ok(Math.hypot(backedToMouth.x, backedToMouth.y, backedToMouth.z) < 1e-7,
  'Reverse follows the bends and slope back to the mouth.');
assert.equal(backedToMouth.travelM, 0);
assert.equal(stepBorer(createBorerState(), {thrust:-1}, hill, 'topsoil', 1).state.distanceM, 0);
const explicitEnds = createGroundTunnels(forty.segments, {heightAt:()=>0});
assert.equal(explicitEnds.startOpen, true);
assert.equal(explicitEnds.endOpen, false, 'An unfinished face stays closed even at surface height.');
assert.equal(explicitEnds.mouths.length, 1);
assert.equal(explicitEnds.constrainMotion({x:0,y:0,z:39}, {x:0,y:0,z:41}).hit, true);
assert.deepEqual(explicitEnds.segments, forty.segments, 'Explicit end states survive a ground-tunnel round trip.');
const openEnds = createGroundTunnels([{...forty.segments[0], endOpen:true}], {heightAt:()=>6});
assert.equal(openEnds.endOpen, true, 'An explicitly opened mouth remains open.');
assert.equal(openEnds.constrainMotion({x:0,y:0,z:39}, {x:0,y:0,z:41}).hit, false);
assert.throws(() => createGroundTunnels([{...forty.segments[0], endOpen:'yes'}]), TypeError);
const farFace = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 && z < 30 ? 8 : 0});
const breakthrough = stepBorer(createBorerState(), {thrust:1}, farFace, 'topsoil', 100);
assert.equal(breakthrough.state.finished, true);
assert.equal(breakthrough.state.segments.at(-1).endOpen, true);
assert.equal(breakthrough.events.filter(event => event.cue === 'borer.breakthrough').length, 1);
const openBore = createGroundTunnels(breakthrough.state.segments, {heightAt:(x,z)=>farFace.heightAt(x,z)});
assert.equal(openBore.constrainMotion({x:0,y:0,z:29}, {x:0,y:0,z:31}).hit, false);
assert.equal(openBore.constrainMotion({x:0,y:0,z:31}, {x:0,y:0,z:29}).hit, false);
const otherPassage = createGroundTunnels([{start:{x:-20,y:1.65,z:25}, end:{x:20,y:1.65,z:25}, radius:3}]);
const junctionGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 8 : 0});
const junction = stepBorer(createBorerState(), {thrust:1, tunnels:otherPassage}, junctionGround, 'topsoil', 80);
assert.equal(junction.state.finished, true, 'The head breaks into an existing passage.');
assert.equal(junction.state.segments.at(-1).endOpen, true);
assert.equal(junction.events.filter(event => event.cue === 'borer.breakthrough').length, 1);
const joinedCut = createGroundTunnels(junction.state.segments, {heightAt:(x,z)=>junctionGround.heightAt(x,z)});
assert.equal(joinedCut.mouths.length, 1, 'An underground junction does not make a surface mouth.');
const highPassage = createGroundTunnels([{start:{x:-20,y:11.65,z:25}, end:{x:20,y:11.65,z:25}, radius:3}]);
const noJunction = stepBorer(createBorerState(), {thrust:1, tunnels:highPassage},
  createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 8 : 0}), 'topsoil', 60);
assert.equal(noJunction.state.finished, false, 'A passage on another level does not open the face.');
const shallow = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : 2});
const stoppedUnderGround = stepBorer(createBorerState(), {thrust:1}, shallow, 'topsoil', 100);
assert.equal(stoppedUnderGround.state.message, BORER_OPEN_GROUND);
assert.equal(stoppedUnderGround.state.segments.at(-1).endOpen, false);
assert.ok(stoppedUnderGround.state.z <= 27.01);
assert.equal(stoppedUnderGround.events.filter(event => event.message === BORER_OPEN_GROUND).length, 1);
// A self-crossing cut can be driven between its two passages. A crossing
// on another level remains rock, and a car cannot leave either bore's floor.
const crossingSegments = [
  {start:{x:-20,y:1.65,z:0}, end:{x:20,y:1.65,z:0}, radius:3},
  {start:{x:20,y:1.65,z:0}, end:{x:20,y:1.65,z:-20}, radius:3},
  {start:{x:20,y:1.65,z:-20}, end:{x:0,y:1.65,z:-20}, radius:3},
  {start:{x:0,y:1.65,z:-20}, end:{x:0,y:1.65,z:20}, radius:3},
];
const crossing = createGroundTunnels(crossingSegments);
for (const [start, end] of [
  [{x:-1,y:0,z:0},{x:0,y:0,z:2}],
  [{x:0,y:0,z:2},{x:-1,y:0,z:0}],
]) assert.equal(crossing.constrainMotion(start, end, 0.5).hit, false, 'Cars can turn through a junction.');
assert.equal(crossing.constrainMotion({x:-1,y:0,z:0},{x:0,y:0,z:4},0.5).hit, false,
  'Cars can continue along the crossing passage.');
const separated = createGroundTunnels(crossingSegments.map((segment, index) => index === 3
  ? {...segment, start:{...segment.start,y:11.65}, end:{...segment.end,y:11.65}}
  : index === 2 ? {...segment,end:{...segment.end,y:11.65}} : segment));
assert.equal(separated.constrainMotion({x:-1,y:0,z:0},{x:0,y:0,z:4},0.5).hit, true,
  'A crossing high above does not open the wall.');
console.log('Borer: machine data, controls and a 40 m closed cut passed.');
