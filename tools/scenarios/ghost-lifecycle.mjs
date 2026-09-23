// Race a real memory-only ghost, then switch mode without changing the car.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__game && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value", 'isolated production menu', 60_000);
  const started=await context.evaluate("window.__game.startCampaign({mode:'timetrial',car:'falcone_f42',startStage:0})");
  if(!started)throw Error('Time Trial did not start.');
  await context.waitFor("window.__game.state.status==='racing' && document.querySelector('#view3d canvas')?.style.visibility!=='hidden'", 'render-ready Time Trial', 25_000);
  await context.evaluate("window.__game.autopilotOn()");
  let status='racing';
  for(let step=0;step<70&&status!=='stage_result';step++){
    status=await context.evaluate("(() => {window.__game.advance(3);return window.__game.state.status})()");
  }
  const recorded=await context.evaluate("({status:window.__game.state.status,recorded:window.__game.state.results?.ghostRecorded})");
  if(recorded.status!=='stage_result'||!recorded.recorded)throw Error(`Time Trial did not record a real ghost: ${JSON.stringify(recorded)}`);
  await context.evaluate("window.__game.restart()");
  await context.waitFor("window.__game.state.status==='racing' && document.querySelector('#view3d canvas')?.style.visibility!=='hidden'", 'ghost replay ready', 25_000);
  const present=await context.evaluate(`(() => {
    window.__render.renderFrame();
    const ghost=window.__render.scene.getObjectByName('Personal best ghost');
    if(ghost)window.__qaGhostRef=ghost;
    return !!ghost;
  })()`);
  if(!present)throw Error('Recorded ghost did not create a renderer model.');
  await context.evaluate(`(() => {
    const shading=window.__render.composer.passes.find(pass=>typeof pass.refresh==='function');
    const refresh=shading.refresh.bind(shading);
    window.__qaShadingRefreshes=0;
    shading.refresh=()=>{window.__qaShadingRefreshes++;return refresh();};
    if(!window.__game.startCampaign({mode:'duel',car:'falcone_f42',startStage:0}))throw Error('Duel did not start');
    window.__render.renderFrame();
  })()`);
  const retired=await context.evaluate(`(() => ({
    ghostInScene:!!window.__render.scene.getObjectByName('Personal best ghost'),
    formerParent:window.__qaGhostRef?.parent?.name||null,
    refreshes:window.__qaShadingRefreshes,
    car:window.__game.state.car,
    mode:window.__game.state.mode,
  }))()`);
  if(retired.ghostInScene||retired.formerParent||retired.refreshes<1||retired.car!=='falcone_f42'||retired.mode!=='duel')
    throw Error(`Ghost remained after same-car mode switch: ${JSON.stringify(retired)}`);
  console.log('Same-car Time Trial to Duel transition retired the hidden ghost and refreshed ambient shading.');
}
