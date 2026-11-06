import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {machineControlInput,keyboardAction} from '../src/input-contexts.js';
import {createDigSandbox,createPendingDigActions,DIG_HEAP,digSandboxMachineState,stepDigSandbox,switchDigMachine} from '../src/machines/dig-sandbox.js';
import {machineLoadVolume} from '../src/machines/tools.js';
import {machineToolPosition} from '../src/machines/machine.js';
import {machineDefinition} from '../src/machines/content/machines.js';

const flags=enabled=>({enabled:name=>name==='wasteland-town'&&enabled});
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
const savedHeight=sim.ground.heightAt(truck.x,truck.z);
const nextVisit=createDigSandbox({seed:417});
assert.equal(nextVisit.ground.heightAt(truck.x,truck.z),savedHeight,'edited ground remains in memory across sandbox visits');
console.log('THE-DIG headless inputs passed: dig, load, drive, tip, trench, material conservation and switch-gated entry.');
