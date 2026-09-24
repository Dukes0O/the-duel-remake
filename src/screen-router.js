import {hiddenRoadHints,hiddenRoadMapKey} from './hidden-road-hints.js';
import {createRendererReadiness} from './screen-readiness.js';
import {screenMarkup, createMenuScreen, updateBuildNotice} from './screen-menu.js';
import {createPlayerScreen} from './screen-players.js';
import {createLeaderboardScreen} from './screen-leaderboard.js';
import {createGarageScreen, handleDriverAction, handleGarageUpgrade} from './screen-garage.js';
import {createArmoryScreen} from './screen-armory.js';
import {crewPanel} from './crew-ui.js';
import {CREW} from './crew.js';
import {courseScreen, createCourseActions} from './screen-courses.js';
import {createResultsScreen, screenAction} from './screen-results.js';
import {createHudScreen, presentJumpHeight} from './screen-hud.js';
import {createCombatHud, combatHudEnabled} from './combat-hud.js';
import {createHiddenRoadUi} from './hidden-road-ui.js';
import './hidden-road-ui.css';
import {WEAPONS, ufoDestination} from './combat.js';
import './screen-menu.css';
import './screen-players.css';
import './screen-leaderboard.css';
import './screen-garage.css';
import './screen-armory.css';
import './screen-territory.css';
import './crew-ui.css';
import './screen-courses.css';
import './screen-results.css';
import './screen-hud.css';
import './combat-hud.css';
import './style.css';
import {CARS, COURSE} from './config.js';
import {createProfile, isCarUnlocked} from './progression.js';
import {RouteMap} from './route-map.js';
import {CoursePreview} from './course-preview.js';
import {PAINT_PRESETS} from './paint-presets.js';
import {getRouteVariantForSeed, supportsRouteVariants} from './route-variants.js';
import {createJumpHeightReadout} from './jump-height.js';
import {createBuildUpdateChecker} from './build-update.js';
import {DRIVERS, getEquippedDriverId} from './drivers.js';
import {driverMenuMarkup} from './driver-ui.js';
import {isCourseUnlocked} from './course-access.js';
import {featureFlags} from './feature-flags.js';
import {experimentalPanel} from './experimental-ui.js';
import {parseCareerExport} from './career-backup.js';
import {importBudgetCareer} from './career-budget.js';

export function mountScreenRouter(app, downloadCareer, {budgetStorage, backupStore}) {
  const root = document.querySelector('#app');
const jumpHeightReadout = createJumpHeightReadout();
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
const sound = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const choices = app.getRaceChoices();
let uiDisposed=false,lastScreen, garageOpen = false, armoryOpen = false, garageCar = choices.car, armoryCar = choices.car, garageMessage = '', playersOpen=false,playerMessage='',backupMessage='',leaderboardOpen=false,experimentalOpen=false,experimentalStorageMessage='';
let coursesOpen=false,courseMessage='';
const domEvents=new AbortController();
const boardFilter={stage:choices.startStage,car:'',driverId:getEquippedDriverId(app.profile)};
const profile = () => app.profile || createProfile();
const credits = value => Math.floor(value || 0).toLocaleString();
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

root.innerHTML = screenMarkup({choices, arrow, sound, escapeHTML});
const hiddenRoadUi=createHiddenRoadUi({host:root.querySelector('#stage'),
  onChoose:choice=>app.chooseHiddenRoad(choice),onMenu:()=>app.requestNavigation('menu')});
// Presentation-only QA switch, absent from normal production builds.
const hiddenRoadUiQa=typeof __DUEL_QA__!=='undefined'&&__DUEL_QA__?{skipUpdate:false}:null;
if(hiddenRoadUiQa)window.__hiddenRoadUiQa=hiddenRoadUiQa;
let lastHiddenRoadView=null;

root.querySelector('.garage-tune').insertAdjacentHTML('beforebegin',driverMenuMarkup());
root.querySelector('.build-meta').insertAdjacentHTML('beforeend','<button type="button" id="experimental-open" class="build-label experimental-open" data-action="experimental" aria-label="Open Experimental features">EXPERIMENTAL</button>');
root.querySelector('.garage-tune').innerHTML='TUNE CAR & DRIVER <span>→</span>';
root.querySelector('.scene-line').insertAdjacentHTML('beforeend','<button type="button" class="course-store-button" data-action="courses" aria-label="Unlock or select courses">COURSES ↗</button>');
const weaponHud=document.createElement('section');weaponHud.className='weapon-hud';weaponHud.hidden=true;weaponHud.setAttribute('aria-label','Combat weapons');
const gamepadWeaponDirections={ufo:'↑',bomb:'→',crossbow:'↓',star:'←'};
const gamepadWeaponNames={ufo:'Up',bomb:'Right',crossbow:'Down',star:'Left'};
weaponHud.innerHTML=Object.entries(WEAPONS).map(([id,w])=>`<button type="button" data-weapon="${id}" title="${w.name} · Key ${w.key} · Gamepad D-pad ${gamepadWeaponNames[id]}" aria-label="${w.name}, keyboard ${w.key}, gamepad D-pad ${gamepadWeaponNames[id]}">${w.key} ${gamepadWeaponDirections[id]} · ${w.name}</button>`).join('')+'<span class="weapon-status"></span>';
root.querySelector('#overlay').append(weaponHud);const weaponStatus=weaponHud.querySelector('.weapon-status');
const weaponButtons=[...weaponHud.querySelectorAll('[data-weapon]')];
weaponHud.addEventListener('click',e=>{const button=e.target.closest('[data-weapon]');if(button)app.duel.fireWeapon(button.dataset.weapon);});
const combatHelp=document.createElement('p');combatHelp.className='combat-help';
const legacyCombatHelp='MAD MAX DUEL: 1 / D-pad ↑ short UFO jump (charges at first checkpoint each lap) · 2 / → eight-way bombs · 3 / ↓ crossbow · 4 / ← invincible star (5s). Glowing road power-ups instantly recharge a weapon. The rival fights back. Wrecks recover; finish first.';
const upgradedCombatHelp='MAD MAX DUEL: 1 / D-pad ↑ short UFO jump (once per lap) · 2 / → eight-way bombs · 3 / ↓ crossbow · 4 / ← invincible star (5s). Colored weapon crates recharge a used weapon; green crosses repair 25 armor. The rivals fight back. Wrecks recover; finish first.';
combatHelp.textContent=legacyCombatHelp;root.querySelector('.race-setup').append(combatHelp);
root.querySelector('#cpu-target-label').parentElement.insertAdjacentHTML('afterend',`<details id="rival-customization" class="rival-customization"><summary>CUSTOMIZE YOUR RIVAL</summary><div class="setup-line"><label class="field-label" for="rival-car">CAR</label><select id="rival-car"><option value="match">Match my car (default)</option>${Object.entries(CARS).map(([key,car])=>`<option value="${key}">${car.name}</option>`).join('')}</select></div><div class="setup-line"><label class="field-label" for="rival-driver">DRIVER</label><select id="rival-driver">${Object.values(DRIVERS).map(driver=>`<option value="${driver.id}">${driver.name}</option>`).join('')}</select></div><div class="setup-line"><label class="field-label" for="rival-upgrades">UPGRADES</label><select id="rival-upgrades">${['Stock','Level 1','Level 2','Max / Level 3'].map((label,i)=>`<option value="${i}">${label}</option>`).join('')}</select></div><p id="rival-skill-note" class="event-brief"></p><p class="event-brief">CPU difficulty still controls driving skill. Rival choices do not unlock cars or drivers for you. Custom rival bests are tracked separately.</p></details>`);
root.querySelector('.boost-readout .field-label').id='nitro-label';
const ui = Object.fromEntries([...root.querySelectorAll('[id]')].map(el => [el.id, el]));
const buildUpdates=createBuildUpdateChecker({
  getStatus:()=>uiDisposed?null:app.duel.state.status,
  signal:domEvents.signal,
  onChange:change=>updateBuildNotice(ui,uiDisposed,change),
});
const routeMap=new RouteMap(ui['route-map'],{getDiscovery:()=>app.getHiddenRoadDiscovery?.()});
let menuDiscoveryKey=null;
const coursePreview=new CoursePreview(ui['menu-course-map'],ui['menu-elevation-profile']);
if(import.meta.hot)import.meta.hot.dispose(()=>{uiDisposed=true;domEvents.abort();hiddenRoadUi.dispose();combatHud.dispose();app.dispose();readiness.dispose();routeMap.dispose();coursePreview.dispose();});
const text = (id,v) => { if (ui[id].textContent !== String(v)) ui[id].textContent = v; };
const clamp = v => Math.max(0,Math.min(1,Number(v)||0));
const time = seconds => { const t = Math.floor(Math.max(0, Number(seconds)||0)*100); return `${String(Math.floor(t/6000)).padStart(2,'0')}:${String(Math.floor(t/100)%60).padStart(2,'0')}.${String(t%100).padStart(2,'0')}`; };

const menuScreen = createMenuScreen({app, choices, profile, credits, escapeHTML, text, ui, root, coursePreview, time});
const {updateMenuCar, updateMenuScene, updatePlayers} = menuScreen;
const playerScreen = createPlayerScreen({app, profile, escapeHTML, credits, getPlayerMessage:()=>playerMessage, getBackupMessage:()=>backupMessage});
const leaderboardScreen = createLeaderboardScreen({app, boardFilter, escapeHTML, credits, time});
const garageScreen = createGarageScreen({app, profile, credits, escapeHTML, getGarageCar:()=>garageCar, getGarageMessage:()=>garageMessage, arrow, action:(label,verb,primary)=>screenAction(label,verb,primary,arrow), clamp});
const armoryScreen = createArmoryScreen({profile, credits, escapeHTML,
  getGarageMessage:()=>garageMessage, getArmoryCar:()=>armoryCar,
  kitsEnabled:()=>app.duel.featureFlags.enabled('wasteland2'),
  loadoutsEnabled:()=>app.duel.featureFlags.enabled('wasteland2'),
  crewEnabled:()=>app.duel.featureFlags.enabled('wasteland2'),
  action:(label,verb,primary)=>screenAction(label,verb,primary,arrow)});
const modalScreen = createResultsScreen({app, profile, credits, escapeHTML, time, arrow});
const updateHud = createHudScreen({app, ui, text, time, clamp, credits, routeMap});
const readiness = createRendererReadiness({app, ui, choices, profile, isDisposed:()=>uiDisposed});
const combatHud = createCombatHud({root, app,
  projectFootAim:()=>readiness.handle?.projectFootAim?.() || null,
  projectOpponents:()=>readiness.handle?.projectOpponents?.() || []});
const {ensureRenderer, syncRendererReadiness} = readiness;
const courseActions = createCourseActions({app, choices, setMessage:value=>courseMessage=value, setOpen:value=>coursesOpen=value, updateMenuScene, invalidate:()=>lastScreen=null, renderState:()=>renderState(app.duel.state)});

function refreshRaceSetup(){
  delete choices.rival;Object.assign(choices,app.getRaceChoices());garageCar=choices.car;updatePlayers();updateMenuScene();lastScreen=null;renderState(app.duel.state);
}
ui['ghost-toggle'].addEventListener('change',event=>app.setGhostEnabled(event.target.checked));
for(const id of ['rival-car','rival-driver','rival-upgrades'])ui[id].addEventListener('change',()=>{
  choices.rival={car:ui['rival-car'].value,driverId:ui['rival-driver'].value,upgradeLevel:Number(ui['rival-upgrades'].value)};
  updateMenuScene();
},{signal:domEvents.signal});
ui['lighting-mood'].addEventListener('change',event=>{app.setLightingMood(event.target.value);ui['lighting-mood'].value=app.lightingMood;});
ui['graphics-quality'].value=app.ambientOcclusionEnabled?'high':'performance';
ui['foot-camera']?.addEventListener('change',event=>{event.target.value=app.setFootCamera(event.target.value);},{signal:domEvents.signal});
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
function refreshArmory(message) {
  garageMessage = message || ''; lastScreen = null; renderState(app.duel.state);
}
root.addEventListener('click',e => {
  const button = e.target.closest('button,[data-action]'); if (!button) return;
  if(courseActions.handle(button))return;
  if(button.dataset.routeVariant){if(app.setRouteVariant(button.dataset.routeVariant))updateMenuScene();return;}
  if(button.dataset.challenge!=null){const stageIndex=Number(button.dataset.challenge);if(!isCourseUnlocked(profile(),stageIndex)){garageOpen=false;coursesOpen=true;courseMessage='Unlock the recommended course here, then select it.';lastScreen=null;renderState(app.duel.state);return;}choices.startStage=stageIndex;updateMenuScene();closeGarage();return;}
  if (button.dataset.garageCar) { garageCar = button.dataset.garageCar; app.menuCar = garageCar; garageMessage = ''; lastScreen = null; renderState(app.duel.state); return; }
  if(button.dataset.paint){const result=app.purchasePaint(garageCar,button.dataset.paint);refreshGarage(result.ok?`${PAINT_PRESETS[button.dataset.paint].name} applied to ${CARS[garageCar].name}.${result.purchased?` Purchased for ${credits(result.cost)} credits.`:''}`:result.reason);return;}
  if(handleDriverAction(button,{app,refreshGarage,root,garageCar,credits}))return;
  if(handleGarageUpgrade(button,{app,garageCar,refreshGarage,profile,credits}))return;
  if (button.dataset.car && !isCarUnlocked(profile(), button.dataset.car)) { openGarage(button.dataset.car); return; }
  for (const key of ['car','difficulty','mode','cpuDifficulty']) if (button.dataset[key]) { choices[key] = button.dataset[key];updateMenuScene();return; }
  if(button.dataset.weaponUpgrade){const result=app.purchaseWeapon(button.dataset.weaponUpgrade);refreshGarage(result.ok?'Weapon upgraded.':result.reason);return;}
  if(button.dataset.crewSelect){
    const result=app.selectCrewMember(button.dataset.crewSelect);
    const message=result.ok?`${CREW[result.id].name} selected for on-foot play.`:result.reason;
    if(armoryOpen)refreshArmory(message);else refreshGarage(message);
    return;
  }
  if(button.dataset.kitAction && app.duel.featureFlags.enabled('wasteland2')){
    const id=button.dataset.kitTier||null;
    const result=button.dataset.kitAction==='buy'?app.purchaseArmorKit(armoryCar,id):
      app.equipArmorKit(armoryCar,button.dataset.kitAction==='unequip'?null:id);
    refreshArmory(result.ok?(result.cost?'Armor kit purchased and equipped.':id?'Armor kit equipped.':'Armor kit removed.'):result.reason);
    return;
  }
  if(button.closest('form')&&button.type==='submit')return;
  e.preventDefault();
  switch (button.dataset.action) {
    case 'wasteland-visit': if(app.duel.state.status!=='menu'||!hiddenRoadHints(app.getHiddenRoadDiscovery?.()).showMenu)return;armoryOpen=coursesOpen=garageOpen=playersOpen=leaderboardOpen=experimentalOpen=false;app.visitWasteland();lastScreen=null;break;
    case 'start': armoryOpen = coursesOpen = garageOpen = playersOpen = leaderboardOpen = experimentalOpen = false; app.startCampaign(choices); break;
    case 'courses':if(app.duel.state.status!=='menu')return;coursesOpen=true;garageOpen=playersOpen=leaderboardOpen=false;courseMessage='';lastScreen=null;break;
    case 'courses-close':coursesOpen=false;lastScreen=null;break;
    case 'unlock-next':app.returnToMenu();Object.assign(choices,app.getRaceChoices());updateMenuScene();coursesOpen=true;garageOpen=playersOpen=leaderboardOpen=false;courseMessage='Completed race credits are safe. Unlock the next course, then select it.';lastScreen=null;break;
    case 'new-player':playersOpen=true;coursesOpen=leaderboardOpen=garageOpen=false;playerMessage=backupMessage='';lastScreen=null;renderState(app.duel.state);root.querySelector('#new-player-name')?.focus();return;
    case 'player-close':playersOpen=false;lastScreen=null;break;
    case 'career-export':
      if(app.duel.state.status!=='menu'||!playersOpen)return;
      void downloadCareer().then(()=>{backupMessage='Career file downloaded. Keep it somewhere safe.';lastScreen=null;renderState(app.duel.state);})
        .catch(error=>{backupMessage='Export failed: '+error.message;lastScreen=null;renderState(app.duel.state);});return;
    case 'career-import':
      if(app.duel.state.status!=='menu'||!playersOpen)return;
      root.querySelector('#career-import-file')?.click();return;
    case 'leaderboard':leaderboardOpen=true;coursesOpen=playersOpen=garageOpen=false;boardFilter.stage=choices.startStage;boardFilter.driverId=getEquippedDriverId(profile());lastScreen=null;break;
    case 'leaderboard-close':leaderboardOpen=false;lastScreen=null;break;
    case 'experimental': if(app.duel.state.status!=='menu')return;experimentalOpen=true;armoryOpen=coursesOpen=playersOpen=leaderboardOpen=garageOpen=false;experimentalStorageMessage='';lastScreen=null;break;
    case 'experimental-close':experimentalOpen=false;lastScreen=null;break;
    case 'armory': if(app.duel.state.status!=='menu')return;armoryOpen=true;armoryCar=choices.car;garageOpen=coursesOpen=playersOpen=leaderboardOpen=false;garageMessage='';lastScreen=null;break;
    case 'armory-close':armoryOpen=false;lastScreen=null;break;
    case 'garage': openGarage(); return;
    case 'garage-close': closeGarage(); return;
    case 'unlock-car': { const result = app.unlockCar(garageCar); if(result.ok) {choices.car = garageCar;updateMenuScene();}refreshGarage(result.ok ? `${CARS[garageCar].name} is yours. Ready for every course.` : result.reason); return; }
    case 'arena':choices.startStage=COURSE.findIndex(scene=>scene.arena);choices.car='titan_monster';updateMenuScene();closeGarage();return;
    case 'garage-select': choices.car = garageCar;updateMenuScene();closeGarage(); return;
    case 'sound': app.audio.unlock(); app.audio.toggleMute(); break;
    case 'camera': if(app.duel.state.onFoot)app.cycleFootCamera();else app.cycleCamera(); break;
    case 'pause': app.togglePause(); break;
    case 'resume': app.resume(); break;
    case 'restart': app.requestNavigation('restart'); break;
    case 'menu': armoryOpen = coursesOpen = garageOpen = playersOpen = leaderboardOpen = experimentalOpen = false; app.requestNavigation('menu');if(app.duel.state.status==='menu'){Object.assign(choices,app.getRaceChoices());updateMenuScene();}break;
    case 'next': app.nextStage(); break;
    case 'ticket': app.duel.ackTicket(); break;
    case 'reload-update': buildUpdates.requestReload(); return;
    case 'retry-renderer': if(readiness.handle&&ui.view3d.dataset.vehicleAsset==='error')readiness.handle.retryVehicle();else ensureRenderer(); break;
    case 'manual': app.autopilot = false; break;
    default: return;
  }
  renderState(app.duel.state);
},{signal:domEvents.signal});
root.addEventListener('submit',event=>{
  if(event.target.id!=='new-player-form')return;event.preventDefault();const input=root.querySelector('#new-player-name'),result=app.addPlayer(input.value);
  if(result.ok){playersOpen=false;Object.assign(choices,app.getRaceChoices());garageCar=choices.car;updatePlayers();updateMenuScene();}else playerMessage=result.reason;
  lastScreen=null;renderState(app.duel.state);if(!result.ok)root.querySelector('#new-player-name')?.focus();
},{signal:domEvents.signal});
root.addEventListener('change',event=>{
  if(event.target.matches('[data-loadout-slot]')){
    if(!armoryOpen)return;
    const slot=Number(event.target.dataset.loadoutSlot);
    const result=app.equipCarWeapon(slot,event.target.value);
    garageMessage=result.ok?'Car weapon slots saved.':result.reason;
    lastScreen=null;renderState(app.duel.state);
    root.querySelector(`[data-loadout-slot="${slot}"]`)?.focus({preventScroll:true});
    return;
  }
  if(event.target.matches('[data-kit-car]')){
    if(!armoryOpen||!app.duel.featureFlags.enabled('wasteland2'))return;
    armoryCar=event.target.value;garageMessage='';lastScreen=null;renderState(app.duel.state);return;
  }
  if(event.target.id==='career-import-file'){
    const file=event.target.files?.[0];if(!file||app.duel.state.status!=='menu'||!playersOpen)return;
    void (async()=>{
      try{
        const content=await file.text(),archive=parseCareerExport(content);
        const count=archive.entries['the-duel-players-v2']?JSON.parse(archive.entries['the-duel-players-v2']).players.length:1;
        if(!window.confirm('Replace every local player, record and setting with the '+count+' player career in '+file.name+'? The current save will be backed up first.'))return;
        await importBudgetCareer(content,{storage:budgetStorage.storage,store:backupStore});
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
function renderState(s) {
  buildUpdates.syncState();
  const discovery=app.getHiddenRoadDiscovery?.(),discoveryKey=hiddenRoadMapKey(discovery)+':'+(discovery?.pacificFinishes||0);
  if(s.status==='menu'&&discoveryKey!==menuDiscoveryKey){menuDiscoveryKey=discoveryKey;updateMenuScene();lastScreen=null;}
  const helpText=app.duel.featureFlags.enabled('wasteland2')?upgradedCombatHelp:legacyCombatHelp;
  if(combatHelp.textContent!==helpText)combatHelp.textContent=helpText;
  const combat=s.combat,upgradedCombat=combatHudEnabled(app.duel,s),hideWeaponHud=!combat||s.status==='menu'||upgradedCombat;
  if(weaponHud.hidden!==hideWeaponHud)weaponHud.hidden=hideWeaponHud;
  if(combat&&!upgradedCombat){
    const ufo=combat.cooldowns.ufo<=0&&s.status==='racing'?ufoDestination(app.duel):null;
    const ufoAction=ufo?.kind==='jump'?`JUMP +${Math.round(ufo.gainMeters)}m → ${Math.round(ufo.toS)}m`:ufo?.reason==='lap-used'?'USED THIS LAP':ufo?.reason==='charging'?'CHARGES AT GATE 1':ufo?.reason==='checkpoint'?'GATE AHEAD':ufo?'NO SAFE LANDING':'';
    for(const button of weaponButtons){
      const key=button.dataset.weapon,left=combat.cooldowns[key],blocked=key==='ufo'&&ufo?.kind==='blocked',disabled=s.status!=='racing'||s.paused||left>0||blocked;
      const label=key==='ufo'&&ufo?`${WEAPONS[key].key} ${gamepadWeaponDirections[key]} · ${ufoAction}`:`${WEAPONS[key].key} ${gamepadWeaponDirections[key]} · ${WEAPONS[key].name} L${combat.levels[key]} · ${left>0?Math.ceil(left)+'s':'READY'}`;
      const spokenLabel=`${WEAPONS[key].name}, level ${combat.levels[key]}, keyboard ${WEAPONS[key].key}, gamepad D-pad ${gamepadWeaponNames[key]}, ${ufo&&key==='ufo'?ufo.kind==='blocked'?ufoAction.toLowerCase():`jumps ${Math.round(ufo.gainMeters)} metres forward to route metre ${Math.round(ufo.toS)}; one use per lap`:left>0?Math.ceil(left)+' seconds to recharge':'ready'}`;
      if(button.disabled!==disabled)button.disabled=disabled;
      if(button.textContent!==label)button.textContent=label;
      if(button.getAttribute('aria-label')!==spokenLabel)button.setAttribute('aria-label',spokenLabel);
    }
    const status=(combat.shield>0?`INVINCIBLE · ${combat.shield.toFixed(1)}s`:`ARMORED DUEL · ${combat.hits} HITS`)+(ufo?` · UFO ${ufoAction}`:' · CPU WEAPONS ACTIVE');
    if(weaponStatus.textContent!==status)weaponStatus.textContent=status;
  }
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
    const modal=menu&&armoryOpen?armoryScreen():menu&&coursesOpen?courseScreen(profile(),choices.startStage,courseMessage):menu&&playersOpen?playerScreen():menu&&leaderboardOpen?leaderboardScreen():menu&&experimentalOpen?experimentalPanel(featureFlags,experimentalStorageMessage):menu && garageOpen ? garageScreen() : menu||showImpact?'':modalScreen(s); ui['modal-layer'].innerHTML=modal; ui['modal-layer'].hidden=!modal; ui.stage.classList.toggle('has-modal',!!modal); ui['countdown'].hidden=s.status!=='countdown'||!!s.paused;
    if(menu&&garageOpen&&app.duel.featureFlags.enabled('wasteland2'))
      ui['modal-layer'].querySelector('.driver-panel')?.insertAdjacentHTML(
        'afterend',crewPanel(profile(),escapeHTML));
    const challengeLabel=app.duel.stageDef?.kind==='chase'?'PURSUIT':s.objective||s.mode==='timetrial'?'TARGET':'CPU',routeLabel=supportsRouteVariants(app.duel.stageDef)?` · ${(getRouteVariantForSeed(s.seed)?.label||'Custom route').toUpperCase()}`:'';text('stage-label',`${app.player.name.toUpperCase()} · ${(s.cpuDifficulty||choices.cpuDifficulty).toUpperCase()} ${challengeLabel}${routeLabel}`); text('stage-name',app.duel.stageDef?.name||'The open road'); text('stage-objective',s.opponents?.length>1?(s.objective?.kind==='checkpointRush'?'PASS THE LIT CHECKPOINTS':s.objective?.kind==='driftTrial'?'BANK THE DRIFT TARGET':s.objective?.kind==='stuntTrial'?'COMPLETE THE STUNT TARGETS':app.duel.stageDef?.kind==='chase'?'ESCAPE THE PURSUIT':`BEAT ${s.opponents.length} OPPONENTS OVER TWO LAPS`):s.rival?'BEAT YOUR RIVAL OVER TWO LAPS':'CHASE YOUR CAR PERSONAL BEST');
    ui['pause-button'].setAttribute('aria-label',s.paused?'Resume race':'Pause race');
    if(modal) ui['modal-layer'].querySelector('button')?.focus({preventScroll:true});
  }
  text('experimental-open',featureFlags.experimental()?'EXPERIMENTAL · ON':'EXPERIMENTAL');
  const muted=!!app.audio?.muted; ui['sound-toggle'].classList.toggle('muted',muted); ui['sound-toggle'].setAttribute('aria-label',muted?'Enable sound':'Mute sound'); text('sound-caption',muted?'SOUND OFF':'SOUND ON'); ui['test-driver'].hidden=!app.autopilot;
  presentJumpHeight(jumpHeightReadout,s,app,ui,text);
  if(s.status!=='menu') updateHud(s);
  combatHud.update(s);
  const journeyView=hiddenRoadUiQa?.skipUpdate?lastHiddenRoadView:hiddenRoadUi.update(s,app.duel.course);
  lastHiddenRoadView=journeyView;
  ui.stage.classList.toggle('hidden-road-active',!!journeyView?.active);
  const hudOpacity=String(journeyView?.hudOpacity??1);
  if(ui.stage.style.getPropertyValue('--hidden-road-hud-opacity')!==hudOpacity)
    ui.stage.style.setProperty('--hidden-road-hud-opacity',hudOpacity);
}
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&(armoryOpen||coursesOpen||garageOpen||playersOpen||leaderboardOpen||experimentalOpen)){e.preventDefault();armoryOpen=coursesOpen=garageOpen=playersOpen=leaderboardOpen=experimentalOpen=false;lastScreen=null;updateMenuCar();renderState(app.duel.state);return;}if(e.code!=='Tab'||ui['modal-layer'].hidden)return;const buttons=[...ui['modal-layer'].querySelectorAll('button:not(:disabled),select,input,summary')],first=buttons[0],last=buttons.at(-1);if(!first)return;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}},{signal:domEvents.signal});
app.onFrame=renderState;updatePlayers();updateMenuCar();updateMenuScene();renderState(app.duel.state);ensureRenderer();app.start();
  return {refreshRaceSetup};
}
