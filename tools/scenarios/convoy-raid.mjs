import {build} from 'vite';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
async function nativeHelpers(){
  const entry=resolve(root,'.qa-dist/convoy-entry.virtual.js');
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'convoy-native-fixture',resolveId:id=>id===entry?'\0convoy-fixture':null,
    load:id=>id==='\0convoy-fixture'?[
      'export {applyArmorDamage} from '+JSON.stringify(resolve(root,'src/combat-armor.js'))+';',
      'export {convoyPoint,CONVOY_ROOF_PLATE} from '+JSON.stringify(resolve(root,'src/arena/convoy.js'))+';',
      'export {createFighter} from '+JSON.stringify(resolve(root,'src/onfoot.js'))+';',
    ].join('\n'):null,
  }],build:{write:false,minify:false,lib:{entry,name:'ConvoyNative',formats:['iife']}}});
  const output=Array.isArray(result)?result[0].output:result.output;
  return output.find(item=>item.type==='chunk').code;
}
async function click(context,selector){
  const at=await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.disabled)throw Error('Missing Convoy control');b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  for(const type of ['mousePressed','mouseReleased'])await context.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...at});
}
async function ready(context){
  await context.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    return a?.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`,'Convoy assets',60000);
}
async function roofView(context,name){
  await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],at=a.duel.course.groundAt(r.s,r.lateral),h=at.heading+r.headingError;
    const before=JSON.stringify(s.arena);a.inspectionCamera={position:[at.x+Math.cos(h)*14+Math.sin(h)*10,at.y+9,at.z-Math.sin(h)*14+Math.cos(h)*10],target:[at.x,at.y+1.7,at.z]};
    for(let i=0;i<18;i++)window.__render.renderFrame();
    if(JSON.stringify(s.arena)!==before)throw Error('Roof inspection changed race state');
    document.querySelector('#race-hud').style.visibility='hidden';})()`);
  await context.screenshot(name);
  await context.evaluate(`delete window.__qaApp.inspectionCamera;document.querySelector('#race-hud').style.visibility='';window.__render.renderFrame();`);
}
export async function run(context){
  const helpers=await nativeHelpers();
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']){
    await context.evaluate('window.name=""');
    await context.navigate('/tools/menu-check.html?flags=convoy-raid,salt-flats,crew-gear&harness=convoy-'+quality);
    await context.waitFor('!!window.__qaApp','Convoy memory menu',60000);
    await context.evaluate(helpers+';window.__convoyNative=ConvoyNative;');
    await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.setGraphicsQuality(${JSON.stringify(quality)});
      if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage missing');
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
      a.cpuDifficulty='medium';a.profile.wasteland.discoveredGate=true;a.profile.wasteland.xp=1000000;
      a.profile.wasteland.territories.tollkeeper.hold=10;
      if(!a._saveProfile()||!a.visitWasteland())throw Error('Convoy yard fixture failed');})()`);
    await ready(context);await context.evaluate('window.__qaApp.advance(8)');await ready(context);
    await click(context,'[data-action="yard-scrapdome"]');
    await click(context,'[data-arena-mode="convoy-raid"]');
    await context.screenshot(quality+'-convoy-yard');
    await click(context,'[data-action="arena-start"]');await ready(context);
    await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(3.1);const s=a.duel.state,r=s.opponents[0];
      for(const p of s.arena.participants)p.protectedSec=p.id==='cpu-1'?0:10000;
      s.s=s.prevS=r.s-28;s.lateral=s.prevLateral=r.lateral;s.headingError=0;
      s.combat.aiTimer=Infinity;a.onFrame?.(s,0);})()`);await ready(context);
    const cold=await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],before=JSON.stringify(s.arena);
      a.onFrame?.(s,0);window.__render.renderFrame();const model=window.__render.scene.getObjectByName('convoy-tanker'),lamps=[];
      (model?.getObjectByName('convoy-tanker-detail')?.levels[0]?.object??model)?.traverse(n=>{if(n.name.startsWith('tanker-warning-lamp-'))lamps.push(n.material.emissiveIntensity)});
      if(!model?.visible||lamps.length!==2||lamps.some(v=>v!==0)||a.duel._vehicleSpec(r).mass!==12000)
        throw Error('Actual rig or cold roof lamps missing');
      if(JSON.stringify(s.arena)!==before)throw Error('Renderer changed Convoy state');
      return{lamps,mass:a.duel._vehicleSpec(r).mass};})()`);
    await context.screenshot(quality+'-convoy-lamps-off');
    await roofView(context,quality+'-convoy-roof-off');
    const pacing=await context.evaluate(`(async()=>{const a=window.__qaApp,s=a.duel.state,start=s.opponents[0].s,frames=[];
      for(let i=0;i<180;i++){const t=await new Promise(requestAnimationFrame);if(i>0)frames.push(t-frames.last);
        frames.last=t;a.advance(1/60);a.onFrame?.(s,1/60);window.__render.renderFrame();}
      if(s.opponents[0].s===start)throw Error('The native rig did not move');
      const sorted=[...frames].sort((a,b)=>a-b);return{p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),over33:frames.filter(v=>v>33).length};})()`);
    await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],at=a.duel.course.groundAt(r.s,r.lateral),n=window.__convoyNative;
      s.invulnerableSec=0;s.arena.participants[0].protectedSec=0;
      for(let i=0;i<10&&s.arena.convoy.valves.some(v=>v>0);i++)n.applyArmorDamage(a.duel,r,'bomb',
        {owner:'player',damageMultiplier:100,hitPosition:at,blastRadius:20});
      if(s.arena.convoy.valves.some(v=>v!==0))throw Error('Native blasts did not break all valves '+JSON.stringify({valves:s.arena.convoy.valves,mode:s.mode,discovered:s.wastelandGateDiscovered,finished:r.finished,crushed:r.crushed,wrecking:r.combatWrecking,shield:s.combat.rivalShield,protection:s.arena.participants[1].protectedSec}));
      s.s=s.prevS=r.s-28;s.lateral=s.prevLateral=r.lateral;a.onFrame?.(s,0);})()`);await ready(context);
    await context.evaluate(`(()=>{const s=window.__qaApp.duel.state,model=window.__render.scene.getObjectByName('convoy-tanker'),lamps=[];
      (model?.getObjectByName('convoy-tanker-detail')?.levels[0]?.object??model).traverse(n=>{if(n.name.startsWith('tanker-warning-lamp-'))lamps.push(n.material.emissiveIntensity)});
      if(lamps.length!==2||lamps.some(v=>v!==1.2)||s.arena.convoy.boardingLeftSec<59)
        throw Error('Native boarding window or lit roof lamps missing');})()`);
    await context.screenshot(quality+'-convoy-lamps-on');
    await roofView(context,quality+'-convoy-roof-on');
    await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],n=window.__convoyNative,p=n.CONVOY_ROOF_PLATE,
      at=n.convoyPoint(a.duel,r,[p.x,p.y,p.z]),ground=a.duel.course.groundAt(r.s,r.lateral);
      s.onFoot=true;s.fighter=n.createFighter(a.duel.course,s,{s:r.s,lateral:r.lateral});
      Object.assign(s.fighter,{x:at.x,z:at.z,y:at.y+.02,groundY:ground.y,airHeight:at.y-ground.y+.02,verticalSpeed:-3});
      a.duel.setFighterInput({fire:true});for(let i=0;i<372;i++)a.duel.step(1/120);
      if(s.status!=='arena_result'||s.arena.result.reason!=='charge'||!s.arena.result.settlementSaved||
        s.arena.result.scrapEarned!==840||s.arena.result.holdAdded!==25)throw Error('Native charge win or saved pay failed '+JSON.stringify({status:s.status,boarding:s.boarding,result:s.arena.result}));
      a.onFrame?.(s,0);})()`);await context.screenshot(quality+'-convoy-win');
    await click(context,'[data-action="arena-rematch"]');await ready(context);
    await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(3.1);const s=a.duel.state;
      s.arena.clockSec=300-1/240;a.duel.step(1/120);
      if(s.status!=='arena_result'||s.arena.result.reason!=='time'||!s.arena.result.settlementSaved||s.arena.result.scrapEarned!==0)
        throw Error('Native Convoy timeout failed');a.onFrame?.(s,0);})()`);
    await context.screenshot(quality+'-convoy-loss');
    console.log(quality+' Convoy native rig/lamps/charge/pay/timeout '+JSON.stringify({cold,pacing}));
  }
}
