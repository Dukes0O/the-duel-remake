import assert from 'node:assert/strict';
import {createTown,dispatchTownCommand} from '../src/town/index.js';
import {bindTownWastelandMap, townWastelandMapMarkup, townWastelandMapModel} from '../src/town/ui/town-wasteland-map.js';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const town={name:'Rustwall <Camp>',till:950n,mayors:['mayor'],deeds:{items:{
  'sal-road':{ownerId:'player'},'sal-works':{ownerId:'player'},'sal-outpost':{ownerId:'player'},
  'dustmonger-road':{ownerId:'vane',bid:{amount:175,closesMonth:2,closesYear:1}},'dustmonger-works':{ownerId:'vane'},
}},dispatch:{explored:['mirage'],active:[{id:'job-1',crewId:'cinder',kind:'fire',chance:.82,chanceWords:'Likely',daysRemaining:2}],open:[]}};
const profile={wasteland:{territories:{sal:{claimed:true},dustmonger:{claimed:true}}}};
const before=JSON.stringify(town,(_key,value)=>typeof value==='bigint'?`${value}n`:value);
const model=townWastelandMapModel(town,{profile});
equal(model.territories.length,8,'territories come from the deed content table');
const sal=model.territories.find(row=>row.id==='sal');
equal(sal.setHeld,true,'the map recognizes a complete deed set');
equal(sal.bonus,'Timber costs 20% less.','the map shows the real set bonus');
equal(sal.flag,'Your flag','the map shows the deed owner flag');
equal(model.territories.find(row=>row.id==='dustmonger').deeds[1].asking,150,'the first offer on a Vane deed follows the deed rules');
equal(model.territories.find(row=>row.id==='mirage').fog,false,'explored territory is no longer hidden');
equal(model.territories.find(row=>row.id==='gunn').fog,true,'unclaimed, unexplored territory stays hidden');
equal(model.jobs[0].crewId,'cinder','dispatch cards identify the assigned crew member');
equal(model.jobs[0].chance,82,'dispatch cards show the recorded chance');
const html=townWastelandMapMarkup(model);
ok(html.includes('The Wasteland')&&html.includes('The Scablands'),'the map names its world and center');
ok(html.includes('Cloud covers this land.')&&!html.includes('Gearhead Gunn'),'fog hides unknown territory details');
ok(html.includes('Your flag')&&html.includes('hold the whole set.'),'owned sets show their flag and bonus state');
ok(html.includes('Enter your offer in scrap.')&&html.includes('Place bid'),'open bids can be answered');
ok(html.includes('The chance is likely, or 82 percent.'),'dispatch cards show the chance in words and numbers');
ok(html.includes('The Pipe Road, west of the Scablands')&&html.includes('town-wmap-roads'),'regions have place data and drawn roads');
ok(html.includes('data-town-map-close')&&html.includes('Enter your offer in scrap.'),'map controls use clear sentences');
ok(html.includes('Rustwall &lt;Camp&gt;'),'town names are escaped');
equal(JSON.stringify(town,(_key,value)=>typeof value==='bigint'?`${value}n`:value),before,'building the map does not change town or profile state');

const commands=[],listeners=new Map();
const input={value:'190'};
const root={addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type),querySelector:()=>input};
const dispose=bindTownWastelandMap(root,{onCommand:command=>commands.push(command)});
const click=target=>listeners.get('click')({target});
const bid={dataset:{townMapBid:'dustmonger-road'},disabled:false,closest:()=>bid};
click(bid);
equal(commands[0].type,'deedBid','a bid action becomes a town command');
equal(commands[0].offer,190,'the entered whole scrap offer is sent');
const buy={dataset:{townMapBuy:'sal-road'},disabled:false,closest:()=>buy};
click(buy);
equal(commands[1].type,'buyDeed','a deed purchase becomes a town command');
const disabled={dataset:{townMapBuy:'gunn-road'},disabled:true,closest:()=>disabled};
click(disabled);
equal(commands.length,2,'disabled deeds cannot send a purchase command');
dispose();
equal(listeners.has('click'),false,'disposing removes the click handler');

const realTown=createTown(401,'Deed Test',[{id:'mayor'}]);realTown.till=5000n;realTown.mayors=['mayor'];
realTown.money={balances:{cash:{debit:0n,credit:0n}},entries:[],months:{'1-01':{income:0n,expense:0n}},years:{'1':{income:0n,expense:0n}}};
const townProfile={wasteland:{territories:{sal:{claimed:true}}}};
const bought=dispatchTownCommand(realTown,{type:'buyDeed',deedId:'sal-road'},{profile:townProfile});
equal(bought.ok,true,'a real town command buys a claimed territory deed');
equal(realTown.till,4900n,'buying a deed takes scrap from the town till');
equal(realTown.deeds.items['sal-road'].ownerId,'player','the real town records the new deed owner');
const refused=dispatchTownCommand(realTown,{type:'buyDeed',deedId:'gunn-road'},{profile:townProfile});
equal(refused.ok,false,'the real town refuses an unclaimed territory deed');
ok(/Beat Gearhead Gunn before buying its deeds\./.test(refused.message),'a refused purchase explains why in a full sentence');

console.log(`Town Wasteland map: ${checks} checks passed.`);
