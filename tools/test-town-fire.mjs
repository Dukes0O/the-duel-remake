import assert from 'node:assert/strict';
import {createTown,serializeTown,stepTown} from '../src/town/index.js';
import {applyHoseFire,hoseFire,igniteTownFire} from '../src/town/town-fire.js';

let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function makeTown(seed=4) {
  const town=createTown(seed,'Fire test');
  town.buildings=[
    {id:'kitchen',buildingId:'soup-kitchen',regionId:'scablands',x:4,z:5,state:'finished'},
    {id:'hydrant',buildingId:'hydrant',regionId:'scablands',x:4,z:5,state:'finished',flowLitresPerMinute:7.5},
    {id:'safe-kitchen',buildingId:'soup-kitchen',regionId:'scablands',x:9,z:9,state:'finished',fireProtectedUntilTick:100n},
  ];
  return town;
}

const town=makeTown();
check(igniteTownFire(town,'kitchen'),'a finished building with timber can catch fire');
check(!igniteTownFire(town,'kitchen'),'a burning building cannot be ignited twice');
check(!igniteTownFire(town,'safe-kitchen'),'the scripted kitchen stays safe until the chapter releases it');
const before=serializeTown(town);
const quote=hoseFire(town,'kitchen',1000);
check(quote.ok&&quote.litres===450,'a hose is capped by 7.5 litres per minute for one game hour');
check(serializeTown(town)===before,'hoseFire only calculates and does not change the town');
check(applyHoseFire(town,'kitchen',1000).litres===450,'the application helper delivers the quoted amount');
check(hoseFire(town,'kitchen',1000).litres===0,'one hydrant cannot deliver more than its hourly flow');
town.tick=1n;
check(applyHoseFire(town,'kitchen',1000).litres===450,'flow becomes available in the next game hour');
town.tick=2n;
check(applyHoseFire(town,'kitchen',1000).litres===450,'water carries across hours while the fire remains burning');
check(town.buildings[0].fireOut&&!town.buildings[0].fireStage,'enough water puts out the first fire stage');
check(!hoseFire(town,'missing',100).ok,'a hose cannot target a missing building');

const oldSave=JSON.parse(serializeTown(town));
delete oldSave.buildings[0].fireStage;
delete oldSave.buildings[0].fireStartedTick;
check(createTown(1,'Old save').buildings.length===0&&Array.isArray(oldSave.buildings),'fire state needs no new top-level save fields');

function repeatFireRun() {
  const state=makeTown(73);
  for(let i=0;i<20_000;i++) stepTown(state);
  return serializeTown(state);
}
check(repeatFireRun()===repeatFireRun(),'fire ignition and spread repeat from the same seed');
const hourly=makeTown(8);
igniteTownFire(hourly,'kitchen');
check(stepTown(hourly).length===0&&hourly.tick===1n,'fire system advances without commands');
check(hourly.fireWindDay===1&&hourly.fireWindDirection>=0&&hourly.fireWindDirection<=3,'wind direction stays recorded for the game day');

console.log(`Town fire: ${checks} checks passed.`);
