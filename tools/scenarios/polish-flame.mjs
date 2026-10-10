import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// The real App and Duel run behind the private harness's memory-only storage.
export async function run(c) {
  const report={card:'POLISH-FLAME',variant:process.env.FLAME_POLISH_VARIANT||'after',captures:[],frames:[]};
  await c.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']) {
    await c.navigate('/tools/menu-check.html?flags=arsenal,crew-gear&harness=polish-flame-'+quality);
    await c.waitFor('!!window.__qaApp && !!window.__render','private native App',60000);
    await c.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
      if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only storage required');
      a.setGraphicsQuality('${quality}');
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
      window.__flameTexturesReady=()=>{const maps=new Set();window.__render.scene.traverse(object=>{
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(!material)continue;for(const map of [material.map,material.uniforms?.flameMap?.value])
            if(map?.name.startsWith('/assets/textures/flamethrower-'))maps.add(map);
        }});return ${report.variant==='before'}||maps.size>0&&[...maps].every(map=>map.image?.complete&&map.image.naturalWidth>0);};
      window.__flameStart=()=>{a.duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:202602,
        discoveredGate:true,crewId:'cinder',opponentCount:1,cpuDifficulty:'medium'});
        const d=a.duel,s=d.state;Object.assign(s,{status:'racing',countdown:0,paused:false,
          invulnerableSec:0,traffic:[]});s.combat.aiTimer=s.combat.pickupTimer=Infinity;
        window.__flamePlace=(actor,at,lateral=0)=>Object.assign(actor,{s:at,prevS:at,lateral,prevLateral:lateral,
          speedMph:0,headingError:0,yawVelocity:0,pushVelocity:0,impactTimer:0,
          airHeight:0,prevAirHeight:0,airborne:false,contactCooldown:0});
        window.__flameAim=()=>{const from=d.course.groundAt(s.s,s.lateral),to=d.course.groundAt(s.rival.s,s.rival.lateral);
          s.headingError=Math.atan2(to.x-from.x,to.z-from.z)-from.heading;
          s.rival.headingError=Math.atan2(from.x-to.x,from.z-to.z)-to.heading;};
        window.__flamePlace(s,500);window.__flamePlace(s.rival,506);window.__flameAim();
        d.setInput({throttle:0,brake:0,steer:0,boost:false});
        window.__flameTick=(count,targetS=506)=>{for(let i=0;i<count;i++){d.step(1/120);
          window.__flamePlace(s,500);window.__flamePlace(s.rival,targetS);window.__flameAim();}};
      };
      window.__flamePaint=(foot=false)=>{const s=a.duel.state,d=a.duel,r=window.__render;
        const p=foot?s.fighter:d.course.groundAt(s.s,s.lateral),h=foot?p.yaw:p.heading+s.headingError;
        a.inspectionCamera={position:[p.x-Math.sin(h)*8+Math.cos(h)*12,p.y+8,p.z-Math.cos(h)*8-Math.sin(h)*12],
          target:[p.x+Math.sin(h)*3,p.y+.7,p.z+Math.cos(h)*3]};
        const before=JSON.stringify(s);a.onFrame(s,0);r.renderFrame();
        if(JSON.stringify(s)!==before)throw Error('Flame rendering changed race state');};
      window.__flameStart();window.__flamePaint();
    })()`);
    await c.waitFor(`(()=>{window.__flamePaint();return window.__qaApp.visualReady&&window.__flameTexturesReady()&&
      document.querySelector('#view3d canvas')?.style.visibility==='visible';})()`,'native Flame race ready',60000);
    for(const view of ['start','full','burning','cinder']) {
      const witness=await c.evaluate(`(()=>{const a=window.__qaApp;window.__flameStart();const d=a.duel,s=d.state;
        const view='${view}';let beforeArmor=s.rival.armor;
        if(view==='cinder'){
          d.setInput({interact:true});for(let i=0;i<50&&!s.onFoot;i++)d.step(1/120);
          d.setInput({interact:false});if(!s.onFoot)throw Error('Cinder could not exit');d.selectFootGear(3);
          // Face an open stretch beside the parked car so the full native sector is visible.
          s.fighter.yaw+=Math.PI/2;s.fighter.pitch=0;
          d.setFighterInput({fire:true});d.step(1/120);window.__flamePaint(true);
          for(let i=1;i<48;i++)d.step(1/120);
          if(!s.fighter.flaming)throw Error('Cinder did not fire native Hand Flamer');
        }else{
          const targetS=view==='burning'?506:512;
          window.__flamePlace(s.rival,targetS);window.__flameAim();
          if(!d.fireWeapon('flamethrower'))throw Error('Native car flame did not fire');
          window.__flameTick(view==='start'?10:view==='full'?60:365,targetS);
          if(view==='burning'){
            if(s.combat.flameBursts.length)throw Error('Body-fire shot must follow burst');
            const victimId=s.rival.arenaId||'cpu:'+s.opponents.indexOf(s.rival);
            if(!(s.combat.flameBurns[victimId]?.remainingSec>0))throw Error('Native victim burn timer is not active');
          }
          if(view==='burning'&&!(s.rival.armor<beforeArmor))throw Error('Native flame did not contact rival');
          if(view!=='burning'&&s.rival.armor!==beforeArmor)throw Error('Flame damaged car outside native range');
        }
        window.__flamePaint(view==='cinder');
        let footprint=null;
        if(${report.variant==='after'}&&view!=='burning'){
          const foot=view==='cinder',group=window.__render.scene.getObjectByName(foot?'crew-flamer':'arsenal-flame-0');
          if(!group?.visible)throw Error('Native firing state has no visible flame');
          const tongue=group.getObjectByName('CC0 rolling flame tongues'),uniforms=tongue.material.uniforms;
          const range=foot?6:9,halfAngle=foot?Math.acos(Math.cos(35*Math.PI/360)/Math.cos(s.fighter.pitch||0)):Math.PI/12;
          const at=foot?s.fighter:d.course.groundAt(s.s,s.lateral),heading=foot?s.fighter.yaw:at.heading+s.headingError;
          if(Math.hypot(group.position.x-at.x,group.position.z-at.z)>1e-8||
            Math.abs(uniforms.flameRange.value-range)>1e-8||Math.abs(uniforms.flameHalfAngle.value-halfAngle)>1e-8)
            throw Error('Visual footprint origin/range/angle differs from native damage cone');
          const errors=[-halfAngle,0,halfAngle].map(angle=>{
            const end=group.localToWorld(group.position.clone().set(Math.sin(angle)*range,0,Math.cos(angle)*range));
            return Math.hypot(end.x-at.x-Math.sin(heading+angle)*range,end.z-at.z-Math.cos(heading+angle)*range);});
          if(Math.max(...errors)>1e-8)throw Error('Transformed flame endpoints differ from damage cone');
          footprint={range,fullAngleDegrees:halfAngle*360/Math.PI,originError:Math.hypot(group.position.x-at.x,group.position.z-at.z),maxEndpointError:Math.max(...errors)};
        }
        if(${report.variant==='after'}&&view==='burning'&&!window.__render.scene.getObjectByName('burning-car-1')?.visible)
          throw Error('Native remaining burn has no body flames');
        return {view,footprint,quality:'${quality}',raceStateUnchanged:true,
          burnRemainingSec:s.combat.flameBurns?.[s.rival.arenaId||'cpu:'+s.opponents.indexOf(s.rival)]?.remainingSec||0,
          bursts:s.combat.flameBursts.length,armorLost:beforeArmor-s.rival.armor,flaming:!!s.fighter?.flaming};})()`);
      // Repaint while textures and any native model requests settle, without advancing rules.
      await c.waitFor(`(()=>{window.__flamePaint(${view==='cinder'});return window.__qaApp.visualReady&&window.__flameTexturesReady();})()`,'flame pose ready',60000);
      const path=await c.screenshot(quality+'-'+view);report.captures.push({...witness,path});
    }
    if(process.env.FLAME_POLISH_FRAMES==='1') {
      const frames=await c.evaluate(`new Promise((done,reject)=>{const a=window.__qaApp,d=a.duel,r=window.__render;
        window.__flameStart();const s=d.state;s.rival.weaponLoadout=['flamethrower'];s.combat.aiTimer=0;
        if(!d.fireWeapon('flamethrower'))return reject(Error('Player flame failed'));
        window.__flameTick(60);if(s.combat.flameBursts.length!==2)return reject(Error('CPU did not fire second native flame'));
        window.__flamePaint();const before=JSON.stringify(s),rows=[];let last;
        function tick(t){a.onFrame(s,0);r.renderFrame();if(last!==undefined)rows.push(t-last);last=t;
          if(rows.length<240)return requestAnimationFrame(tick);const sorted=[...rows].sort((x,y)=>x-y);
          if(JSON.stringify(s)!==before)return reject(Error('Frame sampling changed race state'));
          done({samples:rows.length,meanMs:rows.reduce((x,y)=>x+y,0)/rows.length,p95Ms:sorted[Math.ceil(rows.length*.95)-1],
            calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,activeFlamethrowers:s.combat.flameBursts.length});}
        requestAnimationFrame(tick);})`);
      report.frames.push({quality,...frames});
    }
  }
  await writeFile(join(c.outputDir,'polish-flame.json'),JSON.stringify(report,null,2)+'\n');
}
