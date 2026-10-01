import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DRIVE} from '../../src/config.js';

// Production App entry and native Duel contacts/120 Hz steps. Temporary profile,
// starting poses, one-armor wreck setup, stopped motion and held CPU goals are
// labelled fixtures. Renderer calls read state; no solver or actor API is replaced.
async function ready(c, label) {
  await c.waitFor(`(() => {
    const a=window.__qaApp,r=window.__render;a?.onFrame?.(a.duel.state,0);r?.renderFrame();
    if(!a?.visualReady||!r||document.querySelector('#view3d')?.dataset.vehicleAsset!=='ready'||
      !document.querySelector('#renderer-loading')?.hidden)return false;
    const cars=a.duel.state.status==='menu'?[a.menuCar||a.duel.state.car]:
      [a.duel.state.car,...a.duel.state.opponents.map(actor=>actor.car)];
    if(!cars.every(key=>r.scene.children.some(node=>node.userData.vehicleKey===key&&node.userData.vehicleSource)))return false;
    if(a.duel.state.onFoot){
      const group=r.scene.getObjectByName('Rigged on-foot fighters'),id=a.duel.state.fighter?.crewId||'rook';
      if(group?.userData.loadErrors?.length)throw Error('Authored crew failed to load');
      if(group?.userData.crews[id]!=='ready')return false;
      let authored=false;group.children.filter(node=>node.visible&&node.userData.crewId===id)
        .forEach(node=>node.traverse(mesh=>{if(mesh.isSkinnedMesh){let visible=true;
          for(let parent=mesh;parent;parent=parent.parent)if(!parent.visible)visible=false;
          authored ||= visible;}}));
      if(!authored)return false;
    }
    return true;
  })()`,label,60000);
}
async function capture(c, label) {
  await ready(c,label+' actual car/crew readiness');
  await c.screenshot(label);
}
function installFixtures(mphToWorld) {
  const a=window.__qaApp,dt=1/120;
  const tick=n=>{for(let i=0;i<n;i++)a.duel.step(dt);};
  const pose=(actor,s,lateral=0,headingError=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,
    headingError,speedMph:0,steerVisual:0,yawVelocity:0,pushVelocity:0,slipAngle:0,knock:null,
    airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,contactCooldown:0,damageCooldown:0});
  const member=actor=>a.duel.state.arena.participants.find(p=>p.id===(actor===a.duel.state?'player':actor.arenaId));
  const hold=actor=>{const d=a.duel,at=d.course.worldAt(actor.s,actor.lateral),heading=d.course.at(actor.s).heading+actor.headingError;
    Object.assign(member(actor),{targetId:'player',targetHeldSec:-100,reactionSec:10,
      goal:{x:at.x+Math.sin(heading)*30,z:at.z+Math.cos(heading)*30,speedMph:0,boost:false}});};
  const shell=(x,y)=>{const d=a.duel,A=d._vehicleSpec(x),B=d._vehicleSpec(y),alpha=x.headingError||0,beta=y.headingError||0;
    return{width:A.halfWidth*Math.abs(Math.cos(alpha))+B.halfWidth*Math.abs(Math.cos(beta))+
      A.halfLength*Math.abs(Math.sin(alpha))+B.halfLength*Math.abs(Math.sin(beta))+.2,
      length:A.halfLength*Math.abs(Math.cos(alpha))+B.halfLength*Math.abs(Math.cos(beta))+
      A.halfWidth*Math.abs(Math.sin(alpha))+B.halfWidth*Math.abs(Math.sin(beta))+.3};};
  function approach(mph,normal=false,side=1){const d=a.duel,s=d.state,b=s.opponents[0];
    pose(s,20);d._vehicleContact(s,b,'rival'); // Native separation clears the previous real incident.
    pose(s,b.s,b.lateral,normal?side*Math.PI/2:0);const envelope=shell(s,b);
    pose(s,normal?b.s:b.s-envelope.length-.02,normal?b.lateral-side*(envelope.width+.02):b.lateral,normal?side*Math.PI/2:0);
    s.speedMph=mph+1.1;d.setInput({throttle:0,brake:0,steer:0,boost:false});
  }
  function prepare(kind,mph,normal=false,side=1){
    if(!a.restart())throw Error('Production arena rematch failed');tick(362);
    const d=a.duel,s=d.state,b=s.opponents[0];
    if(s.status!=='racing'||s.arena.phase!=='fight')throw Error('Actual arena countdown did not finish');
    s.combat.aiTimer=s.combat.pickupTimer=Infinity; // Isolate car contact from unrelated weapon/crate timing.
    pose(s,20);pose(b,90);hold(b);d.setInput({throttle:0,brake:0,steer:0,boost:false});
    if(kind==='wreck'||kind==='protected'){
      b.armor=1;approach(60);d._drive(dt);
      if(!d._vehicleContact(s,b,'rival')||!b.combatWrecking)throw Error('Native owned contact failed to create wreck');
      tick(1);
      if(kind==='protected'){
        for(let n=0;n<430&&b.combatWrecking;n++)tick(1);
        if(b.combatWrecking||member(b).protectedSec!==2||b.armor!==b.maxArmor)
          throw Error('Native deadline/full-armor/two-second protection failed');
      }
    }
    const limit=d.course.def.scrapdome.floorHalfWidth;
    pose(b,90,normal||kind==='pinned'?side*(limit+.01):0,kind==='pinned'&&!normal?side*Math.PI/2:0);
    hold(b);if(normal||kind==='pinned')tick(1); // Actual event containment pins the stopped actor.
    approach(mph,normal,side);
    window.__shoveCase={kind,mph,normal,side,initial:d.course.worldAt(b.s,b.lateral),
      armor:b.armor,attackerArmor:s.armor,timer:b.combatWreckTimer,protection:member(b).protectedSec,
      count:member(b).wrecked,limit};
    return{...window.__shoveCase,car:s.car,targetCar:b.car,stopped:b.speedMph,
      wreck:b.combatWrecking,protectedSec:member(b).protectedSec,wall:b.lateral};
  }
  function hit(){const d=a.duel,s=d.state,b=s.opponents[0],q=window.__shoveCase,frame=d.course.at(b.s);
    d._drive(dt);const incoming=q.normal?Math.abs(Math.sin(s.headingError)*s.speedMph):s.speedMph;
    if(incoming+1e-8<q.mph||!d._vehicleContact(s,b,'rival'))throw Error('Actual swept ram missed the fixture threshold/contact');
    const start=s.lateral;let moved=0,reverse=0,rebound=0,air=0;
    for(let n=0;n<210;n++){
      tick(1);const at=d.course.worldAt(b.s,b.lateral);
      moved=Math.max(moved,Math.hypot(at.x-q.initial.x,at.z-q.initial.z));air=Math.max(air,b.airHeight||0);
      if(Math.abs(b.lateral)>q.limit+1e-8||Math.abs(s.lateral)>q.limit+1e-8)throw Error('Native bodies escaped the solid arena');
      const k=s.knock,velocity=k?q.side*(k.vx*Math.cos(frame.heading)-k.vz*Math.sin(frame.heading)):
        q.side*(Math.sin(s.headingError)*s.speedMph*mphToWorld+(s.pushVelocity||0));
      reverse=Math.max(reverse,-velocity);rebound=Math.max(rebound,q.side*(start-s.lateral));
    }
    return{kind:q.kind,mph:q.mph,normal:q.normal,side:q.side,incoming,moved,reverse,rebound,air,
      armorBefore:q.armor,armorAfter:b.armor,attackerArmorBefore:q.attackerArmor,attackerArmorAfter:s.armor,
      initialTimer:q.timer,remainingTimer:b.combatWreckTimer,wreck:b.combatWrecking,
      protectedSec:member(b).protectedSec,wreckCount:member(b).wrecked,targetLateral:b.lateral,limit:q.limit};
  }
  function deadline(){const d=a.duel,b=d.state.opponents[0];let ticks=0;
    while(b.combatWrecking&&ticks<430){tick(1);ticks++;}
    return{ticks,wreck:b.combatWrecking,armor:b.armor,maxArmor:b.maxArmor,
      protectedSec:member(b).protectedSec,wreckCount:member(b).wrecked};}
  window.__shove={prepare,hit,deadline};return true;
}
export async function run(c) {
  const report={cases:[],walls:[],frames:[],fixtures:'Memory-only discovered profile, stopped/approach poses, one-armor native wreck setup, real recovery timers, existing held CPU goals and isolated weapon/crate timers. Contacts and subsequent 120 Hz physics remain genuine.',
    limits:'Scripted contact/state captures do not prove natural CPU behavior, human Preview feel, listening or resolved historical HUD overlaps. Native all-mass/FPS/traffic controls remain independent.'};
  const save=()=>writeFile(join(c.outputDir,'arena-shove-browser.json'),JSON.stringify(report,null,2)+'\n');
  for(const quality of ['high','performance']){
    await c.evaluate('window.name=""');
    await c.navigate('/tools/menu-check.html?harness=arena-shove-'+quality);
    await c.waitFor('!!window.__qaApp&&!!window.__render',quality+' private menu',60000);
    await c.evaluate(`(() => {const a=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only QA is required');
      a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});a.menuCar='falcone_f42';
      for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false;
      a.profile={...a.profile,wasteland:{...a.profile.wasteland,discoveredGate:true,xp:3500,rank:6}};
      if(!a._saveProfile()||!a.visitWasteland())throw Error('Memory-only discovery fixture failed');})()`);
    await ready(c,quality+' actual yard approach');await c.evaluate('window.__qaApp.advance(8)');
    await c.waitFor('window.__qaApp.isYardHomeActive()',quality+' actual yard');
    await c.evaluate(`(() => {const a=window.__qaApp;if(!a.startArenaEvent({opponents:1}))throw Error('Production arena entry failed');a.setCamera('chase');a.inspectionCamera=null;})()`);
    await c.evaluate(`(${installFixtures.toString()})(${DRIVE.mphToWorld})`);
    for(const kind of ['wreck','pinned','protected','idle'])for(const mph of [20,40]){
      const label=quality+'-'+kind+'-'+mph+'mph';
      const before=await c.evaluate(`window.__shove.prepare(${JSON.stringify(kind)},${mph})`);
      assert.equal(before.stopped,0,'target is a real stopped actor');
      if(kind==='wreck')assert.equal(before.wreck,true);
      if(kind==='protected')assert.equal(before.protectedSec,2);
      await capture(c,label+'-before');
      const result=await c.evaluate('window.__shove.hit()');report.cases.push({quality,before,result});await save();
      assert.ok(result.moved+1e-8>=(mph===40?4:1.5),'actual native shove minimum: '+JSON.stringify(result));
      if(kind==='wreck'){assert.equal(result.wreck,true);assert.equal(result.air,0);assert.equal(result.wreckCount,1);
        assert.ok(result.remainingTimer>0&&result.remainingTimer<result.initialTimer);}
      if(kind==='protected'){assert.equal(result.armorAfter,result.armorBefore);assert.equal(result.attackerArmorAfter,result.attackerArmorBefore);assert.ok(result.protectedSec>0);}
      await capture(c,label+'-after');
      if(kind==='wreck'&&mph===40){const recovery=await c.evaluate('window.__shove.deadline()');report.cases.at(-1).recovery=recovery;await save();
        assert.equal(recovery.wreck,false);assert.equal(recovery.armor,recovery.maxArmor);assert.equal(recovery.protectedSec,2);assert.equal(recovery.wreckCount,1);
        await capture(c,quality+'-native-deadline-respawn-protection');}
    }
    for(const side of [-1,1]){
      await c.evaluate(`window.__shove.prepare('idle',40,true,${side})`);
      await capture(c,quality+'-normal-wall-'+side+'-before');
      const result=await c.evaluate('window.__shove.hit()');report.walls.push({quality,result});await save();
      await capture(c,quality+'-normal-wall-'+side+'-after');
      assert.ok(result.moved<1e-4,'pure outward target stays at the solid wall');
      assert.ok(result.armorAfter<result.armorBefore,'eligible normal ram retains armor damage');
      assert.ok(result.reverse>1e-6&&result.rebound>.01,'attacker actually rebounds away from solid wall: '+JSON.stringify(result));
    }
    const frames=await c.evaluate(`(async()=>{const a=window.__qaApp;if(!a.restart())throw Error('Native pacing rematch failed');a.advance(3.1);
      a.duel.setInput({throttle:.45,brake:0,steer:.08,boost:false});a.start();const times=[];let last=0;
      try{for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(last&&i>30)times.push(t-last);last=t;}}
      finally{a.stop();}const sorted=[...times].sort((a,b)=>a-b);
      return{mean:times.reduce((x,y)=>x+y,0)/times.length,p95:sorted[Math.floor(sorted.length*.95)],samples:times.length,
        draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};})()`);
    report.frames.push({quality,...frames});await save();
  }
  await c.evaluate('window.__qaApp.stop()');
  console.log('Arena shove: actual High/Performance stopped-state, 20/40 mph, solid-wall rebound and native respawn/protection controls passed. Human feel/listening remain pending.');
}
