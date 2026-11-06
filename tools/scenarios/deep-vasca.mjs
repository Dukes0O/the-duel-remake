// DEEP-LAST-JOKE: private Chrome scenario. The runner supplies memory-only storage.
// Claude runs this scenario and uses the captures for the Vasca look verdict.
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';

const SIX=['sirena-badge','sirena-steering-wheel','sirena-wheel','sirena-bonnet','sirena-door','sirena-car'];
const STAND=`window.__vascaQa={
  wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),
  park(x,z,h){const d=window.__qaApp.duel,s=d.state,n=d.course.nearest(x,z,s.s);Object.assign(s,{s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,speedMph:0,airborne:false,airHeight:0,prevAirHeight:0,_jumpY:null});if(Number.isFinite(h))s.headingError=this.wrap(h-d.course.at(s.s).heading);},
  find(id){return window.__qaApp.duel.deepStory?.sirena.finds.find(f=>f.id===id);}
}`;
async function key(context,code,type){await context.command('Input.dispatchKeyEvent',{type,code,key:code.replace('Key','').toLowerCase(),windowsVirtualKeyCode:code.charCodeAt(3)});}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function run(context){
  const report={steps:[],captures:[],scope:'memory-only save; deep-vasca enabled by QA flag; no frame timing'};
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=the-deep,deep-vasca');
  await context.waitFor('window.__qaApp','QA app',60000);
  await context.evaluate(`(()=>{const a=window.__qaApp;a.returnToMenu();for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    a.profile={...a.profile,unlockedCars:['falcone_sirena'],deep:{kit:true,found:['kelp-coast'],raised:${JSON.stringify(SIX)}}};a._saveProfile();
    a.startCampaign({mode:'duel',seed:1989,opponentCount:1,startStage:0,car:'falcone_f42'});${STAND}})()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='countdown'||window.__qaApp.duel.state.status==='racing'`,'Pacific Canyon',60000);
  await context.evaluate(`(()=>{const d=window.__qaApp.duel,s=d.state,r=d.course.deepRamp;if(!r)throw Error('No Pacific Canyon ramp');Object.assign(s,{status:'racing',countdown:0});
    const p=r.points.find(x=>x.progress>=r.shoreline.center.progress-.04),n=d.course.nearest(p.x,p.z);Object.assign(s,{s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,
    headingError:window.__vascaQa.wrap(r.heading-d.course.at(n.s).heading),speedMph:30,groundHeight:p.y,airborne:false,airHeight:0,_jumpY:null});})()`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='choice'`,'dive prompt',30000);
  await context.evaluate('window.__qaApp.chooseDeep("dive")');
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='underwater'&&!!window.__qaApp.duel.deepStory`,'underwater story',60000);
  await context.waitFor(`window.__qaApp.duel.deepStory.sirena.squeak===true`,'squeak mission',15000);
  const duck=await context.evaluate(`window.__vascaQa.find('falcone-vasca')`);
  const heading=await context.evaluate('window.__qaApp.duel.deepRuntime.ramp.heading');
  // Stop short of the duck, as a player does, so the rising bath is in front of the car and not under it.
  await context.evaluate(`window.__vascaQa.park(${duck.x-Math.sin(heading)*3},${duck.z-Math.cos(heading)*3},${heading})`);
  await key(context,'KeyR','keyDown');await pause(150);await key(context,'KeyR','keyUp');await pause(500);
  report.captures.push(await context.screenshot('vasca-squeak-ping'));
  report.captures.push(await context.screenshot('vasca-duck-chain'));
  await key(context,'KeyF','keyDown');await pause(150);await key(context,'KeyF','keyUp');
  await context.waitFor(`window.__qaApp.duel.deepStory.sirena.lift?.find==='falcone-vasca'`,'four-bag lift',15000);
  await pause(12000);report.captures.push(await context.screenshot('vasca-rising-start'));
  await pause(7000);report.captures.push(await context.screenshot('vasca-rising'));
  await context.waitFor(`window.__qaApp.profile.deep?.raised?.includes('falcone-vasca')`,'bath raised and car granted',60000);
  await context.waitFor(`document.querySelector('.sirena-title')?.hidden===false`,'reveal title card',60000);
  report.captures.push(await context.screenshot('vasca-title'));
  report.steps.push('squeak, duck, four-bag lift, title and car grant');
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'`,'menu after surfacing',30000);
  await context.evaluate(`document.querySelector('[data-action="garage"]')?.click()`);
  await context.waitFor(`!!document.querySelector('[data-garage-car="falcone_vasca"]')`,'Vasca in garage',20000);
  report.captures.push(await context.screenshot('vasca-garage'));
  await context.evaluate(`document.querySelector('[data-garage-car="falcone_vasca"]')?.click();document.querySelector('[data-action="garage-select"]')?.click()`);
  await context.waitFor(`window.__qaApp.duel.state.car==='falcone_vasca'||window.__qaApp.car==='falcone_vasca'`,'race starts with Vasca',30000);
  report.captures.push(await context.screenshot('vasca-menu'));
  await context.evaluate(`window.__qaApp.startCampaign({mode:'duel',seed:1989,opponentCount:1,startStage:0,car:'falcone_vasca'})`);
  await context.waitFor(`window.__qaApp.duel.state.status==='racing'||window.__qaApp.duel.state.status==='countdown'`,'race with the Vasca',60000);
  await pause(6000);report.captures.push(await context.screenshot('vasca-race-start'));
  await writeFile(join(context.outputDir,'deep-vasca.json'),JSON.stringify(report,null,2)+'\n');
  return report;
}
