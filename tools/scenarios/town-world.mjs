// TOWN-WORLD: Claude runs this browser check with memory-only saves. It checks
// the town drive entry point and gate prompt without touching a real profile.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function run(context) {
  const report={facts:[],notes:[]},fail=[];
  const fact=(ok,label)=>{report.facts.push({ok:!!ok,label});if(!ok)fail.push(label);};
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp','the game app',90_000);
  const started=await context.evaluate(`(async()=>{
    const app=window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('Town QA');
    app.profile={...app.profile,wasteland:{version:1,discoveredGate:true,scrap:0,rank:1}};
    app._saveProfile();
    app.visitWasteland();
    const town={version:1,id:'town-2026',name:'Test town',seed:2026,people:[],buildings:[
      {id:'test-hall',buildingId:'town-hall',regionId:'scablands',x:70,z:50,width:2,depth:3,state:'finished'}]};
    const result=await app.startTownDrive(town);
    return {result,kind:app.duel.state.arena?.worldJob?.definition?.kind,
      start:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral),
      layout:app.duel.state.arena?.worldJob?.definition?.layout};
  })()`);
  fact(started.result,'DRIVE starts from the town gate');
  fact(started.kind==='town-drive','the shared world-job engine runs the town drive');
  fact(Math.hypot(started.start.x,started.start.z+112)<8,'the car starts outside the Dome gate');
  fact(started.layout?.solids?.some(solid=>solid.id==='test-hall'),'the saved town supplies solid buildings');
  fact(started.layout?.gate?.prompt==='Drive up to the Scrapdome gate to go inside.','the gate carries a player-facing prompt');
  await context.screenshot('town-world-town');
  const gate=await context.evaluate(`(()=>{
    const app=window.__qaApp,state=app.duel.state,point=app.duel.course.nearest(0,-92);
    state.status='racing';state.s=point.s;state.lateral=point.lateral;
    app.duel.setInput({interact:true});app.duel.step(1/120);
    return {prompt:state.townGatePrompt,yard:app.isYardHomeActive(),panel:document.querySelector('.yard-home-panel .arena-yard')?.textContent||''};
  })()`);
  fact(gate.prompt==='Drive up to the Scrapdome gate to go inside.','the HUD shows the gate prompt at the gate');
  await context.screenshot('town-world-gate-prompt');
  fact(gate.yard&&gate.panel.includes('Scrapdome'),'using the gate interaction returns to the Scrapdome panel');
  await context.screenshot('town-world-scrapdome-panel');
  report.notes.push('Claude should drive to the gate, check that the HUD prompt appears, and confirm the Scrapdome panel handoff.');
  await writeFile(join(context.outputDir,'report.json'),JSON.stringify(report,null,2)+'\n');
  if(fail.length)throw Error('Town world facts failed: '+fail.join(' | '));
}
