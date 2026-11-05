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
  await c.screenshot('everburn-first-job');
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  await c.evaluate('window.__qaApp.advance(1)');
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  await c.screenshot('everburn-driving');
  await writeFile(join(c.outputDir,'everburn-play.json'),JSON.stringify({screenshots:6,started:'everburn-hot-delivery'})+'\n');
}
