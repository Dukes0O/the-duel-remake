import {trophyCase, achievementsPanel} from './screen-trophies.js';
import {yetiRewards} from './yeti.js';
import {ownsArmorKit,getRoadRoofLook} from './armor-kits.js';
import {deepHints} from './deep/deep-hints.js';
import {logPage, logCardMarkup} from './deep/deep-log.js';
import {sirenaState} from './deep/sirena-car.js';
import {hiddenRoadHints} from './hidden-road-hints.js';
import {CARS, COURSE} from './config.js';
import {getUpgradeLevels, UPGRADE_TYPES, UPGRADE_COSTS, CAR_PRICES, completionCarProgress, isCarUnlocked, upgradedCar, milestoneProgress} from './progression.js';
import {getPaintState, paintPresetsFor} from './paint-presets.js';
import {driverPanel, driverSkillLabel} from './driver-ui.js';
import {getEquippedDriverId, applyDriverModifiers, DRIVERS} from './drivers.js';
import {speedKph, formatSpeed} from './speed-format.js';
import {medalRequirement} from './medals.js';
import {KOGANE_SKYLINE} from './story/story-save.js';
import {storyOn, storyView, storyGaragePanel, skylinePlaque, storyLeadLine} from './story/story-ui.js';
import {shownCars, medalProgressLabel, medalSheetPanel, medalUnlockCard, medalChip, MEDAL_REWARD_NOTE} from './earned-cars-ui.js';
import {tuneRows, tunePanel, stepIn, resetTuneIn} from './lab/tune-view.js'; // LAB-TUNE-VIEW

export function createGarageScreen({app, profile, credits, escapeHTML, getGarageCar, getGarageMessage, arrow, action, clamp}) {
// STORY-KOGANE-SCREENS: the Kogane Invitation's plain story object, or null with the switch off or no story to show.
const storyViewNow = () => storyOn(app) ? storyView(app.storyProps?.()) : null;
function paintPanel(saved,carKey){
  const options={muddyHollowEnabled:true,yetiEnabled:app._switches?.().enabled('yeti')===true,labEnabled:app._switches?.().enabled('lab')===true,deepEnabled:app._switches?.().enabled('the-deep')===true};
  const state=getPaintState(saved,carKey,options),unlocked=isCarUnlocked(saved,carKey);
  return `<section class="paint-panel" aria-label="Paint finishes"><div class="paint-heading"><h3>PAINT FINISH</h3><span>Appearance only · per car</span></div><div class="paint-options">${paintPresetsFor(saved,carKey,options).map(preset=>{const owned=state.owned.includes(preset.id),selected=state.selected===preset.id,color=preset.appearance?.color??CARS[carKey].color,disabled=!unlocked||selected||(!owned&&saved.credits<preset.price);return `<button class="paint-choice ${selected?'selected':''} ${preset.id}" data-paint="${preset.id}" ${disabled?'disabled':''} aria-pressed="${selected}" aria-label="${selected?`${preset.name} applied`:owned?`Apply ${preset.name} for free`:`Buy and apply ${preset.name} for ${preset.price} credits`}"><i aria-hidden="true" style="--paint-color:#${color.toString(16).padStart(6,'0')}"></i><span><b>${preset.name}</b><small>${preset.finish}</small></span><strong>${!unlocked?'LOCKED':selected?'APPLIED':owned?'APPLY':`BUY & APPLY · ${credits(preset.price)} CR`}</strong></button>`;}).join('')}</div></section>`;
}
function roofPanel(saved,car){
  if(app._switches?.().enabled('yeti')!==true||!isCarUnlocked(saved,car))return '';
  const selected=getRoadRoofLook(saved,car,{yetiEnabled:true}),choices=[{id:'none',name:'Stock',earned:true},
    {id:'yeti',name:'Yeti',earned:yetiRewards(saved).roof},{id:'chrome-crown',name:'Chrome Crown',earned:ownsArmorKit(saved,car,'chrome-crown')}];
  return `<section class="paint-panel"><h3>ROOF LOOK</h3><p>Appearance only. One item per car.</p>${choices.filter(row=>row.earned).map(row=>`<button data-roof-look="${row.id}" ${selected===(row.id==='none'?null:row.id)?'disabled':''}>${row.name}</button>`).join('')}</section>`;
}
function diveKitPanel(saved) {
  const hints = deepHints(app.getDeepDiscovery?.());
  if (!hints.kitAvailable) return '';
  return `<section class="paint-panel" aria-label="Dive kit"><h3>DIVE KIT</h3><p>One kit fits every car. Explore below the old boat ramp.</p><button class="secondary-button" data-deep-kit="buy" ${hints.kitOwned || saved.credits < hints.kitCost ? 'disabled' : ''}>${hints.kitOwned ? 'INSTALLED · ALL CARS' : `BUY DIVE KIT · ${credits(hints.kitCost)} CR`}</button></section>`;
}
// The sea-life log (THE_DEEP 6.4): one row per coast already found, picture cards
// with the true facts, grey shapes for the creatures still to find, and the pearls.
function seaLifeLogPanel(saved) {
  const snapshot = app.getDeepDiscovery?.();
  if (snapshot?.enabled !== true || (snapshot.kit !== true && !(snapshot.found?.length > 0))) return '';
  // The turtle and the crab are on two pages; the summary counts each creature once.
  const page = logPage(saved), creatures = new Map(page.rows.flatMap(row => row.creatures.map(item => [item.id, item.found])));
  const logged = [...creatures.values()].filter(Boolean).length, total = creatures.size;
  const rows = page.rows.map(row => `<section class="deep-log-row${row.complete ? ' complete' : ''}" data-coast="${row.coast}"><div class="deep-log-heading"><h4>${escapeHTML(row.name)}</h4><span>${row.creatures.filter(item => item.found).length} / ${row.creatures.length} LOGGED${row.complete ? ' · PAGE COMPLETE' : ''} · PEARLS ${row.pearls} / ${row.pearlTotal}</span></div><div class="deep-log-cards">${row.creatures.map(item => logCardMarkup(item, {found: item.found, escape: escapeHTML})).join('')}</div></section>`).join('');
  return `<details class="milestone-panel deep-log-panel"><summary><span>SEA-LIFE LOG</span><b>${page.rows.length ? `${logged} / ${total} LOGGED · ` : ''}PEARLS ${page.pearls} / ${page.pearlTotal}</b></summary>${rows || '<p>Nothing logged yet. Under water, drive up slow and close to a creature and the log does the rest.</p>'}${storyLeadLine(storyViewNow())}</details>`;
}
// DEEP-SIRENA-VIEW: the Falcone Sirena's place in the garage once she is raised: under a
// sheet until the Lab restores her, then her Coast Cup, then the plaque.
const SIRENA_SHEET = '<svg class="sirena-sheet" viewBox="0 0 240 90" aria-hidden="true"><path d="M18 74 C30 40 70 30 104 28 C140 25 182 30 214 48 C224 56 228 66 226 74 Z" fill="#d9d2c3"/><path d="M40 72 C60 52 92 44 120 44 M150 46 C176 50 198 60 210 72" stroke="#b4ab99" stroke-width="2" fill="none"/><path d="M30 74 L36 80 L60 76 L92 82 L130 76 L168 82 L204 76 L224 80 L226 74 Z" fill="#c7bfae"/><rect x="58" y="76" width="22" height="6" fill="#7d1418"/><rect x="170" y="76" width="22" height="6" fill="#7d1418"/></svg>';
function sirenaPanel(saved) {
  if (app.getDeepDiscovery?.()?.enabled !== true) return '';
  const state = sirenaState(saved);
  if (state === 'wreck') return '';
  const body = state === 'waiting'
    ? `${SIRENA_SHEET}<p><b>Under a sheet.</b> Needs the Lab: salt has got into the metal.</p>`
    : state === 'restored' ? `<p><b>${app._switches?.().enabled('lab')===true?'She runs again.':'Restored.'}</b> Race the Coast Cup at Pacific Canyon, any race, in the Sirena.</p>`
    : '<p class="sirena-plaque">COAST CUP · 1966 to 2026: finished<br><small>Raised from the Kelp Coast · for Rosa Reyes</small></p>';
  return `<section class="paint-panel sirena-garage" data-sirena="${state}" aria-label="Falcone Sirena"><h3>FALCONE SIRENA · 1966</h3>${body}</section>`;
}
function milestonePanel(saved){
  const rows=milestoneProgress(saved),earned=rows.filter(row=>row.earned).length;
  return `<details class="milestone-panel"><summary><span>DRIVING MILESTONES</span><b>${earned} / ${rows.length} EARNED</b></summary><p>One-time rewards for ${escapeHTML(app.player.name)}. Complete both laps to qualify.</p><ul>${rows.map(row=>`<li class="${row.earned?'earned':''}"><div><b>${row.name}</b><span>${row.description}</span></div><strong aria-label="${row.earned?'Earned':`${row.reward} credits`}">${row.earned?'✓ EARNED':`+${credits(row.reward)} CR`}</strong>${row.total>1?`<progress value="${row.progress}" max="${row.total}" aria-label="Campaign circuits won: ${row.progress} of ${row.total}"></progress><small>${row.progress} / ${row.total} CIRCUITS</small>`:''}</li>`).join('')}</ul></details>`;
}
// LAB-TUNE-VIEW: the Tune page for the car on show (docs/LAB.md 5.1); nothing with the Lab or tuning switch off.
function tuneSection(saved,carKey){
  const rows=tuneRows(saved,carKey,app._switches?.());
  return tunePanel({rows,carName:CARS[carKey].name});
}
function garageScreen() {
  app.showDeepGarageHints?.();
  const garageCar=getGarageCar(),garageMessage=getGarageMessage();
  const saved = profile(), owned = isCarUnlocked(saved, garageCar), car = CARS[garageCar];
  // Earned cars (docs/EARNED_CARS.md): hidden everywhere while the switch is off.
  // STORY-KOGANE-SCREENS: the Skyline is a prize; it is listed only once won, as the Sirena is.
  const storyCarsOn = storyOn(app);
  const earnedOn = app._switches?.().enabled('earned-cars') === true, listed = shownCars(earnedOn, storyCarsOn);
  if(storyCarsOn && Object.hasOwn(CARS, KOGANE_SKYLINE) && isCarUnlocked(saved, KOGANE_SKYLINE)) listed.push([KOGANE_SKYLINE, CARS[KOGANE_SKYLINE]]);
  // LAB-FAN-VIEW: the secret car has no locked garage row.
  if(app._switches?.().enabled('lab')===true && isCarUnlocked(saved,'mcmurtry_speirling')) listed.push(['mcmurtry_speirling',CARS.mcmurtry_speirling]);
  if(app._switches?.().enabled('lab')===true && app._switches?.().enabled('the-deep')===true && isCarUnlocked(saved,'falcone_sirena')) listed.push(['falcone_sirena',CARS.falcone_sirena]);
  const muddyHollowTip=garageCar==='titan_monster'?
    app.getMuddyHollowProgress?.().garageTip:null;
  const levels = getUpgradeLevels(saved, garageCar), tuned = applyDriverModifiers(upgradedCar(car, levels),getEquippedDriverId(saved),garageCar);
  const price = CAR_PRICES[garageCar] || 0, completion=completionCarProgress(saved,garageCar);
  const maximumAcceleration=Math.max(...listed.map(([,item])=>item.accel*1.12)),maximumBraking=Math.max(...listed.map(([,item])=>item.braking*1.54));
  const capabilities=[['ACCELERATION',tuned.accel/maximumAcceleration],['ROAD GRIP',tuned.grip/1.2],['OFFROAD PACE',(tuned.offRoadSpeed??68)/125,formatSpeed(tuned.offRoadSpeed??68)],['BRAKING',tuned.braking/maximumBraking]];
  const capabilityStats=`<div class="car-capabilities" aria-label="Car capabilities">${capabilities.map(([label,value,display])=>`<div><span>${label}</span><b>${display||`${(clamp(value)*10).toFixed(1)}<small> / 10</small>`}</b><i aria-hidden="true"><em style="width:${clamp(value)*100}%"></em></i></div>`).join('')}</div><p class="capability-note">Ratings use the same scale for every car. ${owned?'Your installed upgrades and selected driver skills are included.':'Compare this car before unlocking it.'} Offroad pace is its loose-surface target.</p>`;

  const pitch={falcone_heritage:['HERITAGE EDITION','The earlier Falcone returns.','The previous F42 body with the same five-speed handling. A separate unlock alongside the redesigned starter.'],aurora_gt:['CARBON GT','Precision at speed.','Carbon aero, gold wheels and balanced grip.'],dusthawk_rally:['RALLY BUILT','Take the rough line.','Rally tires and dirt grip. Recommended for Ridge Rally and Timberline Checkpoint Rush.'],banshee_muscle:['BIG MUSCLE','Make every straight count.','Muscle for Midnight Chase and the Neon Drift Trial.'],viper_proto:['TRACK PROTOTYPE','Chase the lap record.','Light weight, sharp braking and fast aero.'],titan_monster:['MONSTER CLASS','Master the arena.','Giant tires and crushing weight. Recommended for the arena and stunt trial.'],koenigsegg_jesko:['GARAGE COMPLETION REWARD','The fastest car in the game.','Exceptional power, brakes and road grip, with stronger nitro and a larger tank. Arrives fully tuned in all seven systems.']}[garageCar]||['YOUR CAR','Make it yours.','Tune seven systems to suit the way you drive.'];
  // Claude, 28 October 2026: how a locked earned car or the Jesko is earned sits right under its ratings, not below Paint and Drivers.
  const earnedCard=owned?'':medalRequirement(garageCar)?medalUnlockCard(saved,garageCar,{helicopter:app._switches?.().enabled('helicopter')===true}):completion.total?`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p><p>${completion.requirementLabel} Both starter cars and Falcone Heritage count; this reward does not count toward itself.</p></div><div class="unlock-price"><b>${completion.maxed} / ${completion.total}</b><span>CARS FULLY TUNED</span><progress value="${completion.maxed}" max="${completion.total}" aria-label="Fully tuned cars: ${completion.maxed} of ${completion.total}"></progress><p>Unlocks automatically when the last upgrade is complete. No credit purchase.</p></div></div>`:'';
  const cards = Object.entries(UPGRADE_TYPES).map(([type, upgrade], index) => {
    const level = levels[type], cost = UPGRADE_COSTS[level], full = level === 3;
    return `<article class="upgrade-card"><div class="upgrade-title"><span class="upgrade-number">0${index+1}</span><h3>${upgrade.name}</h3><b>${level} / 3</b></div><p>${upgrade.description}</p><div class="upgrade-levels" aria-label="Level ${level} of 3">${Array.from({length:3},(_,i)=>`<i class="${i<level?'installed':''}"></i>`).join('')}</div><button data-upgrade="${type}" ${full||saved.credits<cost?'disabled':''} aria-label="${full?`${upgrade.name} fully upgraded`:`Upgrade ${upgrade.name} to level ${level+1} for ${cost} credits`}"><span>${full?'FULLY TUNED':`LEVEL ${level+1}`}</span><b>${full?'✓':`${credits(cost)} CR`}</b></button></article>`;
  }).join('');
  return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="garage-title"><header class="shop-heading"><div><p class="eyebrow"><i></i> THE GARAGE</p><h2 id="garage-title">MAKE IT YOURS.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(saved.credits)}<small> CR</small></b></div>${app.labAvailable?.()===true?'<button type="button" class="lab-tab" data-action="lab-open">THE LAB <span>→</span></button>':''}<button class="shop-close" data-action="garage-close" aria-label="Close garage">×</button></header>${hiddenRoadHints(app.getHiddenRoadDiscovery?.()).garageTip?`<p id="hidden-road-tip" class="garage-message">${escapeHTML(hiddenRoadHints(app.getHiddenRoadDiscovery()).garageTip)}</p>`:''}${muddyHollowTip?`<p id="muddy-hollow-tip" class="garage-message">${escapeHTML(muddyHollowTip)}</p>`:''}<nav class="shop-cars" aria-label="Garage cars">${listed.map(([key,item])=>`<button data-garage-car="${key}" class="${key===garageCar?'on':''}" aria-pressed="${key===garageCar}"><i style="--car-color:#${item.color.toString(16).padStart(6,'0')}"></i><span>${item.name}</span><small>${isCarUnlocked(saved,key)?Object.values(getUpgradeLevels(saved,key)).every(level=>level===3)?'MAXED':'OWNED':item.unlockRequirement?(medalProgressLabel(saved,key)??`MAX OTHER CARS ${completionCarProgress(saved,key).maxed}/${completionCarProgress(saved,key).total}`):`${credits(CAR_PRICES[key])} CR`}</small></button>`).join('')}</nav><div class="shop-summary"><div><span class="field-label">${owned?'YOUR BUILD':'UNLOCK THE NEXT LEVEL'}</span><h3>${car.name}</h3>${earnedOn&&owned?medalChip(saved):''}</div><div><b>${speedKph(tuned.topSpeed)}</b><span>TOP SPEED / km/h</span></div><div><b>${tuned.gears.length}</b><span>GEARS</span></div></div>${capabilityStats}${earnedCard}${owned?tuneSection(saved,garageCar):''}${earnedOn&&owned?medalSheetPanel(saved,garageCar,{grandPrixCareer:app._switches?.().enabled('grand-prix-career')===true}):''}${deepHints(app.getDeepDiscovery?.()).garageTip ? `<p id="deep-tip" class="garage-message">${escapeHTML(deepHints(app.getDeepDiscovery()).garageTip)}</p>` : ''}${diveKitPanel(saved)}${sirenaPanel(saved)}${storyGaragePanel(storyViewNow())}${skylinePlaque(saved, {car: garageCar, on: storyCarsOn && owned})}${seaLifeLogPanel(saved)}${paintPanel(saved,garageCar)}${roofPanel(saved,garageCar)}${driverPanel(saved,garageCar)}${owned?`${car.factoryMaxed?`<p class="capability-note">${medalRequirement(garageCar)?MEDAL_REWARD_NOTE:garageCar==='mcmurtry_speirling'?'BUILT IN THE LAB · Arrives fully tuned. No further upgrades are needed.':'GARAGE COMPLETION REWARD · All seven systems are fully tuned. No further upgrades are needed.'}</p>`:''}<div class="upgrade-grid">${cards}</div>`:earnedCard?'':`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p></div><div class="unlock-price"><b>${credits(price)}<small> CR</small></b><button class="start-button" data-action="unlock-car" ${saved.credits<price?'disabled':''}><span>UNLOCK CAR</span>${arrow}</button><p>${saved.credits<price?`Earn ${credits(price-saved.credits)} more credits to unlock.`:'Ready for your garage.'}</p></div></div>`}${trophyCase(saved,{enabled:app.cupsAvailable?.()===true})}${achievementsPanel(saved,{enabled:app._switches?.().enabled('the-deep')===true,labEnabled:app._switches?.().enabled('lab')===true})}${milestonePanel(saved)}<p class="garage-message" role="status" aria-live="polite">${escapeHTML(garageMessage)||'Win races for credits. Improve a car best for a bonus. Upgrades apply next race.'}</p><footer class="shop-footer"><p>${app.profileSaved===false?'Progress is saved for this session only.':'Progress saves in this browser.'}</p>${owned?COURSE.map((event,index)=>event.requiredCar===garageCar?`<button class="secondary-button challenge-entry" data-challenge="${index}">ENTER ${event.name.toUpperCase()}</button>`:'').join(''):''}${owned?action('DRIVE THIS CAR','garage-select',true):action('BACK TO THE ROAD','garage-close')}</footer></section>`;
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
  if (button.dataset.deepKit) {
    const result = app.purchaseDeepKit();
    refreshGarage(result.ok ? 'Dive kit installed for every car.' : result.reason);
    return true;
  }
  if (!button.dataset.upgrade) return false;
  const result=app.purchaseUpgrade(garageCar,button.dataset.upgrade);
  refreshGarage(result.ok?`${UPGRADE_TYPES[button.dataset.upgrade].name} upgraded to level ${getUpgradeLevels(profile(),garageCar)[button.dataset.upgrade]}.${result.earnedCars?.length?` ${result.earnedCars.map(key=>CARS[key].name).join(', ')} unlocked! All seven upgrades are already maxed. Select it in the garage. Axel Storm is also unlocked for free; select him under Specialist Drivers.`:''}`:result.reason);
  return true;
}

// LAB-TUNE-VIEW: a step button or Reset on the Tune page. The save goes through the Lab's own commit; a refused step says why.
export function handleTuneAction(button, {app, garageCar, refreshGarage, root}) {
  const reset = button.hasAttribute('data-tune-reset');
  if (!reset && !button.dataset.tune) return false;
  if (app.duel.state.status !== 'menu') return true;
  if (!reset && button.getAttribute('aria-pressed') === 'true') return true;   // the step already set
  let message;
  if (reset) {
    const result = app.labCommit((p, f) => resetTuneIn(p, garageCar, f));
    message = result.ok ? 'Every setting is back to 0.' : result.reason;
  } else {
    const [setting, text] = button.dataset.tune.split(':'), step = text?.trim() ? Number(text) : NaN;
    const result = app.labCommit((p, f) => stepIn(p, garageCar, setting, step, f));
    message = result.ok ? '' : result.reason;
  }
  refreshGarage('');
  const panel = root.querySelector('.tune-panel');
  panel?.setAttribute('open', '');
  const out = panel?.querySelector('.tune-message');
  if (out) out.textContent = message;
  root.querySelector(`[data-tune="${button.dataset.tune}"]`)?.focus({preventScroll: true});
  if (reset) root.querySelector('.tune-panel summary')?.focus({preventScroll: true});
  return true;
}
