// Private, memory-only look at the Dustmonger's veil and the Kettle Kingpin's
// drop in the production game. Positions are labelled fixtures; every move
// transition runs through Duel.step.
async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(() => {window.__qaApp?.onFrame?.(window.__qaApp.duel.state,0);
    window.__render?.renderFrame();return !!window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    document.querySelector('#renderer-loading')?.hidden;})()`, label, 60000);
}

async function look(context, label, height = 14) {
  await context.evaluate(`(() => {const app=window.__qaApp,d=app.duel,a=d.state.opponents[0];
    const at=d.course.worldAt(a.s,a.lateral),y=(at.y||0)+(a.airHeight||0);
    app.inspectionCamera={position:[at.x+16,y+${height},at.z+16],target:[at.x,y,at.z]};})()`);
  await ready(context, label);
  await context.waitFor(`(() => {window.__render.renderFrame();const p=window.__render.camera.position,
    t=window.__qaApp.inspectionCamera.position;return Math.hypot(p.x-t[0],p.y-t[1],p.z-t[2])<.05;})()`,
    `${label} camera`, 10000);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(label);
}

async function start(context, id) {
  await context.evaluate(`(() => {const app=window.__qaApp;
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,
      territories:{...app.profile.wasteland.territories,${id}:{hold:100,claimed:false}}}};
    if(!app._saveProfile())throw Error('fixture');
    if(!app.isYardHomeActive()&&app.duel.state.status==='menu'&&!app.visitWasteland())throw Error('visit');})()`);
  await context.evaluate('window.__qaApp.isYardHomeActive()||window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()', 'yard', 60000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.stop();
    if(!app.startWarlordFight(${JSON.stringify(id)})||!app.beginWarlordFight())throw Error('entry');
    for(let i=0;i<362;i++)app.duel.step(1/120);
    const d=app.duel,s=d.state,a=s.opponents[0],site=s.arena.spawnSlots[0].s;
    for(const p of s.arena.participants)p.protectedSec=0;
    Object.assign(a,{s:site,prevS:site,lateral:0,prevLateral:0,headingError:0,speedMph:30});
    Object.assign(s,{s:site+(${id === 'kettle' ? 22 : -18}),prevS:site+(${id === 'kettle' ? 22 : -18}),
      lateral:0,prevLateral:0,headingError:0,speedMph:${id === 'kettle' ? 0 : 30}});
    d.setInput({throttle:${id === 'kettle' ? 0 : .5},brake:0,steer:0,boost:false});})()`);
}

async function until(context, test, seconds = 6) {
  await context.evaluate(`(() => {const d=window.__qaApp.duel,s=d.state,a=s.opponents[0];
    for(let i=0;i<${seconds * 120};i++){if(${test})return true;d.step(1/120);}
    throw Error('never: ${test.replace(/'/g, '')}');})()`);
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=warlords&harness=new-warlords');
  await context.waitFor('!!window.__qaApp&&!!window.__render', 'menu', 60000);
  await ready(context, 'menu');
  await start(context, 'dustmonger');
  await until(context, "a.dustVeil?.stage==='tell'");
  await look(context, 'dustmonger-tell');
  await until(context, "a.dustVeil?.stage==='window'");
  for (let i = 0; i < 30; i++) await context.evaluate('window.__qaApp.duel.step(1/120)');
  await context.evaluate(`(() => {const app=window.__qaApp,d=app.duel,a=d.state.opponents[0];
    const back=12,h=a.headingError||0,f=d.course.at(a.s).heading+h,at=d.course.worldAt(a.s,a.lateral);
    const cx=at.x-Math.sin(f)*back,cz=at.z-Math.cos(f)*back;
    app.inspectionCamera={position:[cx+18,(at.y||0)+16,cz+18],target:[cx,(at.y||0),cz]};})()`);
  await ready(context, 'veil');
  await context.waitFor(`(() => {window.__render.renderFrame();const p=window.__render.camera.position,
    t=window.__qaApp.inspectionCamera.position;return Math.hypot(p.x-t[0],p.y-t[1],p.z-t[2])<.05;})()`, 'veil camera', 10000);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot('dustmonger-veil');
  // A fresh private tab for the second fight.
  await context.navigate('/tools/menu-check.html?flags=warlords&harness=new-warlords-kettle');
  await context.waitFor('!!window.__qaApp&&!!window.__render', 'menu', 60000);
  await ready(context, 'menu');
  await start(context, 'kettle');
  await until(context, "a.kettleDrop?.stage==='tell'");
  await look(context, 'kettle-ring', 20);
  await until(context, "a.kettleDrop?.stage==='leap'&&(a.airHeight||0)>5");
  await look(context, 'kettle-leap', 20);
  await until(context, "a.kettleDrop?.stage==='window'");
  await look(context, 'kettle-landed', 20);
  console.log('New warlords look: dustmonger tell/veil and kettle ring/leap/landing captured.');
}
