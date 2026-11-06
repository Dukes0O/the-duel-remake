// TOWN-WORLD: Claude runs this browser check with memory-only saves. It checks
// the town drive entry point and gate prompt without touching a real profile.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function run(context) {
  const report={facts:[],notes:[]},fail=[];
  const fact=(ok,label)=>{report.facts.push({ok:!!ok,label});if(!ok)fail.push(label);};
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp','the game app',90_000);
  await context.evaluate(`(()=>{
    const app=window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('Town QA');
    app.profile={...app.profile,wasteland:{version:1,discoveredGate:true,scrap:0,rank:1}};
    app._saveProfile();
    app.visitWasteland();
    return true;
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive() && !!document.querySelector(\'[data-action="yard-the-town"]\')','the yard and its THE TOWN button');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor('!!document.querySelector(".town-entry form")','the new town form');
  await context.evaluate(`(()=>{const form=document.querySelector('.town-entry form');form.querySelector('[name="name"]').value='Test town';form.requestSubmit();})()`);
  await context.waitFor('!!document.querySelector(".town-entry [data-town-action=drive]")','the town screen DRIVE button');
  await context.evaluate(`(()=>{
    const host=document.querySelector('.town-entry');
    const hall=host.__townCommand({type:'placeBuilding',buildingId:'town-hall',x:15,z:-12});
    const road=host.__townCommand({type:'placeBuilding',buildingId:'road-dirt',x:19,z:-12});
    if(!hall[0]?.ok||!road[0]?.ok)throw Error('Could not place the town features for the world picture');
    host.querySelector('[data-town-action="drive"]').click();
  })()`);
  await context.waitFor(`(()=>{const app=window.__qaApp;return app.duel.state.arena?.worldJob?.definition?.kind==='town-drive'&&app.duel.state.status==='racing';})()`,'the town drive started from its button',90000);
  await context.waitFor(`!!window.__render?.scene?.getObjectByName('Town roads, sites and buildings')?.children.length`,'the town drawn in the Scablands',90000);
  const started=await context.evaluate(`(()=>{
    const app=window.__qaApp;
    return {result:true,kind:app.duel.state.arena?.worldJob?.definition?.kind,
      start:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral),
      layout:app.duel.state.arena?.worldJob?.definition?.layout};
  })()`);
  fact(started.result,'DRIVE starts from the town gate');
  fact(started.kind==='town-drive','the shared world-job engine runs the town drive');
  fact(Math.hypot(started.start.x,started.start.z+112)<8,'the car starts outside the Dome gate');
  fact(started.layout?.solids?.some(solid=>solid.id==='building-1'),'the saved town supplies solid buildings');
  fact(started.layout?.roads?.some(road=>road.id==='building-2'),'the saved town supplies its drawn road');
  fact(started.layout?.gate?.prompt==='Drive up to the Scrapdome gate to go inside.','the gate carries a player-facing prompt');
  await context.screenshot('town-world-town');
  const gate=await context.evaluate(`(()=>{
    const app=window.__qaApp,state=app.duel.state,point=app.duel.course.nearest(0,-92);
    state.status='racing';state.s=point.s;state.lateral=point.lateral;
    app.duel.setInput({interact:true});app.duel.step(1/120);
    return {prompt:state.townGatePrompt};
  })()`);
  fact(gate.prompt==='Drive up to the Scrapdome gate to go inside.','the HUD shows the gate prompt at the gate');
  await context.screenshot('town-world-gate-prompt');
  await context.waitFor(`window.__qaApp.isYardHomeActive()&&!!document.querySelector('.yard-home-panel .arena-yard')`,'the Scrapdome panel after the gate',30_000);
  const panel=await context.evaluate(`document.querySelector('.yard-home-panel .arena-yard')?.textContent||''`);
  fact(panel.includes('LAST CAR ROLLING'),'using the gate interaction returns to the Scrapdome panel');
  await context.screenshot('town-world-scrapdome-panel');
  report.notes.push('Claude should drive to the gate, check that the HUD prompt appears, and confirm the Scrapdome panel handoff.');
  await writeFile(join(context.outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(fail.length)throw Error('Town world facts failed: '+fail.join(' | '));
}
