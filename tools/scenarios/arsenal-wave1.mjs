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
    window.__waveOnePlace=(actor,s,lateral=0,speedMph=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,
      speedMph,headingError:0,yawVelocity:0,pushVelocity:0,impactTimer:0,
      airHeight:0,prevAirHeight:0,airborne:false,combatShield:0,contactCooldown:0});
    window.__waveOneDetach?.();
    window.__waveOneEvents=[];
    window.__waveOneDetach=duel.onChange((next,event)=>{
      if(event.arsenalCue||event.weaponFired)window.__waveOneEvents.push(event);
    });
    window.__waveOneCues=(cue,actor)=>window.__waveOneEvents.filter(event=>
      event.arsenalCue===cue&&(!actor||event.actor===actor));
    // Read the real scene endpoints. A decorative line cannot stand in for a tether.
    window.__waveOneHasTether=(shooter,target)=>{
      const from=duel.course.groundAt(shooter.s,shooter.lateral);
      const to=duel.course.groundAt(target.s,target.lateral);
      let found=false;
      window.__render.scene.traverse(node=>{
        if(!node.isLine||node.isLineLoop||!node.visible)return;
        for(let parent=node.parent;parent;parent=parent.parent)if(!parent.visible)return;
        const points=node.geometry?.attributes.position;
        if(!points||points.count!==2)return;
        node.updateWorldMatrix(true,false);
        const end=index=>{
          const x=points.getX(index),y=points.getY(index),z=points.getZ(index),m=node.matrixWorld.elements;
          return {x:m[0]*x+m[4]*y+m[8]*z+m[12],z:m[2]*x+m[6]*y+m[10]*z+m[14]};
        };
        const a=end(0),b=end(1),near=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z)<.05;
        if(near(a,from)&&near(b,to)||near(b,from)&&near(a,to))found=true;
      });
      return found;
    };
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
    await context.evaluate(`(()=>{
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival,armor=target.armor;
      if(!duel.fireWeapon('harpoon')||duel.fireWeapon('harpoon'))throw Error('Harpoon launch or recharge failed');
      for(let i=0;i<180&&!window.__waveOneCues('weapon.harpoon.hit',target).length;i++)duel.step(${DT});
      if(window.__waveOneCues('weapon.harpoon.hit',target).length!==1||Math.abs(armor-target.armor-6)>1e-7)
        throw Error('Native swept hit did not damage/tether');
      window.__waveOnePaint();
      if(!window.__waveOneHasTether(state,target))throw Error('Actual live tether does not join the hit cars');
    })()`);
    await paint(context,'wave-one-harpoon-tether-'+quality);
    await start(context);
    await context.evaluate(`(()=>{
      const duel=window.__qaApp.duel,state=duel.state,cpu=state.rival;
      window.__waveOnePlace(cpu,500,2);window.__waveOnePlace(state,535,0);
      cpu.weaponLoadout=['harpoon','crossbow','bomb','star'];
      const aimFrom=duel.course.groundAt(cpu.s,cpu.lateral),aimTo=duel.course.groundAt(state.s,state.lateral);
      cpu.headingError=Math.atan2(aimTo.x-aimFrom.x,aimTo.z-aimFrom.z)-aimFrom.heading;
      state.combat.aiTimer=0;duel.step(${DT});state.combat.aiTimer=Infinity;
      if(window.__waveOneCues('weapon.harpoon.fire',cpu).length!==1)throw Error('Actual CPU decision did not launch Harpoon');
      for(let i=0;i<180&&!window.__waveOneCues('weapon.harpoon.hit',state).length;i++)duel.step(${DT});
      if(window.__waveOneCues('weapon.harpoon.hit',state).length!==1)throw Error('Native player counter fixture did not get hit');
      window.__waveOnePaint();
      if(!window.__waveOneHasTether(cpu,state))throw Error('CPU hit did not render an actual player tether');
      const from=duel.course.groundAt(cpu.s,cpu.lateral),to=duel.course.groundAt(state.s,state.lateral);
      const heading=to.heading+state.headingError;
      const away=Math.sign((from.x-to.x)*Math.cos(heading)-(from.z-to.z)*Math.sin(heading));
      if(!away)throw Error('Actual shooter has no side');
      const poses=[state,cpu].map(actor=>({actor,s:actor.s,lateral:actor.lateral,headingError:actor.headingError}));
      const ticks=n=>{for(let i=0;i<n;i++){duel.step(${DT});for(const p of poses){
        window.__waveOnePlace(p.actor,p.s,p.lateral);p.actor.headingError=p.headingError;
      }}};
      duel.setInput({throttle:0,brake:0,steer:.6*away,boost:false});ticks(30);
      duel.setInput({steer:0});ticks(20);
      if(window.__waveOneCues('weapon.harpoon.break',state).length)throw Error('Neutral interval completed the counter');
      duel.setInput({steer:.6*away});ticks(29);window.__waveOnePaint();
      if(window.__waveOneCues('weapon.harpoon.break',state).length||!window.__waveOneHasTether(cpu,state))
        throw Error('Counter broke before .5 accumulated seconds');
      ticks(1);window.__waveOnePaint();
      if(window.__waveOneCues('weapon.harpoon.break',state).length!==1||window.__waveOneHasTether(cpu,state))
        throw Error('Actual .6 steering failed to break after .5 seconds');
    })()`);
    await paint(context,'wave-one-harpoon-steering-counter-'+quality);
    await start(context);
    await context.evaluate(`(()=>{
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival,armor=target.armor;
      target.weaponLoadout=['star','harpoon','crossbow','bomb'];
      const from=duel.course.groundAt(target.s,target.lateral),to=duel.course.groundAt(state.s,state.lateral);
      target.headingError=Math.atan2(to.x-from.x,to.z-from.z)-from.heading;
      // A genuine incoming bolt makes the real CPU raise Star Shield.
      if(!duel.fireWeapon('crossbow'))throw Error('Actual incoming shield threat did not launch');
      for(let i=0;i<60&&state.combat.rivalShield<=0;i++)duel.step(${DT});
      if(!(state.combat.rivalShield>0)||!window.__waveOneEvents.some(event=>event.weaponFired==='star')||target.armor!==armor)
        throw Error('Actual CPU shield reaction did not protect against the bolt');
      if(!duel.fireWeapon('harpoon'))throw Error('Actual shield counter Harpoon did not launch');
      const shot=window.__waveOneCues('weapon.harpoon.fire',state).at(-1)?.projectile;
      if(!shot)throw Error('Actual shield counter product missing');
      for(let i=0;i<150&&state.combat.projectiles.includes(shot);i++)duel.step(${DT});
      const at=duel.course.groundAt(target.s,target.lateral),floor=duel.course.nearest(shot.x,shot.z);
      if(state.combat.projectiles.includes(shot)||shot.travelled>=50||Math.hypot(shot.x-at.x,shot.z-at.z)>=4||
          shot.y<=duel.course.groundAt(floor.s,floor.lateral).y+.25)
        throw Error('Actual Harpoon did not reach the shielded body before retirement');
      window.__waveOnePaint();
      if(target.armor!==armor||window.__waveOneCues('weapon.harpoon.hit',target).length||window.__waveOneHasTether(state,target))
        throw Error('Star Shield failed to block actual Harpoon armor/tether');
    })()`);
    await paint(context,'wave-one-harpoon-shield-counter-'+quality);
    await start(context);
    await context.evaluate(`(()=>{
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival;
      // Easy's native lane steering supplies the same bounded grip witness in both controls.
      state.cpuDifficulty='easy';
      const sample=speed=>{
        window.__waveOnePlace(state,1000);window.__waveOnePlace(target,550,.5,speed);target.headingError=.2;
        const before=duel.course.groundAt(target.s,target.lateral);duel.step(${DT});
        const after=duel.course.groundAt(target.s,target.lateral);
        return {turn:.2-target.headingError,speed:target.speedMph,travel:Math.hypot(after.x-before.x,after.z-before.z)};
      };
      const ceiling=duel.rivalSpec.topSpeed*.9,initial=ceiling+5;
      const control={turn:sample(100).turn,speed:sample(initial).speed};
      window.__waveOneCaltropsControl=control;
      window.__waveOnePlace(state,500);const armor=target.armor;
      if(!duel.fireWeapon('caltrops')||duel.fireWeapon('caltrops'))throw Error('Caltrops launch or recharge failed');
      const deployed=window.__waveOneCues('weapon.caltrops.deploy',state),strip=deployed[0]?.hazard;
      if(deployed.length!==1||!strip||strip.kind!=='caltrops'||strip.shape!=='strip')throw Error('Native registered strip missing');
      const at=duel.course.nearest(strip.x,strip.z,target.s);
      window.__waveOnePlace(target,at.s,at.lateral+.1);window.__waveOnePlace(state,520);duel.step(${DT});
      const hits=window.__waveOneCues('weapon.caltrops.hit',target);
      if(Math.abs(armor-target.armor-4)>1e-7||hits.length!==1||hits[0].hazard!==strip)
        throw Error('Actual registered strip failed to contact and damage the body');
      const gripping=sample(100),limited=sample(initial);
      if(!(gripping.travel>0&&limited.travel>0)||Math.abs(gripping.turn-control.turn*.75)>1e-7||
          Math.abs(limited.speed-ceiling)>1e-7||!(control.speed>limited.speed+1e-6))
        throw Error('Actual Caltrops contact did not reduce native grip and speed versus control');
      if(target.armor!==armor-4||window.__waveOneCues('weapon.caltrops.hit',target).length!==1)
        throw Error('Actual Caltrops contact repeated');
      window.__waveOnePlace(state,520);window.__waveOnePlace(target,at.s,at.lateral+.1);
      window.__waveOnePaint();const holder=window.__render.scene.getObjectByName('arsenal-hazard-0');
      const ground=duel.course.groundAt(at.s,at.lateral);
      if(!holder?.visible||!holder.children.some(node=>node.isInstancedMesh&&node.visible&&node.count===40)||
          Math.hypot(holder.position.x-strip.x,holder.position.z-strip.z)>.05||Math.abs(holder.position.y-ground.y-.03)>.05)
        throw Error('Native glinting spikes did not draw on the contacted ground');
    })()`);
    await paint(context,'wave-one-caltrops-contact-'+quality);
    await start(context);
    await context.evaluate(`(()=>{
      const duel=window.__qaApp.duel,state=duel.state,target=state.rival,control=window.__waveOneCaltropsControl;
      state.cpuDifficulty='easy';const armor=target.armor;
      if(!duel.fireWeapon('caltrops'))throw Error('Native avoidance strip did not launch');
      const strip=window.__waveOneCues('weapon.caltrops.deploy',state)[0]?.hazard;
      if(!strip)throw Error('Actual avoidance strip missing');
      const at=duel.course.nearest(strip.x,strip.z,target.s);
      window.__waveOnePlace(target,at.s,at.lateral+8);window.__waveOnePlace(state,520);
      for(let i=0;i<3;i++)duel.step(${DT});
      const sample=speed=>{
        window.__waveOnePlace(state,1000);window.__waveOnePlace(target,550,.5,speed);target.headingError=.2;
        duel.step(${DT});return {turn:.2-target.headingError,speed:target.speedMph};
      };
      const gripping=sample(100),limited=sample(duel.rivalSpec.topSpeed*.9+5);
      if(target.armor!==armor||window.__waveOneCues('weapon.caltrops.hit',target).length||
          Math.abs(gripping.turn-control.turn)>1e-7||Math.abs(limited.speed-control.speed)>1e-7)
        throw Error('Steering around the real strip failed to preserve native armor/grip/speed');
      window.__waveOnePlace(state,520);window.__waveOnePlace(target,at.s,at.lateral+8);
    })()`);
    await paint(context,'wave-one-caltrops-around-counter-'+quality);
    await context.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await context.evaluate(`(async()=>{
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      window.__waveOnePaint();
      const actual=window.__qaApp.duel.state.weaponLoadout.join(',');
      const hud=[...document.querySelectorAll('[data-combat-slot]')].map(button=>button.dataset.combatWeapon).join(',');
      if(actual!=='harpoon,caltrops,oil,smoke'||hud!==actual)throw Error('Wave-one phone HUD differs from actual equipped weapons');
    })()`);
    await context.screenshot('wave-one-phone-hud-'+quality);
    console.log('Wave one '+quality+': actual four-weapon purchases, swept Harpoon hit/tether, noncontinuous .6 steering, shield, Caltrops contact/around and render purity passed.');
  }
}
