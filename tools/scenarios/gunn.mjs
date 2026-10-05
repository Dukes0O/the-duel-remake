import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const cars = ['stuttgart_959s', 'falcone_f42'];
const views = ['side', 'three-quarter', 'top'];

export function placeGunnReview(duel) {
  const boss = duel.state.opponents[0];
  if (boss?.warlordId !== 'gunn') throw Error('Actual Gunn fight required');
  for (const [actor, lateral] of [[duel.state, -27.5], [boss, 2.5]])
    Object.assign(actor, {s: 100, prevS: 100, lateral, prevLateral: lateral,
      speedMph: 0, headingError: 0});
  duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false});
}

export function gunnReviewPaths(round = 1) {
  if (!Number.isInteger(round) || round < 1 || round > 3)
    throw Error('Gunn review round must be an integer from 1 to 3.');
  return {sheet: `docs/board/looks/gunn/round-${round}.jpg`};
}

// Use full frames, not crops. Raw captures belong to the harness evidence folder.
export function buildComparisonSheet(python, evidence, output, round = 1) {
  gunnReviewPaths(round);
  execFileSync(python, ['-c', String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys
source, output = map(Path, sys.argv[1:3])
round = int(sys.argv[3])
sheet = Image.new('RGB', (1280, 1640), '#191b18')
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=18)
draw.text((12, 10), f'GUNN TURRET / REAL EARNED LOOK / ROUND {round}', fill='#e9ece7', font=font)
for row, (quality, car) in enumerate([(q, c) for q in ['high', 'performance'] for c in ['stuttgart_959s', 'falcone_f42']]):
    top = 44 + row * 399
    for col, view in enumerate(['side', 'three-quarter', 'top']):
        image = Image.open(source / f"{quality}-{car.replace('_', '-')}-{view}.png").convert('RGB')
        if max(hi-lo for lo, hi in image.getextrema()) < 20:
            raise RuntimeError('Blank or flat Gunn capture')
        draw.text((col*426+10, top), f'{quality} / {car} / {view}', fill='#e9ece7', font=font)
        image.thumbnail((426, 360), Image.Resampling.LANCZOS)
        sheet.paste(image, (col*426+(426-image.width)//2, top+28+(360-image.height)//2))
output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output, quality=75, optimize=True, progressive=True)
if output.stat().st_size > 500_000:
    raise RuntimeError('Gunn comparison exceeds 500 KB')
print(str(output), output.stat().st_size)
`, evidence, output, String(round)], {stdio: 'inherit', windowsHide: true});
}

async function prepare(context, quality, car) {
  await context.navigate('/tools/menu-check.html?flags=gunn');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    window.name.startsWith('__duel_qa_tab_v2:') && window.__qaApp.visualReady`,
  `${quality} ${car} memory-only menu`, 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
    // Labelled earned-look fixture; no settlement, payment or real career access.
    app.profile={...app.profile,
      unlockedCars:[...new Set([...app.profile.unlockedCars,${JSON.stringify(car)}])],
      wasteland:{...app.profile.wasteland,version:1,discoveredGate:true,
        warlords:{...app.profile.wasteland?.warlords,gunn:{defeated:true,wins:1}},
        kits:{...app.profile.wasteland?.kits,${JSON.stringify(car)}:{owned:[],equipped:null}}}};
    if(!app._saveProfile())throw Error('Memory-only earned-look fixture save failed');
    const worn=app.equipArmorKit(${JSON.stringify(car)},'turret-look');
    if(!worn.ok)throw Error('Native earned-look equip failed: '+worn.reason);
    if(!app.startCampaign({mode:'wasteland',car:${JSON.stringify(car)},startStage:0,
      seed:1989,difficulty:'medium',opponentCount:0}))throw Error('Native comparison field failed');
    app.stop();
    Object.assign(app.duel.state,{status:'racing',paused:false,countdown:0,
      s:500,prevS:500,lateral:0,prevLateral:0,headingError:0,speedMph:0,
      traffic:[],opponents:[]});
    if(app.duel.state.combatArmorKit!=='turret-look')throw Error('Native earned look did not equip');
    window.__gunnReviewProfile=JSON.stringify(app.profile);
    document.head.insertAdjacentHTML('beforeend','<style>details,#race-hud,#pause-button,#modal-layer,#sound-toggle,#camera-button{display:none!important}</style>');
    app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
  })()`);
  await context.waitFor(`(() => {
    const app=window.__qaApp,r=window.__render;
    app.onFrame?.(app.duel.state,0);r.renderFrame();
    const car=r.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
    const root=car?.getObjectByName('gunn-turret-root');
    let visible=!!root;
    for(let node=root;node;node=node.parent)visible=visible&&node.visible;
    return app.visualReady && car?.userData.vehicleKey===${JSON.stringify(car)} &&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && visible &&
      !!root.getObjectByName('gunn-turret-mouth-3') && document.querySelector('#renderer-loading')?.hidden;
  })()`, `${quality} ${car} actual car, mount and turret`, 60000);
}

async function capture(context, quality, carKey, mode) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render;
    const car=r.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
    if(car?.userData.vehicleKey!==${JSON.stringify(carKey)})throw Error('Comparison changed cars');
    car.updateMatrixWorld(true);
    const points=[],low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    car.traverseVisible(node=>{
      const positions=node.geometry?.attributes?.position;
      if(!positions)return;
      for(let i=0;i<positions.count;i++){
        const p=car.position.clone().fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld);
        points.push(p);[p.x,p.y,p.z].forEach((value,axis)=>{
          low[axis]=Math.min(low[axis],value);high[axis]=Math.max(high[axis],value);
        });
      }
    });
    if(points.length<100)throw Error('Real comparison geometry missing');
    const centre=car.position.clone().set(...low.map((n,i)=>(n+high[i])/2));
    const radius=Math.hypot(...low.map((n,i)=>(high[i]-n)/2));
    const distance=radius/Math.sin(24*Math.PI/180)*1.18;
    const direction=car.position.clone().set(...({side:[1,.12,0],
      'three-quarter':[1,.62,1],top:[.02,1,.001]})[${JSON.stringify(mode)}]).normalize();
    direction.transformDirection(car.matrixWorld);
    const eye=centre.clone().addScaledVector(direction,distance);
    app.inspectionCamera={position:eye.toArray(),target:centre.toArray()};
    window.__gunnReviewFrame={points,before:JSON.stringify(app.duel.state)};
    r.renderFrame();
  })()`);
  await context.waitFor(`(() => {
    const app=window.__qaApp,r=window.__render;
    r.renderFrame();
    return r.camera.position.distanceTo(r.camera.position.clone().fromArray(app.inspectionCamera.position))<.025;
  })()`, `${carKey} ${mode} inspection camera settled`, 10000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,q=window.__gunnReviewFrame;
    app.onFrame?.(app.duel.state,0);r.renderFrame();r.camera.updateMatrixWorld(true);
    const projection=q.points.map(p=>p.clone().project(r.camera));
    if(projection.some(p=>Math.abs(p.x)>.97||Math.abs(p.y)>.97||p.z < -1||p.z > 1))
      throw Error('Actual car/turret geometry leaves the full comparison frame');
    if(JSON.stringify(app.duel.state)!==q.before||JSON.stringify(app.profile)!==window.__gunnReviewProfile)
      throw Error('Comparison camera/render changed native state or career');
    const car=r.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
    const root=car.getObjectByName('gunn-turret-root'),panel=root.getObjectByName('gunn-turret-heat-panel');
    const heat=[];panel.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material))
      if(m.emissive)heat.push(m.emissive.getHex());});
    if(!heat.length||heat.some(value=>value!==0))throw Error('Earned look must remain cold');
    const gl=r.renderer.getContext(),pixels=new Uint8Array(32*32*4);
    gl.readPixels(Math.floor(gl.drawingBufferWidth/2)-16,Math.floor(gl.drawingBufferHeight/2)-16,
      32,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let low=255,high=0;for(let i=0;i<pixels.length;i++)if(i%4!==3){low=Math.min(low,pixels[i]);high=Math.max(high,pixels[i]);}
    if(high-low<12)throw Error('Comparison canvas centre is blank or flat');
    return {car:${JSON.stringify(carKey)},quality:${JSON.stringify(quality)},view:${JSON.stringify(mode)},
      camera:app.inspectionCamera,vertices:q.points.length,heat,
      drawCalls:r.renderer.info.render.calls,pixelRange:high-low,stateUnchanged:true};
  })()`);
  result.capture=await context.screenshot(`${quality}-${carKey.replaceAll('_','-')}-${mode}`);
  return result;
}

async function advanceFight(context, condition, seconds = 15) {
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,a=d.state.opponents[0],q=window.__gunnMotion;
    for(let n=0;n<${Math.ceil(seconds*120)};n++) {
      if(${condition})return true;
      if(d.state.status!=='racing')throw Error('Gunn review left the actual fight');
      d.step(1/120);
    }
    throw Error('Gunn native stage did not arrive: '+JSON.stringify(a.gunnBarrage));
  })()`);
}

async function captureFight(context, quality, label, rear = false) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,q=window.__gunnMotion; q.paint();
    const car=q.car(),eye=car.localToWorld(car.position.clone().set(8,6,${rear ? -11 : 11}));
    app.inspectionCamera={position:eye.toArray(),target:car.localToWorld(car.position.clone().set(0,2.5,0)).toArray()};
  })()`);
  await context.waitFor(`(() => {const app=window.__qaApp,r=window.__render;r.renderFrame();
    return r.camera.position.distanceTo(r.camera.position.clone().fromArray(app.inspectionCamera.position))<.05;
  })()`, `${quality} ${label} native camera`, 10000);
  const row=await context.evaluate('window.__gunnMotion.paint()');
  row.capture=await context.screenshot(`${quality}-gunn-${label}`);
  return row;
}

async function fightPacing(context, quality) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,a=d.state.opponents[0],q=window.__gunnMotion;
    q.unsubscribe();
    const p=d.course.groundAt(d.state.s,d.state.lateral),b=d.course.groundAt(a.s,a.lateral);
    const x=(p.x+b.x)/2,z=(p.z+b.z)/2,y=(p.y+b.y)/2;
    const distance=Math.max(65,Math.hypot(p.x-b.x,p.z-b.z)*1.2);
    app.inspectionCamera={position:[x+distance*.5,y+distance*.5,z+distance*.65],target:[x,y+1,z]};
    q.pacingStartSec=d.state.stageTimeSec;app.start();
  })()`);
  await context.waitFor(`window.__qaApp.running && window.__qaApp.visualReady &&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)`,
  `${quality} moving Gunn warmup`, 60000);
  await new Promise(done=>setTimeout(done,1200));
  await context.evaluate(`(() => {
    const button=[...document.querySelectorAll('button')].find(n=>n.textContent==='Measure frame pacing');
    if(!button)throw Error('Existing frame measurement control missing');button.click();
  })()`);
  await context.waitFor(`document.querySelector('#performance-results')?.textContent.includes('"frames": 120')`,
    `${quality} existing 120-frame Gunn sample`, 35000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp,q=window.__gunnMotion;app.stop();
    if(app.duel.state.status!=='racing'||app.duel.state.stageTimeSec<=q.pacingStartSec)
      throw Error('Pacing did not cover an advancing native Gunn fight');
    if(JSON.stringify(app.profile)!==q.profile)throw Error('Pacing changed the memory career');
    return JSON.parse(document.querySelector('#performance-results').textContent).at(-1);
  })()`);
  if(result.frames!==120||result.quality!==(quality==='high'?'High':'Performance')||
    !Number.isFinite(result.p95)||result.p95<=0)throw Error('Invalid native Gunn frame sample');
  result.capture=await context.screenshot(`${quality}-gunn-pacing`);
  return result;
}

async function runFight(context, asset) {
  const report={card:'WAR-03a',mode:'native Gunn motion and moving frame pacing',asset,rows:[],
    fixture:'Actual App yard admission and countdown; one tested clear Pit pose, then full native physics and player inputs.',
    limits:['Motion evidence does not approve the look or audio.',
      'Existing 120-frame profiler measures delivered frames and separate CPU/GPU phases, not isolated turret overhead.']};
  const persist=()=>writeFile(join(context.outputDir,'gunn-motion.json'),JSON.stringify(report,null,2)+'\n');
  try {
    for(const quality of ['high','performance']) {
      await context.navigate('/tools/menu-check.html?flags=gunn');
      await context.waitFor(`window.__qaApp?.visualReady && !!window.__render`,`${quality} native menu`,60000);
      await context.evaluate(`(() => {
        const app=window.__qaApp;
        if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Memory-only Gunn motion review required');
        app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});app.cpuDifficulty='hard';
        for(const panel of document.querySelectorAll('details'))panel.open=false;
        app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,
          territories:{...app.profile.wasteland.territories,gunn:{hold:100,claimed:false}}}};
        if(!app._saveProfile()||!app.visitWasteland())throw Error('Native Gunn discovery/hold fixture failed');
      })()`);
      await context.waitFor(`window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden`,
        `${quality} yard approach`,60000);
      await context.evaluate('window.__qaApp.advance(8)');
      await context.waitFor('window.__qaApp.isYardHomeActive()',`${quality} native yard`,60000);
      await context.evaluate(`(() => {
        const app=window.__qaApp;
        if(!app.startWarlordFight('gunn')||!app.beginWarlordFight())throw Error('Actual App Gunn entry failed');
        for(let n=0;n<362;n++)app.duel.step(1/120);
        if(app.duel.state.status!=='racing')throw Error('Native Gunn countdown failed');
        (${placeGunnReview.toString()})(app.duel);
        app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
      })()`);
      await context.waitFor(`(() => {const app=window.__qaApp,r=window.__render;app.onFrame?.(app.duel.state,0);r.renderFrame();
        return app.visualReady && document.querySelector('#renderer-loading')?.hidden &&
          !!r.scene.getObjectByName('gunn-turret-mouth-3');})()`,`${quality} real Gunn turret`,60000);
      await context.evaluate(`(() => {
        const app=window.__qaApp,d=app.duel,r=window.__render,a=d.state.opponents[0];
        const q=window.__gunnMotion={shots:[],profile:JSON.stringify(app.profile)};
        q.car=()=>{let car;r.scene.traverse(n=>{if(n.userData.vehicleKey==='stuttgart_959s'&&
          n.getObjectByName('gunn-turret-root'))car=n;});if(!car)throw Error('Actual Gunn car missing');return car;};
        q.paint=()=>{
          const before=JSON.stringify(d.state);app.onFrame?.(d.state,0);r.renderFrame();
          if(JSON.stringify(d.state)!==before||JSON.stringify(app.profile)!==q.profile)
            throw Error('Gunn presentation changed race or career');
          const car=q.car();car.updateMatrixWorld(true);
          const root=car.getObjectByName('gunn-turret-root'),head=root.getObjectByName('gunn-turret-head');
          const direction=car.position.clone().set(0,0,1).transformDirection(head.matrixWorld);
          const aim=a.gunnBarrage.aim,pivot=head.getWorldPosition(car.position.clone()),heat=[];
          if(aim&&direction.dot(car.position.clone().set(aim.x,aim.y,aim.z).sub(pivot).normalize())<.99999)
            throw Error('Real turret does not face its native tracked/locked aim');
          root.getObjectByName('gunn-turret-heat-panel').traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material))
            if(m.emissive)heat.push(m.emissive.getHex());});
          if(!heat.length||heat.some(value=>value!==(a.gunnBarrage.stage==='window'?0xff1605:0)))
            throw Error('Native Gunn heat panel has wrong window state');
          const line=car.getObjectByName('Gunn barrage aiming line');
          if((a.gunnBarrage.stage==='tell')!==!!line?.visible)throw Error('Native tell aiming line has wrong state');
          const rockets=[];
          d.state.combat.projectiles.forEach((p,index)=>{
            if(p.kind!=='rocket-pod')return;
            const mesh=r.scene.getObjectByName('combat-rpg-'+index);
            let visible=!!mesh;for(let n=mesh;n;n=n.parent)visible=visible&&n.visible;
            const error=mesh?.getWorldPosition(car.position.clone()).distanceTo(car.position.clone().set(p.x,p.y,p.z));
            if(!visible||!(error<1e-5))throw Error('Rendered rocket is missing or detached from native flight');
            rockets.push({id:p.id,position:[p.x,p.y,p.z],renderError:error});
          });
          return {time:d.state.stageTimeSec,stage:a.gunnBarrage.stage,aim:structuredClone(aim),
            player:{s:d.state.s,lateral:d.state.lateral,speedMph:d.state.speedMph,
              heading:d.course.at(d.state.s).heading+(d.state.headingError||0)},
            headRotation:head.rotation.toArray(),heat,tellLine:!!line?.visible,rockets,stateUnchanged:true};
        };
        q.unsubscribe=d.onChange((_state,event)=>{
          if(event.arsenalCue!=='weapon.rockets.fire'||event.actor!==a||a.gunnBarrage.stage!=='barrage')return;
          q.paint();const car=q.car(),origin=car.position.clone().set(event.projectile.x,event.projectile.y,event.projectile.z);
          const error=Math.min(...Array.from({length:4},(_,n)=>origin.distanceTo(
            car.getObjectByName('gunn-turret-mouth-'+n).getWorldPosition(car.position.clone()))));
          if(error>1e-5)throw Error('Actual native rocket did not leave a rendered mouth');
          q.shots.push({id:event.projectile.id,launchedAt:event.projectile.launchedAt,
            origin:origin.toArray(),mouthError:error,aim:structuredClone(a.gunnBarrage.aim)});
        });
      })()`);
      const row={quality,motion:[]};report.rows.push(row);
      await advanceFight(context,"a.gunnBarrage.stage==='tell'");
      await context.evaluate('for(let n=0;n<8;n++)window.__qaApp.duel.step(1/120)');
      row.motion.push(await captureFight(context,quality,'tracking-start'));
      await context.evaluate(`(() => {const d=window.__qaApp.duel;d.setInput({throttle:.5,brake:0,steer:.3,boost:false});
        for(let n=0;n<18;n++)d.step(1/120);})()`);
      row.motion.push(await captureFight(context,quality,'tracking-moved'));
      if(row.motion[1].stage!=='tell'||Math.hypot(row.motion[1].aim.x-row.motion[0].aim.x,
        row.motion[1].aim.z-row.motion[0].aim.z)<=.001)throw Error('Moving player did not change the actual tell aim');
      await advanceFight(context,'q.shots.length>0');
      row.motion.push(await captureFight(context,quality,'locked-rocket'));
      await context.evaluate('window.__qaApp.duel.setInput({throttle:.5,brake:0,steer:1,boost:false})');
      await advanceFight(context,"a.gunnBarrage.stage==='window'");
      row.motion.push(await captureFight(context,quality,'overheat',true));
      row.shots=await context.evaluate('window.__gunnMotion.shots');
      if(row.shots.length!==3||row.shots.some(shot=>JSON.stringify(shot.aim)!==JSON.stringify(row.shots[0].aim))||
        row.shots.some((shot,n)=>n&&Math.abs(shot.launchedAt-row.shots[n-1].launchedAt-.25)>1/120))
        throw Error('Native Gunn barrage count, point lock or spacing changed');
      await advanceFight(context,"a.gunnBarrage.stage==='idle'",4);
      row.motion.push(await captureFight(context,quality,'cooled',true));
      row.pacing=await fightPacing(context,quality);await persist();
    }
    report.passed=true;
  } catch(error) {report.passed=false;report.failure=error.message;throw error;}
  finally {await persist();}
}

export async function run(context) {
  const round=Number(process.env.GUNN_ART_ROUND||1);
  const paths=gunnReviewPaths(round);
  const bytes=await readFile(new URL('../../public/assets/models/wasteland/kits/gunn-turret.glb',import.meta.url));
  const asset={path:'public/assets/models/wasteland/kits/gunn-turret.glb',bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')};
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  if(process.env.GUNN_FIGHT_REVIEW==='1')return runFight(context,asset);
  const report={card:'WAR-03a',round,memoryOnly:true,paths,asset,captures:[],
    fixture:'Stopped seed-1989 native campaign; earned turret-look on real approved Stuttgart and Falcone models.',
    framing:'Actual visible geometry bounds; production 48-degree inspection camera; complete uncropped frames.',
    limits:['Appearance only: not native Gunn fight, audio or pacing evidence.','Claude visual approval remains pending.']};
  for(const quality of ['high','performance'])for(const car of cars){
    await prepare(context,quality,car);
    for(const mode of views)report.captures.push(await capture(context,quality,car,mode));
  }
  if(report.captures.length!==12)throw Error('All twelve matched turret views are required');
  await writeFile(join(context.outputDir,'gunn-comparison.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Gunn comparison: twelve real-model views; Claude verdict pending.');
}
