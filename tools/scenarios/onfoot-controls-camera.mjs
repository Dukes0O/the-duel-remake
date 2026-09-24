const key=(context,type,code,keyName,virtual)=>context.command(
  'Input.dispatchKeyEvent',{type,key:keyName,code,windowsVirtualKeyCode:virtual});

export async function run(context){
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",
    'private Wasteland scene',60_000);
  await context.evaluate(`(()=>{
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const s=app.duel.state;
    Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,
      prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[],opponents:[]});
    s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    window.__render.renderFrame();
    app.onFrame?.(s);
  })()`);
  await context.waitFor('window.__qaApp.visualReady === true',
    'Wasteland renderer ready for fighter input',60_000);
  await key(context,'keyDown','KeyF','f',70);
  const exited=await context.evaluate(`(()=>{
    const app=window.__qaApp;app.advance(.42);
    window.__render.renderFrame();
    app.onFrame?.(app.duel.state);
    const f=app.duel.state.fighter,c=window.__render.camera;
    return {onFoot:app.duel.state.onFoot,context:app.activeInputContext(),
      eye: c.position.y-f.y,range:Math.hypot(c.position.x-f.x,c.position.z-f.z),
      reticle:document.querySelector('.combat-upgraded-hud')?.classList.contains('on-foot')};
  })()`);
  if(!exited.onFoot||exited.context!=='foot'||exited.eye<.65||
      exited.eye>2||exited.range>.05||!exited.reticle)
    throw Error(`Fighter exit/camera failed: ${JSON.stringify(exited)}`);
  await key(context,'keyUp','KeyF','f',70);
  const point=await context.evaluate(`(()=>{
    const r=document.querySelector('#view3d canvas').getBoundingClientRect();
    const x=Math.round(r.left+r.width/2),y=Math.round(r.top+r.height/2);
    return {x,y,target:document.elementFromPoint(x,y)?.outerHTML?.slice(0,180)};
  })()`);
  await context.command('Input.dispatchMouseEvent',
    {type:'mousePressed',button:'left',clickCount:1,x:point.x,y:point.y});
  await context.command('Input.dispatchMouseEvent',
    {type:'mouseReleased',button:'left',clickCount:1,x:point.x,y:point.y});
  await context.waitFor("document.pointerLockElement===document.querySelector('#view3d canvas')",
    `fighter pointer lock at ${point.target}`,10_000);
  const before=await context.evaluate('window.__qaApp.duel.state.fighter.yaw');
  await context.command('Input.dispatchMouseEvent',
    {type:'mouseMoved',button:'none',x:point.x+30,y:point.y});
  await key(context,'keyDown','KeyW','w',87);
  const moved=await context.evaluate(`(()=>{
    const app=window.__qaApp,f=app.duel.state.fighter;
    const start={x:f.x,z:f.z};app.advance(.18);
    window.__render.renderFrame();
    app.onFrame?.(app.duel.state);
    const c=window.__render.camera;
    return {distance:Math.hypot(f.x-start.x,f.z-start.z),
      cameraRange:Math.hypot(c.position.x-f.x,c.position.z-f.z),
      yaw:f.yaw,carDistance:Math.hypot(f.x-app.duel.course.groundAt(app.duel.state.s,app.duel.state.lateral).x,
        f.z-app.duel.course.groundAt(app.duel.state.s,app.duel.state.lateral).z)};
  })()`);
  await key(context,'keyUp','KeyW','w',87);
  if(moved.distance<.4||moved.cameraRange>.05||moved.yaw<=before||
      moved.carDistance>3.5)
    throw Error(`Fighter walk/look/camera failed: ${JSON.stringify(moved)}`);
  await context.screenshot('onfoot-controls-camera');
  await key(context,'keyDown','KeyF','f',70);
  const entered=await context.evaluate(`(()=>{
    const app=window.__qaApp;app.advance(.62);window.__render.renderFrame();
    app.onFrame?.(app.duel.state);
    const car=app.duel.course.groundAt(app.duel.state.s,app.duel.state.lateral);
    const camera=window.__render.camera;
    return {onFoot:app.duel.state.onFoot,context:app.activeInputContext(),
      cameraRange:Math.hypot(camera.position.x-car.x,camera.position.z-car.z),
      pointerLocked:!!document.pointerLockElement};
  })()`);
  await key(context,'keyUp','KeyF','f',70);
  if(entered.onFoot||entered.context!=='car'||entered.cameraRange<1||
      entered.pointerLocked)
    throw Error(`Car re-entry/camera failed: ${JSON.stringify(entered)}`);
  await key(context,'keyDown','KeyF','f',70);
  await context.evaluate('window.__qaApp.advance(.42)');
  await key(context,'keyUp','KeyF','f',70);
  await context.command('Input.dispatchMouseEvent',
    {type:'mousePressed',button:'left',clickCount:1,x:point.x,y:point.y});
  await context.command('Input.dispatchMouseEvent',
    {type:'mouseReleased',button:'left',clickCount:1,x:point.x,y:point.y});
  await context.waitFor("document.pointerLockElement===document.querySelector('#view3d canvas')",
    'pointer lock after second exit',10_000);
  await key(context,'keyDown','Escape','Escape',27);
  await context.waitFor('!document.pointerLockElement && window.__qaApp.duel.state.paused',
    'Escape releases pointer and pauses',10_000);
  await key(context,'keyUp','Escape','Escape',27);
  console.log(`On-foot exit, pointer lock, walk, camera, re-entry and Escape pause: ${JSON.stringify({exited,moved,entered})}`);
}
