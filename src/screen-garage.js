import {hiddenRoadHints} from './hidden-road-hints.js';
import {CARS, COURSE} from './config.js';
import {getUpgradeLevels, UPGRADE_TYPES, UPGRADE_COSTS, CAR_PRICES, completionCarProgress, isCarUnlocked, upgradedCar, milestoneProgress} from './progression.js';
import {PAINT_PRESETS, getPaintState} from './paint-presets.js';
import {driverPanel, driverSkillLabel} from './driver-ui.js';
import {getEquippedDriverId, applyDriverModifiers, DRIVERS} from './drivers.js';
import {speedKph, formatSpeed} from './speed-format.js';

export function createGarageScreen({app, profile, credits, escapeHTML, getGarageCar, getGarageMessage, arrow, action, clamp}) {
function paintPanel(saved,carKey){
  const state=getPaintState(saved,carKey),unlocked=isCarUnlocked(saved,carKey);
  return `<section class="paint-panel" aria-label="Paint finishes"><div class="paint-heading"><h3>PAINT FINISH</h3><span>Appearance only · per car</span></div><div class="paint-options">${Object.values(PAINT_PRESETS).map(preset=>{const owned=state.owned.includes(preset.id),selected=state.selected===preset.id,color=preset.appearance?.color??CARS[carKey].color,disabled=!unlocked||selected||(!owned&&saved.credits<preset.price);return `<button class="paint-choice ${selected?'selected':''} ${preset.id}" data-paint="${preset.id}" ${disabled?'disabled':''} aria-pressed="${selected}" aria-label="${selected?`${preset.name} applied`:owned?`Apply ${preset.name} for free`:`Buy and apply ${preset.name} for ${preset.price} credits`}"><i aria-hidden="true" style="--paint-color:#${color.toString(16).padStart(6,'0')}"></i><span><b>${preset.name}</b><small>${preset.finish}</small></span><strong>${!unlocked?'LOCKED':selected?'APPLIED':owned?'APPLY':`BUY & APPLY · ${credits(preset.price)} CR`}</strong></button>`;}).join('')}</div></section>`;
}
function milestonePanel(saved){
  const rows=milestoneProgress(saved),earned=rows.filter(row=>row.earned).length;
  return `<details class="milestone-panel"><summary><span>DRIVING MILESTONES</span><b>${earned} / ${rows.length} EARNED</b></summary><p>One-time rewards for ${escapeHTML(app.player.name)}. Complete both laps to qualify.</p><ul>${rows.map(row=>`<li class="${row.earned?'earned':''}"><div><b>${row.name}</b><span>${row.description}</span></div><strong aria-label="${row.earned?'Earned':`${row.reward} credits`}">${row.earned?'✓ EARNED':`+${credits(row.reward)} CR`}</strong>${row.total>1?`<progress value="${row.progress}" max="${row.total}" aria-label="Campaign circuits won: ${row.progress} of ${row.total}"></progress><small>${row.progress} / ${row.total} CIRCUITS</small>`:''}</li>`).join('')}</ul></details>`;
}
function garageScreen() {
  const garageCar=getGarageCar(),garageMessage=getGarageMessage();
  const saved = profile(), owned = isCarUnlocked(saved, garageCar), car = CARS[garageCar];
  const levels = getUpgradeLevels(saved, garageCar), tuned = applyDriverModifiers(upgradedCar(car, levels),getEquippedDriverId(saved),garageCar);
  const price = CAR_PRICES[garageCar] || 0, completion=completionCarProgress(saved,garageCar);
  const maximumAcceleration=Math.max(...Object.values(CARS).map(item=>item.accel*1.12)),maximumBraking=Math.max(...Object.values(CARS).map(item=>item.braking*1.54));
  const capabilities=[['ACCELERATION',tuned.accel/maximumAcceleration],['ROAD GRIP',tuned.grip/1.2],['OFFROAD PACE',(tuned.offRoadSpeed??68)/125,formatSpeed(tuned.offRoadSpeed??68)],['BRAKING',tuned.braking/maximumBraking]];
  const capabilityStats=`<div class="car-capabilities" aria-label="Car capabilities">${capabilities.map(([label,value,display])=>`<div><span>${label}</span><b>${display||`${(clamp(value)*10).toFixed(1)}<small> / 10</small>`}</b><i aria-hidden="true"><em style="width:${clamp(value)*100}%"></em></i></div>`).join('')}</div><p class="capability-note">Ratings use the same scale for every car. ${owned?'Your installed upgrades and selected driver skills are included.':'Compare this car before unlocking it.'} Offroad pace is its loose-surface target.</p>`;

  const pitch={falcone_heritage:['HERITAGE EDITION','The earlier Falcone returns.','The previous F42 body with the same five-speed handling. A separate unlock alongside the redesigned starter.'],aurora_gt:['CARBON GT','Precision at speed.','Carbon aero, gold wheels and balanced grip.'],dusthawk_rally:['RALLY BUILT','Take the rough line.','Rally tires and dirt grip. Recommended for Ridge Rally and Timberline Checkpoint Rush.'],banshee_muscle:['BIG MUSCLE','Make every straight count.','Muscle for Midnight Chase and the Neon Drift Trial.'],viper_proto:['TRACK PROTOTYPE','Chase the lap record.','Light weight, sharp braking and fast aero.'],titan_monster:['MONSTER CLASS','Master the arena.','Giant tires and crushing weight. Recommended for the arena and stunt trial.'],koenigsegg_jesko:['GARAGE COMPLETION REWARD','The fastest car in the game.','Exceptional power, brakes and road grip, with stronger nitro and a larger tank. Arrives fully tuned in all seven systems.']}[garageCar]||['YOUR CAR','Make it yours.','Tune seven systems to suit the way you drive.'];
  const cards = Object.entries(UPGRADE_TYPES).map(([type, upgrade], index) => {
    const level = levels[type], cost = UPGRADE_COSTS[level], full = level === 3;
    return `<article class="upgrade-card"><div class="upgrade-title"><span class="upgrade-number">0${index+1}</span><h3>${upgrade.name}</h3><b>${level} / 3</b></div><p>${upgrade.description}</p><div class="upgrade-levels" aria-label="Level ${level} of 3">${Array.from({length:3},(_,i)=>`<i class="${i<level?'installed':''}"></i>`).join('')}</div><button data-upgrade="${type}" ${full||saved.credits<cost?'disabled':''} aria-label="${full?`${upgrade.name} fully upgraded`:`Upgrade ${upgrade.name} to level ${level+1} for ${cost} credits`}"><span>${full?'FULLY TUNED':`LEVEL ${level+1}`}</span><b>${full?'✓':`${credits(cost)} CR`}</b></button></article>`;
  }).join('');
  return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="garage-title"><header class="shop-heading"><div><p class="eyebrow"><i></i> THE GARAGE</p><h2 id="garage-title">MAKE IT YOURS.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(saved.credits)}<small> CR</small></b></div><button class="shop-close" data-action="garage-close" aria-label="Close garage">×</button></header>${hiddenRoadHints(app.getHiddenRoadDiscovery?.()).garageTip?`<p id="hidden-road-tip" class="garage-message">${escapeHTML(hiddenRoadHints(app.getHiddenRoadDiscovery()).garageTip)}</p>`:''}<nav class="shop-cars" aria-label="Garage cars">${Object.entries(CARS).map(([key,item])=>`<button data-garage-car="${key}" class="${key===garageCar?'on':''}" aria-pressed="${key===garageCar}"><i style="--car-color:#${item.color.toString(16).padStart(6,'0')}"></i><span>${item.name}</span><small>${isCarUnlocked(saved,key)?Object.values(getUpgradeLevels(saved,key)).every(level=>level===3)?'MAXED':'OWNED':item.unlockRequirement?`MAX OTHER CARS ${completionCarProgress(saved,key).maxed}/${completionCarProgress(saved,key).total}`:`${credits(CAR_PRICES[key])} CR`}</small></button>`).join('')}</nav><div class="shop-summary"><div><span class="field-label">${owned?'YOUR BUILD':'UNLOCK THE NEXT LEVEL'}</span><h3>${car.name}</h3></div><div><b>${speedKph(tuned.topSpeed)}</b><span>TOP SPEED / km/h</span></div><div><b>${tuned.gears.length}</b><span>GEARS</span></div></div>${capabilityStats}${paintPanel(saved,garageCar)}${driverPanel(saved,garageCar)}${owned?`${car.factoryMaxed?'<p class="capability-note">GARAGE COMPLETION REWARD · All seven systems are fully tuned. No further upgrades are needed.</p>':''}<div class="upgrade-grid">${cards}</div>`:completion.total?`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p><p>${completion.requirementLabel} Both starter cars and Falcone Heritage count; this reward does not count toward itself.</p></div><div class="unlock-price"><b>${completion.maxed} / ${completion.total}</b><span>CARS FULLY TUNED</span><progress value="${completion.maxed}" max="${completion.total}" aria-label="Fully tuned cars: ${completion.maxed} of ${completion.total}"></progress><p>Unlocks automatically when the last upgrade is complete. No credit purchase.</p></div></div>`:`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p></div><div class="unlock-price"><b>${credits(price)}<small> CR</small></b><button class="start-button" data-action="unlock-car" ${saved.credits<price?'disabled':''}><span>UNLOCK CAR</span>${arrow}</button><p>${saved.credits<price?`Earn ${credits(price-saved.credits)} more credits to unlock.`:'Ready for your garage.'}</p></div></div>`}${milestonePanel(saved)}<p class="garage-message" role="status" aria-live="polite">${escapeHTML(garageMessage)||'Win races for credits. Improve a car best for a bonus. Upgrades apply next race.'}</p><footer class="shop-footer"><p>${app.profileSaved===false?'Progress is saved for this session only.':'Progress saves in this browser.'}</p>${owned?COURSE.map((event,index)=>event.requiredCar===garageCar?`<button class="secondary-button challenge-entry" data-challenge="${index}">ENTER ${event.name.toUpperCase()}</button>`:'').join(''):''}${owned?action('DRIVE THIS CAR','garage-select',true):action('BACK TO THE ROAD','garage-close')}</footer></section>`;
}
  return garageScreen;
}

export function handleDriverAction(button, {app, refreshGarage, root, garageCar, credits}) {
  if (button.dataset.driverUnlock) {
    if (app.duel.state.status !== 'menu') return true;
    const id=button.dataset.driverUnlock,result=app.purchaseDriver(id);
    refreshGarage(result.ok?`${DRIVERS[id].name} unlocked for ${credits(result.cost)} credits. Select this driver to use their skill.`:result.reason);
    root.querySelector('.driver-panel')?.setAttribute('open','');
    return true;
  }
  if (button.dataset.driverSelect) {
    if (app.duel.state.status !== 'menu') return true;
    const id=button.dataset.driverSelect,result=app.selectDriver(id);
    refreshGarage(result.ok?`${DRIVERS[id].name} selected. ${driverSkillLabel(id,garageCar)}`:result.reason);
    root.querySelector('.driver-panel')?.setAttribute('open','');
    return true;
  }
  return false;
}

export function handleGarageUpgrade(button, {app, garageCar, refreshGarage, profile, credits}) {
  if (!button.dataset.upgrade) return false;
  const result=app.purchaseUpgrade(garageCar,button.dataset.upgrade);
  refreshGarage(result.ok?`${UPGRADE_TYPES[button.dataset.upgrade].name} upgraded to level ${getUpgradeLevels(profile(),garageCar)[button.dataset.upgrade]}.${result.earnedCars?.length?` ${result.earnedCars.map(key=>CARS[key].name).join(', ')} unlocked! All seven upgrades are already maxed. Select it in the garage. Axel Storm is also unlocked for free; select him under Specialist Drivers.`:''}`:result.reason);
  return true;
}
