import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';

const cars = ['viper_proto', 'falcone_f42'];
const views = ['side', 'three-quarter', 'top'];

export function blackironReviewPaths(round = 1) {
  if (!Number.isInteger(round) || round < 1 || round > 2)
    throw Error('Chrome Crown review has at most two rounds.');
  return {sheet: `docs/board/looks/blackiron/round-${round}.jpg`};
}

export function buildComparisonSheet(python, evidence, output, round = 1) {
  blackironReviewPaths(round);
  execFileSync(python, ['-c', String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys
source, output = map(Path, sys.argv[1:3])
sheet = Image.new('RGB', (1280, 1640), '#191b18')
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=18)
draw.text((12, 10), f'CHROME CROWN / ACTUAL FITTED PARTS / ROUND {sys.argv[3]}', fill='#e9ece7', font=font)
for row, (quality, car) in enumerate([(q,c) for q in ['high','performance'] for c in ['viper_proto','falcone_f42']]):
    top = 44 + row * 399
    for col, view in enumerate(['side','three-quarter','top']):
        image = Image.open(source / f"{quality}-{car.replace('_','-')}-{view}.png").convert('RGB')
        if max(hi-lo for lo,hi in image.getextrema()) < 20:
            raise RuntimeError('Blank Crown capture')
        draw.text((col*426+10,top), f'{quality} / {car} / {view}', fill='#e9ece7', font=font)
        image.thumbnail((426,360), Image.Resampling.LANCZOS)
        sheet.paste(image,(col*426+(426-image.width)//2,top+28+(360-image.height)//2))
output.parent.mkdir(parents=True,exist_ok=True)
sheet.save(output,quality=75,optimize=True,progressive=True)
if output.stat().st_size > 500_000:
    raise RuntimeError('Crown comparison exceeds 500 KB')
print(str(output),output.stat().st_size)
`, evidence, output, String(round)], {stdio: 'inherit', windowsHide: true});
}

async function menu(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=blackiron');
  await context.waitFor(`!!window.__qaApp && !!window.__render && window.__qaApp.visualReady &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    window.name.startsWith('__duel_qa_tab_v2:')`, 'memory-only Baron menu', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});app.cpuDifficulty='medium';
    app.profile={...app.profile,unlockedCars:[...new Set([...app.profile.unlockedCars,'viper_proto','falcone_f42'])],
      wasteland:{...app.profile.wasteland,version:1,discoveredGate:true,
        warlords:Object.fromEntries(['sal','dustmonger','mirage','gunn','kettle','vultures','tollkeeper'].map(id=>[id,{defeated:true,wins:1}])),
        territories:{...app.profile.wasteland.territories,blackiron:{hold:100,claimed:false}}}};
    if(!app._saveProfile())throw Error('Memory-only fixture failed');
  })()`);
}

async function prepare(context, quality, key) {
  await menu(context, quality);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.profile.wasteland.warlords.blackiron={defeated:true,wins:1};
    app.profile.wasteland.kits[${JSON.stringify(key)}]={owned:['warlord'],equipped:'warlord'};
    if(!app._saveProfile())throw Error('Earned-look fixture failed');
    if(!app.equipArmorKit(${JSON.stringify(key)},'chrome-crown').ok)throw Error('Native Crown wear denied');
    if(!app.equipArmorKit(${JSON.stringify(key)},null).ok||!app.equipArmorKit(${JSON.stringify(key)},'warlord').ok)
      throw Error('Native look removal failed');
    if(${JSON.stringify(key)}==='viper_proto'&&!app.equipArmorKit(${JSON.stringify(key)},null).ok)throw Error('Native stock selection failed');
    if(!app.equipArmorKit(${JSON.stringify(key)},'chrome-crown').ok)throw Error('Native comparison wear denied');
    if(!app.startCampaign({mode:'wasteland',car:${JSON.stringify(key)},startStage:0,
      seed:1989,difficulty:'medium',opponentCount:0}))throw Error('Native field failed');
    app.stop();Object.assign(app.duel.state,{status:'racing',paused:false,countdown:0,s:500,prevS:500,
      lateral:0,prevLateral:0,headingError:0,speedMph:0,traffic:[],opponents:[]});
    document.head.insertAdjacentHTML('beforeend','<style>details,#race-hud,#pause-button,#modal-layer,#sound-toggle,#camera-button{display:none!important}</style>');
    app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
  })()`);
  await context.waitFor(`(() => {const r=window.__render,app=window.__qaApp;
    app.onFrame?.(app.duel.state,0);r.renderFrame();
    const car=r.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
    return car?.userData.vehicleKey===${JSON.stringify(key)}&&!!car.getObjectByName('chrome-crown-spikes')&&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&document.querySelector('#renderer-loading')?.hidden;
  })()`, 'actual authored Crown parts', 60000);
  return context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,d=app.duel,car=r.scene.getObjectByName('armor-kit-0-front').parent.parent;
    const seen=n=>{for(let p=n;p;p=p.parent)if(!p.visible)return false;return !!n;};
    const equipped=d.state.combatArmorKit;
    if(d.state.combatRoofLook!=='chrome-crown')throw Error('Native Crown option not forwarded');
    // Labelled visual switch fixture; shop choices happened before native entry.
    d.state.combatArmorKit='warlord';delete d.state.combatRoofLook;
    app.onFrame?.(d.state,0);r.renderFrame();car.updateMatrixWorld(true);const old=car.getObjectByName('kit-crown');
    const matrix=old.matrixWorld.toArray(),scale=old.scale.toArray(),materials=[];
    old.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material))materials.push([m,m.version,m.map,m.color.toArray()]);});
    if(!seen(old))throw Error('Historical Warlord crown is hidden');
    const spikes=car.getObjectByName('chrome-crown-spikes');
    if(seen(spikes))throw Error('New Crown draws on a historical kit');
    d.state.combatRoofLook='chrome-crown';app.onFrame?.(d.state,0);r.renderFrame();car.updateMatrixWorld(true);
    if(seen(old)||!seen(spikes)||!seen(car.getObjectByName('chrome-crown-base')))throw Error('Crown hidden or doubled');
    const versions=[];spikes.traverse(n=>{if(n.isMesh)for(const m of [].concat(n.material))versions.push([m,m.version]);});
    for(let i=0;i<10;i++){app.onFrame?.(d.state,0);r.renderFrame();}
    if(versions.some(([m,v])=>m.version!==v))throw Error('Crown recompiles each frame');
    if(JSON.stringify(old.matrixWorld.toArray())!==JSON.stringify(matrix)||JSON.stringify(old.scale.toArray())!==JSON.stringify(scale)||
      materials.some(([m,v,map,color])=>m.version!==v||m.map!==map||JSON.stringify(m.color.toArray())!==JSON.stringify(color)))
      throw Error('Crown changed the old authored fit or finish');
    delete d.state.combatRoofLook;app.onFrame?.(d.state,0);r.renderFrame();car.updateMatrixWorld(true);
    if(!seen(old)||seen(spikes)||JSON.stringify(old.matrixWorld.toArray())!==JSON.stringify(matrix))throw Error('Historical crown did not return exactly');
    d.state.combatArmorKit=equipped;
    d.state.combatRoofLook='chrome-crown';app.onFrame?.(d.state,0);r.renderFrame();
    window.__crownProfile=JSON.stringify(app.profile);
    return {car:${JSON.stringify(key)},oldTransformExact:true,oldMaterialExact:true,exclusiveVisibleCrown:true,
      stableMaterialVersions:true,stock:${JSON.stringify(key)}==='viper_proto'};
  })()`);
}

async function capture(context, quality, key, view) {
  await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,car=r.scene.getObjectByName('armor-kit-0-front').parent.parent;
    car.updateMatrixWorld(true);const points=[],low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    car.traverseVisible(n=>{const a=n.geometry?.attributes?.position;if(!a)return;
      for(let i=0;i<a.count;i++){const p=car.position.clone().fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld);
        points.push(p);[p.x,p.y,p.z].forEach((v,j)=>{low[j]=Math.min(low[j],v);high[j]=Math.max(high[j],v);});}});
    if(points.length<100)throw Error('Actual car geometry missing');
    const centre=car.position.clone().set(...low.map((n,i)=>(n+high[i])/2));
    const radius=Math.hypot(...low.map((n,i)=>(high[i]-n)/2)),distance=radius/Math.sin(24*Math.PI/180)*1.18;
    const direction=car.position.clone().set(...({side:[1,.12,0],'three-quarter':[1,.62,1],top:[.02,1,.001]})[${JSON.stringify(view)}])
      .normalize().transformDirection(car.matrixWorld);
    app.inspectionCamera={position:centre.clone().addScaledVector(direction,distance).toArray(),target:centre.toArray()};
    window.__crownFrame={points,before:JSON.stringify(app.duel.state)};r.renderFrame();
  })()`);
  await context.waitFor(`(() => {const r=window.__render,a=window.__qaApp;r.renderFrame();
    return r.camera.position.distanceTo(r.camera.position.clone().fromArray(a.inspectionCamera.position))<.025;})()`, 'Crown camera', 10000);
  const row = await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,q=window.__crownFrame;r.renderFrame();r.camera.updateMatrixWorld(true);
    if(q.points.map(p=>p.clone().project(r.camera)).some(p=>Math.abs(p.x)>.97||Math.abs(p.y)>.97||p.z< -1||p.z>1))
      throw Error('Crown comparison is cropped');
    if(JSON.stringify(app.duel.state)!==q.before||JSON.stringify(app.profile)!==window.__crownProfile)throw Error('Render changed native state');
    const gl=r.renderer.getContext(),pixels=new Uint8Array(4096);
    gl.readPixels(Math.floor(gl.drawingBufferWidth/2)-16,Math.floor(gl.drawingBufferHeight/2)-16,32,32,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    let low=255,high=0;for(let i=0;i<pixels.length;i++)if(i%4!==3){low=Math.min(low,pixels[i]);high=Math.max(high,pixels[i]);}
    if(high-low<12)throw Error('Crown canvas is blank');
    return {car:${JSON.stringify(key)},quality:${JSON.stringify(quality)},view:${JSON.stringify(view)},
      vertices:q.points.length,pixelRange:high-low,drawCalls:r.renderer.info.render.calls,stateUnchanged:true};
  })()`);
  row.capture = await context.screenshot(`${quality}-${key.replaceAll('_','-')}-${view}`);
  return row;
}

async function runFight(context) {
  const report = {card: 'WAR-03e', memoryOnly: true, rows: [],
    fixture: 'Actual yard entry and native arena steps. One-armor projectile fixtures complete the three-wreck settlement, not a skill or balance claim.'};
  for (const quality of ['high', 'performance']) {
    await menu(context, quality);
    await context.evaluate(`if(!window.__qaApp.visitWasteland())throw Error('Yard denied')`);
    await context.waitFor(`window.__qaApp.visualReady&&document.querySelector('#renderer-loading')?.hidden`, 'yard assets', 60000);
    await context.evaluate('window.__qaApp.advance(8)');
    await context.waitFor('window.__qaApp.isYardHomeActive()', 'native yard', 60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
      const territory=document.querySelector('button[data-action="yard-territory"]');
      if(!territory||territory.disabled)throw Error('Native territory button missing');territory.click();
      const fight=document.querySelector('button[data-warlord="blackiron"]');
      if(!fight||fight.disabled)throw Error('Native Baron button missing');fight.click();
      if(app.duel.state.status!=='warlord_intro'||!app.beginWarlordFight())throw Error('Baron native entry denied');
      app.stop();app.duel.setInput({throttle:0,brake:1,steer:0,boost:false});
      for(let i=0;i<361;i++)app.duel.step(1/120);
      const d=app.duel,a=d.state.opponents[0];
      if(d.state.arena.warlordId!=='blackiron'||a.car!=='viper_proto'||a.maxArmor!==120)throw Error('Wrong native fight');
      app.onFrame?.(d.state,0);window.__render.renderFrame();
      window.__baronNative={startArmor:a.armor,startMax:a.maxArmor,moves:[],frames:[]};
    })()`);
    await context.waitFor(`(() => {const app=window.__qaApp;app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
      return app.visualReady&&!!window.__render.scene.getObjectByName('chrome-crown-spikes');})()`, 'Baron real Crown', 60000);
    const pacing = await context.evaluate(`new Promise(resolve=>{
      const app=window.__qaApp,r=window.__render,q=window.__baronNative;let last=performance.now(),n=0;
      function frame(now){if(n++>20)q.frames.push(now-last);last=now;
        for(let i=0;i<2;i++)app.duel.step(1/120);app.onFrame?.(app.duel.state,0);r.renderFrame();
        const a=app.duel.state.opponents[0];if(a.blackiron.move&&!q.moves.includes(a.blackiron.move))q.moves.push(a.blackiron.move);
        if(n<180)requestAnimationFrame(frame);else{const sorted=q.frames.slice().sort((a,b)=>a-b);resolve({
          frames:sorted.length,p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),moves:q.moves,
          calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles});}}
      requestAnimationFrame(frame);
    })`);
    if (pacing.p95 > 50) throw Error(`${quality} Baron p95 exceeds 50 ms: ${pacing.p95}`);
    const entry = await context.screenshot(`${quality}-baron-fight`);
    const reward = await context.evaluate(`(()=>{
      const app=window.__qaApp,d=app.duel;
      const before=app.profile.wasteland.scrap;
      for(let wreck=0;wreck<3;wreck++){
        for(const p of d.state.arena.participants){p.protectedSec=0;p.wreckCounted=false;}
        const a=d.state.opponents[0];a.combatWrecking=false;a.armor=1;a.combatShield=0;
        a.blackiron.nextSec=Infinity;a.blackiron.move=null;d.state.combat.rivalShield=0;
        Object.assign(d.state,{s:100,prevS:100,lateral:-27.5,prevLateral:-27.5,speedMph:0,headingError:Math.PI/2});
        Object.assign(a,{s:100,prevS:100,lateral:-15.5,prevLateral:-15.5,speedMph:0,headingError:0});
        d.state.combat.cooldowns.crossbow=0;
        if(!d.fireWeapon('crossbow'))throw Error('Native fixture shot denied');
        const expected=wreck+1;
        for(let n=0;d.state.arena.participants[1].wrecked<expected&&n<360;n++)d.step(1/120);
        if(d.state.arena.participants[1].wrecked!==expected)throw Error('Native projectile did not wreck Baron: '+JSON.stringify({
          wreck,armor:a.armor,wrecking:a.combatWrecking,participant:d.state.arena.participants[1],projectiles:d.state.combat.projectiles.length}));
      }
      const result=d.state.arena.result;
      if(d.state.status!=='arena_result'||result.scrapEarned!==1560||!result.settlementSaved||
        app.profile.wasteland.title!=='Warlord of the Wastes'||result.titleEarned!=='Warlord of the Wastes')throw Error('Baron reward failed');
      app.onFrame?.(d.state,0);window.__render.renderFrame();
      if(app.profile.wasteland.scrap!==before+1560||app._settleArenaResult({result},d.state))throw Error('Baron paid twice');
      return {scrap:result.scrapEarned,title:result.titleEarned,saved:true,once:true};
    })()`);
    report.rows.push({quality, pacing, entry, reward, result: await context.screenshot(`${quality}-baron-result`)});
  }
  await writeFile(join(context.outputDir, 'blackiron-fight.json'), JSON.stringify(report, null, 2) + '\n');
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  if (process.env.BLACKIRON_FIGHT_REVIEW === '1') return runFight(context);
  const round = Number(process.env.BLACKIRON_ART_ROUND || 1), paths = blackironReviewPaths(round);
  const report = {card: 'WAR-03e', round, memoryOnly: true, paths, controls: [], captures: [],
    fixture: 'Stopped seed-1989 native campaign. Viper stock plus Crown; Falcone Warlord plus Crown. Actual approved car and kit parts.',
    limits: ['Appearance only; not fight, audio or moving pacing evidence.', 'Claude Crown verdict pending.']};
  for (const quality of ['high', 'performance']) for (const key of cars) {
    report.controls.push(await prepare(context, quality, key));
    for (const view of views) report.captures.push(await capture(context, quality, key, view));
  }
  await writeFile(join(context.outputDir, 'blackiron-comparison.json'), JSON.stringify(report, null, 2) + '\n');
}
