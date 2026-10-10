import {checkCarHeightCrossing, checkNativeUfo} from '../collider-heights.mjs';

export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled", 'memory-only game', 60_000);
  const rows=[];
  for (const quality of ['high','performance']) {
    await context.evaluate(`(() => {
      const select=document.querySelector('#graphics-quality');select.value=${JSON.stringify(quality)};
      select.dispatchEvent(new Event('change',{bubbles:true}));
    })()`);
    for (const [id,stage] of [['pacific-canyon',0],['high-country',1],['pit',null]]) {
      const result=await context.evaluate(`(() => {
        const app=window.__qaApp;app.stop();const duel=app.duel;
        duel.state.wastelandGateDiscovered=true;
        if (${JSON.stringify(id)}==='pit') {
          if(!duel.startArenaEvent({venueId:'pit',car:'falcone_f42',seed:1989,
            opponents:[{car:'dusthawk_rally'}]}))throw Error('Native Pit did not start');
        } else duel.startCampaign({startStage:${stage},car:'falcone_f42',seed:1989,
          mode:'wasteland',difficulty:'casual'});
        duel.state.status='racing';
        const obstacles=duel.course.features.obstacles;
        const targets=${JSON.stringify(id)}==='pit'?
          [obstacles.find(o=>o.id==='pit-wall-0'),obstacles.find(o=>o.id==='pit-centre-pile')]:
          [obstacles.find(o=>o.barrier),obstacles.find(o=>o.kind==='rock')];
        const check=${checkCarHeightCrossing.toString()};const results=[];
        for(const target of targets)for(const mode of ['grounded','touch','clear'])
          results.push(check(duel,target,mode));
        const ufo=(${checkNativeUfo.toString()})(duel);
        app.onFrame?.(duel.state,0);window.__render.renderFrame();
        return {course:duel.course.def.id,results,ufo,memory:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
      })()`);
      if (result.course!==id || !result.memory) throw Error('Wrong course or storage');
      rows.push({quality,...result});
      await context.waitFor("(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();return document.querySelector('#view3d').dataset.vehicleAsset==='ready' && document.querySelector('#renderer-loading').hidden;})()",'vehicle ready',60_000);
      await context.screenshot(`height-${id}-${quality}`);
    }
  }
  console.log(JSON.stringify({nativeCrossings:rows.reduce((sum,row)=>sum+row.results.length,0),qualities:2,courses:3,ufo:rows.map(row=>row.ufo)}));
}
