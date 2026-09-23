import {normalizeWeapons, WEAPON_UPGRADE_COSTS} from './weapon-upgrades.js';
import {WEAPONS} from './combat.js';

export function createArmoryScreen({profile, credits, escapeHTML, getGarageMessage, action}) {
function weaponUpgradePanel(saved){
 const weapons=normalizeWeapons(saved.weapons),details={ufo:'Adds four metres to your one safe forward jump per lap.',bomb:'More bombs, wider blasts and stronger knockback.',crossbow:'Faster arrows, stronger knockback and quicker reloads.',star:'Faster recharge. Invincibility always lasts five seconds.'};
 return `<details class="weapon-shop" open><summary>WEAPON UPGRADES · MAD MAX DUEL</summary><p>All four base weapons are included. Upgrades apply to every car next race.</p><div class="upgrade-grid">${Object.entries(WEAPONS).map(([id,w])=>{const level=weapons.levels[id],cost=WEAPON_UPGRADE_COSTS[level];return `<article class="upgrade-card"><h3>${w.name}</h3><b>LEVEL ${level} / 3</b><p>${details[id]}</p><button data-weapon-upgrade="${id}" ${level===3||saved.credits<cost?'disabled':''}>${level===3?'MAXED':`UPGRADE · ${cost} CR`}</button></article>`;}).join('')}</div></details>`;
}
function armoryScreen(){
 const garageMessage=getGarageMessage();
 return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="armory-title"><header class="shop-heading"><div><p class="eyebrow">THE ARMORY</p><h2 id="armory-title">UPGRADE YOUR WEAPONS.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(profile().credits)} CR</b></div><button class="shop-close" data-action="armory-close" aria-label="Close armory">×</button></header>${weaponUpgradePanel(profile())}<p class="garage-message" role="status">${escapeHTML(garageMessage)||'Collect glowing road power-ups in Mad Max Duel to recharge a weapon instantly.'}</p><footer class="shop-footer">${action('BACK TO THE ROAD','armory-close')}</footer></section>`;
}
  return armoryScreen;
}
