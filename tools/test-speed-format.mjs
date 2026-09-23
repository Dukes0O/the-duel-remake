import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CARS,COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {speedKph,formatSpeed,KPH_PER_MPH} from '../src/speed-format.js';
import {screenMarkup} from '../src/screen-menu.js';
import {speedGearPresentation} from '../src/screen-hud.js';
import {createResultsScreen} from '../src/screen-results.js';

let checks=0;const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;},ok=(value,label)=>{assert.ok(value,label);checks++;};
same(KPH_PER_MPH,1.609344,'Display uses the exact kilometre/mile conversion');
for(const [mph,kph]of [[0,0],[-0,0],[1,2],[22,35],[-22,35],[45,72],[55,89],[65,105],[100,161],[137.8,222],[329.29,530],[1000,1609]]){
  same(speedKph(mph),kph,'Finite signed physics speed converts to an absolute rounded readout');same(formatSpeed(mph),`${kph} km/h`,'Speed text includes an unambiguous metric unit');
}
for(const bad of [undefined,null,NaN,Infinity,-Infinity,'invalid'])same(speedKph(bad),0,'Missing or invalid display values stay finite');
const markup=screenMarkup({choices:{car:'falcone_f42',cpuDifficulty:'medium',difficulty:'arcade',startStage:0},arrow:'',sound:'',escapeHTML:String});
ok(markup.includes('<span>km/h</span>')&&markup.includes('TOP SPEED / km/h'),'HUD and menu have visible metric labels');
ok(!/\bMPH\b|\bmph in a\b/.test(markup),'Production UI has no obsolete imperial speed labels');
ok(typeof speedGearPresentation==='function','Actual HUD presenter is exported');
for(const [speedMph,gear,expected]of [[110,3,['177',4]],[-22,-1,['035','R']],[0,0,['000',1]],[329.29,8,['530',9]]]){
  const state=Object.freeze({speedMph,gear}),before=JSON.stringify(state);same(speedGearPresentation(state),expected,'Actual HUD displays converted speed and original gear');same(JSON.stringify(state),before,'HUD never mutates internal speed or direction');
}
ok(typeof createResultsScreen==='function','Actual ticket/result renderer is exported');
const modal=createResultsScreen({app:{profileSaved:true},profile:()=>({credits:800}),credits:value=>Number(value||0).toLocaleString('en-US'),time:String,metric:(key,value)=>`${key}: ${value}`,action:label=>`<button>${label}</button>`,escapeHTML:String,arrow:''});
const ticket=Object.freeze({status:'ticket',police:{ticket:{speedMph:110,limitMph:55,penaltySec:20,fine:150}}}),before=JSON.stringify(ticket),html=modal(ticket);
ok(html.includes('177 km/h in a 89 km/h zone.'),'Ticket converts both measured speed and speed limit');ok(!html.includes('110 mph')&&!html.includes('55 zone'),'Ticket does not mix converted and old units');same(JSON.stringify(ticket),before,'Ticket presentation does not change penalties or source speed');
const menuSource=readFileSync(new URL('../src/screen-menu.js',import.meta.url),'utf8'),hudSource=readFileSync(new URL('../src/screen-hud.js',import.meta.url),'utf8');
ok(menuSource.includes('Slide above ${formatSpeed(45)}.' )&&hudSource.includes('Slide above ${formatSpeed(45)} to build a chain.'),'Menu and in-race drift hints use the same unchanged physical threshold');
for(const car of Object.values(CARS)){const before=JSON.stringify(car);formatSpeed(car.topSpeed);speedKph(car.offRoadSpeed);same(JSON.stringify(car),before,'Display conversion leaves every original physics car definition untouched');}
const road=new Course(COURSE[0],1989),limits=road.features.signs.filter(sign=>sign.top==='SPEED LIMIT'),bends=road.features.signs.filter(sign=>sign.top.endsWith('BEND'));
ok(limits.length>0&&bends.length>0,'Actual course has both kinds of speed sign');
for(const sign of limits)ok(road.features.radarTraps.some(trap=>sign.bottom===formatSpeed(trap.limitMph)),'Rendered speed-limit sign agrees with unchanged radar threshold');
for(const sign of bends)ok(road.features.turns.some(turn=>sign.bottom===formatSpeed(turn.advisory)),'Rendered advisory sign uses metric speed');
console.log(`Metric speed presentation: ${checks} checks passed for conversion, reverse, high speed, menu/HUD labels, ticket limits, drift hints and immutable physics inputs.`);
