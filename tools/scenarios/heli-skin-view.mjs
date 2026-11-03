// SKIN-VIEW look check (docs/HELI_WILDLIFE.md sections 5 to 7 and 12): Kestrel One in all seven paints,
// clean and at grime 80, each piece of gear on its mount, the heat camera's inset and the TV skin's nose
// camera. Production renderer, memory-only QA page, no frame timing. The helicopter stands on its pad;
// the camera is set with the game's own inspection camera hook, so only the view changes.
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const paints = ['stock', 'fire', 'medevac', 'rescue', 'wildlife', 'supply', 'tv'];
// Each gear piece's own camera: where it hangs on Kestrel One, in metres (az 0 is the nose, -90 the right side).
const gearShots = [
  ['fire', 'drop-sight', {az: 30, el: 3, dist: 3.2, at: [0, 0.65, 1.5]}],
  ['medevac', 'winch', {az: -75, el: 8, dist: 4.5, at: [-0.9, 1.5, 0.45]}],
  ['rescue', 'searchlight-heat-camera', {az: 30, el: 3, dist: 3.4, at: [0, 0.65, 1.2]}],
  ['wildlife', 'zoom-camera', {az: 30, el: 3, dist: 3.2, at: [0, 0.7, 1.6]}],
  ['wildlife', 'quiet-rotor', {az: -60, el: 28, dist: 11, at: [3, 2.9, 0]}],
  ['supply', 'cargo-net', {az: -35, el: 4, dist: 5.5, at: [0, 0.4, 0.6]}],
  ['tv', 'nose-camera', {az: 28, el: 2, dist: 3.6, at: [0, 0.9, 2.3]}],
];
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=helicopter,heli-skins,wildlife,tremblant-woods');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu ready', 90_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp; app.audio.setMuted?.(true);
    app.profile={...app.profile,credits:5000,heli:{version:1,fuelKg:0,refuels:0,
      lessons:{liftoff:true,hover:true,landing:true,carry:true},
      skins:{owned:${JSON.stringify(paints.slice(1))},worn:'stock',fresh:[]}}};
    if (!app._saveProfile()) throw Error('memory-only fixture failed');
    document.querySelector('#heli-visit').click();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady && window.__qaApp.heliSession`, 'at the pad', 120_000);
  // A fixed grime and heat picture for the view; the helicopter, the paint and the gear are the session's own.
  await context.evaluate(`(() => {
    const app=window.__qaApp, read=app.heliView.bind(app);
    window.__look={dirt:null,heat:null,animals:null};
    app.heliView=()=>{
      const view=read();
      if(!view?.skins) return view;
      const dirt=window.__look.dirt, skins=dirt?{...view.skins,dirt,grime:Object.values(dirt).reduce((a,b)=>a+b,0)}:view.skins;
      return {...view,skins:window.__look.heat?{...skins,heat:window.__look.heat}:skins,
        ...(window.__look.animals?{survey:{...(view.survey??{}),heat:window.__look.animals}}:{})};
    };
    window.__orbit=(az,el,dist,at)=>{
      const h=app.heliView().heli,hd=h.heading,a=(az*Math.PI/180)+hd,e=el*Math.PI/180;
      const target=[h.x+at[0]*Math.cos(hd)+at[2]*Math.sin(hd),h.y+at[1],h.z-at[0]*Math.sin(hd)+at[2]*Math.cos(hd)];
      app.inspectionCamera={target,position:[target[0]+dist*Math.cos(e)*Math.sin(a),target[1]+dist*Math.sin(e),target[2]+dist*Math.cos(e)*Math.cos(a)]};
    };
    const style=document.createElement('style');style.id='look-hide';
    style.textContent='.heli-panel,#hud,.hud{visibility:hidden!important}';document.head.append(style);
    const quiet=document.createElement('style');quiet.textContent='body>details{display:none!important}';document.head.append(quiet);
  })()`);
  const wear = kind => context.evaluate(`(() => { const r=window.__qaApp.heliSession.wearPaint(${JSON.stringify(kind)}); if(!r.ok) throw Error('wear '+${JSON.stringify(kind)}+': '+r.reason); return true; })()`);
  const orbit = (az, el, dist, at) => context.evaluate(`window.__orbit(${az},${el},${dist},${JSON.stringify(at)})`);
  const shot = async name => { await pause(350); return context.screenshot(name); };
  const whole = [0, 1.1, 0.4], hull = [-0.5, 1.1, 0.3];
  // Seven paints, clean, from the right side and the left, then at grime 80 (dust, mud and soot, a little salt).
  for (const phase of ['clean', 'grime']) {
    await context.evaluate(`window.__look.dirt=${phase === 'grime' ? '{dust:35,mud:20,soot:15,salt:10}' : 'null'}`);
    for (const kind of paints) {
      await wear(kind);
      await pause(1900);
      await orbit(-70, 10, 9.5, whole); await shot(`paint-${kind}-${phase}-right`);
      await orbit(55, 14, 9.5, whole); await shot(`paint-${kind}-${phase}-left`);
    }
  }
  // Each kind of dirt alone at 80, on the stock paint, so a streak can be told from a tint.
  await wear('stock');
  for (const [kind, level] of [['dust', 80], ['mud', 80], ['soot', 80], ['salt', 80]]) {
    await context.evaluate(`window.__look.dirt={dust:0,mud:0,soot:0,salt:0,${kind}:${level}}`);
    await pause(1900);
    await orbit(-70, 10, 9.5, whole); await shot(`grime-${kind}-80-right`);
    await orbit(-80, 6, 3.6, hull); await shot(`grime-${kind}-80-close`);
  }
  await context.evaluate(`window.__look.dirt=null`);
  // Each piece of gear on its mount.
  for (const [kind, name, view] of gearShots) {
    await wear(kind); await pause(1900);
    await orbit(view.az, view.el, view.dist, view.at); await shot(`gear-${kind}-${name}`);
  }
  // The heat camera's inset, with two warm people and two animals around the helicopter, and the nose camera view.
  await context.evaluate(`document.getElementById('look-hide').remove(); window.__qaApp.inspectionCamera=null;`);
  await wear('rescue');
  await pause(1900);
  await context.evaluate(`(() => { const h=window.__qaApp.heliView().heli;
    window.__look.heat=[{kind:'hiker',x:h.x+30,z:h.z+90,distance:95},{kind:'driver',x:h.x-70,z:h.z+20,distance:73}];
    window.__look.animals=[{id:'a1',x:h.x+60,z:h.z-30,distance:67},{id:'a2',x:h.x+80,z:h.z-60,distance:100},{id:'a3',x:h.x-20,z:h.z-110,distance:112}]; })()`);
  await context.waitFor(`!!document.querySelector('.heli-heat') && !document.querySelector('.heli-heat').hidden`, 'heat inset shown', 10_000);
  await pause(400);
  await context.screenshot('heat-camera-inset');
  await context.evaluate(`window.__look.heat=null; window.__look.animals=null`);
  await wear('tv');
  await context.evaluate(`window.__qaApp.heliCamera=4; window.__qaApp.duel.emit({heli:true})`);
  await context.waitFor(`document.querySelector('.heli-panel')?.dataset.camera==='nose' && document.querySelector('.heli-heat')?.hidden`, 'nose camera view, heat inset off', 10_000);
  await pause(1900);
  await context.screenshot('nose-camera-view');
}
