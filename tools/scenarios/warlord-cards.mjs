import {build} from 'vite';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
const root=fileURLToPath(new URL('../../',import.meta.url));
async function helpers() {
  const entry=resolve(root,'.qa-dist/warlord-cards.virtual.js');
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'native-card-fixture',resolveId:id=>id===entry?'\0card-fixture':null,
    load:id=>id==='\0card-fixture'?`export {applyArmorDamage} from ${JSON.stringify(resolve(root,'src/combat-armor.js'))};`:null,
  }],build:{write:false,minify:false,lib:{entry,name:'CardsNative',formats:['iife']}}});
  return (Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk').code;
}
async function click(context,selector) {
  const at=await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.disabled)throw Error('Unavailable card control '+${JSON.stringify(selector)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  for(const type of ['mousePressed','mouseReleased'])await context.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...at});
}
async function frame(context) {
  await context.evaluate('window.__qaApp.onFrame?.(window.__qaApp.duel.state,0);window.__render.renderFrame();');
}
export async function run(context) {
  const bundle=await helpers(),report=[];
  for(const quality of ['high','performance']) {
    await context.evaluate('window.name=""');
    await context.navigate('/tools/menu-check.html?flags=warlord-cards,blackiron,gunn,tollkeeper,convoy-raid&harness=cards-'+quality);
    await context.waitFor('!!window.__qaApp && !!window.__render','memory-only card app',60000);
    await context.evaluate(bundle);
    await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});
      if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only card storage missing');
      document.head.insertAdjacentHTML('beforeend','<style>body>details{display:none!important}</style>');
      a.profile.wasteland.discoveredGate=true;a.profile.wasteland.xp=1000000;
      a.profile.wasteland.warlords=Object.fromEntries(['sal','dustmonger','mirage','gunn','kettle','vultures','tollkeeper','blackiron'].map(id=>[id,{defeated:true,wins:1}]));
      a.profile.wasteland.territories.sal.hold=100;
      a.profile.wasteland.crew={unlocked:['rook'],selected:'rook'};
      if(!a._saveProfile()||!a.visitWasteland())throw Error('Native card yard fixture failed');
    })()`);
    await frame(context);
    await context.waitFor(`(()=>{window.__qaApp.onFrame?.(window.__qaApp.duel.state,0);window.__render.renderFrame();return window.__qaApp.visualReady;})()`,'native yard assets',60000);
    await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(8);a.onFrame?.(a.duel.state,0);if(!a.isYardHomeActive())throw Error('Native yard arrival did not finish');window.__cardProfileBefore=JSON.stringify(a.profile);window.__cardRaceBefore=JSON.stringify(a.duel.state);})()`);
    await click(context,'[data-action="yard-cards"]');
    await context.waitFor(`(()=>{const failed=[...document.querySelectorAll('[data-card-art="error"]')];if(failed.length)throw Error('Failed card models: '+failed.map(i=>i.dataset.cardView).join(','));return document.querySelectorAll('[data-card-art="ready"]').length===8;})()`,'eight actual fitted story car pictures',60000);
    const wall=await context.evaluate(`(()=>{const a=window.__qaApp,images=[...document.querySelectorAll('[data-card-view]')];
      if(JSON.stringify(a.profile)!==window.__cardProfileBefore||JSON.stringify(a.duel.state)!==window.__cardRaceBefore)throw Error('Wall rendering wrote save or race state');
      if(images.some(i=>!i.complete||i.naturalWidth!==640))throw Error('Missing real model image');
      if(!images.some(i=>JSON.parse(i.dataset.cardView).carId==='convoy-tanker'))throw Error('Tollkeeper used a proxy car');
      return{cards:images.length,readOnly:true,tanker:'convoy-tanker'};})()`);
    await context.screenshot(quality+'-story-wall');
    await context.evaluate(`document.querySelector('[data-story-card="tollkeeper"]').scrollIntoView({block:'center'});`);
    await context.screenshot(quality+'-story-wall-tanker');
    await click(context,'[data-action="yard-crew"]');
    if(!await context.evaluate(`!!document.querySelector('[data-crew-select="vesper"]')`))throw Error('Earned Vesper missing');
    await click(context,'[data-crew-select="vesper"]');
    await context.evaluate(`document.querySelector('[data-crew-select="vesper"]').closest('article').scrollIntoView({block:'center'});`);
    await context.screenshot(quality+'-earned-vesper');
    await context.evaluate(`(()=>{const a=window.__qaApp;if(a.profile.wasteland.crew.selected!=='vesper')throw Error('Native Vesper selection failed');
      if(!a.startWarlordFight('sal')||!a.beginWarlordFight())throw Error('Native poster fight failed');
      a.duel.state.countdown=0;a.duel.step(1/120);a.duel.step(1/120);
      const s=a.duel.state;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
      s.arena.clockSec=72;s.combat.scoring.hitsLanded=17;
      for(let i=0;i<3;i++){const r=s.opponents[0];for(const participant of s.arena.participants){participant.protectedSec=0;participant.wreckCounted=false;}
        s.invulnerableSec=0;s.combat.shield=s.combat.rivalShield=0;r.combatWrecking=false;r.armor=1;
        CardsNative.applyArmorDamage(a.duel,r,'crossbow',{owner:'player'});a.duel.step(1/120);}
      a.onFrame?.(s,0);if(s.status!=='arena_result'||s.arena.result.winnerId!=='player')throw Error('Native win did not reach poster');})()`);
    await frame(context);
    await context.waitFor(`document.querySelector('[data-wanted-poster] [data-card-art="ready"]')`,'actual winning car and Vesper picture',60000);
    await context.evaluate(`document.querySelector('[data-wanted-poster]').scrollIntoView({block:'center'});`);
    await context.screenshot(quality+'-victory-poster');
    const poster=await context.evaluate(`(()=>{const s=window.__qaApp.duel.state,p=document.querySelector('[data-wanted-poster]');
      if(!p.textContent.includes('Vesper Blackiron')||!p.textContent.includes(String(s.combat.scoring.hitsLanded)))throw Error('Wrong fight poster metrics');
      return{car:s.car,crew:s.crewId,wrecks:s.arena.participants[0].wrecks,hits:s.combat.scoring.hitsLanded};})()`);
    // Declared native driving fixture, using the actual exit and signature verbs.
    await context.evaluate(`(()=>{const a=window.__qaApp;a.duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,discoveredGate:true,crewId:'vesper'});
      const s=a.duel.state;Object.assign(s,{status:'racing',countdown:0,s:500,prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[]});
      s.combat.aiTimer=s.combat.pickupTimer=Infinity;s.opponents.forEach((r,i)=>Object.assign(r,{s:530+i*20,prevS:530+i*20,lateral:0,prevLateral:0,speedMph:0}));
      a.duel.setInput({interact:true});for(let i=0;i<60&&!s.onFoot;i++)a.duel.step(1/120);a.duel.setInput({interact:false});
      if(!s.onFoot||s.fighter.crewId!=='vesper')throw Error('Real Vesper exit failed');a.duel.selectFootGear(3);
      a._footCameraMode='overhead';a.onFrame?.(s,0);window.__render.renderFrame();})()`);
    await context.waitFor(`(()=>{window.__render.renderFrame();let ready=false;window.__render.scene.traverse(n=>{if(n.userData?.crewId==='vesper'&&n.getObjectByProperty('isSkinnedMesh',true))ready=true;});return ready;})()`,'installed Vesper native rig',60000);
    await context.screenshot(quality+'-vesper-on-foot');
    await context.evaluate(`(async()=>{const audio=window.__qaApp.audio;audio.unlock();audio.setMuted(false);audio.setPaused(false);await Promise.all([audio._samplesPromise,audio._cueBuffersPromise]);window.__shockCues=[];const original=audio._playCue;audio._playCue=function(id,options){const voice=original.call(this,id,options);if(voice&&id.startsWith('weapon.tesla.'))window.__shockCues.push({id,scale:options?.scale,simSec:window.__qaApp.duel.state.stageTimeSec});return voice;};})()`);
    const shock=await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state;a.duel.setFighterInput({fire:true});a.duel.step(1/120);a.duel.setFighterInput({fire:false});
      if(!s.combat.teslaCharges.some(c=>c.crewShock))throw Error('Native Shock tell missing');a.onFrame?.(s,0);window.__render.renderFrame();
      return{gear:s.footGear.name,cooldown:s.crewGear.nextFireAt-s.crewGear.lastFireAt};})()`);
    await context.screenshot(quality+'-shock-tell');
    await context.evaluate(`window.__qaApp.advance(.4);window.__qaApp.onFrame?.(window.__qaApp.duel.state,0);window.__render.renderFrame();`);
    await context.screenshot(quality+'-shock-pulse');
    const cues=await context.evaluate(`(()=>{const cues=window.__shockCues;if(cues.length!==2||cues[0].id!=='weapon.tesla.charge'||cues[1].id!=='weapon.tesla.pulse'||cues.some(c=>c.scale!==.55)||Math.abs(cues[1].simSec-cues[0].simSec-.4)>1/120+.000001)throw Error('Existing smaller Tesla sound did not follow the actual Shock tell: '+JSON.stringify(cues));return cues;})()`);
    report.push({quality,wall,poster,shock,cues});
  }
  await writeFile(join(context.outputDir,'warlord-cards.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Warlord cards native: '+JSON.stringify(report));
}
