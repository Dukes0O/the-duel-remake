// Review the full field in the real renderer and HUD with disposable saves.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'isolated menu and renderer', 60_000);
  const started=await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({startStage:0,opponentCount:3,seed:1989}))return false;
    const state=app.duel.state;
    state.status='racing';state.countdown=0;state.s=170;state.prevS=170;state.lateral=0;state.prevLateral=0;
    state.opponents.forEach((actor,index)=>{actor.s=190+index*22;actor.prevS=actor.s;actor.lateral=[-3.1,0,3.1][index];actor.prevLateral=actor.lateral;});
    document.querySelectorAll('details').forEach(panel=>{if(panel.querySelector('summary')?.textContent.includes('TEMPORARY SAVES')||panel.querySelector('summary')?.textContent.startsWith('Performance samples'))panel.hidden=true;});
    app.onFrame?.(state);window.__render.renderFrame();
    return true;
  })()`);
  if(!started)throw Error('Three-opponent QA race did not start.');
  await context.waitFor(`window.__qaApp.duel.state.opponents.length===3 &&
    window.__render.scene.children.filter(child=>child.userData.vehicleKey).length>=4 &&
    document.querySelector('#race-position')?.textContent==='04' &&
    document.querySelector('#route-map')?.getAttribute('aria-label')?.includes('3 opponents')`,
  'four rendered cars, four-place HUD and three-opponent map', 30_000);
  const state=await context.evaluate(`(() => ({
    cars:window.__render.scene.children.filter(child=>child.userData.vehicleKey).length,
    opponents:window.__qaApp.duel.state.opponents.length,
    rank:document.querySelector('#race-position').textContent,
    total:document.querySelector('#position-total').textContent,
    map:document.querySelector('#route-map').getAttribute('aria-label'),
    storageIsMemory:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value
  }))()`);
  if(state.cars<4||state.opponents!==3||state.rank!=='04'||state.total!=='/04'||!state.storageIsMemory)
    throw Error(`Three-opponent browser presentation failed: ${JSON.stringify(state)}`);
  await context.screenshot('three-opponent-field');
  console.log(`Three-opponent browser: ${state.cars} car models, rank ${state.rank}${state.total}, map announces all opponents.`);
}
