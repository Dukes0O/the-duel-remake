// Actual production App, menus, Duel and renderer; all storage is tab-local.
// Earned career balances and parked contact poses below are explicit QA fixtures.
const DT = 1 / 120;
async function ready(context, query = '') {
  await context.navigate('/tools/menu-check.html' + query);
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only Arsenal production page', 60_000);
  await context.evaluate(`document.querySelectorAll('details').forEach(panel => {
    const title = panel.querySelector('summary')?.textContent || '';
    if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples')) panel.hidden = true;
  })`);
}
async function career(context, label = 'disabled') {
  return context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.addPlayer('Arsenal Owner ' + ${JSON.stringify(label)}).ok) throw Error('Owner fixture creation failed');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      discoveredGate: true, xp: 3500, scrap: 3000}};
    if (!app._saveProfile()) throw Error('Synthetic earned career did not save');
    return app.player.id;
  })()`);
}
async function start(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 2, seed: 1989, cpuDifficulty: 'easy'})) throw Error('Arsenal race did not start');
    app.stop();
    const state = app.duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = state.combat.pickupTimer = Infinity;
    // Fixtures only reposition real cars; no simulation method is substituted.
    window.__arsenalPlace = (actor, s, lateral = 0, speedMph = 0) => Object.assign(actor, {
      s, prevS: s, lateral, prevLateral: lateral, speedMph,
      headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
      airHeight: 0, prevAirHeight: 0, combatShield: 0});
    window.__arsenalPlace(state, 504);
    state.opponents.forEach((actor, i) => window.__arsenalPlace(actor, 600 + i * 80));
    const at = app.duel.course.groundAt(500, 0);
    app.inspectionCamera = {position: [at.x + 12, at.y + 10, at.z + 15],
      target: [at.x, at.y + 1, at.z]};
    window.__arsenalPaint = () => {
      const before = JSON.stringify(state);
      app.onFrame?.(state); window.__render.renderFrame();
      if (JSON.stringify(state) !== before) throw Error('Production presentation mutated race state');
    };
    window.__arsenalPaint();
  })()`);
}
export async function run(context) {
  if (process.env.DUEL_SMOKE_POLISH === '1') return smokePolish(context);
  await ready(context);
  await career(context);
  const disabled = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.purchaseArsenalWeapon('oil').ok) throw Error('Dev-disabled Arsenal purchase succeeded');
    document.querySelector('#armory-open').click();
    if (document.querySelector('[data-arsenal-purchase]')) throw Error('Dev-disabled offers leaked into Armory');
    return [...document.querySelectorAll('[data-loadout-slot]')].map(select => select.value);
  })()`);
  if (disabled.join(',') !== 'ufo,bomb,crossbow,star') throw Error('Four starter slots changed');
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride', {
      width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
    await ready(context, '?flags=arsenal');
    await context.evaluate(`(() => {
      const select = document.querySelector('#graphics-quality');
      select.value = '${quality}'; select.dispatchEvent(new Event('change', {bubbles: true}));
      const app = window.__qaApp;
      if (!app.addPlayer('Rank One ' + ${JSON.stringify(quality)}).ok) throw Error('Rank fixture creation failed');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true, scrap: 3000}};
      app._saveProfile();
      if (app.purchaseArsenalWeapon('oil').ok) throw Error('Rank one bought rank-two Oil');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, xp: 400}};
      app._saveProfile();
      if (app.profile.wasteland.rank !== 2 || app.purchaseArsenalWeapon('smoke').ok)
        throw Error('Rank two bought rank-six Smoke');
      if (!app.addPlayer('Unseen ' + ${JSON.stringify(quality)}).ok) throw Error('Discovery fixture creation failed');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland, xp: 3500, scrap: 3000}};
      app._saveProfile();
      if (app.purchaseArsenalWeapon('oil').ok) throw Error('Undiscovered career bought Oil');
    })()`);
    const ownerId = await career(context, quality);
    await context.evaluate(`(() => {
      const app = window.__qaApp;
      if (app.profile.wasteland.rank !== 6) throw Error('Earned rank fixture was not normalized');
      document.querySelector('#armory-open').click();
      for (const id of ['oil', 'smoke']) {
        const button = document.querySelector('[data-arsenal-purchase="' + id + '"]');
        if (!button || !button.textContent.includes('400 SCRAP')) throw Error('Rank-six offer missing: ' + id);
        button.click();
        if (!app.profile.wasteland.weapons.unlocked.includes(id)) throw Error('Actual Armory purchase did not grant ' + id);
      }
      if (app.profile.wasteland.scrap !== 2200) throw Error('Actual purchases did not charge 400 scrap each');
      for (const [slot, id] of [[0, 'oil'], [1, 'smoke']]) {
        const select = document.querySelector('[data-loadout-slot="' + slot + '"]');
        select.value = id; select.dispatchEvent(new Event('change', {bubbles: true}));
      }
      if (app.profile.wasteland.loadout.slice(0, 2).join(',') !== 'oil,smoke') throw Error('Actual slot selection failed');
    })()`);
    await context.evaluate(`document.querySelector('.armory-loadout').scrollIntoView({block: 'start'})`);
    await context.screenshot('arsenal-armory-' + quality);
    await context.evaluate(`(() => {
      const app = window.__qaApp;
      document.querySelector('[data-action="armory-close"]').click();
      if (!app.addPlayer('Other ' + ${JSON.stringify(quality)}).ok) throw Error('Isolation fixture creation failed');
      if (app.profile.wasteland.weapons.unlocked.some(id => ['oil', 'smoke'].includes(id)))
        throw Error('Purchased weapons crossed named owners');
      if (!app.selectPlayer(${JSON.stringify(ownerId)})) throw Error('Owner selection failed');
    })()`);
    await start(context);
    const oil = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      if (!duel.fireWeapon('oil') || duel.fireWeapon('oil')) throw Error('Oil launch or immediate recharge failed');
      duel.step(${DT});
      if (Math.abs(state.yawVelocity) > .001) throw Error('Oil ignored owner grace');
      window.__arsenalPlace(state, 520);
      window.__arsenalPlace(state.rival, 500, .1, 60);
      duel.step(${DT});
      if (Math.abs(state.rival.yawVelocity) < 1 || state.rival.speedMph > 55)
        throw Error('Actual Oil body contact did not spin and slow the target');
      window.__arsenalPaint();
      const holder = window.__render.scene.getObjectByName('arsenal-hazard-0');
      if (!holder?.visible || !holder.children[0]?.visible) throw Error('Oil sheen did not render');
      return {spin: state.rival.yawVelocity, speedMph: state.rival.speedMph,
        cooldown: state.combat.cooldowns.oil};
    })()`);
    await context.screenshot('arsenal-oil-contact-' + quality);
    // A new real race clears prior contacts. Shield is a declared contact fixture.
    await start(context);
    await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      if (!duel.fireWeapon('oil')) throw Error('Shield control Oil launch failed');
      window.__arsenalPlace(state, 520);
      window.__arsenalPlace(state.rival, 500, .1, 60);
      state.combat.rivalShield = 5;
      duel.step(${DT});
      if (Math.abs(state.rival.yawVelocity) > .001 || state.rival.speedMph < 55)
        throw Error('Actual shield did not counter Oil');
    })()`);
    await start(context);
    const smoke = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      window.__arsenalPlace(state, 500); window.__arsenalPlace(state.rival, 530);
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId == null)
        throw Error('Clear sightline did not acquire the real rival');
      state.combat.projectiles = []; state.combat.cooldowns.crossbow = 0;
      if (!duel.fireWeapon('smoke') || duel.fireWeapon('smoke')) throw Error('Smoke launch or immediate recharge failed');
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId != null)
        throw Error('Smoke did not remove guided targeting while retaining straight fire');
      state.combat.projectiles = [];
      window.__arsenalPaint();
      const holder = window.__render.scene.getObjectByName('arsenal-hazard-0');
      if (!holder?.visible || !holder.children[1]?.visible) throw Error('Real Smoke plume did not render');
      return {cooldown: state.combat.cooldowns.smoke, straightShot: true};
    })()`);
    await context.screenshot('arsenal-smoke-occlusion-' + quality);
    await context.evaluate(`(async () => {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      window.__arsenalPaint();
      const actual = window.__qaApp.duel.state.weaponLoadout.join(',');
      const hud = [...document.querySelectorAll('[data-combat-slot]')]
        .map(button => button.dataset.combatWeapon).join(',');
      if (hud !== actual) throw Error('Painted HUD differs from real four-slot loadout');
    })()`);
    await context.screenshot('arsenal-smoke-hud-' + quality);
    await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      for (let i = 0; i < 620; i++) duel.step(${DT});
      window.__arsenalPlace(state, 500); window.__arsenalPlace(state.rival, 530);
      state.combat.cooldowns.crossbow = 0; state.combat.projectiles = [];
      if (!duel.fireWeapon('crossbow') || state.combat.projectiles.at(-1)?.targetId == null)
        throw Error('Guided targeting did not recover after actual Smoke expiry');
      window.__arsenalPaint();
      if (window.__render.scene.getObjectByName('arsenal-hazard-0')?.visible)
        throw Error('Expired Smoke remained visible');
    })()`);
    console.log('Arsenal ' + quality + ': actual purchases, owner isolation, Oil contact/shield/grace, Smoke occlusion/recovery and render purity passed. ' + JSON.stringify({oil, smoke}));
  }
}

// POLISH-SMOKE: matched native deployment / silhouette controls. This optional
// path leaves the established Arsenal gameplay scenario and its assertions intact.
async function smokePolish(context) {
  const rows = [], frameRows = [];
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await ready(context, '?flags=arsenal,crew-gear');
    await context.evaluate(`(() => {
      const select=document.querySelector('#graphics-quality');
      select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    for (const kind of ['screen', 'wren']) {
      await context.evaluate(`(() => {
        const app=window.__qaApp,duel=app.duel;
        app.stop();
        duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,
          discoveredGate:true,crewId:${JSON.stringify(kind === 'wren' ? 'wren' : 'rook')},
          arsenalRank:30,opponentCount:1});
        const state=duel.state;
        Object.assign(state,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
          lateral:0,prevLateral:0,speedMph:0,headingError:0,traffic:[],invulnerableSec:0});
        state.combat.aiTimer=state.combat.pickupTimer=Infinity;
        state.opponents.forEach((actor,i)=>Object.assign(actor,{s:850+i*40,prevS:850+i*40,
          lateral:0,prevLateral:0,speedMph:0,headingError:0,airHeight:0,prevAirHeight:0}));
        window.__smokeDetach?.();window.__smokeHazard=null;
        window.__smokeDetach=duel.onChange((_state,event)=>{
          if(event.arsenalCue==='weapon.smoke.deploy')window.__smokeHazard=event.hazard;
        });
        if(${JSON.stringify(kind)}==='screen') {
          state.weaponLoadout=['smoke','crossbow','bomb','star'];
          if(!duel.fireWeapon('smoke'))throw Error('Native Screen did not deploy');
        } else {
          duel.setInput({interact:true});
          for(let i=0;i<50&&!state.onFoot;i++)duel.step(1/120);
          duel.setInput({interact:false});duel.selectFootGear(3);
          duel.setFighterInput({fire:true});duel.step(1/120);duel.setFighterInput({fire:false});
          for(let i=0;i<300&&!window.__smokeHazard;i++)duel.step(1/120);
          if(!window.__smokeHazard)throw Error('Native Wren grenade did not make smoke');
          state.onFoot=false;state.fighter=null;
        }
        const cloud=window.__smokeHazard;
        if(!cloud||cloud.radius!==(${JSON.stringify(kind)}==='screen'?6:2.5))throw Error('Wrong native cloud radius');
        const nearest=duel.course.nearest(cloud.x,cloud.z),ground=duel.course.groundAt(nearest.s,nearest.lateral);
        Object.assign(state,{s:nearest.s,prevS:nearest.s,lateral:nearest.lateral,prevLateral:nearest.lateral,
          speedMph:0,headingError:0,airHeight:0,prevAirHeight:0,impactTimer:0});
        window.__smokePose={ground,heading:ground.heading};
        window.__smokePaint=()=>{
          const before=JSON.stringify(state),hazardBefore=JSON.stringify({...cloud,owner:null});
          const camera=window.__render.camera;
          if(app.inspectionCamera){camera.position.fromArray(app.inspectionCamera.position);
            camera.lookAt(...app.inspectionCamera.target);camera.updateMatrixWorld(true);}
          app.onFrame?.(state,0);window.__render.renderFrame({presentationSeconds:20});
          document.querySelectorAll('details').forEach(panel=>{
            const title=panel.querySelector('summary')?.textContent||'';
            if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.style.display='none';
          });
          if(JSON.stringify(state)!==before||JSON.stringify({...cloud,owner:null})!==hazardBefore)
            throw Error('Smoke rendering changed gameplay');
        };
      })()`);
      for (const distance of [10,25]) {
        await context.evaluate(`(() => {
          const app=window.__qaApp,{ground,heading}=window.__smokePose;
          app.inspectionCamera={position:[ground.x-Math.sin(heading)*${distance},ground.y+3.2,
            ground.z-Math.cos(heading)*${distance}],target:[ground.x,ground.y+1.5,ground.z]};
          window.__smokePaint();
        })()`);
        await context.waitFor(`(() => {window.__smokePaint();return window.__qaApp.visualReady &&
          window.__render.renderer.domElement.style.visibility!=='hidden';})()`, 'smoke capture readiness',60000);
        if (process.env.DUEL_SMOKE_FRAMES === '1') {
          if (distance === 25) {
            const frames = await context.evaluate(`(async () => {
              const percentile=(values,fraction)=>{
                const ordered=[...values].sort((a,b)=>a-b);
                return Number(ordered[Math.ceil(ordered.length*fraction)-1].toFixed(3));
              };
              const result=await new Promise(resolve=>{
                let warm=60,previous=null,frame=0;const intervals=[],work=[];
                const tick=now=>{
                  // The same native simulation and camera path run against
                  // each checkout. No renderer or material is substituted.
                  window.__qaApp.duel.step(1/240);
                  const {ground,heading}=window.__smokePose,angle=heading+Math.sin(frame++*.012)*.22;
                  window.__qaApp.inspectionCamera={position:[ground.x-Math.sin(angle)*25,
                    ground.y+3.2,ground.z-Math.cos(angle)*25],target:[ground.x,ground.y+1.5,ground.z]};
                  const start=performance.now();window.__smokePaint();
                  const cost=performance.now()-start;
                  if(warm>0){warm--;previous=now;requestAnimationFrame(tick);return;}
                  intervals.push(now-previous);work.push(cost);previous=now;
                  if(intervals.length<180){requestAnimationFrame(tick);return;}
                  resolve({frames:180,p50:percentile(intervals,.5),p95:percentile(intervals,.95),
                    max:percentile(intervals,1),workP50:percentile(work,.5),workP95:percentile(work,.95),
                    over33:intervals.filter(ms=>ms>33).length});
                };requestAnimationFrame(tick);
              });
              return {...result,activeClouds:Number(window.__render.scene.getObjectByName('arsenal-hazard-0')?.visible),
                statePure:true,source: 'Actual checkout source; native simulation and moving camera'};
            })()`);
            frameRows.push({quality,kind,...frames});
            console.log('Smoke frames '+JSON.stringify(frameRows.at(-1)));
          }
          continue;
        }
        const measured=await context.evaluate(`(() => {
          const app=window.__qaApp,view=window.__render,scene=view.scene,renderer=view.renderer;
          const {ground}=window.__smokePose;
          const models=scene.children.filter(node=>node.userData.vehicleKey);
          models.sort((a,b)=>Math.hypot(a.position.x-ground.x,a.position.z-ground.z)-Math.hypot(b.position.x-ground.x,b.position.z-ground.z));
          const car=models[0],cloud=scene.getObjectByName('arsenal-hazard-0');
          if(!car||!cloud?.visible)throw Error('Native car/cloud render controls missing');
          let carRadius=0;const vertex=car.position.clone();car.updateMatrixWorld(true);
          car.traverse(node=>{if(!node.isMesh||!node.visible)return;const positions=node.geometry?.attributes.position;
            if(!positions)return;for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(node.matrixWorld);
              carRadius=Math.max(carRadius,Math.hypot(vertex.x-ground.x,vertex.z-ground.z));}});
          const gl=renderer.getContext(),width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;
          const pixels=()=>{const data=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
          const original=renderer.render;
          function capture(showCar,showSmoke) {
            renderer.render=function(current,camera){
              if(current!==scene)return original.call(this,current,camera);
              const cv=car.visible,sv=cloud.visible;
              car.visible=showCar&&cv;cloud.visible=showSmoke&&sv;
              try{return original.call(this,current,camera);}finally{car.visible=cv;cloud.visible=sv;}
            };
            try{window.__smokePaint();window.__smokePaint();return pixels();}finally{renderer.render=original;}
          }
          const clearCar=capture(true,false),clearPng=renderer.domElement.toDataURL('image/png');
          const clearEmpty=capture(false,false);
          const smokyCar=capture(true,true),smokyPng=renderer.domElement.toDataURL('image/png');
          const smokyRepeat=capture(true,true);let unstablePixels=0;
          for(let i=0;i<smokyCar.length;i+=4)if([0,1,2].some(c=>smokyCar[i+c]!==smokyRepeat[i+c]))unstablePixels++;
          const smokyEmpty=capture(false,true),emptyPng=renderer.domElement.toDataURL('image/png');
          // A car-only white silhouette excludes cast shadows and the ground
          // from the denominator. It is a temporary render override only.
          const rootVisibility=scene.children.map(node=>[node,node.visible]);
          const background=scene.background,fog=scene.fog,override=scene.overrideMaterial;
          let donor=null;car.traverse(node=>{if(!donor&&node.isMesh)donor=Array.isArray(node.material)?node.material[0]:node.material;});
          const maskMaterial=donor.clone();maskMaterial.map=null;maskMaterial.alphaMap=null;
          maskMaterial.transparent=false;maskMaterial.opacity=1;maskMaterial.color.set(0xffffff);
          if(maskMaterial.emissive)maskMaterial.emissive.set(0xffffff);
          scene.overrideMaterial=maskMaterial;scene.background=maskMaterial.color.clone().set(0);scene.fog=null;
          for(const [node]of rootVisibility)node.visible=node===car;
          let mask;
          try{original.call(renderer,scene,view.camera);mask=pixels();}
          finally{for(const [node,visible]of rootVisibility)node.visible=visible;
            scene.background=background;scene.fog=fog;scene.overrideMaterial=override;maskMaterial.dispose();}
          let silhouette=0,visible=0,clearPixels=0;
          for(let i=0;i<mask.length;i+=4) {
            if(mask[i]<64||mask[i+1]<64||mask[i+2]<64)continue;
            silhouette++;
            const clear=Math.max(...[0,1,2].map(c=>Math.abs(clearCar[i+c]-clearEmpty[i+c])));
            const smoky=Math.max(...[0,1,2].map(c=>Math.abs(smokyCar[i+c]-smokyEmpty[i+c])));
            if(clear>=12)clearPixels++;
            if(smoky>=12)visible++;
          }
          if(silhouette<100||clearPixels<silhouette*.5)throw Error('Invalid car-silhouette control: '+JSON.stringify({silhouette,clearPixels}));
          window.__smokePaint();
          return {clearPng,smokyPng,emptyPng,silhouette,clearPixels,visible,visibleFraction:visible/silhouette,unstablePixels,
            radius:window.__smokeHazard.radius,carRadius,fullyInside:carRadius<=window.__smokeHazard.radius,drawCalls:renderer.info.render.calls,
            camera: view.camera.position.toArray(),statePure:true};
        })()`);
        const {clearPng,smokyPng,emptyPng,...metrics}=measured;
        const {writeFile}=await import('node:fs/promises');
        const {join}=await import('node:path');
        for(const [label,png]of [['clear',clearPng],['smoke',smokyPng],['empty',emptyPng]])
          await writeFile(join(context.outputDir,`control-${kind}-${distance}-${quality}-${label}.png`),Buffer.from(png.split(',')[1],'base64'));
        rows.push({quality,kind,distance,...metrics});
        console.log('Smoke concealment '+JSON.stringify(rows.at(-1)));
        await context.screenshot(`smoke-${kind}-${distance}-${quality}`);

      }
      if(process.env.DUEL_SMOKE_FRAMES === '1') continue;
      const inside=await context.evaluate(`(() => {
        const app=window.__qaApp,{ground,heading}=window.__smokePose;
        app.inspectionCamera={position:[ground.x,ground.y+2,ground.z],
          target:[ground.x+Math.sin(heading)*10,ground.y+2,ground.z+Math.cos(heading)*10]};
        window.__smokePaint();
        const haze=window.__render.scene.getObjectByName('smoke-camera-haze');
        if(!haze?.visible||haze.material.opacity<.9)throw Error('Inside camera lacks heavy haze');
        return {opacity:haze.material.opacity};
      })()`);
      console.log('Smoke inside '+JSON.stringify({quality,kind,...inside}));
      await context.screenshot(`smoke-${kind}-inside-${quality}`);
    }
  }
  const {writeFile}=await import('node:fs/promises');
  const {join}=await import('node:path');
  if(process.env.DUEL_SMOKE_FRAMES === '1') {
    await writeFile(join(context.outputDir,'smoke-frames.json'),JSON.stringify(frameRows,null,2)+'\n');
    return;
  }
  await writeFile(join(context.outputDir,'concealment.json'),JSON.stringify(rows,null,2)+'\n');
  if(rows.filter(row=>row.kind==='screen'&&row.fullyInside).length!==4)throw Error('Screen controls must fully contain the car');
  if(frameRows.length)await writeFile(join(context.outputDir,'smoke-frames.json'),JSON.stringify(frameRows,null,2)+'\n');
  const failed=rows.filter(row=>row.fullyInside&&row.visibleFraction>.1);
  if(failed.length)throw Error('More than 10% of the car remains visible: '+JSON.stringify(failed));
}
