import assert from 'node:assert/strict';
import {createTown,registeredTownSystems,townFoodSummary} from '../src/town/index.js';
import {storeGood} from '../src/town/town-goods.js';
import {stepTownFood} from '../src/town/town-food.js';
import {stepTownWeather} from '../src/town/town-weather.js';
import {stepTownPeople} from '../src/town/town-people.js';
import {stepTownFire} from '../src/town/town-fire.js';
import {solveTownPower} from '../src/town/town-power.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const rngFrom=(seed)=>{
  let state=seed>>>0;
  const next=()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
  return {int(min,max){return Math.floor(next()*(max-min+1))+min;},chance(p){return next()<p;}};
};
const calendar=(year=1,month=1,day=1,season='Spring')=>({year,month,day,season,hour:0});
check(registeredTownSystems().some(system=>system.name==='town-weather')&&registeredTownSystems().some(system=>system.name==='town-food'),'weather and food register with the town simulation');

const weatherA=createTown(90210,'Weather A'),weatherB=createTown(90210,'Weather B');
stepTownWeather({town:weatherA,rng:rngFrom(90210),calendar:calendar()});
stepTownWeather({town:weatherB,rng:rngFrom(90210),calendar:calendar()});
check(weatherA.weather.windSpeedKph===weatherB.weather.windSpeedKph&&weatherA.weather.drought.nextYear===weatherB.weather.drought.nextYear,'same seed and calendar give the same weather and drought schedule');
check(weatherA.weatherSchedule.drought.nextYear>=5n&&weatherA.weatherSchedule.drought.nextYear<=8n,'the first drought is scheduled four to seven years ahead');
check(weatherA.utilities.windFactor===weatherA.weather.windFactor,'weather supplies the wind factor used by wind power');
check(weatherA.weatherSchedule.drought.month>=4&&weatherA.weatherSchedule.drought.month<=6,'droughts start during the dry summer season');
stepTownWeather({town:weatherA,rng:rngFrom(11),calendar:calendar(weatherA.weatherSchedule.drought.nextYear,2,1)});
check(weatherA.weather.droughtForecast?.year===String(weatherA.weatherSchedule.drought.nextYear),'the drought forecast appears in spring');
const droughtYear=weatherA.weatherSchedule.drought.nextYear,droughtMonth=weatherA.weatherSchedule.drought.month,droughtLength=weatherA.weatherSchedule.drought.months;
stepTownWeather({town:weatherA,rng:rngFrom(12),calendar:calendar(droughtYear,droughtMonth,1,'Summer')});
check(weatherA.weather.drought===true,'the forecast drought begins in its scheduled summer month');
stepTownWeather({town:weatherA,rng:rngFrom(13),calendar:calendar(droughtYear,droughtMonth+droughtLength,1,'Autumn')});
check(weatherA.weather.drought===false,'a drought ends after its full scheduled duration');
const hotWeather=createTown(90212,'Hot weather');
stepTownWeather({town:hotWeather,rng:{int:(_min,max)=>max,chance:()=>false},calendar:calendar(1,4,1,'Summer')});
check(hotWeather.peopleConditions.waterNeedLitresPerPerson===50,'summer heat raises each resident water need');
const windPower=solveTownPower({generators:[{id:'mill',kind:'windmill',x:0,z:0}],wind:weatherA.utilities.windFactor});
check(Math.abs(windPower.generationKw-5*Math.min(1,weatherA.weather.windFactor))<0.001,'wind power uses the weather strength');
const fireTown=createTown(90211,'Weather fire');
fireTown.buildings=[
  {id:'burning',buildingId:'soup-kitchen',regionId:'scablands',x:0,z:0,state:'finished',fireStage:1},
  {id:'downwind',buildingId:'soup-kitchen',regionId:'scablands',x:0,z:1,state:'finished'},
];
fireTown.weather={windDirection:90,windFactor:1};
stepTownFire({town:fireTown,rng:{int:()=>0,chance:()=>true},tick:24n,calendar:calendar()});
check(fireTown.buildings[1].fireStage===1,'fire spread follows the seeded weather wind direction');

const farm=createTown(44,'Farm test');
farm.people=[{id:'goat-keeper',jobBuildingId:'goats'},{id:'grower-1',jobBuildingId:'glasshouse'},{id:'grower-2',jobBuildingId:'glasshouse'},{id:'grower-3',jobBuildingId:'glasshouse'}];
farm.buildings=[
  {id:'hens',buildingId:'chicken-run',regionId:'scablands',x:4,z:2,state:'finished'},
  {id:'goats',buildingId:'goat-pen',regionId:'scablands',x:6,z:2,state:'finished'},
  {id:'glasshouse',buildingId:'greenhouse',regionId:'scablands',x:8,z:2,state:'finished'},
  {id:'kitchen',buildingId:'soup-kitchen',regionId:'scablands',x:10,z:2,state:'finished'},
];
farm.people.push({id:'cook',jobBuildingId:'kitchen'});
farm.utilities={waterResult:{taps:[
  {id:'farm-water:hens',litresPerDay:4.1},{id:'farm-water:goats',litresPerDay:40},{id:'farm-water:glasshouse',litresPerDay:500},
]}};
storeGood(farm,{x:10,z:2},'food',20);
farm.weather={temperatureC:20,windSpeedKph:12,windDirection:180,windFactor:2/3,drought:false,droughtFactor:1,waterUseFactor:1};
stepTownFood({town:farm,calendar:calendar(1,1,1)});
check(farm.buildings[0].farmYield===12&&farm.buildings[1].farmYield===24,'well-watered, cared-for hens and goats produce the section 14 yields');
check(farm.buildings[2].farmYield===10,'a spring greenhouse uses the recorded mixed-crop yield');
check(farm.utilities.taps.filter(tap=>tap.kind==='farm').length===3,'farm buildings register their real daily water demand');
check(farm.peopleConditions.foodCaloriesPerPerson===2100,'the town records the calories actually served per person');
check(farm.goods.stockpiles['scablands:4:2'].goods.egg===12,'food service uses meals before eggs');
check(farm.goods.stockpiles['scablands:10:2'].goods.meal===5,'a staffed kitchen cooks ten meals and the town serves five');
check(townFoodSummary(farm).production.length===3,'the farm summary reports its producers');

const thirsty=createTown(45,'Dry farm');
thirsty.buildings=[{id:'hens',buildingId:'chicken-run',regionId:'scablands',x:4,z:2,state:'finished'}];
thirsty.weather={temperatureC:36,windSpeedKph:12,windDirection:0,windFactor:2/3,drought:true,droughtFactor:0.5,waterUseFactor:1.5};
stepTownFood({town:thirsty,calendar:calendar(1,7,1,'Summer')});
check(Math.abs(thirsty.buildings[0].farmWaterDemand-6.15)<1e-9,'summer heat raises farm water demand');
check(thirsty.buildings[0].farmYield===0,'a thirsty farm does not produce without delivered water');
check(Math.abs(thirsty.utilities.taps[0].litresPerDay-6.15)<1e-9,'the pipe network receives the increased farm demand');

const seasonal=createTown(46,'Winter farm');
seasonal.buildings=[{id:'glasshouse',buildingId:'greenhouse',regionId:'scablands',x:8,z:2,state:'finished'}];
seasonal.utilities={waterResult:{taps:[{id:'farm-water:glasshouse',litresPerDay:500}]}};
seasonal.weather={temperatureC:-4,windSpeedKph:12,windDirection:0,windFactor:2/3,drought:false,droughtFactor:1,waterUseFactor:1};
stepTownFood({town:seasonal,calendar:calendar(1,10,1,'Winter')});
check(seasonal.buildings[0].farmYield===0,'greenhouses stop producing in winter');
check(seasonal.utilities.taps[0].litresPerDay===0,'winter greenhouses do not draw irrigation water');

const spoiling=createTown(47,'Store test');
storeGood(spoiling,{x:1,z:1},'milk',1);
spoiling.buildings=[];
spoiling.weather={temperatureC:20,droughtFactor:1,waterUseFactor:1};
stepTownFood({town:spoiling,calendar:calendar(1,1,1)});
storeGood(spoiling,{x:1,z:1},'milk',1);
stepTownFood({town:spoiling,calendar:calendar(1,1,2)});
check(spoiling.farm.lots['scablands:1:1'].milk.reduce((sum,lot)=>sum+lot.amount,0)===spoiling.goods.stockpiles['scablands:1:1'].goods.milk,'new stock is reconciled with perishables already being tracked');
for(let day=3;day<=8;day++) stepTownFood({town:spoiling,calendar:calendar(1,1,day)});
check(!spoiling.goods.stockpiles['scablands:1:1'].goods.milk,'milk spoils after its seven-day shelf life');

const cold=createTown(48,'Cold tent');
cold.people=[{id:'tent-person',name:'T',born:0n,nextBirthday:999999n,age:20,family:'f',home:'canvas-f',homeType:'canvas',partnerId:null,health:100,mood:60,needs:{},skills:{},history:[],schoolDays:0}];
cold.homes=[{id:'canvas-f',tier:0,goodDays:0,hardDays:0,type:'canvas'}];
cold.peopleIdsReady=true;cold.homesReady=true;cold.peopleConditions={coldNight:true};
stepTownPeople({town:cold,rng:rngFrom(48),tick:24n,calendar:calendar(1,10,2,'Winter')});
check(cold.people[0].needs.shelter===false&&cold.people[0].health===100,'a freezing winter night makes canvas shelter unsafe: it risks sickness through town-health, and does not drain health by itself');
const hotTown=createTown(49,'Hot town');
hotTown.people=[
  {id:'hot-a',name:'A',born:0n,nextBirthday:999999n,age:25,family:'a',home:'a',homeType:'brick home',partnerId:'hot-b',health:100,mood:80,needs:{},skills:{},history:[],schoolDays:0},
  {id:'hot-b',name:'B',born:0n,nextBirthday:999999n,age:25,family:'b',home:'b',homeType:'brick home',partnerId:'hot-a',health:100,mood:80,needs:{},skills:{},history:[],schoolDays:0},
];
hotTown.homes=[{id:'a',tier:5,goodDays:0,hardDays:0,type:'brick home'},{id:'b',tier:5,goodDays:0,hardDays:0,type:'brick home'}];
hotTown.peopleIdsReady=true;hotTown.homesReady=true;
hotTown.peopleConditions={waterLitresPerPerson:20,waterNeedLitresPerPerson:50,foodCaloriesPerPerson:2100,shelterPlaces:10};
stepTownPeople({town:hotTown,rng:{int:(min)=>min,chance:()=>true},tick:720n,calendar:calendar(1,2,1)});
check(hotTown.people.length===2,'people below hot-weather water need do not arrive or have children');
console.log(`Town farm: ${checks} checks passed.`);
