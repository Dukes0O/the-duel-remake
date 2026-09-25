import {access,mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,relative as pathRelative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {publishReviewSheet} from './review-sheet.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const READY="!!window.__qaApp?.visualReady&&!!window.__render";

async function settleMenu(context){
  await context.waitFor(`(()=>{const a=window.__qaApp;if(!a?.visualReady||a.duel.state.status!=='menu')return false;a.onFrame?.(a.duel.state,0);return document.querySelector('#renderer-loading')?.hidden&&document.querySelector('#renderer-error')?.hidden;})()`,'settled menu presentation',60000);
  await context.evaluate('(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);})()');
}

async function click(context,selector){
  const p=await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Control unavailable');const r=b.getBoundingClientRect();if(!r.width)throw Error('Control not visible');return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  for(const type of ['mousePressed','mouseReleased'])await context.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...p});
}
function fixture(){
  const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only QA required');
  a.stop();a.audio.setMuted(true);document.querySelectorAll('details').forEach(n=>n.style.display='none');
  window.__discoveryQa={
    refresh(){a.onFrame?.(a.duel.state,0);window.__render.renderFrame();},
    count(value){a.profile={...a.profile,wasteland:{...a.profile.wasteland,pacificFinishes:value}};a._saveProfile();this.refresh();},
    place(progress,speed=0){const d=a.duel,p=d.course.hiddenRoad.poseAt(progress);Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,headingError:p.heading-d.course.at(p.s).heading,speedMph:speed,groundHeight:p.y,airHeight:0,airborne:false,yawVelocity:0,pushVelocity:0});d.setInput({throttle:0,brake:0,steer:0});this.refresh();},
    advance(seconds){for(let i=0;i<Math.ceil(seconds*120);i++)a.duel.step(1/120);this.refresh();},
    race(){a.inspectionCamera=null;a.startCampaign({mode:'wasteland',car:'falcone_f42',startStage:0,seed:1989,difficulty:'casual'});a.stop();Object.assign(a.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});this.refresh();}
  };
  window.__discoveryQa.refresh();
}
async function sheet(context,rows,path){
  const images=await Promise.all(rows.map(async row=>({name:row.name,data:'data:image/png;base64,'+(await readFile(join(ROOT,row.path))).toString('base64')})));
  const png=await context.evaluate(`(async()=>{const rows=${JSON.stringify(images)},c=document.createElement('canvas');c.width=1440;c.height=40+Math.ceil(rows.length/3)*300;const x=c.getContext('2d');x.fillStyle='#102025';x.fillRect(0,0,c.width,c.height);x.fillStyle='#eadabc';x.font='18px sans-serif';x.fillText('Hidden Road discovery · actual memory-only browser captures',15,26);for(let i=0;i<rows.length;i++){const im=new Image();im.src=rows[i].data;await im.decode();const scale=Math.min(480/im.width,270/im.height),left=i%3*480,top=40+Math.floor(i/3)*300;x.drawImage(im,left+(480-im.width*scale)/2,top,im.width*scale,im.height*scale);x.fillStyle='#fff';x.font='14px sans-serif';x.fillText(rows[i].name,left+10,top+291);}return c.toDataURL('image/png');})()`);
  await writeFile(path,Buffer.from(png.split(',')[1],'base64'));
}
export async function run(context){
  const round=Number(process.env.EGG_DISCOVERY_ROUND||1),directory=context.outputDir,relative=pathRelative(ROOT,directory).replaceAll('\\','/');
  try{await access(join(directory,'captures.json'));throw Error('Completed discovery round is immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
  await mkdir(directory,{recursive:true});
  const report={round,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),captures:[],checks:{},frames:{},scope:'Private memory-only saves. Finish counts5/10 are explicit profile fixtures; discovery, choices and visits use production simulation/App. Pose fixtures shorten driving. No real saves.'};
  const capture=async name=>{const p=await context.screenshot(name),bytes=await readFile(p);report.captures.push({name,path:`${relative}/${name}.png`,sha256:hash(bytes)});};
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=hidden-road');await context.waitFor(READY,'discovery menu',60000);await context.evaluate(`(${fixture.toString()})()`);
  report.checks.initial=await context.evaluate(`(()=>{const a=window.__qaApp;window.__playerA=a.player.id;const d=a.getHiddenRoadDiscovery();if(d.discoveredGate||!document.querySelector('#wasteland-visit').hidden||document.querySelector('#menu-course-map').dataset.hiddenRoad!=='false')throw Error('Undiscovered menu leaked');return d;})()`);
  await settleMenu(context);await capture('undiscovered-menu');await context.evaluate('window.__discoveryQa.count(5)');await click(context,'#garage-open');await capture('five-finish-garage-tip');
  report.checks.garageTip=await context.evaluate(`(()=>{const n=document.querySelector('#hidden-road-tip'),r=n?.getBoundingClientRect();if(!n?.textContent.includes('dry wash')||r.top<0||r.bottom>innerHeight)throw Error('Five-finish garage tip not visible on opening');return{top:r.top,bottom:r.bottom};})()`);
  await click(context,'[data-action="garage-close"]');await context.evaluate('window.__discoveryQa.count(10);window.__discoveryQa.race()');
  await context.waitFor("window.__render.scene.getObjectByName('Rustwall')?.userData.assetStatus==='ready'",'loaded hint scene',60000);
  await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__discoveryQa;q.place(2);const p=a.duel.course.hiddenRoad.poseAt(14),s=Math.sin(p.heading),c=Math.cos(p.heading);a.inspectionCamera={position:[p.x-s*23,p.y+5,p.z-c*23],target:[p.x,p.y+4,p.z]};q.refresh();})()`);
  for(const quality of ['high','performance']){
    await context.evaluate(`window.__qaApp.setGraphicsQuality(${JSON.stringify(quality)})`);await pause(500);
    report.frames[quality]=await context.evaluate(`(async()=>{const frames=[];let last=null;for(let i=0;i<121;i++){const t=await new Promise(requestAnimationFrame);if(last!==null)frames.push(t-last);last=t;}const group=window.__render.scene.getObjectByName('Hidden Road dust hint');if(!group?.visible)throw Error('Dust hint is not live');const p=group.children.find(n=>n.isPoints);if(!p||p.geometry.attributes.position.count>64)throw Error('Dust pool budget');const sorted=[...frames].sort((a,b)=>a-b);return{frames,p95:sorted[113],points:p.geometry.attributes.position.count,drawCalls:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles,camera:window.__qaApp.inspectionCamera};})()`);
    await capture(`ten-finish-dust-${quality}`);
  }
  report.checks.pause=await context.evaluate(`(()=>{const a=window.__qaApp,g=window.__render.scene.getObjectByName('Hidden Road dust hint');a.duel.state.paused=true;window.__render.renderFrame();if(g.visible)throw Error('Paused hint remained visible');a.duel.state.paused=false;a.inspectionCamera=null;a.setGraphicsQuality('high');return true;})()`);
  await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__discoveryQa;q.place(149.9,35);q.advance(.1);q.place(a.duel.course.hiddenRoad.length-59.5,45);let i=0;while(!a.duel.state.hiddenRoadJourney.choiceReady&&i++<1600)a.duel.step(1/120);q.refresh();if(!a.getHiddenRoadDiscovery().discoveredGate)throw Error('Actual invitation did not discover');})()`);
  await click(context,'.hidden-road-actions button:nth-child(2)');await context.evaluate('window.__discoveryQa.advance(.05);window.__qaApp.requestNavigation("menu");window.__discoveryQa.refresh()');
  await settleMenu(context);await capture('discovered-menu-and-map');
  report.checks.turnBack=await context.evaluate(`(()=>{const a=window.__qaApp;if(!a.getHiddenRoadDiscovery().discoveredGate||document.querySelector('#wasteland-visit').hidden||document.querySelector('#menu-course-map').dataset.hiddenRoad!=='true')throw Error('Turn-back discovery/menu/map lost');return a.getHiddenRoadDiscovery();})()`);
  await context.navigate('/tools/menu-check.html?flags=hidden-road');await context.waitFor(READY,'discovery reload',60000);await context.evaluate(`(${fixture.toString()})()`);
  if(!await context.evaluate('window.__qaApp.getHiddenRoadDiscovery().discoveredGate'))throw Error('Discovery did not survive private reload');
  await context.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await settleMenu(context);await capture('phone-discovered-menu');
  report.checks.phoneAction=await context.evaluate(`(()=>{const b=document.querySelector('#wasteland-visit'),r=b.getBoundingClientRect(),start=document.querySelector('#start-engine').getBoundingClientRect();if(r.height<44||Math.abs(r.width-start.width)>1)throw Error('Wasteland action target is too small');return{height:r.height,width:r.width,previewLabel:document.querySelector('#menu-shortcuts').textContent};})()`);
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.evaluate('window.__playerA=window.__qaApp.player.id');await click(context,'[data-action="new-player"]');
  await context.evaluate("document.querySelector('#new-player-name').value='Discovery B';document.querySelector('#new-player-form').requestSubmit()");
  report.checks.playerIsolation=await context.evaluate(`(()=>{const a=window.__qaApp;window.__discoveryQa.refresh();if(a.getHiddenRoadDiscovery().discoveredGate||!document.querySelector('#wasteland-visit').hidden||document.querySelector('#menu-course-map').dataset.hiddenRoad!=='false')throw Error('Discovery leaked across player');const b=a.player.id;const select=document.querySelector('#player-select');select.value=window.__playerA;select.dispatchEvent(new Event('change',{bubbles:true}));if(!a.getHiddenRoadDiscovery().discoveredGate)throw Error('Original player discovery lost');return{secondPlayer:b,firstPlayer:a.player.id};})()`);
  const before=await context.evaluate('JSON.stringify(window.__qaApp.profile)');await click(context,'#wasteland-visit');
  await context.waitFor("window.__render.scene.getObjectByName('Rustwall')?.userData.assetStatus==='ready'",'direct visit gate',60000);
  await context.evaluate('window.__discoveryQa.advance(7.5)');await capture('direct-visit-inside');
  report.checks.directVisit=await context.evaluate(`(()=>{const a=window.__qaApp;if(a.duel.state.hiddenRoadJourney.phase!=='arrived'||a.runId!==null||JSON.stringify(a.profile)!==${JSON.stringify(before)})throw Error('Direct visit altered career or did not arrive');a.requestNavigation('menu');window.__discoveryQa.refresh();return{noCareerMutation:true,noRaceRun:true};})()`);
  await context.evaluate('window.__discoveryQa.race();window.__discoveryQa.place(80)');await pause(120);await capture('discovered-live-map');
  report.checks.scenic=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__discoveryQa;if(document.querySelector('#route-map').dataset.hiddenRoad!=='true')throw Error('Live dotted path missing');q.place(149.9,35);q.advance(.1);q.place(a.duel.course.hiddenRoad.length-59.5,45);let choice=false;for(let i=0;i<1600&&a.duel.state.hiddenRoadJourney.phase!=='arrived';i++){a.duel.step(1/120);choice ||= a.duel.state.hiddenRoadJourney.choiceReady;}q.refresh();if(choice||a.duel.state.hiddenRoadJourney.phase!=='arrived')throw Error('Scenic revisit failed automatic entry');a.requestNavigation('menu');q.refresh();return{automatic:true};})()`);
  // The switch is released (SPEC 0.12); flag-off behavior is covered by node tests.
  await writeFile(join(directory,'captures.json'),JSON.stringify(report,null,2)+'\n');
  const sheetPath=join(directory,'contact-sheet.png');
  await sheet(context,report.captures,sheetPath);
  await publishReviewSheet(context,sheetPath,'hidden-road-discovery',round);
  console.log(`Discovery round ${round}: ${report.captures.length} actual images, memory-only lifecycle controls and bounded dust frame checks retained.`);
}
