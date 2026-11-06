import assert from 'node:assert/strict';
import {createTown, deserializeTown, serializeTown, stepTown, dispatchTownCommand, TOWN_TIME} from '../src/town/index.js';

let checks=0;function check(value,message){assert.ok(value,message);checks++;}
function days(town,count){for(let day=0;day<count;day++)for(let hour=0;hour<TOWN_TIME.ticksPerDay;hour++)stepTown(town);}
function addWell(town,litres=1_000_000){const region=town.regions.scablands;region.groundWater={pits:{},wellJobs:{},wells:{'0:0':{x:0,z:0,yieldLitresPerDay:litres,waterLitres:litres,drawdownLitres:0}},droughtDays:0};}
function stock(town,goods){town.goods={stockpiles:{'scablands:0:0':{goods:{...goods},warehouseId:null}},prices:{}};}
function paint(town,cells){const result=dispatchTownCommand(town,{type:'paintHomeGround',cells});check(result.ok,result.message);return result;}

const empty=createTown(1989,'No plots');days(empty,1);
check(empty.people.length===12,'a town without painted plots keeps its twelve founders');
check(empty.peopleConditions.shelterPlaces===12&&empty.peopleConditions.paintedHomePlaces===0,'founders stay in their canvas camp without painted home places');
check(!empty.book.some(entry=>entry.type==='arrival'),'no newcomers arrive without finished plots');

const growing=createTown(84,'Homes grow');addWell(growing);stock(growing,{canvas:200,tin:1000,timber:1000,steel:1000,brick:5000});
paint(growing,[{x:0,z:0},{x:1,z:0},{x:2,z:0},{x:3,z:0}]);
days(growing,4);
check(growing.homePlots.filter(plot=>plot.tier>=1).length>=1,'stored canvas lets a household finish a tent');
check(growing.peopleConditions.paintedHomePlaces>=4,'finished painted plots add places');
days(growing,30);
check(growing.people.length>12,'water and finished home places allow arrivals');

const short=createTown(85,'Short of goods');addWell(short);stock(short,{});paint(short,[{x:0,z:0}]);days(short,2);
check(short.homePlots[0].waitingGood==='canvas','a household waits when its plot lacks the canvas to start');
check(short.reports.some(report=>report.eventId==='home-goods-shortage'&&report.what.includes('Short of canvas.')),'the Reports system explains the missing good in a sentence');

const burned=createTown(87,'Burned plot');addWell(burned);stock(burned,{canvas:100});paint(burned,[{x:0,z:0}]);days(burned,4);
const plot=burned.homePlots[0],family=plot.family;
check(plot.tier===1&&burned.people.some(person=>person.family===family&&person.home===plot.id),'a finished plot holds its household');
burned.weather={windFactor:1};
for(const [id,x,z] of [['fire-west',-1,0],['fire-east',1,0],['fire-north',0,-1],['fire-south',0,1]]){
  burned.buildings.push({id,buildingId:'latrine',regionId:'scablands',x,z,width:1,depth:1,state:'finished'});
  check(dispatchTownCommand(burned,{type:'igniteTownFire',buildingId:id}).ok,'the fire command can light a finished site');
}
for(let hour=0;hour<72&&!plot.burning;hour++)stepTown(burned);
check(plot.tier===0&&plot.household===null&&burned.people.filter(person=>person.family===family).every(person=>person.home!==plot.id),'a burned plot gives no places and returns its family to canvas');

const dry=createTown(86,'Dry well');addWell(dry,0);days(dry,1);
check(dry.peopleConditions.waterLitresPerPerson===0,'a dry well measures no water per person');

const oldPeople=[{id:'person-1',name:'Saved person',family:'Saved',born:0,home:'canvas-Saved',homeTier:0,homeType:'Canvas',health:100,mood:50,skills:{},needs:{},history:[]}];
const old=deserializeTown(JSON.stringify({version:1,id:'town-old',name:'Old save',seed:4,tick:0,people:oldPeople,buildings:[]}));
check(old.people.length===1&&old.people[0].name==='Saved person'&&Array.isArray(old.homePlots)&&old.homePlots.length===0,'a legacy save keeps its person and gains an empty plot store');

const before=serializeTown(growing);const support={...growing.peopleConditions};
check(support.shelterPlaces===growing.peopleConditions.shelterPlaces&&serializeTown(growing)===before,'reading support does not change town state');
console.log(`Town people support: ${checks} checks passed.`);
