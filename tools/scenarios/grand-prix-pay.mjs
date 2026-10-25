// One real result layout for P4-CAREER-PAY, using the existing private harness.
import {installTestDriver, LINE_SKILL} from '../race-field-balance.mjs';
import {DRIVE, steeringYawAuthority, TYRE_SLIP, steeringGrip, tyreClamp, tyreSlipSteering, steerForYaw} from '../../src/config.js';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=grand-prix,grand-prix-career');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'isolated GP pay menu', 60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app._switches().enabled('grand-prix-career'))throw Error('Career dev switch is off');
    document.querySelectorAll('details').forEach(node=>{node.open=false;});
    app.audio.setMuted?.(true);
    if(!app.startCampaign({startStage:0,mode:'grandprix',seed:1989,fieldSeed:1000,
      car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium'}))throw Error('GP could not start');
    app.stop();app.autopilot=true;app._scriptedCrashDone=true;
    if(app.duel.course.script)throw Error('This recipe owns unscripted Pacific only');
    const DRIVE=${JSON.stringify(DRIVE)},LINE_SKILL=${LINE_SKILL};
    const steeringYawAuthority=${steeringYawAuthority.toString()};
    const TYRE_SLIP=${JSON.stringify(TYRE_SLIP)};
    const steeringGrip=${steeringGrip.toString()},tyreClamp=${tyreClamp.toString()};
    const tyreSlipSteering=${tyreSlipSteering.toString()},steerForYaw=${steerForYaw.toString()};
    const clampTo=(value,limit)=>Math.max(-limit,Math.min(limit,value));
    (${installTestDriver.toString()})(app);
    window.__gpPayWallet=app.profile.credits;
  })()`);
  await context.waitFor(`window.__qaApp.visualReady &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, 'GP assets ready', 60_000);
  let status;
  for(let batch=0;batch<100;batch++) {
    status=await context.evaluate(`(() => {
      const app=window.__qaApp;
      for(let tick=0;tick<600&&['countdown','racing'].includes(app.duel.state.status);tick++)
        app.advance(1/60,1/60);
      app.onFrame?.(app.duel.state,0);window.__render?.renderFrame();
      return app.duel.state.status;
    })()`);
    if(!['countdown','racing'].includes(status))break;
  }
  if(status!=='stage_result')throw Error('Native GP did not finish: '+status);
  const report=await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state,r=s.results;
    if(s.completedLaps!==3||s.lapsTotal!==3||!r.completed)throw Error('Actual three-lap finish required');
    if(!(r.creditReward>0)||r.creditCharge!==0||app.profile.credits!==window.__gpPayWallet+r.creditReward)
      throw Error('Actual positive position earnings missing');
    const profile=JSON.stringify(app.profile),raw=localStorage.getItem('the-duel-players-v2');
    if(typeof raw!=='string')throw Error('Native named-player payment was not saved');
    app._settleResult(r,s);
    if(JSON.stringify(app.profile)!==profile||localStorage.getItem('the-duel-players-v2')!==raw)
      throw Error('Duplicate finish changed payment or saved bytes');
    const panel=document.querySelector('.grand-prix-results'),text=panel?.textContent||'';
    for(const label of ['POSITION PAY','CREDITS EARNED','BALANCE'])if(!text.includes(label))
      throw Error('Result metric missing: '+label);
    const earned=[...panel.querySelectorAll('.result-metric')].find(metric=>
      metric.querySelector('.field-label')?.textContent==='CREDITS EARNED');
    if(earned?.querySelector('b')?.textContent!=='+'+Math.floor(r.creditReward||0).toLocaleString())
      throw Error('Earned credit amount is not visible');
    return {laps:s.completedLaps,position:r.position,creditReward:r.creditReward,
      positionPay:r.creditPositionReward,wallet:app.profile.credits,
      resultHeight:panel.getBoundingClientRect().height,viewportHeight:innerHeight};
  })()`);
  await context.evaluate(`document.querySelectorAll('details').forEach(panel=>{
    if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.hidden=true;
    else panel.open=false;
  })`);
  await context.screenshot('grand-prix-paid-results');
  console.log('Actual paid GP result: '+JSON.stringify(report));
}
