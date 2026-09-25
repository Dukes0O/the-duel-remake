// Private, memory-only visual check. Both quality modes use the same race pose.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  `${quality} isolated armor-kit menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
    `${quality} car model ready`, 60_000);

  const initial = await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      kits: {...app.profile.wasteland.kits,
        falcone_f42: {owned: ['scrapper'], equipped: 'scrapper'}}}};
    app._saveProfile();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, seed: 1989})) throw Error('Combat field did not start');
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, traffic: [], armor: state.maxArmor});
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 480 + index * 9, prevS: 480 + index * 9,
      lateral: index === 1 ? -4 : 4, prevLateral: index === 1 ? -4 : 4,
      speedMph: 0, armor: actor.maxArmor,
      combatArmorKit: index === 0 ? 'scrapper' :
        index === 1 ? 'raider' : 'warlord',
    }));
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const point = app.duel.course.groundAt(state.s, state.lateral);
    app.inspectionCamera = {position: [point.x + 16, point.y + 9, point.z + 18],
      target: [point.x, point.y + 2, point.z]};
    app.onFrame?.(state);
    document.querySelectorAll('details').forEach(panel => {
      const title = panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') ||
          title.startsWith('Performance samples')) panel.hidden = true;
    });
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const frame = window.__render.renderFrame();
    const car = window.__render.scene.getObjectByName('armor-kit-0-bull-bar');
    if (!car?.visible || !car.parent?.parent || state.opponents.length !== 3)
      throw Error('Four-car socket kits did not draw');
    return {drawCalls: frame.drawCalls, armor: state.armor,
      memoryOnly: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (!initial.memoryOnly) throw Error('QA saves were not isolated');
  await context.waitFor(`document.querySelector('#view3d')?.dataset.combatEffectsStatus === 'ready' &&
    document.querySelector('#view3d canvas')?.style.visibility !== 'hidden' &&
    !!window.__render.scene.getObjectByName('authored-kit')`,
  `${quality} effects, canvas and authored kit ready`, 60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp, render=window.__render;
    app.stop();render.renderFrame();
    const front=render.scene.getObjectByName('armor-kit-0-front');
    const car=front?.parent?.parent;
    if(!car)throw Error('Player car not mounted for review');
    car.updateMatrixWorld(true);
    const p=car.getWorldPosition(car.position.clone());
    const camera=car.localToWorld(car.position.clone().set(7,4,-9));
    const target=car.localToWorld(car.position.clone().set(0,1,0));
    app.inspectionCamera={position:camera.toArray(),target:target.toArray()};
    render.renderFrame();
  })()`);
  await context.screenshot(`armor-kit-intact-${quality}`);

  // The four-car view above checks the pool; isolate the player for matched
  // art review without changing the production model or camera renderer.
  await context.evaluate(`(() => {
    const app=window.__qaApp, state=app.duel.state;
    state.combatArmorKit='warlord';
    state.opponents.forEach(actor=>{actor.s=state.s-1200;actor.prevS=actor.s;});
    document.querySelector('#race-hud').style.display='none';
    document.querySelector('#modal-layer').style.display='none';
    document.querySelectorAll('.combat-opponent-marker').forEach(node=>node.style.display='none');
    window.__render.renderFrame();
  })()`);
  await context.screenshot(`armor-kit-hero-${quality}`);

  await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    state.stageTimeSec += .2;
    state.armor = state.maxArmor * .08;
    state.opponents[0].armor = state.opponents[0].maxArmor * .25;
    state.opponents[1].armor = state.opponents[1].maxArmor * .08;
    state.opponents[2].armor = state.opponents[2].maxArmor * .42;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const scene = window.__render.scene;
    if (scene.getObjectByName('armor-kit-0-plate-0-0')?.visible ||
        !scene.getObjectByName('combat-vfx-damage-0-fire')?.visible ||
        !scene.getObjectByName('combat-vfx-damage-1-smoke')?.visible)
      throw Error('Damaged plates or low-armor effects did not update');
  })()`);
  await context.screenshot(`armor-kit-critical-${quality}`);

  await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    state.combatWrecking = true;
    state.combatWreckSite = {s: state.s, lateral: state.lateral};
    state.armor = 0;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const scene = window.__render.scene;
    if (scene.getObjectByName('combat-vfx-damage-0-fire')?.visible ||
        !scene.getObjectByName('combat-vfx-wreck-0-fire')?.visible)
      throw Error('Wreck did not replace critical-health flame');
  })()`);
  await context.screenshot(`armor-kit-wreck-${quality}`);
  console.log(`${quality}: ${initial.drawCalls} intact draw calls; plates, critical smoke/fire and wreck checked`);
}

export async function run(context) {
  if(process.env.GFX_KIT_FRAME_COST==='1')return frameCostRun(context);
  for (const quality of ['high', 'performance']) await qualityPass(context, quality);
  if (process.env.GFX_KIT_FIT_MATRIX === '1') await fitMatrixPass(context);
}

async function frameCostRun(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor(`!!window.__qaApp && !!window.__render &&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
      !document.querySelector('#start-engine')?.disabled`,`${quality} private kit timing menu`,60000);
    await context.evaluate(`(() => {
      const select=document.querySelector('#graphics-quality');
      select.value=${JSON.stringify(quality)};
      select.dispatchEvent(new Event('change',{bubbles:true}));
      const app=window.__qaApp;
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,
        kits:{...app.profile.wasteland.kits,
          falcone_f42:{owned:['warlord'],equipped:'warlord'}}}};
      app._saveProfile();
      if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',
        opponentCount:3,seed:1989}))throw Error('Four-car kit cost field did not start');
      const state=app.duel.state;
      Object.assign(state,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
        lateral:0,prevLateral:0,speedMph:0,traffic:[],armor:state.maxArmor,
        combatArmorKit:'warlord',combatWrecking:false});
      state.opponents.forEach((actor,index)=>Object.assign(actor,{s:480+index*9,
        prevS:480+index*9,lateral:index===1?-4:4,
        prevLateral:index===1?-4:4,speedMph:0,armor:actor.maxArmor,
        combatArmorKit:index===0?'scrapper':index===1?'raider':'warlord'}));
      state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;
      const point=app.duel.course.groundAt(state.s,state.lateral);
      app.inspectionCamera={position:[point.x+16,point.y+9,point.z+18],
        target:[point.x,point.y+2,point.z]};
      app.onFrame?.(state);
    })()`);
    await context.waitFor(`(() => {
      const render=window.__render,host=document.querySelector('#view3d');
      render.renderFrame();
      let count=0;render.scene.traverse(node=>{if(node.name==='authored-kit'&&node.visible)count++;});
      return count>=4&&host?.dataset.combatEffectsStatus==='ready'&&
        host?.dataset.vehicleAsset==='ready'&&
        render.renderer.domElement?.style.visibility!=='hidden';
    })()`,`${quality} four authored kits ready`,60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp,render=window.__render;
      app.stop();
      const kits=[];render.scene.traverse(node=>{if(node.name==='authored-kit'&&node.visible)kits.push(node);});
      if(kits.length<4)throw Error('Four loaded authored kit roots required');
      const original=render.renderer.render.bind(render.renderer);
      window.__kitCost={raf:window.requestAnimationFrame.bind(window),kits,branch:'A',
        originalRender:original};
      window.requestAnimationFrame=()=>0;
      render.renderer.render=(scene,camera)=>{
        if(scene!==render.scene)return original(scene,camera);
        const visibility=kits.map(node=>node.visible);
        kits.forEach((node,index)=>node.visible=window.__kitCost.branch==='B'?
          visibility[index]:false);
        try{return original(scene,camera);}
        finally{kits.forEach((node,index)=>node.visible=visibility[index]);}
      };
    })()`);
    const passes=[];
    for(const branch of ['A1','B','A2']){
      const pass=await context.evaluate(`(async () => {
        const q=window.__kitCost,render=window.__render;
        q.branch=${JSON.stringify(branch==='B'?'B':'A')};
        const raf=[],cpu=[],draw=[],triangles=[],mirror=[];
        let last=0;
        for(let i=0;i<630;i++){
          const now=await new Promise(q.raf),start=performance.now();
          const metrics=render.renderFrame(),elapsed=performance.now()-start;
          if(i>=30){raf.push(now-last);cpu.push(elapsed);
            draw.push(metrics.drawCalls);triangles.push(metrics.triangles);
            mirror.push(document.querySelector('[data-rear-view-refreshed]')?.dataset.rearViewRefreshed==='true');}
          last=now;
        }
        const summary=values=>{const sorted=[...values].sort((a,b)=>a-b),at=p=>sorted[Math.ceil(sorted.length*p)-1]??null;
          return{samples:sorted.length,p50:at(.5),p95:at(.95),max:at(1),over33:sorted.filter(v=>v>33).length};};
        return{branch:${JSON.stringify(branch)},raf:summary(raf),renderCpu:summary(cpu),
          renderCpuByMirror:{refreshed:summary(cpu.filter((_,i)=>mirror[i])),
            reused:summary(cpu.filter((_,i)=>!mirror[i]))},
          drawCalls:summary(draw),triangles:summary(triangles),
          rafSamplesMs:raf,renderCpuSamplesMs:cpu,drawCallSamples:draw,
          triangleSamples:triangles,mirrorRefreshSamples:mirror};
      })()`);
      if(pass.raf.samples!==600||pass.renderCpu.samples!==600)
        throw Error(`${quality} ${branch}: incomplete kit frame sample`);
      passes.push(pass);
    }
    const repair=await context.evaluate(`(async () => {
      const q=window.__kitCost,render=window.__render,app=window.__qaApp;
      q.branch='B';
      const state=app.duel.state,player=render.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
      if(!player?.userData.damageMeshes?.length)throw Error('Player damage geometry unavailable');
      const versions=()=>player.userData.damageMeshes.map(item=>item.mesh.geometry.attributes.position.version);
      state.armor=state.maxArmor*.12;render.renderFrame();const before=versions();
      const cpu=[];
      for(let i=0;i<120;i++){
        await new Promise(q.raf);
        state.armor=state.maxArmor*(i%2?.135:.12);
        const start=performance.now();render.renderFrame();cpu.push(performance.now()-start);
      }
      const after=versions();
      return{samples:cpu.length,cpuSamplesMs:cpu,geometryBefore:before,
        geometryAfter:after,unchanged:before.every((value,index)=>value===after[index])};
    })()`);
    await context.evaluate(`(() => {
      const q=window.__kitCost,render=window.__render;
      render.renderer.render=q.originalRender;
      window.requestAnimationFrame=q.raf;
      delete window.__kitCost;
    })()`);
    if(!repair.unchanged||repair.samples!==120)
      throw Error(`${quality}: repair-only geometry changed or sample incomplete`);
    const [a1,b,a2]=passes;
    const ratio=(metric)=>({A1:b.renderCpu[metric]/a1.renderCpu[metric],
      A2:b.renderCpu[metric]/a2.renderCpu[metric]});
    reports.push({quality,passes,repair,cpuP50Ratio:ratio('p50'),
      cpuP95Ratio:ratio('p95'),scope:'600 ordered RAF/full production renderFrame CPU samples per A/B/A branch after 30 warm frames; same stopped four-car field/camera/quality. A hides authored kits in each production world-scene submission, including mirror views; B draws them. The same visibility snapshot and wrapper run in both. CPU submission is not GPU time.'});
    console.log(`${quality} kit A/B/A CPU p95 ratios ${JSON.stringify(reports.at(-1).cpuP95Ratio)}`);
  }
  await writeFile(join(context.outputDir,'armor-kit-frame-cost.json'),
    JSON.stringify({reports},null,2)+'\n');
}

// Opt-in visual fit audit. It changes only a stopped memory-only QA race and
// keeps the default eight scene/action captures unchanged.
async function fitMatrixPass(context) {
  const cars=['falcone_f42','stuttgart_959s','falcone_heritage','aurora_gt',
    'dusthawk_rally','banshee_muscle','viper_proto','titan_monster',
    'koenigsegg_jesko'];
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,
  'memory-only all-car fit menu',60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.profile={...app.profile,unlockedCars:${JSON.stringify(cars)}};
    app._saveProfile();
    if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',
      opponentCount:3,seed:1989}))throw Error('Fit field did not start');
    const state=app.duel.state;
    Object.assign(state,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
      lateral:0,prevLateral:0,speedMph:0,traffic:[],armor:state.maxArmor});
    state.opponents.forEach(actor=>{actor.s=-700;actor.prevS=-700;actor.speedMph=0;});
    state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;
    window.__kitMatrixBaseline=JSON.stringify({credits:app.profile.credits,
      history:app.profile.history,records:app.profile.records,
      scrap:app.profile.wasteland?.scrap});
    app.onFrame?.(state);
  })()`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.combatEffectsStatus==='ready' &&
    document.querySelector('#view3d canvas')?.style.visibility!=='hidden'`,
  'matrix canvas ready',60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.stop();
    document.querySelector('#race-hud').style.display='none';
    document.querySelector('#modal-layer').style.display='none';
    document.querySelectorAll('.combat-opponent-marker').forEach(node=>node.style.display='none');
    document.querySelectorAll('details').forEach(panel=>panel.hidden=true);
  })()`);
  let captures=0;
  for(const quality of ['high','performance']) {
    await context.evaluate(`(() => {const select=document.querySelector('#graphics-quality');
      select.value=${JSON.stringify(quality)};
      select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    for(const carKey of cars) {
      await context.evaluate(`(() => {
        const app=window.__qaApp,state=app.duel.state;
        state.car=${JSON.stringify(carKey)};state.armor=state.maxArmor;
        state.combatWrecking=false;state.combatArmorKit='warlord';
        window.__kitReadyFrames=0;
        window.__render.renderFrame();
      })()`);
      await context.waitFor(`(() => {
        const render=window.__render,host=document.querySelector('#view3d');
        const frame=render.renderFrame(),canvas=render.renderer.domElement;
        const car=render.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
        const kit=car?.getObjectByName('authored-kit');
        // host.dataset.vehicleKey may name the rival because frame() also
        // prepares opponent assets. The mounted player root is authoritative.
        const ready=host?.dataset.vehicleAsset==='ready' &&
          car?.userData.vehicleKey===${JSON.stringify(carKey)} &&
          kit?.visible && canvas?.style.visibility!=='hidden' &&
          canvas.width>500 && canvas.height>300 &&
          canvas.clientWidth>500 && canvas.clientHeight>300 &&
          Math.abs(canvas.width/canvas.height-canvas.clientWidth/canvas.clientHeight)<.35 &&
          frame.drawCalls>100;
        window.__kitReadyFrames=ready?(window.__kitReadyFrames||0)+1:0;
        return window.__kitReadyFrames>=3;
      })()`,`${carKey} authored fit in ${quality}`,60_000);
      const tiers=quality==='high' ? ['scrapper','raider','warlord'] : ['warlord'];
      for(const tier of tiers) {
        await context.evaluate(`(async () => {
          const app=window.__qaApp,render=window.__render,state=app.duel.state;
          state.combatArmorKit=${JSON.stringify(tier)};
          const car=render.scene.getObjectByName('armor-kit-0-front')?.parent?.parent;
          if(car?.userData.vehicleKey!==${JSON.stringify(carKey)})
            throw Error('Fit capture changed cars');
          car.updateMatrixWorld(true);
          const size=car.userData.size;
          const camera=car.localToWorld(car.position.clone().set(
            size.width*2.9,size.height*2.2+1,-size.length*1.9));
          const target=car.localToWorld(car.position.clone().set(0,size.height*.5,0));
          app.inspectionCamera={position:camera.toArray(),target:target.toArray()};
          app.onFrame?.(state);
          await new Promise(resolve=>requestAnimationFrame(resolve));render.renderFrame();
          await new Promise(resolve=>requestAnimationFrame(resolve));render.renderFrame();
          const kit=car.getObjectByName('authored-kit');
          if(!kit?.visible) throw Error('Authored kit is hidden');
          const tierIndex={scrapper:1,raider:2,warlord:3}[state.combatArmorKit];
          for(const [name,minimum] of [['kit-scrapper',1],['kit-raider',2],['kit-warlord',3]]){
            const root=kit.getObjectByName(name),expected=tierIndex>=minimum;
            if(!root || root.visible!==expected)
              throw Error(name+' tier visibility differs from '+state.combatArmorKit);
            if(expected){
              let triangles=0;
              root.traverse(node=>{
                if(!node.isMesh || !node.visible) return;
                let ancestor=node.parent;
                while(ancestor && ancestor!==root){
                  if(!ancestor.visible)return;
                  ancestor=ancestor.parent;
                }
                triangles+=(node.geometry.index?.count ||
                  node.geometry.attributes.position?.count || 0)/3;
              });
              if(triangles<=0)throw Error(name+' has no visible authored triangles');
            }
          }
        })()`);
        await context.screenshot(`armor-kit-fit-${carKey.replaceAll('_','-')}-${tier}-${quality}`);
        captures++;
      }
    }
  }
  const unchanged=await context.evaluate(`(() => {const p=window.__qaApp.profile;
    return JSON.stringify({credits:p.credits,history:p.history,records:p.records,
      scrap:p.wasteland?.scrap})===window.__kitMatrixBaseline;})()`);
  if(!unchanged || captures!==36) throw Error(`Fit audit changed rewards or captured ${captures}/36 views`);
  console.log(`all-nine kit fit matrix: ${captures} tier/quality captures; no reward or record changes`);
}
