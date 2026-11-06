import assert from 'node:assert/strict';
import {createTown,deserializeTown,dispatchTownCommand,serializeTown,stepTown,townLedger,TOWN_MONEY_PRICES} from '../src/town/index.js';

let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function same(actual,expected,message){assert.deepEqual(actual,expected,message);checks++;}
function month(town){for(let tick=0;tick<720;tick++)stepTown(town);}

same(TOWN_MONEY_PRICES.ticket,{Cheap:2,Fair:5,Dear:10},'ticket prices have three clear choices');
const town=createTown(1001,'Pay Day');
stepTown(town);
same(town.till,1500n,'Hollis adds the founding grant once');
const profile={wasteland:{scrap:700}};
check(dispatchTownCommand(town,{type:'tillIn',amount:200},{profile}).ok,'the player can put scrap in the till');
same(profile.wasteland.scrap,500,'a deposit comes from the player wallet');
same(town.till,1700n,'a deposit reaches the town till');
check(dispatchTownCommand(town,{type:'tillOut',amount:200},{profile}).ok,'the player can take scrap out');
same(profile.wasteland.scrap,600,'half of a withdrawal returns to the player');
same(town.till,1600n,'half of a withdrawal stays in the town');
const ledger=townLedger(town);
check(ledger.balanced,'every till move has equal Ledger sides');
same(ledger.netScrap,town.till-ledger.loans,'the Ledger reports assets less debt');

const earners=createTown(12,'The Market');
earners.people=[{id:'resident',rentMonthly:10}];
earners.buildings=[
  {id:'market',buildingId:'market-hall',state:'finished',monthlyCustomers:100,shopPrice:'Cheap'},
  {id:'tickets',buildingId:'tavern',state:'finished',monthlyVisitors:30,ticketPrice:'Cheap'},
  {id:'wages',buildingId:'pump-house',state:'finished'},
];
check(dispatchTownCommand(earners,{type:'setTicketPrice',id:'tickets',price:'Dear'}).ok,'ticket prices can be set in plain words');
check(dispatchTownCommand(earners,{type:'setShopPrice',id:'market',price:'Fair'}).ok,'shop prices can be set in plain words');
check(!dispatchTownCommand(earners,{type:'setShopPrice',id:'market',price:'Too much'}).ok,'unknown price choices are refused');
month(earners);
const earned=townLedger(earners);
check(earned.months['1-02'].income>=810n,'the month books rent, shop sales and tickets');
check(earned.months['1-02'].expense>=101n,'the month books wages and upkeep from the building schedule');
check(earned.ownedBuildings.length===3,'the Ledger lists buildings the town owns');
check(earned.balanced,'income and costs keep both sides of the Ledger balanced');

const unpaid=createTown(15,'Short Till');
unpaid.buildings=[{id:'waterworks',buildingId:'hand-well',state:'finished',upkeepMonthly:2000,staff:0}];
month(unpaid);
check(unpaid.buildings[0].operational===false,'a building stops when the town cannot pay its bill');
check(unpaid.buildings[0].whyNot.endsWith('.'),'a stopped building explains why in one sentence');
const spareProfile={wasteland:{scrap:1000}};
check(dispatchTownCommand(unpaid,{type:'tillIn',amount:1000},{profile:spareProfile}).ok,'the player can restore the town till');
month(unpaid);
check(unpaid.buildings[0].operational===true,'a stopped building can return to work once its bill is paid');

const deedMaintenance=createTown(17,'Deed maintenance');
deedMaintenance.deeds={version:1,items:{'vultures-road':{ownerId:'player'},'vultures-works':{ownerId:'player'},'vultures-outpost':{ownerId:'player'}}};
deedMaintenance.buildings=[{id:'maintained',buildingId:'hand-well',state:'finished',upkeepMonthly:100,staff:0}];
month(deedMaintenance);
check(townLedger(deedMaintenance).entries.some(entry=>entry.kind==='monthly-upkeep'&&entry.amount===95n),'the Twin Vultures set reduces upkeep by five percent');

const loanTown=createTown(16,'Hollis Keeps Count');
loanTown.buildings=[{id:'pump',buildingId:'pump-house',state:'finished',upkeepMonthly:600,staff:0}];
for(let i=0;i<6;i++)month(loanTown);
const loanLedger=townLedger(loanTown);
check(loanLedger.loans>0n,'Hollis lends scrap after a season of empty till months');
check(loanLedger.notice.includes('Hollis lent'),'the Ledger explains Hollis’s loan');
check(loanLedger.entries.some(entry=>entry.kind==='monthly-interest'),'the loan accrues monthly interest');
check(loanLedger.balanced,'loans and interest have matching Ledger entries');

const year30=createTown(8675309,'Thirty Years');
year30.people=Array.from({length:100},(_,id)=>({id:`person-${id}`,rentMonthly:10}));
year30.buildings=[{id:'hall',buildingId:'town-hall',state:'finished',monthlyCustomers:25,shopPrice:'Fair',monthlyVisitors:10,ticketPrice:'Cheap'}];
for(let tick=0;tick<24*30*12*30;tick++)stepTown(year30);
const thirtyYearLedger=townLedger(year30);
check(year30.calendar.year===31&&year30.calendar.month===1,'the simulation completes a 30-year run');
check(Object.keys(thirtyYearLedger.years).length>=30,'the Ledger keeps monthly and yearly totals');
check(thirtyYearLedger.entries.length>1000,'the Ledger keeps long-run money history');
check(thirtyYearLedger.balanced,'the double-entry books still balance after 30 years');
const saved=deserializeTown(serializeTown(year30));
same(serializeTown(saved),serializeTown(year30),'the town Ledger survives save and load');
const older=deserializeTown({version:1,id:'old',name:'Old Town',seed:1,tick:0,rngState:1,regions:{},people:[],buildings:[]});
stepTown(older);
same(older.till,1500n,'a town saved before the Ledger receives one grant when first loaded');

console.log(`Town money: ${checks} checks passed; Ledger stayed balanced after 30 years.`);
