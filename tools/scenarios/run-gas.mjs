// RUN-GAS: with all six Everburn jobs won, the Story Wall shows the GAS RUN entry; a Boneyard road run starts, its first raid
// appears and is photographed; then a long road run is started and photographed. Memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const click=(c,selector)=>c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
const SIX=`['hot-delivery','get-out-and-walk','run-him-down','slow-ride','key-under-the-mall','the-everburn']`;

export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-runs&harness=run-gas');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"','menu',60000);
  const ember=`a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true},story:{...a.profile.story,ember:{...(a.profile.story?.ember||{}),read:true,jobs:${SIX}}}};a._saveProfile();`;
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');${ember}})()`);
  await click(c,'#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()','yard',60000);
  await c.evaluate(`(()=>{const a=window.__qaApp;${ember}})()`);
  await click(c,'[data-action="yard-cards"]');
  await c.waitFor('document.querySelector("[data-ember-run=\\"boneyard\\"]")','the gas run on the wall');
  const out={};
  out.wall=await c.evaluate(`(()=>{const row=document.querySelector('[data-ember-job="gas-run"]');
    if(!row)throw Error('No GAS RUN entry');
    const text=row.innerText,buttons=[...row.querySelectorAll('[data-ember-run]')].map(b=>({road:b.dataset.emberRun,text:b.innerText.replace(/\\s+/g,' ').trim()}));
    if(!/GAS RUN/.test(text))throw Error('The entry is not called GAS RUN');
    if(!text.includes('The Ash Men are raiding the Boneyard road.'))throw Error('Wrong feud sentence: '+text);
    if(buttons.length!==2)throw Error('Expected two road buttons, found '+buttons.length);
    if(!/LONG ROAD.*scrap/.test(buttons.find(b=>b.road==='long')?.text||''))throw Error('The long road button shows no pay');
    if(!/BONEYARD ROAD.*scrap/.test(buttons.find(b=>b.road==='boneyard')?.text||''))throw Error('The Boneyard road button shows no pay');
    if(row.classList.contains('is-done'))throw Error('The gas run shows a tick');
    return {text:text.replace(/\\s+/g,' ').trim(),buttons};})()`);
  await c.evaluate(`document.querySelector('[data-ember-job="gas-run"]').scrollIntoView({block:'center'})`);
  await c.screenshot('run-gas-wall');

  // A Boneyard road run: wait until it is racing, then drive ahead of Big Bess to its first ambush.
  await click(c,'[data-ember-run="boneyard"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"&&window.__qaApp.duel.state.status==="racing"','the Boneyard road run racing',90000);
  out.boneyard=await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,j=s.arena.worldJob,d=j.definition;
    if(d.id!=='gas-run-boneyard'||d.run!==true)throw Error('Wrong job: '+d.id);
    const ambush=d.steps[0].ambushes[0].place.position;
    // Put the car 40 m short of the first ambush, on the road, and let Big Bess drive on until the raiders appear.
    const road=a.duel.course.nearest(ambush.x-40,ambush.z);s.s=road.s;s.lateral=road.lateral;s.speedMph=0;
    return {feud:d.feud,runs:d.runs,raids:d.raids,ambush};})()`);
  for(let i=0;i<400;i++){
    const seen=await c.evaluate('(()=>{const a=window.__qaApp;a.advance(0.5);return a.duel.state.arena.worldJob.actors.some(x=>x.ambushKey)})()');
    if(seen)break;
    if(i===399)throw Error('No raid appeared');
  }
  await c.evaluate('window.__qaApp.advance(1)');
  out.raid=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob;
    const raiders=j.actors.filter(x=>x.ambushKey),bess=j.actors.find(x=>x.id==='big-bess');
    if(!raiders.length)throw Error('The raiders are gone');
    return {raiders:raiders.map(r=>({id:r.id,x:Math.round(r.x),z:Math.round(r.z),health:r.health})),bess:{x:Math.round(bess.position.x),z:Math.round(bess.position.z),health:Math.round(bess.health)},
      hud:document.querySelector('.world-hud-progress')?.innerText||'',caption:document.body.innerText.includes('Here they come')};})()`);
  await c.screenshot('run-gas-raid');

  // A long road run: back to the yard (nothing arrived, so nothing is saved), then start it and look at its beginning.
  const before=await c.evaluate('JSON.stringify(window.__qaApp.profile.story.ember)');
  await c.evaluate('window.__qaApp.returnToYard()');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()','yard again',60000);
  out.leftAlone=await c.evaluate(`JSON.stringify(window.__qaApp.profile.story.ember)===${JSON.stringify(before)}`);
  if(!out.leftAlone)throw Error('Leaving a run changed the save');
  await click(c,'[data-action="yard-cards"]');
  await c.waitFor('document.querySelector("[data-ember-run=\\"long\\"]")','the gas run on the wall again');
  await click(c,'[data-ember-run="long"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"&&window.__qaApp.duel.state.status==="racing"','the long road run racing',90000);
  await c.evaluate('window.__qaApp.advance(4)');
  out.long=await c.evaluate(`(()=>{const a=window.__qaApp,j=a.duel.state.arena.worldJob,d=j.definition,bess=j.actors.find(x=>x.id==='big-bess');
    if(d.id!=='gas-run-long')throw Error('Wrong job: '+d.id);
    return {raids:d.raids,bess:bess?{x:Math.round(bess.position.x),z:Math.round(bess.position.z)}:null,hud:document.querySelector('.world-hud-line')?.innerText||''};})()`);
  await c.screenshot('run-gas-long-start');
  await writeFile(join(c.outputDir,'run-gas.json'),JSON.stringify(out,null,1)+'\n');
}
