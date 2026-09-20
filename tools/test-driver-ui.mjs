import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {CARS} from '../src/config.js';
import {DRIVERS,getDriverState,getEquippedDriverId,applyDriverModifiers} from '../src/drivers.js';
import {createProfile,CAR_PRICES,isCarUnlocked,upgradedCar,getUpgradeLevels,completionCarProgress} from '../src/progression.js';
import {driverMenuMarkup,driverPanel,driverSkillLabel} from '../src/driver-ui.js';
import {speedKph} from '../src/speed-format.js';

let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const credits=value=>Math.floor(value||0).toLocaleString();
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const tags=html=>[...html.matchAll(/<button\b[^>]*>/g)].map(match=>match[0]);
const defaultProfile=createProfile(),markup=driverMenuMarkup();
check(markup.includes('for="driver-select"')&&markup.includes('id="driver-select"')&&markup.includes('aria-label="Choose an unlocked driver"'),'native menu select has a connected accessible label');
check(markup.includes('id="driver-skill-note"'),'the active car skill has a visible description');
const initial=driverPanel(defaultProfile,'falcone_f42');
same((initial.match(/<article\b/g)||[]).length,Object.keys(DRIVERS).length,'garage lists all six specialists and the neutral driver');
check(initial.startsWith('<details')&&!/^<details[^>]*\bopen\b/.test(initial),'garage roster starts collapsed to keep the existing upgrade panel compact');
for(const driver of Object.values(DRIVERS)){
  const button=tags(initial).find(tag=>tag.includes(`="${driver.id}"`));
  check(button?.includes('type="button"')&&button.includes('aria-label='),'each driver action has an explicit accessible button');
  check(button.includes('disabled'),'a zero-credit career cannot buy a locked driver or reselect its current one');
  check(initial.includes(driver.name)&&initial.includes(driver.description),'every skill and cost is visible before purchase');
}
check(initial.includes('Unlocking does not select a driver'),'purchase and selection are explained as distinct actions');
check(initial.includes('MATCHES THIS CAR · Falcone F42')&&!initial.includes('SKILL ACTIVE'),'a matching but locked driver never claims an active skill');
check(driverSkillLabel('club','falcone_f42').includes('no performance changes'),'neutral handling is explicit');
check(!driverSkillLabel('mara_vale','falcone_f42').includes('No skill bonus'),'matching car is active');
check(driverSkillLabel('mara_vale','stuttgart_959s').includes('No skill bonus in Stuttgart'),'off-specialty car has an explicit no-effect warning');
check(css.includes('.driver-card>button:focus-visible')&&css.includes('.driver-panel>summary:focus-visible')&&css.includes('.driver-setup select:focus-visible'),'all new interactive controls have visible focus styles');
check(css.includes('.driver-cards{grid-template-columns:repeat(2,minmax(0,1fr))}')&&css.includes('.driver-panel .driver-card>button{min-height:38px}'),'mobile roster keeps bounded columns and usable touch targets');
check(main.includes("driverMenuMarkup()")&&main.includes('${driverPanel(saved,garageCar)}'),'the tested markup is used by the production menu and garage');
check(main.includes("{signal:domEvents.signal});\nfunction openGarage")||main.includes("{signal:domEvents.signal});\r\nfunction openGarage"),'menu driver listener participates in UI disposal');

// Execute the production menu painter and driver click branches with DOM
// property stubs and the real App. There is no parallel action implementation.
const start=main.indexOf('function updateMenuCar() {'),end=main.indexOf('\nfunction updateEntryReward()',start);
const clickStart=main.indexOf('  if(button.dataset.driverUnlock)'),clickEnd=main.indexOf('  if (button.dataset.upgrade)',clickStart);
check(start>=0&&end>start&&clickStart>=0&&clickEnd>clickStart,'production menu and action boundaries are found');
const originalStorage=globalThis.localStorage,memory=new Map();
globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
try{
  const app=new App(),choices={car:'falcone_f42'},textValues={},ui={'car-select':{options:Object.keys(CARS).map(value=>({value})),value:''},'driver-select':{innerHTML:'',value:''}};
  let rewardRefreshes=0,opened=0,message='';
  const profile=()=>app.profile,text=(id,value)=>{textValues[id]=String(value);};
  const paint=new Function('profile','choices','ui','app','CARS','CAR_PRICES','DRIVERS','getDriverState','getEquippedDriverId','applyDriverModifiers','upgradedCar','getUpgradeLevels','isCarUnlocked','escapeHTML','credits','driverSkillLabel','text','updateEntryReward','completionCarProgress','speedKph',`${main.slice(start,end)};return updateMenuCar;`)(profile,choices,ui,app,CARS,CAR_PRICES,DRIVERS,getDriverState,getEquippedDriverId,applyDriverModifiers,upgradedCar,getUpgradeLevels,isCarUnlocked,escapeHTML,credits,driverSkillLabel,text,()=>rewardRefreshes++,completionCarProgress,speedKph);
  const root={querySelector:selector=>selector==='.driver-panel'?{setAttribute:(name,value)=>{same([name,value],['open',''],'post-action roster stays open');opened++;}}:null};
  const click=new Function('button','app','refreshGarage','root','DRIVERS','credits','driverSkillLabel','garageCar',main.slice(clickStart,clickEnd));
  const activate=dataset=>click({dataset},app,value=>{message=value;paint();},root,DRIVERS,credits,driverSkillLabel,choices.car);
  paint();same(ui['driver-select'].value,'club','old and new neutral profiles display Club Driver');
  same((ui['driver-select'].innerHTML.match(/<option\b/g)||[]).length,7,'menu lists every catalog driver');
  same((ui['driver-select'].innerHTML.match(/disabled/g)||[]).length,6,'locked menu choices cannot be selected');
  check(textValues['driver-skill-note'].includes('no performance changes'),'menu describes the currently applied skill');
  app.profile.credits=3000;app._saveProfile();const initialBank=app.profile.credits;
  activate({driverUnlock:'mara_vale'});same(app.profile.credits,initialBank-1200,'production unlock action charges exactly once');same(ui['driver-select'].value,'club','unlock does not silently equip a specialist');
  check(message.includes('Select this driver'),'success feedback explains the separate select action');
  check(driverPanel(app.profile,choices.car).includes('MATCHES THIS CAR · Falcone F42')&&!driverPanel(app.profile,choices.car).includes('SKILL ACTIVE'),'buying a matching driver does not claim the skill is already active');
  let ownedButton=tags(driverPanel(app.profile,choices.car)).find(tag=>tag.includes('data-driver-select="mara_vale"'));
  check(ownedButton&&!ownedButton.includes('disabled')&&ownedButton.includes('for free'),'owned card offers a free selection');
  const bank=app.profile.credits;activate({driverUnlock:'mara_vale'});same(app.profile.credits,bank,'double activation cannot double charge');check(message.includes('already unlocked'),'duplicate action gives a clear reason');
  activate({driverSelect:'mara_vale'});same(app.profile.credits,bank,'selection never charges a second time');same(ui['driver-select'].value,'mara_vale','production menu follows the selected driver');check(textValues['driver-skill-note'].includes('5%'),'active skill is described accurately');
  ownedButton=tags(driverPanel(app.profile,choices.car)).find(tag=>tag.includes('data-driver-select="mara_vale"'));
  check(ownedButton.includes('aria-pressed="true"')&&ownedButton.includes('disabled'),'selected card is identifiable and cannot be bought again');
  check(driverPanel(app.profile,choices.car).includes('SKILL ACTIVE · Falcone F42'),'only the selected matching driver reports an active skill');
  choices.car='stuttgart_959s';paint();check(textValues['driver-skill-note'].includes('No skill bonus'),'changing car recomputes the no-effect explanation');
  app.startCampaign({car:'falcone_f42',mode:'timetrial',startStage:0});activate({driverSelect:'club'});same(app.duel.state.driverId,'mara_vale','a stale action cannot change the race driver');same(app.duel.state.car,'falcone_f42','a stale action cannot repaint the active vehicle');same(app.profile.drivers.selected,'mara_vale','a stale action cannot change saved driver selection');same(app.profile.credits,bank,'a stale race action cannot spend credits');
  check(opened===3&&rewardRefreshes>=5,'only menu actions refresh labels and open the roster without duplicate handlers');
  app.returnToMenu();
}finally{if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;}
check(main.includes('getLeaderboard(app.leaderboard,{event,car:boardFilter.car,driverId:boardFilter.driverId})'),'visible leaderboard requests only the selected compatible class');
check(main.includes('data-board-filter="driverId" aria-label="Leaderboard driver skill class"'),'leaderboard has an accessible performance-class filter');
console.log(`Driver UI: ${checks} production action, menu, accessibility, mobile-style and race-guard checks passed.`);
