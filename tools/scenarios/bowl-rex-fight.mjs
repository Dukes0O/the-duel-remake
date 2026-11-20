// BOWL-REX-FIGHT: night five's Scrapasaurus in the production UI, memory-only saves. A memory-only
// player who has won nights one to four opens night five on Easy, goes straight to the fight, and
// the pictures show the tell (the cone on the floor before any fire), the fire filling that cone,
// and the rest with a battery box open. Then a child-pace driver in the page plays the fight to the
// end; the results name the yard, the purse is paid once, and the yard has its Scrapasaurus.
// Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

// Shared with the ten-seed headless drive. Controls are the same ones a
// child has: wait for the eye, tap F, then drive straight past the tired beast.
export function childDrive(duel, driver) {
  const s=duel.state, f=s.bowlNight?.event?.rex;
  if(s.status!=='racing'||!f)return;
  const h=f.hook, mark=f.marker, dt=1/120;
  let throttle=0,brake=0,steer=0,interact=false;
  if(h.phase==='flying'||h.phase==='attached'){
    throttle=1;
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
    if(ds<8 || s.speedMph>4)brake=1;
    else if(ds>19 && s.speedMph<(driver.pace||18))throttle=.85;
    // Brake and throttle held together slow the reverse before the next shot.
    if(ds>=13 && s.speedMph<-.6)throttle=1;
    const sign=s.speedMph<-.5 ? -1 : 1;
    steer=Math.max(-1,Math.min(1,(s.lateral-target)*.18+sign*s.headingError*1.8));
  }
  duel.setInput({throttle,brake,steer,boost:false,interact});
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
  onNightFive: `(() => window.__qaApp.duel.state.bowlNight?.night === 5 && window.__qaApp.duel.state.status !== 'menu')()`,
  // Straight to the night's fourth event, the fight (the events before it have their own scenarios).
  toFight: `(() => { const app = window.__qaApp, night = app.duel.state.bowlNight;
    night.show = {...night.show, eventIndex: 3}; night.phase = 'result';
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
  coneDrawn: `(() => { const scene = window.__render?.scene; return !!scene?.getObjectByName('Scrapasaurus fire cone')?.visible && !!scene.getObjectByName('Scrapasaurus chest glow')?.visible && !scene.getObjectByName('Scrapasaurus fire')?.visible; })()`,
  driver: `(() => { const app=window.__qaApp, control=${childDrive.toString()}, driver={};
    app._driveAutopilot=function(){
      if(!driver.firstTap && this.duel.state.bowlNight?.event?.rex?.marker?.canBite){
        driver.firstTap=true;this.autopilot=false;return;
      }
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
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
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
  assert.ok(await context.evaluate(page.toFight), 'the night goes on to its fourth event, the fight');
  await context.waitFor(page.guide,'three pictured tow instructions before the fight',10000);
  await picture(context,'bowl-rex-tow-instructions');
  await context.evaluate(page.next);
  await waitInFight(context, page.hud, 'the HUD names the Scrapasaurus', 60000);
  await waitInFight(context, page.drawn, 'the stadium, the Titan and the Scrapasaurus are drawn', 240000);

  await picture(context, 'bowl-rex-start');
  // The truck waits at the Car Park Gate for the first breath.
  await waitInFight(context, page.tell, 'its tell where it rests', 120000);

  await picture(context, 'bowl-rex-tell-cone-on-floor');
  assert.equal(await context.evaluate(page.coneDrawn), true, 'the cone is on the floor and its chest glows during the tell, before any fire');
  await waitInFight(context, page.fire, 'the fire', 15000);
  await picture(context, 'bowl-rex-fire');
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
  try { await waitInFight(context, page.card, 'the fight ends', 420000); }
  finally { await context.evaluate(page.manual); }
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
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 600, 'leaving pays nothing more');
}
