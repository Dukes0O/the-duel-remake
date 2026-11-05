// Claude runs this memory-only browser walk. It leaves the race running after
// entering the first job so the player can drive the Scablands.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function click(c, selector) {
  const p=await c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
  return p;
}
export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-play');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"','memory-only Everburn menu',60000);
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');
    a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true}};a._saveProfile();})()`);
  await c.screenshot('everburn-menu');
  await click(c,'#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()','Scablands yard',60000);
  await c.screenshot('everburn-yard');
  await click(c,'[data-action="yard-cards"]');
  await c.waitFor('document.querySelector(".ember-wall")','Hollis note on Story Wall');
  await c.screenshot('everburn-hollis-note');
  await click(c,'[data-ember-step="read"]');
  await c.waitFor('window.__qaApp.profile.story?.ember?.read===true','Hollis note read');
  await c.screenshot('everburn-note-read');
  await click(c,'[data-ember-step="hot-delivery"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"','first Everburn job',60000);
  await c.waitFor('document.querySelector(".world-hud-line")?.textContent.includes("Cinder\'s ember pot")','hand-written Everburn instruction');
  const firstJob=await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,j=s.arena.worldJob;
    const text=document.body.innerText;
    if(s.arena.venueId!=='scablands'||a.duel.course.def.id!=='scablands')throw Error('Everburn started outside the Scablands');
    if(/scrapdome|last car rolling|wrecks\s+0\s*[-·]\s*wrecked\s+0/i.test(text))throw Error('Arena venue label or scoreboard leaked into the job HUD');
    if(/NaN|Infinity/i.test(text))throw Error('Non-finite time leaked into the HUD');
    if(!text.includes('FLAMETHROWER'))throw Error('Loaned Flamethrower is missing from weapon slots');
    if(!text.includes('HOT DELIVERY')||!text.includes('STEP 1'))throw Error('Job name or step is missing from the HUD');
    if(document.querySelector('.arena-board:not([hidden])'))throw Error('Arena scoreboard is visible during a world job');
    const start=j.job.steps[0].origin.position,at=a.duel.course.worldAt(s.s,s.lateral);
    if(Math.hypot(start.x-at.x,start.z-at.z)>1)throw Error('Car did not start at the job start place');
    return {venue:s.arena.venueId,start:{x:at.x,z:at.z},marker:j.job.steps[0].destination.position};})()`);
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'m',code:'KeyM',windowsVirtualKeyCode:77});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'m',code:'KeyM',windowsVirtualKeyCode:77});
  await c.waitFor('document.querySelector(".world-hud-map:not([hidden])")','Scablands map open');
  await c.screenshot('everburn-scablands-map');
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'m',code:'KeyM',windowsVirtualKeyCode:77});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'m',code:'KeyM',windowsVirtualKeyCode:77});
  await c.screenshot('everburn-first-job');
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  let moved=false;
  for(let second=0;second<120&&!moved;second++){
    await c.evaluate('window.__qaApp.advance(1)');
    moved=await c.evaluate('window.__qaApp.duel.state.arena.worldJob.job.stepIndex>0');
  }
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  if(!moved)throw Error('Keyboard drive did not advance the first Everburn job');
  await c.waitFor('window.__qaApp.duel.state.arena.worldJob.job.stepIndex>0','first job step advances');
  await c.screenshot('everburn-driving');
  await writeFile(join(c.outputDir,'everburn-play.json'),JSON.stringify({screenshots:7,started:'everburn-hot-delivery',venue:firstJob.venue,marker:firstJob.marker,moved})+'\n');
}
