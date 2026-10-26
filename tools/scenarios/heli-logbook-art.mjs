// HELI-LOGBOOK ROUND 1 only. Production renderer, memory-only QA page.
// No frame timing; the two qualities are photographed at the same pad/view.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const paints = ['stock', 'rank-student', 'rank-private', 'rank-commercial', 'rank-mountain', 'rank-chief'];
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=helicopter,heli-skins,heli-logbook,tremblant-woods');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp; app.audio.setMuted?.(true);
    app.profile={...app.profile,credits:5000,heli:{version:1,fuelKg:0,refuels:0,
      lessons:{liftoff:true,hover:true,landing:true,carry:true},
      logbook:{flights:50,jobs:{car:1,crate:1,fire:1,rescue:1,ski:1},visited:['tremblant-woods'],awarded:5},
      skins:{owned:${JSON.stringify(paints.slice(1))},worn:'rank-chief',fresh:[]}}};
    if (!app._saveProfile()) throw Error('memory-only fixture failed');
    document.querySelector('#heli-visit').click();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady && document.querySelector('.heli-shelf')`, 'shelf at pad', 120_000);
  await context.evaluate(`document.querySelectorAll('.heli-shelf details').forEach(element=>element.open=true)`);
  await pause(600);
  await context.screenshot('logbook-shelf');
  await context.evaluate(`(() => {
    const app=window.__qaApp, read=app.heliView.bind(app);
    window.__artPaint='stock'; window.__artNear=false;
    app.heliView=()=>{const view=read();return {...view,logbook:{...view.logbook,paint:window.__artPaint}}};
    app.heliCamera=3;
    const camera=window.__render.camera, update=camera.updateProjectionMatrix.bind(camera);
    camera.updateProjectionMatrix=()=>{camera.fov=window.__artNear?24:55;update()};
    const style=document.createElement('style');
    style.textContent='.heli-panel,#hud,.hud{visibility:hidden!important}';document.head.append(style);
  })()`);
  for (const quality of ['high', 'performance']) {
    await context.evaluate(`(() => {const select=document.querySelector('#graphics-quality');select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await pause(1200);
    for (const paint of paints) {
      await context.evaluate(`window.__artPaint=${JSON.stringify(paint)}`);
      await pause(700);
      for (const near of [true,false]) {
        await context.evaluate(`window.__artNear=${near};window.__render.camera.updateProjectionMatrix()`);
        await pause(250);
        await context.screenshot(`${paint}-${quality}-${near?'near':'distance'}`);
      }
    }
  }
}
