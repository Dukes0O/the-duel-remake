// Prepared circuit-kit review in the real renderer with memory-only storage.
// This stages presentation objects only. Track cards decide actual placement.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {COURSE} from '../../src/config.js';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const home = join(root, 'public/assets/models/circuits/kits');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function nativeBundle() {
  const entry = join(root, '.qa-dist/p4-kits.virtual.js').replaceAll('\\', '/');
  const result = await build({root, configFile: false, logLevel: 'silent', plugins: [{
    name: 'p4-kits-private',
    resolveId(id) {if (id.replaceAll('\\', '/') === entry) return '\0p4-kits';},
    load(id) {
      if (id === '\0p4-kits') return "export {Group,Box3,Vector3,AnimationMixer,Raycaster,LoopOnce} from 'three';" +
        "export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';";
    },
  }], build: {write: false, minify: false,
    lib: {entry, name: 'P4KitsQa', formats: ['iife']}}});
  return (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk').code;
}


async function captureYetiNight(context, {quality, bundle, piece}) {
  const stageIndex = COURSE.findIndex(course => course.id === 'harbor-highlands');
  assert.ok(stageIndex >= 0 && COURSE[stageIndex].timeOfDay === 'night');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'night character renderer ready', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Memory-only night character review required');
    app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
    app.duel.startCampaign({mode:'duel',car:app.menuCar,seed:1989,opponentCount:0,
      startStage:${stageIndex},discoveredGate:false});
    const s=app.duel.course.length*.5;
    Object.assign(app.duel.state,{status:'racing',countdown:0,paused:false,s,prevS:s,
      lateral:0,speedMph:0,traffic:[],opponents:[]});
    app.onFrame?.(app.duel.state,0);app.stop();
  })()`);
  await context.waitFor(`(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
    return a.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`, 'native alpine night ready', 60000);
  await context.evaluate(bundle);
  const file = quality === 'high' ? piece.high : piece.low;
  const bytes = readFileSync(join(home, file));
  const setup = await context.evaluate(`(async () => {
    const api=P4KitsQa,app=window.__qaApp,view=window.__render;
    const beforeState=JSON.stringify(app.duel.state),beforeProfile=JSON.stringify(app.profile);
    const raw=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0));
    const gltf=await new api.GLTFLoader().parseAsync(raw.buffer,'');
    const actor=new api.Group();actor.add(gltf.scene);view.scene.add(actor);
    const distance=app.duel.state.s+120;
    const ground=app.duel.course.groundAt(distance,0);
    const approach=app.duel.course.groundAt(distance-35,0);
    const facing=new api.Vector3(approach.x-ground.x,0,approach.z-ground.z).normalize();
    actor.position.set(ground.x,ground.y||0,ground.z);
    actor.rotation.y=Math.atan2(facing.x,facing.z);
    const mixer=new api.AnimationMixer(gltf.scene);
    mixer.clipAction(gltf.animations.find(clip=>clip.name==='idle')).play();mixer.setTime(0);
    actor.updateMatrixWorld(true);
    const skins=[];gltf.scene.traverse(mesh=>{if(mesh.isSkinnedMesh)skins.push(mesh);});
    if(!skins.length)throw Error('Actual native weighted Yeti skin required');
    const pointAt=(mesh,index)=>{mesh.skeleton.update();
      const point=new api.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index);
      mesh.applyBoneTransform(index,point);return point.applyMatrix4(mesh.matrixWorld);};
    const bounds=()=>{actor.updateMatrixWorld(true);const box=new api.Box3();
      for(const mesh of skins)for(let i=0;i<mesh.geometry.attributes.position.count;i++)box.expandByPoint(pointAt(mesh,i));
      return box;};
    const idleBox=bounds(),height=idleBox.max.y-idleBox.min.y;
    if(Math.abs(height-2.8)>.005||Math.abs(idleBox.min.y-actor.position.y)>.005)
      throw Error('Night witness requires the grounded 2.8 m exported idle skin');
    const target=new api.Vector3(ground.x,(ground.y||0)+1.4,ground.z);
    const camera=target.clone().addScaledVector(facing,30);
    app.inspectionCamera={position:camera.toArray(),target:target.toArray()};
    document.querySelectorAll('details,.yard-home-panel,#race-hud,#modal-layer').forEach(node=>node.style.display='none');
    gltf.scene.traverse(node=>{if(node.isMesh)node.castShadow=node.receiveShadow=true;});
    for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);view.renderFrame();}
    view.scene.updateMatrixWorld(true);view.camera.updateMatrixWorld(true);
    const belongs=node=>{for(let p=node;p;p=p.parent)if(p===actor)return true;return false;};
    const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
    const candidates=[];view.scene.traverse(node=>{if(node.isMesh&&visible(node))candidates.push(node);});
    for(const height of [.35,1.4,2.6]){
      const aim=new api.Vector3(ground.x,(ground.y||0)+height,ground.z);
      const direction=aim.clone().sub(view.camera.position),length=direction.length();
      const hit=new api.Raycaster(view.camera.position,direction.normalize(),.01,length-.05).intersectObjects(candidates,false)[0];
      if(hit&&!belongs(hit.object))throw Error('Night character is occluded by '+(hit.object.name||hit.object.type));
    }
    const footBones={};
    for(const side of ['L','R']){
      footBones[side]=[];
      for(const name of ['LowerLeg.'+side,'Foot.'+side]){
        const indices=gltf.parser.json.nodes.flatMap((node,index)=>node.name===name?[index]:[]);
        if(indices.length!==1)throw Error('Unique original foot joint required: '+name);
        const bone=await gltf.parser.getDependency('node',indices[0]);
        if(!bone?.isBone||skins.some(mesh=>!mesh.skeleton.bones.includes(bone)))
          throw Error('Original weighted foot joint required: '+name);
        footBones[side].push(bone);
      }
    }
    const feet={L:[],R:[]};
    for(const mesh of skins){const weights=mesh.geometry.attributes.skinWeight,joints=mesh.geometry.attributes.skinIndex;
      for(let i=0;i<weights.count;i++){
        const point=pointAt(mesh,i);if(point.y-actor.position.y>.32)continue;
        for(const side of ['L','R']){let weight=0;
          for(let k=0;k<4;k++){
            const joint=joints.getComponent(i,k),bone=mesh.skeleton.bones[joint];
            if(footBones[side].includes(bone))weight+=weights.getComponent(i,k);
          }
          if(weight>.5)feet[side].push({mesh,index:i});
        }
      }
    }
    if(!feet.L.length||!feet.R.length)throw Error('Original weighted foot vertices required');
    window.__p4YetiNight={actor,gltf,mixer,skins,feet,pointAt,bounds,beforeState,beforeProfile,
      groundY:actor.position.y};
    if(beforeState!==JSON.stringify(app.duel.state)||beforeProfile!==JSON.stringify(app.profile))
      throw Error('Night character setup changed race/profile state');
    return {height,cameraDistance:view.camera.position.distanceTo(target),camera:app.inspectionCamera,
      actualQuality:app.ambientOcclusionEnabled!==false?'high':'performance',
      night:app.duel.course.def.timeOfDay,theme:app.duel.course.themeAt(app.duel.state.s),
      feet:{L:feet.L.length,R:feet.R.length}};
  })()`);
  assert.equal(setup.actualQuality, quality);
  assert.equal(setup.night, 'night');assert.equal(setup.theme, 'alpine');
  assert.ok(Math.abs(setup.cameraDistance - 30) < .00001);
  const captures = [];
  for (const name of ['roar', 'walk-off']) for (const fraction of [0, .23, .51, .77, .99]) {
    const frame = await context.evaluate(`(() => {
      const q=window.__p4YetiNight,api=P4KitsQa;
      q.mixer.stopAllAction();const clip=q.gltf.animations.find(clip=>clip.name===${JSON.stringify(name)});
      if(!clip)throw Error('Missing actual '+${JSON.stringify(name)}+' clip');
      const action=q.mixer.clipAction(clip);action.reset();action.setLoop(api.LoopOnce,1);action.clampWhenFinished=true;action.play();
      q.mixer.setTime(clip.duration*${fraction});
      const box=q.bounds();window.__render.renderFrame();
      if(q.beforeState!==JSON.stringify(window.__qaApp.duel.state)||q.beforeProfile!==JSON.stringify(window.__qaApp.profile))
        throw Error('Native motion changed race/profile state');
      return {time:clip.duration*${fraction},centre:box.getCenter(new api.Vector3()).toArray()};
    })()`);
    const image = 'p4-kits-yeti-night-' + name + '-' + Math.round(fraction * 100) + '-' + quality;
    await context.screenshot(image);captures.push({name, fraction, image, ...frame});
  }
  const contact = await context.evaluate(`(() => {
    const q=window.__p4YetiNight,api=P4KitsQa;
    q.mixer.stopAllAction();const clip=q.gltf.animations.find(clip=>clip.name==='walk-off');
    const action=q.mixer.clipAction(clip);action.reset();action.setLoop(api.LoopOnce,1);action.clampWhenFinished=true;action.play();
    const frames=[];
    for(let step=0;step<=50;step++){
      q.mixer.setTime(clip.duration*step/50);q.actor.updateMatrixWorld(true);
      const row={time:clip.duration*step/50};
      for(const side of ['L','R']){
        const points=q.feet[side].map(vertex=>q.pointAt(vertex.mesh,vertex.index)).sort((a,b)=>a.y-b.y);
        const lowest=points.slice(0,Math.max(3,Math.ceil(points.length*.1)));
        const centre=lowest.reduce((sum,point)=>sum.add(point),new api.Vector3()).multiplyScalar(1/lowest.length);
        const app=window.__qaApp,nearest=app.duel.course.nearest(centre.x,centre.z,app.duel.state.s);
        const surface=app.duel.course.groundAt(nearest.s,nearest.lateral);
        row[side]={minHeight:points[0].y-(surface.y||0),surfaceY:surface.y||0,centre:centre.toArray()};
      }
      frames.push(row);
    }
    if(q.beforeState!==JSON.stringify(window.__qaApp.duel.state)||q.beforeProfile!==JSON.stringify(window.__qaApp.profile))
      throw Error('Foot-contact sampling changed race/profile state');
    return {frames,stateUnchanged:true,profileUnchanged:true,
      basis:'Actual weighted sole vertices sampled over the authored clip; inspect contact, sliding and travel direction before approval.'};
  })()`);
  return {quality,file,sha256:sha(bytes),...setup,captures,contact};
}

export async function run(context) {
  const manifest = JSON.parse(readFileSync(join(home, 'manifest.json'), 'utf8'));
  assert.equal(manifest.card, 'P4-KITS');
  assert.equal(manifest.pieces.length, 35);
  const round = Number(process.env.P4_KITS_ROUND || 1);
  assert.ok([1, 2, 3].includes(round));
  const report = {card: 'P4-KITS', round, captures: [], yetiNight: [],
    scope: 'Native GLBs in the production renderer and ordinary Pacific Canyon lighting. Each prop is normalized to 4 m only for comparison; the shipped GLBs use metres. No track integration or frame-budget clearance is claimed.',
    manifestSha256: sha(readFileSync(join(home, 'manifest.json')))};
  const persist = () => writeFileSync(join(context.outputDir, 'p4-kits.json'), JSON.stringify(report, null, 2) + '\n');
  const allGroups = [...new Set(manifest.pieces.map(p => p.group))];
  const groups = process.env.P4_KITS_GROUPS ? process.env.P4_KITS_GROUPS.split(',') : allGroups;
  assert.ok(groups.length && groups.every(group => allGroups.includes(group)));
  if (process.env.P4_KITS_GROUPS) {
    const previous = JSON.parse(readFileSync(join(context.outputDir, 'p4-kits.json'), 'utf8'));
    assert.equal(previous.round, round);
    assert.equal(previous.captures.length, 12, 'complete prior comparison required');
    assert.deepEqual(previous.captures.map(c => c.group + ':' + c.quality).sort(),
      allGroups.flatMap(group => ['high', 'performance'].map(quality => group + ':' + quality)).sort());
    report.captures = previous.captures.filter(capture => !groups.includes(capture.group));
    for (const capture of report.captures) {
      const expected = manifest.pieces.filter(piece => piece.group === capture.group);
      assert.deepEqual(capture.rows.map(row => row.id), expected.map(piece => piece.id));
      for (const [index, row] of capture.rows.entries()) {
        const file = capture.quality === 'high' ? expected[index].high : expected[index].low;
        assert.equal(row.file, file);
        assert.equal(row.sha256, sha(readFileSync(join(home, file))),
          'retained native captures require byte-exact unchanged GLBs');
      }
    }
    report.focusedRerun = {groups, previousManifestSha256: previous.manifestSha256,
      basis: 'Other groups retain their prior verified captures only after exact GLB SHA-256, id, file and quality checks.'};
  }
  persist();
  const bundle = await nativeBundle();
  const stageIndex = COURSE.findIndex(course => course.id === 'pacific-canyon');
  assert.ok(stageIndex >= 0);
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1400, height: 900, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'kit renderer ready', 60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only kit review required');
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      app.duel.startCampaign({mode:'duel',car:app.menuCar,seed:1989,opponentCount:0,
        startStage:${stageIndex},discoveredGate:false});
      Object.assign(app.duel.state,{status:'racing',countdown:0,paused:false,
        s:500,prevS:500,lateral:0,speedMph:0,traffic:[],opponents:[]});
      if(app.duel.state.hiddenRoadJourney)throw Error('Ordinary circuit fixture must have no gate journey');
      app.onFrame?.(app.duel.state,0);app.stop();
      document.querySelectorAll('details').forEach(panel=>panel.hidden=true);
    })()`);
    await context.waitFor(`(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
      return a.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`, 'ordinary circuit ready', 60000);
    await context.evaluate(bundle);
    for (const group of groups) {
      const pieces = manifest.pieces.filter(p => p.group === group);
      const payload = pieces.map(p => {
        const file = quality === 'high' ? p.high : p.low, bytes = readFileSync(join(home, file));
        return {id: p.id, file, sha256: sha(bytes), data: bytes.toString('base64')};
      });
      const detail = await context.evaluate(`(async () => {
        const api=P4KitsQa,app=window.__qaApp,view=window.__render;
        const before=JSON.stringify(app.duel.state);
        if(window.__p4Kits){
          view.scene.remove(window.__p4Kits.stage);
          window.__p4Kits.stage.traverse(n=>{if(n.isMesh){n.geometry.dispose();
            for(const m of Array.isArray(n.material)?n.material:[n.material]){
              for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}}});
        }
        const stage=new api.Group(),rows=[],mixers=[];
        const origin=app.duel.course.groundAt(app.duel.state.s+120,app.duel.state.lateral);
        stage.position.set(origin.x,origin.y||0,origin.z);view.scene.add(stage);
        const payload=${JSON.stringify(payload)};
        for(let i=0;i<payload.length;i++){
          const item=payload[i],raw=Uint8Array.from(atob(item.data),c=>c.charCodeAt(0));
          const gltf=await new api.GLTFLoader().parseAsync(raw.buffer,'');
          if(item.id==='yeti'){
            const mixer=new api.AnimationMixer(gltf.scene);
            for(const name of ['idle','roar','chest-beat','lope','walk-off'])if(!gltf.animations.some(a=>a.name===name))throw Error('Missing '+name);
            mixer.clipAction(gltf.animations.find(a=>a.name==='idle')).play();mixer.setTime(.5);
            gltf.scene.updateMatrixWorld(true);
            mixers.push({mixer,clips:gltf.animations});
          }
          const box=new api.Box3().setFromObject(gltf.scene),size=box.getSize(new api.Vector3());
          const scale=4/Math.max(size.x,size.y,size.z);
          const placed=new api.Group();placed.add(gltf.scene);placed.scale.setScalar(scale);
          placed.position.set((i%4)*5.8-(box.min.x+size.x/2)*scale,
            -box.min.y*scale,Math.floor(i/4)*6.3-(box.min.z+size.z/2)*scale);
          const location=app.duel.course.nearest(origin.x+placed.position.x,origin.z+placed.position.z,app.duel.state.s);
          const ground=app.duel.course.groundAt(location.s,location.lateral);
          placed.position.y+=(ground.y||0)-(origin.y||0);
          stage.add(placed);
          let meshes=0,textures=0,triangles=0;
          gltf.scene.traverse(node=>{
            if(!node.isMesh)return;meshes++;node.castShadow=node.receiveShadow=true;
            triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;
            for(const material of Array.isArray(node.material)?node.material:[node.material]){
              if(material.map){if(!material.map.image?.width)throw Error('Undecoded native texture: '+item.id);textures++;}
            }
          });
          if(!meshes||!textures)throw Error('Native meshes/textures missing: '+item.id);
          rows.push({id:item.id,file:item.file,sha256:item.sha256,size:size.toArray(),triangles,meshes,textures});
        }
        stage.updateMatrixWorld(true);
        const box=new api.Box3().setFromObject(stage),target=box.getCenter(new api.Vector3());
        document.querySelectorAll('.yard-home-panel,#race-hud,#modal-layer').forEach(node=>node.style.display='none');
        const belongs=node=>{for(let p=node;p;p=p.parent)if(p===stage)return true;return false;};
        const visible=node=>{for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
        let framing;
        for(const direction of [[.35,1.2,1.7],[-.35,1.4,1.7],[.3,2.2,.6]]){
          const back=new api.Vector3(...direction).normalize();
          const right=new api.Vector3(0,1,0).cross(back).normalize(),up=back.clone().cross(right);
          const tangent=Math.tan(48*Math.PI/360),margin=.88;
          let distance=0;
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
            const delta=new api.Vector3(x,y,z).sub(target),depth=delta.dot(back);
            distance=Math.max(distance,depth+Math.abs(delta.dot(right))/(tangent*view.camera.aspect*margin),
              depth+Math.abs(delta.dot(up))/(tangent*margin));
          }
          const position=target.clone().addScaledVector(back,distance);
          app.inspectionCamera={position:position.toArray(),target:target.toArray()};
          for(let i=0;i<24;i++){await new Promise(requestAnimationFrame);view.renderFrame();}
          view.camera.updateMatrixWorld(true);view.scene.updateMatrixWorld(true);
          const corners=[];
          for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])
            corners.push(new api.Vector3(x,y,z).project(view.camera).toArray());
          const candidates=[];view.scene.traverse(node=>{if(node.isMesh&&visible(node))candidates.push(node);});
          const occluded=[];
          for(const child of stage.children){
            const centre=new api.Box3().setFromObject(child).getCenter(new api.Vector3());
            const delta=centre.clone().sub(view.camera.position),distance=delta.length();
            const first=new api.Raycaster(view.camera.position,delta.normalize(),.01,distance-.2).intersectObjects(candidates,false)[0];
            if(first&&!belongs(first.object))occluded.push(first.object.name||first.object.type);
          }
          const clipped=corners.some(p=>Math.abs(p[0])>.98||Math.abs(p[1])>.98||p[2]<-1||p[2]>1);
          framing={corners,occluded,clipped};
          if(!clipped&&!occluded.length)break;
        }
        if(framing.clipped||framing.occluded.length)throw Error('Native kit view is clipped or occluded: '+JSON.stringify(framing));
        const unchanged=before===JSON.stringify(app.duel.state);
        if(!unchanged)throw Error('Kit viewer changed race state');
        window.__p4Kits={stage,mixers,before};
        return {rows,camera:app.inspectionCamera,framing,stateUnchanged:unchanged,
          draws:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles,
          actualQuality:app.ambientOcclusionEnabled!==false?'high':'performance'};
      })()`);
      assert.equal(detail.actualQuality, quality);
      const name = 'p4-kits-' + group + '-' + quality;
      await context.screenshot(name);
      report.captures.push({name, group, quality, ...detail});persist();
      if (group === 'characters') for (const clip of ['roar', 'chest-beat', 'lope', 'walk-off']) {
        await context.evaluate(`(() => {
          const q=window.__p4Kits;for(const row of q.mixers){row.mixer.stopAllAction();
            const clip=row.clips.find(c=>c.name===${JSON.stringify(clip)});row.mixer.clipAction(clip).play();row.mixer.setTime(clip.duration*.43);}
          window.__render.renderFrame();
          if(q.before!==JSON.stringify(window.__qaApp.duel.state))throw Error('Clip review changed race state');
        })()`);
        await context.screenshot('p4-kits-yeti-' + clip + '-' + quality);
      }
    }
    report.yetiNight.push(await captureYetiNight(context, {quality, bundle, piece: manifest.pieces.find(piece => piece.id === 'yeti')}));
    persist();
  }
  assert.equal(report.yetiNight.length, 2);
  assert.equal(report.captures.length, 12);
  report.verdict = 'All 35 High and distant GLBs decoded and drawn with real textures; both quality modes and fixed race state passed.';
  persist();
}
