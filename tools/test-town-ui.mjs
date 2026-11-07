import assert from 'node:assert/strict';
import {townScreenMarkup,townScreenModel} from '../src/town/ui/town-screen.js';
import {townBuildMenuMarkup,townBuildMenuModel} from '../src/town/ui/town-build-menu.js';
import {bindTownInput} from '../src/town/ui/town-input.js';

let checks=0;
function equal(actual,expected,message){assert.equal(actual,expected,message);checks++;}
function ok(value,message){assert.ok(value,message);checks++;}

const town={name:'Rustwall <Camp>',tick:0n,people:[{id:'one'}],buildings:[],till:1500};
const model=townScreenModel(town,{next:'Build a road.',speed:2});
equal(model.date,'Year 1, Spring, day 1','the first town date is clear');
equal(model.people,1,'people count comes from current town data');
const html=townScreenMarkup(model);
ok(html.includes('data-town-action="visit">VISIT</button>')&&!html.includes('THE BOOK: VISIT'),'the visit button has its short label');
ok(html.includes('NEXT')&&html.includes('Build a road.'),'the next line stays visible');
ok(html.includes('Rustwall &lt;Camp&gt;'),'town names are escaped');
for(const label of ['TILL','PEOPLE','MOOD','WATER IN','WATER OUT','POWER IN','POWER OUT','THE YARD','THE BOOK']) ok(html.includes(label),`${label} is on the screen`);
for(const label of ['Water','Pressure','Clean','Food','Goods','Safety','Fire','Mood','Reach','Underground']) ok(html.includes(label),`${label} overlay is available`);
ok(html.includes('aria-pressed="true">2×'),'current speed is shown');

const menu=townBuildMenuModel({tab:'water',unlockedBuildingIds:['hand-well'],availableBuildingIds:['hand-well']});
equal(menu.entries[0].id,'hand-well','content data fills the build menu');
ok(menu.entries[0].needs.includes('40 kg Timber'),'material amounts are visible');
ok(menu.entries.some(entry=>entry.locked&&entry.reason?.startsWith('Opens with')),'locked plans say what opens them');
const menuHtml=townBuildMenuMarkup(menu);
ok(menuHtml.includes('role="tab"')&&menuHtml.includes('disabled aria-disabled="true"'),'tabs and locked plans are accessible');
const homesModel=townScreenModel(town,{tab:'homes'}),homesHtml=townScreenMarkup(homesModel);
ok(homesModel.menu.tab==='homes'&&homesHtml.includes('data-town-home-tool="paint"'),'the selected Homes and Shops tab shows its paint tool');

const listeners=new Map(),commands=[],views=[];
const root={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),querySelector:()=>null};
const controls=bindTownInput(root,{command:value=>commands.push(value),viewAction:value=>views.push(value)});
const target=(data,classes=[])=>({dataset:data,closest(selector){return (selector.includes('data-town-build')&&data.townBuild)||(selector.includes('data-town-tab')&&data.townTab)?this:selector.split(',').some(part=>part.trim()==='.town-map'&&classes.includes('town-map'))?this:null;}});
listeners.get('click')({target:target({townBuild:'soup-kitchen'})});
equal(controls.getPlacement().buildingId,'soup-kitchen','choosing a plan starts placement');
listeners.get('click')({target:target({townTab:'homes'})});
equal(views.at(-1).type,'showBuildTab','choosing a build tab updates view state');
equal(views.at(-1).tab,'homes','the selected build tab is passed to view state');
listeners.get('keydown')({key:'r'});
equal(controls.getPlacement().rotation,90,'R rotates the placement preview');
const cell={dataset:{cellX:'12',cellZ:'-3'},closest:selector=>selector.includes('[data-cell-x]')?cell:null};
listeners.get('pointerup')({target:{...cell,closest(selector){return selector.includes('.town-map')?this:selector.includes('[data-cell-x]')?cell:null;}}});
equal(commands[0].type,'placeBuilding','placing sends a town command');
equal(commands[0].x,12,'placement sends the selected map cell');
equal(commands[0].building.width,1,'a quarter turn swaps the planned footprint width');
equal(commands[0].building.depth,2,'a quarter turn swaps the planned footprint depth');
listeners.get('keydown')({key:'Escape'});
equal(controls.getPlacement().buildingId,null,'Escape cancels placement');
equal(views.at(-1).type,'cancelPlacement','cancelling updates the view through its callback');
controls.dispose();
equal(listeners.has('click'),false,'disposing removes the delegated click handler');

console.log(`Town UI: ${checks} checks passed.`);
