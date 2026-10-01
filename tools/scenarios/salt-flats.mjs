import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const expected='6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc';
function privatePath(path,kind){const result=resolve(path),local=relative(root,result);assert(!isAbsolute(local)&&!local.startsWith('..')&&new RegExp('^\\.'+kind+'[\\\\/]').test(local),'checked lane '+kind+' path');return result;}
async function assets(){const source=privatePath(process.env.SALT_FLATS_RENDER_ASSET||join(root,'.evidence/ARENA-06/render-candidate/venue.glb'),'evidence');const bytes=await readFile(source);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
  // The harness has already built. Serve unchanged approved bytes from only its
  // disposable QA root at the native loader URL. No public asset is installed.
  const destination=privatePath(join(root,'.qa-dist/assets/models/wasteland/salt-flats/venue.glb'),'qa-dist');await mkdir(resolve(destination,'..'),{recursive:true});await copyFile(source,destination);return {source,destination,sha256:expected,bytes:bytes.length};}
async function settled(context,label){await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;a.onFrame(a.duel.state,0);r.renderFrame();return document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&document.querySelector('#renderer-loading')?.hidden;})()`,label,60000);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');}
async function start(context,quality,venue){await context.evaluate(`(()=>{const a=window.__qaApp;if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only actual game required');a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
  // Explicit low-level private Duel entry. This does not claim the held public
  // rank/flag/menu venue hooks, and never replaces App or renderer methods.
  if(!a.duel.startArenaEvent({venueId:${JSON.stringify(venue)},mode:'last-car-rolling',car:'falcone_f42',seed:1989,cpuDifficulty:'medium',opponents:[{car:'dusthawk_rally'}]}))throw Error('Actual native Duel venue entry failed');for(let i=0;i<362;i++)a.duel.step(1/120);a.setCamera('chase');a.inspectionCamera=null;a.onFrame(a.duel.state,0);window.__render.renderFrame();})()`);await settled(context,quality+' '+venue+' actual authored vehicle');}
async function pose(context,mode){return context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state,r=window.__render,site=d.course.length*.125;Object.assign(s,{s:site,prevS:site,lateral:0,prevLateral:0,headingError:0,speedMph:0,knock:null,airborne:false,airHeight:0});const cpu=s.opponents[0];Object.assign(cpu,{s:site+12,prevS:site+12,lateral:6,prevLateral:6,headingError:0,speedMph:0,knock:null,airborne:false,airHeight:0});
  const p=d.course.worldAt(site),h=p.heading,mode=${JSON.stringify(mode)};if(mode==='racing'){a.inspectionCamera=null;d.setInput({throttle:.2,steer:0,brake:0,boost:false});for(let i=0;i<60;i++)d.step(1/120);}else{const distance=mode==='near'?12:330;a.inspectionCamera={position:[p.x-Math.sin(h)*distance+Math.cos(h)*distance*.5,p.y+distance*.6,p.z-Math.cos(h)*distance-Math.sin(h)*distance*.5],target:[p.x,p.y+1,p.z]};}
  const state=JSON.stringify(s);a.onFrame(s,0);r.renderFrame();if(JSON.stringify(s)!==state)throw Error('Presentation changed actual native state');return {mode,venue:d.course.def.id,seed:s.seed,actors:[s.car,...s.opponents.map(o=>o.car)],camera:a.inspectionCamera||'production chase',poseScope:'Initial native car fixtures at identical fractional station/offset; racing uses unchanged Duel fixed steps.'};})()`);}
async function capture(context, name) {
  await settled(context, name + ' loading');
  await context.evaluate(`(() => {
    for (const panel of document.querySelectorAll('details'))
      if (panel.querySelector('summary')?.textContent.startsWith('MENU QA')) panel.open = false;
    window.__qaApp.onFrame(window.__qaApp.duel.state, 0);
    window.__render.renderFrame();
  })()`);
  return context.screenshot(name);
}
async function sample(context){assert.equal(process.env.SALT_FLATS_MEASURE_FRAMES,'1','frame samples require Director-agreed quiet window');return context.evaluate(`new Promise(resolve=>{const rows=[];let prior;function next(now){window.__qaApp.duel.step(1/120);window.__qaApp.onFrame(window.__qaApp.duel.state,0);if(prior!==undefined)rows.push(now-prior);prior=now;if(rows.length<180)return requestAnimationFrame(next);const sorted=[...rows].sort((a,b)=>a-b),r=window.__render;resolve({samples:rows.length,meanMs:rows.reduce((a,b)=>a+b,0)/rows.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],drawCalls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,clock:'Actual requestAnimationFrame interval; real renderer active, no synthetic clock.'});}requestAnimationFrame(next);})`);}
export async function run(context){const report={card:'ARENA-06',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),asset:await assets(),fixture:'Actual App/Duel/production renderer; native venue selection only, public entry held; memory-only storage.',captures:[],frames:[],issues:context.issues,warnings:context.warnings,limits:['Kyle/Claude art/heat/feel approval is not inferred from geometry presence.','Headless muted run does not establish sound approval.','Phone capture is not part of this laptop geometry fixture.']};
  const persist=()=>writeFile(join(context.outputDir,'salt-flats-browser.json'),JSON.stringify(report,null,2)+'\n');
  try{for(const quality of ['high','performance']){await context.navigate('/tools/menu-check.html?flags=scrapdome,wasteland2&harness=salt-flats-'+quality);await context.waitFor('!!window.__qaApp&&!!window.__render',quality+' actual menu',60000);
    for(const venue of ['scrapdome','salt-flats']){await start(context,quality,venue);for(const mode of ['near','racing','full']){const witness=await pose(context,mode);const path=await capture(context,quality+'-'+venue+'-'+mode);report.captures.push({quality,...witness,path});await persist();}
      if(venue==='salt-flats'){const witness=await context.evaluate(`(()=>{const r=window.__render,n=r.scene.getObjectByName('Salt Flats');let meshes=0,triangles=0;if(n)n.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;}});return {present:!!n,status:n?.userData.assetStatus,errors:n?.userData.loadErrors,ground:!!n?.getObjectByName('salt-flats-ground'),ramps:[1,2].map(i=>!!n?.getObjectByName('salt-ramp-'+i)),meshes,triangles};})()`);report.nativeWitness=witness;await persist();
        // Actual native scene views let Claude judge heat; no cloned silhouettes
        // or pixel-exact look assertion can hold an art card.
        await pose(context,'full');
        for(const seconds of [10,10.5]) {
          const state=await context.evaluate('JSON.stringify(window.__qaApp.duel.state)');
          await context.evaluate('window.__render.renderFrame({presentationSeconds:'+seconds+'})');
          const path=await context.screenshot(quality+'-salt-flats-heat-'+String(seconds).replace('.','-'));
          assert.equal(await context.evaluate('JSON.stringify(window.__qaApp.duel.state)'),state,'heat presentation must not change native race state');
          report.captures.push({quality,venue:'salt-flats',mode:'native heat comparison',seconds,path});
        }
        await persist();assert(witness.present,'actual game renderer is missing native Salt world route');assert.equal(witness.status,'ready');assert.deepEqual(witness.errors,[]);assert(witness.ground&&witness.ramps.every(Boolean));assert.equal(witness.meshes,171);assert.equal(witness.triangles,152180);}
      if(process.env.SALT_FLATS_MEASURE_FRAMES==='1'){await pose(context,'racing');await settled(context,quality+' '+venue+' frame window');report.frames.push({quality,venue,...await sample(context)});await persist();}}
    if(process.env.SALT_FLATS_MEASURE_FRAMES==='1'){const baseline=report.frames.find(f=>f.quality===quality&&f.venue==='scrapdome'),salt=report.frames.find(f=>f.quality===quality&&f.venue==='salt-flats');assert(salt.p95Ms<=baseline.p95Ms*1.10,quality+' Salt actual P95 exceeds settled Scrapdome +10%: '+JSON.stringify({baseline,salt}));}}
    assert.equal(process.env.SALT_FLATS_MEASURE_FRAMES,'1','actual matched frame gate is pending until agreed quiet measurement');report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;throw error;}finally{await persist();}}

