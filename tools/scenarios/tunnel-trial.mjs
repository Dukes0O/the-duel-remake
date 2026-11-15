import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {westScarpTrial} from '../../src/world/scablands-tunnel-trial.js';
import {scablandsActorHeightAt, scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {RIVER_LAND} from '../../src/world/scablands-regions.js';

// The page uses the game bundle and a memory-only profile supplied by the harness.
export async function run(context) {
  const report = {card: 'TUNNEL-TRIAL', quality: 'performance', views: [], drives: []};
  const persist = () => writeFile(join(context.outputDir, 'tunnel-trial.json'), JSON.stringify(report, null, 2) + '\n');
  const click = selector => context.evaluate(`(() => {document.querySelector(${JSON.stringify(selector)}).click();})()`);
  const frame = `window.__qaApp.onFrame?.(window.__qaApp.duel.state,0); window.__render.renderFrame();`;
  // Match the game's ordinary arena placement, including its explicit floor height.
  const place = (x, z, heading, height) => `{
    const a=window.__qaApp,d=a.duel,s=d.state,p=d.course.nearest(${x},${z});
    s.s=s.prevS=p.s; s.lateral=s.prevLateral=p.lateral;
    s.headingError=Math.atan2(Math.sin(${heading}-d.course.at(p.s).heading),Math.cos(${heading}-d.course.at(p.s).heading));
    s.speedMph=0;s.yawVelocity=0;s.pushVelocity=0;s.slipAngle=0;s.airborne=false;
    s.airHeight=s.prevAirHeight=0;s._jumpY=null;s._verticalSpeed=0;s._jumpOrigin=null;s._ramVerticalSpeed=0;
    s.groundHeight=s.prevGroundHeight=${Number.isFinite(height) ? height : 'null'};s.terrainPitch=null;s.terrainRoll=null;
    s.tumble=null;s.impactTimer=0;s.knock=null;s.crashSpin=0;
  }`;
  const picture = async (name, position, target) => {
    await context.evaluate(`(() => {const a=window.__qaApp;a.inspectionCamera=${position ? JSON.stringify({position, target}) : 'null'};
      ${position ? `const p=a.duel.course.nearest(${position[0]},${position[2]});const floor=a.duel.course.groundAt(p.s,p.lateral,${position[1]}).y;if(${position[1]}<=floor)throw Error('Inspection camera is below its floor');` : ''}
      ${position ? `window.__render.camera.position.fromArray(${JSON.stringify(position)});` : "a.setCamera('chase');"} ${frame}})()`);
    if (!position) await context.evaluate(`(async()=>{for(let i=0;i<60;i++)await new Promise(done=>requestAnimationFrame(()=>{${frame} done();}));})()`);
    const file = await context.screenshot(`tunnel-${name}`);
    const stats = await context.evaluate(`(async()=>{const intervals=[];await new Promise(done=>{let last;const tick=now=>{
      ${frame} if(last!==undefined)intervals.push(now-last);last=now;
      if(intervals.length===30)done();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});
      const r=window.__render.renderer.info.render, sorted=[...intervals].sort((a,b)=>a-b);
      return {drawCalls:r.calls,triangles:r.triangles,frameIntervalsMs:intervals,frameP95Ms:sorted[Math.ceil(sorted.length*.95)-1]};})()`);
    report.views.push({name, file, ...stats});
  };
  try {
    await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,wasteland-town&harness=tunnel-trial');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      if(!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window,'localStorage')?.value) throw Error('Memory-only fixture required');
      const a=window.__qaApp,select=document.querySelector('#graphics-quality');select.value='performance';
      select.dispatchEvent(new Event('change',{bubbles:true}));a.audio.setMuted(true);
      a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true}};a._saveProfile();
    })()`);
    await click('#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await click('[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Story Wall', 30000);
    await click('[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'note read');
    await click('[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Scablands drive', 120000);
    await context.waitFor(`(() => {let root;window.__render.scene.traverse(n=>{if(n.name==='The Scablands')root=n;});return root?.userData.assetStatus==='ready';})()`, 'Scablands art', 120000);
    await context.evaluate(`(() => {const style=document.createElement('style');style.textContent='body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important}';document.head.appendChild(style);document.querySelectorAll('details').forEach(el=>el.remove());})()`);
    await context.evaluate(`(() => {const a=window.__qaApp,d=a.duel;a.stop();d.state.countdown=0;d.state.arena.timeLimitSec=Infinity;
      if(d.state.arena.worldJob?.job?.stepState)d.state.arena.worldJob.job.stepState.ember=100;})()`);

    const segment = westScarpTrial(scablandsSurfaceHeightAt).segment;
    const {start,end,radius} = segment, length=Math.hypot(end.x-start.x,end.z-start.z);
    const dx=(end.x-start.x)/length, dz=(end.z-start.z)/length;
    const tunnelHeading=Math.atan2(dx,dz);
    await context.evaluate(`(() => {${place(start.x-dx*12,start.z-dz*12,tunnelHeading,scablandsSurfaceHeightAt(start.x-dx*12,start.z-dz*12))}})()`);
    for(let i=1;i<=20;i++) {
      const t=i/20, tip={x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,z:start.z+(end.z-start.z)*t};
      await context.evaluate(`(() => {window.__qaApp.duel.course.setGroundTunnels(${JSON.stringify([{start,end:tip,radius}])});${frame}})()`);
      if(i===10) { const x=start.x-dx*25,z=start.z-dz*25; await picture('boring-halfway',[x,scablandsSurfaceHeightAt(x,z)+1.7,z],[start.x+dx*8,start.y,start.z+dz*8]); }
    }
    { const x=start.x-dx*25,z=start.z-dz*25; await picture('low-mouth',[x,scablandsSurfaceHeightAt(x,z)+1.7,z],[start.x+dx*8,start.y,start.z+dz*8]); }
    await context.evaluate(`(() => {${place(end.x+dx*12,end.z+dz*12,tunnelHeading,scablandsSurfaceHeightAt(end.x+dx*12,end.z+dz*12))}})()`);
    { const x=end.x+dx*25,z=end.z+dz*25; await picture('high-mouth',[x,scablandsSurfaceHeightAt(x,z)+1.7,z],[end.x-dx*8,end.y,end.z-dz*8]); }
    await context.evaluate(`(() => {${place(start.x+dx*48,start.z+dz*48,tunnelHeading,start.y+(end.y-start.y)*48/length-radius*.55)}})()`);
    await picture('inside',[start.x+dx*20,start.y+(end.y-start.y)*20/length-radius*.55+1.7,start.z+dz*20],[end.x,end.y,end.z]);
    await context.evaluate(`(() => {${place(start.x+dx*50,start.z+dz*50,tunnelHeading,scablandsSurfaceHeightAt(start.x+dx*50,start.z+dz*50))}})()`);
    await picture('above',[start.x+dx*50+dz*35,Math.max(start.y,end.y)+35,start.z+dz*50-dx*35],[(start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2]);
    await context.evaluate(`(() => {${place(start.x+dx*50,start.z+dz*50,Math.atan2(dx,dz),(start.y+end.y)/2-radius*.55)}})()`);
    await picture('chase-inside',null,null);

    for(const direction of [1,-1]) {
      const origin=direction>0?start:end, heading=Math.atan2(dx*direction,dz*direction);
      const result=await context.evaluate(`(() => {${place(origin.x-direction*dx*8,origin.z-direction*dz*8,heading)}
        const d=window.__qaApp.duel,s=d.state,seg=${JSON.stringify(segment)},dx=${dx},dz=${dz},direction=${direction},length=${length};
        s.speedMph=12;let furthest=-Infinity,floorSamples=0,maxFloorError=0,firstFloor=Infinity,lastFloor=-Infinity;
        for(let i=0;i<1800;i++){const p=d.course.worldAt(s.s,s.lateral),along=(p.x-seg.start.x)*dx+(p.z-seg.start.z)*dz;
          furthest=Math.max(furthest,direction>0?along:length-along);if(furthest>length+3)break;
          if(along>2&&along<length-2){const side=Math.abs((p.x-seg.start.x)*dz-(p.z-seg.start.z)*dx);
            if(side>seg.radius*.835)throw Error('Car left the tunnel sideways');
            const floor=seg.start.y-seg.radius*.55+(seg.end.y-seg.start.y)*along/length;
            floorSamples++;firstFloor=Math.min(firstFloor,along);lastFloor=Math.max(lastFloor,along);
            maxFloorError=Math.max(maxFloorError,Math.abs((s.groundHeight??s._jumpY)-floor));}
          const target=direction>0?seg.end:seg.start,turn=Math.atan2(Math.sin(Math.atan2(target.x+direction*dx*30-p.x,target.z+direction*dz*30-p.z)-d.course.at(s.s).heading-s.headingError),Math.cos(Math.atan2(target.x+direction*dx*30-p.x,target.z+direction*dz*30-p.z)-d.course.at(s.s).heading-s.headingError));
          d.setInput({throttle:1,steer:Math.max(-1,Math.min(1,-turn*2))});d.step(1/60);}
        return {direction,furthest,floorSamples,firstFloor,lastFloor,maxFloorError};})()`);
      report.drives.push(result);
      assert.ok(result.furthest>length+3 && result.floorSamples>10 && result.firstFloor<10 && result.lastFloor>length-10 && result.maxFloorError<1, `Tunnel drive ${direction} must stay on its floor: ${JSON.stringify(result)}`);
    }

    for(const id of ['girder-bridge','the-pipe']) {
      const crossing=RIVER_LAND.crossings.find(c=>c.id===id), points=RIVER_LAND.line.points, along=RIVER_LAND.line.along;
      const index=along.findIndex(v=>v>=crossing.along), p=points[index-1],q=points[index+1],len=Math.hypot(q.x-p.x,q.z-p.z);
      const bx=(q.x-p.x)/len,bz=(q.z-p.z)/len,x=crossing.x+bz*27,z=crossing.z-bx*27;
      const bed=scablandsActorHeightAt(x,z,scablandsSurfaceHeightAt(x,z)-20), heading=Math.atan2(bx,bz);
      const approach={x:x-bx*80,z:z-bz*80};
      const approachBed=scablandsActorHeightAt(approach.x,approach.z,scablandsSurfaceHeightAt(approach.x,approach.z)-20);
      await context.evaluate(`(() => {${place(approach.x,approach.z,heading,approachBed)}})()`);
      await picture(`${id}-bed-view`,[approach.x,approachBed+1.7,approach.z],[x,bed+3,z]);
      const near={x:x-bx*45,z:z-bz*45},nearBed=scablandsActorHeightAt(near.x,near.z,scablandsSurfaceHeightAt(near.x,near.z)-20);
      await picture(`${id}-bed-near`,[near.x,nearBed+1.7,near.z],[x,bed+3,z]);
      await context.evaluate(`(() => {${place(x,z,heading,bed)}})()`);
      await picture(`${id}-chase`,null,null);
      const from={x:x-bx*35,z:z-bz*35};
      const fromBed=scablandsActorHeightAt(from.x,from.z,scablandsSurfaceHeightAt(from.x,from.z)-20);
      const result=await context.evaluate(`(() => {${place(from.x,from.z,heading,fromBed)}
        const d=window.__qaApp.duel,s=d.state;let progress=-35,maxFloorError=0,maxCover=0,coveredSamples=0;
        s.speedMph=12;for(let i=0;i<1200&&progress<35;i++){
          const p=d.course.worldAt(s.s,s.lateral);progress=(p.x-(${x}))*(${bx})+(p.z-(${z}))*(${bz});
          const feet=s.airborne&&Number.isFinite(s._jumpY)?s._jumpY:s.groundHeight, floor=d.course.groundAt(s.s,s.lateral,-1e9).y, surface=d.course.groundAt(s.s,s.lateral).y;
          if(!Number.isFinite(feet)||!Number.isFinite(floor))throw Error('Car or bed height is missing');
          maxFloorError=Math.max(maxFloorError,Math.abs(feet-floor));
          const cover=surface-feet;maxCover=Math.max(maxCover,cover);if(cover>4)coveredSamples++;
          const turn=Math.atan2(Math.sin(${heading}-d.course.at(s.s).heading-s.headingError),Math.cos(${heading}-d.course.at(s.s).heading-s.headingError));
          d.setInput({throttle:1,steer:Math.max(-1,Math.min(1,-turn*2))});d.step(1/60);
        }return {id:${JSON.stringify(id)},progress,maxFloorError,maxCover,coveredSamples};})()`);
      report.drives.push(result);
      assert.ok(result.progress>=35 && result.maxFloorError<1 && result.maxCover>4 && result.coveredSamples>10, `${id} drive must stay in the bed: ${JSON.stringify(result)}`);
    }
    await persist();
  } catch(error) {report.failure=error.message;await persist();throw error;}
}
