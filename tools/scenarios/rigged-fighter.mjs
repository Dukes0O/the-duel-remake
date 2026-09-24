import {writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join, relative} from 'node:path';
import {createFighter, stepFighter, knockdownFighter} from '../../src/onfoot.js';

function productionPoses() {
  const course = {def:{}, groundAt:(s,lateral)=>({x:lateral,y:0,z:s,heading:0}),
    nearest:(x,z)=>({s:z,lateral:x}), obstaclesNear:()=>[]};
  const car = {s:0,lateral:0};
  const idle = createFighter(course,car,{s:0,lateral:0});
  const walk = createFighter(course,car,{s:0,lateral:0});
  const knockdown = createFighter(course,car,{s:0,lateral:0});
  for (let tick=0;tick<30;tick++) {
    stepFighter(course,car,idle,{});
    stepFighter(course,car,walk,{forward:true});
  }
  knockdownFighter(knockdown);
  for (let tick=0;tick<120;tick++) stepFighter(course,car,knockdown,{});
  if (!(walk.speed>0) || idle.speed!==0 || knockdown.speed!==0)
    throw Error('Production pose movement state is invalid');
  return {idle,walk,knockdown};
}

// Uses the production combat hook, loaded skin and quality pipelines. The
// private harness installs memory-only storage before production code starts.
export async function run(context) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const directory = context.outputDir;
  const captureBase = relative(root,directory).replaceAll('\\','/');
  await mkdir(directory, {recursive:true});
  const samples = productionPoses();
  const evidence = {movementSource:'Production createFighter/stepFighter: 30 fixed steps idle/walk, knockdownFighter then 120 fixed steps down', qualities: ['high','performance'], captures: [], counts: {}, loadErrors: []};
  for (const quality of evidence.qualities) {
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:900,height:800,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine')?.disabled",
      'private fighter scene', 60_000);
    await context.evaluate(`(() => {
      if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value) throw Error('Memory storage missing');
      // GFX-00 remains a retained single-asset loader control after GFX-01.
      const originalFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        const path = new URL(url, location.href).pathname;
        return path.startsWith('/assets/models/wasteland/crew/') && path.endsWith('.glb')
          ? originalFetch('/assets/models/wasteland/test-fighter.glb', init)
          : originalFetch(input, init);
      };
      const select=document.querySelector('#graphics-quality');
      select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
      const app=window.__qaApp;
      app.startCampaign({mode:'wasteland',startStage:0,seed:1989});app.stop();
      const s=app.duel.state;
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
        speedMph:0,traffic:[],opponents:[],onFoot:true,stageTimeSec:.25});
      const p=app.duel.course.groundAt(500,3);
      s.fighter={...${JSON.stringify(samples.idle)},x:p.x,y:p.y,z:p.z,s:500,lateral:3,groundY:p.y};
      s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
      window.__render.renderFrame();
    })()`);
    await context.waitFor("window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.assetStatus==='ready'",
      'GLB loaded through combat hook', 60_000);
    await context.evaluate(`(() => {
      // Let the already queued frame finish, then render only explicit poses.
      window.requestAnimationFrame=()=>0;
      window.__render.renderFrame();
    })()`);
    await context.waitFor("window.__render.scene.getObjectByName('rigged-fighter-0')?.visible",
      'first loaded fighter');
    const setup = await context.evaluate(`(() => {
      const r=window.__render,s=window.__qaApp.duel.state;
      const rig=r.scene.getObjectByName('Rigged on-foot fighters');
      const skin=rig.getObjectByProperty('isSkinnedMesh',true);
      const local=s.fighter, camera=r.camera;
      camera.position.set(local.x,local.y+1.62,local.z);
      skin.onBeforeRender(null,null,camera);
      const hiddenAtEye=skin.geometry.drawRange.count===0;
      skin.onAfterRender();
      camera.position.x+=5;skin.onBeforeRender(null,null,camera);
      const visibleOutside=skin.geometry.drawRange.count>0;skin.onAfterRender();
      if(!hiddenAtEye||!visibleOutside)throw Error('Actual skin eye hiding failed');
      const box=rig.getObjectByName('fighter-plates').geometry;
      let plainMesh;
      r.scene.traverse(n=>{if(!plainMesh&&n.type==='Mesh')plainMesh=n;});
      const floorMaterial=skin.material.clone();
      floorMaterial.vertexColors=false;floorMaterial.color.setHex(0x777777);
      const floor=new plainMesh.constructor(new box.constructor(200,.02,200),floorMaterial);
      floor.position.y=-.022;floor.receiveShadow=true;
      // Keep the production scene and composer so High's real passes run.
      // Record the original lights, then hide only non-review scene objects.
      const lights=[];
      r.scene.traverse(n=>{if(n.isLight)lights.push(n.clone());});
      for(const child of r.scene.children)child.visible=false;
      r.scene.add(rig);rig.visible=true;r.scene.add(floor);
      for(const light of lights){light.visible=true;r.scene.add(light);}
      r.scene.background=skin.material.color.clone().setHex(0x777777);
      r.scene.fog=null;r.scene.environment=null;
      r.renderer.setPixelRatio(1);r.renderer.setSize(576,640,false);r.composer.setSize(576,640);
      r.renderer.shadowMap.enabled='${quality}'==='high';
      camera.aspect=576/640;camera.fov=28;camera.near=.05;camera.far=250;
      camera.position.set(0,.9,5);camera.lookAt(0,.9,0);camera.updateProjectionMatrix();
      window.__fighterReview={rig,floor,lights,skin};
      return {hiddenAtEye,visibleOutside,loadErrors:rig.userData.loadErrors};
    })()`);
    evidence.loadErrors.push(...setup.loadErrors);
    evidence.counts[quality] = {firstPerson:setup};
    for (const [clip,time] of [['idle',.25],['walk',.25],['knockdown',1]]) {
      for (const [view,yaw] of [['front',0],['side',Math.PI/2],['back',Math.PI]]) {
        const result = await context.evaluate(`(() => {
          const r=window.__render,app=window.__qaApp,s=app.duel.state;
          Object.assign(s.fighter,${JSON.stringify(samples[clip])},{x:0,y:0,z:0,yaw:${yaw}});
          s.stageTimeSec=${time};
          // Only the combat hook updates the actual rig; use an explicit frame,
          // then restore the matched review camera and neutral scene.
          r.renderFrame();
          const review=window.__fighterReview;
          for(const child of r.scene.children)child.visible=false;
          review.rig.visible=true;review.floor.visible=true;
          for(const light of review.lights)light.visible=true;
          r.scene.fog=null;r.scene.environment=null;
          const cx=s.fighter.knockedDown?Math.sin(s.fighter.yaw)*.90:0;
          const cz=s.fighter.knockedDown?Math.cos(s.fighter.yaw)*.90:0;
          r.camera.position.set(cx,.9,cz+5);r.camera.lookAt(cx,.9,cz);
          r.camera.fov=28;r.camera.aspect=576/640;r.camera.updateProjectionMatrix();
          r.renderer.info.reset();
          if('${quality}'==='high')r.composer.render(0);else r.renderer.render(r.scene,r.camera);
          const png=r.renderer.domElement.toDataURL('image/png');
          const allPasses={drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles};
          const materialSet=new Set();let triangles=0,meshes=0;
          review.rig.traverse(n=>{if(n.isSkinnedMesh&&n.parent.visible){
            meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;
            for(const m of [].concat(n.material))materialSet.add(m);
          }});
          const actual=review.rig.getObjectByName('rigged-fighter-0').userData;
          return {png,allPasses,triangles,materials:materialSet.size,meshes,
            clip:actual.clip,time:actual.clipTime};
        })()`);
        if(result.clip!==clip||Math.abs(result.time-time)>.001)throw Error('Captured pose does not match requested clip/time');
        const path=join(directory,`game-${quality}-${clip}-${view}.png`);
        await writeFile(path,Buffer.from(result.png.split(',')[1],'base64'));
        context.screenshots.push(path);
        const {png,...metrics}=result;
        evidence.captures.push({quality,clip,time,view,yaw,path:`${captureBase}/game-${quality}-${clip}-${view}.png`,metrics});
      }
    }
    const twelve=await context.evaluate(`(() => {
      const r=window.__render,s=window.__qaApp.duel.state,review=window.__fighterReview;
      s.raids={zones:[{warning:{x:0,y:0,z:0,heading:0},raiders:Array.from({length:11},(_,i)=>({
        ...${JSON.stringify(samples.idle)},x:(i%4-1.5)*1.05,z:-Math.floor(i/4)*1.05,yaw:0,
        knockedDown:false})),salvage:null}]};
      Object.assign(s.fighter,${JSON.stringify(samples.idle)},{x:1.6,z:-2.1,yaw:0,knockedDown:false});
      r.renderFrame();
      for(const child of r.scene.children)child.visible=false;
      review.rig.visible=true;
      r.renderer.shadowMap.enabled=false;
      r.camera.position.set(0,3.5,9);r.camera.lookAt(0,.8,-1);
      r.camera.fov=40;r.camera.updateProjectionMatrix();
      r.renderer.info.reset();r.renderer.render(r.scene,r.camera);
      const counts={drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles};
      const bones=new Set();let figures=0;
      review.rig.traverse(n=>{if(n.isSkinnedMesh){figures++;bones.add(n.skeleton);}});
      if(figures!==12||bones.size!==12||counts.drawCalls>24)throw Error('Twelve independent rigs exceeded budget');
      return {...counts,figures,skeletons:bones.size,scope:'fighter-only colour pass; no floor, shadows or compositor'};
    })()`);
    evidence.counts[quality].twelve=twelve;
  }
  const path=join(directory,'captures.json');
  await writeFile(path,JSON.stringify(evidence,null,2)+'\n');
  console.log('Matched rigged fighter evidence: '+path);
}
