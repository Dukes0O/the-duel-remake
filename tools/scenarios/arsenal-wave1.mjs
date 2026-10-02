// The production App, Armory, Duel and renderer run with tab-local saves.
// Contact poses and an earned rank-six career are explicit QA fixtures.
import {run as runCore} from './arsenal-core.mjs';

const DT = 1 / 120;
async function paint(context, name) {
  await context.evaluate(`window.__waveOnePaint()`);
  await context.screenshot(name);
}
async function start(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode:'wasteland', seed:1989, car:'falcone_f42',
      difficulty:'casual', cpuDifficulty:'hard', opponentCount:1})) throw Error('Native wave-one start failed');
    app.stop();
    const duel=app.duel,state=duel.state;
    Object.assign(state,{status:'racing',countdown:0,paused:false,invulnerableSec:0,traffic:[]});
    state.combat.aiTimer=state.combat.pickupTimer=Infinity;
    window.__waveOnePlace=(actor,s,lateral=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,
      speedMph:0,headingError:0,yawVelocity:0,pushVelocity:0,impactTimer:0,
      airHeight:0,prevAirHeight:0,airborne:false,combatShield:0,contactCooldown:0});
    window.__waveOnePlace(state,500);window.__waveOnePlace(state.rival,535);
    duel.setInput({throttle:0,brake:0,steer:0,boost:false});
    const at=duel.course.groundAt(518,0);
    app.inspectionCamera={position:[at.x+20,at.y+19,at.z+12],target:[at.x,at.y+1,at.z]};
    window.__waveOnePaint=()=>{
      const before=JSON.stringify(state);app.onFrame?.(state);window.__render.renderFrame();
      if(JSON.stringify(state)!==before)throw Error('Wave-one presentation mutated native state');
    };
  })()`);
}
export async function run(context) {
  // Reuse the original genuine Oil/Smoke shots and counters, not copied images.
  await runCore(context);
  for(const quality of ['high','performance']) {
    await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?flags=arsenal');
    await context.waitFor(`!!window.__qaApp && !!window.__render &&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'memory-only wave-one production page',60000);
    await context.evaluate(`(() => {
      const quality=document.querySelector('#graphics-quality');quality.value='${quality}';
      quality.dispatchEvent(new Event('change',{bubbles:true}));
      const app=window.__qaApp;
      if(!app.addPlayer('Wave One ${quality}').ok)throw Error('Named owner creation failed');
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,xp:3500,scrap:4000}};
      if(!app._saveProfile())throw Error('Synthetic earned rank failed to save');
      document.querySelector('#armory-open').click();
      for(const [slot,id] of ['harpoon','caltrops','oil','smoke'].entries()){
        const button=document.querySelector('[data-arsenal-purchase="'+id+'"]');
        if(!button)throw Error('Native Armory offer missing '+id);button.click();
        const select=document.querySelector('[data-loadout-slot="'+slot+'"]');
        select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));
      }
      if(app.profile.wasteland.loadout.join(',')!=='harpoon,caltrops,oil,smoke')throw Error('Native equipped slots differ');
      document.querySelector('[data-action="armory-close"]').click();
    })()`);
    await start(context);
    await context.evaluate(`(async()=>{
      const {carEffect}=await import('/src/arsenal/car-effects.js');
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival,armor=target.armor;
      if(!duel.fireWeapon('harpoon')||duel.fireWeapon('harpoon'))throw Error('Harpoon launch or recharge failed');
      for(let i=0;i<180&&!carEffect(target,'tether');i++)duel.step(${DT});
      if(!carEffect(target,'tether')||Math.abs(armor-target.armor-6)>1e-7)throw Error('Native swept hit did not damage/tether');
      window.__waveOnePaint();
      const lines=[];window.__render.scene.traverse(node=>{if(node.isLine&&!node.isLineLoop&&node.visible){
        let visible=true;for(let parent=node.parent;parent;parent=parent.parent)if(!parent.visible)visible=false;
        if(visible)lines.push(node);
      }});
      if(!lines.length)throw Error('Actual live tether line not rendered');
    })()`);
    await paint(context,'wave-one-harpoon-tether-'+quality);
    await start(context);
    await context.evaluate(`(async()=>{
      const {fireWeapon,point}=await import('/src/combat-weapons.js');
      const {carEffect}=await import('/src/arsenal/car-effects.js');
      const duel=window.__qaApp.duel,state=duel.state,cpu=state.rival;
      window.__waveOnePlace(cpu,500,2);window.__waveOnePlace(state,535,0);
      cpu.weaponLoadout=['harpoon','crossbow','bomb','star'];
      if(!fireWeapon(duel,'harpoon',true,cpu))throw Error('Native CPU harpoon did not launch');
      for(let i=0;i<180&&!carEffect(state,'tether');i++)duel.step(${DT});
      if(!carEffect(state,'tether'))throw Error('Native player counter fixture did not get tethered');
      const from=point(duel,cpu),to=point(duel,state),heading=to.heading+state.headingError;
      const away=Math.sign((from.x-to.x)*Math.cos(heading)-(from.z-to.z)*Math.sin(heading));
      if(!away)throw Error('Actual shooter has no side');
      const poses=[state,cpu].map(actor=>({actor,s:actor.s,lateral:actor.lateral,headingError:actor.headingError}));
      const ticks=n=>{for(let i=0;i<n;i++){duel.step(${DT});for(const p of poses){
        window.__waveOnePlace(p.actor,p.s,p.lateral);p.actor.headingError=p.headingError;
      }}};
      duel.setInput({throttle:0,brake:0,steer:.6*away,boost:false});ticks(30);
      duel.setInput({steer:0});ticks(20);
      duel.setInput({steer:.6*away});ticks(29);
      if(!carEffect(state,'tether'))throw Error('Counter broke before .5 accumulated seconds');
      ticks(1);if(carEffect(state,'tether'))throw Error('Actual .6 steering failed to break after .5 seconds');
      window.__waveOnePaint();
    })()`);
    await paint(context,'wave-one-harpoon-steering-counter-'+quality);
    await start(context);
    await context.evaluate(`(async()=>{
      const {fireWeapon}=await import('/src/combat-weapons.js');const {carEffect}=await import('/src/arsenal/car-effects.js');
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival,armor=target.armor;
      target.weaponLoadout=['star','harpoon','crossbow','bomb'];
      if(!fireWeapon(duel,'star',true,target)||!duel.fireWeapon('harpoon'))throw Error('Actual shield counter launch failed');
      for(let i=0;i<150;i++)duel.step(${DT});
      if(target.armor!==armor||carEffect(target,'tether'))throw Error('Star Shield failed to block actual Harpoon');
    })()`);
    await paint(context,'wave-one-harpoon-shield-counter-'+quality);
    await start(context);
    await context.evaluate(`(async()=>{
      const {carEffect}=await import('/src/arsenal/car-effects.js');const {hazardsFor}=await import('/src/arsenal/hazards.js');
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival;
      window.__waveOnePlace(target,497,.1);const armor=target.armor;
      if(!duel.fireWeapon('caltrops')||duel.fireWeapon('caltrops'))throw Error('Caltrops launch or recharge failed');
      window.__waveOnePlace(state,520);duel.step(${DT});
      if(Math.abs(armor-target.armor-4)>1e-7||!carEffect(target,'grip'))throw Error('Actual strip failed to damage and slow grip');
      if(hazardsFor(duel).filter(h=>h.kind==='caltrops').length!==1)throw Error('Native registered strip missing');
      window.__waveOnePaint();const holder=window.__render.scene.getObjectByName('arsenal-hazard-0');
      if(!holder?.visible||!holder.children.some(node=>node.isInstancedMesh&&node.visible))throw Error('Native glinting spike strip did not draw');
    })()`);
    await paint(context,'wave-one-caltrops-contact-'+quality);
    await start(context);
    await context.evaluate(`(async()=>{
      const {carEffect}=await import('/src/arsenal/car-effects.js');
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival;
      window.__waveOnePlace(target,497,8);const armor=target.armor;
      if(!duel.fireWeapon('caltrops'))throw Error('Native avoidance strip did not launch');
      window.__waveOnePlace(state,520);for(let i=0;i<3;i++)duel.step(${DT});
      if(target.armor!==armor||carEffect(target,'grip'))throw Error('Steering around real strip failed');
    })()`);
    await paint(context,'wave-one-caltrops-around-counter-'+quality);
    console.log('Wave one '+quality+': actual four-weapon purchases, swept Harpoon hit/tether, noncontinuous .6 steering, shield, Caltrops contact/around and render purity passed.');
  }
}
