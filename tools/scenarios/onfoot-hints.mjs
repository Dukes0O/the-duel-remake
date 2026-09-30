import {COURSE} from '../../src/config.js';
import {COMBAT_TUNING} from '../../src/wasteland-tuning.js';

const key = (context, type, code, name, virtual) => context.command(
  'Input.dispatchKeyEvent', {type, code, key: name, windowsVirtualKeyCode: virtual});
const interact = (context, held) => key(context, held ? 'keyDown' : 'keyUp', 'KeyF', 'f', 70);
const STEP = 1 / 120;
const kphPerMph = COMBAT_TUNING.armor.kphPerMph;

async function refresh(context) {
  await context.evaluate('window.__render.renderFrame(); window.__qaApp.onFrame?.(window.__qaApp.duel.state, 0)');
}
async function advance(context, ticks) {
  await context.evaluate('window.__qaApp.advance(' + ticks + '/120, 1/120)');
  await refresh(context);
}
async function prepare(context, mode = 'wasteland', stage = 0, direct = false) {
  await context.evaluate('(() => { const a = window.__qaApp; ' +
    (direct ? 'a.duel.startCampaign' : 'a.startCampaign') +
    '({mode:' + JSON.stringify(mode) + ',startStage:' + stage + ',seed:1989,car:"falcone_f42"});' +
    'a.stop(); const s = a.duel.state;' +
    'Object.assign(s,{status:"racing",countdown:0,paused:false,s:500,prevS:500,' +
    'lateral:0,prevLateral:0,speedMph:0,traffic:[],opponents:[]});' +
    'if(s.combat){s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;}' +
    'a.onFrame?.(s,0); window.__render.renderFrame(); })()');
  await context.waitFor('window.__qaApp.visualReady === true', 'hint race renderer', 60_000);
  await refresh(context);
}
async function sample(context) {
  return context.evaluate('(() => {const a=window.__qaApp,s=a.duel.state,' +
    'h=document.querySelector("#onfoot-hint"),f=s.fighter;' +
    'return {onFoot:!!s.onFoot,health:f?.health,maxHealth:f?.maxHealth,' +
    'needsRelease:s.footTransition?.needsRelease,hidden:h.hidden,text:h.textContent,' +
    'mode:s.mode,context:a.activeInputContext(),objective:s.objective?.kind};})()');
}
async function expectHint(context, pattern) {
  const state = await sample(context);
  if (state.hidden || !pattern.test(state.text))
    throw Error('Missing hint ' + pattern + ': ' + JSON.stringify(state));
  return state;
}
async function expectNoHint(context, label) {
  const state = await sample(context);
  if (!state.hidden || state.text !== '')
    throw Error(label + ' retained a hint: ' + JSON.stringify(state));
  return state;
}
async function layout(context, label) {
  const bounds = await context.evaluate(
    '(() => {const hint=document.querySelector("#onfoot-hint"),r=hint.getBoundingClientRect();' +
    'if(hint.hidden||r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)' +
    'throw Error("Hint is outside the viewport");' +
    'if(hint.scrollWidth>hint.clientWidth||hint.scrollHeight>hint.clientHeight)' +
    'throw Error("Hint text is clipped");' +
    'const overlaps=[];for(const selector of [".route-hud",".race-health",".speedometer",' +
    '".combat-slot-bar",".combat-foot-car",".combat-foot-gear","#style-score-panel"]){' +
    'const n=document.querySelector(selector);if(!n||n.hidden||!n.getClientRects().length)continue;' +
    'const b=n.getBoundingClientRect();if(b.width&&b.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)' +
    'overlaps.push(selector);}' +
    'if(overlaps.length)throw Error("Hint covers HUD: "+overlaps.join(", "));' +
    'return {width:innerWidth,height:innerHeight,hint:r.toJSON()};})()');
  await context.screenshot(label);
  return bounds;
}
async function qualityRun(context, quality) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=wasteland2,scrapdome,hidden-road');
  await context.waitFor('!!window.__qaApp && !!window.__render && window.__qaApp.visualReady',
    'private memory-only hint menu', 60_000);
  await context.evaluate('(() => {const a=window.__qaApp;' +
    'if(!window.name.startsWith("__duel_qa_tab_v2:"))throw Error("Memory-only storage required");' +
    'a.stop();a.audio.setMuted(true);a.profile={...a.profile,wasteland:{...a.profile.wasteland,discoveredGate:true}};if(!a._saveProfile())throw Error("Temporary gate discovery fixture failed");a.setGraphicsQuality(' + JSON.stringify(quality) + ');' +
    'document.head.insertAdjacentHTML("beforeend","<style>body > details{display:none!important}</style>");})()');
  await prepare(context);
  const initial = await expectHint(context, /F.*keyboard.*X.*gamepad.*0\.4.*40.*1 s.*25.*health/);
  const desktop = await layout(context, quality + '-exit-hint-desktop');

  // These are production key events; no onFoot state or transition is assigned.
  await key(context, 'keyDown', 'KeyX', 'x', 88);
  await advance(context, 50);
  await key(context, 'keyUp', 'KeyX', 'x', 88);
  if (await context.evaluate('window.__qaApp.duel.state.onFoot || window.__qaApp.cameraMode !== "left"'))
    throw Error('Keyboard X must select the car camera without exiting');
  await context.evaluate('window.__qaApp.setCamera("chase")');
  await interact(context, true);
  await advance(context, 47);
  if ((await sample(context)).onFoot) throw Error('Normal exit happened before 0.4 seconds');
  await advance(context, 1);
  const exited = await expectHint(context, /Release.*0\.6.*3\.5/);
  if (!exited.onFoot || exited.context !== 'foot' || exited.health !== exited.maxHealth)
    throw Error('Normal exit did not preserve fighter health: ' + JSON.stringify(exited));
  await context.command('Input.dispatchKeyEvent', {type:'keyDown',code:'KeyF',key:'f',windowsVirtualKeyCode:70,autoRepeat:true});
  await advance(context, 90);
  if (!(await sample(context)).onFoot) throw Error('Continued hold reentered without release');
  await layout(context, quality + '-release-hint-desktop');
  await interact(context, false);
  await advance(context, 1);
  await expectHint(context, /^Hold.*0\.6.*3\.5/);
  await interact(context, true);
  await advance(context, 71);
  if (!(await sample(context)).onFoot) throw Error('Reentry happened before 0.6 seconds');
  await advance(context, 1);
  if ((await sample(context)).onFoot) throw Error('Fresh 0.6-second hold did not reenter');
  await interact(context, false);
  await advance(context, 1);

  // Emulate the hardware Gamepad API; the real App input poll maps button 2.
  await context.evaluate('(() => {window.__hintPad={connected:true,axes:[0,0,0,0],' +
    'buttons:Array.from({length:17},()=>({pressed:false,value:0}))};' +
    'window.__hintGetGamepads=navigator.getGamepads;' +
    'navigator.getGamepads=()=>[window.__hintPad];window.__hintPad.buttons[2]={pressed:true,value:1};})()');
  await advance(context, 48);
  if (!(await sample(context)).onFoot) throw Error('Gamepad X did not exit');
  await advance(context, 90);
  if (!(await sample(context)).onFoot) throw Error('Gamepad hold bypassed release');
  await context.evaluate('window.__hintPad.buttons[2]={pressed:false,value:0}');
  await advance(context, 1);
  await context.evaluate('window.__hintPad.buttons[2]={pressed:true,value:1}');
  await advance(context, 72);
  if ((await sample(context)).onFoot) throw Error('Gamepad X did not reenter');
  await context.evaluate('navigator.getGamepads=window.__hintGetGamepads;delete window.__hintPad;delete window.__hintGetGamepads');
  await advance(context, 1);

  await interact(context, true);
  await advance(context, 48);
  await interact(context, false);
  await advance(context, 1);
  await key(context, 'keyDown', 'KeyW', 'w', 87);
  await advance(context, 96);
  await key(context, 'keyUp', 'KeyW', 'w', 87);
  const distant = await expectHint(context, /Move closer.*0\.6.*3\.5/);
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await refresh(context);
  const phone = await layout(context, quality + '-reentry-hint-phone');
  await key(context, 'keyDown', 'Escape', 'Escape', 27);
  await key(context, 'keyUp', 'Escape', 'Escape', 27);
  await refresh(context);
  await expectNoHint(context, 'Pause');

  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await prepare(context);
  await interact(context, true);
  // Only speed is fixed at the precise boundary; real input/sim perform bailout.
  await context.evaluate('(() => {const a=window.__qaApp;for(let i=0;i<119;i++){' +
    'a.duel.state.speedMph=40/' + kphPerMph + ';a.advance(1/120,1/120);}})()');
  await refresh(context);
  if ((await sample(context)).onFoot) throw Error('Bailout happened before one second');
  await expectHint(context, /40 km\/h or above.*hold 1 s.*25 health/);
  await context.evaluate('window.__qaApp.duel.state.speedMph=40/' + kphPerMph + ';window.__qaApp.advance(1/120,1/120)');
  await refresh(context);
  const bailed = await sample(context);
  if (!bailed.onFoot || bailed.health !== bailed.maxHealth - 25)
    throw Error('Exact 40 km/h bailout did not cost 25 health: ' + JSON.stringify(bailed));
  await expectNoHint(context, 'Bailout tumble');
  await interact(context, false);
  await advance(context, 110);

  for (const mode of ['duel', 'timetrial']) {
    await prepare(context, mode);
    await expectNoHint(context, mode);
    await interact(context, true);
    await advance(context, 132);
    if ((await sample(context)).onFoot) throw Error(mode + ' accepted car exit');
    await interact(context, false);
  }
  const stuntIndex = COURSE.findIndex(stage => stage.stuntTrial);
  await prepare(context, 'wasteland', stuntIndex, true);
  const objective = await expectNoHint(context, 'Stunt objective');
  if (objective.objective !== 'stuntTrial') throw Error('Objective fixture did not start an actual stunt trial');
  await interact(context, true);
  await advance(context, 132);
  if ((await sample(context)).onFoot) throw Error('Objective accepted car exit');
  await interact(context, false);
  await context.evaluate('(() => {const a=window.__qaApp;a.duel.startArenaEvent({seed:1989,car:"falcone_f42",opponents:[{car:"stuttgart_959s"}]});a.stop();a.duel.state.status="racing";a.onFrame?.(a.duel.state,0);})()');
  await refresh(context);
  await expectNoHint(context, 'Scrapdome arena');
  console.log(quality + ': actual F exit/release/reentry, keyboard X camera, gamepad X exit/reentry, distant hint, exact bailout, pause/mode/objective/arena exclusions passed. ' +
    JSON.stringify({initial:initial.text,exited:exited.text,distant:distant.text,health:bailed.health,desktop,phone}));
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await qualityRun(context, quality);
  await context.navigate('/tools/menu-check.html?flags=');
  await context.waitFor('!!window.__qaApp && !!window.__render && window.__qaApp.visualReady', 'flag-off hint menu', 60_000);
  // wasteland2 is released on; the real race view disables it before discovery.
  await context.evaluate('(() => {const a=window.__qaApp;' +
    'a.profile={...a.profile,wasteland:{...a.profile.wasteland,discoveredGate:false}};' +
    'if(!a._saveProfile())throw Error("Temporary undiscovered-player fixture failed");})()');
  await prepare(context);
  if (await context.evaluate('window.__qaApp.duel.featureFlags.enabled("wasteland2")'))
    throw Error('Undiscovered player did not disable the real race Wasteland rules');
  await expectNoHint(context, 'wasteland2 off');
  await interact(context, true);
  await advance(context, 132);
  if ((await sample(context)).onFoot) throw Error('Flag-off Wasteland accepted car exit');
  await interact(context, false);
}
