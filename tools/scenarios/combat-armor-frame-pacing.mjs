// Compare ordinary driving with the first armored wreck on the real app RAF.
// The QA page supplies disposable memory-only saves and a private browser.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function pass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`, `${quality} memory-only menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value === ${JSON.stringify(quality)} &&
    !document.querySelector('#start-engine')?.disabled`, `${quality} renderer ready`, 60_000);

  const report = await context.evaluate(`(async () => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode:'duel',startStage:0,opponentCount:3,seed:1989}))
      throw Error('Ordinary race did not start');
    const setup = () => {
      const state = app.duel.state;
      Object.assign(state,{status:'racing',countdown:0,s:500,prevS:500,
        lateral:0,prevLateral:0,speedMph:0,traffic:[],invulnerableSec:0});
      state.opponents.forEach((actor,index)=>Object.assign(actor,{s:100+index*80,
        prevS:100+index*80,lateral:0,prevLateral:0,speedMph:0}));
      if(state.combat){state.combat.aiTimer = Infinity;state.combat.pickupTimer = Infinity;}
      return state;
    };
    const ready = async () => {
      const deadline = performance.now()+30000;
      while (performance.now()<deadline) {
        const status=document.querySelector('#view3d').dataset.warmupStatus;
        if (app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(status)) return;
        await new Promise(done=>setTimeout(done,40));
      }
      throw Error('Race never reached a presented frame');
    };
    const sample = () => new Promise(resolve => {
      const intervals=[];
      let previous=performance.now();
      const tick=now=>{
        intervals.push(now-previous);previous=now;
        if(intervals.length<120){requestAnimationFrame(tick);return;}
        intervals.sort((a,b)=>a-b);
        const at=fraction=>Number(intervals[Math.ceil(intervals.length*fraction)-1].toFixed(2));
        resolve({frames:intervals.length,p50:at(.5),p95:at(.95),max:at(1),
          over33ms:intervals.filter(ms=>ms>33).length});
      };
      requestAnimationFrame(tick);
    });
    setup();await ready();
    await new Promise(done=>setTimeout(done,700));
    const ordinary=await sample();

    if (!app.startCampaign({mode:'wasteland',startStage:0,opponentCount:3,seed:1989}))
      throw Error('Armored race did not start');
    const state=setup();
    if (!Number.isFinite(state.armor))throw Error('Armored race is missing armor');
    await ready();
    await new Promise(done=>setTimeout(done,700));
    state.armor=12;
    const at=app.duel.course.groundAt(state.s,state.lateral);
    state.combat.projectiles.push({kind:'crossbow',enemy:true,level:0,
      x:at.x,y:at.y+2,z:at.z,vx:0,vy:0,vz:0,age:0});
    app.duel.step(1/120);
    if (!state.combatWrecking || state.armor!==0)
      throw Error('First player wreck was not triggered for the RAF sample');
    const armoredWreck=await sample();
    return {quality:${JSON.stringify(quality)},width:innerWidth,height:innerHeight,
      memoryOnlySaves:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
      ordinary,armoredWreck,armor:state.armor,wrecking:state.combatWrecking,
      warmupStatus:document.querySelector('#view3d').dataset.warmupStatus};
  })()`);
  if (report.width!==1280 || report.height!==720 || !report.memoryOnlySaves ||
      report.ordinary.frames!==120 || report.armoredWreck.frames!==120 ||
      !Number.isFinite(report.ordinary.p95) || !Number.isFinite(report.armoredWreck.p95))
    throw Error(`${quality}: invalid RAF sample: ${JSON.stringify(report)}`);
  console.log(`${quality} real RAF: ordinary ${JSON.stringify(report.ordinary)}, `+
    `first armored wreck ${JSON.stringify(report.armoredWreck)}`);
  await context.screenshot(`combat-armor-raf-${quality}`);
  return report;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await pass(context,quality));
  await writeFile(join(context.outputDir,'combat-armor-frame-pacing.json'),
    JSON.stringify({reports},null,2)+'\n');
}
