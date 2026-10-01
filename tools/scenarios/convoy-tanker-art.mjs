/** Private matched shots in the production yard renderer, never a blank viewer.
 * Build candidate under .evidence/ART-FIT-TANKER/candidate before the harness.
 * Native source review and Director capture clearance must precede execution.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {build} from 'vite';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function privateDirectory() {
  const directory = resolve(process.env.TANKER_ART_OUTPUT ||
    join(root, '.evidence/ART-FIT-TANKER/candidate'));
  const local = relative(root, directory);
  if (isAbsolute(local) || local.startsWith('..') ||
      !/^(?:\.evidence|\.qa-dist)[\\/]/.test(local)) {
    throw Error('Tanker captures require this lane’s private candidate directory');
  }
  return directory;
}

function nativeGlb(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 ||
      bytes.readUInt32LE(8) !== bytes.length) throw Error('Complete native GLB required');
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), kind = bytes.readUInt32LE(offset + 4);
    if (offset + 8 + length > bytes.length) throw Error('Truncated native GLB');
    const chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8'));
    if (kind === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  if (!json || !binary) throw Error('Native geometry missing');
  return {json, binary};
}

// Pinned source palettes enter only the disposable comparison payload.
function sourcePayload(pick, catalog) {
  const record = catalog.assets.find(row => row.id === pick.catalogId);
  const bytes = readFileSync(resolve(record.library, pick.path));
  if (digest(bytes) !== pick.sha256) throw Error('Original picked model changed');
  const {json, binary} = nativeGlb(bytes);
  for (const image of json.images || []) {
    if (!image.uri) continue;
    const path = resolve(record.library, 'unpacked/Models/GLB format', image.uri);
    const pin = record.files.find(row => resolve(record.library, row.path) === path);
    if (!pin || !path.toLowerCase().endsWith('.png')) throw Error('Unpinned source texture');
    const png = readFileSync(path);
    if (digest(png) !== pin.sha256) throw Error('Original source palette changed');
    image.uri = 'data:image/png;base64,' + png.toString('base64');
  }
  const text = Buffer.from(JSON.stringify(json));
  const padded = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 0x20)]);
  const header = Buffer.alloc(20);
  header.write('glTF');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12);
  header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length);
  binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, binHeader, binary]).toString('base64');
}

async function browserBundle() {
  // Installed Vite only: virtual entry, in-memory output, no shared hooks.
  const entry = join(root, '.qa-dist/tanker-art-entry.virtual.js').replaceAll('\\', '/');
  const modulePath = join(root, 'src/arena/tanker-model.js').replaceAll('\\', '/');
  const result = await build({
    root, configFile: false, logLevel: 'silent',
    plugins: [{
      name: 'private-tanker-art-entry',
      resolveId(id) { if (id.replaceAll('\\', '/') === entry) return '\0tanker-art-private'; },
      load(id) {
        if (id !== '\0tanker-art-private') return;
        return "export {Group,Matrix4,Vector3} from 'three';" +
          "export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';" +
          'export {createTankerModel} from ' + JSON.stringify(modulePath) + ';';
      },
    }],
    build: {
      write: false, emptyOutDir: false, minify: false,
      lib: {entry, name: 'TankerArtQa', formats: ['iife']},
    },
  });
  const output = Array.isArray(result) ? result[0].output : result.output;
  const chunk = output.find(row => row.type === 'chunk');
  if (!chunk) throw Error('Private presentation bundle missing');
  return chunk.code;
}

export async function run(context) {
  const directory = privateDirectory();
  const bytes = readFileSync(join(directory, 'tanker.glb'));
  const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
  const fit = JSON.parse(readFileSync(join(root, 'tools/art/tanker-fit.json'), 'utf8'));
  const catalog = JSON.parse(readFileSync(join(root, 'tools/art/catalog.json'), 'utf8'));
  const {json} = nativeGlb(bytes);
  if (manifest.card !== 'ART-FIT-TANKER' || manifest.seed !== fit.seed) throw Error('Fitting manifest required');
  if ([...(json.images || []), ...(json.buffers || [])].some(row => row.uri)) throw Error('Self-contained candidate required');
  const sources = Object.fromEntries(fit.sourcePicks.filter(row =>
    ['body', 'tank', 'valve'].includes(row.role)).map(pick =>
    [pick.catalogId + '/' + pick.path, sourcePayload(pick, catalog)]));
  const payload = {candidate: bytes.toString('base64'), manifest, sources};
  const bundle = await browserBundle();
  const report = {
    card: 'ART-FIT-TANKER', artifactSha256: digest(bytes), stats: manifest.stats,
    baseline: 'Original picked body/tank/three valves at fitted transforms; no previous runtime tanker exists.',
    setting: 'Actual production Scrapdome yard and renderer.',
    artVerdict: 'Pending independent comparison review.',
    frameVerdict: 'Not measured by this screenshot scenario.',
    captures: [],
  };
  for (const quality of ['high', 'performance']) {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,wasteland2');
    await context.waitFor("!!window.__qaApp && !!window.__render && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
      'memory-only tanker comparison menu', 60000);
    await context.waitFor('window.__qaApp.visualReady === true', 'real renderer ready', 60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      document.querySelectorAll('details').forEach(panel=>panel.open=false);
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
      if(!app._saveProfile())throw Error('Memory-only discovery fixture save failed');
      if(!app.visitWasteland())throw Error('Actual yard visit failed');
      app.stop();
    })()`);
    await context.waitFor("(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render?.renderFrame();return a.visualReady && document.querySelector('#renderer-loading')?.hidden;})()",
      quality+' actual yard transition presentation',60000);
    await context.evaluate('window.__qaApp.advance(8);window.__qaApp.stop()');
    await context.waitFor("(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render?.renderFrame();return a.isYardHomeActive() && a.visualReady && document.querySelector('#renderer-loading')?.hidden;})()",
      quality + ' actual game yard ready', 60000);
    await context.evaluate(bundle);
    await context.evaluate(`(async () => {
      const api=TankerArtQa,app=window.__qaApp,view=window.__render,input=${JSON.stringify(payload)};
      const parse=async base64=>{
        const bytes=Uint8Array.from(atob(base64),value=>value.charCodeAt(0));
        return new api.GLTFLoader().parseAsync(bytes.buffer,'');
      };
      const baseline=new api.Group();
      for(const row of input.manifest.sourceInstances){
        if(!/^(?:tanker-body|tanker-tank|tanker-valve-[012])$/.test(row.node))continue;
        const source=await parse(input.sources[row.sourceKey]);
        const placed=new api.Group();placed.matrixAutoUpdate=false;
        placed.matrix.fromArray(row.matrix);placed.add(source.scene);baseline.add(placed);
      }
      const candidate=api.createTankerModel({loadAsset:()=>parse(input.candidate)});
      const source=api.createTankerModel({loadAsset:async()=>({scene:baseline})});
      await Promise.all([candidate.ready,source.ready]);
      const world=app.duel.course.groundAt(app.duel.state.s,app.duel.state.lateral+8);
      for(const model of [source,candidate]){
        model.group.position.set(world.x,world.y||0,world.z);
        view.scene.add(model.group);model.group.visible=false;
      }
      document.querySelectorAll('.yard-home-panel,#race-hud,#modal-layer').forEach(n=>n.style.display='none');
      window.__tankerArt={source,candidate,state:JSON.stringify(app.duel.state),
        placement:new api.Vector3(world.x,(world.y||0)+1.55,world.z-1)};
      return true;
    })()`);
    for (const version of ['source', 'candidate']) {
      for (const distance of ['near', 'racing']) {
        const detail = await context.evaluate(`(() => {
          const q=window.__tankerArt,app=window.__qaApp,view=window.__render;
          q.source.group.visible=${version === 'source'};
          q.candidate.group.visible=${version === 'candidate'};
          const p=q.placement,scale=${distance === 'near' ? 1 : 3.4};
          app.inspectionCamera={position:[p.x+(scale===1?7:-7*scale),p.y+3.5*scale,p.z+(scale===1?-9:9*scale)],target:[p.x,p.y,p.z]};
          for(let i=0;i<12;i++)view.renderFrame();
          return {gameYard:app.isYardHomeActive(),quality:app.graphicsQuality,
            triangles:view.renderer.info.render.triangles,draws:view.renderer.info.render.calls};
        })()`);
        if (!detail.gameYard) throw Error('Comparison left actual game yard');
        const name = 'tanker-' + version + '-' + distance + '-' + quality;
        await context.screenshot(name);
        report.captures.push({name, quality, distance, version, ...detail});
      }
    }
    await context.evaluate(`(() => {
      const q=window.__tankerArt,p=q.placement;
      q.source.group.visible=true;q.candidate.group.visible=true;
      q.source.group.position.x+=4;q.candidate.group.position.x-=4;
      window.__qaApp.inspectionCamera={
        position:[p.x+7,p.y+4,p.z-9],target:[p.x,p.y,p.z]};
      for(let i=0;i<12;i++)window.__render.renderFrame();
    })()`);
    const pairedName='tanker-source-and-fit-'+quality;
    await context.screenshot(pairedName);
    report.captures.push({name:pairedName,quality,version:'source-and-fit',
      limit:'Original main donors on left; fitted complete truck on right. Shared actual renderer, camera and lighting. No former runtime tanker.'});
    // Loaded presentation health only; this is not future Convoy Raid gameplay.
    for (const health of [[0, 0, 0], [1, 0, 0]]) {
      const broken=health.every(value=>value<=0);
      const detail=await context.evaluate(`(() => {
        const q=window.__tankerArt,app=window.__qaApp,view=window.__render,p=q.placement;
        q.source.group.visible=false;q.candidate.group.visible=true;
        q.candidate.group.position.x=q.placement.x;
        const input=${JSON.stringify(health)},before=JSON.stringify(input);
        q.candidate.setValveHealth(input);
        app.inspectionCamera={position:[p.x+7,p.y+3.5,p.z-9],target:[p.x,p.y,p.z]};
        for(let i=0;i<12;i++)view.renderFrame();
        const lamps=[];q.candidate.group.traverse(n=>{
          if(n.isMesh&&n.name.startsWith('tanker-warning-lamp-')){
            const materials=Array.isArray(n.material)?n.material:[n.material];
            lamps.push({name:n.name,materials:materials.map(m=>({hex:m.emissive.getHex(),intensity:m.emissiveIntensity}))});
          }
        });
        if(before!==JSON.stringify(input))throw Error('Presentation mutated supplied health');
        if(lamps.length!==2||lamps.some(l=>l.materials.some(m=>m.hex!==${broken?0xb32904:0}||m.intensity!==${broken?2.2:0})))
          throw Error('Actual loaded two-lamp health presentation failed');
        return {lamps,stateUnchanged:q.state===JSON.stringify(app.duel.state),inputUnchanged:true};
      })()`);
      if(!detail.stateUnchanged)throw Error('Health capture changed simulation state');
      const name='tanker-'+(broken?'all-three-broken':'recovered')+'-'+quality;
      await context.screenshot(name);
      report.captures.push({name,quality,version:'candidate',health,...detail,
        limit:'Actual loaded read-only presentation health; no future Convoy Raid gameplay claim.'});
    }
    for(const angle of ['opposite-valve','roof-plate']) {
      await context.evaluate(`(() => {
        const q=window.__tankerArt,p=q.placement;
        window.__qaApp.inspectionCamera={position:${angle==='roof-plate'?'[p.x+4,p.y+10,p.z-7]':'[p.x-7,p.y+3.5,p.z-9]'},target:[p.x,p.y,p.z]};
        for(let i=0;i<12;i++)window.__render.renderFrame();
      })()`);
      const name='tanker-'+angle+'-'+quality;
      await context.screenshot(name);report.captures.push({name,quality,version:'candidate',angle,
        limit:'Supplemental actual-yard inspection of opposite valve or raised roof plate; no gameplay.'});
    }
    const unchanged = await context.evaluate(`(() => {
      const q=window.__tankerArt,same=q.state===JSON.stringify(window.__qaApp.duel.state);
      q.source.dispose();q.candidate.dispose();
      delete window.__tankerArt;delete window.__qaApp.inspectionCamera;
      return same;
    })()`);
    if (!unchanged) throw Error('Art comparison changed simulation state');
  }
  writeFileSync(join(context.outputDir, 'tanker-comparison.json'), JSON.stringify(report, null, 2) + '\n');
}
