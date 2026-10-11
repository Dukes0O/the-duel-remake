import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// SCRAPDOME-TANKER-FIX look pass: pictures of a real Fuel Run on both venues
// in both graphics modes. Fixtures are only poses inside disposable memory
// storage; the pickups, carrying and depots are the production rules.
async function settled(context, label) {
  await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;
    a.onFrame?.(a.duel.state,0);r.renderFrame();return a.visualReady&&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`, label, 60_000);
}

async function start(context, quality, venue) {
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Fuel look needs memory-only QA storage');
    a.duel.state.wastelandGateDiscovered=true;
    a.setGraphicsQuality(${JSON.stringify(quality)});
    for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
    if(!a.duel.startArenaEvent({venueId:${JSON.stringify(venue)},mode:'fuel-run',seed:1989,
      car:'falcone_f42',cpuDifficulty:'medium',opponents:[{car:'dusthawk_rally'},{car:'aurora_gt'},{car:'stuttgart_959s'}]}))
      throw Error('Native Fuel Run entry failed');
    a.duel.state.countdown=0;
    for(let tick=0;tick<420;tick++)a.duel.step(1/120);
    const hold=a.duel.state.arena.participants.filter(p=>p.id!=='player');
    for(const p of hold){const actor=a.duel.state.opponents.find(o=>o.arenaId===p.id);
      if(actor)Object.assign(actor,{speedMph:0,combatWrecking:true,combatWreckTimer:100000});}
    window.__look={pose:(p,hd=0)=>Object.assign(a.duel.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,
      speedMph:0,headingError:hd,yawVelocity:0,pushVelocity:0,knock:null,airborne:false,airHeight:0}),
      tick:n=>{for(let i=0;i<n;i++)a.duel.step(1/120);}};
    a.inspectionCamera=null;a.onFrame?.(a.duel.state,0);})()`);
  await settled(context, quality+' '+venue+' fuel world');
}

async function shot(context, name, code) {
  await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,L=window.__look;${code}
    a.onFrame?.(d.state,0);window.__render.renderFrame();})()`);
  await settled(context, name);
  return context.screenshot(name);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const report={captures:[]};
  try {
    for (const quality of ['high','performance']) {
      for (const venue of ['scrapdome','salt-flats']) {
        await context.navigate('/tools/menu-check.html?flags=fuel-run,salt-flats&harness=fuel-look-'+quality+'-'+venue);
        await context.waitFor('!!window.__qaApp&&!!window.__render','Fuel QA menu',60_000);
        await start(context, quality, venue);
        const key = quality+'-'+venue;
        report.captures.push(await shot(context, key+'-1-start', `L.tick(1)`));
        report.captures.push(await shot(context, key+'-2-pickup',
          `const pad=d.state.arena.fuelRun.pads[0];L.pose({s:pad.s-14,lateral:pad.lateral});L.tick(2);`));
        report.captures.push(await shot(context, key+'-3-depots',
          `const pad=d.state.arena.fuelRun.pads[0];L.pose(pad);L.tick(2);
           const depot=d.state.arena.fuelRun.depots[0];L.pose({s:depot.s-30,lateral:depot.lateral+2});L.tick(1);`));
        report.captures.push(await shot(context, key+'-4-wall',
          `L.pose({s:d.course.length*.3,lateral:d.course.def.scrapdome.floorHalfWidth-.2},0);L.tick(2);`));
        report.captures.push(await shot(context, key+'-5-full',
          `const f=d.course.worldAt(0),o=d.course.worldAt(d.course.length/2),cx=(f.x+o.x)/2,cz=(f.z+o.z)/2;
           a.inspectionCamera={position:[cx+110,150,cz+160],target:[cx,0,cz]};`));
      }
    }
    report.passed = true;
  } catch (error) { report.passed = false; report.failure = error.stack; throw error; }
  finally { await writeFile(join(context.outputDir,'arena-fuel-look.json'), JSON.stringify(report,null,2)+'\n'); }
}
