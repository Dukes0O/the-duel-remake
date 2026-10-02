import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {DRIVE} from '../../src/config.js';

// Production App arena entry and native Duel steps. Discovery, owned cars,
// parked poses and held CPU goals are explicit memory-only QA fixtures.
async function ready(context, label) {
  await context.waitFor(`(() => {
    const app=window.__qaApp,render=window.__render;
    app?.onFrame?.(app.duel.state,0);render?.renderFrame();
    if(!app?.visualReady||document.querySelector('#view3d')?.dataset.vehicleAsset!=='ready'||
      !document.querySelector('#renderer-loading')?.hidden)return false;
    return [app.duel.state.car,...app.duel.state.opponents.map(car=>car.car)]
      .every(key=>render.scene.children.some(node=>node.userData.vehicleKey===key&&node.userData.vehicleSource));
  })()`,label,60000);
}

function installFixture(mphToWorld) {
  const app=window.__qaApp,duel=app.duel,state=duel.state,dt=1/120;
  const props=duel.course.features.crushables,prop=props[0];
  const tick=n=>{for(let i=0;i<n;i++)duel.step(dt);};
  const pose=(actor,s,lateral=0,headingError=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,
    headingError,speedMph:0,pushVelocity:0,yawVelocity:0,steerVisual:0,slipAngle:0,
    airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,knock:null});
  const move=(item,s,lateral)=>{
    const at=duel.course.groundAt(s,lateral);
    Object.assign(item,at,{s,prevS:s,lateral,prevLateral:lateral,off:lateral,
      headingError:0,speedMph:0,pushVelocity:0,airborne:false,airHeight:0,prevAirHeight:0,knock:null});
  };
  const hold=actor=>{
    const at=duel.course.worldAt(actor.s,actor.lateral),heading=duel.course.at(actor.s).heading;
    const member=state.arena.participants.find(p=>p.id===actor.arenaId);
    Object.assign(member,{targetId:null,targetHeldSec:-100,reactionSec:Infinity,
      goal:{x:at.x+Math.sin(heading)*20,z:at.z+Math.cos(heading)*20,speedMph:0,boost:false}});
  };
  state.combat.aiTimer=state.combat.pickupTimer=Infinity;
  duel.setInput({throttle:0,brake:0,steer:0,boost:false});
  for(let index=0;index<props.length;index++)
    move(props[index],duel.course.length*.48+index*12,index%2?-12:12);
  move(prop,96,0);pose(state,20);
  state.opponents.forEach((actor,index)=>{pose(actor,duel.course.length*.78+index*15);hold(actor);});
  const initial={x:prop.x,z:prop.z,heading:prop.heading};
  let maximum=0;
  function frame(){
    const before=JSON.stringify({state,props});
    app.onFrame?.(state,0);window.__render.renderFrame();
    if(JSON.stringify({state,props})!==before)throw Error('Renderer changed native simulation');
    const root=window.__render.scene.getObjectByName('Crushable '+prop.id);
    if(!root||Math.hypot(root.position.x-prop.x,root.position.z-prop.z)>1e-7||
      Math.abs(Math.atan2(Math.sin(root.rotation.y-prop.heading),Math.cos(root.rotation.y-prop.heading)))>1e-7)
      throw Error('Visible cover does not follow native position and spin');
    return {x:prop.x,z:prop.z,heading:prop.heading,moved:maximum,
      root:[root.position.x,root.position.z,root.rotation.y],
      crushed:state.crushedProps.includes(prop.id),armor:state.armor,
      clock:state.arena.clockSec,knock:!!prop.knock};
  }
  function hit(mph,offset){
    const heading=prop.heading,spec=duel._vehicleSpec(state),f={x:Math.sin(heading),z:Math.cos(heading)};
    const side={x:f.z,z:-f.x},gap=spec.halfLength+prop.halfZ+.025;
    const from={x:prop.x-f.x*gap+side.x*offset,z:prop.z-f.z*gap+side.z*offset};
    const to={x:from.x+f.x*mph*mphToWorld*dt,z:from.z+f.z*mph*mphToWorld*dt};
    const before=duel.course.nearest(from.x,from.z,prop.s),end=duel.course.nearest(to.x,to.z,prop.s);
    pose(state,end.s,end.lateral,heading-duel.course.at(end.s).heading);
    state.speedMph=mph;state.prevS=before.s;state.prevLateral=before.lateral;
    duel._crushProps(state);
    if(!prop.knock||Math.hypot(prop.knock.vx,prop.knock.vz)<=0)throw Error('Native ram did not move cover');
    pose(state,20);return {mass:duel._vehicleSpec(prop).mass,velocity:[prop.knock.vx,prop.knock.vz],spin:prop.knock.spin};
  }
  function advance(n){
    for(let i=0;i<n;i++){
      tick(1);maximum=Math.max(maximum,Math.hypot(prop.x-initial.x,prop.z-initial.z));
      if(Math.abs(duel.course.nearest(prop.x,prop.z,prop.s).lateral)>
        duel.course.def.scrapdome.floorHalfWidth+1e-8)throw Error('Cover left native floor');
    }
    return frame();
  }
  // A fixed overview contains the contact and its slide; changing this view
  // never changes a body pose or velocity.
  const f={x:Math.sin(initial.heading),z:Math.cos(initial.heading)};
  app.inspectionCamera={position:[initial.x-f.z*18-f.x*8,12,initial.z+f.x*18-f.z*8],
    target:[initial.x+f.x*6,.6,initial.z+f.z*6]};
  window.__junkQA={hit,advance,frame};return {initial,count:props.length,car:state.car};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  const report=[];
  for(const quality of ['high','performance']){
    await context.evaluate('window.name=""');
    await context.navigate('/tools/menu-check.html?seed=1989&harness=arena-junk-'+quality);
    await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' actual menu',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only QA page required');
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
      app.profile={...app.profile,unlockedCars:[...new Set([...app.profile.unlockedCars,'banshee_muscle','titan_monster'])],
        wasteland:{...app.profile.wasteland,discoveredGate:true,xp:3500}};
      if(!app._saveProfile()||!app.visitWasteland())throw Error('Synthetic discovery fixture failed');
    })()`);
    await ready(context,quality+' actual yard readiness');
    await context.evaluate('window.__qaApp.advance(8)');
    await context.waitFor('window.__qaApp.isYardHomeActive()',quality+' actual yard',30000);
    for(const car of ['banshee_muscle','titan_monster']){
      await context.evaluate(`(() => {
        const app=window.__qaApp;app.menuCar=${JSON.stringify(car)};
        if(!app.startArenaEvent({opponents:1}))throw Error('Production arena entry failed');
        app.setCamera('chase');app.inspectionCamera=null;
        for(let n=0;n<362;n++)app.duel.step(1/120);
        if(app.duel.state.status!=='racing'||app.duel.state.car!==${JSON.stringify(car)})
          throw Error('Production arena/countdown/car fixture failed');
      })()`);
      await ready(context,quality+' '+car+' actual arena readiness');
      const setup=await context.evaluate(`(${installFixture.toString()})(${DRIVE.mphToWorld})`);
      const before=await context.evaluate('window.__junkQA.frame()');
      await context.screenshot(quality+'-'+car+'-before');
      const impact=await context.evaluate('window.__junkQA.hit(40,'+(car==='titan_monster'?0:.7)+')');
      const moving=await context.evaluate('window.__junkQA.advance(12)');
      await context.screenshot(quality+'-'+car+'-sliding');
      const settled=await context.evaluate('window.__junkQA.advance(948)');
      await context.screenshot(quality+'-'+car+'-settled');
      const later=await context.evaluate('window.__junkQA.advance(240)');
      assert.equal(impact.mass,2175);
      assert.ok(settled.moved>=(car==='titan_monster'?5:2),'native displacement meets the settled floor');
      assert.equal(settled.knock,false,'driverless cover settles');
      assert.deepEqual(later.root,settled.root,'visible pose persists later in round');
      assert.equal(settled.crushed,car==='titan_monster','Titan alone keeps native crush');
      if(car!=='titan_monster')assert.notEqual(settled.heading,before.heading,'native off-centre spin is visible');
      report.push({quality,car,setup,before,impact,moving,settled,later});
    }
  }
  await writeFile(join(context.outputDir,'arena-junk-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Arena junk: four real-App cases, both qualities, native movement/spin, containment, settling and render purity pass.');
}
