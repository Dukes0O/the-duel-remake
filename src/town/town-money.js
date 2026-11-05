import {BUILDINGS} from './content/registry.js';
import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';

const GRANT = 1_500n;
const INTEREST_BASIS_POINTS = 100n;
const ACCOUNT_NAMES = Object.freeze(['cash','grant-income','opening-equity','rent-income','shop-income','ticket-income','scrap-in','scrap-out','levy-income','wages-expense','upkeep-expense','interest-expense','loan-payable']);
const RENT_BY_TIER = Object.freeze({tent:6,canvas:6,shack:10,tin:14,container:16,brick:20});
export const TOWN_MONEY_PRICES = Object.freeze({ticket:Object.freeze({Cheap:2,Fair:5,Dear:10}),shop:Object.freeze({Cheap:2,Fair:5,Dear:10})});
const PRICE_TIERS = new Set(['Cheap','Fair','Dear']);

function asAmount(value) {
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  return null;
}
function periodKey(year,month) { return `${year}-${String(month).padStart(2,'0')}`; }
function ensureMoney(town) {
  if (!town.money || town.money.version !== 1) {
    const previousTill=asAmount(town.till);
    const balances = Object.fromEntries(ACCOUNT_NAMES.map(name=>[name,{debit:0n,credit:0n}]));
    town.money={version:1,balances,entries:[],months:{},years:{},emptyMonths:0,notice:'',loans:0n};
    town.till=0n;
    if(previousTill===null) post(town,'cash','grant-income',GRANT,'founding-grant');
    else if(previousTill) post(town,'cash','opening-equity',previousTill,'opening-balance');
  } else if (typeof town.till !== 'bigint') {
    town.till=BigInt(Number.isSafeInteger(town.till)&&town.till>=0?town.till:0);
  }
  return town.money;
}
function post(town,debit,credit,amount,kind,period) {
  const money=town.money, value=asAmount(amount);
  if (value === null || value === 0n) return;
  for (const name of [debit,credit]) if (!money.balances[name]) money.balances[name]={debit:0n,credit:0n};
  money.balances[debit].debit+=value;
  money.balances[credit].credit+=value;
  if(debit==='cash') town.till+=value;
  if(credit==='cash') town.till-=value;
  if(debit==='loan-payable') money.loans-=value;
  if(credit==='loan-payable') money.loans+=value;
  const calendar=period||town.calendar||{year:1,month:1};
  const key=periodKey(calendar.year,calendar.month), year=String(calendar.year);
  money.entries.push({debit,credit,amount:value,kind,year:calendar.year,month:calendar.month});
  for(const bucket of [money.months[key]||(money.months[key]={income:0n,expense:0n}),money.years[year]||(money.years[year]={income:0n,expense:0n})]) {
    if(debit==='cash'&&credit.endsWith('income')) bucket.income+=value;
    if(debit.endsWith('expense')) bucket.expense+=value;
  }
}

function transferTownMoney(town,command,{profile}={}) {
  const money=ensureMoney(town),amount=asAmount(command.amount);
  if(amount===null||amount===0n) return {ok:false,message:'Choose a whole amount of scrap above zero.'};
  const wallet=asAmount(profile?.wasteland?.scrap);
  if(!profile?.wasteland||wallet===null) return {ok:false,message:'Your Wasteland scrap wallet is not ready.'};
  if(command.type==='tillIn') {
    if(wallet<amount) return {ok:false,message:'You do not have that much scrap to put in.'};
    profile.wasteland.scrap=Number(wallet-amount);
    post(town,'cash','scrap-in',amount,'player-deposit');
    return {ok:true,message:`You put ${amount} scrap in the town till.`};
  }
  if(town.till<amount) return {ok:false,message:'The town till does not have that much scrap.'};
  const returned=amount/2n,levy=amount-returned;
  if(wallet+returned>BigInt(Number.MAX_SAFE_INTEGER)) return {ok:false,message:'Your scrap wallet cannot hold that much.'};
  profile.wasteland.scrap=Number(wallet+returned);
  post(town,'scrap-out','cash',amount,'player-withdrawal');
  post(town,'cash','levy-income',levy,'withdrawal-levy');
  return {ok:true,message:`Hollis gives you ${returned} scrap. The town keeps ${levy} scrap.`};
}
registerTownCommand('tillIn',transferTownMoney);
registerTownCommand('tillOut',transferTownMoney);
function setBuildingPrice(town,command,field,label) {
  const building=town.buildings.find(item=>item.id===command.id);
  if(!building||building.state!=='finished') return {ok:false,message:'Finish that building before setting its price.'};
  if(!PRICE_TIERS.has(command.price)) return {ok:false,message:'Choose Cheap, Fair or Dear.'};
  building[field]=command.price;
  return {ok:true,message:`The ${label} price is ${command.price}.`};
}
registerTownCommand('setTicketPrice',(town,command)=>setBuildingPrice(town,command,'ticketPrice','ticket'));
registerTownCommand('setShopPrice',(town,command)=>setBuildingPrice(town,command,'shopPrice','shop'));

function personRent(person) {
  if (Number.isSafeInteger(person.rentMonthly)&&person.rentMonthly>=0) return person.rentMonthly;
  return RENT_BY_TIER[person.homeTier]||0;
}
function finishedBuildings(town) { return town.buildings.filter(building=>building.state==='finished'); }
function amountOf(value) { return asAmount(value)||0n; }
function monthlyDemand(town) {
  const catalog=new Map(BUILDINGS.map(row=>[row.id,row]));
  const buildings=finishedBuildings(town);
  let upkeep=0n,wages=0n;
  for(const building of buildings) {
    const row=catalog.get(building.buildingId)||{};
    upkeep+=amountOf(building.upkeepMonthly??row.upkeepMonthly);
    wages+=amountOf(building.staff??row.staff)*8n*12n;
  }
  return {buildings,upkeep,wages};
}
function monthlyIncome(town,buildings) {
  const rent=town.people.reduce((sum,person)=>sum+BigInt(personRent(person)),0n);
  let shops=0n,tickets=0n;
  for(const building of buildings) {
    if(building.operational===false) continue;
    const customers=amountOf(building.monthlyCustomers);
    const visits=amountOf(building.monthlyVisitors);
    const shopTier=building.shopPrice||building.priceTier||'Fair';
    const ticketTier=building.ticketPrice||building.priceTier||'Fair';
    const shopPrice=TOWN_MONEY_PRICES.shop[shopTier]||0;
    const ticketPrice=TOWN_MONEY_PRICES.ticket[ticketTier]||0;
    shops+=customers*BigInt(shopPrice);
    tickets+=visits*BigInt(ticketPrice);
  }
  return {rent,shops,tickets};
}
function bookIncome(town,kind,amount) { post(town,'cash',kind,amount,kind); }
function settleMonth(town,calendar) {
  const money=ensureMoney(town),{buildings,upkeep,wages}=monthlyDemand(town),income=monthlyIncome(town,buildings);
  money.months[periodKey(calendar.year,calendar.month)]={income:0n,expense:0n};
  money.years[String(calendar.year)] ||= {income:0n,expense:0n};
  bookIncome(town,'rent-income',income.rent);
  bookIncome(town,'shop-income',income.shops);
  bookIncome(town,'ticket-income',income.tickets);
  const demand=upkeep+wages;
  const interest=(money.loans*INTEREST_BASIS_POINTS+9_999n)/10_000n;
  if(interest) post(town,'interest-expense','loan-payable',interest,'monthly-interest',calendar);
  if(town.till<demand) money.emptyMonths++; else money.emptyMonths=0;
  if(money.emptyMonths>=3 && town.till<demand) {
    const loan=demand-town.till;
    post(town,'cash','loan-payable',loan,'hollis-seasonal-loan',calendar);
    money.notice=`Hollis lent the town ${loan} scrap to keep it going.`;
  }
  let available=town.till,upkeepPaid=0n,wagesPaid=0n;
  for(const building of buildings) {
    const row=BUILDINGS.find(item=>item.id===building.buildingId)||{};
    const buildingUpkeep=amountOf(building.upkeepMonthly??row.upkeepMonthly);
    const buildingWages=amountOf(building.staff??row.staff)*96n;
    const costs=buildingUpkeep+buildingWages;
    if(available>=costs) { available-=costs;upkeepPaid+=buildingUpkeep;wagesPaid+=buildingWages;building.operational=true;delete building.whyNot; }
    else { building.operational=false;building.whyNot='The town cannot pay this building’s monthly bill.'; }
  }
  // Unpaid costs stay on the buildings, which remain stopped until a later
  // month can pay their bills.
  if(wagesPaid) post(town,'wages-expense','cash',wagesPaid,'monthly-wages',calendar);
  if(upkeepPaid) post(town,'upkeep-expense','cash',upkeepPaid,'monthly-upkeep',calendar);
  if(money.loans>0n&&town.till>0n) {
    const surplus=town.till>demand?town.till-demand:0n;
    const repayment=money.loans<surplus?money.loans:surplus;
    if(repayment) post(town,'loan-payable','cash',repayment,'loan-repayment',calendar);
  }
}
registerTownSystem('town-money',80,1,({town,tick,calendar})=>{
  ensureMoney(town);
  if(tick>0n&&calendar.day===1&&calendar.hour===0) settleMonth(town,calendar);
});

export function townLedger(town) {
  const money=ensureMoney(town),owned=town.buildings.filter(building=>building.state==='finished').map(({id,buildingId})=>({id,buildingId}));
  const debit=Object.values(money.balances).reduce((sum,balance)=>sum+balance.debit,0n);
  const credit=Object.values(money.balances).reduce((sum,balance)=>sum+balance.credit,0n);
  return {till:town.till,loans:money.loans,ownedBuildings:owned,netScrap:town.till-money.loans,
    months:money.months,years:money.years,entries:money.entries,balances:money.balances,balanced:debit===credit,notice:money.notice};
}
