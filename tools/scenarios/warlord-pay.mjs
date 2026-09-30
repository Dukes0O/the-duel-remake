// Actual Preview entry, production controls and contact-credit lifecycle.
// The harness builds .qa-dist and serves a private port with temporary saves.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contactFixture} from './warlord-reward.mjs';

async function click(context, selector) {
  const point = await context.evaluate(
    '(()=>{const b=document.querySelector(' + JSON.stringify(selector) + ');' +
    'if(!b||b.hidden||b.disabled)throw Error(' + JSON.stringify('Missing Preview control: ' + selector) + ');' +
    'b.scrollIntoView({block:"center"});const r=b.getBoundingClientRect();' +
    'const x=r.x+r.width/2,y=r.y+r.height/2;' +
    'if(r.width<1||r.height<1||!b.contains(document.elementFromPoint(x,y)))throw Error("Covered Preview control");' +
    'return{x,y};})()');
  for (const type of ['mousePressed', 'mouseReleased']) {
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
  }
}

async function ready(context, label) {
  await context.waitFor('(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();' +
    'return a?.visualReady&&document.querySelector("#view3d")?.dataset.vehicleAsset==="ready"&&' +
    'document.querySelector("#renderer-loading")?.hidden;})()', label, 60_000);
}

async function begin(context, rematch = false) {
  if (rematch) await click(context, '[data-action="arena-rematch"]');
  else {
    await click(context, '#wasteland-visit');
    await ready(context, 'private Preview yard transition');
    await context.evaluate('window.__qaApp.advance(8)');
    await context.waitFor('window.__qaApp.isYardHomeActive()', 'private Preview yard', 60_000);
    await ready(context, 'private Preview yard controls');
    await click(context, '[data-action="yard-territory"]');
    await click(context, '[data-warlord="sal"]');
  }
  await context.waitFor('window.__qaApp.duel.state.status==="warlord_intro"', 'private Preview Sal intro');
  await ready(context, 'private Preview Sal intro presentation');
  await click(context, '[data-action="warlord-begin"]');
  await context.evaluate('window.__qaApp.advance(3.1)');
  await context.waitFor('window.__qaApp.duel.state.arena.phase==="fight"', 'private Preview fight');
}

async function finish(context, host = 'window') {
  // Actual arena respawn clears its guards before each next controlled contact.
  const fixture = contactFixture.replaceAll('window.__qaApp', 'w.__qaApp');
  return context.evaluate('(()=>{const w=' + host + ',a=w.__qaApp,s=a.duel.state,contact=' + fixture + ';' +
    'for(let i=0;i<3;i++){' +
    'for(let n=0;n<480&&[s,...s.opponents].some(p=>p.combatWrecking);n++)a.duel.step(1/120);' +
    'if([s,...s.opponents].some(p=>p.combatWrecking))throw Error("Preview wreck failed to respawn");' +
    'contact("cpu-1",35);a.duel.step(1/120);}' +
    'a.onFrame?.(s,0);w.__render.renderFrame();' +
    'if(s.status!=="arena_result"||s.arena.result?.winnerId!=="player")throw Error("Preview did not finish actual three wrecks");' +
    'return{...s.arena.result,scrap:a.profile.wasteland.scrap,defeated:a.profile.wasteland.warlords.sal.defeated,' +
    'bossWrecked:s.arena.participants.find(p=>p.id==="cpu-1").wrecked};})()');
}

function check(result, amount, firstWin, label) {
  if (result.scrapEarned !== amount || result.firstWin !== firstWin ||
      !result.settlementSaved || result.bossWrecked !== 3 || !result.defeated)
    throw Error(label + ': incomplete or wrong Preview payout ' + JSON.stringify(result));
}

export async function run(context) {
  // Match the launcher's disposable build stamp inside this private QA output.
  await writeFile(new URL('../../.qa-dist/preview-build.json', import.meta.url),
    JSON.stringify({builtAt: new Date().toISOString()}) + '\n');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const reports = [];
  for (const quality of ['high', 'performance']) {
    await context.evaluate('window.name=""');
    await context.navigate('/tools/preview.html?flags=warlords&harness=war-pay-' + quality);
    await context.waitFor('window.__qaApp?.duel.state.status==="menu"', 'fresh private Preview menu', 60_000);
    const fresh = await context.evaluate('(()=>{const a=window.__qaApp;' +
      'if(!window.name.startsWith("__duel_qa_tab_v2:")||!Object.getOwnPropertyDescriptor(window,"localStorage")?.value)' +
      'throw Error("Preview temporary storage missing");' +
      'if(a.profile.wasteland.warlords.sal.defeated||a.profile.wasteland.warlords.sal.wins!==0)throw Error("Fresh Preview has already beaten Sal");' +
      'a.stop();a.audio.setMuted(true);a.cpuDifficulty="medium";a.setGraphicsQuality(' + JSON.stringify(quality) + ');' +
      'return{scrap:a.profile.wasteland.scrap,wins:0,defeated:false};})()');
    if (fresh.scrap !== 0) throw Error('Unexpected fresh Preview bank');
    await ready(context, quality + ' fresh Preview presentation');
    await begin(context);
    const first = await finish(context); check(first, 720, true, quality + ' first');
    await ready(context, quality + ' first-win presentation');
    const firstText = await context.evaluate('document.querySelector("#modal-layer").textContent');
    if (!/first win/i.test(firstText) || !firstText.includes('+720')) throw Error('Preview first-win reason missing');
    await context.screenshot(quality + '-preview-first-win');
    await begin(context, true);
    const second = await finish(context); check(second, 312, false, quality + ' second');
    await ready(context, quality + ' rematch presentation');
    const secondText = await context.evaluate('document.querySelector("#modal-layer").textContent');
    if (!/rematch/i.test(secondText) || !secondText.includes('+312')) throw Error('Preview rematch reason missing');
    await context.screenshot(quality + '-preview-rematch');
    await context.command('Page.reload', {ignoreCache: true});
    await context.waitFor('window.__qaApp?.duel.state.status==="menu"', 'same-tab Preview reload', 60_000);
    const reload = await context.evaluate('(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);' +
      'a.cpuDifficulty="medium";a.setGraphicsQuality(' + JSON.stringify(quality) + ');' +
      'return{scrap:a.profile.wasteland.scrap,wins:a.profile.wasteland.warlords.sal.wins,defeated:a.profile.wasteland.warlords.sal.defeated};})()');
    if (reload.scrap !== 1032 || reload.wins !== 2 || !reload.defeated) throw Error('Same-tab reload lost completed Preview progress');
    await ready(context, quality + ' reload presentation');
    await begin(context);
    const afterReload = await finish(context); check(afterReload, 312, false, quality + ' after reload');
    await context.screenshot(quality + '-preview-reload-rematch');
    // A genuinely different browser tab receives a fresh Preview seed.
    await context.evaluate('window.__payTab=window.open(' + JSON.stringify(context.baseURL + '/tools/preview.html?flags=warlords') + ',"_blank");true');
    await context.waitFor('window.__payTab?.__qaApp?.visualReady&&window.__payTab.__render&&window.__payTab.__qaApp.duel.state.status==="menu"', 'new-tab private Preview', 60_000);
    const newSeed = await context.evaluate('(()=>{const w=window.__payTab,a=w.__qaApp;a.stop();a.audio.setMuted(true);a.cpuDifficulty="medium";' +
      'if(a.profile.wasteland.warlords.sal.defeated||a.profile.wasteland.warlords.sal.wins!==0||a.profile.wasteland.scrap!==0)' +
      'throw Error("A different Preview tab inherited a defeat");' +
      'a.setGraphicsQuality(' + JSON.stringify(quality) + ');' +
      'return {scrap:0,wins:0,defeated:false};})()');
    // Exercise the new tab's production handlers without retargeting this harness.
    const newReady = '(()=>{const w=window.__payTab,a=w?.__qaApp;a?.onFrame?.(a.duel.state,0);w?.__render?.renderFrame();' +
      'return a?.visualReady&&w.document.querySelector("#renderer-loading")?.hidden;})()';
    await context.waitFor(newReady, 'new-tab selected quality', 60_000);
    await context.evaluate('(()=>{if(!window.__payTab.__qaApp.visitWasteland())throw Error("New tab yard entry failed");return true;})()');
    await context.waitFor(newReady, 'new-tab yard transition', 60_000);
    await context.evaluate('window.__payTab.__qaApp.advance(8);true');
    await context.waitFor(newReady, 'new-tab yard home', 60_000);
    await context.evaluate('(()=>{if(!window.__payTab.__qaApp.startWarlordFight("sal"))throw Error("New tab fight entry failed");return true;})()');
    await context.waitFor(newReady, 'new-tab Sal intro', 60_000);
    await context.evaluate('(()=>{const a=window.__payTab.__qaApp;if(!a.beginWarlordFight())throw Error("New tab fight begin failed");a.advance(3.1);return true;})()');
    const newFirst = await finish(context, 'window.__payTab'); check(newFirst, 720, true, quality + ' new tab first');
    await context.evaluate('window.__payTab.close();delete window.__payTab;true');
    reports.push({quality,fresh,first,second,reload,afterReload,newSeed,newFirst});
    console.log(quality + ': actual fresh Preview first720, rematch312, same-tab reload remains rematch312, different tab first720');
  }
  await writeFile(join(context.outputDir, 'pay-verdict.json'), JSON.stringify(reports, null, 2) + '\n');
}
