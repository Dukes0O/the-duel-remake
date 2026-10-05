const DT = 1 / 120;

async function race(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode:'wasteland',seed:202603,car:'falcone_f42',
      difficulty:'casual',cpuDifficulty:'hard',opponentCount:1})) throw Error('Native wave-three race failed');
    app.stop();
    const duel=app.duel,state=duel.state;
    Object.assign(state,{status:'racing',countdown:0,paused:false,invulnerableSec:0,traffic:[]});
    state.combat.aiTimer=state.combat.pickupTimer=Infinity;
    window.__waveThreeEvents=[];
    window.__waveThreeDetach?.();
    window.__waveThreeDetach=duel.onChange((_state,event)=>{
      if(event.arsenalCue||event.weaponFired)window.__waveThreeEvents.push(event);
    });
    window.__waveThreePlace=(actor,s,lateral=0)=>Object.assign(actor,{s,prevS:s,
      lateral,prevLateral:lateral,speedMph:0,headingError:0,yawVelocity:0,
      pushVelocity:0,impactTimer:0,airHeight:0,prevAirHeight:0,airborne:false,contactCooldown:0});
    window.__waveThreePlace(state,500);window.__waveThreePlace(state.rival,540);
    duel.setInput({throttle:0,brake:0,steer:0,boost:false});
    window.__waveThreeTick=(count,targetS=540,targetLat=0)=>{
      for(let i=0;i<count;i++){
        duel.step(${DT});window.__waveThreePlace(state,500);
        window.__waveThreePlace(state.rival,targetS,targetLat);
      }
    };
    window.__waveThreePaint=()=>{
      const a=duel.course.groundAt(state.s,state.lateral);
      const b=duel.course.groundAt(state.rival.s,state.rival.lateral);
      const dx=b.x-a.x,dz=b.z-a.z,len=Math.max(1,Math.hypot(dx,dz));
      const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2+1.5,z:(a.z+b.z)/2};
      const distance=Math.max(24,len*.9+15),sx=dz/len,sz=-dx/len;
      app.inspectionCamera={position:[center.x+sx*distance,center.y+distance*.5,
        center.z+sz*distance],target:[center.x,center.y,center.z]};
      window.__render.camera.position.fromArray(app.inspectionCamera.position);
      window.__render.camera.lookAt(...app.inspectionCamera.target);
      window.__render.camera.updateMatrixWorld(true);
      const before=JSON.stringify(state);
      app.onFrame?.(state,0);window.__render.renderFrame();
      if(JSON.stringify(state)!==before)throw Error('Wave-three drawing changed race state');
      const canvas=document.querySelector('#view3d canvas');
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
      const bytes=new Uint8Array(64*64*4);
      gl.readPixels(Math.floor(canvas.width/2)-32,Math.floor(canvas.height/2)-32,
        64,64,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
      if(!bytes.some((value,index)=>index%4!==3&&value>12))throw Error('Blank desktop game canvas');
    };
  })()`);
  await context.waitFor(`(() => {
    if(!window.__qaApp.visualReady||document.querySelector('#view3d canvas')?.style.visibility!=='visible')return false;
    window.__waveThreePaint();return true;})()`,
  'painted desktop wave-three race',60_000);
}

export async function run(context) {
  for(const quality of ['high','performance']) {
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=arsenal,arsenal-wave3,fight-voices');
    await context.waitFor(`!!window.__qaApp&&!!window.__render&&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,
    'memory-only desktop page',60_000);
    await context.evaluate(`(() => {
      const app=window.__qaApp,select=document.querySelector('#graphics-quality');
      select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
      if(!app.addPlayer('Wave Three ${quality}').ok)throw Error('Named player creation failed');
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,
        discoveredGate:true,xp:100000,scrap:4000}};
      if(!app._saveProfile())throw Error('Named memory career save failed');
      document.querySelector('#armory-open').click();
      for(const [slot,id] of ['mortar','tesla','decoy','nitro'].entries()){
        const buy=document.querySelector('[data-arsenal-purchase="'+id+'"]');
        if(!buy)throw Error('Native Armory offer missing '+id);buy.click();
        const choice=document.querySelector('[data-loadout-slot="'+slot+'"]');
        choice.value=id;choice.dispatchEvent(new Event('change',{bubbles:true}));
      }
      if(app.profile.wasteland.loadout.join(',')!=='mortar,tesla,decoy,nitro')throw Error('Native equipment failed');
      document.querySelector('[data-action="armory-close"]').click();
    })()`);

    await race(context);
    await context.evaluate(`(() => {
      const duel=window.__qaApp.duel,state=duel.state;
      if(!duel.fireWeapon('mortar'))throw Error('Mortar did not fire');
      window.__waveThreeTick(60);window.__waveThreePaint();
      for(const name of ['arsenal-mortar-ring-0','arsenal-mortar-shell-0']){
        if(!window.__render.scene.getObjectByName(name)?.visible)throw Error('Missing '+name);
      }
    })()`);
    await context.screenshot('wave-three-mortar-tell-'+quality);
    await context.evaluate(`(() => {
      const state=window.__qaApp.duel.state,armor=state.rival.armor;
      window.__waveThreeTick(133,540,9);window.__waveThreePaint();
      if(state.rival.armor!==armor)throw Error('Lane-change counter failed');
      if(state.combat.mortarShells.length)throw Error('Mortar did not land');
    })()`);
    await context.screenshot('wave-three-mortar-counter-'+quality);

    await race(context);
    await context.evaluate(`(() => {
      const duel=window.__qaApp.duel,state=duel.state;
      window.__waveThreePlace(state.rival,508);
      if(!duel.fireWeapon('tesla'))throw Error('Tesla did not charge');
      window.__waveThreeTick(24,508);window.__waveThreePaint();
      if(!window.__render.scene.getObjectByName('arsenal-tesla-charge-0')?.visible)throw Error('Tesla tell not drawn');
    })()`);
    await context.screenshot('wave-three-tesla-tell-'+quality);
    await context.evaluate(`(() => {
      window.__waveThreeTick(25,508);window.__waveThreePaint();
      if(!window.__render.scene.getObjectByName('arsenal-tesla-pulse-0')?.visible)throw Error('Tesla pulse not drawn');
      if(!window.__waveThreeEvents.some(event=>event.arsenalCue==='weapon.tesla.pulse'))throw Error('Tesla did not pulse');
    })()`);
    await context.screenshot('wave-three-tesla-pulse-'+quality);

    await race(context);
    await context.evaluate(`(() => {
      const duel=window.__qaApp.duel;
      if(!duel.fireWeapon('decoy'))throw Error('Drone did not deploy');
      window.__waveThreeTick(2);window.__waveThreePaint();
      const copy=window.__render.scene.getObjectByName('Arsenal Decoy Drone');
      let translucent=false;copy?.traverse(mesh=>{
        if(mesh.isMesh&&mesh.material.transparent&&mesh.material.opacity<=.3)translucent=true;
      });
      if(!copy||!translucent)throw Error('Drone is not a visible see-through owner copy');
    })()`);
    await context.screenshot('wave-three-decoy-'+quality);
    await context.evaluate(`(() => {
      window.__waveThreeTick(600);window.__waveThreePaint();
      if(window.__qaApp.duel.state.opponents.some(actor=>actor.drone))throw Error('Drone did not expire');
    })()`);
    await context.screenshot('wave-three-decoy-expired-'+quality);

    await race(context);
    await context.evaluate(`(() => {
      const duel=window.__qaApp.duel;
      if(!duel.fireWeapon('nitro'))throw Error('Nitro did not fire');
      window.__waveThreeTick(2);window.__waveThreePaint();
      if(!window.__waveThreeEvents.some(event=>event.arsenalCue==='weapon.nitro.start'))throw Error('No native Nitro event');
    })()`);
    await context.screenshot('wave-three-nitro-'+quality);
    await context.evaluate(`(() => {
      const duel=window.__qaApp.duel,state=duel.state;
      const rival=state.rival;rival.weaponLoadout=['oil'];
      window.__waveThreePlace(rival,510);
      state.combat.aiTimer=0;duel.step(${DT});state.combat.aiTimer=Infinity;
      const oil=window.__waveThreeEvents.find(event=>event.arsenalCue==='weapon.oil.deploy'&&event.actor===rival)?.hazard;
      if(!oil)throw Error('Native oil event has no hazard');
      if(oil){const p=duel.course.nearest(oil.x,oil.z,state.s);window.__waveThreePlace(state,p.s,p.lateral);}
      window.__waveThreePlace(rival,540);
      for(let i=0;i<3;i++)duel.step(${DT});
      if(state.combat.nitroRuns.length)throw Error('Oil did not end native Nitro: '+JSON.stringify({
        s:state.s,lateral:state.lateral,invulnerable:state.invulnerableSec,
        shield:state.combat.shield,slips:window.__waveThreeEvents.filter(event=>event.arsenalCue==='weapon.oil.slip').length}));
      window.__waveThreePaint();
    })()`);
    await context.screenshot('wave-three-nitro-counter-'+quality);
  }
}
