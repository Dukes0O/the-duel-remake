export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2,crew-gear,arsenal');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,
  'memory-only signature gear preview', 60_000);
  for(const crewId of ['rook','nell','jax','odessa','cinder','dune','wren','tusk']){
    const row = await context.evaluate(`(() => {
      const app=window.__qaApp,crewId=${JSON.stringify(crewId)};
      if(!app._switches().enabled('crew-gear'))throw Error('QA gear switch did not load');
      app.stop();
      app.duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,
        discoveredGate:true,crewId,opponentCount:1});
      const s=app.duel.state;
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
        lateral:0,prevLateral:0,speedMph:0,traffic:[]});
      s.wastelandGateDiscovered=true;
      s.combat.aiTimer=s.combat.pickupTimer=Infinity;
      s.opponents.forEach((car,i)=>Object.assign(car,{s:560+i*20,prevS:560+i*20,
        lateral:0,prevLateral:0,speedMph:0,headingError:0,airHeight:0,prevAirHeight:0}));
      app.duel.setInput({interact:true});for(let i=0;i<50&&!s.onFoot;i++)app.duel.step(1/120);
      app.duel.setInput({interact:false});
      if(!s.onFoot)throw Error(crewId+': actual App exit did not create a fighter');
      app.duel.selectFootGear(3);
      const expected={rook:'LONGHORN RPG',nell:'STICKY BOMBS',jax:'GRAPPLE',
        odessa:'SCRAP TURRET',cinder:'HAND FLAMER',dune:'MARKSMAN CROSSBOW',
        wren:'SMOKE GRENADES',tusk:'SCRAP CANNON'}[crewId];
      if(s.footGear?.name!==expected)throw Error(crewId+': signature slot did not reach the HUD');
      if(crewId!=='rook'){
        app.duel.setFighterInput({fire:true});app.duel.step(1/120);
        if(crewId==='cinder'&&!s.fighter.flaming)throw Error('Flamer did not activate');
        if(crewId!=='cinder'){app.duel.setFighterInput({fire:false});app.duel.step(1/120);}
        if(crewId==='odessa'&&!s.crewGear.turret)throw Error('Turret did not deploy');
        if(['nell','dune','wren','tusk'].includes(crewId)&&
            !s.combat.projectiles.some(shot=>shot.crewGearShot))throw Error(crewId+': real signature projectile missing');
      }
      app._footCameraMode='overhead';app.onFrame?.(s);window.__render.renderFrame();
      return {crewId,gear:s.footGear.name,ammo:s.footGear.ammo,
        projectileCount:s.combat.projectiles.length,turret:!!s.crewGear.turret,
        flaming:!!s.fighter.flaming};
    })()`);
    await context.screenshot('crew-gear-'+crewId);
    console.log('Private crew gear: '+JSON.stringify(row));
  }
}
