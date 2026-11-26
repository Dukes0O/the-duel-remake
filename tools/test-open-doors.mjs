import assert from 'node:assert/strict';
import {sampleWorld} from '../src/world/open/samples.js';
import {applyEffects} from '../src/world/open/open-effects.js';
import {beginOpenLand, stepOpenLand} from '../src/world/open/open-land.js';
import {buildingWalls, inBay, pointInBuilding, roomAt} from '../src/world/open/building-rule.js';
import {BUILDINGS} from '../src/world/open/content/buildings.js';
import {forgePosts} from '../src/world/open/content/people-forge.js';
import {buildingsPart} from '../src/world/open/parts/buildings.js';
import {servicePrice, wrenchLimit} from '../src/world/open/service-rule.js';
import {dirtAfter} from '../src/world/open/dirt-rule.js';
import {createJobSolidGrid} from '../src/world/scablands-solids.js';
import {stepMover} from '../src/world/scablands-movers.js';
import {createBuildingView} from '../src/world/open/building-view.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {App} from '../src/app.js';
import {pageFunctions, pageSource} from './scenarios/open-forge-shed.mjs';

const [forge, shed] = BUILDINGS, world = sampleWorld('first-night');
const car = {armor: 44, maxArmor: 100};
assert.deepEqual(['Wary','Strangers','Friendly','Sworn','Cold'].map(word => servicePrice('repair', word, car)),
  [15,12,9,6,null]);
assert.equal(servicePrice('repair','Strangers',{armor: 99,maxArmor:100}),4);
assert.equal(servicePrice('wash','Friendly',car),5);
const dirt = world.open.car.dirt;
assert.equal(dirtAfter(dirt,100,'sand',false), 3*dirtAfter(dirt,100,'road',true));
assert.ok(dirtAfter(dirt,0,'ash-hit',true) > dirt);
assert.equal(dirtAfter(.99,10000,'burn',false),1);

const grid = createJobSolidGrid();
grid.openBuildingShells(BUILDINGS,BUILDINGS.flatMap(buildingWalls));
for (const row of BUILDINGS) {
  const [w,d] = row.size, centre = pointInBuilding(row);
  function walk(from,to,radius) {
    let pos = pointInBuilding(row,from);
    const end = pointInBuilding(row,to);
    const dx = (end.x-pos.x)/60, dz = (end.z-pos.z)/60;
    for (let i = 0; i < 60; i++) {
      const next = {x: pos.x+dx, z: pos.z+dz};
      pos = stepMover(pos,next,{radius,grid});
    }
    return pos;
  }
  assert.equal(roomAt(walk([0,d/2+1],[0,0],.34))?.id,row.id);
  assert.equal(roomAt(walk([0,0],[0,d/2+1],.34)),null);
  for (const [from,to] of [[[w/2+1,0],[0,0]],[[-w/2-1,0],[0,0]],[[0,-d/2-1],[0,0]],
    [[w/2-.4,d/2+1],[w/2-.4,0]]]) assert.equal(roomAt(walk(from,to,.34)),null);
  assert.equal(roomAt(walk([0,d/2+2],[0,0],1)),null,'the car cannot fit between the jambs');
  assert.ok(inBay(row,pointInBuilding(row,row.carBay.at)) && !inBay(row,centre));
}

const posts = forgePosts('day',()=>0);
const action = (row, baseWorld = world) => {
  let land = beginOpenLand({open:{world:baseWorld},steps:[{kind:'roam'}]});
  const view = {onFoot:true, player:{position:pointInBuilding(row)}, people:posts, car,
    carPosition: pointInBuilding(row,row.carBay.at)};
  const step = (input = {}) => {
    const out = stepOpenLand(land,{...view,...input},1/60,[buildingsPart]);
    land = out.open;
    return out;
  };
  const reply = (id, yes = true) => step({jobEvents:[{type:'talkChoice',id:id+(yes?'/yes':'/no')}]});
  return {step,reply,get world(){return land.world;}};
};
const tab = action(forge);
let offered = tab.step({interact:true});
const first = offered.open.parts.buildings.offer;
assert.equal(first.price,12);
assert.match(offered.requests.at(-1).scene.lines[0].words,/12 scrap/);
tab.reply(first.id,false);
assert.equal(tab.world.scrap,world.scrap);
offered = tab.step({interact:true});
tab.reply(offered.open.parts.buildings.offer.id);
assert.equal(tab.world.scrap,world.scrap-12);
assert.ok(tab.step().requests.some(r=>r.type==='shedRepair'));
const second = tab.step({interact:true}).open.parts.buildings.offer;
assert.notEqual(second.id,first.id);
tab.reply(first.id);
assert.equal(tab.world.scrap,world.scrap-12,'a stale answer cannot buy another repair');

const poor = action(forge,applyEffects(world,{id:'test/spent',effects:[{type:'scrap',by:-58}]}).world);
const refusal = poor.reply(poor.step({interact:true}).open.parts.buildings.offer.id);
assert.match(refusal.requests.at(-1).scene.lines[0].words,/10 scrap short/);
assert.equal(poor.world.scrap,2);
assert.ok(!poor.step().requests.some(r=>r.type==='shedRepair'));
for (const [view,match] of [[{partOfDay:'dark'},/forge is cold/],[{carPosition:{x:0,z:0}},/marked patch/],
  [{car:{armor:100,maxArmor:100}},/isn't a mark/]]) {
  const out = action(forge).step({...view,interact:true});
  assert.match(out.requests.at(-1).scene.lines[0].words,match);
  assert.ok(!out.open.parts.buildings.offer);
}
const cold = applyEffects(world,{id:'test/cold',effects:[{type:'word',person:'tin-town',set:'Cold'}]}).world;
assert.match(action(forge,cold).step({interact:true}).requests.at(-1).scene.lines[0].words,/busy tomorrow/);
const wash = action(shed,applyEffects(world,{id:'test/dust',effects:[{type:'dirt',by:.6}]}).world);
const quote = wash.step({interact:true}).open.parts.buildings.offer;
wash.reply(quote.id);
assert.ok(wash.step().requests.some(r=>r.cue==='open.wash'));
assert.equal(wash.world.open.car.dirt,0);
assert.equal(wash.world.scrap,world.scrap-6);
assert.equal(wrenchLimit({open:{world},definition:{steps:[{kind:'roam'}]}},100),60);
assert.equal(wrenchLimit({night2:{},definition:{steps:[{kind:'talk'}]}},100),100);

for (const name of Object.keys(pageFunctions)) new Function('return ' + pageSource(name));
const drawing = createBuildingView();
drawing.update({open:offered.open},pointInBuilding(forge));
assert.equal(drawing.group.getObjectByName('forge-shed/roof').visible,false);
for (const thing of forge.room.things) assert.ok(drawing.group.getObjectByName(thing));
drawing.dispose();

// Exercise the actual talk input and armour mutation through the same outing as the laptop drive.
const memory = new Map();
globalThis.localStorage = {getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
globalThis.cancelAnimationFrame = () => {};
const app = new App();
app.audio.unlock = () => {};
app.duel.featureFlags = {enabled:id=>['hidden-road','story-choices','crew-gear','warlord-cards'].includes(id)};
app.profile = {...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,scrap:60}};
assert.ok(app._saveProfile());
assert.ok(app.visitWasteland());
app.advance(8);
globalThis.window = {__qaApp:app};
const street = pointInBuilding(forge,[0,forge.size[1]/2+1]);
pageFunctions.start();
const {duel} = app, job = duel.state.arena.worldJob;
const tick = () => duel.step(1/120);
app.advance(4);
pageFunctions.park(street,scablandsSurfaceHeightAt(street.x,street.z),pointInBuilding(forge,forge.carBay.at));
pageFunctions.walk(true);
assert.equal(job.open.parts.buildings.inside,'forge-shed');
pageFunctions.speak();
tick();
assert.match(job.job.stepState.screen.line.words,/6 scrap/);
const respond = action => { assert.ok(duel.talkInput(action,job.job.stepState.screen)); tick(); };
respond({type:'advance'});
respond({type:'select',index:0});
for (let i=0;i<4;i++) tick();
assert.match(job.job.stepState.screen.line.words,/every panel/);
assert.equal(duel.state.armor,duel.state.maxArmor);
assert.equal(job.open.world.scrap,54);
assert.equal(app.profile.wasteland.scrap,60);
respond({type:'advance'});
pageFunctions.walk(false);
assert.equal(job.open.parts.buildings.inside,null);
assert.equal(job.job.steps[0].kind,'roam');
// The real wrench stops mid-stroke at sixty percent and leaves a better car alone.
const bay = pointInBuilding(forge, forge.carBay.at);
const beside = pointInBuilding(forge, [2,forge.carBay.at[1]]);
pageFunctions.park(beside,scablandsSurfaceHeightAt(beside.x,beside.z),bay);
const cap = duel.state.maxArmor * .6;
duel.state.armor = cap - 1;
tick();
assert.ok(duel.selectFootGear(2));
duel.setFighterInput({fire:true});
for (let i=0;i<180;i++) tick();
assert.equal(duel.state.armor,cap);
assert.ok(job.fieldPatched);
duel.setFighterInput({fire:false});
tick();

// An ash sack that lands on the parked car also counts. Moss tells where it came from,
// quotes the price and delivers a clean car to the same outing after the yes answer.
const mossStreet = pointInBuilding(shed,[0,shed.size[1]/2+1]);
pageFunctions.park(mossStreet,scablandsSurfaceHeightAt(mossStreet.x,mossStreet.z),pointInBuilding(shed,shed.carBay.at));
job.ashHit = true;
tick();
pageFunctions.walk(true);
assert.equal(job.open.parts.buildings.inside,'bess-shed');
assert.ok(job.open.world.open.car.dirt > 0);
pageFunctions.speak();
tick();
assert.match(job.job.stepState.screen.line.words,/ash on your car/);
respond({type:'advance'});
assert.match(job.job.stepState.screen.line.words,/6 scrap/);
respond({type:'advance'});
respond({type:'select',index:0});
for (let i=0;i<4;i++) tick();
assert.match(job.job.stepState.screen.line.words,/what colour/);
assert.equal(job.open.world.open.car.dirt,0);
assert.equal(job.open.parts.buildings.ash,false);
assert.equal(job.open.world.scrap,48);
assert.equal(app.profile.wasteland.scrap,60);
console.log('test-open-doors: room collision, prices, dirt, field wrench, scenario syntax and both in-game services passed.');
