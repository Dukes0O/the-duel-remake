import {normalizeWeapons,WEAPON_UPGRADE_COSTS} from './weapon-upgrades.js';
import {WEAPONS,supportsCombat} from './combat.js';
import './style.css';
import { App } from './app.js';
import { LIGHTING_MOODS } from './lighting-moods.js';
import { CARS, DIFFICULTY, COURSE, DRIVE, CPU_DIFFICULTY } from './config.js';
import { createProfile, getUpgradeLevels, isCarUnlocked, upgradedCar, UPGRADE_COSTS, UPGRADE_TYPES, CAR_PRICES, CPU_REWARDS, bestKey, eventKey, milestoneProgress, completionCarProgress } from './progression.js';
import {getLeaderboard} from './leaderboard.js';
import {RouteMap} from './route-map.js';
import {CoursePreview} from './course-preview.js';
import {PAINT_PRESETS,getPaintState} from './paint-presets.js';
import {ROUTE_VARIANTS,getRouteVariantForSeed,supportsRouteVariants} from './route-variants.js';
import {syncRaceChoiceButtons} from './race-settings-ui.js';
import {createJumpHeightReadout} from './jump-height.js';
import {BUILD_VERSION} from './build-version.js';
import {createBuildUpdateChecker} from './build-update.js';
import {DRIVERS,getDriverState,getEquippedDriverId,normalizeDriverId,applyDriverModifiers} from './drivers.js';
import {driverMenuMarkup,driverSkillLabel,driverPanel} from './driver-ui.js';
import {COURSE_PRICES,isCourseUnlocked} from './course-access.js';
import {courseAccessPanel} from './course-access-ui.js';
import {speedKph,formatSpeed} from './speed-format.js';
import {featureFlags} from './feature-flags.js';
import {experimentalPanel} from './experimental-ui.js';
import {backupBeforeMigration,createCareerExport,importCareer,parseCareerExport} from './career-backup.js';

const root = document.querySelector('#app');
function downloadCareer(){
  const content=createCareerExport();
  const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='the-duel-career-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
await backupBeforeMigration().catch(error=>{
  root.innerHTML='<section class="backup-blocked" role="alert"><p class="eyebrow">CAREER BACKUP REQUIRED</p><h1>YOUR CAREER IS SAFE.</h1><p id="backup-error"></p><button type="button" id="backup-export">EXPORT YOUR CURRENT SAVE</button></section>';
  root.querySelector('#backup-error').textContent='The game could not verify an automatic backup before updating this save. '+error.message+' Free browser storage or enable IndexedDB, then reload.';
  root.querySelector('#backup-export').addEventListener('click',event=>{
    try{downloadCareer();}catch(exportError){event.target.insertAdjacentText('afterend',' Export failed: '+exportError.message);}
  });
  throw error;
});
export const app = new App();
const jumpHeightReadout = createJumpHeightReadout();
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
const sound = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const choices = app.getRaceChoices();
let rendererPromise,rendererHandle,uiDisposed=false,lastScreen, garageOpen = false, armoryOpen = false, garageCar = choices.car, garageMessage = '', playersOpen=false,playerMessage='',backupMessage='',leaderboardOpen=false,experimentalOpen=false,experimentalStorageMessage='';
let lastEventResult=null;
let coursesOpen=false,courseMessage='';
const domEvents=new AbortController();
const boardFilter={stage:choices.startStage,car:'',driverId:getEquippedDriverId(app.profile)};
const profile = () => app.profile || createProfile();
const credits = value => Math.floor(value || 0).toLocaleString();
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

root.innerHTML = `<div id="stage" class="in-menu"><div id="view3d" aria-label="Three-dimensional driving scene"></div><div class="film-grain"></div><div id="overlay">
  <header class="masthead"><a class="wordmark" href="#" data-action="menu" aria-label="The Duel main menu"><span class="brand-slashes">///</span> THE DUEL <span class="edition">REDLINE</span></a><div class="utility-controls"><span id="menu-location" class="location-label"><i></i> MOJAVE COUNTY, USA</span><button id="garage-open" class="garage-wallet" data-action="garage"><span>GARAGE</span><b id="menu-credits">0 CR</b></button><button id="armory-open" class="garage-wallet" data-action="armory">ARMORY</button><button id="sound-toggle" class="icon-button" data-action="sound" aria-label="Mute sound" title="Sound · M">${sound}<span id="sound-caption">SOUND ON</span></button><button id="camera-toggle" class="icon-button race-only" data-action="camera" aria-label="Change camera" title="Cycle cameras · C front / B back / V right / X left / D reset" hidden><svg viewBox="0 0 24 24" fill="none"><path d="m8 6 2-3h4l2 3h5v14H3V6h5Z"/><circle cx="12" cy="12" r="4"/></svg></button><button id="pause-button" class="icon-button race-only" data-action="pause" aria-label="Pause race" title="Pause · Esc" hidden><svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14M16 5v14"/></svg></button></div></header>
  <main id="menu-screen" class="menu-screen">
    <div class="menu-intro"><p class="eyebrow"><i></i> YOUR GARAGE. YOUR NAME. YOUR RACE.</p><h1>THE<span>DUEL</span><em>REDLINE</em></h1><p class="menu-description">Two laps. New horizons.<br>Build your way to the arena.</p></div>
    <section class="race-setup" aria-label="Race setup"><div class="player-controls"><label class="field-label" for="player-select">PLAYER</label><select id="player-select" aria-label="Choose local player"></select><button data-action="new-player" class="small-action">+ NEW</button><button data-action="leaderboard" class="small-action">SCORES ↗</button></div><div class="setup-line scene-line"><label class="field-label" for="scene-select">CIRCUIT</label><select id="scene-select" aria-label="Choose a scene">${COURSE.map((scene,index)=>`<option value="${index}">${scene.name}</option>`).join('')}</select></div><div id="route-choice" class="setup-line route-choice"><span id="route-choice-label" class="field-label">ROUTE</span><div class="segmented" role="group" aria-label="Course route">${ROUTE_VARIANTS.map(route=>`<button class="choice" data-route-variant="${route.id}" aria-pressed="false">${route.label.toUpperCase()}</button>`).join('')}</div></div><div class="setup-line"><span class="field-label">THE CHALLENGE</span><div class="segmented" role="group" aria-label="Race mode"><button class="choice on" data-mode="duel" aria-pressed="true">RIVAL DUEL</button><button class="choice" data-mode="wasteland" aria-pressed="false">MAD MAX DUEL</button><button class="choice" data-mode="timetrial" aria-pressed="false">TIME TRIAL</button></div></div><div class="setup-line"><span id="cpu-target-label" class="field-label">CPU RIVAL</span><div class="segmented" role="group" aria-label="CPU difficulty">${Object.entries(CPU_DIFFICULTY).map(([key,item])=>`<button class="choice ${choices.cpuDifficulty===key?'on':''}" data-cpu-difficulty="${key}" aria-pressed="${choices.cpuDifficulty===key}">${item.name.toUpperCase()}</button>`).join('')}</div></div><div class="setup-line"><span class="field-label">TRANSMISSION</span><div class="segmented" role="group" aria-label="Difficulty">${Object.entries(DIFFICULTY).map(([key,d]) => `<button class="choice ${choices.difficulty === key ? 'on' : ''}" data-difficulty="${key}" aria-pressed="${choices.difficulty === key}">${d.autoShift ? 'ARCADE / AUTO' : 'PRO / MANUAL'}</button>`).join('')}</div></div><p class="entry-reward" id="entry-reward"></p><p id="event-brief" class="event-brief" hidden></p><label id="ghost-control" class="ghost-control" hidden><input id="ghost-toggle" type="checkbox"><span>BEST GHOST <b id="ghost-record-label"></b></span></label><p id="ghost-hint" class="ghost-hint" hidden>Finish a Time Trial personal best to record your ghost.</p><button id="start-engine" disabled class="start-button" data-action="start"><span>START ENGINE</span>${arrow}</button><p class="start-note">2 LAPS <span>·</span> ${Object.values(CARS).filter(car=>car.price>0||car.unlockRequirement).length} EARNABLE CARS <span>·</span> LOCAL PLAYER PROGRESS</p></section>
    <section class="garage" aria-label="Choose your car"><div class="garage-heading"><span class="field-label">CHOOSE YOUR WEAPON</span><label class="graphics-control"><span>GRAPHICS</span><select id="graphics-quality" aria-label="Graphics quality"><option value="high">High</option><option value="performance">Performance</option></select></label><span id="garage-count">01 / ${String(Object.keys(CARS).length).padStart(2,'0')}</span></div><label class="car-picker"><span class="visually-hidden">Choose your car</span><select id="car-select" aria-label="Choose your car">${Object.entries(CARS).map(([key,c])=>`<option value="${key}">${c.name}</option>`).join('')}</select><span class="car-picker-arrow" aria-hidden="true">⌄</span></label><div class="car-specs"><div><b id="car-speed"></b><span>TOP SPEED / km/h</span></div><div><b id="car-gears"></b><span>GEARS</span></div><div><b id="car-character"></b><span>DRIVING CHARACTER</span></div></div><label class="lighting-control"><span>LIGHTING</span><select id="lighting-mood" aria-label="Outdoor lighting">${Object.entries(LIGHTING_MOODS).map(([id,mood])=>`<option value="${id}">${mood.label}</option>`).join('')}<option value="night" disabled hidden>Night event</option></select></label><div class="course-preview" aria-label="Selected course preview"><canvas id="menu-course-map" width="320" height="200" role="img" aria-label="Selected course outline"></canvas><div class="course-preview-details"><div class="course-preview-top"><span id="menu-route-label">ROUTE A</span><span id="scene-length"></span></div><b id="scene-name">${COURSE[0].name}</b><div id="menu-biome-legend" class="menu-biome-legend"></div><div class="course-preview-bottom"><span id="menu-shortcuts"></span><span id="menu-elevation" class="menu-elevation"><canvas id="menu-elevation-profile" width="180" height="28" aria-hidden="true"></canvas><span id="menu-relief"></span></span></div></div></div><button class="garage-tune" data-action="garage">TUNE YOUR CAR <span>→</span></button></section>
    <aside id="build-update" class="build-update" aria-label="Game update" hidden><div><p id="build-update-message" role="status" aria-live="polite" aria-atomic="true"></p><span id="build-update-help">Reload at the menu. Your saved progress and settings stay here.</span></div><button type="button" data-action="reload-update" aria-describedby="build-update-help">RELOAD</button></aside>
    <footer class="menu-footer"><span class="footer-label">BUILT FOR THE DRIVE</span><div class="controls-strip"><span title="Hold S / Down / LT at rest to reverse. W / Up / RT brakes reverse and returns to first gear."><kbd>ARROWS</kbd> DRIVE / REVERSE</span><span><kbd>SPACE</kbd> BOOST</span><span><kbd>C / B / V / X</kbd> FRONT / BACK / RIGHT / LEFT</span><span><kbd>D</kbd> RESET CAMERA</span><span><kbd>Q / E</kbd> MANUAL SHIFT</span><span><kbd>ESC</kbd> PAUSE</span></div><div class="build-meta"><span id="build-version" class="build-version" title="Build ${escapeHTML(BUILD_VERSION.id)}">BUILD ${escapeHTML(BUILD_VERSION.label)}</span><a class="build-label audio-credits" href="/assets/audio/credits.html" target="_blank" rel="noopener">ASSET CREDITS ↗</a></div></footer>
  </main>
  <section id="race-hud" class="hud" aria-label="Race information" hidden><div class="race-progress"><i id="progress-fill"></i></div><div class="race-heading"><p class="eyebrow" id="stage-label"></p><h2 id="stage-name"></h2><p id="stage-objective"></p></div><div class="race-clock"><span id="race-time-label" class="field-label">RACE TIME</span><b id="race-time">00:00.00</b><span id="penalty-time"></span><div class="lap-readout"><b id="lap-number">LAP 1 / 2</b><span id="lap-time">00:00.00</span></div></div><div class="race-position"><span class="position-number"><b id="race-position">01</b><span id="position-total">/02</span></span><div><span class="field-label" id="gap-label">RIVAL BEHIND</span><b id="rival-gap">0.0 SEC</b></div></div>
  <div class="route-hud"><div class="route-hud-top"><span class="field-label">CIRCUIT / LIVE</span><b id="route-percent">0%</b></div><div class="route-section"><span id="route-section"></span><b id="route-lap">1 / 2</b></div><canvas id="route-map" width="400" height="280" role="img" aria-label="Circuit map with your heading, race actors and shortcut branches"></canvas><div class="route-legend"><span><i class="player-dot"></i> YOU</span><span id="rival-legend"><i class="rival-dot"></i> RIVAL</span><span id="police-legend" hidden><i class="police-dot"></i> PATROL</span></div><div class="route-map-footer"><span id="arena-crush" class="arena-crush" role="status" hidden>CRUSHED 0 / 6</span><span id="shortcut-legend" class="shortcut-legend" hidden>SHORTCUTS <i class="shortcut-a"></i>A <span id="shortcut-b-legend"><i class="shortcut-b"></i>B</span></span><b id="route-remaining"></b></div></div><div class="race-health"><span class="field-label">CHASSIS INTEGRITY</span><span id="lives-display"></span><b id="damage-label">0 / 5 MAJOR CRASHES</b><span id="radar-label">RADAR CLEAR</span><div id="radar-meter" class="radar-meter"><i id="radar-fill"></i></div></div>
  <div class="speedometer"><section id="jump-height-panel" class="jump-height" aria-label="Jump height above the ground" hidden><span id="jump-height-label" class="field-label">HEIGHT ABOVE GROUND</span><div class="jump-height-number"><b id="jump-height-value">0.0</b><span>m</span></div><span id="jump-height-peak" class="jump-height-peak">PEAK 0.0 m</span><span id="jump-distance" class="jump-distance">DISTANCE 0.0 m · 0.0 s</span></section><div class="speed-top"><div class="gear"><span class="field-label">GEAR</span><b id="gear-value">1</b></div><div class="speed"><b id="speed-value">000</b><span>km/h</span></div></div><div class="rpm-track"><i id="rpm-fill"></i></div><div class="rpm-labels"><span>0</span><span>RPM × 1000</span><span id="rpm-value">8</span></div><div class="boost-readout"><span class="field-label">NITRO</span><div class="boost-track"><i id="boost-fill"></i></div><kbd>SPACE</kbd></div><div class="speed-footer"><span id="camera-label">CHASE CAM</span><span><kbd>ESC</kbd> PAUSE</span></div></div><div id="style-score-panel" class="style-score"><b id="style-score">0000</b><span class="field-label">STYLE POINTS</span><span id="combo-label"></span></div><section id="drift-panel" class="drift-panel" aria-label="Drift trial score" hidden><div class="drift-score-row"><div><span>BANKED <small id="drift-target-label"></small></span><b id="drift-banked">0</b></div><div><span>LIVE CHAIN</span><b id="drift-chain">+0 <small id="drift-multiplier">×1.00</small></b></div></div><div class="drift-target-track"><i id="drift-target-fill"></i></div><p id="drift-notice" aria-live="polite">Straighten to bank your chain.</p></section>
  <section id="checkpoint-panel" class="drift-panel checkpoint-panel" aria-label="Checkpoint rush progress" hidden><div class="drift-score-row"><div><span>GATES PASSED</span><b id="checkpoint-passed">0 / 12</b></div><div><span>TIME LEFT</span><b id="checkpoint-time">00:00.00</b></div></div><div class="drift-target-track"><i id="checkpoint-target-fill"></i></div><p id="checkpoint-next">NEXT GATE 1 / 12</p><p id="checkpoint-notice" aria-live="polite">Each gate adds time.</p></section>
  <div id="countdown" class="countdown" hidden><span id="countdown-word">GET READY</span><b id="countdown-number">3</b><p>HOLD W OR ↑ TO ACCELERATE</p></div><div id="race-callout" class="race-callout" aria-live="polite" hidden><span id="callout-kicker"></span><b id="callout-text"></b></div><div id="crash-flash" class="crash-flash" hidden></div></section>
  <div id="modal-layer" class="modal-layer" hidden></div><div id="renderer-error" class="renderer-error" role="alert" hidden><strong>The road couldn't load.</strong><span>Enable browser graphics acceleration, then try again.</span><button class="text-button" data-action="retry-renderer">RETRY GRAPHICS ↗</button></div><div id="renderer-loading" class="renderer-loading"><span></span> FINDING THE OPEN ROAD</div><button id="test-driver" class="test-driver" data-action="manual" hidden>TEST DRIVER ACTIVE · TAKE CONTROL</button>
</div></div>`;

root.querySelector('.garage-tune').insertAdjacentHTML('beforebegin',driverMenuMarkup());
root.querySelector('.build-meta').insertAdjacentHTML('beforeend','<button type="button" id="experimental-open" class="build-label experimental-open" data-action="experimental" aria-label="Open Experimental features">EXPERIMENTAL</button>');
root.querySelector('.garage-tune').innerHTML='TUNE CAR & DRIVER <span>→</span>';
root.querySelector('.scene-line').insertAdjacentHTML('beforeend','<button type="button" class="course-store-button" data-action="courses" aria-label="Unlock or select courses">COURSES ↗</button>');
const weaponHud=document.createElement('section');weaponHud.className='weapon-hud';weaponHud.hidden=true;weaponHud.setAttribute('aria-label','Combat weapons');
weaponHud.innerHTML=Object.entries(WEAPONS).map(([id,w])=>`<button type="button" data-weapon="${id}" title="${w.name} · Key ${w.key}">${w.key} · ${w.name}</button>`).join('')+'<span class="weapon-status"></span>';
root.querySelector('#overlay').append(weaponHud);const weaponStatus=weaponHud.querySelector('.weapon-status');
weaponHud.addEventListener('click',e=>{const button=e.target.closest('[data-weapon]');if(button)app.duel.fireWeapon(button.dataset.weapon);});
const combatHelp=document.createElement('p');combatHelp.className='combat-help';combatHelp.textContent='MAD MAX DUEL: 1 UFO swap · 2 eight-way bombs · 3 crossbow · 4 invincible star (5s). Glowing road power-ups instantly recharge a weapon. The rival fights back. Wrecks recover; finish first.';root.querySelector('.race-setup').append(combatHelp);
root.querySelector('#cpu-target-label').parentElement.insertAdjacentHTML('afterend',`<details id="rival-customization" class="rival-customization"><summary>CUSTOMIZE YOUR RIVAL</summary><div class="setup-line"><label class="field-label" for="rival-car">CAR</label><select id="rival-car"><option value="match">Match my car (default)</option>${Object.entries(CARS).map(([key,car])=>`<option value="${key}">${car.name}</option>`).join('')}</select></div><div class="setup-line"><label class="field-label" for="rival-driver">DRIVER</label><select id="rival-driver">${Object.values(DRIVERS).map(driver=>`<option value="${driver.id}">${driver.name}</option>`).join('')}</select></div><div class="setup-line"><label class="field-label" for="rival-upgrades">UPGRADES</label><select id="rival-upgrades">${['Stock','Level 1','Level 2','Max / Level 3'].map((label,i)=>`<option value="${i}">${label}</option>`).join('')}</select></div><p id="rival-skill-note" class="event-brief"></p><p class="event-brief">CPU difficulty still controls driving skill. Rival choices do not unlock cars or drivers for you. Custom rival bests are tracked separately.</p></details>`);
root.querySelector('.boost-readout .field-label').id='nitro-label';
const ui = Object.fromEntries([...root.querySelectorAll('[id]')].map(el => [el.id, el]));
const buildUpdates=createBuildUpdateChecker({
  getStatus:()=>uiDisposed?null:app.duel.state.status,
  signal:domEvents.signal,
  onChange:({available,version})=>{
    if(uiDisposed)return;
    ui['build-update'].hidden=!available;
    ui['build-update-message'].textContent=available?`Update available · ${version.label}`:'';
  },
});
const routeMap=new RouteMap(ui['route-map']);
const coursePreview=new CoursePreview(ui['menu-course-map'],ui['menu-elevation-profile']);
if(import.meta.hot)import.meta.hot.dispose(()=>{uiDisposed=true;domEvents.abort();app.dispose();rendererHandle?.dispose();rendererHandle=null;routeMap.dispose();coursePreview.dispose();});
const text = (id,v) => { if (ui[id].textContent !== String(v)) ui[id].textContent = v; };
const clamp = v => Math.max(0,Math.min(1,Number(v)||0));
const time = seconds => { const t = Math.floor(Math.max(0, Number(seconds)||0)*100); return `${String(Math.floor(t/6000)).padStart(2,'0')}:${String(Math.floor(t/100)%60).padStart(2,'0')}.${String(t%100).padStart(2,'0')}`; };

function ensureRenderer() {
  if (!rendererPromise) {
    ui['renderer-loading'].hidden = false; ui['renderer-error'].hidden = true;
    ui['start-engine'].disabled = true;
    rendererPromise = import('./render3d.js').then(({attachRenderer}) => { if(uiDisposed)return;rendererHandle=attachRenderer(ui.view3d,app); ui.view3d.classList.add('live');syncRendererReadiness(app.duel.state); }).catch(error => {
      if(uiDisposed)return;
      rendererPromise = null; ui['renderer-error'].hidden = false; ui['start-engine'].disabled = true;
      if (['racing','countdown'].includes(app.duel.state.status) && !app.duel.state.paused) app.togglePause();
      console.error('Unable to initialize 3D graphics.',error);
    }).finally(() => { if(!uiDisposed){if(rendererHandle)syncRendererReadiness(app.duel.state);else ui['renderer-loading'].hidden = true;} });
  }
  return rendererPromise;
}
function updateMenuCar() {
  if (!isCarUnlocked(profile(), choices.car)) choices.car = 'falcone_f42';
  const car = applyDriverModifiers(upgradedCar(CARS[choices.car], getUpgradeLevels(profile(), choices.car)),getEquippedDriverId(profile()),choices.car);
  app.duel.state.car = choices.car; app.menuCar = choices.car;
  text('car-speed', speedKph(car.topSpeed)); text('car-gears', String(car.gears.length).padStart(2,'0'));
  text('car-character', car.grip >= .9 ? 'PLANTED' : 'UNTAMED');
  text('garage-count', `${String(Object.keys(CARS).indexOf(choices.car)+1).padStart(2,'0')} / ${String(Object.keys(CARS).length).padStart(2,'0')}`);
  text('menu-credits', `${credits(profile().credits)} CR`);
  for(const option of ui['car-select'].options){const key=option.value,progress=completionCarProgress(profile(),key),locked=progress.total?`MAX OTHER CARS ${progress.maxed}/${progress.total}`:`${credits(CAR_PRICES[key])} CR`;option.textContent=isCarUnlocked(profile(),key)?CARS[key].name:`${CARS[key].name} · LOCKED · ${locked}`;}
  ui['car-select'].value=choices.car;
  const drivers=getDriverState(profile());
  ui['driver-select'].innerHTML=Object.values(DRIVERS).map(driver=>`<option value="${driver.id}" ${drivers.unlocked.includes(driver.id)?'':'disabled'}>${escapeHTML(driver.name)}${drivers.unlocked.includes(driver.id)?'':driver.unlockCar?' · LOCKED · UNLOCK KOENIGSEGG':` · LOCKED · ${credits(driver.price)} CR`}</option>`).join('');
  ui['driver-select'].value=drivers.selected;text('driver-skill-note',driverSkillLabel(drivers.selected,choices.car));
  updateEntryReward();
}
function updateEntryReward(){
  const driverId=getEquippedDriverId(profile()),base=CPU_REWARDS[choices.cpuDifficulty],best=profile().personalBests[bestKey({stageIndex:choices.startStage,seed:app.getMenuSeed(choices.startStage),laps:COURSE[choices.startStage]?.laps||2,...choices,driverId})];
  const scoreBest=COURSE[choices.startStage].kind==='drift'?getLeaderboard(app.leaderboard,{event:eventKey({stageIndex:choices.startStage,seed:app.getMenuSeed(),laps:2}),car:choices.car,playerId:app.player.id,driverId})[0]?.driftScore:null;
  const manual=choices.difficulty==='pro',settings=`${choices.cpuDifficulty.toUpperCase()} / ${manual?'MANUAL':'AUTO'}`;
  text('entry-reward',`WIN ${credits(base*(manual?2:1))} CR · LOSS −${credits(base/2)} CR${manual?' · 2× POINTS & RACE CREDITS':''} · ${best?`CAR BEST ${time(best)} (${settings}) · BEAT IT +${credits(base*.2*(manual?2:1))} CR`:`${settings}: FIRST FINISH SETS YOUR CAR BEST`}${scoreBest!=null?` · SCORE BEST ${credits(scoreBest)}`:''}`);
  ui['entry-reward'].title='Car bests compare the same car, circuit, route, race mode, CPU level, transmission and active driver skills. Each improved stage best pays once. Clean wins and police escapes earn extra credits. Manual doubles race earnings; one-time milestones and loss charges stay unchanged.';
  const stage=COURSE[choices.startStage],stunt=stage?.stuntTrial,drift=stage?.driftTrial,rush=stage?.checkpointRush;
  if(stage.practice)text('entry-reward','FREE PRACTICE · NO CREDITS, RECORDS OR FINISH LINE');
  const recommendation=stage.arena&&(CARS[choices.car]?.mass||1400)<3500?'Titan recommended: lighter cars cannot crush wrecks.':stage.requiredCar?`${CARS[stage.requiredCar].name} recommended. Any unlocked car can enter.`:'';
  const objective=stage.practice?'Unlimited nitro everywhere: hold SPACE, even off-road or in the air. Turn right from the starting area for the 4 km drag strip. Orange markings show the 600 m braking area. No timer or race rewards.':rush?`Pass all ${rush.gatesPerLap*(stage.laps||2)} gates in order over 2 laps. Start with ${rush.initialTimeSec[choices.cpuDifficulty]} seconds; each gate adds ${rush.extensionSec[choices.cpuDifficulty]}. Missing a gate cannot set a record.`:drift?`Bank ${credits(drift.targets[choices.cpuDifficulty])} drift points in 2 laps / ${drift.timeLimitSec[choices.cpuDifficulty]} seconds. Slide above ${formatSpeed(45)}. Straighten to bank; impacts and dirt lose your live chain.`:stunt?`Land ${stunt.jumps} jumps, crush ${stunt.crushes} cars, and finish both laps within ${stunt.timeLimitSec[choices.cpuDifficulty]} seconds.`:stage.arena?'Finish both laps. Land jumps and crush wrecks for bonus points.':stage.kind==='chase'?`Finish both laps within ${stage.chaseTimeLimit[choices.cpuDifficulty]} seconds and evade pursuit.`:'';
  text('cpu-target-label',stage.kind==='chase'?'PURSUIT LEVEL':rush?'GATE TIMER':drift?'DRIFT TARGET':stunt||choices.mode==='timetrial'?'TIME TARGET':'CPU RIVAL');
  ui['event-brief'].hidden=!objective&&!recommendation;text('event-brief',[objective,recommendation].filter(Boolean).join(' '));
  const record=app.getGhostRecord(choices);ui['ghost-control'].hidden=!record;ui['ghost-hint'].hidden=choices.mode!=='timetrial'||!!record;ui['ghost-toggle'].checked=app.ghostEnabled;
  if(stage.practice){ui['ghost-control'].hidden=true;ui['ghost-hint'].hidden=true;}
  if(record){const build=Object.values(record.upgrades).reduce((sum,n)=>sum+n,0);text('ghost-record-label',`${time(record.timeSec)} · RECORD BUILD ${build}/21`);ui['ghost-control'].title=Object.entries(record.upgrades).map(([key,level])=>`${UPGRADE_TYPES[key]?.name||key}: ${level}`).join(' · ');}
}
function updatePlayers(){
  ui['player-select'].innerHTML=app.players.players.map(player=>`<option value="${escapeHTML(player.id)}">${escapeHTML(player.name)}</option>`).join('');ui['player-select'].value=app.player.id;
}
function updateMenuScene() {
  const savedChoices=app.setRaceSettings(choices)||app.getRaceChoices();delete choices.rival;Object.assign(choices,savedChoices);
  const stage = COURSE[choices.startStage] || COURSE[0];
  ui['rival-customization'].hidden=!stage.hasRival||!!stage.practice||choices.mode==='timetrial';
  ui['rival-car'].value=choices.rival?.car||'match';ui['rival-driver'].value=choices.rival?.driverId||'club';
  const rivalCar=choices.rival?.car&&choices.rival.car!=='match'?choices.rival.car:choices.car;
  ui['rival-upgrades'].value=CARS[rivalCar].factoryMaxed?'3':String(choices.rival?.upgradeLevel||0);
  ui['rival-upgrades'].disabled=!!CARS[rivalCar].factoryMaxed;
  text('rival-skill-note',driverSkillLabel(choices.rival?.driverId||'club',rivalCar)+(CARS[rivalCar].factoryMaxed?' This car always comes maxed.':''));
  if(stage.practice||['chase','drift','checkpoint'].includes(stage.kind)||stage.stuntTrial)choices.mode='duel';
  for(const button of root.querySelectorAll('[data-mode]')){button.disabled=(stage.practice||['chase','drift','checkpoint'].includes(stage.kind)||!!stage.stuntTrial)&&button.dataset.mode==='timetrial'||button.dataset.mode==='wasteland'&&!supportsCombat(stage);button.classList.toggle('on',button.dataset.mode===choices.mode);button.setAttribute('aria-pressed',String(button.dataset.mode===choices.mode));if(button.dataset.mode==='duel')button.textContent=stage.practice?'FREE PRACTICE':stage.checkpointRush?'CHECKPOINT RUSH':stage.driftTrial?'DRIFT TRIAL':stage.stuntTrial?'STUNT TRIAL':stage.kind==='chase'?'ESCAPE THE PURSUIT':'RIVAL DUEL';}
  for(const button of root.querySelectorAll('[data-cpu-difficulty]'))button.disabled=!!stage.practice;
  syncRaceChoiceButtons(root,choices);
  const fixedNight=stage.timeOfDay==='night'||stage.theme==='city';ui['lighting-mood'].disabled=fixedNight;ui['lighting-mood'].value=fixedNight?'night':app.lightingMood;
  app.menuStage = choices.startStage; ui['scene-select'].value = choices.startStage;ui['route-choice'].hidden=!supportsRouteVariants(stage);text('route-choice-label',app.getMenuRouteLabel()==='Custom route'?'CUSTOM ROUTE':'ROUTE');
  for(const button of root.querySelectorAll('[data-route-variant]')){const selected=getRouteVariantForSeed(app.getMenuSeed())?.id===button.dataset.routeVariant;button.classList.toggle('on',selected);button.setAttribute('aria-pressed',String(selected));}
  for(const option of ui['scene-select'].options){const item=COURSE[Number(option.value)],owned=isCourseUnlocked(profile(),item);option.disabled=!owned;option.textContent=owned?item.name:`${item.name} · LOCKED · ${credits(COURSE_PRICES[item.id])} CR`;}
  const preview=coursePreview.update(app.getMenuCourse(),app.getMenuRouteLabel());
  text('scene-name',stage.name);text('scene-length',`${preview.distanceKm.toFixed(1)} KM · ${preview.laps} LAPS`);text('menu-route-label',app.getMenuRouteLabel().toUpperCase());
  if(stage.practice)text('scene-length','UNTIMED PLAYGROUND');
  root.querySelector('.start-note').textContent=stage.practice?'FREE PRACTICE · NO RACE REWARDS':`2 LAPS · ${Object.values(CARS).filter(car=>car.price>0||car.unlockRequirement).length} EARNABLE CARS · LOCAL PLAYER PROGRESS`;
  ui['menu-biome-legend'].innerHTML=preview.biomes.map(biome=>`<span><i style="--biome-color:${biome.color}" aria-hidden="true"></i>${escapeHTML(biome.label)}</span>`).join('');
  text('menu-shortcuts',preview.map.gates.length?`${preview.map.gates.length} GATES PER LAP`:preview.map.branches.length?`${preview.map.branches.length} DASHED SHORTCUT${preview.map.branches.length===1?'':'S'}`:'CLOSED CIRCUIT');ui['menu-elevation'].hidden=!preview.showElevation;text('menu-relief',`${preview.reliefMeters} M HEIGHT RANGE`);
  if(stage.practice)text('menu-shortcuts','JUMPS · CRUSH LANES · 4 KM DRAG STRIP');
  text('menu-location', {desert:'MOJAVE COUNTY, USA',alpine:'THE HIGH ALPINE PASS',coast:'PACIFIC COAST, USA',city:'HARBOR DISTRICT · AFTER DARK'}[stage.theme] || stage.name.toUpperCase());
  updateMenuCar();
}
export function refreshRaceSetup(){
  delete choices.rival;Object.assign(choices,app.getRaceChoices());garageCar=choices.car;updatePlayers();updateMenuScene();lastScreen=null;renderState(app.duel.state);
}
ui['ghost-toggle'].addEventListener('change',event=>app.setGhostEnabled(event.target.checked));
for(const id of ['rival-car','rival-driver','rival-upgrades'])ui[id].addEventListener('change',()=>{
  choices.rival={car:ui['rival-car'].value,driverId:ui['rival-driver'].value,upgradeLevel:Number(ui['rival-upgrades'].value)};
  updateMenuScene();
},{signal:domEvents.signal});
ui['lighting-mood'].addEventListener('change',event=>{app.setLightingMood(event.target.value);ui['lighting-mood'].value=app.lightingMood;});
ui['graphics-quality'].value=app.ambientOcclusionEnabled?'high':'performance';
ui['graphics-quality'].addEventListener('change',event=>app.setGraphicsQuality(event.target.value));
ui['car-select'].addEventListener('change',event=>{const car=event.target.value;if(!isCarUnlocked(profile(),car)){ui['car-select'].value=choices.car;openGarage(car);return;}choices.car=car;updateMenuScene();});
ui['scene-select'].addEventListener('change', e => { choices.startStage = Math.max(0, Math.min(COURSE.length-1, Number(e.target.value) || 0)); updateMenuScene(); });
ui['player-select'].addEventListener('change',e=>{app.selectPlayer(e.target.value);refreshRaceSetup();});
ui['driver-select'].addEventListener('change',event=>{if(app.duel.state.status!=='menu')return;app.selectDriver(event.target.value);updateMenuCar();},{signal:domEvents.signal});
function openGarage(car = choices.car) {
  if (app.duel.state.status !== 'menu') return;
  garageCar = car; garageMessage = ''; garageOpen = true; armoryOpen=false; coursesOpen=playersOpen=leaderboardOpen=false; app.menuCar = car; lastScreen = null; renderState(app.duel.state);
}
function closeGarage() { garageOpen = false; lastScreen = null; updateMenuCar(); renderState(app.duel.state); ui['garage-open'].focus({preventScroll:true}); }
function refreshGarage(message) {
  garageMessage = message || ''; lastScreen = null; updateMenuCar(); app.menuCar = garageCar; renderState(app.duel.state);
}
root.addEventListener('click',e => {
  const button = e.target.closest('button,[data-action]'); if (!button) return;
  if(button.dataset.courseUnlock){
    if(app.duel.state.status!=='menu')return;
    const result=app.purchaseCourse(button.dataset.courseUnlock);courseMessage=result.ok?'Course unlocked. Select it when you are ready.':result.reason;
    updateMenuScene();lastScreen=null;renderState(app.duel.state);return;
  }
  if(button.dataset.courseSelect){
    if(app.selectCourse(button.dataset.courseSelect)){Object.assign(choices,app.getRaceChoices());coursesOpen=false;updateMenuScene();lastScreen=null;renderState(app.duel.state);}return;
  }
  if(button.dataset.routeVariant){if(app.setRouteVariant(button.dataset.routeVariant))updateMenuScene();return;}
  if(button.dataset.challenge!=null){const stageIndex=Number(button.dataset.challenge);if(!isCourseUnlocked(profile(),stageIndex)){garageOpen=false;coursesOpen=true;courseMessage='Unlock the recommended course here, then select it.';lastScreen=null;renderState(app.duel.state);return;}choices.startStage=stageIndex;updateMenuScene();closeGarage();return;}
  if (button.dataset.garageCar) { garageCar = button.dataset.garageCar; app.menuCar = garageCar; garageMessage = ''; lastScreen = null; renderState(app.duel.state); return; }
  if(button.dataset.paint){const result=app.purchasePaint(garageCar,button.dataset.paint);refreshGarage(result.ok?`${PAINT_PRESETS[button.dataset.paint].name} applied to ${CARS[garageCar].name}.${result.purchased?` Purchased for ${credits(result.cost)} credits.`:''}`:result.reason);return;}
  if(button.dataset.driverUnlock){if(app.duel.state.status!=='menu')return;const id=button.dataset.driverUnlock,result=app.purchaseDriver(id);refreshGarage(result.ok?`${DRIVERS[id].name} unlocked for ${credits(result.cost)} credits. Select this driver to use their skill.`:result.reason);root.querySelector('.driver-panel')?.setAttribute('open','');return;}
  if(button.dataset.driverSelect){if(app.duel.state.status!=='menu')return;const id=button.dataset.driverSelect,result=app.selectDriver(id);refreshGarage(result.ok?`${DRIVERS[id].name} selected. ${driverSkillLabel(id,garageCar)}`:result.reason);root.querySelector('.driver-panel')?.setAttribute('open','');return;}
  if (button.dataset.upgrade) { const result = app.purchaseUpgrade(garageCar, button.dataset.upgrade); refreshGarage(result.ok ? `${UPGRADE_TYPES[button.dataset.upgrade].name} upgraded to level ${getUpgradeLevels(profile(), garageCar)[button.dataset.upgrade]}.${result.earnedCars?.length?` ${result.earnedCars.map(key=>CARS[key].name).join(', ')} unlocked! All seven upgrades are already maxed. Select it in the garage. Axel Storm is also unlocked for free; select him under Specialist Drivers.`:''}` : result.reason); return; }
  if (button.dataset.car && !isCarUnlocked(profile(), button.dataset.car)) { openGarage(button.dataset.car); return; }
  for (const key of ['car','difficulty','mode','cpuDifficulty']) if (button.dataset[key]) { choices[key] = button.dataset[key];updateMenuScene();return; }
  if(button.dataset.weaponUpgrade){const result=app.purchaseWeapon(button.dataset.weaponUpgrade);refreshGarage(result.ok?'Weapon upgraded.':result.reason);return;}
  if(button.closest('form')&&button.type==='submit')return;
  e.preventDefault();
  switch (button.dataset.action) {
    case 'start': armoryOpen = coursesOpen = garageOpen = playersOpen = leaderboardOpen = experimentalOpen = false; app.startCampaign(choices); break;
    case 'courses':if(app.duel.state.status!=='menu')return;coursesOpen=true;garageOpen=playersOpen=leaderboardOpen=false;courseMessage='';lastScreen=null;break;
    case 'courses-close':coursesOpen=false;lastScreen=null;break;
    case 'unlock-next':app.returnToMenu();Object.assign(choices,app.getRaceChoices());updateMenuScene();coursesOpen=true;garageOpen=playersOpen=leaderboardOpen=false;courseMessage='Completed race credits are safe. Unlock the next course, then select it.';lastScreen=null;break;
    case 'new-player':playersOpen=true;coursesOpen=leaderboardOpen=garageOpen=false;playerMessage=backupMessage='';lastScreen=null;renderState(app.duel.state);root.querySelector('#new-player-name')?.focus();return;
    case 'player-close':playersOpen=false;lastScreen=null;break;
    case 'career-export':
      if(app.duel.state.status!=='menu'||!playersOpen)return;
      try{downloadCareer();backupMessage='Career file downloaded. Keep it somewhere safe.';}catch(error){backupMessage='Export failed: '+error.message;}
      lastScreen=null;renderState(app.duel.state);return;
    case 'career-import':
      if(app.duel.state.status!=='menu'||!playersOpen)return;
      root.querySelector('#career-import-file')?.click();return;
    case 'leaderboard':leaderboardOpen=true;coursesOpen=playersOpen=garageOpen=false;boardFilter.stage=choices.startStage;boardFilter.driverId=getEquippedDriverId(profile());lastScreen=null;break;
    case 'leaderboard-close':leaderboardOpen=false;lastScreen=null;break;
    case 'experimental': if(app.duel.state.status!=='menu')return;experimentalOpen=true;armoryOpen=coursesOpen=playersOpen=leaderboardOpen=garageOpen=false;experimentalStorageMessage='';lastScreen=null;break;
    case 'experimental-close':experimentalOpen=false;lastScreen=null;break;
    case 'armory': if(app.duel.state.status!=='menu')return;armoryOpen=true;garageOpen=coursesOpen=playersOpen=leaderboardOpen=false;garageMessage='';lastScreen=null;break;
    case 'armory-close':armoryOpen=false;lastScreen=null;break;
    case 'garage': openGarage(); return;
    case 'garage-close': closeGarage(); return;
    case 'unlock-car': { const result = app.unlockCar(garageCar); if(result.ok) {choices.car = garageCar;updateMenuScene();}refreshGarage(result.ok ? `${CARS[garageCar].name} is yours. Ready for every course.` : result.reason); return; }
    case 'arena':choices.startStage=COURSE.findIndex(scene=>scene.arena);choices.car='titan_monster';updateMenuScene();closeGarage();return;
    case 'garage-select': choices.car = garageCar;updateMenuScene();closeGarage(); return;
    case 'sound': app.audio.unlock(); app.audio.toggleMute(); break;
    case 'camera': app.cycleCamera(); break;
    case 'pause': app.togglePause(); break;
    case 'resume': app.resume(); break;
    case 'restart': app.requestNavigation('restart'); break;
    case 'menu': armoryOpen = coursesOpen = garageOpen = playersOpen = leaderboardOpen = experimentalOpen = false; app.requestNavigation('menu');if(app.duel.state.status==='menu'){Object.assign(choices,app.getRaceChoices());updateMenuScene();}break;
    case 'next': app.nextStage(); break;
    case 'ticket': app.duel.ackTicket(); break;
    case 'reload-update': buildUpdates.requestReload(); return;
    case 'retry-renderer': if(rendererHandle&&ui.view3d.dataset.vehicleAsset==='error')rendererHandle.retryVehicle();else ensureRenderer(); break;
    case 'manual': app.autopilot = false; break;
    default: return;
  }
  renderState(app.duel.state);
},{signal:domEvents.signal});
const metric = (label,value,accent=false) => `<div class="result-metric${accent?' accent':''}"><span class="field-label">${label}</span><b>${value}</b></div>`;
const action = (label,verb,primary=false) => `<button class="${primary?'start-button':'secondary-button'}" data-action="${verb}"><span>${label}</span>${primary?arrow:''}</button>`;
function playerScreen(){
  const history=profile().history.slice(-5).reverse();
  return `<section class="career-panel player-panel" role="dialog" aria-modal="true" aria-labelledby="player-title"><header class="shop-heading"><div><p class="eyebrow">LOCAL PLAYERS</p><h2 id="player-title">A NAME ON THE GRID.</h2></div><button class="shop-close" data-action="player-close" aria-label="Close player setup">×</button></header><p>Each player has their own credits, cars, upgrades and race history. Everyone on this computer shares the leaderboard.</p><form id="new-player-form"><label for="new-player-name">NEW PLAYER NAME</label><div><input id="new-player-name" name="playerName" maxlength="24" autocomplete="off" placeholder="Your racing name" required><button class="secondary-button" type="submit">CREATE PLAYER</button></div><p role="status" class="career-message">${escapeHTML(playerMessage)}</p></form>${featureFlags.enabled('career-backup')?`<section aria-label="Career backup"><h3>CAREER BACKUP</h3><p>Export every local player's progress, records, ghosts and settings. Import replaces them after checking the file and saving a recovery copy in this browser.</p><div><button type="button" class="secondary-button" data-action="career-export">EXPORT CAREER</button> <button type="button" class="secondary-button" data-action="career-import">IMPORT CAREER</button><input id="career-import-file" type="file" accept=".json,application/json" hidden></div><p role="status" class="career-message">${escapeHTML(backupMessage)}</p></section>`:''}<h3>${escapeHTML(app.player.name)} · RECENT RACES</h3><div class="player-history">${history.length?history.map(row=>`<div><span>${escapeHTML(COURSE.find(scene=>scene.id===row.eventId)?.name||'Race')}<small>${escapeHTML(CARS[row.car]?.name||'Car')} · ${row.won?'WIN':row.completed?'LOSS':'DNF'}</small></span><b>${row.reward<0?'−':'+'}${credits(Math.abs(row.reward))} CR</b></div>`).join(''):'<p>Complete your first race to start your history.</p>'}</div></section>`;
}
function leaderboardScreen(){
  if(COURSE[boardFilter.stage]?.practice)boardFilter.stage=0;
  const stage=COURSE[boardFilter.stage]||COURSE[0],drift=stage.kind==='drift',rush=stage.kind==='checkpoint',event=eventKey({stageIndex:boardFilter.stage,seed:app.getMenuSeed(boardFilter.stage),laps:stage.laps||2});
  const rows=getLeaderboard(app.leaderboard,{event,car:boardFilter.car,driverId:boardFilter.driverId});
  const driverFilter=`<label>DRIVER CLASS<select data-board-filter="driverId" aria-label="Leaderboard driver skill class">${Object.values(DRIVERS).map(driver=>`<option value="${driver.id}" ${driver.id===boardFilter.driverId?'selected':''}>${escapeHTML(driver.name)}</option>`).join('')}</select></label>`;
  const description=rush?"Fastest successful checkpoint runs. All gates and both laps must be completed before the earned deadline. Time includes penalties.":drift?"Each player's highest banked score for this car from a successful trial. Equal scores are ranked by finish time, including penalties.":"Each player's fastest valid finish for this circuit, route and car. Both laps count, including time penalties.";
  const resultRows=rows.map((row,index)=>{const challenge=rush?'CHECKPOINT RUSH':drift?'DRIFT TRIAL':stage.stuntTrial?'STUNT TRIAL':stage.kind==='chase'?'PURSUIT':row.mode==='wasteland'?'MAD MAX DUEL':row.mode==='timetrial'?'TIME TRIAL':(row.rival?'CUSTOM RIVAL':'DUEL'),difficultyLabel=stage.kind==='chase'?'PURSUIT':rush||drift||stage.stuntTrial||row.mode==='timetrial'?'TARGET':'CPU';
    return `<tr class="${row.playerId===app.player.id?'current-player':''}"><td>${String(index+1).padStart(2,'0')}</td><td><b>${escapeHTML(row.playerName)}</b><small>${escapeHTML(CARS[row.car]?.name||row.car)}</small></td><td><b>${drift?`${credits(row.driftScore)} PTS`:time(row.timeSec)}</b><small>${drift?`${time(row.timeSec)} · TARGET ${credits(row.driftTarget)}`:rush?`${row.checkpointsPassed} / ${row.checkpointsRequired} GATES`:`${row.laps} LAPS`}</small></td><td><b>${escapeHTML(row.cpuDifficulty.toUpperCase())} ${difficultyLabel} · ${row.difficulty==='pro'?'MANUAL':'AUTO'}</b><small>${escapeHTML(DRIVERS[normalizeDriverId(row.driverId)].name)}</small><small title="${escapeHTML(Object.entries(row.upgrades).map(([key,level])=>`${UPGRADE_TYPES[key].name} ${level}`).join(', '))}">${Object.values(row.upgrades).reduce((n,level)=>n+level,0)} / 21 UPGRADES · ${challenge}</small></td></tr>`;
  }).join('');
  return `<section class="career-panel leaderboard-panel" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title"><header class="shop-heading"><div><p class="eyebrow">THIS COMPUTER · LOCAL LEADERBOARD</p><h2 id="leaderboard-title">${drift?'SCORES TO CHASE.':'NAMES TO CHASE.'}</h2></div><button class="shop-close" data-action="leaderboard-close" aria-label="Close leaderboard">×</button></header><p>${description}</p><div class="leaderboard-filters"><label>CIRCUIT<select data-board-filter="stage" aria-label="Leaderboard circuit">${COURSE.map((scene,index)=>scene.practice?'':`<option value="${index}" ${index===boardFilter.stage?'selected':''}>${scene.name}</option>`).join('')}</select></label><label>CAR<select data-board-filter="car" aria-label="Leaderboard car"><option value="">All cars</option>${Object.entries(CARS).map(([key,item])=>`<option value="${key}" ${key===boardFilter.car?'selected':''}>${item.name}</option>`).join('')}</select></label>${driverFilter}</div><div class="leaderboard-table"><table><thead><tr><th>RANK</th><th>PLAYER / CAR</th><th>${drift?'SCORE / TIME':'TIME'}</th><th>RACE / BUILD</th></tr></thead><tbody>${resultRows||`<tr><td colspan="4" class="empty-board">${drift?'No scores here yet. Reach the target and finish both laps before the deadline.':'No times here yet. Finish both laps to set the first record.'}</td></tr>`}</tbody></table></div><p class="career-note">Saved in this browser on this computer. ${app.getMenuRouteLabel(boardFilter.stage)} · ${stage.laps||2} laps. ${app.leaderboardSaved===false?'Storage is unavailable; new records last for this session.':''}</p></section>`;
}
root.addEventListener('submit',event=>{
  if(event.target.id!=='new-player-form')return;event.preventDefault();const input=root.querySelector('#new-player-name'),result=app.addPlayer(input.value);
  if(result.ok){playersOpen=false;Object.assign(choices,app.getRaceChoices());garageCar=choices.car;updatePlayers();updateMenuScene();}else playerMessage=result.reason;
  lastScreen=null;renderState(app.duel.state);if(!result.ok)root.querySelector('#new-player-name')?.focus();
},{signal:domEvents.signal});
root.addEventListener('change',event=>{
  if(event.target.id==='career-import-file'){
    const file=event.target.files?.[0];if(!file||app.duel.state.status!=='menu'||!playersOpen)return;
    void (async()=>{
      try{
        const content=await file.text(),archive=parseCareerExport(content);
        const count=archive.entries['the-duel-players-v2']?JSON.parse(archive.entries['the-duel-players-v2']).players.length:1;
        if(!window.confirm('Replace every local player, record and setting with the '+count+' player career in '+file.name+'? The current save will be backed up first.'))return;
        await importCareer(content);
        window.location.reload();
      }catch(error){backupMessage='Import failed: '+error.message;lastScreen=null;renderState(app.duel.state);root.querySelector('[data-action="career-import"]')?.focus();}
    })();
    return;
  }
  if(event.target.id==='experimental-toggle'){
    if(app.duel.state.status!=='menu'||!experimentalOpen)return;
    const result=featureFlags.setExperimental(event.target.checked);
    experimentalStorageMessage=result.saved?'':'Browser storage is unavailable. This choice lasts for this session only.';
    lastScreen=null;renderState(app.duel.state);
    root.querySelector('#experimental-toggle')?.focus({preventScroll:true});
    return;
  }
  const key=event.target.dataset.boardFilter;if(!key)return;boardFilter[key]=key==='stage'?Number(event.target.value):event.target.value;lastScreen=null;renderState(app.duel.state);
},{signal:domEvents.signal});
function paintPanel(saved,carKey){
  const state=getPaintState(saved,carKey),unlocked=isCarUnlocked(saved,carKey);
  return `<section class="paint-panel" aria-label="Paint finishes"><div class="paint-heading"><h3>PAINT FINISH</h3><span>Appearance only · per car</span></div><div class="paint-options">${Object.values(PAINT_PRESETS).map(preset=>{const owned=state.owned.includes(preset.id),selected=state.selected===preset.id,color=preset.appearance?.color??CARS[carKey].color,disabled=!unlocked||selected||(!owned&&saved.credits<preset.price);return `<button class="paint-choice ${selected?'selected':''} ${preset.id}" data-paint="${preset.id}" ${disabled?'disabled':''} aria-pressed="${selected}" aria-label="${selected?`${preset.name} applied`:owned?`Apply ${preset.name} for free`:`Buy and apply ${preset.name} for ${preset.price} credits`}"><i aria-hidden="true" style="--paint-color:#${color.toString(16).padStart(6,'0')}"></i><span><b>${preset.name}</b><small>${preset.finish}</small></span><strong>${!unlocked?'LOCKED':selected?'APPLIED':owned?'APPLY':`BUY & APPLY · ${credits(preset.price)} CR`}</strong></button>`;}).join('')}</div></section>`;
}
function milestonePanel(saved){
  const rows=milestoneProgress(saved),earned=rows.filter(row=>row.earned).length;
  return `<details class="milestone-panel"><summary><span>DRIVING MILESTONES</span><b>${earned} / ${rows.length} EARNED</b></summary><p>One-time rewards for ${escapeHTML(app.player.name)}. Complete both laps to qualify.</p><ul>${rows.map(row=>`<li class="${row.earned?'earned':''}"><div><b>${row.name}</b><span>${row.description}</span></div><strong aria-label="${row.earned?'Earned':`${row.reward} credits`}">${row.earned?'✓ EARNED':`+${credits(row.reward)} CR`}</strong>${row.total>1?`<progress value="${row.progress}" max="${row.total}" aria-label="Campaign circuits won: ${row.progress} of ${row.total}"></progress><small>${row.progress} / ${row.total} CIRCUITS</small>`:''}</li>`).join('')}</ul></details>`;
}
function weaponUpgradePanel(saved){
 const weapons=normalizeWeapons(saved.weapons),details={ufo:'Faster recharge and longer forward warps.',bomb:'More bombs, wider blasts and stronger knockback.',crossbow:'Faster arrows, stronger knockback and quicker reloads.',star:'Faster recharge. Invincibility always lasts five seconds.'};
 return `<details class="weapon-shop" open><summary>WEAPON UPGRADES · MAD MAX DUEL</summary><p>All four base weapons are included. Upgrades apply to every car next race.</p><div class="upgrade-grid">${Object.entries(WEAPONS).map(([id,w])=>{const level=weapons.levels[id],cost=WEAPON_UPGRADE_COSTS[level];return `<article class="upgrade-card"><h3>${w.name}</h3><b>LEVEL ${level} / 3</b><p>${details[id]}</p><button data-weapon-upgrade="${id}" ${level===3||saved.credits<cost?'disabled':''}>${level===3?'MAXED':`UPGRADE · ${cost} CR`}</button></article>`;}).join('')}</div></details>`;
}
function armoryScreen(){
 return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="armory-title"><header class="shop-heading"><div><p class="eyebrow">THE ARMORY</p><h2 id="armory-title">UPGRADE YOUR WEAPONS.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(profile().credits)} CR</b></div><button class="shop-close" data-action="armory-close" aria-label="Close armory">×</button></header>${weaponUpgradePanel(profile())}<p class="garage-message" role="status">${escapeHTML(garageMessage)||'Collect glowing road power-ups in Mad Max Duel to recharge a weapon instantly.'}</p><footer class="shop-footer">${action('BACK TO THE ROAD','armory-close')}</footer></section>`;
}
function garageScreen() {
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
  return `<section class="garage-panel" role="dialog" aria-modal="true" aria-labelledby="garage-title"><header class="shop-heading"><div><p class="eyebrow"><i></i> THE GARAGE</p><h2 id="garage-title">MAKE IT YOURS.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(saved.credits)}<small> CR</small></b></div><button class="shop-close" data-action="garage-close" aria-label="Close garage">×</button></header><nav class="shop-cars" aria-label="Garage cars">${Object.entries(CARS).map(([key,item])=>`<button data-garage-car="${key}" class="${key===garageCar?'on':''}" aria-pressed="${key===garageCar}"><i style="--car-color:#${item.color.toString(16).padStart(6,'0')}"></i><span>${item.name}</span><small>${isCarUnlocked(saved,key)?Object.values(getUpgradeLevels(saved,key)).every(level=>level===3)?'MAXED':'OWNED':item.unlockRequirement?`MAX OTHER CARS ${completionCarProgress(saved,key).maxed}/${completionCarProgress(saved,key).total}`:`${credits(CAR_PRICES[key])} CR`}</small></button>`).join('')}</nav><div class="shop-summary"><div><span class="field-label">${owned?'YOUR BUILD':'UNLOCK THE NEXT LEVEL'}</span><h3>${car.name}</h3></div><div><b>${speedKph(tuned.topSpeed)}</b><span>TOP SPEED / km/h</span></div><div><b>${tuned.gears.length}</b><span>GEARS</span></div></div>${capabilityStats}${paintPanel(saved,garageCar)}${driverPanel(saved,garageCar)}${owned?`${car.factoryMaxed?'<p class="capability-note">GARAGE COMPLETION REWARD · All seven systems are fully tuned. No further upgrades are needed.</p>':''}<div class="upgrade-grid">${cards}</div>`:completion.total?`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p><p>${completion.requirementLabel} Both starter cars and Falcone Heritage count; this reward does not count toward itself.</p></div><div class="unlock-price"><b>${completion.maxed} / ${completion.total}</b><span>CARS FULLY TUNED</span><progress value="${completion.maxed}" max="${completion.total}" aria-label="Fully tuned cars: ${completion.maxed} of ${completion.total}"></progress><p>Unlocks automatically when the last upgrade is complete. No credit purchase.</p></div></div>`:`<div class="unlock-card"><div><p class="eyebrow">${pitch[0]}</p><h3>${pitch[1]}</h3><p>${pitch[2]}</p></div><div class="unlock-price"><b>${credits(price)}<small> CR</small></b><button class="start-button" data-action="unlock-car" ${saved.credits<price?'disabled':''}><span>UNLOCK CAR</span>${arrow}</button><p>${saved.credits<price?`Earn ${credits(price-saved.credits)} more credits to unlock.`:'Ready for your garage.'}</p></div></div>`}${milestonePanel(saved)}<p class="garage-message" role="status" aria-live="polite">${escapeHTML(garageMessage)||'Win races for credits. Improve a car best for a bonus. Upgrades apply next race.'}</p><footer class="shop-footer"><p>${app.profileSaved===false?'Progress is saved for this session only.':'Progress saves in this browser.'}</p>${owned?COURSE.map((event,index)=>event.requiredCar===garageCar?`<button class="secondary-button challenge-entry" data-challenge="${index}">ENTER ${event.name.toUpperCase()}</button>`:'').join(''):''}${owned?action('DRIVE THIS CAR','garage-select',true):action('BACK TO THE ROAD','garage-close')}</footer></section>`;
}
function modalScreen(s) {
  const r = s.results || {}; let eyebrow='',title='',description='',metrics='',actions='';
  if (s.paused) { const practice=!!COURSE[s.stageIndex]?.practice;eyebrow=practice?'FREE PRACTICE':'TAKE A BREATH'; title='ROAD<br>ON HOLD.'; description=practice?'Explore at your own pace. Practice has no timer, records or rewards.':'The clock is paused. Pick up where you left off.'; metrics=metric('EVENT',COURSE[s.stageIndex].name)+(practice?'':metric('TIME',time(s.stageTimeSec))); actions=action('BACK TO THE ROAD','resume',true)+action(practice?'RESTART PRACTICE':'RESTART RUN','restart')+action('MAIN MENU','menu'); }
  else if (s.status==='ticket') { const t=s.police.ticket; eyebrow='HIGHWAY PATROL'; title='BUSTED.'; description=`${formatSpeed(t.speedMph)} in a ${formatSpeed(t.limitMph)} zone. The fine reduces only this race's earnings when you finish. Your saved credits are untouched. Quitting forfeits the race earnings, not your saved balance.${app.profileSaved===false?' Storage is unavailable; progress lasts for this session.':''}`; metrics=metric('TIME PENALTY',`+${t.penaltySec} SEC`,true)+metric('RACE FINE',`${credits(t.fine)} CR`,true)+metric('SAVED BALANCE',`${credits(profile().credits)} CR`); actions=action('GET BACK OUT THERE','ticket',true)+action('MAIN MENU','menu'); }
  else if (s.status==='stage_result') {
    lastEventResult={state:s,stageIndex:s.stageIndex,runId:app.runId,result:r};
    const stage=COURSE[s.stageIndex],drift=stage.kind==='drift',rush=stage.kind==='checkpoint',stunt=r.objective==='stuntTrial',kind=rush?'CHECKPOINT RUSH':drift?'DRIFT TRIAL':stunt?'STUNT TRIAL':stage.kind==='chase'?'PURSUIT':stage.arena?'ARENA':stage.kind==='rally'?'RALLY':'CIRCUIT';
    eyebrow=`${kind} / ${r.won?'VICTORY':r.completed?'COMPLETE':'DNF'}`;title=r.timeout?'TIME RAN<br>OUT.':r.objectiveMissed?(rush?'GATES<br>MISSED.':drift?'TARGET<br>MISSED.':'STUNTS NOT<br>DONE.'):r.won?'OWN THE<br>FINISH.':'SO CLOSE.';
    description=r.won?`${r.winStreak>=3?`${r.winStreak} wins in a row. Streak bonus earned.`:'Both laps are in the books.'}`:r.timeout?'The pursuit deadline passed. The car survives, but this run does not enter the leaderboard.':s.mode==='timetrial'?'You finished both laps but missed the target time.':'Your rival took this one.';
    if(stunt)description=`${r.timeout?'The stunt deadline passed.':r.objectiveMissed?'Both laps finished, but the stunt targets were missed.':'Both laps and the stunt targets are complete.'} ${r.jumps||0} / ${r.targets?.jumps||s.objective?.targetJumps||4} landed jumps · ${r.crushCount||0} / ${r.targets?.crushes||s.objective?.targetCrushes||4} cars crushed.`;
    if(drift)description=`${r.timeout?'The deadline passed.':r.objectiveMissed?'Both laps finished, but the drift target was missed.':'Both laps and the drift target are complete.'} Banked ${credits(r.driftScore)} / ${credits(r.driftTarget||s.objective?.targetScore)} points. Best chain ${credits(r.driftBestChain)}. Time ${time(r.timeSec??r.stageTimeSec)}.${r.driftScoreImproved?' A new car score best.':''}${r.won?'':' Only successful trials set a car best.'}`;
    if(rush)description=`${r.timeout?'The checkpoint clock ran out.':r.objectiveMissed?'Both laps finished, but some gates were missed.':'Every gate cleared. Both laps complete.'} ${r.checkpointsPassed||0} / ${r.checkpointsRequired||s.checkpointRush?.total||12} gates passed. ${r.checkpointMisses||0} missed. Time ${time(r.timeSec??r.stageTimeSec)}.${r.won?'':' Only successful runs set a car best.'}`;
    if(r.personalBestStatus==='baseline')description+=` First ${s.cpuDifficulty.toUpperCase()} / ${s.difficulty==='pro'?'Manual':'Auto'} time for this car and route. This sets the baseline; beat ${time(r.best)} next time for the car-best bonus.`;
    else if(r.personalBestStatus==='improved')description+=` Car best beaten by ${time(r.previousBest-r.best)}. The car-best bonus is included below.`;
    else if(r.personalBestStatus==='not-improved')description+=` Beat your matching car best of ${time(r.best)} to earn the car-best bonus.`;
    if(!r.won)description+=' The loss charge is half the CPU base reward, down to zero credits.';
    metrics=(rush?metric('GATES PASSED',`${r.checkpointsPassed||0} / ${r.checkpointsRequired||12}`,true)+metric('RACE TIME',time(r.timeSec??r.stageTimeSec)):drift?metric('BANKED POINTS',credits(r.driftScore),true)+metric('TARGET',credits(r.driftTarget||s.objective?.targetScore)):metric('RACE TIME',time(r.timeSec??r.stageTimeSec),true)+metric('CAR BEST',r.best==null?'—':time(r.best)))+metric(r.creditReward<0?'CREDITS LOST':'CREDITS EARNED',`${r.creditReward<0?'−':'+'}${credits(Math.abs(r.creditReward||0))}`,true);
    const atEnd=!!stage.kind||!COURSE[s.stageIndex+1]||!!COURSE[s.stageIndex+1].kind;
    actions=r.timeout?action('TRY AGAIN','restart',true)+action('MAIN MENU','menu'):action(atEnd?'FINISH THE RUN':'NEXT CIRCUIT','next',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu');
    if(!r.timeout&&!atEnd&&!isCourseUnlocked(profile(),s.stageIndex+1)){description+=` Completed race credits are safe. Unlock ${escapeHTML(COURSE[s.stageIndex+1].name)} for ${credits(COURSE_PRICES[COURSE[s.stageIndex+1].id])} CR in the course garage to continue.`;actions=action('UNLOCK NEXT COURSE','unlock-next',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu');}
  }
  else if (s.status==='gameover') { eyebrow=s.catastrophic?'CATASTROPHIC DAMAGE':'END OF THE ROAD'; title=s.catastrophic?'TOTALLED.':'ONE MORE<br>RUN?'; description=(s.catastrophic?'Five major crashes. The car is destroyed.':'This race is over.')+' The loss costs half the CPU base reward, down to zero credits.'; metrics=metric('RACE TIME',time(s.stageTimeSec))+metric('CREDITS LOST',`−${credits(Math.abs(r.creditReward||0))}`,true)+metric('BALANCE',`${credits(profile().credits)} CR`); actions=action('RUN IT BACK','restart',true)+action('MAIN MENU','menu'); }
  else if (s.status==='complete') {
    const stage=COURSE[s.stageIndex];
    if(stage?.kind){
      // nextStage replaces the settlement payload with a generic run summary.
      // Retain the result that this UI just showed, tied to the actual run/event.
      const result=lastEventResult?.state===s&&lastEventResult.stageIndex===s.stageIndex&&lastEventResult.runId===app.runId?lastEventResult.result:{};
      const won=result.won===true,known=typeof result.won==='boolean',rush=stage.kind==='checkpoint',drift=stage.kind==='drift',stunt=!!stage.stuntTrial;
      eyebrow=`${escapeHTML(stage.name.toUpperCase())} / ${known&&won?'VICTORY':'COMPLETE'}`;
      title=!won?'RUN<br>COMPLETE.':rush?'GATES<br>CLEARED.':drift?'DRIFT<br>MASTERED.':stunt?'STUNTS<br>COMPLETE.':stage.kind==='chase'?'CITY<br>ESCAPED.':stage.kind==='rally'?'TRAIL<br>CONQUERED.':stage.arena?'ARENA<br>CONQUERED.':'CIRCUIT<br>CONQUERED.';
      description=!won?`${escapeHTML(stage.name)} is complete.${known?' The winning target was not met. Try another run.':''}`:rush?'Every checkpoint passed in order. Both laps complete before the clock ran out.':drift?'Drift target reached. Both city laps complete before the deadline.':stunt?'Both laps, the landed jumps and the crush targets are complete.':stage.kind==='chase'?'Both city laps complete. You escaped the pursuit before the deadline.':stage.kind==='rally'?'Both gravel laps complete. You conquered Ridge Rally.':stage.arena?'Both stadium laps complete. The arena is yours.':`Both laps complete. You beat ${s.mode==='timetrial'?'the Time Trial target':'your rival'} at ${escapeHTML(stage.name)}.`;
      metrics=metric('RACE TIME',time(result.timeSec??s.stageTimeSec+(s.racePenaltySec||0)),true);
      metrics+=rush?metric('GATES PASSED',`${result.checkpointsPassed??s.checkpointRush?.passed??0} / ${result.checkpointsRequired??s.checkpointRush?.total??12}`):drift?metric('BANKED POINTS',credits(result.driftScore??s.drift?.bankedScore??0)):stunt?metric('LANDED JUMPS',result.jumps??s.jumps??0)+metric('CARS CRUSHED',result.crushCount??s.crushCount??0):metric('LAPS COMPLETE',`${s.completedLaps} / ${s.lapsTotal}`);
      if(Number.isFinite(result.creditReward))metrics+=metric(result.creditReward<0?'CREDITS LOST':'CREDITS EARNED',`${result.creditReward<0?'−':'+'}${credits(Math.abs(result.creditReward))}`,true);
      actions=action('RUN IT AGAIN','restart',true)+action('MAIN MENU','menu');
    }else{
      eyebrow='ALL STAGES COMPLETE';title='HORIZON<br>CONQUERED.';description='From desert heat to mountain air. You made it all the way.';
      metrics=metric('TOTAL TIME',time(r.totalTimeSec),true)+metric('LIVES LEFT',r.lives)+metric('STYLE POINTS',Number(s.score||0).toLocaleString());
      actions=action('CHASE IT AGAIN','restart',true)+action('MAIN MENU','menu');
    }
  }
  else return '';
  const bonus=r.creditBreakdown?Object.entries(r.creditBreakdown).filter(([key,value])=>key!=='base'&&key!=='milestones'&&value>0).map(([key,value])=>`${{clean:'CLEAN RACE',personalBest:'CAR BEST',streak:'WIN STREAK',jumps:'ARENA JUMPS',crush:'CRUSH BONUS',drift:'DRIFT BONUS',police:'POLICE ESCAPE',manual:'PRO / MANUAL BONUS'}[key]} +${credits(value)}`).join(' · '):'';
  const repairs=r.won&&(r.crashesRepaired>0||r.livesRestored>0)?`<p class="result-bonuses">STAGE WIN REPAIRS · ${r.crashesRepaired||0} MAJOR CRASH${r.crashesRepaired===1?'':'ES'} REPAIRED · ${r.livesRestored||0} CRASH SLOT${r.livesRestored===1?'':'S'} REFILLED</p>`:'';
  return `<section class="result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow"><i></i>${eyebrow}</p><h2 id="result-title">${title}</h2><p class="result-description">${description}</p><div class="result-metrics">${metrics}</div>${r.creditCharge?`<p class="result-bonuses">LOSS CHARGE −${credits(r.creditCharge)} CR</p>`:''}${r.policeFineCharge?`<p class="result-bonuses">POLICE FINE FROM RACE EARNINGS −${credits(r.policeFineCharge)} CR</p>`:''}${bonus?`<p class="result-bonuses">${bonus}</p>`:''}${repairs}${r.milestoneAwards?.length?`<p class="result-bonuses milestone-earned" role="status">${r.milestoneAwards.map(award=>`${escapeHTML(award.name).toUpperCase()} +${credits(award.reward)} CR`).join(" · ")}</p>`:''}${r.ghostRecorded?`<p class="result-bonuses ghost-saved">BEST GHOST SAVED${app.ghostSaved===false?' · THIS SESSION ONLY':''}</p>`:''}<div class="result-actions">${actions}</div>${s.paused?'<p class="pause-help">ARROWS TO DRIVE · SPACE TO BOOST · C FRONT · B BACK · V RIGHT · X LEFT<br>Restarting or leaving forfeits unbanked race earnings. Saved credits are safe.</p>':''}</section>`;
}
function syncRendererReadiness(s) {
  if(uiDisposed)return;
  if(rendererHandle){
    rendererHandle.prepareVehicle(s.status==='menu'?app.menuCar||choices.car:s.car);
    const asset=ui.view3d.dataset.vehicleAsset,loading=asset==='loading'||asset==='idle',failed=asset==='error';
    const preparing=asset==='ready'&&!app.visualReady;
    ui['renderer-loading'].hidden=!(loading||preparing);
    ui['renderer-loading'].lastChild.textContent=preparing?' PREPARING THE ROAD':` LOADING ${CARS[ui.view3d.dataset.vehicleKey]?.name.toUpperCase()||'VEHICLE'}`;
    ui['start-engine'].disabled=asset!=='ready'||!app.visualReady||!isCourseUnlocked(profile(),choices.startStage);
    ui['renderer-error'].hidden=!failed;
    if(failed){ui['renderer-error'].querySelector('strong').textContent="The car couldn't load.";ui['renderer-error'].querySelector('span').textContent='Retry the car download, or choose another car. Your progress is unchanged.';ui['renderer-error'].querySelector('button').textContent='RETRY CAR ↗';}
  }
}
function renderState(s) {
  buildUpdates.syncState();
  const combat=s.combat;weaponHud.hidden=!combat||s.status==='menu';
  if(combat){for(const button of weaponHud.querySelectorAll('[data-weapon]')){const key=button.dataset.weapon,left=combat.cooldowns[key];button.disabled=s.status!=='racing'||s.paused||left>0;button.textContent=`${WEAPONS[key].key} · ${WEAPONS[key].name} L${combat.levels[key]} · ${left>0?Math.ceil(left)+'s':'READY'}`;}weaponStatus.textContent=combat.shield>0?`INVINCIBLE · ${combat.shield.toFixed(1)}s`:`ARMORED DUEL · ${combat.hits} HITS · CPU WEAPONS ACTIVE`;}
  root.querySelector('#stage').classList.toggle('combat-mode',choices.mode==='wasteland'||s.mode==='wasteland'&&s.status!=='menu');
  text('nitro-label',s.practice?'NITRO ∞':'NITRO');
  syncRendererReadiness(s);
  ui.overlay.dataset.credits = String(profile().credits);ui.overlay.dataset.ghostStatus=app.ghostStatus;ui.overlay.dataset.ghostRecords=String(app.ghosts.records.length);ui.overlay.dataset.routeVariant=getRouteVariantForSeed(s.status==='menu'?app.getMenuSeed():s.seed)?.id||'custom';
  ui.overlay.dataset.playerId=app.player.id;ui.overlay.dataset.playerName=app.player.name;ui.overlay.dataset.cpuDifficulty=s.cpuDifficulty||choices.cpuDifficulty;ui.overlay.dataset.lap=String(s.currentLap||s.lap||1);
  text('menu-credits', `${credits(profile().credits)} CR`);
  ui.overlay.dataset.status=s.status; ui.overlay.dataset.paused=String(!!s.paused); ui.overlay.dataset.audioState=app.audio?.context?.state||'locked'; ui.overlay.dataset.muted=String(!!app.audio?.muted);
  ui.overlay.dataset.audioSamples=app.audio.sampleStatus;ui.overlay.dataset.majorCrashes=String(s.majorCrashes);ui.overlay.dataset.catastrophic=String(s.catastrophic);
  const showImpact = s.status === 'gameover' && s.impactTimer > 0;
  const screen=`${s.status}:${!!s.paused}:${showImpact}:${app.player.id}:${garageOpen}:${armoryOpen}:${playersOpen}:${leaderboardOpen}:${experimentalOpen}:${coursesOpen}:${garageOpen ? garageCar + ':' + profile().credits : ''}`;
  if (screen!==lastScreen) {
    lastScreen=screen; const menu=s.status==='menu'; ui.stage.classList.toggle('in-menu',menu); ui.stage.classList.toggle('in-race',!menu); ui['menu-screen'].hidden=!menu; ui['race-hud'].hidden=menu; ui['menu-location'].hidden=!menu; root.querySelectorAll('.race-only').forEach(el=>{el.hidden=menu;});
    ui['garage-open'].hidden = !menu;root.querySelector('#armory-open').hidden=!menu;
    const modal=menu&&armoryOpen?armoryScreen():menu&&coursesOpen?courseAccessPanel(profile(),choices.startStage,courseMessage):menu&&playersOpen?playerScreen():menu&&leaderboardOpen?leaderboardScreen():menu&&experimentalOpen?experimentalPanel(featureFlags,experimentalStorageMessage):menu && garageOpen ? garageScreen() : menu||showImpact?'':modalScreen(s); ui['modal-layer'].innerHTML=modal; ui['modal-layer'].hidden=!modal; ui.stage.classList.toggle('has-modal',!!modal); ui['countdown'].hidden=s.status!=='countdown'||!!s.paused;
    const challengeLabel=app.duel.stageDef?.kind==='chase'?'PURSUIT':s.objective||s.mode==='timetrial'?'TARGET':'CPU',routeLabel=supportsRouteVariants(app.duel.stageDef)?` · ${(getRouteVariantForSeed(s.seed)?.label||'Custom route').toUpperCase()}`:'';text('stage-label',`${app.player.name.toUpperCase()} · ${(s.cpuDifficulty||choices.cpuDifficulty).toUpperCase()} ${challengeLabel}${routeLabel}`); text('stage-name',app.duel.stageDef?.name||'The open road'); text('stage-objective',s.rival?'BEAT YOUR RIVAL OVER TWO LAPS':'CHASE YOUR CAR PERSONAL BEST');
    ui['pause-button'].setAttribute('aria-label',s.paused?'Resume race':'Pause race');
    if(modal) ui['modal-layer'].querySelector('button')?.focus({preventScroll:true});
  }
  text('experimental-open',featureFlags.experimental()?'EXPERIMENTAL · ON':'EXPERIMENTAL');
  const muted=!!app.audio?.muted; ui['sound-toggle'].classList.toggle('muted',muted); ui['sound-toggle'].setAttribute('aria-label',muted?'Enable sound':'Mute sound'); text('sound-caption',muted?'SOUND OFF':'SOUND ON'); ui['test-driver'].hidden=!app.autopilot;
  const jumpHeight=jumpHeightReadout.update(s,app.duel.course);
  ui['jump-height-panel'].hidden=jumpHeight.phase==='hidden';
  ui['jump-height-panel'].dataset.phase=jumpHeight.phase;
  text('jump-height-label',jumpHeight.phase==='landed'?'JUMP PEAK':'HEIGHT ABOVE GROUND');
  text('jump-height-value',(jumpHeight.phase==='landed'?jumpHeight.peakMeters:jumpHeight.heightMeters).toFixed(1));
  text('jump-height-peak',jumpHeight.phase==='landed'?'LANDED':`PEAK ${jumpHeight.peakMeters.toFixed(1)} m`);
  text('jump-distance',`DISTANCE ${(jumpHeight.distanceMeters||0).toFixed(1)} m · ${(jumpHeight.durationSeconds||0).toFixed(1)} s`);
  if(s.status!=='menu') updateHud(s);
}
function updateHud(s) {
  if(s.combat){text('damage-label',`${s.majorCrashes} MAJOR HITS · AUTO RECOVERY`);ui['lives-display'].setAttribute('aria-label','Combat armor: wrecks recover');}
  text('race-time',time(s.stageTimeSec)); text('penalty-time',s.racePenaltySec?`+${Math.round(s.racePenaltySec)} SEC PENALTIES`:'');text('lap-number',`LAP ${s.currentLap||s.lap||1} / ${app.duel.stageDef.laps||2}`);text('lap-time',time(s.lapTimeSec||0));const section=app.duel.course?.sectionAt?.(s.s)?.name||'COMPLETE BOTH LAPS';text('stage-objective',s.objective?.kind==='checkpointRush'?`GATES ${s.checkpointRush?.passed||0} / ${s.checkpointRush?.total||12} · EACH GATE +${s.checkpointRush?.extensionSec||0} SEC`:s.objective?.kind==='driftTrial'?`BANK ${credits(s.objective.targetScore)} POINTS · FINISH BOTH LAPS`:s.objective?.kind==='stuntTrial'?`LANDINGS ${s.jumps||0} / ${s.objective.targetJumps} · CRUSHES ${s.crushCount||0} / ${s.objective.targetCrushes} · ${time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0)))} LEFT`:`${section}${s.timeLimitSec?` · ESCAPE IN ${time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0)))}`:s.mode==='timetrial'&&s.parTimeSec?` · TARGET ${time(s.parTimeSec)}`:''}`);text('speed-value',String(speedKph(s.speedMph)).padStart(3,'0')); text('gear-value',s.gear===-1?'R':s.gear+1); text('rpm-value',(clamp(s.revs)*8).toFixed(1));
  ui['rpm-fill'].style.transform=`scaleX(${clamp(s.revs)})`; ui['rpm-fill'].classList.toggle('redline',s.revs>DRIVE.redlineWarnFrac); ui['boost-fill'].style.transform=`scaleX(${clamp(s.boost??1)})`; ui.stage.classList.toggle('is-boosting',!!s.boosting); text('camera-label',`${(app.cameraMode||'chase').toUpperCase()} CAM`); text('style-score',String(s.score||0).padStart(4,'0')); text('combo-label',s.combo>1?`×${s.combo} COMBO`:'');
  const drift=s.objective?.kind==='driftTrial',rush=s.objective?.kind==='checkpointRush';ui['drift-panel'].hidden=!drift;ui['checkpoint-panel'].hidden=!rush;ui['style-score-panel'].hidden=drift||rush;
  if(rush){
    const gates=s.checkpointRush,notice=app.checkpointNotice,left=Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0));
    text('checkpoint-passed',`${gates.passed} / ${gates.total}`);text('checkpoint-time',time(left));ui['checkpoint-panel'].classList.toggle('time-low',left<10);ui['checkpoint-target-fill'].style.transform=`scaleX(${clamp(gates.passed/gates.total)})`;
    const physicalGates=app.duel.course.features.rushGates,next=physicalGates[gates.nextGate%physicalGates.length],distance=next?Math.max(0,Math.floor(gates.nextGate/physicalGates.length)*app.duel.course.length+next.s-s.s):0;
    text('checkpoint-next',gates.nextGate>=gates.total?'FINISH BOTH LAPS':`NEXT GATE ${gates.nextGate+1} / ${gates.total} · ${Math.ceil(distance)} M`);
    text('checkpoint-notice',notice&&notice.expiresAt>s.stageTimeSec?notice.type==='passed'?`Gate ${notice.index+1} passed · +${notice.extensionSec} seconds`:`Gate ${notice.index+1} missed · no time gained`:gates.missed?`${gates.missed} missed. Complete the run or try again.`:gates.nextGate>=gates.total?'All gates passed. Bring it home.':`Pass through the next lit gate for +${gates.extensionSec} seconds.`);
  }
  if(drift){
    const banked=Math.round(s.drift?.bankedScore||0),chain=Math.round(s.drift?.chainScore||0),target=s.objective.targetScore,notice=app.driftNotice;
    text('drift-banked',credits(banked));text('drift-target-label',`/ ${credits(target)}`);ui['drift-chain'].firstChild.textContent=`+${credits(chain)} `;text('drift-multiplier',`×${(s.drift?.multiplier||1).toFixed(2)}`);ui['drift-target-fill'].style.transform=`scaleX(${clamp(banked/target)})`;ui['drift-panel'].classList.toggle('target-met',banked>=target);
    const reason={hit:'collision',reset:'reset',offroad:'off-road',uncontrolled:'spin',reverse:'wrong way',airborne:'airborne',inactive:'run stopped',invalid:'recovery',unfinished:'run ended'};
    text('drift-notice',notice&&notice.expiresAt>s.stageTimeSec?notice.type==='banked'?`Banked +${credits(notice.points)}`:`Chain lost · ${reason[notice.reason]||'recovery'}`:banked>=target?'Target met. Finish both laps.':chain?'Straighten to bank. Avoid impacts and dirt.':`Slide above ${formatSpeed(45)} to build a chain.`);
  }
  const length=app.duel.course?.raceLength||app.duel.course?.length||1,progress=clamp(s.s/length); text('route-percent',`${Math.floor(progress*100)}%`); text('route-remaining',`${(Math.max(0,length-s.s)/1000).toFixed(1)} KM TO GO`); ui['progress-fill'].style.transform=`scaleX(${progress})`;
  if(s.rival){
    const gap=s.rival.s-s.s, settled=s.status==='stage_result'||s.status==='complete';
    const behind=settled?s.results?.beatRival===false:s.rival.finished||gap>0;
    text('race-position',behind?'02':'01');
    text('gap-label',settled?'FINISH POSITION':s.rival.finished?'RIVAL FINISHED':behind?'RIVAL AHEAD':'RIVAL BEHIND');
    text('rival-gap',settled?(behind?'SECOND PLACE':'FIRST PLACE'):s.rival.finished?'KEEP PUSHING':`${(Math.abs(gap)/(Math.max(45,s.speedMph,s.rival.speedMph||0)*DRIVE.mphToWorld)).toFixed(1)} SEC`);
  }else{text('race-position',rush?'CP':s.objective?.kind==='driftTrial'?'DR':s.objective?'ST':s.timeLimitSec?'GO':'TT');text('gap-label',rush?'CHECKPOINT CLOCK':s.objective?.kind==='driftTrial'?'DRIFT DEADLINE':s.objective?'STUNT DEADLINE':s.timeLimitSec?'ESCAPE THE PURSUIT':app.ghostRecord?(app.ghostEnabled?'BEST GHOST':'BEST GHOST OFF'):'RACE THE CLOCK');text('rival-gap',s.objective?time(Math.max(0,s.timeLimitSec-s.stageTimeSec-(s.racePenaltySec||0))):s.timeLimitSec?'BEAT THE DEADLINE':app.ghostRecord?time(app.ghostRecord.timeSec):'RECORD YOUR GHOST');} ui['position-total'].hidden=!s.rival; ui['rival-legend'].hidden=!s.rival;
  const hits=s.majorCrashes||0,persistent=!!app.duel.stageDef.persistentVehicle;ui['lives-display'].hidden=persistent;
  if(ui['lives-display'].dataset.value!==String(hits)){ui['lives-display'].dataset.value=hits;ui['lives-display'].innerHTML=Array.from({length:DRIVE.majorCrashLimit},(_,i)=>`<i class="${i<DRIVE.majorCrashLimit-hits?'healthy':''}"></i>`).join('');ui['lives-display'].setAttribute('aria-label',`${hits} of ${DRIVE.majorCrashLimit} major crashes`);}
  text('damage-label',s.combat?`${hits} MAJOR HITS · AUTO RECOVERY`:persistent?`IMPACTS ADD +${app.duel.stageDef.chaseCrashPenaltySec||8} SEC`:hits===DRIVE.majorCrashLimit-1?'CRITICAL · NEXT MAJOR CRASH IS FATAL':`${hits} / ${DRIVE.majorCrashLimit} MAJOR CRASHES`);ui['damage-label'].classList.toggle('critical',!s.combat&&!persistent&&hits>=DRIVE.majorCrashLimit-1);
  const objectiveTrial=!!s.objective;ui['radar-label'].hidden=objectiveTrial;ui['radar-meter'].hidden=objectiveTrial;
  const p=s.police; text('radar-label',p.pursuit?.active?'PURSUIT / OUTRUN THE PATROL':p.beep>.2?'RADAR / SPEED TRAP AHEAD':'RADAR CLEAR'); ui['radar-label'].classList.toggle('warning',p.beep>.2||!!p.pursuit?.active); ui['radar-fill'].style.transform=`scaleX(${p.pursuit?.active?1:clamp(p.beep)})`;
  if(s.status==='countdown'){text('countdown-number',Math.max(1,Math.ceil(s.countdown)));text('countdown-word',s.countdown>1?'GET READY':'MAKE IT COUNT');}
  const crash=s.crashFlash>0||s.impactTimer>0; ui['crash-flash'].hidden=!crash;
  const dirtCourse=!!app.duel.stageDef.offroad||!!app.duel.stageDef.arena;
  const callout=crash?(s.catastrophic?'CATASTROPHIC IMPACT':s.lastCrashReason==='engine_blew'?'ENGINE BLOWN':s.lastCrashReason==='rock'?'ROCK IMPACT':'COLLISION'):s.calloutTimer>0?s.callout:s.boundaryWarning?'RETURN TO THE ROUTE':s.preparedGravel?'GRAVEL TRACK':s.offRoad?'LOOSE SURFACE':s.drifting?'DRIFT':'';
  ui['race-callout'].hidden=!callout||!!s.paused; text('callout-kicker',s.catastrophic?'FIVE HITS. END OF THE ROAD.':crash?persistent?'THE CAR SURVIVES. THE CLOCK KEEPS RUNNING.':hits===DRIVE.majorCrashLimit-1?'CHASSIS CRITICAL. MAKE THIS LIFE COUNT.':'SHAKE IT OFF. KEEP DRIVING.':s.boundaryWarning?'COURSE BOUNDARY · RESET AHEAD':s.preparedGravel?'KEEP YOUR LINE':s.offRoad?dirtCourse?'CONTROL THE SLIDE':'FIND THE TARMAC':s.boosting?'FULL SEND':'MAKE EVERY MOVE COUNT');text('callout-text',callout);ui['race-callout'].classList.toggle('crash-callout',crash);
  ui.stage.classList.toggle('is-arena',!!app.duel.stageDef.arena);ui['arena-crush'].hidden=!app.duel.stageDef.arena;const crushed=Math.max(0,Math.floor(s.crushCount||0));text('arena-crush',app.duel.stageDef.practice?`CRUSHED ${crushed}`:`CRUSHED ${Math.min(6,crushed)} / 6`);
  text('route-section',section);text('route-lap',`${s.currentLap||s.lap||1} / ${app.duel.stageDef.laps||2}`);ui['police-legend'].hidden=!s.police?.pursuit?.active;ui['shortcut-legend'].hidden=!app.duel.course?.features.shortcuts.length;ui['shortcut-b-legend'].hidden=(app.duel.course?.features.shortcuts.length||0)<2;routeMap.update(app.duel.course,s);
  const practice=!!app.duel.stageDef.practice;
  ui.stage.classList.toggle('is-practice',practice);
  text('race-time-label',practice?'NO TIMER · NO REWARDS':'RACE TIME');
  if(practice){
    text('race-time','FREE PRACTICE');text('penalty-time','');text('lap-number','NO LAP TARGET');text('lap-time','');
    text('stage-label',`${app.player.name.toUpperCase()} · FREE PRACTICE`);text('stage-objective','EXPLORE THE RAMPS · NO TIMER, RIVAL OR FINISH LINE');
    text('route-percent','FREE');text('route-remaining','EXPLORE AT YOUR OWN PACE');text('route-lap','PLAYGROUND');ui['progress-fill'].style.transform='scaleX(0)';
    text('race-position','∞');text('gap-label','FREE PRACTICE');text('rival-gap','NO RECORDS OR REWARDS');
    ui['style-score-panel'].hidden=true;ui['lives-display'].hidden=true;ui['radar-label'].hidden=true;ui['radar-meter'].hidden=true;
    text('damage-label','PRACTICE · RECOVER AND KEEP DRIVING');
    if(crash)text('callout-kicker','RECOVER AND TRY AGAIN · NO RACE PENALTY');
    if(s.status==='countdown')text('countdown-word','EXPLORE THE PLAYGROUND');
  }
}

document.addEventListener('keydown',e=>{if(e.code==='Escape'&&(armoryOpen||coursesOpen||garageOpen||playersOpen||leaderboardOpen||experimentalOpen)){e.preventDefault();armoryOpen=coursesOpen=garageOpen=playersOpen=leaderboardOpen=experimentalOpen=false;lastScreen=null;updateMenuCar();renderState(app.duel.state);return;}if(e.code!=='Tab'||ui['modal-layer'].hidden)return;const buttons=[...ui['modal-layer'].querySelectorAll('button:not(:disabled),select,input,summary')],first=buttons[0],last=buttons.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}},{signal:domEvents.signal});
app.onFrame=renderState;updatePlayers();updateMenuCar();updateMenuScene();renderState(app.duel.state);ensureRenderer();app.start();
