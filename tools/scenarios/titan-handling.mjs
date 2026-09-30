import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(()=>{window.__qaApp?.onFrame?.(window.__qaApp.duel.state,0);window.__render?.renderFrame();return window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)&&
    document.querySelector('#renderer-loading')?.hidden})()`, label, 60_000);
}

// Real released terrain and renderer, disposable in-memory career only.
// The headless suite measures Rally and unchanged high-speed controls.
export async function run(context) {
  const report={frames:[],manualFeel:'Kyle Preview check pending'};
  for(const quality of ['high','performance']) {
    await context.navigate('/tools/menu-check.html?harness='+quality);
    await context.waitFor(`!!window.__qaApp&&document.readyState==='complete'&&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,quality+' isolated menu',60_000);
    await ready(context,quality+' menu');
    await context.evaluate(`(()=>{
      const a=window.__qaApp;a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
      a.profile={...a.profile,unlockedCars:[...new Set([...a.profile.unlockedCars,'titan_monster'])],
        courses:{...a.profile.courses,unlocked:[...new Set([...a.profile.courses.unlocked,'high-country'])]},
        wasteland:{...a.profile.wasteland,discoveredGate:true}};
      if(!a._saveProfile())throw Error('Memory-only profile fixture failed');
      if(!a.startCampaign({mode:'timetrial',startStage:1,seed:1989,
        car:'titan_monster',difficulty:'casual',opponentCount:0}))throw Error('Titan start failed');
      a.stop();a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
    })()`);
    await ready(context,quality+' Titan');
    for(const [site,speed] of [['pit',12],['hill',25]]) {
      const frame=await context.evaluate(`(()=>{
        const a=window.__qaApp,d=a.duel,s=d.state,z=d.course.muddyHollow;
        if(!z)throw Error('Released Titan course lacks Muddy Hollow');
        const center=${JSON.stringify(site)}==='pit'?z.landforms.pits[0].center:z.landforms.hill.center;
        const heading=z.frame.heading;
        const point=${JSON.stringify(site)}==='pit'?center:
          {x:center.x-Math.sin(heading)*35,z:center.z-Math.cos(heading)*35};
        const near=d.course.nearest(point.x,point.z,z.frame.s);
        const ground=d.course.groundAt(near.s,near.lateral);
        const before={scrap:a.profile.wasteland.scrap,history:a.profile.history.length};
        Object.assign(s,{status:'exploring',paused:false,countdown:0,
          s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
          speedMph:${speed},gear:0,headingError:heading-d.course.at(near.s).heading,
          steerVisual:1,yawVelocity:0,slipAngle:0,pushVelocity:0,knock:null,tumble:null,
          airborne:false,airHeight:0,prevAirHeight:0,_jumpY:null,_verticalSpeed:0,
          groundHeight:ground.y,prevGroundHeight:ground.y,terrainPitch:0,terrainRoll:0,
          traffic:[],opponents:[],rival:null,impactTimer:0});
        // Enter the real exploration branch; all hubcaps already owned in this QA fixture.
        Object.assign(s.muddyHollowDeparture,{departed:true,elapsedSec:1});
        s.muddyHollowHubcaps.found=z.collectibles.map(item=>item.id);
        d.setInput({throttle:0,brake:0,steer:1,boost:false});
        const start=d.course.worldAt(s.s,s.lateral),startHeading=d.course.at(s.s).heading+s.headingError;
        for(let tick=0;tick<120;tick++)d.step(1/120);
        d._terrainPose();a.onFrame?.(s,0);
        const end=d.course.worldAt(s.s,s.lateral),groundEnd=d.course.groundAt(s.s,s.lateral);
        a.inspectionCamera={position:[end.x-Math.sin(heading)*30,groundEnd.y+15,
          end.z-Math.cos(heading)*30],target:[end.x,groundEnd.y+2,end.z]};
        window.__render.renderFrame();
        const turn=Math.atan2(Math.sin(d.course.at(s.s).heading+s.headingError-startHeading),
          Math.cos(d.course.at(s.s).heading+s.headingError-startHeading));
        const answer={quality:${JSON.stringify(quality)},site:${JSON.stringify(site)},initialSpeed:${speed},
          car:s.car,lowSpeedSteer:d.car.lowSpeedSteer,speedMph:s.speedMph,
          yawVelocity:s.yawVelocity,turn,offRoad:s.offRoad,mud:s.surfaceMud,
          moved:Math.hypot(end.x-start.x,end.z-start.z),status:s.status,
          memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
          unchangedCareer:before.scrap===a.profile.wasteland.scrap&&before.history===a.profile.history.length};
        if(!answer.memoryOnly||!answer.unchangedCareer||answer.car!=='titan_monster'||
          !answer.lowSpeedSteer||!Number.isFinite(turn)||Math.abs(turn)<.01||answer.moved<.1)
          throw Error('Titan terrain steering did not run: '+JSON.stringify(answer));
        return answer;
      })()`);
      await ready(context,quality+' '+site+' turn');
      await context.screenshot(site+'-'+quality);
      report.frames.push(frame);
    }
  }
  await writeFile(join(context.outputDir,'titan-handling-browser.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Titan handling: four released-terrain turn captures; human Preview feel remains pending.');
}
