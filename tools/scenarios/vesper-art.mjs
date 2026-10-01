// Private Vesper fit review in the actual game world, lighting and renderer.
// Original crew comparison positions are declared QA fixtures, not new gameplay.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'vite';
const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const candidateSha = '47f76f334ee1025b8ad0cdef5539dd85e86f899f1b67b4022f35263d7d73ef35';
async function nativeBundle() {
  const entry = join(root, '.qa-dist/vesper-comparison.virtual.js').replaceAll('\\', '/');
  const module = join(root, 'src/rigged-fighter.js').replaceAll('\\', '/');
  const result = await build({root, configFile: false, logLevel: 'silent', plugins: [{
    name: 'private-production-crew-pool',
    resolveId(id) {if (id.replaceAll('\\', '/') === entry) return '\0vesper-comparison';},
    load(id) {if (id === '\0vesper-comparison') return
      `export {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'; export {createRiggedFighterFigures} from ${JSON.stringify(module)};`;},
  }], build: {write: false, minify: false,
    lib: {entry, name: 'VesperComparison', formats: ['iife']}}});
  return (Array.isArray(result) ? result[0] : result).output.find(row => row.type === 'chunk').code;
}
export async function run(context) {
  const candidate = resolve(process.env.VESPER_ART_ASSET || join(root, '.evidence/vesper-fresh-output/candidate/vesper.glb'));
  const local = relative(root, candidate);
  assert(!isAbsolute(local) && !local.startsWith('..') && /^\.evidence[\\/]/.test(local));
  const bytes = await readFile(candidate); assert.equal(sha(bytes), candidateSha);
  const assets = {};
  for (const id of ['nell', 'odessa', 'wren']) assets[id] = {
    path: 'public/assets/models/wasteland/crew/' + id + '.glb',
    sha256: sha(await readFile(join(root, 'public/assets/models/wasteland/crew/' + id + '.glb'))),
  };
  assert.equal(assets.odessa.sha256, '364de3fd43de474eb4ef0fd12b859940f067549b02f2922b432d3a0c422170ca');
  const bundle = await nativeBundle();
  const report = {card: 'ART-FIT-CREW-W', subject: 'Private Vesper costume fit',
    observationCommit: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim(),
    candidate: {path: candidate, sha256: candidateSha, bytes: bytes.length}, assets,
    fixture: 'Actual App/Duel exit, private Odessa fetch substitution, production original-crew comparison pool; normal world, lights, fog and HUD remain.',
    captures: [], cleanup: [], limits: ['No roster install, Vesper reveal, gameplay, audio or art approval.',
      'Render counters are actual counts, not frame-time measurements.']};
  const persist = () => writeFile(join(context.outputDir, 'vesper-comparison.json'), JSON.stringify(report, null, 2) + '\n');
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'private Vesper game ready', 60000);
    await context.evaluate(bundle);
    await context.evaluate(`(() => {
      const app = window.__qaApp, view = window.__render;
      if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
        throw Error('Memory-only Vesper review required');
      app.stop(); app.audio.setMuted(true); app.setGraphicsQuality('${quality}');
      const originalFetch = window.fetch.bind(window);
      const bytes = Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}), char => char.charCodeAt(0));
      window.__vesperReview = {originalFetch, substitutions: 0};
      window.fetch = (input, init) => {
        const url = new URL(typeof input === 'string' ? input : input?.url || String(input), location.href);
        if (url.origin === location.origin && url.pathname === '/assets/models/wasteland/crew/odessa.glb') {
          window.__vesperReview.substitutions++;
          return Promise.resolve(new Response(bytes, {status: 200, headers: {'Content-Type': 'model/gltf-binary'}}));
        }
        return originalFetch(input, init);
      };
      app.duel.startCampaign({mode: 'wasteland', car: 'banshee_muscle', seed: 1989, discoveredGate: true, crewId: 'odessa'});
      const state = app.duel.state;
      Object.assign(state, {status: 'racing', countdown: 0, paused: false, s: 500, prevS: 500, speedMph: 0,
        traffic: [], opponents: [], stageTimeSec: 10});
      state.raids = null; state.combat.aiTimer = state.combat.pickupTimer = Infinity;
      state.input.interact = true;
      for (let i = 0; i < 50 && !state.onFoot; i++) app.duel.step(1/120);
      if (!state.onFoot || state.fighter.crewId !== 'odessa') throw Error('Actual production exit failed');
      state.input.interact = false; state.fighter.presentation = null;
      app._footCameraMode = 'overhead'; app.onFrame?.(state); view.renderFrame();
      for (const panel of document.querySelectorAll('details'))
        if (panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES') || panel.querySelector('summary')?.textContent.startsWith('Performance samples')) panel.hidden = true;
    })()`);
    await context.waitFor(`(() => {const app=window.__qaApp;app.onFrame?.(app.duel.state);window.__render.renderFrame();
      return app.visualReady && window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.crews.odessa === 'ready';})()`,
    quality + ' actual candidate rig loaded', 60000);
    await context.evaluate(`(async () => {
      const q = window.__vesperReview, app = window.__qaApp, state = app.duel.state, view = window.__render;
      const at = app.duel.course.groundAt(500, 0);
      Object.assign(state.fighter, {x: at.x, y: at.y, z: at.z, yaw: 0, groundY: at.y, speed: 0});
      state.stageTimeSec = 10; state.fighterInput = {};
      q.center = at; q.local = view.scene.getObjectByName('Rigged on-foot fighters');
      q.pool = VesperComparison.createRiggedFighterFigures({loadAsset: async id => {
        const response = await q.originalFetch('/assets/models/wasteland/crew/' + id + '.glb');
        if (!response.ok) throw Error('Original comparison crew load failed: ' + id);
        return new VesperComparison.GLTFLoader().parseAsync(await response.arrayBuffer(), '');
      }});
      q.pool.group.name = 'Vesper original women comparison'; view.scene.add(q.pool.group);
      q.entries = ['nell', 'odessa', 'wren'].map((id, index) => ({fighter: {
        crewId: id, x: at.x + (index - 1) * 2.3, y: at.y, z: at.z + 2.5,
        yaw: 0, speed: 0, groundY: at.y}}));
      q.update = () => q.pool.update(q.entries, {active: true, enabled: true, time: state.stageTimeSec, cameraPosition: view.camera.position});
      q.update();
      q.paint = () => {
        const before = JSON.stringify(state); q.update(); app.onFrame?.(state); view.renderFrame();
        if (JSON.stringify(state) !== before) throw Error('Vesper draw mutated whole Duel state');
      };
      q.paint();
    })()`);
    await context.waitFor(`(() => {const q=window.__vesperReview;q.paint();return ['nell','odessa','wren'].every(id=>q.pool.group.userData.crews[id]==='ready');})()`,
      quality + ' original crew loaded beside Vesper', 60000);
    for (const mode of ['front', 'side', 'back', 'overhead', 'walk']) {
      const capture = await context.evaluate(`(() => {
        const q=window.__vesperReview,app=window.__qaApp,state=app.duel.state,view=window.__render;
        const mode='${mode}',at=q.center;
        if (mode === 'overhead' || mode === 'walk') delete app.inspectionCamera;
        else {const offset=mode==='side'?[10,3,1]:mode==='back'?[0,2.7,-10]:[0,2.7,10];
          app.inspectionCamera={position:[at.x+offset[0],at.y+offset[1],at.z+offset[2]],target:[at.x,at.y+1,at.z+1]};}
        if (mode === 'walk') {
          state.fighterInput={forward:true}; for(let i=0;i<24;i++)app.duel.step(1/120);
          if (!(state.fighter.speed > .01)) throw Error('Actual walking input did not move candidate');
        }
        q.paint();q.paint();
        const visible = node => {for(let p=node;p;p=p.parent)if(!p.visible)return false;return true;};
        const figures=[];
        for(const group of [q.local,q.pool.group]) for(const figure of group.children) {
          if (!figure.visible || !figure.userData.crewId) continue;
          const meshes=[];figure.traverse(mesh=>{if(mesh.isMesh&&visible(mesh))meshes.push(mesh);});
          figures.push({subject:group===q.local?'vesper':figure.userData.crewId,
            crewSlot:figure.userData.crewId,clip:figure.userData.clip,detail:figure.userData.detail,
            draws:meshes.length,triangles:meshes.reduce((sum,mesh)=>sum+(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3,0)});
        }
        const candidate=figures.find(row=>row.subject==='vesper');
        if (!candidate || candidate.draws!==1 || candidate.triangles>6500) throw Error('Candidate native skin budget failed');
        if (mode==='walk'&&candidate.clip!=='walk') throw Error('Actual native walk clip did not play');
        if (figures.length!==4 || q.substitutions!==1 || q.local.userData.loadErrors.length || q.pool.group.userData.loadErrors.length)
          throw Error('Actual four-figure comparison/load failed');
        return {mode,figures,substitutions:q.substitutions,worldDraws:view.renderer.info.render.calls,
          worldTriangles:view.renderer.info.render.triangles,camera:app.inspectionCamera||'production on-foot overhead',stateUnchanged:true};
      })()`);
      const name='vesper-'+mode+'-'+quality; await context.screenshot(name);
      report.captures.push({quality,name,...capture}); await persist();
    }
    const cleanup=await context.evaluate(`(async () => {
      const q=window.__vesperReview,app=window.__qaApp,before=JSON.stringify(app.duel.state);
      q.pool.dispose();q.pool.dispose();window.fetch=q.originalFetch;
      window.__render.dispose();
      for(let i=0;i<120 && q.local.children.length;i++)await new Promise(requestAnimationFrame);
      if(q.pool.group.parent||q.pool.group.children.length||q.local.children.length)throw Error('Native comparison cleanup did not retire figures');
      if(JSON.stringify(app.duel.state)!==before)throw Error('Cleanup changed Duel state');
      return {originalCrewRetired:true,candidateRetired:true,fetchRestored:true,stateUnchanged:true};
    })()`);
    report.cleanup.push({quality,...cleanup});await persist();
  }
  assert.equal(report.captures.length,10); report.passed=true;await persist();
}
