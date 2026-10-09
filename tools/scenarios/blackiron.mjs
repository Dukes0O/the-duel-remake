import {writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';
import {ffmpeg} from '../audio/codec.mjs';

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
    document.head.insertAdjacentHTML('beforeend','<style>body > details{display:none!important}</style>');
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

async function runNitroPresentation(context) {
  const report = {card: 'WAR-03e', memoryOnly: true, rows: [],
    fixture: 'Actual Baron yard entry and phase-two fight. The review starts his next move at Nitro in an isolated memory career; native steps, renderer and audio events remain in control.',
    limits: ['The moving sample covers the native Nitro signature, not an isolated GPU cost.',
      'Screenshots and meters do not supply Claude\'s Crown or listening verdict.']};
  for (const quality of ['high', 'performance']) {
    await menu(context, quality);
    await context.evaluate('if(!window.__qaApp.visitWasteland())throw Error("Baron yard denied")');
    await context.waitFor('window.__qaApp.visualReady&&document.querySelector("#renderer-loading")?.hidden', 'Baron yard assets', 60000);
    await context.evaluate('window.__qaApp.advance(8)');
    await context.waitFor('window.__qaApp.isYardHomeActive()', 'Baron yard home', 60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
      const territory=document.querySelector('button[data-action="yard-territory"]');
      if(!territory||territory.disabled)throw Error('Baron territory route missing');territory.click();
      const fight=document.querySelector('button[data-warlord="blackiron"]');
      if(!fight||fight.disabled)throw Error('Baron fight control missing');fight.click();
      if(app.duel.state.status!=='warlord_intro'||!app.beginWarlordFight())throw Error('Baron fight entry failed');
      app.stop();for(let i=0;i<361;i++)app.duel.step(1/120);
      const d=app.duel,s=d.state,a=s.opponents[0];
      if(s.status!=='racing'||a?.warlordId!=='blackiron'||!a.blackiron)throw Error('Native Baron fight missing');
      s.arena.warlordPhase=2;
      Object.assign(s,{s:100,prevS:100,lateral:-27.5,prevLateral:-27.5,speedMph:0,headingError:0,
        armor:10000,maxArmor:10000});
      Object.assign(a,{s:100,prevS:100,lateral:2.5,prevLateral:2.5,speedMph:0,headingError:0});
      Object.assign(a.blackiron,{index:4,move:null,started:false,nextSec:s.stageTimeSec,pairSecond:false});
      d.setInput({throttle:0,brake:1,steer:0,boost:false});
      window.__baronNitro={profile:JSON.stringify(app.profile),stages:[]};
      window.__baronNitro.paint=()=>{
        const ground=d.course.groundAt(a.s,a.lateral);
        app.inspectionCamera={position:[ground.x+16,ground.y+11,ground.z+19],
          target:[ground.x,ground.y+1.5,ground.z]};
        const before=JSON.stringify(s);app.onFrame?.(s,0);window.__render.renderFrame();
        if(JSON.stringify(s)!==before||JSON.stringify(app.profile)!==window.__baronNitro.profile)
          throw Error('Nitro rendering changed race or memory career');
        const vehicles=[];window.__render.scene.traverse(node=>{
          if(node.userData.vehicleKey===a.car)vehicles.push(node);
        });
        const spikes=vehicles.map(vehicle=>vehicle.getObjectByName('chrome-crown-spikes')).find(Boolean);
        const smoke=window.__render.scene.getObjectByName('combat-vfx-damage-1-smoke');
        if(!spikes||!smoke)throw Error('Baron Crown or exhaust mesh missing');
        let spikesVisible=true;for(let node=spikes;node;node=node.parent)spikesVisible&&=node.visible;
        let smokeVisible=true;for(let node=smoke;node;node=node.parent)smokeVisible&&=node.visible;
        return {stage:a.blackiron.stage,move:a.blackiron.move,time:s.stageTimeSec,
          tellSec:a.arenaNitroTellSec,windowSec:a.arenaNitroSpentSec,
          callout:s.callout,spikesVisible,spikesScale:spikes.scale.toArray(),
          smokeVisible,smokeColor:smoke.material.color.getHex(),
          bossVehicleCount:vehicles.length,drawCalls:window.__render.renderer.info.render.calls,
          triangles:window.__render.renderer.info.render.triangles,stateUnchanged:true};
      };
      window.__baronNitro.advance=stage=>{
        for(let i=0;i<1200&&a.blackiron.stage!==stage;i++)d.step(1/120);
        if(a.blackiron.stage!==stage)throw Error('Native Nitro never reached '+stage);
        return window.__baronNitro.paint();
      };
      app.onFrame?.(s,0);window.__render.renderFrame();
    })()`);
    await context.waitFor('window.__qaApp.visualReady&&!!window.__render.scene.getObjectByName("chrome-crown-spikes")',
      'real Baron Crown', 60000);
    const row = {quality, stages: []};report.rows.push(row);
    for (const stage of ['tell', 'ram']) {
      const seen=await context.evaluate(`window.__baronNitro.advance(${JSON.stringify(stage)})`);
      seen.capture=await context.screenshot(`${quality}-baron-nitro-${stage}`);row.stages.push(seen);
      if(!seen.spikesVisible||seen.smokeVisible)throw Error(`${quality} ${stage} Crown or exhaust state wrong: `+
        JSON.stringify({spikes:seen.spikesVisible,smoke:seen.smokeVisible,color:seen.smokeColor,
          scale:seen.spikesScale,windowSec:seen.windowSec}));
    }
    await context.evaluate('window.__qaApp.start()');
    await context.waitFor(`window.__qaApp.running&&window.__qaApp.visualReady&&
      ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)`,
    `${quality} moving Nitro warmup`, 60000);
    await new Promise(done=>setTimeout(done,1200));
    await context.evaluate(`(() => {const button=[...document.querySelectorAll('button')]
      .find(node=>node.textContent==='Measure frame pacing');
      if(!button)throw Error('Existing frame measurement control missing');button.click();})()`);
    try {
      await context.waitFor(`document.querySelector('#performance-results')?.textContent.includes('"frames": 120')`,
        `${quality} native moving Nitro sample`, 35000);
    } catch (error) {
      const state=await context.evaluate(`(() => {const app=window.__qaApp;
        return {status:app.duel.state.status,stage:app.duel.state.opponents[0]?.blackiron?.stage,
          running:app.running,warmup:document.querySelector('#view3d')?.dataset.warmupStatus,
          button:[...document.querySelectorAll('button')].find(node=>node.textContent.includes('frame pacing'))?.textContent,
          summary:[...document.querySelectorAll('summary')].map(node=>node.textContent).find(text=>text.includes('Sample')),
          result:document.querySelector('#performance-results')?.textContent?.slice(-600)};})()`);
      throw Error(`${error.message}: ${JSON.stringify(state)}`);
    }
    row.pacing=await context.evaluate(`(() => {const app=window.__qaApp;app.stop();
      if(JSON.stringify(app.profile)!==window.__baronNitro.profile)throw Error('Nitro pacing changed memory career');
      return JSON.parse(document.querySelector('#performance-results').textContent).at(-1);})()`);
    if(row.pacing.frames!==120||row.pacing.quality!==(quality==='high'?'High':'Performance')||
      !Number.isFinite(row.pacing.p95)||row.pacing.p95<=0)
      throw Error(`${quality} invalid moving Nitro sample`);
    row.pacing.capture=await context.screenshot(`${quality}-baron-nitro-moving`);
    const window=await context.evaluate('window.__baronNitro.advance("window")');
    window.capture=await context.screenshot(`${quality}-baron-nitro-window`);row.stages.push(window);
    if(window.spikesVisible||!window.smokeVisible||window.smokeColor!==0x242424||
      !window.callout?.includes("HE'S OUT OF NITRO"))throw Error(`${quality} Nitro spent presentation missing`);
    await context.evaluate(`(() => {const d=window.__qaApp.duel,a=d.state.opponents[0];
      for(let i=0;i<360&&a.arenaNitroSpentSec>0;i++)d.step(1/120);
      if(a.arenaNitroSpentSec>0)throw Error('Nitro recovery exceeded 2.5 seconds');})()`);
    const cooled=await context.evaluate('window.__baronNitro.paint()');
    cooled.capture=await context.screenshot(`${quality}-baron-nitro-cooled`);row.stages.push(cooled);
    if(cooled.smokeVisible)throw Error(`${quality} Nitro exhaust stayed on after recovery`);
  }
  await writeFile(join(context.outputDir,'blackiron-nitro.json'),JSON.stringify(report,null,2)+'\n');
}

async function runNitroAudio(context) {
  await menu(context, 'high');
  await context.evaluate('if(!window.__qaApp.visitWasteland())throw Error("Baron audio yard denied")');
  await context.waitFor('window.__qaApp.visualReady&&document.querySelector("#renderer-loading")?.hidden',
    'Baron audio yard assets', 60000);
  await context.evaluate('window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()', 'Baron audio yard home', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
    const territory=document.querySelector('button[data-action="yard-territory"]');
    if(!territory||territory.disabled)throw Error('Baron audio territory route missing');territory.click();
    const fight=document.querySelector('button[data-warlord="blackiron"]');
    if(!fight||fight.disabled)throw Error('Baron audio fight control missing');fight.click();
    if(app.duel.state.status!=='warlord_intro'||!app.beginWarlordFight())throw Error('Baron audio fight entry failed');
    app.stop();for(let i=0;i<361;i++)app.duel.step(1/120);
    const d=app.duel,s=d.state,a=s.opponents[0];
    if(s.status!=='racing'||a?.warlordId!=='blackiron'||!a.blackiron)throw Error('Native Baron audio fight missing');
    s.arena.warlordPhase=2;
    Object.assign(s,{s:100,prevS:100,lateral:-27.5,prevLateral:-27.5,speedMph:0,headingError:0,
      armor:10000,maxArmor:10000});
    Object.assign(a,{s:100,prevS:100,lateral:2.5,prevLateral:2.5,speedMph:0,headingError:0});
    Object.assign(a.blackiron,{index:4,move:null,started:false,nextSec:s.stageTimeSec,pairSecond:false});
    d.setInput({throttle:1,brake:1,steer:0,boost:false});
    window.__baronAudioProfile=JSON.stringify(app.profile);
  })()`);
  await context.evaluate(`(async()=>{
    const app=window.__qaApp,audio=app.audio;
    audio.unlock();audio.setMuted(false);audio.setPaused(false);
    await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
    const ctx=audio.context;
    if(ctx?.state!=='running'||ctx.sampleRate<44100)throw Error('Native-rate Baron audio required');
    const silent=ctx.createGain();silent.gain.value=0;silent.connect(ctx.destination);
    const r=window.__baronAudio={sampleRate:ctx.sampleRate,startedAt:ctx.currentTime,
      tracks:{},sources:[],events:[],cues:[],silent,spent:false};
    for(const [name,source] of [['mix',audio.output],['effects',audio.buses.impacts],['engine',audio.buses.engine]]){
      const processor=ctx.createScriptProcessor(2048,2,2),track={chunks:[],firstPlayback:null};
      source.connect(processor);processor.connect(silent);r.tracks[name]=track;r.sources.push({source,processor});
      processor.onaudioprocess=event=>{
        if(track.firstPlayback===null)track.firstPlayback=event.playbackTime;
        const left=event.inputBuffer.getChannelData(0),right=event.inputBuffer.getChannelData(1);
        const pcm=new Int16Array(left.length*2);
        for(let i=0;i<left.length;i++){
          pcm[i*2]=Math.round(Math.max(-1,Math.min(1,left[i]))*32767);
          pcm[i*2+1]=Math.round(Math.max(-1,Math.min(1,right[i]))*32767);
        }track.chunks.push(pcm);
      };
    }
    r.originalPlayCue=audio._playCue;
    audio._playCue=function(id,options){const voice=r.originalPlayCue.call(this,id,options);
      if(voice)r.cues.push({id,audioSec:ctx.currentTime-r.startedAt,simSec:app.duel.state.stageTimeSec});
      return voice;};
    r.unsubscribe=app.duel.onChange((state,event)=>{
      const kind=event.arenaTell?.cue==='warlord.nitroTell'?'tell':
        event.arsenalCue==='weapon.nitro.start'?'start':
        event.arsenalCue==='warlord.nitroSpent'?'spent':null;
      if(!kind)return;if(kind==='spent')r.spent=true;
      r.events.push({kind,audioSec:ctx.currentTime-r.startedAt,simSec:state.stageTimeSec,
        cue:event.arenaTell?.cue||event.arsenalCue,callout:state.callout});
    });
    app.start();
  })()`);
  try {
    await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__baronAudio;
      return r.spent&&a.duel.state.opponents[0].arenaNitroSpentSec===0&&
        a.audio.context.currentTime-r.startedAt>=7;})()`, 'real-time Baron tell, ram and spent sound', 25000);
  } finally {
    await context.evaluate(`(()=>{const app=window.__qaApp,r=window.__baronAudio;
      app.stop();r.unsubscribe();app.audio._playCue=r.originalPlayCue;
      for(const {source,processor} of r.sources){source.disconnect(processor);processor.disconnect();processor.onaudioprocess=null;}
      r.silent.disconnect();app.audio.setPaused(true);})()`);
  }
  const result=await context.evaluate(`(()=>{
    const app=window.__qaApp,r=window.__baronAudio,tracks={};
    if(JSON.stringify(app.profile)!==window.__baronAudioProfile)throw Error('Audio review changed the memory career');
    for(const [name,track] of Object.entries(r.tracks)){
      const pcm=new Int16Array(track.chunks.reduce((n,chunk)=>n+chunk.length,0));
      let at=0;for(const chunk of track.chunks){pcm.set(chunk,at);at+=chunk.length;}
      const bytes=new Uint8Array(pcm.buffer);let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      let peak=0,energy=0;for(const sample of pcm){const value=sample/32768;
        peak=Math.max(peak,Math.abs(value));energy+=value*value;}
      tracks[name]={pcmBase64:btoa(binary),frames:pcm.length/2,
        audioStartSec:track.firstPlayback-r.startedAt,peak,rms:Math.sqrt(energy/pcm.length)};
    }
    return {sampleRate:r.sampleRate,channels:2,tracks,events:r.events,cues:r.cues,
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
        window.name.startsWith('__duel_qa_tab_v2:'),profileUnchanged:true};
  })()`);
  if(!result.memoryOnly||!['tell','start','spent'].every(kind=>result.events.some(event=>event.kind===kind))||
    !['warlord.nitroTell','warlord.nitroSpent'].every(id=>result.cues.some(cue=>cue.id===id)))
    throw Error('Actual Baron Nitro audio event or cue missing');
  for(const [name,track] of Object.entries(result.tracks)){
    if(!(track.frames>result.sampleRate*6&&track.rms>.00001&&track.peak<1))
      throw Error('Silent, clipped or short native Baron '+name+' recording');
    const bytes=wavFromPcm(Buffer.from(track.pcmBase64,'base64'),result.sampleRate,result.channels);
    track.file='blackiron-'+name+'.wav';await writeFile(join(context.outputDir,track.file),bytes);
    if(name==='mix'){
      const mp3=ffmpeg(['-i','pipe:0','-codec:a','libmp3lame','-b:a','128k','-f','mp3','pipe:1'],{input:bytes});
      result.listeningFile='blackiron-mix.mp3';await writeFile(join(context.outputDir,result.listeningFile),mp3);
    }
    delete track.pcmBase64;
  }
  result.limits=['Native PCM and cue timing establish an actual mix; listening approval is still Claude\'s.',
    'The player held throttle and brake for a loud engine bed; this is not a full race balance verdict.'];
  await writeFile(join(context.outputDir,'blackiron-audio.json'),JSON.stringify(result,null,2)+'\n');
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  if (process.env.BLACKIRON_NITRO_AUDIO_REVIEW === '1') return runNitroAudio(context);
  if (process.env.BLACKIRON_NITRO_REVIEW === '1') return runNitroPresentation(context);
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
