// EVERBURN-WELL-ART: in job 6 the well's buildings and Old Smoke's furnace are drawn, and the furnace
// model follows its actor in the chase. Memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const click=(c,selector)=>c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
const FIVE=`['hot-delivery','get-out-and-walk','run-him-down','slow-ride','key-under-the-mall']`;
const probe=`(()=>{const a=window.__qaApp,THREEscene=window.__render?.scene;
  let root=null;const scenes=[];
  for(const key of Object.keys(a)){const v=a[key];if(v&&v.isScene)scenes.push(key);}
  const scene=THREEscene||a[scenes[0]];
  if(!scene)return {error:'no scene',keys:Object.keys(a).slice(0,80)};
  scene.traverse(n=>{if(n.name==='The Scablands')root=n;});
  if(!root)return {error:'no Scablands group',scenes};
  const wp=n=>{n.updateWorldMatrix(true,false);const e=n.matrixWorld.elements;return [Math.round(e[12]),Math.round(e[13]),Math.round(e[14])];};
  const chainVisible=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return p.name||p.type;return true;};
  const kids=root.children.map(n=>{let meshes=0;n.traverse(m=>{if(m.isMesh)meshes++;});
    return {name:n.name,type:n.type,visible:n.visible,chain:chainVisible(n),at:wp(n),meshes,
      lod:n.isLOD?n.levels.map(l=>({d:l.distance,visible:l.object.visible,children:l.object.children.length})):undefined};});
  const cam=window.__render?.camera;const s=a.duel.state;const at=a.duel.course.worldAt(s.s,s.lateral);
  const actor=s.arena?.worldJob?.actors?.find(i=>i.id==='old-smoke-furnace');
  const rigNode=root.getObjectByName("Old Smoke's moving furnace rig");let rig=null;
  if(rigNode){let meshes=0,plates=0,embers=0;rigNode.traverse(n=>{const name=n.name.replace(/_/g,' ');if(n.isMesh)meshes++;
    if(/^(Furnace side armor|Furnace torn corner plate|Hanging torn furnace plate)[ .\\d]*$/.test(name))plates++;
    if(n.isMesh&&/old-smoke-vent-\\d+-glow|Flank vent [+-]?1 \\d+ ember/.test(name))embers++;});
    rig={at:wp(rigNode),visible:chainVisible(rigNode),meshes,plates,embers};}
  const well=root.children.find(n=>n.isLOD&&/Everburn/.test(n.name));
  return {status:root.userData.assetStatus,errors:root.userData.loadErrors,rootVisible:chainVisible(root),rootParent:root.parent?.name||root.parent?.type,
    car:[Math.round(at.x),Math.round(at.z)],camera:cam?[Math.round(cam.position.x),Math.round(cam.position.y),Math.round(cam.position.z),cam.far]:null,
    step:s.arena?.worldJob?.job?.stepIndex,kind:s.arena?.worldJob?.job?.steps?.[s.arena.worldJob.job.stepIndex]?.kind,
    actor:actor?{x:Math.round(actor.position.x),z:Math.round(actor.position.z)}:null,rig,
    well:well?{at:wp(well),parts:well.levels[0].object.children.length}:null,kids};})()`;

function check(p,when){
  if(p.error)throw Error(`${when}: ${p.error}`);
  if(p.status!=='ready')throw Error(`${when}: Scablands art is ${p.status}: ${p.errors.join('; ')}`);
  if(!p.well||p.well.parts<1)throw Error(`${when}: the Everburn well has no buildings`);
  if(!p.rig||p.rig.visible!==true||p.rig.meshes<20)throw Error(`${when}: the furnace model is not drawn`);
  if(p.rig.plates!==6||p.rig.embers!==9)throw Error(`${when}: the furnace has ${p.rig.plates} plates and ${p.rig.embers} vent lights; it needs 6 and 9`);
}
export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-play');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"','menu',60000);
  const ember=`a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true},story:{...a.profile.story,ember:{...(a.profile.story?.ember||{}),read:true,jobs:${FIVE}}}};a._saveProfile();`;
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');${ember}})()`);
  await click(c,'#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()','yard',60000);
  await c.evaluate(`(()=>{const a=window.__qaApp;${ember}})()`);
  await click(c,'[data-action="yard-cards"]');
  await c.waitFor('document.querySelector("[data-ember-step=\\"the-everburn\\"]")','job 6 on the wall');
  await click(c,'[data-ember-step="the-everburn"]');
  await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"&&window.__qaApp.duel.state.status==="racing"','job 6 racing',90000);
  await c.screenshot('everburn-well-map');
  const out={};
  out.defend=await c.evaluate(probe);
  check(out.defend,'defend');
  // Go-live round: the wave and well bars stand clear of the rear-view mirror and of the story caption.
  await c.waitFor('(()=>{const p=document.querySelector(".world-hud-progress");return p&&!p.hidden&&p.textContent.trim()})()','the wave and well bars');
  await c.evaluate(`(()=>{const clear=(a,b)=>a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;
    const bars=document.querySelector('.world-hud-progress').getBoundingClientRect(),mirror=document.querySelector('.rear-view-frame').getBoundingClientRect();
    if(!(mirror.width>50))throw Error('The rear-view mirror is not on screen');
    if(!clear(bars,mirror))throw Error('The wave and well bars lie over the rear-view mirror');
    const caption=document.querySelector('.race-callout');if(caption&&!caption.hidden&&!clear(bars,caption.getBoundingClientRect()))throw Error('The wave and well bars lie over the story caption');})()`);
  await c.screenshot('well-defend');
  await c.evaluate(`(()=>{const a=window.__qaApp;a.duel.state.arena.worldJob.job.stepIndex=1;a.advance(0.5);})()`);
  for(let i=0;i<10;i++)await c.evaluate('window.__qaApp.advance(0.2)');
  out.chase=await c.evaluate(probe);
  check(out.chase,'chase');
  const gap=Math.hypot(out.chase.rig.at[0]-out.chase.actor.x,out.chase.rig.at[2]-out.chase.actor.z);
  if(gap>30)throw Error(`The furnace model is ${Math.round(gap)} m from its actor in the chase`);
  await c.screenshot('well-chase');
  await writeFile(join(c.outputDir,'everburn-well.json'),JSON.stringify(out,null,1)+'\n');
}
