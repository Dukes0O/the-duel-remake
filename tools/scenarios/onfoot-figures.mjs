const holdF = (context, type) => context.command('Input.dispatchKeyEvent',
  {type, key:'f', code:'KeyF', windowsVirtualKeyCode:70});

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",
    'private Wasteland figure scene',60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const s=app.duel.state;
    Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,
      prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[],opponents:[]});
    s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    window.__render.renderFrame();app.onFrame?.(s);
  })()`);
  await context.waitFor('window.__qaApp.visualReady === true',
    'Wasteland renderer ready',60_000);
  await holdF(context,'keyDown');
  const view=await context.evaluate(`(() => {
    const app=window.__qaApp;app.advance(.42);
    window.__render.renderFrame();app.onFrame?.(app.duel.state);
    const f=app.duel.state.fighter, render=window.__render;
    const figure=render.scene.getObjectByName('On-foot fighters');
    const plates=figure?.getObjectByName('fighter-plates');
    plates?.onBeforeRender(null,null,render.camera);
    const hiddenInEye=plates?.count===0;
    if(!f||!app.duel.state.onFoot||!figure?.visible||!hiddenInEye)
      throw Error('Fighter figure or first-person hiding failed');
    const side={x:Math.cos(f.yaw),z:-Math.sin(f.yaw)};
    const forward={x:Math.sin(f.yaw),z:Math.cos(f.yaw)};
    app.inspectionCamera={position:[f.x+side.x*3+forward.x*4,f.y+2.3,
      f.z+side.z*3+forward.z*4],target:[f.x,f.y+1,f.z]};
    render.renderFrame();plates.onBeforeRender(null,null,render.camera);
    return {hiddenInEye,visibleFromOutside:plates.count===12,
      figureMeshes:figure.children.filter(child=>child.isInstancedMesh).length,
      fighter:{x:f.x,y:f.y,z:f.z}};
  })()`);
  await holdF(context,'keyUp');
  if(!view.visibleFromOutside||view.figureMeshes!==4)
    throw Error(`Fighter inspection view failed: ${JSON.stringify(view)}`);
  await context.screenshot('onfoot-standing-figure');
  await context.evaluate(`(() => {
    const app=window.__qaApp,f=app.duel.state.fighter;
    f.knockedDown=true;f.knockdownRemaining=3;f.health=0;
    window.__render.renderFrame();
  })()`);
  await context.screenshot('onfoot-knocked-down-figure');
  console.log(`Private on-foot figure and first-person hiding: ${JSON.stringify(view)}`);
}
