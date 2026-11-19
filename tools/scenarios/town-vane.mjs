// TOWN-VANE-SCENE: Claude runs this browser check with memory-only saves. It gives a new town (in memory only) two of Mrs Vane's kiosks on
// brown streets and every deed of two territories, starts a town drive, and takes a picture of a kiosk at the town's edge, of each of the
// two sites, and of Vane Reach from the Dry Dam. Claude judges the look: pads in the ground, nothing floating, white against the dust.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function run(context) {
  const report = {facts: [], notes: [], stands: []}, fail = [];
  const fact = (ok, label) => { report.facts.push({ok: !!ok, label}); if (!ok) fail.push(label); };
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp', 'the game app', 90_000);
  await context.evaluate(`(()=>{
    const app=window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('Vane QA');
    app.profile={...app.profile,wasteland:{version:1,discoveredGate:true,scrap:0,rank:1}};
    app._saveProfile();
    app.visitWasteland();
    return true;
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive() && !!document.querySelector(\'[data-action="yard-the-town"]\')', 'the yard and its THE TOWN button');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor('!!document.querySelector(".town-entry form")', 'the new town form');
  await context.evaluate(`(()=>{const form=document.querySelector('.town-entry form');form.querySelector('[name="name"]').value='Vane town';form.requestSubmit();})()`);
  await context.waitFor('!!document.querySelector(".town-entry [data-town-action=drive]")', 'the town screen DRIVE button');
  await context.evaluate(`(()=>{
    const host=document.querySelector('.town-entry'),town=host.__town;
    // In memory only: two brown streets with her kiosks, and every deed of the Dry Dam's and the Ridge road's territories.
    town.utilities??={};town.utilities.taps=[...(town.utilities.taps??[]),{id:'qa-east-street',x:90,z:-110},{id:'qa-north-street',x:0,z:-230}];
    town.vane={...(town.vane??{}),started:true,kiosks:[{id:'vane-kiosk-1',streetId:'qa-east-street',openedMonth:80,open:true},
      {id:'vane-kiosk-2',streetId:'qa-north-street',openedMonth:84,open:true}]};
    town.deeds??={version:1,items:{}};town.deeds.items??={};
    for(const id of ['blackiron-road','blackiron-works','blackiron-outpost','tollkeeper-road','tollkeeper-works','tollkeeper-outpost'])
      town.deeds.items[id]={...(town.deeds.items[id]??{}),ownerId:'vane'};
    host.querySelector('[data-town-action="drive"]').click();
    return true;
  })()`);
  await context.waitFor(`(()=>{const app=window.__qaApp;return app.duel.state.arena?.worldJob?.definition?.kind==='town-drive'&&app.duel.state.status==='racing';})()`, 'the town drive started', 90_000);
  await context.waitFor(`!!window.__render?.scene?.getObjectByName('Vane things')?.userData?.things?.length`, 'her things drawn in the Scablands', 90_000);
  await context.waitFor(`window.__render.scene.getObjectByName('Vane things').userData.things.every(thing=>thing.holder.children.length===1)`, 'every part of hers loaded', 90_000);
  const layout = await context.evaluate(`(()=>{
    const job=window.__qaApp.duel.state.arena.worldJob,vane=job.definition.layout?.vane,group=window.__render.scene.getObjectByName('Vane things');
    return {kiosks:vane?.kiosks?.length,sites:vane?.sites?.map(site=>site.territoryId),pieces:vane?.sites?.reduce((sum,site)=>sum+site.pieces.length,0),
      solid:job.solidGrid?.town?.length??0,errors:group.userData.loadErrors};
  })()`);
  fact(layout.kiosks === 2, 'two kiosks stand at the town\'s edge');
  fact(JSON.stringify(layout.sites) === JSON.stringify(['tollkeeper', 'blackiron']), 'her two territories show their sites');
  fact(layout.pieces === 12, 'each site has its billboard, depot, tank and white fences');
  fact(layout.solid > 40, 'her things are solid in the drive');
  fact(!layout.errors?.length, 'her things drew without a load error');
  // Where to stand: [what, x, z, and what to face].
  const stands = await context.evaluate(`(()=>{
    const vane=window.__qaApp.duel.state.arena.worldJob.definition.layout.vane,dam=${JSON.stringify({x: -4240, z: -3040})};
    const out=[];const front=(thing,distance,side=.4)=>{const c=Math.cos(thing.heading),s=Math.sin(thing.heading),lx=distance*side,lz=-distance;
      return {x:thing.x+lx*c+lz*s,z:thing.z-lx*s+lz*c};};
    const kiosk=vane.kiosks[0];out.push({id:'kiosk',at:front(kiosk,22),face:{x:kiosk.x,z:kiosk.z}});
    for(const site of vane.sites)out.push({id:'site-'+site.territoryId,at:front(site,55,.3),face:{x:site.x,z:site.z}});
    out.push({id:'vane-reach-from-the-dry-dam',at:{x:dam.x+40,z:dam.z+60},face:{x:vane.reach.x,z:vane.reach.z}});
    return out;
  })()`);
  for (const stand of stands) {
    report.stands.push({id: stand.id, at: {x: Math.round(stand.at.x), z: Math.round(stand.at.z)}, facing: {x: Math.round(stand.face.x), z: Math.round(stand.face.z)}});
    await context.evaluate(`(()=>{
      const app=window.__qaApp,state=app.duel.state,course=app.duel.course,at=${JSON.stringify(stand.at)},face=${JSON.stringify(stand.face)};
      const point=course.nearest(at.x,at.z),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
      state.status='racing';state.s=state.prevS=point.s;state.lateral=state.prevLateral=point.lateral;state.speedMph=0;
      state.headingError=wrap(Math.atan2(face.x-at.x,face.z-at.z)-course.at(point.s).heading);
      return true;
    })()`);
    await context.evaluate(`new Promise(resolve=>setTimeout(resolve,2000))`);
    await context.screenshot(`town-vane-${stand.id}`);
  }
  const reachShown = await context.evaluate(`window.__render.scene.getObjectByName('Vane things').userData.things.find(thing=>thing.placed.id==='vane-reach').holder.visible`);
  fact(reachShown, 'Vane Reach is drawn from the Dry Dam');
  report.notes.push('Claude: at each picture, look at the pad edges (in the ground, no gap, not buried), the white against the dust, the kiosk\'s counter facing the town, the billboard on the road side of each site, and Vane Reach far off and white beyond the Dry Dam.');
  report.notes.push('Then by hand: drive into a kiosk and between Vane Reach\'s legs; the car should stop at the kiosk and at the legs and shaft, and pass under the braces.');
  await writeFile(join(context.outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (fail.length) throw Error('Vane facts failed: ' + fail.join(' | '));
}
