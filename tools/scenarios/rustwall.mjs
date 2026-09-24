import {readFile, writeFile, mkdir, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Course} from '../../src/course.js';
import {COURSE} from '../../src/config.js';
import {hiddenRoadGroundGeometry} from '../../src/world-surfaces.js';
import {renderMainView} from '../../src/scene-presentation.js';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const READY=`(() => {
  const r=window.__render,app=window.__qaApp;if(!r||!app)return false;
  r.renderFrame();const rig=r.scene.getObjectByName('Rustwall');
  if(rig?.userData.assetStatus==='failed')throw Error(rig.userData.loadErrors.join('; '));
  return !!app.visualReady&&rig?.userData.assetStatus==='ready';
})()`;

export async function run(context) {
  const round=Number(process.env.EGG_RUSTWALL_ROUND || 1);
  if(!Number.isInteger(round)||round<1||round>10)throw Error('Rustwall round must be 1..10');
  const relative=`docs/board/looks/rustwall/round-${round}`,directory=join(ROOT,relative);
  const path=join(directory,'captures.json');
  try{await access(path);throw Error('Completed Rustwall evidence is immutable');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  const blender=JSON.parse(await readFile(join(directory,'blender-manifest.json'),'utf8'));
  const evidence={round,observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    assets:blender.assets,reference:blender.reference,captures:[],context:[],placement:[],cost:{},loadErrors:[],
    baseline:'EGG-01 greybox scenery on the newly widened salt-flat geometry. Visibility toggles isolate model cost, not the complete EGG-02 change.'};
  for(const asset of Object.values(blender.assets))if(sha(await readFile(join(ROOT,asset.path)))!==asset.sha256)
    throw Error('Frozen Rustwall asset changed: '+asset.path);
  // Geometry-only estimate of the separately authorized support widening.
  // This is not a previous-commit whole-scene cost measurement.
  const course=new Course(COURSE.find(row=>row.id==='pacific-canyon'),1989,{hiddenRoad:true});
  const old=Object.create(course),road=course.hiddenRoad;
  old.hiddenRoad={...road,widthAt:progress=>{
    let t=Math.max(0,Math.min(1,(progress-road.washEnd)/90));t=t*t*(3-2*t);
    return road.widthAt(progress)-105*t;
  }};
  const before=hiddenRoadGroundGeometry(old),after=hiddenRoadGroundGeometry(course);
  evidence.preparedGroundTriangles={previousWidth:before.index.count/3,currentWidth:after.index.count/3,
    delta:(after.index.count-before.index.count)/3,scope:'Derived prepared-ground patch only; does not reconstruct an earlier world.'};
  before.dispose();after.dispose();
  await mkdir(directory,{recursive:true});
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']) {
    await context.navigate('/tools/menu-check.html?flags=hidden-road');
    await context.waitFor('!!window.__qaApp?.visualReady&&!!window.__render','private Rustwall menu',60000);
    await start(context,quality,1989);
    await context.evaluate(`(() => {
      const r=window.__render;
      window.__rustwallReview={raf:window.requestAnimationFrame.bind(window)};
      // One production render per measured RAF, with no duplicate renderer loop.
      window.requestAnimationFrame=()=>0;
      window.__rustwallReview.rig=r.scene.getObjectByName('Rustwall');
      window.__rustwallReview.greybox=r.scene.getObjectByName('Dry wash banks');
    })()`);
    evidence.cost[quality]={};
    for(const [view,progress] of [['wash',350],['approach',960]]) {
      await courseView(context,progress);
      evidence.cost[quality][view]=await context.evaluate(`(async () => {
        const r=window.__render,q=window.__rustwallReview;
        const measure=async()=>{
          const frames=[],cpu=[],draws=[],triangles=[];let last=0,metrics;
          for(let i=0;i<141;i++){
            const now=await new Promise(q.raf),begin=performance.now();metrics=r.renderFrame();
            const elapsed=performance.now()-begin;
            if(i>20){frames.push(now-last);cpu.push(elapsed);draws.push(metrics.drawCalls);triangles.push(metrics.triangles);}last=now;
          }
          const summary=values=>{const list=[...values].sort((a,b)=>a-b);return{samples:list.length,p50:list[59],p95:list[113],max:list.at(-1),over33:list.filter(n=>n>33).length};};
          return{raf:summary(frames),renderCpu:summary(cpu),rafSamplesMs:frames,renderCpuSamplesMs:cpu,
            drawCalls:metrics.drawCalls,triangles:metrics.triangles,drawCallSamples:draws,triangleSamples:triangles,
            drawCallRange:[Math.min(...draws),Math.max(...draws)],triangleRange:[Math.min(...triangles),Math.max(...triangles)]};
        };
        q.rig.visible=false;q.greybox.visible=true;const baseline=await measure();
        q.rig.visible=true;q.greybox.visible=false;const loaded=await measure();
        return{baseline,loaded,rafP95Ratio:loaded.raf.p95/baseline.raf.p95,
          cpuP50Ratio:loaded.renderCpu.p50/baseline.renderCpu.p50,cpuP95Ratio:loaded.renderCpu.p95/baseline.renderCpu.p95,
          scope:'120 measured RAF intervals and full production renderFrame CPU submissions, after 20 warm frames; same stopped course/camera/quality/support, greybox versus loaded models. CPU submission is not GPU time.'};
      })()`);
      const png=await context.evaluate(`(() => {window.__qaApp.onFrame?.(window.__qaApp.duel.state);window.__render.renderFrame();return window.__render.renderer.domElement.toDataURL('image/png');})()`);
      evidence.context.push(await save(context,relative,`course-${quality}-${view}`,png,{quality,view,route:'a'}));
    }
    for(const sample of blender.captures) {
      if(sample.cameraSpace==='gate-local')await gateView(context,sample);
      else if(sample.cameraSpace!=='wash-module')throw Error('Unknown matched camera space');
      const result=await context.evaluate(sample.cameraSpace==='wash-module'
        ? washPicture(sample,quality) : wallPicture(sample,quality));
      const shot=await save(context,relative,`game-${quality}-${sample.id}`,result.png,
        {id:sample.id,quality,kind:sample.kind,cameraSpace:sample.cameraSpace,camera:sample.camera,
          gateOpen:sample.gateOpen||0,moduleScale:sample.moduleScale,counts:result.counts});
      evidence.captures.push(shot);
    }
    evidence.placement.push(await placement(context,'a',quality));
    for(const [route,seed] of [['b',42],['c',17]]) {
      await start(context,quality,seed);
      await courseView(context,960);
      evidence.placement.push(await placement(context,route,quality));
      const png=await context.evaluate('window.__render.renderer.domElement.toDataURL("image/png")');
      evidence.context.push(await save(context,relative,`course-${quality}-${route}-approach`,png,{quality,route,view:'approach'}));
    }
  }
  await writeFile(path,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  console.log(`Rustwall round ${round}: ${evidence.captures.length} matched views, ${evidence.context.length} course views, six all-route placements. Timing ratios are retained for review, not rounded into a pass.`);
}

async function start(context,quality,seed) {
  await context.evaluate(`(() => {
    if(window.__rustwallReview?.raf)window.requestAnimationFrame=window.__rustwallReview.raf;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Private memory-only storage missing');
    const app=window.__qaApp;app.setGraphicsQuality(${JSON.stringify(quality)});
    app.startCampaign({mode:'duel',startStage:0,seed:${seed},car:'falcone_f42',difficulty:'casual'});app.stop();
    Object.assign(app.duel.state,{status:'racing',countdown:0,paused:false,speedMph:0,traffic:[],opponents:[],rival:null});
    app.inspectionCamera=null;app.onFrame?.(app.duel.state);window.__render.renderFrame();
    document.querySelectorAll('details').forEach(panel=>panel.open=false);
  })()`);
  await context.waitFor(READY,'loaded Rustwall course',60000);
}

async function courseView(context,progress) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,p=d.course.hiddenRoad.poseAt(${progress}),h=p.heading;
    Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,speedMph:0,
      headingError:h-d.course.at(p.s).heading,groundHeight:null,airHeight:0,airborne:false,terrainPitch:null,terrainRoll:null});
    app.inspectionCamera={position:[p.x-Math.sin(h)*7,p.y+3,p.z-Math.cos(h)*7],target:[p.x+Math.sin(h)*60,p.y+8,p.z+Math.cos(h)*60]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.scene.getObjectByName('Rustwall').userData.setGateOpen(0);
    app.onFrame?.(d.state);window.__render.renderFrame();
  })()`);
}

async function gateView(context,sample) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,p=app.duel.course.hiddenRoad.poseAt(app.duel.course.hiddenRoad.length),h=p.heading;
    const world=a=>[p.x+Math.cos(h)*a[0]+Math.sin(h)*a[2],p.y+a[1],p.z-Math.sin(h)*a[0]+Math.cos(h)*a[2]];
    app.inspectionCamera={position:world(${JSON.stringify(sample.camera.position)}),target:world(${JSON.stringify(sample.camera.target)})};
    r.camera.position.fromArray(app.inspectionCamera.position);
    r.scene.getObjectByName('Rustwall').userData.setGateOpen(${sample.gateOpen||0});r.renderFrame();
  })()`);
}

function wallPicture(sample,quality) {
  return `(() => {
    const r=window.__render,c=${JSON.stringify(sample.camera)};
    r.renderer.setPixelRatio(1);r.renderer.setSize(c.width,c.height,false);r.composer.setSize(c.width,c.height);
    r.camera.position.fromArray(window.__qaApp.inspectionCamera.position);r.camera.lookAt(...window.__qaApp.inspectionCamera.target);
    r.camera.fov=c.verticalFov;r.camera.aspect=c.width/c.height;r.camera.near=c.near;r.camera.updateProjectionMatrix();
    r.renderer.info.reset();(${renderMainView.toString()})(r.renderer,r.composer,${quality==='high'});
    const counts={drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles};
    return{png:r.renderer.domElement.toDataURL('image/png'),counts};
  })()`;
}

function washPicture(sample,quality) {
  return `(() => {
    const r=window.__render,c=${JSON.stringify(sample.camera)},wash=r.scene.getObjectByName('Rustwall wash'),parent=wash.parent;
    const visibility=r.scene.children.map(n=>[n,n.visible]),background=r.scene.background,environment=r.scene.environment,fog=r.scene.fog;
    const lights=[];r.scene.traverse(n=>{if(n.isLight)lights.push(n.clone());});
    const records=[];wash.traverse(mesh=>{if(!mesh.isInstancedMesh)return;
      const matrix=mesh.matrix.clone();mesh.getMatrixAt(0,matrix);records.push({mesh,count:mesh.count,matrix,box:mesh.boundingBox?.clone(),sphere:mesh.boundingSphere?.clone()});
      mesh.count=1;mesh.setMatrixAt(0,mesh.matrix.clone().makeScale(...${JSON.stringify(sample.moduleScale)}));
      mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
    });
    for(const [node] of visibility)node.visible=false;
    r.scene.add(wash,...lights);wash.visible=true;r.scene.background=null;r.scene.environment=null;r.scene.fog=null;
    r.renderer.setClearColor(0x777777,1);r.renderer.setPixelRatio(1);r.renderer.setSize(c.width,c.height,false);r.composer.setSize(c.width,c.height);
    r.camera.position.fromArray(c.position);r.camera.lookAt(...c.target);r.camera.fov=c.verticalFov;r.camera.aspect=c.width/c.height;r.camera.near=c.near;r.camera.updateProjectionMatrix();
    r.scene.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);
    r.renderer.info.reset();(${renderMainView.toString()})(r.renderer,r.composer,${quality==='high'});
    const gl=r.renderer.getContext(),pixels=new Uint8Array(c.width*c.height*4);
    gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let nonBackgroundSamples=0;
    for(let y=0;y<c.height;y+=8)for(let x=0;x<c.width;x+=8){const index=(y*c.width+x)*4;
      if(Math.abs(pixels[index]-pixels[0])+Math.abs(pixels[index+1]-pixels[1])+Math.abs(pixels[index+2]-pixels[2])>12)nonBackgroundSamples++;
    }
    if(nonBackgroundSamples<100)throw Error('Isolated wash module did not produce enough non-background pixels');
    const result={png:r.renderer.domElement.toDataURL('image/png'),counts:{drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,nonBackgroundSamples}};
    for(const record of records){record.mesh.count=record.count;record.mesh.setMatrixAt(0,record.matrix);record.mesh.instanceMatrix.needsUpdate=true;record.mesh.boundingBox=record.box;record.mesh.boundingSphere=record.sphere;}
    parent.add(wash);for(const light of lights)light.removeFromParent();for(const [node,visible] of visibility)node.visible=visible;
    r.scene.background=background;r.scene.environment=environment;r.scene.fog=fog;return result;
  })()`;
}

async function placement(context,route,quality) {
  return context.evaluate(`(() => {
    const d=window.__qaApp.duel,road=d.course.hiddenRoad,p=road.poseAt(road.length),rig=window.__render.scene.getObjectByName('Rustwall');
    rig.userData.setGateOpen(0);rig.updateMatrixWorld(true);const panel=rig.getObjectByName('gate-panel'),at=panel.position.clone();panel.getWorldPosition(at);
    if(Math.hypot(at.x-p.x,at.y-p.y,at.z-p.z)>.001)throw Error('Gate moved away from road endpoint');
    const ground=[];for(const offset of [-210,0,210]){const q=road.poseAt(road.length,offset),n=d.course.nearest(q.x,q.z),height=d.course.groundAt(n.s,n.lateral).y;
      if(Math.abs(height-p.y)>.01)throw Error('Outer Rustwall is unsupported');ground.push({offset,height});}
    return{route:${JSON.stringify(route)},quality:${JSON.stringify(quality)},gate:at.toArray(),heading:p.heading,bankCount:road.walls.length,ground,loadErrors:rig.userData.loadErrors};
  })()`);
}

async function save(context,relative,name,png,metadata) {
  const path=`${relative}/${name}.png`,bytes=Buffer.from(png.split(',')[1],'base64');
  await writeFile(join(ROOT,path),bytes);context.screenshots.push(join(ROOT,path));
  return{...metadata,path,sha256:sha(bytes)};
}
