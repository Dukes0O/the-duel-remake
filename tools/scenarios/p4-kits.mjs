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
      if (id === '\0p4-kits') return "export {Group,Box3,Vector3,AnimationMixer,Raycaster} from 'three';" +
        "export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';";
    },
  }], build: {write: false, minify: false,
    lib: {entry, name: 'P4KitsQa', formats: ['iife']}}});
  return (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk').code;
}

export async function run(context) {
  const manifest = JSON.parse(readFileSync(join(home, 'manifest.json'), 'utf8'));
  assert.equal(manifest.card, 'P4-KITS');
  assert.equal(manifest.pieces.length, 33);
  const round = Number(process.env.P4_KITS_ROUND || 1);
  assert.ok([1, 2, 3].includes(round));
  const report = {card: 'P4-KITS', round, captures: [],
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
            for(const name of ['idle','roar','chest-beat','lope'])if(!gltf.animations.some(a=>a.name===name))throw Error('Missing '+name);
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
      if (group === 'characters') for (const clip of ['roar', 'chest-beat', 'lope']) {
        await context.evaluate(`(() => {
          const q=window.__p4Kits;for(const row of q.mixers){row.mixer.stopAllAction();
            const clip=row.clips.find(c=>c.name===${JSON.stringify(clip)});row.mixer.clipAction(clip).play();row.mixer.setTime(clip.duration*.43);}
          window.__render.renderFrame();
          if(q.before!==JSON.stringify(window.__qaApp.duel.state))throw Error('Clip review changed race state');
        })()`);
        await context.screenshot('p4-kits-yeti-' + clip + '-' + quality);
      }
    }
  }
  assert.equal(report.captures.length, 12);
  report.verdict = 'All 33 High and distant GLBs decoded and drawn with real textures; both quality modes and fixed race state passed.';
  persist();
}
