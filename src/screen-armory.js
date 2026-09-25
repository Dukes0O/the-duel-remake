import {getProfileWeapons, WEAPON_UPGRADE_COSTS, WASTELAND_UPGRADE_COSTS} from './weapon-upgrades.js';
import {WEAPONS} from './combat.js';
import {CARS} from './config.js';
import {ARMOR_KITS, getEquippedArmorKit} from './armor-kits.js';
import {isCarUnlocked} from './progression.js';
import {availableCarWeapons,getCarLoadout,CAR_SLOT_DIRECTIONS,
  CAR_SLOT_PAD} from './car-loadout.js';
import {crewPanel} from './crew-ui.js';
import {territoryPanel} from './screen-territory.js';

export function createArmoryScreen({profile, credits, escapeHTML, getGarageMessage,
  getArmoryCar = () => 'falcone_f42', kitsEnabled = () => false,
  loadoutsEnabled = () => false, crewEnabled = () => false, action}) {
function weaponUpgradePanel(saved,wastelandEnabled=false){
 const weapons=getProfileWeapons(saved),details={ufo:'Adds four metres to your one safe forward jump per lap.',bomb:'More bombs, wider blasts and stronger knockback.',crossbow:'Faster arrows, stronger knockback and quicker reloads.',star:'Faster recharge. Invincibility always lasts five seconds.'};
 const scrapCareer=wastelandEnabled&&saved.wasteland?.discoveredGate===true;
 const costs=scrapCareer?WASTELAND_UPGRADE_COSTS:WEAPON_UPGRADE_COSTS;
 const balance=scrapCareer?saved.wasteland.scrap:saved.credits;
 return `<details class="weapon-shop" open><summary>WEAPON UPGRADES · MAD MAX DUEL</summary><p>All four base weapons are included. Upgrades apply to every car next race.</p><div class="upgrade-grid">${Object.entries(WEAPONS).map(([id,w])=>{const level=weapons.levels[id],cost=costs[level];return `<article class="upgrade-card"><h3>${w.name}</h3><b>LEVEL ${level} / 3</b><p>${details[id]}</p><button data-weapon-upgrade="${id}" ${level===3||balance<cost?'disabled':''}>${level===3?'MAXED':`UPGRADE · ${cost} ${scrapCareer?'SCRAP':'CR'}`}</button></article>`;}).join('')}</div></details>`;
}
function loadoutPanel(saved){
 const loadout=getCarLoadout(saved),available=availableCarWeapons(saved);
 return `<section class="armory-loadout" aria-labelledby="car-loadout-title"><div><p class="eyebrow">CAR WEAPONS</p><h3 id="car-loadout-title">YOUR FOUR SLOTS</h3><p>Choose a weapon for each key. Choosing one that is already equipped swaps its slot.</p></div><div class="armory-loadout-grid">${loadout.map((selected,slot)=>`<label class="armory-slot"><span>SLOT ${slot+1} · KEY ${slot+1} · D-PAD ${CAR_SLOT_DIRECTIONS[slot]}</span><select data-loadout-slot="${slot}" aria-label="Car weapon slot ${slot+1}, key ${slot+1}, D-pad ${CAR_SLOT_PAD[slot]}">${available.map(id=>`<option value="${id}" ${id===selected?'selected':''}>${escapeHTML(WEAPONS[id].name)}</option>`).join('')}</select></label>`).join('')}</div></section>`;
}
function armorKitPanel(saved){
 const requested=getArmoryCar(),car=Object.hasOwn(CARS,requested)?requested:'falcone_f42';
 const unlocked=isCarUnlocked(saved,car),installed=saved.wasteland?.kits?.[car]||{owned:[],equipped:null};
 const equipped=getEquippedArmorKit(saved,car),rank=saved.wasteland?.rank||1;
 const defeated=saved.wasteland?.warlords?.defeated?.length>0;
 return `<details class="weapon-shop kit-shop" open><summary>ARMOR KITS · PER CAR</summary><p>Choose a car, then buy or equip its plating. Only the equipped kit adds armor in Mad Max Duel.</p><label class="kit-car-label" for="kit-car">CAR</label><select id="kit-car" data-kit-car>${Object.entries(CARS).map(([id,item])=>`<option value="${id}" ${id===car?'selected':''}>${escapeHTML(item.name)}${isCarUnlocked(saved,id)?'':' · LOCKED'}</option>`).join('')}</select><p class="kit-equipped">${escapeHTML(CARS[car].name)} · ${equipped?`${ARMOR_KITS[equipped].name.toUpperCase()} EQUIPPED (+${ARMOR_KITS[equipped].armor} ARMOR)`:'STOCK ARMOR'}</p><div class="kit-grid">${Object.entries(ARMOR_KITS).map(([id,kit])=>{
   const owned=installed.owned?.includes(id),selected=equipped===id;
   const gate=id==='warlord'&&!defeated?'Defeat a warlord to unlock':rank<kit.rank?`Notoriety rank ${kit.rank} required`:null;
   const scrapCareer=saved.wasteland?.discoveredGate===true;
   const balance=scrapCareer?saved.wasteland.scrap:saved.credits;
   const disabled=!unlocked||(!owned&&(!!gate||balance<kit.price));
   const label=selected?'EQUIPPED':owned?'EQUIP':gate||`BUY & EQUIP · ${scrapCareer?kit.price:credits(kit.price)} ${scrapCareer?'SCRAP':'CR'}`;
   return `<article class="kit-card"><h3>${kit.name}</h3><b>+${kit.armor} ARMOR</b><p>${id==='scrapper'?'Scrap plates and bull bar':id==='raider'?'Roof cage and saw housings':'Full plating and spike crown'}</p><button data-kit-action="${owned?'equip':'buy'}" data-kit-tier="${id}" ${selected||disabled?'disabled':''}>${label}</button></article>`;
 }).join('')}</div>${equipped?'<button class="kit-remove" data-kit-action="unequip">REMOVE KIT · RETURN TO STOCK</button>':''}</details>`;
}
function armoryScreen(){
 const garageMessage=getGarageMessage();
 const scrapCareer=kitsEnabled()&&profile().wasteland?.discoveredGate===true;
 return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="armory-title"><header class="shop-heading"><div><p class="eyebrow">THE ARMORY</p><h2 id="armory-title">UPGRADE YOUR WEAPONS${kitsEnabled()?' & ARMOR':''}.</h2></div><div class="shop-wallet"><span>${scrapCareer?'YOUR SCRAP':'YOUR CREDITS'}</span><b>${scrapCareer?profile().wasteland.scrap:credits(profile().credits)} ${scrapCareer?'SCRAP':'CR'}</b></div><button class="shop-close" data-action="armory-close" aria-label="Close armory">×</button></header>${scrapCareer?territoryPanel(profile()):''}${crewEnabled()?crewPanel(profile(),escapeHTML):''}${loadoutsEnabled()?loadoutPanel(profile()):''}${weaponUpgradePanel(profile(),kitsEnabled())}${kitsEnabled()?armorKitPanel(profile()):''}<p class="garage-message" role="status">${escapeHTML(garageMessage)||'Collect glowing road power-ups in Mad Max Duel to recharge a weapon instantly.'}</p><footer class="shop-footer">${action('BACK TO THE ROAD','armory-close')}</footer></section>`;
}
  armoryScreen.yardContent = () =>
    `${loadoutsEnabled()?loadoutPanel(profile()):''}`+
    `${weaponUpgradePanel(profile(),kitsEnabled())}`+
    `${kitsEnabled()?armorKitPanel(profile()):''}`;
  return armoryScreen;
}
