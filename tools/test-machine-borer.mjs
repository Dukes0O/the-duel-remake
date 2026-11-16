import assert from 'node:assert/strict';
import {machineDefinition} from '../src/machines/content/machines.js';
import {BORER_NO_FACE, BORER_OBSTRUCTION, BORER_OPEN_GROUND, BORER_STALL, BORER_TRENCH, borerHasFace, borerSurvey, borerMuckPile, createBorerState, stepBorer} from '../src/machines/borer.js';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {createGroundView} from '../src/world/ground-view.js';
import {borerLandRefusal, borerSpoilRefusal, borerYardControls, closeDigSandbox, createDigBorer, createDigSandbox, digSandboxMachineState, exportDigTunnels, importDigTunnels, stepDigSandbox, switchDigMachine} from '../src/machines/dig-sandbox.js';
import {SCARPS} from '../src/world/scablands-scarps.js';
import {HILLS} from '../src/world/scablands-height.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-solids.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {RIVER_LAND} from '../src/world/scablands-regions.js';
import {scablandsNaturalHeightAt,scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {createBorerSounds} from '../src/machines/borer-sounds.js';
import {createDigGroundLook, createDigNearGround, followBorerSlope, poseBorerSlope, updateBorerCamera, updateBorerSurvey} from '../src/machines/dig-game.js';
import {loadMachineInput, onMachineInputChange, saveMachineInput} from '../src/input-setup.js';
import * as THREE from 'three';

// Each spoil load changes only its neighbourhood, not the whole Dig window.
{
  const ground = createGroundEdit({region:{editable:true}, naturalHeight:(_x,z)=>z>=6 ? 20 : 0});
  let borer = {...createBorerState({z:10}), started:true};
  let calls = 0;
  const counted = {...ground, heightAt(x,z) { calls++; return ground.heightAt(x,z); }};
  const near = createDigNearGround(new THREE.MeshBasicMaterial(), counted);
  const view = createGroundView({group:new THREE.Group(), groundEdit:ground});
  near.follow(0, 10); view.update(); calls = 0;
  for (let i=0; i<100; i++) {
    borer = stepBorer(borer, {thrust:1/3}, ground, 'rock', 1/60).state;
    view.update();
    for (const bounds of view.changedBounds) near.refreshBounds(bounds);
    const position = near.geometry.attributes.position;
    for (const bounds of view.changedBounds) for (let j=0; j<position.count; j++) {
      const x=position.getX(j)+near.centreX, z=position.getZ(j)+near.centreZ;
      if (x>=bounds.minX && x<=bounds.maxX && z>=bounds.minZ && z<=bounds.maxZ)
        assert.ok(Math.abs(position.getY(j) - (ground.heightAt(x,z)+.025)) < .02);
    }
  }
  assert.ok(borer.distanceM > 0.8, 'Mabel cuts during the 100 steps.');
  assert.ok(calls < 2000, `100 cutting steps sample ${calls} heights, fewer than 2000`);
  console.log(`100 cutting steps: ${calls} near-ground height samples`);
  near.dispose(); view.dispose();
}

// The Dig supplies both the hills and the land's photographs to its ground shader.
const loadedGroundPhotos=[];
const digLook=createDigGroundLook({texture:new THREE.Texture(),box:{x0:0,z0:0,width:1,depth:1}},
  {load(path){loadedGroundPhotos.push(path);return new THREE.Texture();}});
const digMaterial=digLook.look.apply(new THREE.MeshStandardMaterial());
const digShader={uniforms:{},vertexShader:'#include <common>\n#include <project_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>'};
digMaterial.onBeforeCompile(digShader);
assert.equal(digShader.uniforms.uHillField.value,digLook.hills.texture);
assert.equal(digShader.uniforms.uPhPlate.value,digLook.photos.plates.map);
assert.equal(digShader.uniforms.uTunnelCount.value,0,'The prepared ground has no mouth before cutting.');
const groundProgramKey=digMaterial.customProgramCacheKey(), groundMaterialVersion=digMaterial.version;
digLook.look.setTunnelMouths([{start:{x:1,y:2,z:3},end:{x:1,y:2,z:4},radius:3}]);
assert.equal(digShader.uniforms.uTunnelCount.value,1,'The first mouth reaches the prepared shader.');
assert.equal(digMaterial.customProgramCacheKey(),groundProgramKey,'The first mouth does not change the shader program.');
assert.equal(digMaterial.version,groundMaterialVersion,'The first mouth does not request a shader rebuild.');
assert.ok(loadedGroundPhotos.some(path=>path.endsWith('scablands-scab-rock-colour.jpg')));
assert.ok(digLook.hills.texture.image.data.some(value=>value>0),'The hill field contains raised land.');
digMaterial.dispose();digLook.hills.texture.dispose();digLook.photos.dispose();

// The survey text and strip change together only at displayed precision.
let surveyWrites = 0, surveyDraws = 0;
const surveyText = {set textContent(value) { surveyWrites++; this.value = value; }};
const surveyContext = {clearRect() { surveyDraws++; }, beginPath() {}, moveTo() {}, lineTo() {}, fill() {}, stroke() {}, fillRect() {}};
const surveyPanel = {querySelector: selector => selector === 'p' ? surveyText : {getContext: () => surveyContext}};
const surveyCache = {}, surveyLine = {distanceM:100, riseM:2, gradeOneIn:50, y:0, heights:Array(81).fill(2)};
const surveyState = {started:true, distanceM:10, y:0, slope:0};
assert.equal(updateBorerSurvey(surveyPanel, surveyCache, surveyLine, surveyState), true);
assert.equal(updateBorerSurvey(surveyPanel, surveyCache, surveyLine, {...surveyState, distanceM:10.1, y:0.01}), false);
assert.equal(surveyWrites, 1);
assert.equal(surveyDraws, 1);
assert.equal(updateBorerSurvey(surveyPanel, surveyCache, surveyLine, {...surveyState, distanceM:11}), true);
assert.equal(surveyWrites, 2);
assert.equal(surveyDraws, 2);
assert.equal(updateBorerSurvey(surveyPanel, surveyCache, surveyLine, {...surveyState, distanceM:11, slope:0.01}), true);
assert.match(surveyText.value, /1 in 100 up/);
assert.equal(surveyDraws, 3);
const daylightText = 'Daylight. She is through, 0.3 m off level.';
updateBorerSurvey(surveyPanel, surveyCache, surveyLine, {...surveyState, finished:true, daylightMessage:daylightText});
assert.equal(surveyText.value, daylightText, 'The Dig survey displays the daylight sentence.');

let storedMapping = null, mappingChanges = 0;
const mappingStorage = {getItem:()=>storedMapping, setItem:(_key,value)=>{storedMapping=value;}};
const unsubscribe = onMachineInputChange(()=>{mappingChanges++;});
assert.equal(saveMachineInput({deviceId:'stick',axes:{boom:2}}, mappingStorage), true);
assert.equal(mappingChanges, 1, 'A saved mapping notifies the open Dig.');
assert.equal(loadMachineInput(mappingStorage).axes.boom, 2);
unsubscribe();
saveMachineInput({deviceId:'stick',axes:{boom:1}}, mappingStorage);
assert.equal(mappingChanges, 1, 'Closing the Dig removes its mapping listener.');

const modelView = {body:new THREE.Group()};
poseBorerSlope(modelView, {slope:Math.PI / 30});
const forward = new THREE.Vector3(0, 0, 1).applyEuler(modelView.body.rotation);
assert.ok(forward.y > 0, 'The model points upward when the bore rises.');
poseBorerSlope(modelView, {slope:-Math.PI / 30});
assert.ok(new THREE.Vector3(0, 0, 1).applyEuler(modelView.body.rotation).y < 0,
  'The model points downward when the bore descends.');
poseBorerSlope(modelView, {slope:0});
assert.equal(modelView.body.rotation.x, 0, 'The model returns to level.');

for (const slope of [-Math.PI / 30, 0, Math.PI / 30]) {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 4, -8);
  const target = {x:0, y:1.6, z:-3};
  followBorerSlope(camera, target, {slope});
  assert.ok(Math.abs(camera.position.y - (-8 * Math.tan(slope) + 4)) < 1e-9,
    'The chase camera stays above the sloping floor behind Mabel.');
  assert.ok(Math.abs(target.y - (-3 * Math.tan(slope) + 1.6)) < 1e-9,
    'The chase view follows the sloping bore.');
}

const soundVoices = [];
const soundContext = {state:'running', currentTime:0,
  createOscillator() {
    const voice = {frequency:{setValueAtTime(value) { voice.pitch = value; }},
      connect() {}, disconnect() {}, start() { voice.started = true; }, stop() { voice.stopped = true; }};
    soundVoices.push(voice); return voice;
  },
  createGain() { return {gain:{setValueAtTime() {}, exponentialRampToValueAtTime() {}}, connect() {}, disconnect() {}}; },
};
const mixer = {context:soundContext, master:{}, muted:false, paused:false};
const borerSounds = createBorerSounds(mixer);
borerSounds.update(1, true);
assert.equal(soundVoices.length, 2, 'The head and conveyor each have a loop.');
assert.equal(soundVoices[0].pitch, 160);
borerSounds.update(0.4, false);
assert.equal(soundVoices[0].pitch, 97, 'The head pitch follows its speed.');
assert.equal(soundVoices[1].stopped, true, 'The conveyor stops when no muck moves.');
for (const cue of ['borer.stall','borer.refuse','borer.breakthrough','borer.daylight']) borerSounds.play(cue);
assert.equal(soundVoices.length, 6, 'Each borer event has a sound.');
mixer.muted = true;
borerSounds.update(1, true);
assert.equal(soundVoices[0].stopped, true, 'Muting stops the head loop.');
borerSounds.dispose();

const flat = createGroundEdit({region:{editable:true}, naturalHeight:()=>0});
const hill = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0});
const blocked = createGroundEdit({region:{editable:true}, naturalHeight:()=>6, reservedShapes:[{x:0,z:0,radius:1}]});
// The Dig checks the same structures, deck and roads the land uses.
const openGround = createGroundEdit({region:{editable:true}, naturalHeight:()=>12});
const building = SCABLANDS_SOLIDS.find(solid => solid.placeId && solid.kind !== 'girder');
const road = ROAD_NET.roads[0].points[Math.floor(ROAD_NET.roads[0].points.length / 2)];
const deck = RIVER_LAND.crossings.find(crossing => crossing.kind === 'bridge');
const noRoad = {nearest:()=>null};
assert.equal(borerLandRefusal({x:building.x,z:building.z,radius:3},openGround,
  {near:()=>[building],net:noRoad,crossings:[]}),BORER_OBSTRUCTION, 'A building footprint alone stops the bore.');
assert.equal(borerLandRefusal({x:road.x,z:road.z,radius:3},openGround,
  {near:()=>[],net:ROAD_NET,crossings:[]}),BORER_OBSTRUCTION, 'A public road alone stops the bore.');
const deckHit = ROAD_NET.nearest(deck.x,deck.z);
const deckSupports = SCABLANDS_SOLIDS.filter(solid => solid.id.startsWith('girder-bridge-'));
assert.equal(borerLandRefusal({x:deck.x,z:deck.z,radius:3},openGround,
  {near:()=>deckSupports,net:{nearest:(x,z)=>x===deck.x && z===deck.z ? deckHit : null},crossings:[deck]}),
  BORER_OBSTRUCTION, 'A deck alone stops the bore.');
for (const [name, point] of [['building', building], ['road', road], ['deck', deck]]) {
  assert.equal(borerLandRefusal({x:point.x,z:point.z,radius:3}, openGround), BORER_OBSTRUCTION,
    `The land's ${name} stops the borer.`);
  let protectedDig = createDigSandbox({ground:openGround, protectLand:true, playerId:`borer-${name}`});
  protectedDig = {...protectedDig,activeMachine:'borer',mode:'work',
    borer:{...createBorerState({x:point.x,y:0,z:point.z}),started:true,lever:1/3}};
  protectedDig = stepDigSandbox(protectedDig,{controls:{directLever:true,forward:1/3}},1/60);
  assert.equal(protectedDig.borer.message,BORER_OBSTRUCTION, `The Dig refuses the ${name}.`);
  assert.equal(protectedDig.borer.distanceM,0);
}
const named = createGroundEdit({region:{editable:true},naturalHeight:()=>12,
  reservedShapes:[{x:0,z:0,radius:1,sentence:"That's Tin Town. Auntie Solder would have words."}]});
assert.equal(borerLandRefusal({x:0,z:0,radius:3},named),"That's Tin Town. Auntie Solder would have words.");
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
assert.deepEqual(borerYardControls({KeyW:true,KeyA:true,ArrowUp:true}), {forward:1,keyboardLever:true,padLever:false,steer:-1,slope:1});
assert.deepEqual(borerYardControls({KeyS:true,KeyD:true,ArrowDown:true}), {forward:-1,keyboardLever:true,padLever:false,steer:1,slope:-1});
for (const [key, direction] of [['ArrowUp', 1], ['ArrowDown', -1]]) {
  const ground = createGroundEdit({region:{editable:true}, naturalHeight:()=>20});
  let dig = createDigSandbox({ground});
  dig = {...dig, activeMachine:'borer', mode:'work',
    borer:{...createBorerState(), started:true, lever:0.31}};
  const controls = borerYardControls({[key]:true}, null, null, dig.mode);
  assert.equal(controls.forward, 0, `${key} does not move the thrust lever.`);
  dig = stepDigSandbox(dig, {controls}, 2);
  assert.ok(dig.borer.distanceM > 0, `${key} keeps the borer moving.`);
  assert.ok(dig.borer.slope * direction > 0, `${key} tilts the head in the intended direction.`);
  assert.ok(Math.abs(dig.borer.lever - 0.31) < 1e-8, `${key} leaves the lever alone.`);
}
// Use the same held keys and fixed steps as the Dig, after a real mesa approach.
{
  let dig = createDigSandbox({playerId:'borer-tilt-keys'});
  const parked = dig.borer;
  const x = parked.x + Math.sin(parked.heading) * 30;
  const z = parked.z + Math.cos(parked.heading) * 30;
  dig = {...dig, activeMachine:'borer', mode:'work',
    borer:{...parked, x, z, y:dig.ground.heightAt(x,z), lever:0.31}};
  for (let seconds = 0; seconds < 115 && dig.borer.distanceM < 16; seconds++)
    dig = stepDigSandbox(dig, {controls:borerYardControls({})}, 1);
  assert.ok(dig.borer.distanceM >= 16, 'The borer reaches the test depth.');
  for (const [key, seconds, sign] of [['ArrowUp', 12, 1], ['ArrowDown', 5, -1]]) {
    const before = {distance:dig.borer.distanceM, slope:dig.borer.slope};
    dig = stepDigSandbox(dig, {controls:borerYardControls({[key]:true})}, seconds);
    assert.ok(dig.borer.distanceM > before.distance, `${key} keeps cutting at the mesa.`);
    assert.ok((dig.borer.slope - before.slope) * sign > 0, `${key} changes the slope at the mesa.`);
  }
  assert.ok(dig.borer.segments.length < 10, 'Holding the tilt keys does not create a ring for every simulation tick.');
}
const gentleKeyboard = borerYardControls({KeyW:true,ShiftLeft:true});
assert.equal(gentleKeyboard.forward, 1, 'Shift does not change the lever input.');
assert.equal(borerYardControls({KeyW:true,ShiftLeft:true}, null, null, 'drive').forward, 1,
  'Gentle thrust does not slow open-ground driving.');
const gentleRock = stepBorer(createBorerState(), {thrust:1 / 3}, hill, 'rock', 10).state;
assert.equal(gentleRock.stalled, false, 'Gentle keyboard thrust keeps the head turning in hard rock.');
assert.ok(gentleRock.distanceM > 1, 'Gentle keyboard thrust advances through hard rock.');
assert.deepEqual(borerYardControls({}, {axes:[0.4,-0.6]}, {drive:{steer:0,forward:1}}),
  {forward:0.6,keyboardLever:false,padLever:true,steer:0.4,slope:0}, 'The borer uses the existing mapped machine axes.');
assert.deepEqual(borerYardControls({KeyW:true,ArrowUp:true}, {axes:[0,0,0,0]}, {drive:{steer:0,forward:1},slope:3}),
  {forward:1,keyboardLever:true,padLever:true,steer:0,slope:1}, 'A connected idle controller does not disable the keyboard.');
assert.deepEqual(borerYardControls({}, {axes:[0.2,-0.4,0,-0.5]}, {drive:{steer:0,forward:1},slope:3}),
  {forward:0.4,keyboardLever:false,padLever:true,steer:0.2,slope:0.5}, 'The mapped stick can change slope.');
assert.equal(borerHasFace(flat, {x:0,z:0}, 0), false);
assert.equal(borerHasFace(hill, {x:0,z:0}, 0), true);
const spike = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 && Math.abs(x) < 1 ? 6 : 0});
assert.equal(borerHasFace(spike, {x:0,z:0}, 0), false, 'A narrow spike is not a full-width face.');
assert.equal(stepBorer(createBorerState(), {thrust:1}, flat, 'clay', 1).state.message, BORER_NO_FACE);
const refusedOnce = stepBorer(createBorerState(), {thrust:1}, flat, 'clay', 1);
const released = stepBorer(refusedOnce.state, {thrust:0}, flat, 'clay', 1);
assert.equal(released.state.message, null, 'Releasing thrust clears the refusal for the next attempt.');
const refusedAgain = stepBorer(released.state, {thrust:1}, flat, 'clay', 1);
assert.equal(refusedAgain.state.message, BORER_NO_FACE);
assert.equal(refusedAgain.events.filter(event => event.cue === 'borer.refuse').length, 1,
  'A new refused attempt sounds the refusal again.');
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
let running = stepBorer(createBorerState(), {thrust:1,steer:1,slope:1}, hill, 'topsoil', 20 / 3).state;
assert.ok(Math.abs(running.distanceM - 10) < 1e-8, 'Full thrust cuts 1.5 metres per second in soft rock.');
assert.ok(running.heading <= running.distanceM * Math.PI / 360 + 1e-9);
assert.ok(running.slope <= running.distanceM * Math.PI / 600 + 1e-9);
const stopped = stepBorer(running, {steer:1,slope:1}, hill, 'rock', 2).state;
assert.equal(stopped.heading, running.heading);
assert.equal(stopped.slope, running.slope);
const initial = createBorerState();
const forty = stepBorer(initial, {thrust:1}, hill, 'topsoil', 80 / 3).state;
const sandbox = createDigSandbox({ground:hill});
let selectedBorer = sandbox;
for (let i = 0; i < 7; i++) selectedBorer = switchDigMachine(selectedBorer);
assert.equal(selectedBorer.activeMachine, 'borer', 'Q reaches Mabel after the other machines.');
assert.equal(selectedBorer.mode, 'drive');
let digBorer = {...sandbox, activeMachine:'borer', mode:'work', borer:createBorerState()};
digBorer = stepDigSandbox(digBorer, {controls:{forward:1}}, 1);
assert.ok(digBorer.borer.distanceM > 0, 'Work controls advance the Dig borer.');
assert.deepEqual(exportDigTunnels(digBorer), digBorer.borer.segments, 'The Dig exposes the new cut as tunnel geometry.');
const growingSegments = digBorer.borer.segments;
digBorer = stepDigSandbox(digBorer, {controls:{forward:1}}, 1);
assert.equal(digBorer.borer.segments, growingSegments, 'The Dig extends its owned segment list without copying it.');
assert.deepEqual(exportDigTunnels(digBorer), digBorer.borer.segments, 'The index follows the in-place cut.');
assert.equal(digSandboxMachineState(digBorer), digBorer.borer);
const cutDistance = digBorer.borer.distanceM;
const driveInBore = stepDigSandbox({...digBorer, mode:'drive'}, {controls:{forward:1}}, 1);
assert.equal(driveInBore.borer.distanceM, cutDistance, 'Drive mode cannot cut after entering a bore.');
assert.equal(driveInBore.borer.headSpeed, 0, 'The head stops in drive mode.');
digBorer = stepDigSandbox(digBorer, {controls:{forward:-1}}, 1);
const beforeDigReverse = digBorer.borer.distanceM;
digBorer = stepDigSandbox(digBorer, {controls:{forward:-1}}, 0.1);
assert.ok(digBorer.borer.travelM < beforeDigReverse, 'Reverse follows the cut.');
assert.equal(digBorer.borer.distanceM, beforeDigReverse);
let driving = {...sandbox, activeMachine:'borer', mode:'drive', borer:createBorerState()};
driving = stepDigSandbox(driving, {controls:{forward:1}}, 1);
assert.ok(Math.abs(driving.borer.z - 4 / 3.6) < 1e-8, 'Open ground speed is four kilometres per hour.');
assert.equal(driving.borer.segments.length, 0, 'Driving does not cut.');

// Seams remain stable for metres, vary along a long bore, and hard rock stalls at full thrust.
const seamGround = {seed:19, heightAt:()=>30, materialAt:()=> 'rock', refusal:()=>null,
  cut:()=>({ok:true,volumes:{rock:0}}), fill:()=>({ok:true})};
let seamBorer = {...createBorerState(), started:true}, seamKinds = [], seamEnds = [];
while(seamBorer.distanceM < 100) {
  seamBorer = stepBorer(seamBorer, {thrust:1/3}, seamGround, null, 5).state;
  if(seamEnds.at(-1) !== seamBorer.rockSeam.end) {
    seamEnds.push(seamBorer.rockSeam.end); seamKinds.push(seamBorer.rockSeam.material);
    if(seamBorer.rockSeam.material === 'rock')
      assert.equal(stepBorer(seamBorer, {thrust:1}, seamGround, null, 2).state.stalled, true);
  }
}

// Drive the real mesa with the same land and spoil refusals as the Dig.
function driveMesa(kind) {
  const visit = createDigSandbox({playerId:`mesa-proof-${kind}`});
  const base = visit.ground, park = createDigBorer(base);
  const x = park.x + 30 * Math.sin(park.heading), z = park.z + 30 * Math.cos(park.heading);
  let machine = {...park, x, z, y:base.heightAt(x, z)};
  const line = borerSurvey(base, machine);
  const target = kind === 'survey' ? Math.atan(line.riseM / line.distanceM) : Math.PI / 30;
  const ground = {...base, refusal:shape => borerLandRefusal(shape, base),
    spoilRefusal:shape => borerSpoilRefusal(shape, base)};
  let trenchWarnings = 0;
  for (let i = 0; i < 3000; i++) {
    const before = machine.distanceM + (machine.exitCutting?.distanceM || 0);
    const wantsClimb = kind === 'survey' || kind === 'steep' || (kind === 'climb' && machine.exitCutting) || (kind === 'trench' && machine.exitCutting?.distanceM >= 70);
    const slope = wantsClimb ? (machine.slope < target - 0.00001 ? 1 : machine.slope > target + 0.00001 ? -1 : 0) : 0;
    const result = stepBorer(machine, {thrust:1/3, slope, mutableSegments:true}, ground, null, 2);
    machine = result.state;
    trenchWarnings += result.events.filter(event => event.message === BORER_TRENCH).length;
    if (machine.finished || (machine.message && machine.distanceM + (machine.exitCutting?.distanceM || 0) <= before + 1e-8)) break;
  }
  closeDigSandbox();
  return {machine, trenchWarnings, ground:base};
}
const surveyedResult = driveMesa('survey');
const surveyedDrive = surveyedResult.machine;
assert.equal(surveyedDrive.finished, true, `Surveyed drive: ${surveyedDrive.message}`);
assert.ok(surveyedDrive.offLevelM <= 0.5, 'The surveyed drive reaches level ground.');
assert.ok(surveyedDrive.segments[0].startOpen && surveyedDrive.segments.at(-1).endOpen, 'Both mouths open.');
const surveyedTunnels = createGroundTunnels(surveyedDrive.segments, {heightAt:(x,z)=>surveyedResult.ground.heightAt(x,z)});
assert.equal(surveyedTunnels.mouths.length, 2, 'The real mesa has two visible mouths at daylight.');

// Cast through the same drawn ground and the same mouth capsule as the Dig.
const farMaterial = new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const farGround = createDigNearGround(farMaterial, surveyedResult.ground);
farGround.follow(surveyedDrive.x, surveyedDrive.z);
const farEdited = new THREE.Group();
const farView = createGroundView({group:farEdited, groundEdit:surveyedResult.ground, material:farMaterial});
farView.update(); farGround.mesh.updateMatrixWorld(true); farEdited.updateMatrixWorld(true);
const farEnd = surveyedDrive.segments.at(-1).end;
const farDirection = new THREE.Vector3(Math.sin(surveyedDrive.heading), 0, Math.cos(surveyedDrive.heading));
const rayOrigin = new THREE.Vector3(farEnd.x, farEnd.y, farEnd.z).addScaledVector(farDirection, -10);
const farRay = new THREE.Raycaster(rayOrigin, farDirection, 0, 35);
const farBlocked = farRay.intersectObjects([farGround.mesh, ...farEdited.children], false).find(({point}) =>
  !surveyedTunnels.mouths.some(mouth => {
    const start = new THREE.Vector3(mouth.start.x, mouth.start.y, mouth.start.z);
    const axis = new THREE.Vector3(mouth.end.x, mouth.end.y, mouth.end.z).sub(start);
    const t = THREE.MathUtils.clamp(point.clone().sub(start).dot(axis) / Math.max(axis.lengthSq(), 1e-8), 0, 1);
    return point.distanceToSquared(start.addScaledVector(axis, t)) < mouth.radius ** 2;
  }));
assert.equal(farBlocked, undefined, 'A ray along the bore from 10 m inside the far mouth reaches open sky.');
farView.dispose(); farGround.mesh.geometry.dispose(); farMaterial.dispose();

assert.ok(surveyedResult.ground.heightAt(surveyedDrive.x, surveyedDrive.z) - surveyedDrive.y <= 0.3,
  'The head reaches the open ground before daylight.');
let finishedDrive = {...sandbox, ground:surveyedResult.ground, tunnels:surveyedTunnels,
  activeMachine:'borer', mode:'drive', borer:surveyedDrive, daylightMessage:daylightText};
assert.equal(switchDigMachine(finishedDrive).daylightMessage, '', 'Changing machine clears the daylight sentence.');
assert.equal(stepDigSandbox(finishedDrive, {controls:{}}, 1).daylightMessage, daylightText, 'The sentence remains while parked.');
finishedDrive = stepDigSandbox(finishedDrive, {controls:{forward:1}}, 1);
assert.equal(finishedDrive.daylightMessage, '', 'Driving clears the daylight sentence.');
assert.ok(Math.hypot(finishedDrive.borer.x-surveyedDrive.x, finishedDrive.borer.z-surveyedDrive.z) > 1,
  'Drive mode moves out after daylight.');
finishedDrive = stepDigSandbox(finishedDrive, {controls:{forward:-1}}, 2);
assert.ok(finishedDrive.borer.travelM < finishedDrive.borer.distanceM, 'Drive mode backs into the bore.');
const climbingDrive = driveMesa('climb').machine;
assert.equal(climbingDrive.finished, true, `Climbing exit: ${climbingDrive.message}`);
assert.ok(climbingDrive.exitCutting && climbingDrive.exitCutting.distanceM < 60, 'The exit cutting reaches the surface within 60 m.');
const trenchDrive = driveMesa('trench');
assert.equal(trenchDrive.trenchWarnings, 1 + Math.floor((trenchDrive.machine.exitCutting.distanceM - 60) / 30),
  'The warning sounds once at 60 m and once for every further 30 m.');
assert.equal(trenchDrive.machine.finished, true, 'She can climb out after 70 m of exit cutting.');
assert.ok(trenchDrive.machine.exitCutting.distanceM >= 70);
const steepDrive = driveMesa('steep').machine;
assert.equal(steepDrive.message, BORER_OPEN_GROUND, 'The steep drive stops under open ground.');
assert.ok(Math.abs(steepDrive.distanceM - 277.86) <= 5,
  `The steep drive stops near 277.86 m, not ${steepDrive.distanceM} m.`);
assert.ok(seamEnds.length >= 4, 'A 100 m bore meets at least three seam changes.');
assert.ok(seamKinds.includes('rock') && seamKinds.includes('gravel'));
let leverTest = {...sandbox, activeMachine:'borer', mode:'work', borer:createBorerState()};
leverTest = stepDigSandbox(leverTest, {controls:{forward:1}}, 1);
assert.ok(Math.abs(leverTest.borer.lever-.25)<1e-8, 'W raises the lever by a quarter per second.');
leverTest = stepDigSandbox(leverTest, {controls:{}}, 1);
assert.ok(Math.abs(leverTest.borer.lever-.25)<1e-8, 'The lever stays put when released.');
leverTest = stepDigSandbox(leverTest, {controls:{forward:-1}}, .5);
assert.ok(leverTest.borer.lever<1e-8, 'S lowers the lever by half per second.');
const boreCamera = new THREE.PerspectiveCamera();
updateBorerCamera(boreCamera, createBorerState(), 0, flat, 1, true);
assert.ok(Math.abs(boreCamera.position.z + 44)<1e-8, 'The open view sits behind the tail.');
updateBorerCamera(boreCamera, forty, 0, hill, 1, true);
assert.ok(Math.abs(boreCamera.position.z - 6)<1e-6, 'The bore view follows the centre line behind the tail.');
updateBorerCamera(boreCamera, forty, 1, hill, 1, true);
assert.ok(Math.abs(boreCamera.position.z + 22)<1e-6, 'The mouth view stands outside the mouth.');
const twenty = {...forty, x:0, z:20, travelM:20,
  segments:[{start:{x:0,y:1.65,z:0},end:{x:0,y:1.65,z:20}}]};
updateBorerCamera(boreCamera, {...twenty, travelM:19.9}, 0, flat, 1, true);
for (let i=0; i<600; i++) updateBorerCamera(boreCamera, twenty, 0, flat, 1/60);
assert.equal(boreCamera.userData.borerRoute.inside, true, 'The following camera reaches the mouth at 20 m.');
assert.ok(boreCamera.position.z <= 1 && boreCamera.position.z >= -0.1, 'The camera waits at the mouth, clear of the tail.');
const bentCameraState = {...forty, travelM:80, x:30, z:50, heading:Math.PI/2,
  segments:[{start:{x:0,y:1.65,z:0},end:{x:0,y:1.65,z:50}},
    {start:{x:0,y:1.65,z:50},end:{x:30,y:1.65,z:50}}]};
updateBorerCamera(boreCamera, bentCameraState, 0, flat, 1, true);
for (let i=0;i<120;i++) {
  updateBorerCamera(boreCamera, bentCameraState, 1, flat, 1/60);
  if (boreCamera.userData.borerRoute.inside)
    assert.ok(Math.abs(boreCamera.position.x)<1e-6 || Math.abs(boreCamera.position.z-50)<1e-6,
      'The camera follows the bend back to the mouth rather than crossing rock.');
}
assert.equal(boreCamera.userData.borerRoute.inside, false, 'The camera leaves through the mouth.');
for (let i=0;i<120;i++) updateBorerCamera(boreCamera, bentCameraState, 0, flat, 1/60);
assert.equal(boreCamera.userData.borerRoute.inside, true, 'The camera enters through the mouth.');
const unevenCamera = new THREE.PerspectiveCamera();
const unevenGround = {heightAt:(_x,z)=>z < -5 ? 4 : 0};
updateBorerCamera(unevenCamera, forty, 1, unevenGround, 1, true);
for (let i=0; i<900; i++) updateBorerCamera(unevenCamera, forty, 0, unevenGround, 1/60);
assert.equal(unevenCamera.userData.borerRoute.inside, true,
  'The following camera enters even when uneven ground holds it above the outside waypoint.');
for (let distance=80; distance>=0; distance-=0.5) {
  const x=distance>50?distance-50:0, z=Math.min(distance,50);
  const heading=distance>50?Math.PI/2:0;
  updateBorerCamera(boreCamera, {...bentCameraState, travelM:distance,x,z,heading}, 0, flat, 1/60);
  const dx=boreCamera.position.x-x, dz=boreCamera.position.z-z;
  const along=dx*Math.sin(heading)+dz*Math.cos(heading), side=dx*Math.cos(heading)-dz*Math.sin(heading);
  assert.ok(!(along > -18 && along < 1 && Math.abs(side)<3 && boreCamera.position.y<6),
    `The camera clears Mabel while reversing at ${distance} m.`);
}
const riverPoint=RIVER_LAND.line.points[0];
assert.ok(borerSpoilRefusal({...riverPoint,radius:.49}, {refusal:()=>null}), 'The river bed is closed to spoil.');
const parked = createDigBorer(hill);
const mesa = HILLS.filter(item => item.kind === 'mesa').reduce((a,b) =>
  Math.hypot(a.x-2214,a.z+518) < Math.hypot(b.x-2214,b.z+518) ? a : b);
const outward = Math.atan2(parked.z-mesa.z, parked.x-mesa.x);
const footRadius = mesa.radius + 8 * Math.sin(outward * 5) + mesa.face;
assert.ok(Math.abs(Math.hypot(parked.x-mesa.x,parked.z-mesa.z) - footRadius - 30) < 1e-8);
assert.ok(Math.abs(Math.cos(outward-mesa.rampAngle)) < 1e-8, 'Mabel approaches at right angles to the ramp.');
assert.ok(Math.hypot(parked.x,parked.z) < Math.hypot(2*mesa.x-parked.x,2*mesa.z-parked.z), 'Mabel is on the yard side.');
assert.ok(Math.abs(Math.sin(parked.heading)*Math.cos(outward)+Math.cos(parked.heading)*Math.sin(outward)+1) < 1e-8,
  'Mabel faces the mesa centre.');
assert.equal(parked.y, hill.heightAt(parked.x, parked.z));
const scarp = SCARPS.find(item => item.id === 'scab-west').stretches[0];
const middle = {x:(scarp.a.x + scarp.b.x) / 2, z:(scarp.a.z + scarp.b.z) / 2};
// Use the same editable ground object as the live Dig, not a height-only stand-in.
const realGround = createDigSandbox().ground;
const mesaFoot = {x:parked.x + 30 * Math.sin(parked.heading), z:parked.z + 30 * Math.cos(parked.heading)};
mesaFoot.y = realGround.heightAt(mesaFoot.x, mesaFoot.z);
assert.equal(borerHasFace(realGround, mesaFoot, parked.heading), true, 'The mesa side is a face at the foot.');
const survey = borerSurvey(realGround, {...mesaFoot, heading:parked.heading});
assert.ok(survey && survey.distanceM > 200 && survey.distanceM < 400, 'The survey reaches the far side of the mesa.');
const surveyedHeight = realGround.heightAt(mesaFoot.x + Math.sin(parked.heading)*(survey.distanceM + 12),
  mesaFoot.z + Math.cos(parked.heading)*(survey.distanceM + 12));
assert.ok(Math.abs(survey.riseM - (surveyedHeight - mesaFoot.y)) < 1e-9);
assert.ok(Math.abs(survey.gradeOneIn - survey.distanceM / Math.abs(survey.riseM)) < 1e-9);
assert.equal(borerSurvey(flat, createBorerState()), null, 'Level ground has no far side.');

const mesaStart = stepBorer(createBorerState({...mesaFoot, heading:parked.heading}), {thrust:1}, realGround, 'topsoil', 1);
assert.equal(mesaStart.state.started, true, 'Mabel starts cutting at the mesa side.');
const rampDistance = mesa.radius + 100;
const rampFoot = {x:mesa.x + Math.cos(mesa.rampAngle) * rampDistance,
  z:mesa.z + Math.sin(mesa.rampAngle) * rampDistance};
rampFoot.y = realGround.heightAt(rampFoot.x, rampFoot.z);
const rampHeading = Math.atan2(mesa.x - rampFoot.x, mesa.z - rampFoot.z);
assert.equal(borerHasFace(realGround, rampFoot, rampHeading), false, 'The mesa ramp is not a face.');
assert.equal(stepBorer(createBorerState({...rampFoot, heading:rampHeading}), {thrust:1}, realGround, 'topsoil', 1).state.message,
  BORER_NO_FACE, 'Mabel refuses to start on the mesa ramp.');
const scarpLength = Math.hypot(scarp.b.x-scarp.a.x, scarp.b.z-scarp.a.z);
const scarpDx = -(scarp.b.z-scarp.a.z)/scarpLength, scarpDz = (scarp.b.x-scarp.a.x)/scarpLength;
const realParked = {x:middle.x-30*scarpDx,z:middle.z-30*scarpDz,heading:Math.atan2(scarpDx,scarpDz)};
realParked.y = realGround.heightAt(realParked.x,realParked.z);
const drawnGround = createDigNearGround(new THREE.MeshBasicMaterial(), realGround);
// The view first draws at the yard, then jumps to Mabel and follows her.
drawnGround.follow(0, 18);
drawnGround.follow(realParked.x, realParked.z);
for (let distance = 2; distance <= 30; distance += 2)
  drawnGround.follow(realParked.x + distance * Math.sin(realParked.heading),
    realParked.z + distance * Math.cos(realParked.heading));
// Use the same untransformed world group as the Dig and inspect actual vertices,
// rather than asking the height array what it intended to draw.
const digWorld = new THREE.Group();
digWorld.add(drawnGround.mesh);
digWorld.updateMatrixWorld(true);
const groundPositions = drawnGround.geometry.getAttribute('position');
for (const z of [-700, -650, -600]) for (const x of [1770, 1780]) {
  let corner = null;
  for (let i = 0; i < groundPositions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(groundPositions, i).applyMatrix4(drawnGround.mesh.matrixWorld);
    if (point.x === x && point.z === z) { corner = point; break; }
  }
  assert.ok(corner, `The Dig has a ground corner at ${x}, ${z}.`);
  assert.ok(Math.abs(corner.y - scablandsSurfaceHeightAt(x,z,realGround)) < .5,
    `The Dig's world-space ground corner matches the scarp at ${x}, ${z}.`);
  if (z === -650) assert.ok(Math.abs(corner.y - (x === 1770 ? 10.8 : 13.6)) < .5,
    `The Dig draws the expected scarp height at ${x}, ${z}.`);
}
for (let distance = 0; distance <= 60; distance += 5) {
  const x = realParked.x + Math.sin(realParked.heading) * distance;
  const z = realParked.z + Math.cos(realParked.heading) * distance;
  assert.ok(Math.abs(drawnGround.heightAtDrawn(x,z) - scablandsSurfaceHeightAt(x,z,realGround)) < .3,
    `Drawn ground matches the scarp ${distance} m ahead.`);
}
// Read triangles from the actual mesh, including its underside from inside the hill.
drawnGround.mesh.updateMatrixWorld(true);
const mouthFloor = scablandsSurfaceHeightAt(realParked.x + 31 * Math.sin(realParked.heading),
  realParked.z + 31 * Math.cos(realParked.heading), realGround);
const roofX = realParked.x + 51 * Math.sin(realParked.heading);
const roofZ = realParked.z + 51 * Math.cos(realParked.heading);
const crown = mouthFloor + 1.65 + 3;
assert.ok(scablandsSurfaceHeightAt(roofX, roofZ, realGround) >= crown + 6,
  'The real scarp gives at least six metres of cover above the crown at 20 metres.');
const ray = new THREE.Raycaster(new THREE.Vector3(roofX, crown, roofZ), new THREE.Vector3(0, 1, 0));
const roofHit = ray.intersectObject(drawnGround.mesh)[0];
assert.ok(roofHit && Math.abs(roofHit.point.y - scablandsSurfaceHeightAt(roofX, roofZ, realGround)) < .5,
  'A ray from inside hits the actual ground mesh above the bore.');
// The scenario's 10 m target is above the scarp at this representative
// outside-camera position. A clear ray here does not prove missing ground.
const exampleOrigin = new THREE.Vector3(1751, 0.4, -650);
const exampleTarget = new THREE.Vector3(1761, 7.45, -650);
const exampleDirection = exampleTarget.clone().sub(exampleOrigin);
const exampleRay = new THREE.Raycaster(exampleOrigin, exampleDirection.clone().normalize(), 0, exampleDirection.length());
assert.ok(exampleTarget.y > scablandsSurfaceHeightAt(exampleTarget.x, exampleTarget.z, realGround));
assert.equal(exampleRay.intersectObject(drawnGround.mesh).length, 0,
  'The representative outside-to-sky ray clears the actual ground mesh.');
drawnGround.dispose();
const foot = {x:realParked.x + 30 * Math.sin(realParked.heading), z:realParked.z + 30 * Math.cos(realParked.heading), y:realParked.y};
assert.equal(borerHasFace(realGround, foot, realParked.heading), false, 'The west scarp slope is not a six-metre face within twelve metres of the head.');
assert.equal(stepBorer(createBorerState({...foot,heading:realParked.heading}), {thrust:1}, realGround, 'rock', 1).state.message, BORER_NO_FACE);
assert.equal(borerHasFace(cutting, {x:0,y:0,z:0}, 0), true, 'A six-metre wall dug in the ground is a face.');
assert.equal(borerHasFace(hill, {x:0,y:1,z:0}, 0), false, 'The rise is measured from the machine floor, not the ground under its head.');

// Follow the actual scarp height profile at a safe depth for 100 m.
const realDeep = {...realGround, seed:19, materialAt:()=> 'rock', refusal:()=>null,
  cut:()=>({ok:true,volumes:{}}), fill:()=>({ok:true})};
const deepStart = {x:realParked.x + 50 * Math.sin(realParked.heading),
  z:realParked.z + 50 * Math.cos(realParked.heading), y:realParked.y - 4, heading:realParked.heading};
let realBore = {...createBorerState(deepStart), started:true, covered:true};
const realSeams = new Set();
while (realBore.distanceM < 100 && !realBore.finished && !realBore.message) {
  realBore = stepBorer(realBore, {thrust:1/3}, realDeep, null, 5).state;
  if (realBore.rockSeam) {
    realSeams.add(realBore.rockSeam.index);
    if (realBore.rockSeam.material === 'rock')
      assert.equal(stepBorer(realBore, {thrust:1}, realDeep, null, 2).state.stalled, true,
        'Full thrust stalls in the scarp hard seams.');
  }
}
assert.ok(realBore.distanceM >= 100, `The scarp bore stopped at ${realBore.distanceM}: ${realBore.message}`);
assert.ok(realSeams.size >= 4, 'The real scarp profile has at least three hardness changes in 100 m.');

// Measure the Dig's fixed-step path, including the real mesa ground and spoil.
let paceDig = createDigSandbox({playerId:'borer-pace'});
const paceStart = paceDig.borer;
paceDig = {...paceDig, activeMachine:'borer', mode:'work', borer:{...paceStart,
  x:paceStart.x + 60 * Math.sin(paceStart.heading), z:paceStart.z + 60 * Math.cos(paceStart.heading),
  started:true, covered:true, lever:0.33}};
for (let frame=0; frame<600; frame++) paceDig = stepDigSandbox(paceDig, {controls:{}}, 1/60);
assert.ok(Math.abs(paceDig.borer.distanceM - 4.95) < 0.01,
  `At lever 0.33 the Dig cuts 4.95 m in 10 simulated seconds, got ${paceDig.borer.distanceM}.`);
const paceDistance = paceDig.borer.distanceM;
for (let frame=0; frame<15000; frame++) paceDig = stepDigSandbox(paceDig, {controls:{}}, 1/60);
assert.ok(Math.abs(paceDig.borer.distanceM - paceDistance - 123.75) < 0.02,
  `At lever 0.33 the Dig cuts 123.75 m in 250 simulated seconds, got ${paceDig.borer.distanceM - paceDistance}.`);

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
// A deposit spanning several nearly full cells must not resample them for
// every allocation. A wider heap will have more cells to consider.
{
  const base = createGroundEdit({region:{editable:true}, naturalHeight:(_x, z)=>z >= 6 ? 20 : 0});
  const reads = new Map();
  const ground = {...base, heightAt(x, z) {
    const key = `${x},${z}`;
    reads.set(key, (reads.get(key) || 0) + 1);
    return base.heightAt(x, z);
  }};
  const cells = [20, 21, 22].map(x => ({x, z:0, along:x - 20, base:-4.99}));
  const state = {...createBorerState({z:10}), started:true, covered:true,
    spoilBank:{far:2, cells}};
  const result = stepBorer(state, {thrust:1/3}, ground, 'rock', 1/120);
  assert.ok(result.state.distanceM > 0, 'The deposit and cut finish.');
  for (const cell of cells)
    assert.equal(reads.get(`${cell.x},${cell.z}`), 1, 'Planning samples each existing bank cell once per step.');
}
const muckCut = stepBorer(createBorerState(), {thrust:1}, muckGround, 'topsoil', 80 / 3).state;
const pileVolume = () => muckGround.toSave().chunks.reduce((sum, chunk) =>
  sum + chunk.delta.reduce((total, height) => total + height, 0), 0) * 1.25;
const expectedMuck = Math.PI * 3 ** 2 * 40 * 1.25;
assert.ok(Math.abs(pileVolume() / expectedMuck - 1) < 0.02, 'The pile contains the bulked bore volume.');
assert.ok(muckCut.spoilBank.far > 6, 'The bank extends as the cut grows.');
const bankBeforeIdle = muckCut.spoilBank;
const idleBorer = stepBorer(muckCut, {thrust:0}, muckGround, 'topsoil', 1).state;
assert.strictEqual(idleBorer.spoilBank, bankBeforeIdle, 'Waiting does not copy the bank.');
const bankSnapshot = structuredClone(bankBeforeIdle);
const nextMuckCut = stepBorer(muckCut, {thrust:1}, muckGround, 'topsoil', 1 / 60).state;
assert.deepEqual(bankBeforeIdle, bankSnapshot, 'A new deposit leaves the previous bank state unchanged.');
assert.notStrictEqual(nextMuckCut.spoilBank, bankBeforeIdle, 'A deposit gets its own bank state.');
assert.notStrictEqual(nextMuckCut.spoilBank.cells, bankBeforeIdle.cells, 'The cell list is copied before planning.');
assert.strictEqual(nextMuckCut.spoilBank.cells[0], bankBeforeIdle.cells[0],
  'Unchanged cell records are shared instead of copied on every deposit.');
for (const cell of muckCut.spoilBank.cells) {
  assert.ok(muckGround.heightAt(cell.x, cell.z) - cell.base <= 5.00001, 'The bank stays at most five metres high.');
  assert.ok(cell.x >= 12 && Math.abs(cell.z) <= 1, 'The bank stays beside the mouth and away from the track.');
}
for (let x = 12; x < Math.floor(12 + muckCut.spoilBank.far - 6); x++) {
  assert.ok(muckGround.heightAt(x, 0) > 0, 'The bank has no gaps between its loads.');
  assert.ok(muckGround.heightAt(x, 1) > 0, 'The bank is wide enough to draw as a ridge.');
}
const bentMuckGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0,
  reservedShapes:[{x:20,z:0,radius:1,sentence:'Road.'}]});
const bentMuck = stepBorer(createBorerState(), {thrust:1,steer:1}, bentMuckGround, 'topsoil', 80 / 3).state;
const bentVolume = bentMuckGround.toSave().chunks.reduce((sum, chunk) =>
  sum + chunk.delta.reduce((total, height) => total + height, 0), 0) * 1.25;
assert.ok(Math.abs(bentVolume / (Math.PI * 9 * bentMuck.distanceM * 1.25) - 1) < 0.02,
  'A bent cut keeps its bulked volume in the bank.');
assert.ok(bentMuck.spoilBank.cells.every(cell => !bentMuckGround.refusal({...cell, radius:0.49})),
  'The bank skips protected road ground.');
assert.equal(new Set(bentMuck.spoilBank.cells.map(cell => `${cell.x},${cell.z}`)).size,
  bentMuck.spoilBank.cells.length, 'Rounded bank positions never add the same ground cell twice.');
assert.ok(bentMuck.spoilBank.cells.every(cell => bentMuckGround.heightAt(cell.x, cell.z) - cell.base <= 5.00001),
  'A bent cut keeps the bank below five metres.');
const beforeReverse = pileVolume();
stepBorer(muckCut, {thrust:-1}, muckGround, 'topsoil', 5);
assert.equal(pileVolume(), beforeReverse, 'Returning through the tunnel creates no muck.');
const blockedPileBase = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 6 : 0});
const blockedPile = {...blockedPileBase, refusal:shape => shape.x >= 11 ? 'This place is protected.' : null};
const pileStop = stepBorer(createBorerState(), {thrust:1}, blockedPile, 'topsoil', 2);
assert.equal(pileStop.state.distanceM, 0);
assert.equal(pileStop.state.message, 'This place is protected.');
assert.equal(blockedPileBase.chunkCount, 0, 'A protected pile cannot lose the cut material.');
assert.equal(borerMuckPile([]), null);
assert.deepEqual(borerMuckPile(forty.segments), {x:12,z:0,radius:0.75});
assert.deepEqual(borerMuckPile([{start:{x:2,z:3},end:{x:7,z:3}}]), {x:2,z:-9,radius:0.75});
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
const bent = stepBorer(createBorerState(), {thrust:1, steer:1, slope:1}, hill, 'topsoil', 20 / 3).state;
const bentRestored = importDigTunnels(sandbox, JSON.parse(JSON.stringify(bent.segments)));
assert.deepEqual(exportDigTunnels(bentRestored), bent.segments, 'A bent tunnel survives a plain-data round trip.');
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
assert.equal(junction.state.message, 'She has broken into the other bore.');
assert.equal(junction.events.find(event => event.cue === 'borer.breakthrough').message, junction.state.message);
const joinedCut = createGroundTunnels(junction.state.segments, {heightAt:(x,z)=>junctionGround.heightAt(x,z)});
assert.equal(joinedCut.mouths.length, 1, 'An underground junction does not make a surface mouth.');
const highPassage = createGroundTunnels([{start:{x:-20,y:11.65,z:25}, end:{x:20,y:11.65,z:25}, radius:3}]);
const noJunction = stepBorer(createBorerState(), {thrust:1, tunnels:highPassage},
  createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z >= 6 ? 8 : 0}), 'topsoil', 60);
assert.equal(noJunction.state.finished, false, 'A passage on another level does not open the face.');
const shallow = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : 2});
const exitCut = stepBorer(createBorerState(), {thrust:1}, shallow, 'topsoil', 100 / 3);
assert.ok(exitCut.state.exitCutting, 'A far face above the floor starts an exit cutting.');
assert.equal(exitCut.state.segments.at(-1).endOpen, false, 'The far end stays closed until it reaches daylight.');
assert.equal(exitCut.state.finished, false);
const climbingExit = stepBorer(exitCut.state, {thrust:1, slope:1}, shallow, 'topsoil', 120);
assert.equal(climbingExit.state.finished, true, 'Tilting up brings the exit cutting to the surface.');
assert.ok(climbingExit.state.exitCutting.distanceM < 60);
assert.ok(climbingExit.state.offLevelM > 0);
assert.equal(climbingExit.events.filter(event => event.cue === 'borer.daylight').length, 1);
const trench = stepBorer(exitCut.state, {thrust:1}, shallow, 'topsoil', 130 / 3);
assert.equal(trench.state.message, BORER_TRENCH);
assert.ok(trench.state.exitCutting.distanceM > 60, 'The warning does not stop her.');
assert.equal(trench.events.filter(event => event.message === BORER_TRENCH).length, 1);
const longerTrench = stepBorer(trench.state, {thrust:1}, shallow, 'topsoil', 60 / 3);
assert.ok(longerTrench.state.exitCutting.distanceM > 90);
assert.equal(longerTrench.events.filter(event => event.message === BORER_TRENCH).length, 1, 'The warning repeats at 90 m.');
const lipGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : -2});
const lip = stepBorer(createBorerState(), {thrust:1}, lipGround, 'topsoil', 100);
assert.equal(lip.state.message, 'She has come out 2.0 m up the face. Tip spoil below the mouth until she can drive out.');
assert.equal(lip.state.segments.at(-1).endOpen, false);
const lipFar = {x:Math.round(lip.state.x + Math.sin(lip.state.heading) * 12),
  z:Math.round(lip.state.z + Math.cos(lip.state.heading) * 12), radius:3};
assert.ok(lipGround.fill(lipFar, 'rock', 29 * 2 * 1.25).ok, 'Real ground fill raises the landing.');
assert.ok(lipGround.fill({x:0, z:31, radius:3}, 'rock', 29 * 2 * 1.25).ok, 'The actual mouth also has a safe landing.');
assert.ok(Math.abs(lipGround.heightAt(lip.state.x + Math.sin(lip.state.heading) * 12,
  lip.state.z + Math.cos(lip.state.heading) * 12) - lip.state.y) <= 0.5);
const filledLip = stepBorer(lip.state, {thrust:1}, lipGround, 'topsoil', 15);
assert.equal(filledLip.state.finished, true, 'She reaches daylight after filling the lip.');
assert.equal(filledLip.state.segments.at(-1).endOpen, true);
assert.equal(filledLip.events.filter(event => event.cue === 'borer.daylight').length, 1);
// The first landing survey can be safe while the ground drops at the actual mouth.
const lateDropGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : z < 43 ? 2 : -2});
const lateDrop = stepBorer(createBorerState(), {thrust:1}, lateDropGround, 'topsoil', 100);
assert.ok(lateDrop.state.exitCutting, 'The first landing survey permits an exit cutting.');
assert.equal(lateDrop.state.finished, false, 'A later drop cannot declare daylight with a closed mouth.');
assert.equal(lateDrop.state.message, 'She has come out 2.0 m up the face. Tip spoil below the mouth until she can drive out.');
assert.equal(lateDrop.state.segments.at(-1).endOpen, false);
assert.equal(lateDrop.events.filter(event => event.cue === 'borer.daylight').length, 0);
const shortHill = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 12 ? 8 : 2});
const stoppedUnderGround = stepBorer(createBorerState(), {thrust:1}, shortHill, 'topsoil', 60);
assert.equal(stoppedUnderGround.state.message, BORER_OPEN_GROUND);
assert.equal(stoppedUnderGround.state.segments.at(-1).endOpen, false);
assert.equal(stoppedUnderGround.events.filter(event => event.message === BORER_OPEN_GROUND).length, 1);
assert.ok(Math.abs(stoppedUnderGround.state.z - 12) < 2, 'The refusal is within 2 m of the crown crossing.');
assert.ok(stepBorer(stoppedUnderGround.state, {thrust:-1}, shortHill, 'topsoil', 2).state.travelM < stoppedUnderGround.state.travelM,
  'She can back out when there is no face behind her.');
const highFarGround = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>z < 6 ? 0 : z < 30 ? 8 : 4});
const highFar = stepBorer(createBorerState(), {thrust:1}, highFarGround, 'topsoil', 100);
assert.equal(highFar.state.message, BORER_OPEN_GROUND, 'Ground more than 3 m above the floor ends this heading.');
assert.ok(Math.abs(highFar.state.z - 30) < 2, 'The high-ground refusal is within 2 m of the crown crossing.');
assert.equal(highFar.state.segments.at(-1).endOpen, false);
assert.ok(stepBorer(highFar.state, {thrust:-1}, highFarGround, 'topsoil', 2).state.travelM < highFar.state.travelM,
  'She can back out from high ground beyond a face.');
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
// Approach the first stretch through the Dig's real stepping path. The
// unfinished stretch behind the head must not count as a breakthrough.
const turnRadius = 120, turnAngle = 2 * Math.PI - 0.228;
const returningSegments = [{start:{x:-50,y:1.65,z:0}, end:{x:20,y:1.65,z:0}, radius:3, startOpen:true}];
for (let i = 1; i <= 150; i++) {
  const angle = turnAngle * i / 150;
  returningSegments.push({start:{...returningSegments.at(-1).end},
    end:{x:20 + turnRadius * Math.sin(angle),y:1.65,z:turnRadius * (1 - Math.cos(angle))},
    radius:3, endOpen:false});
}
const returnEnd = returningSegments.at(-1).end;
const returnLength = returningSegments.reduce((sum, segment) => sum + Math.hypot(
  segment.end.x - segment.start.x, segment.end.z - segment.start.z), 0);
const returnGround = createGroundEdit({region:{editable:true}, naturalHeight:()=>12});
let returnDig = createDigSandbox({ground:returnGround, playerId:'borer-junction-test'});
returnDig = {...returnDig, activeMachine:'borer', mode:'work',
  tunnels:createGroundTunnels(returningSegments, {heightAt:()=>12}),
  borer:{...createBorerState({x:returnEnd.x,y:0,z:returnEnd.z,heading:Math.PI / 2 - turnAngle}),
    started:true, covered:true, distanceM:returnLength, travelM:returnLength,
    segments:returningSegments, lever:1/3}};
returnDig = stepDigSandbox(returnDig, {controls:{directLever:true,forward:1/3,steer:-1}}, 1 / 3);
assert.equal(returnDig.borer.finished, false, 'The recent passage is not a breakthrough.');
returnDig = stepDigSandbox(returnDig, {controls:{directLever:true,forward:1/3,steer:-1}}, 5 / 3);
assert.equal(returnDig.borer.finished, true, 'The Dig opens the face into the earlier stretch.');
assert.equal(returnDig.borer.segments.at(-1).endOpen, true);
for (const [start, end] of [
  [{x:returnDig.borer.x,y:0,z:0},{x:returnDig.borer.x,y:0,z:2}],
  [{x:returnDig.borer.x,y:0,z:2},{x:returnDig.borer.x,y:0,z:0}],
]) assert.equal(returnDig.tunnels.constrainMotion(start, end, 0.5).hit, false,
  'Both passages remain drivable at the new junction.');
const separated = createGroundTunnels(crossingSegments.map((segment, index) => index === 3
  ? {...segment, start:{...segment.start,y:11.65}, end:{...segment.end,y:11.65}}
  : index === 2 ? {...segment,end:{...segment.end,y:11.65}} : segment));
assert.equal(separated.constrainMotion({x:-1,y:0,z:0},{x:0,y:0,z:4},0.5).hit, true,
  'A crossing high above does not open the wall.');
console.log('Borer: machine data, controls and a 40 m closed cut passed.');

// Growing the live index must match rebuilding it, including bends and open ends.
const indexed = createGroundTunnels([], {heightAt:()=>20});
assert.equal(indexed.revision, 0);
const indexedSegments = [];
for (let i = 0; i < 60; i++) {
  const start = i ? indexedSegments.at(-1).end : {x:0,y:1.65,z:0};
  const end = {x:start.x + (i % 2 ? 2 : 1), y:1.65, z:start.z + 6};
  const segment = {start, end, radius:3, startOpen:i === 0, endOpen:false};
  indexedSegments.push(segment);
  indexed.extendLast(segment, true);
  assert.equal(indexed.revision, i + 1, 'Each appended segment changes the view revision.');
}
let tail = indexedSegments.at(-1);
for (let i = 0; i < 20; i++) {
  tail = {...tail, end:{...tail.end, z:tail.end.z + .1}, endOpen:i === 19};
  indexedSegments[indexedSegments.length - 1] = tail;
  indexed.extendLast(tail);
  assert.equal(indexed.revision, 61 + i, 'Each tail extension changes the view revision.');
  const rebuilt = createGroundTunnels(indexedSegments, {heightAt:()=>20});
  assert.deepEqual(indexed.segments, rebuilt.segments);
  assert.equal(indexed.endOpen, rebuilt.endOpen);
  assert.ok(Math.abs(indexed.length - rebuilt.length) < 1e-9);
  for (const segment of indexedSegments) {
    const position = {x:(segment.start.x + segment.end.x)/2,y:1.65,z:(segment.start.z + segment.end.z)/2};
    assert.equal(Boolean(indexed.tubeAt(position)), Boolean(rebuilt.tubeAt(position)));
    assert.equal(indexed.groundAt(position, 1.65, 20), rebuilt.groundAt(position, 1.65, 20));
  }
}
