// FIELD-BATTLE-ASH: with all six Everburn jobs won and the Ash Men's feud at War party, the Story Wall says the furnace is out of the
// well and offers BONEYARD ROAD: THE BATTLE; the battle starts, Big Bess drives on until the furnace has come out behind her, and it is
// photographed (with the cinders landing on her, after a door breaks, and dead). Memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const click=(c,selector)=>c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
const SIX=`['hot-delivery','get-out-and-walk','run-him-down','slow-ride','key-under-the-mall','the-everburn']`;

export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-runs&harness=field-battle');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"','menu',60000);
  const ember=`a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true},story:{...a.profile.story,ember:{...(a.profile.story?.ember||{}),read:true,jobs:${SIX},feud:4,runs:3}}};a.cpuDifficulty='medium';a._saveProfile();`;
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');${ember}})()`);
  await click(c,'#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()','yard',60000);
  await c.evaluate(`(()=>{const a=window.__qaApp;${ember}})()`);
  await click(c,'[data-action="yard-cards"]');
  await c.waitFor('document.querySelector("[data-ember-run=\\"boneyard\\"]")','the gas run on the wall');
  const out={};
  out.wall=await c.evaluate(`(()=>{const row=document.querySelector('[data-ember-job="gas-run"]');
    if(!row)throw Error('No GAS RUN entry');
    const text=row.innerText.replace(/\\s+/g,' ').trim(),buttons=[...row.querySelectorAll('[data-ember-run]')].map(b=>({road:b.dataset.emberRun,text:b.innerText.replace(/\\s+/g,' ').trim()}));
    if(!text.includes('The Ash Men have dragged the furnace out of the well. They are waiting on the Boneyard road.'))throw Error('Wrong wall line: '+text);
    if(text.includes('have gathered a war party'))throw Error('The old War party line is still shown: '+text);
    if(buttons.length!==2)throw Error('Expected two road buttons, found '+buttons.length);
    const boneyard=buttons.find(b=>b.road==='boneyard')?.text||'';
    if(!/^BONEYARD ROAD: THE BATTLE\\s+\\d+ scrap$/.test(boneyard))throw Error('The Boneyard button reads: '+boneyard);
    if(!/^LONG ROAD\\s+\\d+ scrap$/.test(buttons.find(b=>b.road==='long')?.text||''))throw Error('The long road button reads: '+buttons.find(b=>b.road==='long')?.text);
    if(row.classList.contains('is-done'))throw Error('The gas run shows a tick');
    return {text,buttons};})()`);
  await c.evaluate(`document.querySelector('[data-ember-job="gas-run"]').scrollIntoView({block:'center'})`);
  await c.screenshot('field-battle-wall');

  // The battle: Moss's line, then Big Bess drives on. The car waits on the road a little ahead of where the furnace comes out.
  await click(c,'[data-ember-run="boneyard"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"&&window.__qaApp.duel.state.status==="racing"','the battle racing',90000);
  out.start=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob,d=j.definition;
    if(d.id!=='gas-run-boneyard-battle'||d.battle!==true)throw Error('Wrong job: '+d.id);
    if(d.steps[0].ambushes.length!==2)throw Error('Expected two ambushes');
    return {id:d.id,shares:d.shares,raids:d.raids,feud:d.feud,runs:d.runs};})()`);
  // Drive the car onto the road beside where she will be when the furnace comes out, and let her drive until it is out.
  await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,road=a.duel.course.nearest(-60,366);s.s=road.s;s.lateral=road.lateral;s.speedMph=0;})()`);
  let out2=false;
  for(let i=0;i<200;i++){
    out2=await c.evaluate('(()=>{const a=window.__qaApp;a.advance(1);return a.duel.state.arena.worldJob.actors.some(x=>x.furnace)})()');
    if(out2)break;
  }
  if(!out2)throw Error('The furnace never came out');
  await c.evaluate('window.__qaApp.advance(.5)');
  out.comesOut=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob,f=j.actors.find(x=>x.furnace),bess=j.actors.find(x=>x.id==='big-bess');
    if(!f)throw Error('No furnace');
    const caption=document.body.innerText.includes('You put him in the well. I am putting you in the ground.');
    const gap=Math.hypot(f.position.x-bess.position.x,f.position.z-bess.position.z);
    const scene=a.duel.state.arena.worldJob;
    return {furnace:{x:Math.round(f.position.x),z:Math.round(f.position.z),phase:f.furnace.phase,metres:Math.round(f.furnace.metres)},
      bess:{x:Math.round(bess.position.x),z:Math.round(bess.position.z),health:Math.round(bess.health)},gap:Math.round(gap),caption,
      lines:(a.duel.state.callout||'')};})()`);
  await c.screenshot('field-battle-furnace-out');

  // The cinders land on Big Bess once the furnace has closed to 25 m.
  let burning=false;
  for(let i=0;i<120;i++){
    burning=await c.evaluate('(()=>{const a=window.__qaApp;a.advance(1);const f=a.duel.state.arena.worldJob.actors.find(x=>x.furnace);return !!f&&f.furnace.burning})()');
    if(burning)break;
  }
  if(!burning)throw Error('The cinders never landed on Big Bess');
  await c.evaluate('window.__qaApp.advance(.5)');
  out.cinders=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob,bess=j.actors.find(x=>x.id==='big-bess');
    return {bessHealth:Math.round(bess.health),callout:a.duel.state.callout||''};})()`);
  await c.screenshot('field-battle-cinders');

  // A door: the car waits 16 m behind the furnace; when its door glows it is photographed, then a weapon hit is reported the way
  // the combat code reports it, and the broken door is photographed (Clinker speaks). Then the other doors, and the dead furnace.
  const behind=`(()=>{const a=window.__qaApp,s=a.duel.state,f=a.duel.state.arena.worldJob.actors.find(x=>x.furnace).furnace;
    const road=a.duel.course.nearest(f.x-Math.sin(f.heading)*16,f.z-Math.cos(f.heading)*16);s.s=road.s;s.lateral=road.lateral;s.speedMph=0;})()`;
  const glowing=async()=>{
    for(let i=0;i<160;i++){
      const phase=await c.evaluate(`(()=>{const a=window.__qaApp,f=a.duel.state.arena.worldJob.actors.find(x=>x.furnace).furnace;
        if(f.dead||f.phase==='glow')return f.dead?'dead':'glow';a.advance(.25);return f.phase;})()`);
      if(phase==='glow'||phase==='dead')return phase;
    }
    throw Error('A door never glowed');
  };
  const hit=`(()=>{const a=window.__qaApp,s=a.duel.state,f=s.arena.worldJob.actors.find(x=>x.furnace).furnace;
    s.worldJobThingsHit=[{id:'old-smoke-furnace:door-'+f.door,actorId:'old-smoke-furnace',kind:'furnace-vent',door:f.door,damage:1,glowing:true}];a.advance(.3);return {hits:f.hits,phase:f.phase,dead:f.dead,callout:s.callout||''};})()`;
  out.doors=[];
  await c.evaluate(behind);
  await glowing();
  await c.evaluate(behind);
  await c.evaluate('window.__qaApp.advance(.1)');
  await c.screenshot('field-battle-door-glowing');
  out.doors.push(await c.evaluate(hit));
  if(out.doors[0].hits!==1||out.doors[0].phase!=='stagger')throw Error('The first door did not break: '+JSON.stringify(out.doors[0]));
  await c.evaluate(behind);
  await c.screenshot('field-battle-door-broken');
  for(let door=1;door<3;door++){
    await glowing();
    out.doors.push(await c.evaluate(hit));
  }
  const last=out.doors.at(-1);
  if(!last.dead)throw Error('The furnace is not dead after three doors: '+JSON.stringify(out.doors));
  await c.evaluate('window.__qaApp.advance(1.5)');
  await c.evaluate(behind);
  await c.screenshot('field-battle-furnace-dead');
  out.dead=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob,f=j.actors.find(x=>x.furnace),bess=j.actors.find(x=>x.id==='big-bess');
    return {x:Math.round(f.position.x),z:Math.round(f.position.z),health:f.health,bess:{health:Math.round(bess.health)},callout:a.duel.state.callout||''};})()`);
  await writeFile(join(c.outputDir,'field-battle.json'),JSON.stringify(out,null,1)+'\n');
}
