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
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.advance(.42);
    window.__render.renderFrame();app.onFrame?.(app.duel.state);
    if(!app.duel.state.onFoot||!app.duel.state.fighter)
      throw Error('F-key exit did not create a fighter');
  })()`);
  await holdF(context,'keyUp');
  await context.waitFor(`(() => {
    const render=window.__render;
    render.renderFrame();
    const figures=render.scene.getObjectByName('Rigged on-foot fighters');
    return figures?.userData.assetStatus==='ready' &&
      figures.children.some(child=>child.userData.clip);
  })()`, 'loaded fighter after F-key exit',60_000);
  const view=await context.evaluate(`(() => {
    const app=window.__qaApp,f=app.duel.state.fighter,render=window.__render;
    render.renderFrame();
    const figures=render.scene.getObjectByName('Rigged on-foot fighters');
    const fallback=figures?.getObjectByName('On-foot fighters');
    // Raiders may occupy earlier slots; inspect the local body's actual root.
    const figure=figures?.children.find(child=>child.userData.clip &&
      Math.hypot(child.position.x-f.x,child.position.y-f.y,child.position.z-f.z)<.001);
    const skin=figure?.getObjectByProperty('isSkinnedMesh',true);
    const boundSkin=!!(skin?.skeleton?.bones.length &&
      skin.geometry.attributes.skinIndex && skin.geometry.attributes.skinWeight);
    const fallbackHidden=!!fallback&&!fallback.visible;
    if(!figures?.visible||!figure?.visible||!boundSkin||!fallbackHidden)
      throw Error('Loaded bound fighter or hidden fallback check failed');
    skin.onBeforeRender(null,null,render.camera);
    const hiddenInEye=skin.geometry.drawRange.count===0;
    skin.onAfterRender();
    if(!hiddenInEye)throw Error('Local skin draws inside first-person eye');
    const side={x:Math.cos(f.yaw),z:-Math.sin(f.yaw)};
    const forward={x:Math.sin(f.yaw),z:Math.cos(f.yaw)};
    app.inspectionCamera={position:[f.x+side.x*3+forward.x*4,f.y+2.3,
      f.z+side.z*3+forward.z*4],target:[f.x,f.y+1,f.z]};
    render.renderFrame();
    skin.onBeforeRender(null,null,render.camera);
    const visibleFromOutside=skin.geometry.drawRange.count>0;
    skin.onAfterRender();
    return {boundSkin,fallbackHidden,hiddenInEye,visibleFromOutside,
      fighter:{x:f.x,y:f.y,z:f.z}};
  })()`);
  if(!view.visibleFromOutside)
    throw Error(`Fighter inspection view failed: ${JSON.stringify(view)}`);
  await context.screenshot('onfoot-standing-figure');
  await context.evaluate(`(() => {
    const app=window.__qaApp,f=app.duel.state.fighter;
    // Sample one second into the authored fall so the shot shows the prone pose.
    f.knockedDown=true;f.knockdownRemaining=2;f.health=0;
    window.__render.renderFrame();
    const figures=window.__render.scene.getObjectByName('Rigged on-foot fighters');
    const figure=figures.children.find(child=>child.userData.clip &&
      Math.hypot(child.position.x-f.x,child.position.y-f.y,child.position.z-f.z)<.001);
    if(figure?.userData.clip!=='knockdown'||figure.userData.clipTime<.999)
      throw Error('Local fighter did not sample the knockdown clip');
  })()`);
  await context.screenshot('onfoot-knocked-down-figure');
  console.log(`Private loaded fighter and first-person hiding: ${JSON.stringify(view)}`);
}