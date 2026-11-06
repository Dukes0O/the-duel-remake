import assert from 'node:assert/strict';
import {townReportsPanelModel, townReportsPanelMarkup, bindTownReportsPanel} from '../src/town/ui/town-reports-panel.js';
import {townCardModel, townCardMarkup, bindTownCard} from '../src/town/ui/town-card.js';
import {townLedgerModel, townLedgerMarkup} from '../src/town/ui/town-ledger.js';
import {townBookViewModel, townBookViewMarkup} from '../src/town/ui/town-book-view.js';
import {townTeachModel, townTeachMarkup, bindTownTeach} from '../src/town/ui/town-teach.js';

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
function equal(actual, expected, message) { assert.equal(actual, expected, message); checks++; }

const town = {
  name:'Rustwall <Camp>', tick:8640n, till:1450n,
  people:[{id:'ada',name:'Ada',age:12,family:'Quill family',job:'student',skills:{learning:4},history:['Ada came to town.']}],
  buildings:[{id:'well-1',buildingId:'hand-well',state:'finished',x:4,z:8,width:1,depth:1}],
  reports:[{id:'report-old',who:'Odessa',what:'A fire has started.',where:'Moss’s garage',priority:100,createdTick:7n,unanswered:true,x:4,z:8,
    answers:[{id:'go-yourself',label:'You leave for the fire.'}]},{id:'report-new',who:'Hollis',what:'A trader has offered a deal.',where:'Dot’s Diner',priority:40,createdTick:9n,unanswered:true,
    answers:[{id:'accept',label:'The town accepts the deal.'}]}],
  money:{loans:200n,entries:[{debit:'cash',credit:'grant-income',amount:1500n,kind:'founding-grant',year:1,month:1}],
    months:{'1-01':{income:1500n,expense:50n}},years:{'1':{income:1500n,expense:50n}},
    balances:{cash:{debit:1500n,credit:50n},'grant-income':{debit:0n,credit:1500n},'upkeep-expense':{debit:50n,credit:0n}}},
  bookPages:[{year:1n,text:'The first people made a home here.',entries:['The town was founded.']}],
  book:[{tick:120n,text:'Ada <arrived>.'},{tick:121n,text:'The well came in. <It is brown>.'}],
  teachingSessions:[{id:'session-1',personId:'ada',kind:'trench',elapsedSeconds:30,requiredSeconds:60,completed:false}],
  apprenticeships:[{personId:'ada',kind:'trench',skill:0.25}],
};
const before = JSON.stringify(town, (_key,value) => typeof value === 'bigint' ? `${value}n` : value);

const reports = townReportsPanelModel(town);
equal(reports[0].id,'report-old','urgent unanswered reports appear first');
const reportHtml = townReportsPanelMarkup(reports);
ok(reportHtml.includes('You leave for the fire.'),'a report shows its real answer');
ok(reportHtml.includes('data-town-focus-x="4" data-town-focus-z="8"'),'a report can light its map location');
ok(!reportHtml.includes('Moss’s garage</button>'),'report location is safely escaped text');
const callbacks = [];
const reportRoot = {addEventListener(_type,fn){this.click=fn;},removeEventListener(){}};
const reportControls = bindTownReportsPanel(reportRoot,{onCommand:value=>callbacks.push(value),onFocus:value=>callbacks.push(value)});
const answerButton = {dataset:{townReportId:'report-old',townReportAnswer:'go-yourself'},closest:selector=>selector.includes('data-town-report-answer')?answerButton:null};
reportRoot.click({target:answerButton});
equal(callbacks[0].type,'answerReport','report answers become town commands');
const focusButton = {dataset:{townFocusReport:'report-old',townFocusX:'4',townFocusZ:'8'},closest:selector=>selector.includes('data-town-focus-report')?focusButton:null};
reportRoot.click({target:focusButton});
equal(callbacks[1].x,4,'report focus sends the map coordinates');
reportControls();

const person = townCardModel(town,{kind:'person',id:'ada'});
ok(townCardMarkup(person).includes('Age: 12 years.'),'a person card shows age');
ok(townCardMarkup(person).includes('Quill family'),'a person card shows family');
ok(townCardMarkup(person).includes('Ada came to town.'),'a person card shows history');
const building = townCardModel(town,{kind:'building',id:'well-1',more:true,why:'The well is brown.'});
const buildingHtml = townCardMarkup(building);
ok(buildingHtml.includes('40 kilograms (kg) of timber'),'MORE shows real plan materials and explains the unit');
ok(buildingHtml.includes('8 metres wide'),'building measurements explain the map cell');
ok(buildingHtml.includes('The well is brown.'),'Why? gives the problem in a sentence');
equal(townCardModel(town,{kind:'site',id:'missing'}),null,'a missing site has no invented details');

const ledger = townLedgerModel(town,{period:'year',year:1});
equal(ledger.till,'1,450','the Ledger reads the actual town till');
equal(ledger.net,'1,250','the Ledger subtracts recorded loans from town cash');
equal(ledger.income,'1,500','the Ledger shows the saved yearly income');
ok(ledger.balanced,'the Ledger checks recorded debit and credit totals');
ok(townLedgerMarkup(ledger).includes('Founding grant'),'the Ledger explains the grant account');
ok(townLedgerMarkup(ledger).includes('The Ledger balances.'),'the Ledger explains its balance check');
const moneyControls=townLedgerMarkup(townLedgerModel(town,{profile:{wasteland:{scrap:750}},canTrade:true,shortfall:100}));
ok(moneyControls.includes('Your scrap: 750. Town till: 1,450.'),'the Ledger shows the player wallet beside the till');
ok(moneyControls.includes('data-town-till-in="100"')&&moneyControls.includes('data-town-till-in="1000"'),'the Ledger offers 100 and 1,000 scrap deposits');
ok(moneyControls.includes('data-town-till-in="100"')&&moneyControls.includes('clear the shortfall'),'the Ledger offers a deposit for the exact shortage');
ok(moneyControls.includes('Take out 100 scrap. You get 50.'),'a withdrawal button states the amount the player receives after the levy');
ok(!townLedgerMarkup(townLedgerModel(town,{profile:{wasteland:{scrap:750}},canTrade:false})).includes('data-town-till-in'),'a look-only visit has no wallet controls');

const book = townBookViewModel(town);
equal(book.pages.length,1,'the Book keeps its saved yearly page');
ok(townBookViewMarkup(book).includes('The Book of Rustwall &lt;Camp&gt;'),'the Book safely names its town');
ok(townBookViewMarkup(book).includes('Ada &lt;arrived&gt;'),'the Book escapes chronicle text');
ok(townBookViewMarkup(book).includes('The well came in. &lt;It is brown&gt;.'),'the Book keeps individual chronicle entries beside yearly pages');

const teaching = townTeachModel(town,{jobs:[{kind:'trench',label:'Trenching',machineId:'trencher'}]});
ok(townTeachMarkup(teaching).includes('30 of 60 seconds'),'teaching reports measured demonstration time in words');
ok(townTeachMarkup(teaching).includes('25 out of 100'),'teaching explains skill as a readable amount');
ok(townTeachMarkup(teaching).includes('A second is a unit of time.'),'teaching explains its time unit');
const teachRoot = {addEventListener(_type,fn){this.click=fn;},removeEventListener(){}};
let started;
const teachControls = bindTownTeach(teachRoot,{onStartDemonstration:value=>{started=value;}});
const teachButton = {dataset:{personId:'ada',jobKind:'trench',machineId:'trencher'},closest:selector=>selector.includes('data-town-teach-start')?teachButton:null};
teachRoot.click({target:teachButton});
equal(started.type,'startTeachingSession','teaching starts a measured session through its callback');
equal(started.machineId,'trencher','teaching uses the matching machine');
teachControls();

equal(JSON.stringify(town, (_key,value) => typeof value === 'bigint' ? `${value}n` : value),before,'all panels leave town state unchanged');
console.log(`TOWN-PANELS: ${checks} checks passed.`);
