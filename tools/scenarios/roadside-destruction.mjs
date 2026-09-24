// The released roadside rule is on in Wasteland without a feature switch.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled", 'isolated menu and renderer', 60_000);
  const result = await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))throw Error('Wasteland race did not start');
    app.stop();
    const duel=app.duel,state=duel.state;
    if(!duel.destructionEnabled())throw Error('Released roadside destruction is unavailable');
    const candidates=duel.course.features.obstacles.filter(item=>item.kind==='tree'&&item.theme!=='desert'&&(item.scale??1)<=1.1);
    if(!candidates.length)throw Error('No small roadside tree found');
    let tree=null,fallen=null;
    for(const candidate of candidates){
      Object.assign(state,{status:'racing',invulnerableSec:0,impactTimer:0,prevS:candidate.s-1.5,s:candidate.s+1.5,
        prevLateral:candidate.off,lateral:candidate.off,speedMph:90,traffic:[],stageCrashes:0});
      duel._staticContacts(state,true);
      fallen=state.brokenScenery.find(item=>item.id===candidate.id);
      if(fallen){tree=candidate;break;}
    }
    if(!fallen)throw Error('No real small-tree sweep fell a tree');
    if(duel._obstacles(tree.s-1,tree.s+1).some(item=>item.id===tree.id))throw Error('Fallen tree still blocks the road');
    const point=duel.course.groundAt(tree.s,tree.off);
    app.inspectionCamera={position:[point.x+12,point.y+8,point.z+14],target:[point.x,point.y+2,point.z]};
    state.stageTimeSec=fallen.atTime+.8;
    app.onFrame?.(state);
    window.__render.renderFrame();
    return {tree:tree.id,speedMph:state.speedMph,crashes:state.stageCrashes};
  })()`);
  if(result.speedMph<60||result.crashes!==0)throw Error(`Small tree impact was too punitive: ${JSON.stringify(result)}`);
  await context.screenshot('roadside-destruction');
  console.log(`Roadside destruction: ${result.tree}, ${result.speedMph.toFixed(1)} mph after impact, no crash.`);
}
