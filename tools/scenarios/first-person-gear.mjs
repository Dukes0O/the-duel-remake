import {writeFile, mkdir, readFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const key = (context,type,code,name,virtual) => context.command('Input.dispatchKeyEvent',
  {type,code,key:name,windowsVirtualKeyCode:virtual});
const READY = "window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'";

// All state fixtures below belong to the private memory-only browser. Action
// interactions use production inputs; matched poses use labelled snapshots.
export async function run(context) {
  const round=Number(process.env.GFX_FIRST_PERSON_ROUND || 1);
  if (!Number.isInteger(round)||round<1||round>10) throw Error('First-person round must be 1..10');
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const relative=`docs/board/looks/first-person/round-${round}`,directory=join(root,relative);
  const manifestPath=join(directory,'captures.json');
  try { await access(manifestPath);throw Error('Completed first-person evidence is immutable'); }
  catch(error) { if(error.code!=='ENOENT')throw error; }
  const blender=JSON.parse(await readFile(join(directory,'blender-manifest.json'),'utf8'));
  if(blender.hands.length!==8)throw Error('Freeze all eight hands before capture');
  const evidence={round,observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    camera:blender.camera,qualities:['high','performance'],assets:{},captures:[],counts:{},interactions:{},frameCost:{},loadErrors:[]};
  for(const asset of [...blender.tools,...blender.hands]) {
    const path=`public/assets/models/wasteland/first-person/${blender.hands.includes(asset)?'hands/':''}${asset.id}.glb`;
    const hash=sha(await readFile(join(root,path)));
    if(hash!==asset.files[`${asset.id}.glb`])throw Error('Asset changed since Blender capture: '+path);
    evidence.assets[path]=hash;
  }
  await mkdir(directory,{recursive:true});
  for(const quality of evidence.qualities) {
    await setup(context,quality);
    const interactionCaptures=[];
    const interactionContext={...context,screenshot:async name=>{
      const temporary=await context.screenshot(name),bytes=await readFile(temporary);
      const path=`${relative}/${name}.png`;
      await writeFile(join(root,path),bytes);context.screenshots.push(join(root,path));
      interactionCaptures.push({path,sha256:sha(bytes)});return path;
    }};
    evidence.interactions[quality]={...await interaction(interactionContext,quality),captures:interactionCaptures};
    // Re-entered car is covered above. Fresh exit supplies the actual renderer
    // hook for every crew/tool snapshot without creating a second view model.
    await key(context,'keyDown','KeyF','f',70);
    await context.evaluate('window.__qaApp.advance(.42)');
    await key(context,'keyUp','KeyF','f',70);
    await context.waitFor(READY,'loaded first-person hands',60000);
    evidence.frameCost[quality]=await context.evaluate(`(async () => {
      const rig=window.__render.scene.getObjectByName('First-person hands and gear'),materials=new Set();
      rig.traverse(n=>{if(n.isMesh)for(const material of [].concat(n.material))materials.add(material);});
      const original=Array.from(materials,material=>[material,material.visible]);
      const measure=async()=>{
        const samples=[];let prior=0;
        for(let i=0;i<141;i++){
          const now=await new Promise(requestAnimationFrame);
          if(i>20)samples.push(now-prior);prior=now;
        }
        samples.sort((a,b)=>a-b);
        return{count:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),over33:samples.filter(n=>n>33).length};
      };
      for(const [material] of original)material.visible=false;
      const baseline=await measure();for(const [material,visible] of original)material.visible=visible;
      const held=await measure();
      return{baseline,held,scope:'Same stopped course, camera, quality and pose updates; baseline hides held materials. Measures added held rendering cost, not total presentation CPU overhead.'};
    })()`);
    await context.evaluate(`(() => {
      const r=window.__render;
      window.requestAnimationFrame=()=>0;
      const rig=r.scene.getObjectByName('First-person hands and gear');
      const lights=[];r.scene.traverse(n=>{if(n.isLight)lights.push(n.clone());});r.scene.add(...lights);
      window.__firstPersonReview={rig,lights};
    })()`);
    const counts=[];
    for(const hands of blender.hands)for(const sample of hands.captures) {
      const duration=hands.clips[sample.clip],progress=sample.time/duration;
      if(!Number.isFinite(progress)||progress<0||progress>1)throw Error('Invalid authored sample time');
      await context.evaluate(`(() => {
        const s=window.__qaApp.duel.state;
        Object.assign(s.fighter,{crewId:${JSON.stringify(hands.id)},speed:0,airHeight:0,verticalSpeed:0,knockedDown:false});
        s.stageTimeSec=10;s.fighterInput={aim:${sample.clip.startsWith('aim')}};
        Object.assign(s.footWeapons,{selected:${JSON.stringify(sample.tool)},ammo:3,serial:0,lastFireAt:undefined,
          nextFireAt:0,repairing:false,repairSeconds:0,repairAmount:0});
        if(${JSON.stringify(sample.clip)}.includes('fire'))Object.assign(s.footWeapons,{serial:1,lastFireAt:10-.22*${progress},nextFireAt:12});
        else if(${JSON.stringify(sample.clip)}.includes('reload')) {
          const age=.22+1.98*${progress};Object.assign(s.footWeapons,{serial:1,lastFireAt:10-age,nextFireAt:10-age+2.2});
        } else if(${JSON.stringify(sample.clip)}==='repair')Object.assign(s.footWeapons,{repairing:true,
          repairSeconds:${progress}*${hands.id==='odessa'?2:4},repairAmount:40*${progress}});
        else s.stageTimeSec=${sample.time};
        window.__render.renderFrame();
      })()`);
      await context.waitFor(`(() => {window.__render.renderFrame();return ${READY};})()`,'matched '+hands.id+'/'+sample.clip,60000);
      const result=await context.evaluate(`(() => {
        const r=window.__render,review=window.__firstPersonReview;
        r.renderFrame();
        for(const child of r.scene.children)child.visible=false;
        r.scene.add(review.rig);review.rig.visible=true;for(const light of review.lights)light.visible=true;
        r.scene.background=null;r.scene.environment=null;r.scene.fog=null;
        r.renderer.setClearColor(0x42474d,1);r.renderer.setPixelRatio(1);r.renderer.setSize(1280,720,false);r.composer.setSize(1280,720);
        r.renderer.shadowMap.enabled=false;
        r.camera.position.set(0,0,0);r.camera.lookAt(0,0,-1);r.camera.fov=72;r.camera.aspect=1280/720;r.camera.near=.15;r.camera.far=250;r.camera.updateProjectionMatrix();
        review.rig.position.set(0,0,0);review.rig.quaternion.identity();review.rig.updateMatrixWorld(true);
        let triangles=0,draws=0;
        review.rig.traverse(n=>{if(!n.isMesh)return;for(let p=n;p;p=p.parent)if(!p.visible)return;
          triangles+=(n.geometry.index?.count || n.geometry.attributes.position.count)/3;
          draws+=Array.isArray(n.material)?n.geometry.groups.length:1;
        });
        if(triangles>8000||draws>3)throw Error('First-person draw budget exceeded');
        r.renderer.info.reset();
        if(${JSON.stringify(quality)}==='high')r.composer.render(0);else r.renderer.render(r.scene,r.camera);
        return {png:r.renderer.domElement.toDataURL('image/png'),triangles,draws,presentation:{...review.rig.userData.presentation},errors:review.rig.userData.loadErrors};
      })()`);
      const path=`${relative}/game-${quality}-${hands.id}-${sample.clip}.png`,bytes=Buffer.from(result.png.split(',')[1],'base64');
      await writeFile(join(root,path),bytes);context.screenshots.push(join(root,path));
      evidence.captures.push({crew:hands.id,quality,clip:sample.clip,time:sample.time,tool:sample.tool,path,sha256:sha(bytes),presentation:result.presentation});
      counts.push({crew:hands.id,clip:sample.clip,triangles:result.triangles,draws:result.draws});
      evidence.loadErrors.push(...result.errors);
    }
    evidence.counts[quality]=counts;
  }
  if(evidence.loadErrors.length)throw Error('First-person assets failed: '+evidence.loadErrors.join('; '));
  await writeFile(manifestPath,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  console.log(`First-person round ${round}: ${evidence.captures.length} matched captures; actual aim, shot, reload, repair and re-entry in both qualities.`);
}

async function setup(context,quality) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor('window.__qaApp?.visualReady && window.__render','private first-person menu',60000);
  await context.evaluate(`(() => {
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage missing');
    const select=document.querySelector('#graphics-quality');select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));
    const app=window.__qaApp;app.startCampaign({mode:'wasteland',startStage:0,seed:1989});app.stop();
    const s=app.duel.state;Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[]});
    s.rival.s=s.s+55;s.rival.lateral=3;s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    app.duel._rival=()=>{};app.duel._traffic=()=>{};app.onFrame?.(s);window.__render.renderFrame();
  })()`);
  await context.waitFor('window.__qaApp.visualReady','first-person course ready',60000);
}

async function interaction(context,quality) {
  await key(context,'keyDown','KeyF','f',70);await context.evaluate('window.__qaApp.advance(.42)');await key(context,'keyUp','KeyF','f',70);
  await context.waitFor(READY,'first-person Rook assets',60000);
  const point=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state,f=s.fighter;if(!s.onFoot)throw Error('Did not exit');
    const at=app.duel.course.groundAt(s.rival.s,s.rival.lateral);
    f.yaw=Math.atan2(at.x-f.x,at.z-f.z);f.pitch=Math.atan2(at.y+1-f.y-1.62,Math.hypot(at.x-f.x,at.z-f.z));
    const rect=document.querySelector('#view3d canvas').getBoundingClientRect();return{x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+rect.height/2)};
  })()`);
  const mouse=(type,button)=>context.command('Input.dispatchMouseEvent',{type,button,clickCount:1,...point});
  await mouse('mousePressed','right');await context.waitFor("document.pointerLockElement===document.querySelector('#view3d canvas')",'first-person aim lock',10000);
  await context.evaluate('window.__qaApp.advance(.81)');await context.screenshot(`first-person-${quality}-aim`);
  await mouse('mousePressed','left');
  const shot=await context.evaluate(`(() => {
    const app=window.__qaApp;app.advance(.1);app.onFrame?.(app.duel.state);window.__render.renderFrame();
    const s=app.duel.state,g=window.__render.scene.getObjectByName('First-person hands and gear');
    if(s.footWeapons.ammo!==2||g.userData.presentation.action!=='fire'||!s.combat.projectiles.some(p=>p.kind==='rpg'))throw Error('Successful shot did not present recoil');
    return{ammo:s.footWeapons.ammo,action:g.userData.presentation.action};
  })()`);
  await context.screenshot(`first-person-${quality}-fire`);await mouse('mouseReleased','left');
  await context.evaluate('window.__qaApp.advance(.9);window.__render.renderFrame()');
  const action=await context.evaluate("window.__render.scene.getObjectByName('First-person hands and gear').userData.presentation.action");
  if(action!=='reload')throw Error('Successful shot deadline did not present reload');
  await context.screenshot(`first-person-${quality}-reload`);await mouse('mouseReleased','right');
  await key(context,'keyDown','Digit2','2',50);await key(context,'keyUp','Digit2','2',50);
  await context.evaluate('window.__qaApp.duel.state.armor=40;window.__qaApp.duel.state.footWeapons.lastArmor=40;window.__render.renderFrame()');
  await context.waitFor(READY,'first-person wrench asset',60000);await mouse('mousePressed','left');
  await context.evaluate('window.__qaApp.advance(1);window.__render.renderFrame()');await context.screenshot(`first-person-${quality}-repair`);
  await context.evaluate('window.__qaApp.advance(3.02);window.__render.renderFrame()');await mouse('mouseReleased','left');
  const armor=await context.evaluate('window.__qaApp.duel.state.armor');if(Math.abs(armor-80)>.01)throw Error('Repair did not restore 40 armor');
  await key(context,'keyDown','KeyF','f',70);await context.evaluate('window.__qaApp.advance(.62)');await key(context,'keyUp','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(1/120)');
  const reentered=await context.evaluate("!window.__qaApp.duel.state.onFoot&&!window.__render.scene.getObjectByName('First-person hands and gear').visible");
  if(!reentered)throw Error('Re-entry left first-person hands visible');await context.screenshot(`first-person-${quality}-reentered`);
  return{shot,reload:action,armor,reentered};
}
