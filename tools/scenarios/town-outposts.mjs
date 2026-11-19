// TOWN-OUTPOST-SCENE: Claude runs this browser check with memory-only saves. It starts a town drive with Dot protected, puts the car in
// front of each of the five outposts in turn (30 m out on its road side, facing it), and takes a picture of each. Claude judges the look:
// the pad's edges in the ground, nothing floating, the people standing about, Bo going round the school, Dot's fence with its gate.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const OUTPOSTS = ['dot-diner', 'plane-school', 'hermit-camp', 'deck-town', 'rail-halt'];

export async function run(context) {
  const report = {facts: [], notes: [], stands: []}, fail = [];
  const fact = (ok, label) => { report.facts.push({ok: !!ok, label}); if (!ok) fail.push(label); };
  await context.navigate('/tools/menu-check.html?flags=wasteland-town');
  await context.waitFor('!!window.__qaApp', 'the game app', 90_000);
  await context.evaluate(`(()=>{
    const app=window.__qaApp;
    app.audio.setMuted?.(true);
    app.addPlayer('Outpost QA');
    app.profile={...app.profile,wasteland:{version:1,discoveredGate:true,scrap:0,rank:1}};
    app._saveProfile();
    app.visitWasteland();
    return true;
  })()`);
  await context.waitFor('window.__qaApp.isYardHomeActive() && !!document.querySelector(\'[data-action="yard-the-town"]\')', 'the yard and its THE TOWN button');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor('!!document.querySelector(".town-entry form")', 'the new town form');
  await context.evaluate(`(()=>{const form=document.querySelector('.town-entry form');form.querySelector('[name="name"]').value='Outpost town';form.requestSubmit();})()`);
  await context.waitFor('!!document.querySelector(".town-entry [data-town-action=drive]")', 'the town screen DRIVE button');
  const protection = await context.evaluate(`(()=>{
    const host=document.querySelector('.town-entry');
    const result=host.__townCommand({type:'neighbourProtection',neighbourId:'dot',protected:true});
    host.querySelector('[data-town-action="drive"]').click();
    return result?.[0]?.ok===true;
  })()`);
  fact(protection, 'Dot is protected before the drive (her fence should stand)');
  await context.waitFor(`(()=>{const app=window.__qaApp;return app.duel.state.arena?.worldJob?.definition?.kind==='town-drive'&&app.duel.state.status==='racing';})()`, 'the town drive started', 90_000);
  await context.waitFor(`!!window.__render?.scene?.getObjectByName('Town outposts')?.userData?.sites?.length`, 'the outposts drawn in the Scablands', 90_000);
  await context.waitFor(`window.__render.scene.getObjectByName('Town outposts').userData.sites.every(site=>site.site.children.length===1)`, 'every outpost model loaded', 90_000);
  const layout = await context.evaluate(`(()=>{
    const app=window.__qaApp,job=app.duel.state.arena.worldJob,group=window.__render.scene.getObjectByName('Town outposts');
    return {count:job.definition.layout?.outposts?.outposts?.length,solid:job.solidGrid?.town?.length??0,
      errors:group.userData.loadErrors,fence:group.userData.sites.find(site=>site.outpost.id==='dot-diner').fence.children.length};
  })()`);
  fact(layout.count === 5, 'the drive carries the five outposts');
  fact(layout.solid > 50, 'the outposts are solid in the drive');
  fact(!layout.errors?.length, 'the outposts drew without a load error');
  fact(layout.fence >= 6, 'Dot\'s fence is drawn');
  for (const id of OUTPOSTS) {
    const stand = await context.evaluate(`(()=>{
      const app=window.__qaApp,state=app.duel.state,course=app.duel.course;
      const site=window.__render.scene.getObjectByName('Town outposts').userData.sites.find(item=>item.outpost.id===${JSON.stringify(id)});
      const o=site.outpost,c=Math.cos(o.heading),s=Math.sin(o.heading),out=${id === 'rail-halt' ? 24 : 30};
      // Out on the outpost's front (road) side, and a little to one side so the picture shows two faces.
      const lx=-out,lz=out*.35,x=o.x+lx*c+lz*s,z=o.z-lx*s+lz*c,point=course.nearest(x,z);
      const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a)),heading=Math.atan2(o.x-x,o.z-z);
      state.status='racing';state.s=state.prevS=point.s;state.lateral=state.prevLateral=point.lateral;state.speedMph=0;
      state.headingError=wrap(heading-course.at(point.s).heading);
      return {id:o.id,name:o.name,at:{x:Math.round(x),z:Math.round(z)},looking:Math.round(heading*180/Math.PI)};
    })()`);
    report.stands.push(stand);
    await context.waitFor(`(()=>{const site=window.__render.scene.getObjectByName('Town outposts').userData.sites.find(item=>item.outpost.id===${JSON.stringify(id)});
      return site.site.visible&&site.people.group.children.length===site.cast.length;})()`, `${id}: its people drawn`, 60_000);
    await context.evaluate(`new Promise(resolve=>setTimeout(resolve,1500))`);
    await context.screenshot(`town-outposts-${id}`);
  }
  const bo = await context.evaluate(`(()=>{const site=window.__render.scene.getObjectByName('Town outposts').userData.sites.find(item=>item.outpost.id==='plane-school');
    return site.cast.find(person=>person.id==='wim')?.distance??0;})()`);
  fact(bo > 0, 'Bo went round the school while the car stood there');
  report.notes.push('Claude: at each picture, look at the pad edges (in the ground, no gap, not buried to the roof), the people (standing on the ground or on Deck Town\'s walkways and the halt\'s platform), Bo near the school, the fence round Dot\'s Diner with its open gate on the road side, and Tam\'s goats and Tuesday once WILD-ART-WASTE has added their models.');
  report.notes.push('Then drive into the diner and along the fence by hand: the car should stop at the walls and the fence, and Dot should step aside.');
  await writeFile(join(context.outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (fail.length) throw Error('Town outpost facts failed: ' + fail.join(' | '));
}
