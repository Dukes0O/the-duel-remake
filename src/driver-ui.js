import {CARS} from './config.js';
import {DRIVERS,getDriverState,getDriverModifiers,normalizeDriverId} from './drivers.js';

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const credits=value=>Math.floor(value||0).toLocaleString();
export function driverSkillLabel(driverId,carKey){
  const driver=DRIVERS[normalizeDriverId(driverId)];
  if(driver.id==='club')return 'Original handling · no performance changes';
  return Object.keys(getDriverModifiers(driver.id,carKey)).length?driver.description:`No skill bonus in ${CARS[carKey]?.name||'this car'}. ${driver.description}`;
}
export function driverMenuMarkup(){
  return '<div class="driver-setup"><label for="driver-select"><span>DRIVER</span><select id="driver-select" aria-label="Choose an unlocked driver"></select></label><p id="driver-skill-note"></p></div>';
}
export function driverPanel(profile,carKey){
  const state=getDriverState(profile);
  return `<details class="driver-panel"><summary><span>SPECIALIST DRIVERS</span><b>${escapeHTML(DRIVERS[state.selected].name)} · ${state.unlocked.length} / ${Object.keys(DRIVERS).length}</b></summary><p>One selected driver per player. Skills apply only to matching cars, from the next race. Unlocking does not select a driver. Enhanced records have their own performance class.</p><div class="driver-cards">${Object.values(DRIVERS).map(driver=>{
    const owned=state.unlocked.includes(driver.id),selected=state.selected===driver.id,active=Object.keys(getDriverModifiers(driver.id,carKey)).length>0;
    const rewardLocked=!owned&&!!driver.unlockCar;
    const disabled=selected||rewardLocked||(!owned&&(profile?.credits||0)<driver.price);
    const action=owned?'select':'unlock',label=selected?'SELECTED':owned?'SELECT DRIVER':rewardLocked?'UNLOCK THE KOENIGSEGG':`UNLOCK · ${credits(driver.price)} CR`;
    return `<article class="driver-card ${selected?'selected':''}"><h3>${escapeHTML(driver.name)}</h3><b>${escapeHTML(driver.title)}</b><p>${escapeHTML(driver.description)}</p>${driver.unlockCar?`<p>Free when you unlock ${escapeHTML(CARS[driver.unlockCar].name)}. No driver purchase needed.</p>`:''}<small>${driver.id==='club'?'ORIGINAL PERFORMANCE':active?`${selected?'SKILL ACTIVE':'MATCHES THIS CAR'} · ${escapeHTML(CARS[carKey]?.name)}`:'NO SKILL BONUS IN THIS CAR'}</small><button type="button" data-driver-${action}="${driver.id}" aria-pressed="${selected}" aria-label="${escapeHTML(selected?`${driver.name} selected`:owned?`Select ${driver.name} for free`:rewardLocked?`Unlock ${CARS[driver.unlockCar].name} to earn ${driver.name} for free`:`Unlock ${driver.name} for ${driver.price} credits`)}" ${disabled?'disabled':''}>${label}</button></article>`;
  }).join('')}</div></details>`;
}
