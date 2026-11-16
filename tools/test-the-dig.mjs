import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {machineControlInput,keyboardAction} from '../src/input-contexts.js';
import {closeDigSandbox,createDigSandbox,createPendingDigActions,DIG_HEAP,digSandboxMachineState,stepDigSandbox,switchDigMachine} from '../src/machines/dig-sandbox.js';
import {machineLoadVolume} from '../src/machines/tools.js';
import {machineToolPosition} from '../src/machines/machine.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {scablandsGroundEdit,scablandsNaturalHeightAt} from '../src/world/scablands-ground.js';
import {MACHINE_SOUND_CUES} from '../src/machines/view.js';
import {DIG_MACHINE_TONES,SOUND_BANK} from '../src/sound-bank.js';
import {page as digScenarioPage} from './scenarios/the-dig.mjs';

const {gateDigKey, startTheDig} = await import('../src/machines/dig-game.js');
for (const type of ['keydown', 'keyup']) {
  for (const code of ['KeyW', 'KeyE', 'Space', 'KeyV', 'Escape', 'Digit1', 'KeyM']) {
    let stopped = false;
    gateDigKey({type, code, stopImmediatePropagation() { stopped = true; }});
    assert.equal(stopped, code !== 'KeyM', `${type} ${code} reaches the game only for sound`);
  }
}
// A failed renderer must leave neither the overlay nor either mapping listener behind.
{
  const originals = {document: globalThis.document, window: globalThis.window, localStorage: globalThis.localStorage};
  const listeners = new Map(), nodes = [];
  let reads = 0;
  const makeNode = () => ({style:{}, append() {}, after() {}, remove() { this.removed = true; },
    querySelector() { return makeNode(); }});
  globalThis.document = {createElement: makeNode, body:{append(node) { nodes.push(node); }}};
  globalThis.window = {addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); }};
  globalThis.localStorage = {getItem() { reads++; return null; }, setItem() {}};
  try {
    const failure = new Error('renderer failed');
    await assert.rejects(startTheDig({createRenderer() { throw failure; }}), error => error === failure);
    assert.equal(nodes[0].removed, true, 'failed start removes its host');
    assert.equal(listeners.has('storage'), false, 'failed start removes its storage listener');
    const before = reads;
    const {saveMachineInput} = await import('../src/input-setup.js');
    saveMachineInput({deviceId:'test', axes:{swing:0}}, globalThis.localStorage);
    assert.equal(reads, before, 'failed start unsubscribes from mapping changes');
  } finally {
    for (const [name, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[name]; else globalThis[name] = value;
    }
  }
}

for (const cue of [...Object.values(MACHINE_SOUND_CUES), ...Object.keys(DIG_MACHINE_TONES)]) {
  assert.ok(SOUND_BANK[cue], `the Dig's machine cue ${cue} exists in the sound bank`);
  assert.equal(SOUND_BANK[cue].flag, 'the-dig', `${cue} is available with the Dig switch`);
  assert.ok(SOUND_BANK[cue].file || SOUND_BANK[cue].layers?.length, `${cue} has sound to play`);
}

for (const expression of Object.values(digScenarioPage)) {
  assert.doesNotThrow(() => new Function(`return ${expression};`), 'Dig browser expression parses');
}

// The simulation emits literal event names plus one cue per drill material.
for (const file of ['borer.js', 'dig-sandbox.js', 'drill.js', 'roads.js']) {
  const source = await readFile(new URL(`../src/machines/${file}`, import.meta.url), 'utf8');
  for (const match of source.matchAll(/cue:\s*['"]([^'"]+)['"]/g))
    assert.ok(DIG_MACHINE_TONES[match[1]], `${file} cue ${match[1]} has a playable recipe`);
}
const gameSource = await readFile(new URL('../src/machines/dig-game.js', import.meta.url), 'utf8');
for (const match of gameSource.matchAll(/(?:drillSounds|roadSounds|borerSounds)\.play\(\s*['"]([^'"]+)['"]/g))
  assert.ok(DIG_MACHINE_TONES[match[1]], `Dig player cue ${match[1]} has a playable recipe`);
for (const material of ['clay', 'gravel', 'rock'])
  assert.ok(DIG_MACHINE_TONES[`drill-${material}`], `${material} has a drill sound`);

const flags=enabled=>({enabled:name=>name==='the-dig'&&enabled});
const home=featureFlags=>yardHomeScreen({profile:{wasteland:{}},playerName:'Test',escapeHTML:value=>String(value),featureFlags});
assert.doesNotMatch(home(flags(false)),/yard-the-dig|THE DIG/,'the yard must not show THE DIG when its switch is off');
assert.match(home(flags(true)),/data-action="yard-the-dig">THE DIG/,'the enabled yard shows its entry');
const router=await readFile(new URL('../src/screen-router.js',import.meta.url),'utf8');
assert.match(router,/import\('\.\/machines\/dig-game\.js'\)/,'the renderer and machine game load only after entry');

const dt=1/60, pressed=(key,mode)=>machineControlInput({[key]:true},null,mode);
const turnRight=stepDigSandbox({...createDigSandbox({seed:9}),activeMachine:'dumpTruck',mode:'drive'},{controls:{forward:1,steer:1}},1);
assert.ok(turnRight.haul.machines.dumpTruck.heading<0,'D steers to the right on screen, which is a falling heading when facing +z');
const pending=createPendingDigActions();
for(const edge of ['load','machine','camera','mode']){pending.push(edge);
  assert.equal(pending.consume(edge),true,`${edge} survives a rendered frame with no fixed step`);
  assert.equal(pending.consume(edge),false,`${edge} is consumed only once`);
}
assert.equal(keyboardAction('machine','Tab'),'machine-mode-toggle');
assert.equal(keyboardAction('machine','KeyQ'),'machine-switch');
let sim=createDigSandbox({seed:417});
assert.equal(sim.mode,'work','the excavator starts ready to work, so the first key press moves the arm');
assert.equal(sim.ground.cut({x:0,z:120,radius:2},-10).reason,'The Dome is built here. Dig around it.',
  'reserved Dome ground refuses the cut with a plain sentence');
const tipNow=state=>machineToolPosition(machineDefinition('excavator'),digSandboxMachineState(state,'excavator'),'bucket');
const beforeHeight=sim.ground.heightAt(DIG_HEAP.x,DIG_HEAP.z);
for(let i=0;i<126;i++)sim=stepDigSandbox(sim,{controls:{swing:1}},dt);
const heapTip=tipNow(sim);
assert.ok(Math.hypot(heapTip.x-DIG_HEAP.x,heapTip.z-DIG_HEAP.z)<1.4,
  `a 90 degree swing reaches the heap without track movement (${heapTip.x}, ${heapTip.z})`);
let lowered=0;
while(tipNow(sim).y>sim.ground.heightAt(tipNow(sim).x,tipNow(sim).z)+.05&&lowered++<300)sim=stepDigSandbox(sim,{controls:{boom:-1}},dt);
assert.ok(lowered<300,'lowering the boom brings the bucket tip to ground height');
assert.ok(lowered>10,'the bucket starts well above the ground, so lowering it is a real step');
for(const toolDefinition of [machineDefinition('excavator').tools.bucket,machineDefinition('trencher').tools.chain])
  assert.ok(toolDefinition.radiusM>=Math.SQRT1_2,'a digging tool always covers a sample of the 1 m ground grid, so there are no dead spots');
let high=createDigSandbox({seed:417});
const highResult=stepDigSandbox(high,{action:'dig'},dt);
assert.equal(highResult.excavatedM3,0,'Space does not dig while the bucket is above the ground');
assert.match(highResult.lastMessage,/Lower the boom/,'the raised bucket gives a plain lowering instruction');
high={...high,haul:{...high.haul,machines:{...high.haul.machines,
  excavator:{...high.haul.machines.excavator,load:{topsoil:machineDefinition('excavator').tools.bucket.capacityM3}}}}};
const fullResult=stepDigSandbox(high,{action:'dig'},dt);
assert.equal(fullResult.excavatedM3,0,'a full bucket takes no more soil');
assert.match(fullResult.lastMessage,/bucket is full/,'a full bucket tells the player to load it');
const work=machineControlInput({},null,'work');
const beforeDigTip=tipNow(sim);
const heightBeforeDig=sim.ground.heightAt(beforeDigTip.x,beforeDigTip.z);
for(let i=0;i<360;i++)sim=stepDigSandbox(sim,{controls:work,action:'dig'},dt);
assert.ok(sim.excavatedM3>0,'holding the excavator dig input removes real ground');
assert.notEqual(sim.ground.heightAt(beforeDigTip.x,beforeDigTip.z),heightBeforeDig,'the Scablands height layer records the cut');
assert.ok(machineLoadVolume(sim.haul.machines.excavator)>0,'the bucket holds excavated material');
const bucketBefore=machineLoadVolume(sim.haul.machines.excavator);
for(let i=0;i<40;i++)sim=stepDigSandbox(sim,{controls:{boom:1}},dt);
for(let i=0;i<252;i++)sim=stepDigSandbox(sim,{controls:{swing:-1}},dt);
const truckTip=tipNow(sim),truckAtLoad=sim.haul.machines.dumpTruck,bed=machineDefinition('dumpTruck').tools.bed;
assert.ok(Math.abs(truckTip.x-truckAtLoad.x)<=bed.widthM/2&&Math.abs(truckTip.z-truckAtLoad.z-bed.centerZ)<=bed.lengthM/2,
  `swinging back across reaches inside the truck bed without driving (${truckTip.x}, ${truckTip.z})`);
sim=stepDigSandbox(sim,{controls:work,action:'load'},dt);
assert.ok(sim.loadedM3>0,'the excavator loads the nearby truck');
assert.ok(machineLoadVolume(sim.haul.machines.dumpTruck)>0,'the truck carries the transferred material');
assert.ok(Math.abs(bucketBefore-machineLoadVolume(sim.haul.machines.excavator)-sim.loadedM3)<1e-5,
  'loading conserves material between the bucket and truck');
let miss=createDigSandbox({seed:417});
miss={...miss,haul:{...miss.haul,machines:{...miss.haul.machines,
  excavator:{...miss.haul.machines.excavator,load:{topsoil:.4}},dumpTruck:{...miss.haul.machines.dumpTruck,x:100}}}};
const spillTip=machineToolPosition(machineDefinition('excavator'),miss.haul.machines.excavator,'bucket');
const spillHeight=miss.ground.heightAt(spillTip.x,spillTip.z);
miss=stepDigSandbox(miss,{action:'load'},dt);
assert.ok(miss.haul.spilledVolumeM3>0,'a bucket outside the real bed spills its load');
assert.notEqual(miss.ground.heightAt(spillTip.x,spillTip.z),spillHeight,'missed dirt stays on the ground');
assert.match(miss.lastMessage,/spilled on the ground/,'the miss tells the player where the dirt went');

sim=switchDigMachine(sim);assert.equal(sim.activeMachine,'dumpTruck','Q selects the truck');
for(let i=0;i<90;i++)sim=stepDigSandbox(sim,{controls:pressed('KeyW','drive')},dt);
const truck=machineToolPosition(machineDefinition('dumpTruck'),sim.haul.machines.dumpTruck,'bed'),truckHeight=sim.ground.heightAt(truck.x,truck.z);
sim={...sim,mode:'work'};
let highestBed=0;for(let i=0;i<100;i++){sim=stepDigSandbox(sim,{controls:{},action:'tip'},dt);highestBed=Math.max(highestBed,sim.haul.machines.dumpTruck.bedAngle);}
assert.ok(sim.tippedM3>0,'the loaded truck tips a real heap');
assert.ok(highestBed>=.4,'the bed really lifts while tipping');
assert.notEqual(sim.ground.heightAt(truck.x,truck.z),truckHeight,'tipped material lands behind the truck and changes the ground');
const retained=machineLoadVolume(sim.haul.machines.excavator)+machineLoadVolume(sim.haul.machines.dumpTruck);
assert.ok(Math.abs(sim.excavatedM3-sim.tippedM3-retained)<1e-4,'excavated material is conserved through loading and tipping');

sim=switchDigMachine(sim);assert.equal(sim.activeMachine,'trencher','Q selects the trencher');
sim={...sim,mode:'drive'};
for(let i=0;i<100;i++)sim=stepDigSandbox(sim,{controls:pressed('KeyW','drive')},dt);
const trenchState=sim.trencher;
sim={...sim,mode:'work'};
for(let i=0;i<240;i++)sim=stepDigSandbox(sim,{controls:pressed('KeyW','drive'),action:'trench'},dt);
assert.ok(sim.trencher.cutVolumeM3>0,'the moving trencher cuts a real ditch');
assert.ok(sim.trencher.ridgeLooseVolumeM3>=sim.trencher.cutVolumeM3*1.25-1e-5,
  `the cut material is deposited in a ridge beside the ditch (${sim.trencher.cutVolumeM3} cut, ${sim.trencher.ridgeLooseVolumeM3} ridge)`);
assert.ok(sim.ground.chunkCount>0,'the sandbox has persistent edited ground');
assert.equal(trenchState.machine.timeSeconds>0,true,'the machine state advances in fixed simulation time');
const emptyTruck={...createDigSandbox({seed:21,playerId:'empty-bed'}),activeMachine:'dumpTruck',mode:'work'};
assert.ok(stepDigSandbox(emptyTruck,{controls:{},action:'tip'},.5).haul.machines.dumpTruck.bedAngle>0,'the bed lifts with no load, so the control always answers');
const otherPlayer=createDigSandbox({seed:417,playerId:'someone-else'});
assert.equal(otherPlayer.ground.heightAt(truck.x,truck.z),scablandsNaturalHeightAt(truck.x,truck.z),'another player starts with their own untouched ground');
closeDigSandbox();
assert.equal(scablandsGroundEdit.heightAt(truck.x,truck.z),scablandsNaturalHeightAt(truck.x,truck.z),'leaving the yard hands the Scablands back with its natural ground');
const savedHeight=sim.ground.heightAt(truck.x,truck.z);
const nextVisit=createDigSandbox({seed:417});
assert.equal(nextVisit.ground.heightAt(truck.x,truck.z),savedHeight,'edited ground remains in memory across sandbox visits');
console.log('THE-DIG headless inputs passed: dig, load, drive, tip, trench, material conservation and switch-gated entry.');
