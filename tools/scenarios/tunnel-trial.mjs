import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {westScarpTrial} from '../../src/world/ground-tunnels.js';
import {scablandsActorHeightAt, scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {RIVER_LAND} from '../../src/world/scablands-regions.js';

// Browser-only trial. The harness supplies a memory-only profile and pictures folder.
export async function run(context) {
  const report = {card: 'TUNNEL-TRIAL', quality: 'performance', views: [], drives: []};
  const persist = () => writeFile(join(context.outputDir, 'tunnel-trial.json'), JSON.stringify(report, null, 2) + '\n');
  const click = selector => context.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  try {
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,wasteland-town&harness=tunnel-trial');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      const a=window.__qaApp, select=document.querySelector('#graphics-quality');
      select.value='performance'; select.dispatchEvent(new Event('change',{bubbles:true}));
      a.audio.setMuted(true); a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true}}; a._saveProfile();
    })()`);
    await click('#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await click('[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Story Wall', 30000);
    await click('[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'note read');
    await click('[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Scablands drive', 120000);
    await context.waitFor(`(() => {let root; window.__render.scene.traverse(n => {if(n.name==='The Scablands') root=n;}); return root?.userData.assetStatus==='ready';})()`, 'Scablands art', 120000);
    const segment = westScarpTrial(scablandsSurfaceHeightAt).segment;
    // This scenario supplies the temporary refresh that a future boring machine needs.
    await context.evaluate(`(async () => {
      const THREE=await import('/node_modules/three/build/three.module.js');
      const {createGroundTunnels}=await import('/src/world/ground-tunnels.js');
      const {createTunnelMesh}=await import('/src/world/scablands-ground-look.js');
      const {placeActor}=await import('/src/arena/arena-event.js');
      const a=window.__qaApp, d=a.duel, seg=${JSON.stringify(segment)};
      a.stop(); d.state.countdown=0; d.state.arena.timeLimitSec=Infinity;
      if(d.state.arena.worldJob?.job?.stepState) d.state.arena.worldJob.job.stepState.ember=100;
      const group=window.__render.scene.getObjectByName('Scablands ground chunks');
      if(!group) throw Error('Ground group missing');
      const uniforms={start:{value:new THREE.Vector3(seg.start.x,seg.start.y,seg.start.z)},end:{value:new THREE.Vector3(seg.start.x,seg.start.y,seg.start.z)},radius:{value:0}};
      const materials=new Set(); group.traverse(n=>{if(n.material?.userData.groundLook)materials.add(n.material);});
      if(materials.size<2) throw Error('Near and coarse ground materials missing');
      for(const material of materials){
        const compile=material.onBeforeCompile, key=material.customProgramCacheKey();
        material.onBeforeCompile=(shader,renderer)=>{
          compile.call(material,shader,renderer);
          Object.assign(shader.uniforms,{trialStart:uniforms.start,trialEnd:uniforms.end,trialRadius:uniforms.radius});
          shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\\nuniform vec3 trialStart,trialEnd; uniform float trialRadius;');
          shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\\n{vec3 d=trialEnd-trialStart,p=vGroundPos-trialStart; float t=clamp(dot(p,d)/max(dot(d,d),1e-8),0.0,1.0); vec3 q=p-d*t; if(dot(q,q)<trialRadius*trialRadius)discard;}');
        };
        material.customProgramCacheKey=()=>key+'-trial-refresh'; material.needsUpdate=true;
      }
      const axis=new THREE.Vector3(seg.end.x-seg.start.x,seg.end.y-seg.start.y,seg.end.z-seg.start.z).normalize();
      const machine=new THREE.Mesh(new THREE.CylinderGeometry(seg.radius*.75,seg.radius*.75,6,24),new THREE.MeshStandardMaterial({color:0xb09a71}));
      machine.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis); group.add(machine);
      let lining=null;
      window.__tunnelTrial={a,d,seg,axis,uniforms,machine,group,placeActor,createGroundTunnels,createTunnelMesh,
        bore(t){const end={x:seg.start.x+(seg.end.x-seg.start.x)*t,y:seg.start.y+(seg.end.y-seg.start.y)*t,z:seg.start.z+(seg.end.z-seg.start.z)*t};
          uniforms.end.value.set(end.x,end.y,end.z); uniforms.radius.value=seg.radius;
          const tubes=createGroundTunnels([{start:seg.start,end,radius:seg.radius}]); d.course.groundTunnels=tubes;
          if(lining){group.remove(lining); lining.traverse(n=>{n.geometry?.dispose();n.material?.dispose();});}
          lining=createTunnelMesh(tubes); group.add(lining); machine.position.set(end.x,end.y,end.z);
        },
        place(x,z,heading,height){const p=d.course.nearest(x,z); placeActor(d,d.state,{s:p.s,lateral:p.lateral,headingError:Math.atan2(Math.sin(heading-d.course.at(p.s).heading),Math.cos(heading-d.course.at(p.s).heading))},0);
          if(Number.isFinite(height)){d.state.groundHeight=height;d.state.prevGroundHeight=height;d.state._jumpY=height;}
        },
        camera(position,target){a.inspectionCamera={position,target};window.__render.camera.position.fromArray(position);},
        frame(){a.onFrame?.(d.state,0);window.__render.renderFrame();}
      };
    })()`);
    const {start, end, radius} = segment, dx=(end.x-start.x)/100, dz=(end.z-start.z)/100;
    await context.evaluate(`(() => {const t=window.__tunnelTrial; t.place(${start.x-dx*25},${start.z-dz*25},${Math.atan2(dx,dz)});
      t.camera([${start.x-dx*18+dz*10},${start.y+7},${start.z-dz*18-dx*10}],[${start.x},${start.y},${start.z}]);t.frame();})()`);
    for (let i=1; i<=20; i++) {
      await context.evaluate(`window.__tunnelTrial.bore(${i/20}); window.__tunnelTrial.frame()`);
      if (i===10) await context.screenshot('tunnel-boring');
    }
    await context.evaluate('window.__tunnelTrial.machine.visible=false');
    const picture = async (name, x, z, y, target) => {
      await context.evaluate(`(() => {const t=window.__tunnelTrial; t.camera([${x},${y},${z}],${JSON.stringify(target)}); t.frame();})()`);
      const file=await context.screenshot(`tunnel-${name}`);
      const stats=await context.evaluate(`(async()=>{const intervals=[];await new Promise(done=>{let last;const tick=now=>{window.__tunnelTrial.frame();if(last!==undefined)intervals.push(now-last);last=now;if(intervals.length===30)done();else requestAnimationFrame(tick);};requestAnimationFrame(tick);});const r=window.__render.renderer.info.render,sorted=[...intervals].sort((a,b)=>a-b);return {drawCalls:r.calls,triangles:r.triangles,frameIntervalsMs:intervals,frameP95Ms:sorted[Math.ceil(sorted.length*.95)-1]};})()`);
      report.views.push({name,file,...stats});
    };
    await picture('low-mouth',start.x-dx*16,start.z-dz*16,start.y+3,[start.x+dx*8,start.y,start.z+dz*8]);
    await picture('high-mouth',end.x+dx*16,end.z+dz*16,end.y+3,[end.x-dx*8,end.y,end.z-dz*8]);
    await picture('inside',start.x+dx*48,start.z+dz*48,(start.y+end.y)/2,[end.x,end.y,end.z]);
    await picture('above',start.x+dx*50+dz*35,start.z+dz*50-dx*35,Math.max(start.y,end.y)+35,[(start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2]);
    for(const direction of [1,-1]) {
      const result=await context.evaluate(`(() => {const t=window.__tunnelTrial,d=t.d,s=d.state,seg=t.seg,dx=${dx},dz=${dz},direction=${direction};
        const origin=direction>0?seg.start:seg.end,heading=Math.atan2(dx*direction,dz*direction); t.a.inspectionCamera=null;
        t.place(origin.x-direction*dx*8,origin.z-direction*dz*8,heading); s.speedMph=12; let furthest=-Infinity;
        for(let i=0;i<1800;i++){const p=d.course.worldAt(s.s,s.lateral),along=(p.x-seg.start.x)*dx+(p.z-seg.start.z)*dz;furthest=Math.max(furthest,direction>0?along:100-along);if(furthest>103)break;
          const target=direction>0?seg.end:seg.start,turn=Math.atan2(Math.sin(Math.atan2(target.x+direction*dx*30-p.x,target.z+direction*dz*30-p.z)-d.course.at(s.s).heading-s.headingError),Math.cos(Math.atan2(target.x+direction*dx*30-p.x,target.z+direction*dz*30-p.z)-d.course.at(s.s).heading-s.headingError));
          d.setInput({throttle:1,steer:Math.max(-1,Math.min(1,-turn*2))});d.step(1/60);}
        t.frame();return {direction,furthest};})()`);
      report.drives.push(result); assert.ok(result.furthest>103, `Drive ${direction} reached ${result.furthest} m`);
    }
    const bridge=RIVER_LAND.crossings.find(c=>c.id==='girder-bridge'), points=RIVER_LAND.line.points, along=RIVER_LAND.line.along, index=along.findIndex(v=>v>=bridge.along);
    const p=points[index-1], q=points[index+1], len=Math.hypot(q.x-p.x,q.z-p.z), bx=(q.x-p.x)/len, bz=(q.z-p.z)/len;
    const x=bridge.x+bz*27, z=bridge.z-bx*27;
    const bed=scablandsActorHeightAt(x,z,scablandsSurfaceHeightAt(x,z)-20);
    const bridgeDrive=await context.evaluate(`(() => {const t=window.__tunnelTrial,d=t.d,s=d.state; t.place(${x-bx*30},${z-bz*30},${Math.atan2(bx,bz)},${bed}); s.speedMph=15; let progress=-30;
      for(let i=0;i<900 && progress<0;i++){d.setInput({throttle:1,steer:0}); d.step(1/60);const p=d.course.worldAt(s.s,s.lateral);progress=(p.x-${x})*${bx}+(p.z-${z})*${bz};} t.frame();return {progress,height:s.groundHeight??s._jumpY};})()`);
    report.bridgeDrive=bridgeDrive; assert.ok(bridgeDrive.progress>=0 && bridgeDrive.height<scablandsSurfaceHeightAt(x,z)-4,'Car reaches the bridge from the bed');
    await picture('bridge-bed',x-bx*18,z-bz*18,bed+4,[x,bed+1,z]);
    const bridgeExit=await context.evaluate(`(() => {const t=window.__tunnelTrial,d=t.d,s=d.state;let progress=0;
      for(let i=0;i<900 && progress<30;i++){d.setInput({throttle:1,steer:0});d.step(1/60);const p=d.course.worldAt(s.s,s.lateral);progress=(p.x-${x})*${bx}+(p.z-${z})*${bz};}
      t.frame();return {progress,height:s.groundHeight??s._jumpY};})()`);
    report.bridgeExit=bridgeExit; assert.ok(bridgeExit.progress>=30, 'Car drives out from under the bridge');
    await persist();
  } catch (error) { report.failure=error.message; await persist(); throw error; }
}
