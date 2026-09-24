import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,relative as pathRelative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {publishReviewSheet} from './review-sheet.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const key=(c,type,code,name,virtual)=>c.command('Input.dispatchKeyEvent',{type,code,key:name,windowsVirtualKeyCode:virtual});
const tap=async(c,code,name,virtual)=>{await key(c,'keyDown',code,name,virtual);await key(c,'keyUp',code,name,virtual);};
async function refresh(c){await c.evaluate('window.__render.renderFrame();window.__qaApp.onFrame?.(window.__qaApp.duel.state,0)');}
async function sheet(c,rows,path,title){
  const images=await Promise.all(rows.map(async r=>({name:r.name,data:'data:image/png;base64,'+(await readFile(join(ROOT,r.path))).toString('base64')})));
  const png=await c.evaluate(`(async()=>{const rows=${JSON.stringify(images)},c=document.createElement('canvas');c.width=1200;c.height=40+Math.ceil(rows.length/3)*265;const x=c.getContext('2d');x.fillStyle='#122124';x.fillRect(0,0,c.width,c.height);x.fillStyle='#e7d5ab';x.font='17px sans-serif';x.fillText(${JSON.stringify(title)},12,27);for(let i=0;i<rows.length;i++){const im=new Image();im.src=rows[i].data;await im.decode();const scale=Math.min(400/im.width,235/im.height),left=i%3*400,top=40+Math.floor(i/3)*265;x.drawImage(im,left+(400-im.width*scale)/2,top,im.width*scale,im.height*scale);x.fillStyle='#fff';x.font='13px sans-serif';x.fillText(rows[i].name,left+8,top+255);}return c.toDataURL();})()`);
  await writeFile(path,Buffer.from(png.split(',')[1],'base64'));
}
export async function run(c){
  const round=Number(process.env.CAM_CHOICE_ROUND||1),directory=c.outputDir,relative=pathRelative(ROOT,directory).replaceAll('\\','/');
  try{await access(join(directory,'captures.json'));throw Error('Completed camera round is immutable');}catch(e){if(e.code!=='ENOENT')throw e;}
  await mkdir(directory,{recursive:true});const report={round,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),captures:[],checks:{},frames:{},scope:'Memory-only actual input flow; stationary course position, rival aim direction and damaged armor are explicit fixtures. Absolute frame samples do not establish overhead cost.'};
  const capture=async name=>{await refresh(c);const bytes=await readFile(await c.screenshot(name)),path=`${relative}/${name}.png`;report.captures.push({name,path,sha256:createHash('sha256').update(bytes).digest('hex')});};
  for(const quality of ['high','performance']){
    await c.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await c.navigate('/tools/menu-check.html?flags=wasteland2');await c.waitFor('!!window.__qaApp?.visualReady&&!!window.__render','camera menu',60000);
    await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only QA required');a.stop();a.audio.setMuted(true);a.onFrame?.(a.duel.state,0);const qaPanel=[...document.querySelectorAll('body > details')].find(n=>n.querySelector(':scope > summary')?.textContent==='MENU QA · TEMPORARY SAVES'),metricsPanel=document.querySelector('#performance-results')?.closest('details');if(!qaPanel||!metricsPanel)throw Error('Specific QA panels missing');qaPanel.hidden=true;metricsPanel.hidden=true;const select=document.querySelector('#foot-camera');if(!select||select.closest('label').hidden)throw Error('Visible camera setting missing');select.value='overhead';select.dispatchEvent(new Event('change',{bubbles:true}));if(a.footCameraMode!=='overhead')throw Error('Menu setting failed');select.value='first-person';select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    if(quality==='high')await capture('desktop-camera-setting');
    await c.evaluate(`(()=>{const a=window.__qaApp;a.setGraphicsQuality(${JSON.stringify(quality)});a.setCamera('wide');a.startCampaign({mode:'wasteland',startStage:0,seed:1989});a.stop();const s=a.duel.state;Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[]});s.rival.s=s.s+55;s.rival.lateral=3;s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;a.duel._rival=()=>{};a.duel._traffic=()=>{};a.onFrame?.(s,0);window.__render.renderFrame();})()`);
    await c.waitFor('window.__qaApp.visualReady','camera race ready',60000);
    await key(c,'keyDown','KeyF','f',70);await c.evaluate('window.__qaApp.advance(.42)');await key(c,'keyUp','KeyF','f',70);
    await c.waitFor("window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready'",'first-person hands',60000);
    await capture(`${quality}-first-person`);
    await tap(c,'KeyC','c',67);await refresh(c);
    report.checks[quality]=await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=window.__render,g=r.scene.getObjectByName('First-person hands and gear');if(a.footCameraMode!=='overhead'||g.visible||r.camera.position.distanceTo({x:s.fighter.x,y:s.fighter.y+1.62,z:s.fighter.z})<3)throw Error('Overhead body/gear selection failed');const body=r.scene.getObjectByName('rigged-fighter-0');if(!body?.visible)throw Error('Existing local body missing');const at=a.duel.course.groundAt(s.rival.s,s.rival.lateral),f=s.fighter;f.yaw=Math.atan2(at.x-f.x,at.z-f.z);f.pitch=Math.atan2(at.y+1-f.y-1.62,Math.hypot(at.x-f.x,at.z-f.z));return{body:body.userData.crewId,footCamera:a.footCameraMode,carCamera:a.cameraMode};})()`);
    const point=await c.evaluate(`(()=>{const r=document.querySelector('#view3d canvas').getBoundingClientRect();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};})()`);
    const mouse=(type,button)=>c.command('Input.dispatchMouseEvent',{type,button,clickCount:1,...point});
    await mouse('mousePressed','right');await c.waitFor('!!document.pointerLockElement','overhead aim pointer lock',10000);await c.evaluate('window.__qaApp.advance(.81)');await capture(`${quality}-overhead-aim`);
    report.frames[quality]=await c.evaluate(`(async()=>{const times=[];let last=null;for(let i=0;i<121;i++){const t=await new Promise(requestAnimationFrame);if(last!==null)times.push(t-last);last=t;}const sorted=[...times].sort((a,b)=>a-b);return{times,p95:sorted[113],draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};})()`);
    await mouse('mousePressed','left');await c.evaluate('window.__qaApp.advance(.1)');await mouse('mouseReleased','left');
    report.checks[quality].shot=await c.evaluate(`(()=>{const s=window.__qaApp.duel.state;if(s.footWeapons.ammo!==2||!s.combat.projectiles.some(p=>p.kind==='rpg'))throw Error('Overhead shot failed');return{ammo:s.footWeapons.ammo};})()`);await capture(`${quality}-overhead-fire`);await mouse('mouseReleased','right');
    await tap(c,'Digit2','2',50);await c.evaluate('window.__qaApp.duel.state.armor=40;window.__qaApp.duel.state.footWeapons.lastArmor=40');await mouse('mousePressed','left');await c.evaluate('window.__qaApp.advance(1)');await capture(`${quality}-overhead-repair`);await c.evaluate('window.__qaApp.advance(3.02)');await mouse('mouseReleased','left');
    if(!await c.evaluate('Math.abs(window.__qaApp.duel.state.armor-80)<.01'))throw Error('Overhead repair failed');
    await c.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await capture(`${quality}-phone-overhead`);
    await tap(c,'Escape','Escape',27);await c.waitFor('window.__qaApp.duel.state.paused&&!document.pointerLockElement','pause cleanup',10000);
    await refresh(c);const resume=await c.evaluate(`(()=>{const b=document.querySelector('[data-action="resume"]');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    for(const type of ['mousePressed','mouseReleased'])await c.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...resume});
    await c.waitFor('!window.__qaApp.duel.state.paused','resume button',10000);
    await key(c,'keyDown','KeyF','f',70);await c.evaluate('window.__qaApp.advance(.62)');await key(c,'keyUp','KeyF','f',70);await c.evaluate('window.__qaApp.advance(1/120)');await refresh(c);
    report.checks[quality].reentry=await c.evaluate(`(()=>{const a=window.__qaApp;if(a.duel.state.onFoot||a.cameraMode!=='wide'||document.pointerLockElement||window.__render.scene.getObjectByName('First-person hands and gear').visible)throw Error('Car camera/reentry cleanup failed');return{carCamera:a.cameraMode,footCamera:a.footCameraMode,pausedCleanup:true};})()`);
  }
  await writeFile(join(directory,'captures.json'),JSON.stringify(report,null,2)+'\n');
  const sheetPath=join(directory,'contact-sheet.png');
  await sheet(c,report.captures,sheetPath,`On-foot camera choice · round ${round}`);
  await publishReviewSheet(c,sheetPath,'onfoot-camera-choice',round);
  console.log(`Camera choice round ${round}: ${report.captures.length} actual images; both-quality setting/switch/aim/fire/repair/pause/reentry passed.`);
}
