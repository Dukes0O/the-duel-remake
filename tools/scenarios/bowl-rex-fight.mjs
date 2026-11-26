// BOWL-REX-FIGHT: night five's Scrapasaurus in the production UI, memory-only saves. A memory-only
// player who has won nights one to four opens night five on Easy, goes straight to the fight, and
// the pictures show the chest glow, followed by the fire with no floor marking,
// and the rest with a battery box open. Then a child-pace driver in the page plays the fight to the
// end; the results name the yard, the purse is paid once, and the yard has its Scrapasaurus.
// BOWL-REX-3, behind its own switch: with BOWL_REX_3=1 the page also turns on `bowl-rex-3`, and the driver meets
// the eye beam after the first box and a bomb after the second, turns across the red line, keeps 8 m from the bomb,
// and still wins. Without it the fight is the released one, and the same driver plays it as before.
// Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

// Shared with the ten-seed headless drive. Controls are the same ones a
// child has: wait for the eye, tap F, then drive straight past the tired beast.
// BOWL-REX-3: it also turns across the red line while the line follows, drives 8 m or more
// from a bomb once it has landed, and never hooks a bomb. It sees each tell 0.3 seconds late.
// Self-contained: the browser scenario sends this function's text into the page.
export function childDrive(duel, driver) {
  const s=duel.state, f=s.bowlNight?.event?.rex;
  if(s.status!=='racing'||!f)return;
  const h=f.hook, mark=f.marker, dt=1/120, late=.3;
  driver.elapsed=(driver.elapsed||0)+dt;
  let throttle=0,brake=0,steer=0,interact=false;
  const clamp=v=>Math.max(-1,Math.min(1,v)), turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const heading=duel.course.at(s.s).heading+(s.headingError||0), here=duel.course.groundAt(s.s,s.lateral);
  // Drive towards a world heading: forward when it is ahead, backing up when it is behind.
  // At its own pace, as a child drives (16 to 19 mph), not flat out.
  const pace=driver.pace||18;
  const head=desired=>{
    const ahead=turn(heading-desired);
    if(Math.abs(ahead)<=Math.PI/2)return {throttle:s.speedMph<pace ? 1 : 0,brake:s.speedMph<-.5 ? 1 : 0,steer:clamp(ahead*1.8)};
    return {throttle:s.speedMph>.5 ? 1 : 0,brake:s.speedMph>-pace ? 1 : 0,steer:clamp(-turn(heading-desired-Math.PI)*1.8)};
  };
  const line=f.beam, bomb=f.bomb?.phase==='lying' && !f.bomb.onCable ? f.bomb : null;
  driver.lineSeen=line ? driver.lineSeen??driver.elapsed : null;
  driver.bombSeen=bomb ? driver.bombSeen??driver.elapsed : null;
  const across=line && driver.elapsed-driver.lineSeen>=late;
  const fromBomb=bomb ? Math.hypot(here.x-bomb.x,here.z-bomb.z) : Infinity;
  const flee=bomb && fromBomb<9 && driver.elapsed-driver.bombSeen>=late && h.phase!=='attached';
  if(!line)driver.acrossSide=null;
  if(across){
    // Across the line, not along it, towards the side of the floor with more room, and back the
    // other way before a wall: the floor is 20 m either side of its middle.
    const side=duel.course.groundAt(s.s,s.lateral+1), outward=Math.atan2(side.x-here.x,side.z-here.z);
    const square=sign=>line.heading+sign*Math.PI/2;
    const gain=sign=>Math.cos(turn(square(sign)-outward)), edge=duel.course.def.scrapdome?.floorHalfWidth??20;
    driver.acrossSide??=gain(1)*(s.lateral<0 ? 1 : -1)>0 ? 1 : -1;
    if(gain(driver.acrossSide)*s.lateral>0 && Math.abs(s.lateral)>edge-5)driver.acrossSide*=-1;
    ({throttle,brake,steer}=head(square(driver.acrossSide)));
  }else if(flee){
    // Away along the floor, the open way round the ring, in whichever direction leaves the bomb behind.
    const along=duel.course.at(s.s).heading, away=Math.atan2(here.x-bomb.x,here.z-bomb.z);
    ({throttle,brake,steer}=head(Math.cos(turn(away-along))>=0 ? along : along+Math.PI));
  }else if(h.phase==='flying'||h.phase==='attached'){
    // Ease onto the back cable without a run-up. Once tight, keep the throttle down.
    throttle=h.box===1 && !h.tight ? (s.speedMph<13 ? .2 : 0) : 1;
  }else if(h.phase==='dragging'){
    if(f.phase!=='fallen' && !s.input.interact)interact=true;
    if(f.phase==='fallen')throttle=s.speedMph<12 ? .6 : 0;
    else brake=s.speedMph>0 ? 1 : 0;
  }else if(mark?.canBite){
    driver.aim=(driver.aim||0)+dt;
    if(driver.aim>=(driver.reaction||.45) && !s.input.interact){
      interact=true;throttle=1;driver.aim=0;
    }
  }else{
    driver.aim=0;
    const L=duel.course.length;
    const ds=((f.s-s.s+1.5*L)%L)-L/2;
    const target=f.places.rail-f.places.side*(driver.lane||10);
    // Back up on the inside lane until the open ring is ahead of the nose.
    if(ds<8 || s.speedMph>(driver.slowTween ? driver.pace : 4))brake=1;
    else if(ds>19 && s.speedMph<(driver.pace||18))throttle=.85;
    // Brake and throttle held together slow the reverse before the next shot.
    if(ds>=13 && s.speedMph<-.6)throttle=1;
    const sign=s.speedMph<-.5 ? -1 : 1;
    const wobble=(driver.wobble||0)*Math.sin(driver.elapsed*1.8+(driver.wobblePhase||0));
    steer=Math.max(-1,Math.min(1,(s.lateral-target)*.18+sign*s.headingError*1.8+wobble));
  }
  duel.setInput({throttle,brake,steer,boost:driver.useSpace!==false && h.phase==='attached' && h.box===1 && f.braced,interact});
}

// Each page expression is self-contained and can be checked without a browser.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Scrapasaurus test').ok) throw Error('Could not create the memory-only player');
    // This memory-only player has won nights one to four. The picker reloads the player from (memory-only)
    // storage, so the wins are saved through the app's own save, not only set on the page's copy.
    const bowl = app.profile.bowl || {};
    app.profile = {...app.profile, bowl: {...bowl, version: 1, nightsWon: [1, 2, 3, 4], settledNights: ['night:1', 'night:2', 'night:3', 'night:4'],
      trophies: ['show-night-1', 'show-night-2', 'show-night-3', 'show-night-4']}};
    if (app._saveProfile() === false) throw Error('Could not save the wins of the memory-only player');
    if (app.showNightChoices()?.nights[4]?.state !== 'open') throw Error('Night five is not open after nights one to four: ' + JSON.stringify(app.showNightChoices()?.nights));
    window.__rexCues = [];
    const play = app._showNightCue.bind(app);
    app._showNightCue = id => { window.__rexCues.push(id); return play(id); };
    app.advance(1); app.onFrame?.(app.duel.state); return true; })()`,
  menuButton: `(() => { const button = document.querySelector('#show-night-visit'); return !!button && !button.hidden; })()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  openPicker: `(() => { document.querySelector('#show-night-visit').click(); return true; })()`,
  picker: `(() => !!document.querySelector('.bowl-panel [data-action="show-night-start"][data-night="5"]'))()`,
  noRexYet: `(() => window.__qaApp.bowlRexInYard() === false)()`,
  easy: `(() => { document.querySelector('[data-action="show-night-level"][data-level="easy"]').click(); return true; })()`,
  start: `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-start"][data-night="5"]').click(); document.querySelector('[data-action="show-night-confirm"]').click(); return true; })()`,
  onNightFive: `(() => { const state = window.__qaApp.duel.state, night = state.bowlNight;
    return state.status !== 'menu' && night?.night === 5 && night.event.type === 'freestyle'; })()`,
  // Straight to the night's third event. The earlier two have their own scenarios.
  toFight: `(() => { const app = window.__qaApp, night = app.duel.state.bowlNight;
    night.show = {...night.show, eventIndex: 2}; night.phase = 'result';
    night.lastResult={event:'lastTruckRolling',won:true,score:0,knockouts:0};
    night.resultAt=night.clock-3;app.duel.state.status='bowl_break';
    app.onFrame?.(app.duel.state);return true; })()`,
  guide: `(() => document.querySelectorAll('.bowl-rex-guide svg').length===3 && document.querySelector('.bowl-rex-guide').textContent.includes('press F'))()`,
  next: `(() => {document.querySelector('[data-action="show-night-next"]').click();return true;})()`,
  // Night five's first event is drawn (the game's readiness gate, the Titan, the stadium) before anything
  // is replaced, as BOWL-RIVALS' scenario does: jumping on while the renderer still prepares the first
  // event's world met a warm-up fault on the laptop (QA-SUMMIT-WARMUP-EXCEPTION).
  firstDrawn: `(() => { const app = window.__qaApp, view = window.__render, canvas = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    if (!app.visualReady || canvas?.parentElement?.dataset?.vehicleAsset !== 'ready' || !view?.scene) return false;
    let titan = false; view.scene.traverse(node => { if (node.userData?.vehicleKey === 'titan_monster' && node.visible) titan = true; });
    return titan && !!view.scene.getObjectByName('Bowl stadium, floodlights and crowd'); })()`,
  hud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('THE SCRAPASAURUS'); })()`,
  phase: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase ?? null)()`,
  // The HUD is drawn at once, the world later (the Titan is 14 MB, the Scrapasaurus 1.5 MB, on a real GPU):
  // wait until the game is ready to show frames and the stadium, the Titan and the Scrapasaurus are in the picture.
  drawn: `(() => { const app = window.__qaApp, view = window.__render, canvas = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    if (!app.visualReady || canvas?.parentElement?.dataset?.vehicleAsset !== 'ready' || !view?.scene) return false;
    let titan = false; view.scene.traverse(node => { if (node.userData?.vehicleKey === 'titan_monster' && node.visible) titan = true; });
    const rex = view.scene.getObjectByName('Scrapasaurus model');
    return titan && !!view.scene.getObjectByName('Bowl stadium, floodlights and crowd') && !!rex && rex.parent?.visible !== false; })()`,
  // Where the fight stands, for a timeout's report.json: the Rex, its boxes and rests, the truck and the dropped car.
  fightState: `(() => { const app = window.__qaApp, s = app.duel.state, night = s.bowlNight, rex = night?.event?.rex;
    return JSON.stringify({status:s.status,phase:rex?.phase,hook:rex?.hook.phase,
      boxes:rex?.boxes,pulls:rex?.hook.pulls,marker:rex?.marker,
      truck:{s:s.s,lateral:s.lateral,mph:s.speedMph},
      autopilot: app.autopilot === true, visualReady: app.visualReady,
      warmupStatus: document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]')?.parentElement?.dataset?.warmupStatus ?? null,
      rexModel: !!window.__render?.scene?.getObjectByName('Scrapasaurus model'),
      card: document.querySelector('.bowl-result')?.dataset.bowlResult ?? null}); })()`,
  tell: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'tell')()`,
  fire: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'fire')()`,
  rest: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'rest')()`,
  restGoal: `(() => document.querySelector('.bowl-hud-goal')?.textContent === 'HOOK THE GLOWING BOX')()`,
  tellDrawn: `(() => { const scene = window.__render?.scene; return !scene?.getObjectByName('Scrapasaurus fire cone') &&
    !!scene?.getObjectByName('Scrapasaurus chest glow')?.visible && !scene.getObjectByName('Scrapasaurus fire')?.visible; })()`,
  fireDrawn: `(() => { const scene = window.__render?.scene; return !scene?.getObjectByName('Scrapasaurus fire cone') &&
    !!scene?.getObjectByName('Scrapasaurus fire')?.visible; })()`,
  // Whether the fight showed an eye beam or a bomb (BOWL-REX-3), read from the fight's state.
  newAttacks: `(() => JSON.stringify(window.__rexSeen ?? {beam: false, bomb: false}))()`,
  driver: `(() => { const app=window.__qaApp, control=${childDrive.toString()}, driver={};
    window.__rexSeen={beam:false,bomb:false};
    app._driveAutopilot=function(){
      if(!driver.firstTap && this.duel.state.bowlNight?.event?.rex?.marker?.canBite){
        driver.firstTap=true;this.autopilot=false;return;
      }
      if(!driver.firstBrace && this.duel.state.bowlNight?.event?.rex?.braced){
        driver.firstBrace=true;this.autopilot=false;return;
      }
      const fight=this.duel.state.bowlNight?.event?.rex;
      if(fight?.beam)window.__rexSeen.beam=true;if(fight?.bomb)window.__rexSeen.bomb=true;
      control(this.duel,driver);
    };app.autopilot=true;return true; })()`,
  manual: `(() => { window.__qaApp.autopilot = false; return true; })()`,
  // A card after an event, or the night's results after its last event (which has no NEXT EVENT button).
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result'))()`,
  cardWon: `(() => { const result = window.__qaApp.duel.state.bowlNight?.lastResult; return result?.event === 'scrapasaurus' && result.won === true && result.boxes === 3; })()`,
  nightDone: `(() => window.__qaApp.duel.state.bowlNight?.phase === 'complete' && !!document.querySelector('[data-bowl-result="night"]'))()`,
  nightYard: `(() => document.querySelector('[data-bowl-result="night"]').textContent.includes('stand in your yard'))()`,
  scrap: `(() => window.__qaApp.profile.wasteland?.scrap ?? 0)()`,
  rexInYard: `(() => window.__qaApp.bowlRexInYard() === true)()`,
  cues: `(() => JSON.stringify(window.__rexCues))()`,
  leave: `(() => { document.querySelector('[data-action="show-night-leave"][data-to="menu"]').click(); return true; })()`,
  menu: `(() => window.__qaApp.duel.state.status === 'menu' && !window.__qaApp.duel.state.bowlNight)()`,
};

const picture = async (context, name) => { await context.evaluate(page.frame); await context.screenshot(name); };
// Wait for a step of the fight; on a timeout the error (and so report.json) carries the fight's state.
async function waitInFight(context, expression, label, timeout) {
  try { await context.waitFor(expression, label, timeout); }
  catch (error) {
    let state = 'unreadable';
    try { state = await context.evaluate(page.fightState); } catch {}
    throw Error(`${error.message} Fight state: ${state}`);
  }
}

export async function run(context) {
  const rex3 = process.env.BOWL_REX_3 === '1';
  await context.navigate('/tools/menu-check.html?flags=titan-bowl' + (rex3 ? ',bowl-rex-3' : ''));
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.menuButton, 'SHOW NIGHT on the main menu', 30000);
  assert.ok(await context.evaluate(page.noRexYet), 'before night five the yard has no Scrapasaurus');
  await context.evaluate(page.openPicker);
  await context.waitFor(page.picker, 'the picker offers night five to a player who has won night four', 10000);
  await context.evaluate(page.easy);
  await picture(context, 'bowl-rex-picker');

  await context.evaluate(page.start);
  await context.waitFor(page.onNightFive, 'night five starts', 60000);
  await waitInFight(context, page.firstDrawn, 'night five\'s first event is drawn', 240000);
  assert.ok(await context.evaluate(page.toFight), 'the night goes on to its third event, the fight');
  await context.waitFor(page.guide,'three pictured tow instructions before the fight',10000);
  await picture(context,'bowl-rex-tow-instructions');
  await context.evaluate(page.next);
  await waitInFight(context, page.hud, 'the HUD names the Scrapasaurus', 60000);
  await waitInFight(context, page.drawn, 'the stadium, the Titan and the Scrapasaurus are drawn', 240000);

  await picture(context, 'bowl-rex-start');
  // The truck waits at the Car Park Gate for the first breath.
  await waitInFight(context, page.tell, 'its tell where it rests', 120000);

  await picture(context, 'bowl-rex-chest-tell');
  assert.equal(await context.evaluate(page.tellDrawn), true, 'the chest glows before fire without a mark on the floor');
  await waitInFight(context, page.fire, 'the fire', 15000);
  await picture(context, 'bowl-rex-fire');
  assert.equal(await context.evaluate(page.fireDrawn), true, 'the flames burn with no floor marking');
  await waitInFight(context, page.rest, 'its rest with a battery box open', 15000);
  assert.ok(await context.evaluate(page.restGoal), 'the HUD says to hook the open box');

  await picture(context, 'bowl-rex-rest-box-open');

  const scrapBefore = await context.evaluate(page.scrap);
  await context.evaluate(page.driver);
  await waitInFight(context, 'window.__qaApp.autopilot === false', 'the first open eye is in reach', 90000);
  const hookKey={key:'f',code:'KeyF',windowsVirtualKeyCode:70};
  await context.command('Input.dispatchKeyEvent',{...hookKey,type:'keyDown'});
  try {
    await waitInFight(context,"window.__qaApp.duel.state.bowlNight.event.rex.hook.phase === 'attached'",'F catches the first eye',5000);
  } finally {
    await context.command('Input.dispatchKeyEvent',{...hookKey,type:'keyUp'});
  }
  await context.evaluate('window.__qaApp.autopilot = true');
  await waitInFight(context,'window.__qaApp.autopilot === false','back cartridge braces',180000);
  const driveKeys=[{code:'KeyW',key:'w',windowsVirtualKeyCode:87},{code:'Space',key:' ',windowsVirtualKeyCode:32}];
  try{
    for(const key of driveKeys)await context.command('Input.dispatchKeyEvent',{...key,type:'keyDown'});
    await waitInFight(context,'window.__qaApp.duel.state.bowlNight.event.rex.boxes[1]','W and Space pull the back cartridge free',15000);
  }finally{
    for(const key of driveKeys)await context.command('Input.dispatchKeyEvent',{...key,type:'keyUp'});
  }
  await context.evaluate('window.__qaApp.autopilot = true');
  await waitInFight(context,"window.__qaApp.duel.state.bowlNight.event.rex.phase === 'fallen'",'the third cartridge falls',180000);
  await context.evaluate(`(() => {
    const start=performance.now(),samples=[];
    window.__rexFallSamples=samples;
    const sample=()=>{
      const rex=window.__qaApp.duel.state.bowlNight.event.rex;
      samples.push({ms:performance.now()-start,card:!!document.querySelector('.bowl-result'),drag:rex.hook.phase==='dragging'});
      if(!samples.at(-1).card)requestAnimationFrame(sample);
    };
    sample();
  })()`);
  try { await waitInFight(context, page.card, 'the fight ends', 420000); }
  finally { await context.evaluate(page.manual); }
  const samples=await context.evaluate('window.__rexFallSamples');
  assert.ok(samples.some(sample=>sample.ms>=9500 && sample.drag && !sample.card),'the final tow and fall stay on screen');
  await picture(context, 'bowl-rex-card');
  assert.ok(await context.evaluate(page.cardWon), 'the child-pace driver wins on Easy, all three cartridges extracted');
  // The fight is night five's last event, so its end is the night's results; any other card goes on to them.
  if (!await context.evaluate(page.nightDone))
    await context.evaluate(`(() => { document.querySelector('[data-action="show-night-next"]')?.click(); return true; })()`);
  await waitInFight(context, page.nightDone, 'night five reaches its results', 30000);
  await picture(context, 'bowl-rex-night-results');
  assert.ok(await context.evaluate(page.nightYard), 'the results say the Scrapasaurus goes to the yard');
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 600, 'night five\'s purse is paid once');
  assert.ok(await context.evaluate(page.rexInYard), 'the yard now has its Scrapasaurus');
  const cues = JSON.parse(await context.evaluate(page.cues));
  for (const cue of ['bowl.rex.roar', 'bowl.rex.fire', 'bowl.rex.box.open', 'bowl.hook.fire', 'bowl.hook.bite', 'bowl.rex.box.out', 'bowl.rex.fall'])
    assert.ok(cues.includes(cue), `the ${cue} cue played`);
  // The new attacks have no sound until BOWL-SOUND records them, so they are seen in the fight's state instead.
  const seen = JSON.parse(await context.evaluate(page.newAttacks));
  if (rex3) assert.ok(seen.beam && seen.bomb, 'the beam and a bomb came: ' + JSON.stringify(seen));
  else assert.deepEqual(seen, {beam: false, bomb: false}, 'with bowl-rex-3 off there is no beam and no bomb');
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 600, 'leaving pays nothing more');
}
