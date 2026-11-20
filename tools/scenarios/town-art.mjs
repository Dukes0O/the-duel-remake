// TOWN-VIEW-ART: Claude's look check of the town drawn from its art families, with memory-only saves. It builds a
// town of a few hundred buildings south of the Dome, with one burnt and one ruined building beside the main street,
// then shows it from the mayor's camera, from the street, at night, and from the driver's seat.
//
// Where to look (the pictures are in this scenario's output folder):
// - town-art-mayor: the mayor's camera, 90 m out at 45 degrees, over the main street. Homes along each street are
//   never the same model twice in a row. The burnt clinic (black frame, left of the camera's middle) and the ruined
//   tavern (rubble, right of it) stand on the near side of the main street. Street things (bins, barrels, crates,
//   benches, washing lines by homes, lamps) sit along the road edges, and none on the newest street at the far end.
// - town-art-street: the street camera, 28 m out, at the burnt clinic: the burnt ruin fills its 2 by 2 plot.
// - town-art-high: the camera pulled back about 760 m: the far pieces are plain coloured shapes, one draw each.
// - town-art-night: the mayor's camera at nine in the evening: lamps on homes and street lamps glow.
// - town-art-drive and town-art-drive-ruins: the driver's seat on the main street, looking along it, then at the
//   burnt and ruined buildings. The town is drawn as in the town view (no Dome, outposts or Mrs Vane's yard there).
// Look at: piece scale against the 8 m cells, that no piece floats or sinks, the fronts facing their road, the power
//   depot's floating shelter and the Dome gate (TOWN-ART-POWER and TOWN-ART-DOME notes), and frame pacing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const entry = '/tools/menu-check.html?flags=wasteland-town';
const frames = `new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))`;

// The stage town, built in the page: a main street at z cell 26 and five side streets, homes along each road,
// works and services behind them, and a burnt clinic and a ruined tavern on the main street.
const stage = `(() => {
  const host=document.querySelector('.town-entry'),town=host.__town;
  const rows={'town-hall':[3,3],'soup-kitchen':[2,1],bathhouse:[2,2],clinic:[2,2],tavern:[2,2],forge:[2,2],workshop:[3,2],'trading-post':[3,2],
    school:[3,2],'fire-station':[3,2],'water-tower':[2,2],'pump-house':[2,2],greenhouse:[3,2],'goat-pen':[2,2],'salvage-yard':[3,3],sawmill:[3,2],
    kiln:[2,2],warehouse:[3,3],'motor-pool':[4,2],'solar-rack':[2,2],'fuel-depot':[3,2],'guard-post':[2,1],generator:[2,1],'toll-bank':[2,2],
    'old-ground':[3,3],'wreck-ring':[3,3]};
  const small=['hand-well','latrine','chicken-run','windmill','standpipe','compost-heap','watchtower','radio-mast'];
  let n=0;
  const add=(buildingId,x,z,state='finished',size=rows[buildingId]||[1,1])=>{const b={id:'art-'+(++n),buildingId,regionId:'scablands',x,z,width:size[0],depth:size[1],state,groundY:0};town.buildings.push(b);return b;};
  // Streets: the main street first (oldest), then side streets, the last one laid only this year.
  for(let x=-24;x<=24;x++)add('road-dirt',x,26);
  for(const [z,kind] of [[20,'road-plank'],[32,'road-dirt'],[38,'road-paved'],[44,'road-dirt']])for(let x=-24;x<=24;x++)add(kind,x,z);
  for(const x of [-25,25])for(let z=20;z<=44;z++)if(![20,26,32,38,44].includes(z))add('road-dirt',x,z);
  // Homes face each street from its south side (their fronts face -Z, the road).
  let plot=0;
  for(const z of [21,27,33,39])for(let x=-24;x<=24;x++){if(z===27&&x>=-8&&x<=8)continue;town.homePlots.push({id:'art-plot-'+(++plot),regionId:'scablands',x,z,tier:1+((x*7+z*3)&1023)%5,groundY:0});}
  // Works and services behind the homes, packed along each block.
  const big=Object.keys(rows);let k=0;
  for(const z of [23,29,35,41])for(let x=-24;x<=24;){const id=(k%3===2)?small[k%small.length]:big[k%big.length];k++;const size=rows[id]||[1,1];if(x+size[0]>25)break;add(id,x,z,'finished',size);x+=size[0];}
  // One burnt and one ruined building, and a site at its frame, on the main street.
  const burnt=add('clinic',-6,27,'burnt-6'),ruined=add('tavern',2,27,'ruined');add('forge',6,27,'frame');add('fence-wood',-8,27);add('wall-scrap',-3,28);
  town.book=(town.book||[]).concat([{type:'passing',name:'Old Jem'},{type:'passing',name:'Nan Rook'}]);
  town.tick=BigInt(6*360*24);
  return {buildings:town.buildings.length,plots:town.homePlots.length,burnt:burnt.id,ruined:ruined.id};
})()`;

export async function run(context) {
  const report = {facts:[], notes:[]}, fail = [];
  const fact = (ok, label) => { report.facts.push({ok:!!ok, label}); if (!ok) fail.push(label); };
  await context.navigate(entry);
  await context.waitFor('!!window.__qaApp', 'the game app', 90_000);
  await context.evaluate(`(()=>{const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Town Art QA');
    app.profile={...app.profile,wasteland:{version:1,discoveredGate:true,scrap:0,rank:1}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);return true;})()`);
  await context.waitFor(`window.__qaApp.isYardHomeActive()&&!!document.querySelector('[data-action="yard-the-town"]')`, 'the yard and its THE TOWN button');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor('!!document.querySelector(".town-entry form")', 'the new town form');
  await context.evaluate(`(()=>{const form=document.querySelector('.town-entry form');form.querySelector('[name="name"]').value='Art Town';form.requestSubmit();})()`);
  await context.waitFor('!!document.querySelector(".town-entry [data-town-action=drive]")', 'the town screen');
  await context.evaluate(`document.querySelector('[data-town-speed="0"]')?.click()`);
  const built = await context.evaluate(stage);
  fact(built.buildings + built.plots >= 300, `the stage town holds ${built.buildings} buildings and roads and ${built.plots} homes`);
  const look = (zoom, x, z, hour = 12) => `(()=>{const state=document.querySelector('.town-entry').__townLife();const view=state.camera.userData.townView;
    view.zoom=${zoom};view.target.set(${x},view.target.y,${z});view.heading=Math.PI;state.timeOfDay=${hour};return true;})()`;
  const ready = `(()=>{const stats=document.querySelector('.town-entry').__townLife().art.stats();return stats.waiting===0&&stats.instances>100;})()`;
  const mayor = '62/(24500-28)';
  await context.evaluate(look(mayor, -16, 230));
  await context.waitFor(ready, 'the town drawn from its art', 120_000);
  await context.evaluate(frames); await context.evaluate(frames);
  const mayorStats = await context.evaluate(`document.querySelector('.town-entry').__townLife().art.stats()`);
  fact(mayorStats.instances > 100, `the mayor's camera draws ${mayorStats.instances} pieces in ${mayorStats.drawCalls} draw calls (${mayorStats.triangles} triangles)`);
  await context.screenshot('town-art-mayor');
  await context.evaluate(look(0, -40, 225)); await context.waitFor(ready, 'the street view', 30_000); await context.evaluate(frames);
  await context.screenshot('town-art-street');
  await context.evaluate(look(.03, 0, 260)); await context.waitFor(ready, 'the high view', 30_000); await context.evaluate(frames);
  const highStats = await context.evaluate(`document.querySelector('.town-entry').__townLife().art.stats()`);
  fact(highStats.drawCalls < mayorStats.drawCalls, `from high up the town takes fewer draws (${highStats.drawCalls}, ${highStats.triangles} triangles)`);
  await context.screenshot('town-art-high');
  await context.evaluate(look(mayor, -16, 230, 21)); await context.evaluate(frames); await context.evaluate(frames);
  const lit = await context.evaluate(`document.querySelector('.town-entry').__townLife().artLibrary.lit`);
  fact(lit === true, 'at nine in the evening the lamps are lit');
  await context.screenshot('town-art-night');
  // The driver's seat: DRIVE, then put the car on the main street looking along it.
  await context.evaluate(`window.__townArtTown=document.querySelector('.town-entry').__town;document.querySelector('.town-entry [data-town-action="drive"]').click()`);
  const driving = `(()=>{const app=window.__qaApp;return app.duel.state.arena?.worldJob?.definition?.kind==='town-drive'&&app.duel.state.status==='racing';})()`;
  // If the button's save before leaving does not finish (as in a cloud container's QA build), start the drive directly.
  try { await context.waitFor(driving, 'the town drive from its button', 20_000); }
  catch { report.notes.push('DRIVE did not start the drive within 20 s; the scenario started it with app.startTownDrive.'); await context.evaluate(`window.__qaApp.startTownDrive(window.__townArtTown)`); }
  await context.waitFor(driving, 'the town drive', 90_000);
  await context.waitFor(`!!window.__render?.scene?.getObjectByName('Town art')?.children.some(mesh=>mesh.count>0)`, 'the town art in the drive', 120_000);
  await context.evaluate(`(()=>{const app=window.__qaApp,state=app.duel.state,point=app.duel.course.nearest(-150,212);state.s=point.s;state.lateral=point.lateral;return true;})()`);
  await context.evaluate(frames); await context.evaluate(frames);
  await context.screenshot('town-art-drive');
  await context.evaluate(`(()=>{const app=window.__qaApp,state=app.duel.state,point=app.duel.course.nearest(-20,205);state.s=point.s;state.lateral=point.lateral;return true;})()`);
  await context.evaluate(frames); await context.evaluate(frames);
  await context.screenshot('town-art-drive-ruins');
  report.notes.push('Claude: judge the look in each picture (see the list at the top of this file), drive the main street by hand, and time frames on Performance at the mayor camera.');
  await writeFile(join(context.outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (fail.length) throw Error('Town art facts failed: ' + fail.join(' | '));
}
