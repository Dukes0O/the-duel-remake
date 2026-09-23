// Production renderer, disposable browser profile, and memory-only QA saves.
const cars = { player: 'falcone_f42', rival: 'titan_monster' };
const readPose = `(() => {
  const scene=window.__render.scene;
  const role=index=>{
    const shield=scene.getObjectByName('combat-shield-'+index);
    const vehicle=shield?.parent?.parent;
    if(!vehicle)return null;
    vehicle.updateMatrixWorld(true);
    const vector=()=>new shield.position.constructor();
    const mounts={};
    for(const name of ['bumper','bow','shield']){
      const rig=scene.getObjectByName('combat-'+name+'-'+index);
      mounts[name]={parent:rig?.parent?.name,visible:rig?.visible,
        error:rig?.getWorldPosition(vector()).distanceTo(rig.parent.getWorldPosition(vector()))};
    }
    return {key:vehicle.userData.vehicleKey,position:vehicle.position.toArray(),rotation:vehicle.rotation.toArray(),mounts};
  };
  return {player:role(0),rival:role(1)};
})()`;
const fail = (message, value) => { throw Error(`${message}: ${JSON.stringify(value)}`); };

export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__game && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value", 'isolated production menu', 60_000);
  await context.evaluate(`(() => {
    for(const panel of document.querySelectorAll('details')){
      const title=panel.querySelector('summary')?.textContent||'';
      if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.style.display='none';
    }
    if(!window.__game.startCampaign({car:'falcone_f42',rival:{car:'titan_monster',driverId:'club',upgradeLevel:0},mode:'wasteland',startStage:0}))throw Error('Race did not start');
  })()`);
  await context.waitFor("window.__game.state.status==='racing' && !!document.querySelector('#view3d canvas') && document.querySelector('#view3d canvas').style.visibility!=='hidden'", 'active production race', 25_000);
  await context.evaluate(`(() => {
    const s=window.__game.state;
    s.paused=true;s.speedMph=0;s.s=160;s.lateral=0;
    s.rival.s=174;s.rival.lateral=2.4;s.rival.speedMph=0;
    s.combat.shield=100;s.combat.rivalShield=100;
    document.querySelector('#modal-layer').style.display='none';
    window.__render.renderFrame();
  })()`);
  const base = await context.evaluate(readPose);
  for(const role of ['player','rival']){
    if(base[role]?.key!==cars[role])fail(`${role} model mismatch`,base);
    for(const name of ['bumper','bow','shield']){
      const mount=base[role].mounts[name];
      if(!mount.visible||mount.error>1e-6||mount.parent!==`vehicle-socket-${name==='bumper'?'front':name==='bow'?'roof':'shield'}`)fail(`${role} ${name} not owned by its car`,mount);
    }
  }
  const poses = [
    {name:'slide',player:{slipAngle:.48},rival:{headingError:-.48},axis:1,min:.25},
    {name:'spin',player:{crashSpin:1.15},rival:{headingError:1.15},axis:1,min:.8},
    {name:'tumble',player:{tumble:{},terrainPitch:-.48,terrainRoll:1.4},rival:{tumble:{},terrainPitch:-.48,terrainRoll:1.4},axis:2,min:.7},
    {name:'jump',player:{airHeight:3.5,airborne:true},rival:{airHeight:3.5,airborne:true},axis:'height',min:2.5},
  ];
  for(const pose of poses){
    await context.evaluate(`(() => {
      const s=window.__game.state,r=s.rival;
      for(const actor of [s,r])Object.assign(actor,{slipAngle:0,headingError:0,crashSpin:0,tumble:null,terrainPitch:null,terrainRoll:null,airHeight:0,airborne:false});
      Object.assign(s,${JSON.stringify(pose.player)});Object.assign(r,${JSON.stringify(pose.rival)});
      window.__render.renderFrame();
    })()`);
    const current=await context.evaluate(readPose);
    for(const role of ['player','rival']){
      const before=base[role],after=current[role],change=pose.axis==='height'?after.position[1]-before.position[1]:after.rotation[pose.axis]-before.rotation[pose.axis];
      if(Math.abs(change)<pose.min)fail(`${pose.name} did not move ${role} model`,{change,current});
      for(const name of ['bumper','bow','shield']){
        const mount=after.mounts[name];
        if(!mount.visible||mount.error>1e-6)fail(`${pose.name} ${role} ${name} left its socket`,mount);
      }
    }
    await context.screenshot(`vehicle-${pose.name}`);
  }
  console.log('Player and rival combat rigs follow production slide, spin, tumble and jump poses.');
}
