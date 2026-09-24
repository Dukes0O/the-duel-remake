import {hiddenRoadHints} from './hidden-road-hints.js';
import {hudMarkup} from './screen-hud.js';
import {CARS, COURSE, CPU_DIFFICULTY, DIFFICULTY} from './config.js';
import {LIGHTING_MOODS} from './lighting-moods.js';
import {ROUTE_VARIANTS, getRouteVariantForSeed, supportsRouteVariants} from './route-variants.js';
import {BUILD_VERSION} from './build-version.js';
import {supportsCombat} from './combat.js';
import {CPU_REWARDS, UPGRADE_TYPES, CAR_PRICES, bestKey, eventKey, completionCarProgress, getUpgradeLevels, isCarUnlocked, upgradedCar} from './progression.js';
import {getLeaderboard} from './leaderboard.js';
import {getDriverState, getEquippedDriverId, applyDriverModifiers, DRIVERS} from './drivers.js';
import {driverSkillLabel} from './driver-ui.js';
import {syncRaceChoiceButtons} from './race-settings-ui.js';
import {COURSE_PRICES, isCourseUnlocked} from './course-access.js';
import {speedKph, formatSpeed} from './speed-format.js';

export function screenMarkup({choices, arrow, sound, escapeHTML}) {
return `<div id="stage" class="in-menu"><div id="view3d" aria-label="Three-dimensional driving scene"></div><div class="film-grain"></div><div id="overlay">
  <header class="masthead"><a class="wordmark" href="#" data-action="menu" aria-label="The Duel main menu"><span class="brand-slashes">///</span> THE DUEL <span class="edition">REDLINE</span></a><div class="utility-controls"><span id="menu-location" class="location-label"><i></i> MOJAVE COUNTY, USA</span><button id="garage-open" class="garage-wallet" data-action="garage"><span>GARAGE</span><b id="menu-credits">0 CR</b></button><button id="armory-open" class="garage-wallet" data-action="armory">ARMORY</button><button id="sound-toggle" class="icon-button" data-action="sound" aria-label="Mute sound" title="Sound · M">${sound}<span id="sound-caption">SOUND ON</span></button><button id="camera-toggle" class="icon-button race-only" data-action="camera" aria-label="Change camera" title="Cycle cameras · C front / B back / V right / X left / D reset" hidden><svg viewBox="0 0 24 24" fill="none"><path d="m8 6 2-3h4l2 3h5v14H3V6h5Z"/><circle cx="12" cy="12" r="4"/></svg></button><button id="pause-button" class="icon-button race-only" data-action="pause" aria-label="Pause race" title="Pause · Esc" hidden><svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14M16 5v14"/></svg></button></div></header>
  <main id="menu-screen" class="menu-screen">
    <div class="menu-intro"><p class="eyebrow"><i></i> YOUR GARAGE. YOUR NAME. YOUR RACE.</p><h1>THE<span>DUEL</span><em>REDLINE</em></h1><p class="menu-description">Two laps. New horizons.<br>Build your way to the arena.</p></div>
    <section class="race-setup" aria-label="Race setup"><div class="player-controls"><label class="field-label" for="player-select">PLAYER</label><select id="player-select" aria-label="Choose local player"></select><button data-action="new-player" class="small-action">+ NEW</button><button data-action="leaderboard" class="small-action">SCORES ↗</button></div><div class="setup-line scene-line"><label class="field-label" for="scene-select">CIRCUIT</label><select id="scene-select" aria-label="Choose a scene">${COURSE.map((scene,index)=>`<option value="${index}">${scene.name}</option>`).join('')}</select></div><div id="route-choice" class="setup-line route-choice"><span id="route-choice-label" class="field-label">ROUTE</span><div class="segmented" role="group" aria-label="Course route">${ROUTE_VARIANTS.map(route=>`<button class="choice" data-route-variant="${route.id}" aria-pressed="false">${route.label.toUpperCase()}</button>`).join('')}</div></div><div class="setup-line"><span class="field-label">THE CHALLENGE</span><div class="segmented" role="group" aria-label="Race mode"><button class="choice on" data-mode="duel" aria-pressed="true">RIVAL DUEL</button><button class="choice" data-mode="wasteland" aria-pressed="false">MAD MAX DUEL</button><button class="choice" data-mode="timetrial" aria-pressed="false">TIME TRIAL</button></div></div><div class="setup-line"><span id="cpu-target-label" class="field-label">CPU RIVAL</span><div class="segmented" role="group" aria-label="CPU difficulty">${Object.entries(CPU_DIFFICULTY).map(([key,item])=>`<button class="choice ${choices.cpuDifficulty===key?'on':''}" data-cpu-difficulty="${key}" aria-pressed="${choices.cpuDifficulty===key}">${item.name.toUpperCase()}</button>`).join('')}</div></div><div class="setup-line"><span class="field-label">TRANSMISSION</span><div class="segmented" role="group" aria-label="Difficulty">${Object.entries(DIFFICULTY).map(([key,d]) => `<button class="choice ${choices.difficulty === key ? 'on' : ''}" data-difficulty="${key}" aria-pressed="${choices.difficulty === key}">${d.autoShift ? 'ARCADE / AUTO' : 'PRO / MANUAL'}</button>`).join('')}</div></div><p class="entry-reward" id="entry-reward"></p><p id="event-brief" class="event-brief" hidden></p><label id="ghost-control" class="ghost-control" hidden><input id="ghost-toggle" type="checkbox"><span>BEST GHOST <b id="ghost-record-label"></b></span></label><p id="ghost-hint" class="ghost-hint" hidden>Finish a Time Trial personal best to record your ghost.</p><button id="start-engine" disabled class="start-button" data-action="start"><span>START ENGINE</span>${arrow}</button><button id="wasteland-visit" type="button" class="secondary-button wasteland-entry" data-action="wasteland-visit" hidden>WASTELAND <span>→</span></button><p class="start-note">2 LAPS <span>·</span> ${Object.values(CARS).filter(car=>car.price>0||car.unlockRequirement).length} EARNABLE CARS <span>·</span> LOCAL PLAYER PROGRESS</p></section>
    <section class="garage" aria-label="Choose your car"><div class="garage-heading"><span class="field-label">CHOOSE YOUR WEAPON</span><label class="graphics-control"><span>GRAPHICS</span><select id="graphics-quality" aria-label="Graphics quality"><option value="high">High</option><option value="performance">Performance</option></select></label><span id="garage-count">01 / ${String(Object.keys(CARS).length).padStart(2,'0')}</span></div><label class="car-picker"><span class="visually-hidden">Choose your car</span><select id="car-select" aria-label="Choose your car">${Object.entries(CARS).map(([key,c])=>`<option value="${key}">${c.name}</option>`).join('')}</select><span class="car-picker-arrow" aria-hidden="true">⌄</span></label><div class="car-specs"><div><b id="car-speed"></b><span>TOP SPEED / km/h</span></div><div><b id="car-gears"></b><span>GEARS</span></div><div><b id="car-character"></b><span>DRIVING CHARACTER</span></div></div><label class="lighting-control"><span>LIGHTING</span><select id="lighting-mood" aria-label="Outdoor lighting">${Object.entries(LIGHTING_MOODS).map(([id,mood])=>`<option value="${id}">${mood.label}</option>`).join('')}<option value="night" disabled hidden>Night event</option></select></label><div class="course-preview" aria-label="Selected course preview"><canvas id="menu-course-map" width="320" height="200" role="img" aria-label="Selected course outline"></canvas><div class="course-preview-details"><div class="course-preview-top"><span id="menu-route-label">ROUTE A</span><span id="scene-length"></span></div><b id="scene-name">${COURSE[0].name}</b><div id="menu-biome-legend" class="menu-biome-legend"></div><div class="course-preview-bottom"><span id="menu-shortcuts"></span><span id="menu-elevation" class="menu-elevation"><canvas id="menu-elevation-profile" width="180" height="28" aria-hidden="true"></canvas><span id="menu-relief"></span></span></div></div></div><button class="garage-tune" data-action="garage">TUNE YOUR CAR <span>→</span></button></section>
    <aside id="build-update" class="build-update" aria-label="Game update" hidden><div><p id="build-update-message" role="status" aria-live="polite" aria-atomic="true"></p><span id="build-update-help">Reload at the menu. Your saved progress and settings stay here.</span></div><button type="button" data-action="reload-update" aria-describedby="build-update-help">RELOAD</button></aside>
    <footer class="menu-footer"><span class="footer-label">BUILT FOR THE DRIVE</span><div class="controls-strip"><span title="Hold S / Down / LT at rest to reverse. W / Up / RT brakes reverse and returns to first gear."><kbd>ARROWS</kbd> DRIVE / REVERSE</span><span><kbd>SPACE</kbd> BOOST</span><span><kbd>C / B / V / X</kbd> FRONT / BACK / RIGHT / LEFT</span><span><kbd>D</kbd> RESET CAMERA</span><span><kbd>Q / E</kbd> MANUAL SHIFT</span><span><kbd>ESC</kbd> PAUSE</span></div><div class="build-meta"><span id="build-version" class="build-version" title="Build ${escapeHTML(BUILD_VERSION.id)}">BUILD ${escapeHTML(BUILD_VERSION.label)}</span><a class="build-label audio-credits" href="/assets/audio/credits.html" target="_blank" rel="noopener">ASSET CREDITS ↗</a></div></footer>
  </main>
  ${hudMarkup()}
  <div id="modal-layer" class="modal-layer" hidden></div><div id="renderer-error" class="renderer-error" role="alert" hidden><strong>The road couldn't load.</strong><span>Enable browser graphics acceleration, then try again.</span><button class="text-button" data-action="retry-renderer">RETRY GRAPHICS ↗</button></div><div id="renderer-loading" class="renderer-loading"><span></span> FINDING THE OPEN ROAD</div><button id="test-driver" class="test-driver" data-action="manual" hidden>TEST DRIVER ACTIVE · TAKE CONTROL</button>
</div></div>`;

}

export function createMenuScreen(ctx) {
  const {app, choices, profile, credits, escapeHTML, text, ui, root, coursePreview, time} = ctx;
  const refreshEntryReward=ctx.onEntryReward||updateEntryReward;
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
  refreshEntryReward();
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
  const preview=coursePreview.update(app.getMenuCourse(),app.getMenuRouteLabel(),app.getHiddenRoadDiscovery?.());
  text('scene-name',stage.name);text('scene-length',`${preview.distanceKm.toFixed(1)} KM · ${preview.laps} LAPS`);text('menu-route-label',app.getMenuRouteLabel().toUpperCase());
  if(stage.practice)text('scene-length','UNTIMED PLAYGROUND');
  root.querySelector('.start-note').textContent=stage.practice?'FREE PRACTICE · NO RACE REWARDS':`2 LAPS · ${Object.values(CARS).filter(car=>car.price>0||car.unlockRequirement).length} EARNABLE CARS · LOCAL PLAYER PROGRESS`;
  ui['menu-biome-legend'].innerHTML=preview.biomes.map(biome=>`<span><i style="--biome-color:${biome.color}" aria-hidden="true"></i>${escapeHTML(biome.label)}</span>`).join('');
  text('menu-shortcuts',preview.map.gates.length?`${preview.map.gates.length} GATES PER LAP`:preview.map.branches.length?`${preview.map.branches.length} DASHED SHORTCUT${preview.map.branches.length===1?'':'S'}`:'CLOSED CIRCUIT');ui['menu-elevation'].hidden=!preview.showElevation;text('menu-relief',`${preview.reliefMeters} M HEIGHT RANGE`);
  if(stage.practice)text('menu-shortcuts','JUMPS · CRUSH LANES · 4 KM DRAG STRIP');
  if(preview.map.hiddenRoad)text('menu-shortcuts','DOTTED ROAD TO RUSTWALL');
  ui['wasteland-visit'].hidden=!hiddenRoadHints(app.getHiddenRoadDiscovery?.()).showMenu;
  text('menu-location', {desert:'MOJAVE COUNTY, USA',alpine:'THE HIGH ALPINE PASS',coast:'PACIFIC COAST, USA',city:'HARBOR DISTRICT · AFTER DARK'}[stage.theme] || stage.name.toUpperCase());
  updateMenuCar();
}
  return {updateMenuCar, updateMenuScene, updatePlayers};
}

export function updateBuildNotice(ui, disposed, {available, version}) {
  if (disposed) return;
  ui['build-update'].hidden = !available;
  ui['build-update-message'].textContent = available ? `Update available · ${version.label}` : '';
}
