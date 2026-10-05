import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';

const cars = ['stuttgart_959s', 'falcone_f42'];
const views = ['side', 'three-quarter', 'top'];

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
        image = Image.open(source / f'{quality}-{car}-{view}.png').convert('RGB')
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
        kits:{...app.profile.wasteland?.kits,${JSON.stringify(car)}:{owned:[],equipped:'turret-look'}}}};
    if(!app._saveProfile())throw Error('Memory-only earned-look fixture save failed');
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
  result.capture=await context.screenshot(`${quality}-${carKey}-${mode}`);
  return result;
}

export async function run(context) {
  const round=Number(process.env.GUNN_ART_ROUND||1);
  const paths=gunnReviewPaths(round);
  const bytes=await readFile(new URL('../../public/assets/models/wasteland/kits/gunn-turret.glb',import.meta.url));
  const asset={path:'public/assets/models/wasteland/kits/gunn-turret.glb',bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')};
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
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
