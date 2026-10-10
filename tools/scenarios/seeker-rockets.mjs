// Private native App review: earned rank, three purchased weapons, memory-only saves.
const DT = 1 / 120;

async function start(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode: 'wasteland', seed: 202602,
      car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium',
      opponentCount: 1})) throw Error('Native wave-two race did not start');
    app.stop();
    const duel = app.duel, state = duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = state.combat.pickupTimer = Infinity;
    window.__waveTwoEvents = [];
    window.__waveTwoDetach?.();
    window.__waveTwoDetach = duel.onChange((_state, event) => {
      if (event.arsenalCue || event.weaponFired || event.powerupCollected)
        window.__waveTwoEvents.push(event);
    });
    window.__waveTwoPlace = (actor, s, lateral = 0) => Object.assign(actor,
      {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
        airHeight: 0, prevAirHeight: 0, airborne: false, contactCooldown: 0});
    window.__waveTwoPlace(state, 500);
    window.__waveTwoPlace(state.rival, 540);
    window.__waveTwoAim = () => {
      const from = duel.course.groundAt(state.s, state.lateral);
      const to = duel.course.groundAt(state.rival.s, state.rival.lateral);
      state.headingError = Math.atan2(to.x - from.x, to.z - from.z) - from.heading;
    };
    window.__waveTwoTick = (count, targetS) => {
      for (let i = 0; i < count; i++) {
        duel.step(${DT});
        window.__waveTwoPlace(state, 500);
        window.__waveTwoPlace(state.rival, targetS);
        window.__waveTwoAim();
      }
    };
    window.__waveTwoPaint = () => {
      const a = duel.course.groundAt(state.s, state.lateral);
      const b = duel.course.groundAt(state.rival.s, state.rival.lateral);
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.max(1, Math.hypot(dx, dz));
      const sx = dz / length, sz = -dx / length;
      const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 1.5,
        z: (a.z + b.z) / 2};
      const distance = Math.max(17, length * .9 + 10);
      app.inspectionCamera = {position: [center.x + sx * distance,
        center.y + distance * .45, center.z + sz * distance],
        target: [center.x, center.y, center.z]};
      window.__render.camera.position.fromArray(app.inspectionCamera.position);
      window.__render.camera.lookAt(...app.inspectionCamera.target);
      window.__render.camera.updateMatrixWorld(true);
      const before = JSON.stringify(state);
      app.onFrame?.(state, 0); window.__render.renderFrame();
      if (JSON.stringify(state) !== before)
        throw Error('Wave-two rendering changed race state');
      document.querySelectorAll('details').forEach(panel => {
        const title = panel.querySelector('summary')?.textContent || '';
        if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
          panel.hidden = true;
      });
    };
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    window.__waveTwoAim();
    window.__waveTwoPaint();
  })()`);
  await context.waitFor(`(() => {
    window.__waveTwoPaint();
    return window.__qaApp.visualReady &&
      document.querySelector('#view3d canvas')?.style.visibility === 'visible';
  })()`, 'painted wave-two race', 60_000);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html');
    await context.waitFor(`!!window.__qaApp && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'memory-only seeker page', 60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp, select=document.querySelector('#graphics-quality');
      if(location.search || !app.duel.featureFlags.enabled('seeker-rockets'))
        throw Error('Released seekers must be on without a QA flag override');
      select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
      app.addPlayer('Seekers ${quality}');
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,xp:20000,scrap:4000}};
      if(!app._saveProfile() || !app.purchaseArsenalWeapon('rockets').ok || !app.equipCarWeapon(0,'rockets').ok) throw Error('Native seeker loadout failed');
    })()`);
    await start(context);
    const lock=await context.evaluate(`(() => {
      const app=window.__qaApp,duel=app.duel,state=duel.state;
      window.__waveTwoPlace(state.rival,560);window.__waveTwoAim();
      window.__waveTwoTick(2,560);
      if(!duel.fireWeapon('rockets')) throw Error('Native seeker trigger failed');
      const shot=state.combat.projectiles.find(p=>p.kind==='rocket-pod');
      if(!shot?.seekerTargetId) throw Error('Native seeker did not acquire');
      window.__waveTwoPaint();
      const bracket=window.__render.scene.getObjectByName('seeker-target-bracket-0');
      if(!bracket?.visible) throw Error('Chased target has no bracket');
      if(!window.__waveTwoEvents.some(e=>e.arsenalCue==='weapon.rockets.lock')) throw Error('Missing lock tone event');
      return {target:shot.seekerTargetId,bracket:bracket.visible};
    })()`);
    await context.screenshot('seeker-lock-'+quality);
    const counter=await context.evaluate(`(() => {
      const duel=window.__qaApp.duel,state=duel.state,armor=state.rival.armor;
      state.rival.combatShield=5; state.combat.rivalShield=5;
      window.__waveTwoTick(180,560); window.__waveTwoPaint();
      if(state.rival.armor!==armor) throw Error('Shield did not block seeker volley');
      if(window.__render.scene.getObjectByName('seeker-target-bracket-0').visible) throw Error('Bracket remained after chase ended');
      return {armor,after:state.rival.armor,liveRockets:state.combat.projectiles.filter(p=>p.kind==='rocket-pod').length};
    })()`);
    await context.screenshot('seeker-shield-'+quality);
    const audio=await context.evaluate(`(async () => {
      const app=window.__qaApp,Audio=app.audio.constructor,native=new OfflineAudioContext(2,24000,48000);
      const audio=new Audio({flags:{enabled:()=>true}});
      audio._loadSamples=audio._loadAmbience=audio._loadCueBuffers=()=>{};
      audio.muted=false; audio._build(native);
      const voice=audio._playCue('weapon.rockets.lock');
      if(!voice) throw Error('Lock cue did not create a browser voice');
      const buffer=await native.startRendering();let peak=0,energy=0;
      for(const value of buffer.getChannelData(0)){peak=Math.max(peak,Math.abs(value));energy+=value*value;}
      if(!(peak>0 && peak<1)) throw Error('Lock cue is silent or clips');
      return {peak,rms:Math.sqrt(energy/buffer.length),seconds:buffer.duration};
    })()`);
    console.log(JSON.stringify({quality,lock,counter,audio}));
  }
}
