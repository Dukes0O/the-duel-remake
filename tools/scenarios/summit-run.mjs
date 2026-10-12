// P4-SUMMIT actual native art. Existing browser harness, private memory-only
// storage, no frame timing. node tools/browser-harness.mjs scenario summit-run
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SUMMIT_RUN} from '../../src/circuits/summit-run.js';
import {buildTrackScript} from '../../src/track-script.js';

const entry='/tools/menu-check.html?flags=grand-prix,snow-world,summit-run';
const road=buildTrackScript(SUMMIT_RUN);
const centre=name=>{const piece=road.pieces.find(piece=>piece.name===name);if(!piece)throw Error('Missing actual Summit piece '+name);return (piece.s0+piece.s1)/2;};
const views=[
  ['desert-foothills',centre('Cattle Grid Jump'),12,100],
  ['pine-switchbacks',centre("Engineer's Hairpin"),16,80],
  ['tree-line-pit',centre('Tree Line Pit Straight'),7,90],
  ['upper-snow',centre('Whiteout Crest'),9,75],
  ['gallery-open-road',(SUMMIT_RUN.galleries[0].start+SUMMIT_RUN.galleries[0].end)/2,4,80],
  ['devils-staircase',centre("Devil's Elbow"),15,75],
  ['summit-landmarks',road.length-150,13,100],
];

export async function run(context){
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const photos=[],facts=[];
  for(const quality of ['high','performance']){
    await context.navigate(entry);
    await context.waitFor(`document.readyState==='complete'&&window.__qaApp&&window.__render&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&!document.querySelector('#start-engine')?.disabled`,'native Summit menu',60000);
    await context.evaluate(`(()=>{
      const app=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage is required');
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      const index=[...document.querySelector('#scene-select').options].map(option=>Number(option.value)).find(index=>app.getMenuCourse(index)?.def.id==='summit-run');
      if(index==null)throw Error('Actual Summit is missing from the course list');
      app.profile={...app.profile,credits:1e6,courses:{version:1,unlocked:[...new Set([...(app.profile.courses?.unlocked||[]),'summit-run'])]}};
      if(!app._saveProfile())throw Error('Memory fixture save failed');
      window.__summitCourse=app.getMenuCourse(index);
      if(!app.startCampaign({startStage:index,seed:1989,fieldSeed:4242,mode:'grandprix',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',tyre:'summer'}))throw Error('Actual Summit did not start');
      app.stop();app.autopilot=false;app._scriptedCrashDone=true;app.setCamera('chase');
      for(const node of document.querySelectorAll('details'))node.style.display='none';
    })()`);
    await context.waitFor(`(()=>{const app=window.__qaApp;app.onFrame?.(app.duel.state,0);window.__render.renderFrame();return app.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`,'native Summit grid prepared',90000);
    const grid=await context.evaluate(`(()=>{
      const app=window.__qaApp,s=app.duel.state;
      if(app.duel.course.def.id!=='summit-run'||app.duel.course.closed||s.field?.size!==6||s.opponents.length!==5||s.lapsTotal!==1||s.combat||s.traffic.length)throw Error('Real Summit setup differs from the card');
      return {quality:${JSON.stringify(quality)},id:app.duel.course.def.id,size:s.field.size,laps:s.lapsTotal,positions:[s,...s.opponents].map(actor=>actor.s)};
    })()`);
    facts.push(grid);
    const gridShot=await context.command('Page.captureScreenshot',{format:'jpeg',quality:85,captureBeyondViewport:false});
    photos.push({label:quality+' six-car grid',url:'data:image/jpeg;base64,'+gridShot.data});
    await context.evaluate(`(()=>{
      const app=window.__qaApp;app.returnToMenu();app.stop();
      window.__summitReadOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,storage:Array.from({length:localStorage.length},(_,i)=>{const key=localStorage.key(i);return [key,localStorage.getItem(key)];})});
    })()`);
    for(const [name,s,up,ahead] of views){
      await context.evaluate(`(()=>{
        window.__summitSnapshot={before:window.__summitReadOnly(),settled:false};
        window.__render.captureTrackSnapshot({course:window.__summitCourse,flag:{id:${JSON.stringify(name)},snapshotS:${s},camera:{up:${up},ahead:${ahead}}}}).then(canvas=>{window.__summitSnapshot.canvas=canvas;window.__summitSnapshot.settled=true;},error=>{window.__summitSnapshot.error=error.message;window.__summitSnapshot.settled=true;});
        window.__render.renderFrame();
      })()`);
      await context.waitFor(`(()=>{window.__render.renderFrame();return window.__summitSnapshot.settled;})()`,quality+' '+name,25000);
      const photo=await context.evaluate(`(()=>{
        const shot=window.__summitSnapshot;
        if(shot.error)throw Error(shot.error);
        if(shot.before!==window.__summitReadOnly())throw Error('Snapshot changed state/profile/memory saves');
        if(!shot.canvas||document.querySelector('#view3d')?.dataset.trackKitAsset!=='ready')throw Error('Actual approved Summit kits are not ready');
        return shot.canvas.toDataURL('image/jpeg',.88);
      })()`);
      photos.push({label:quality+' '+name,url:photo});
      await context.evaluate('window.__render.clearTrackSnapshot()');
    }
  }
  const sheet=await context.evaluate(`(async()=>{
    const photos=${JSON.stringify(photos)},canvas=document.createElement('canvas'),columns=4,tile=480,h=270,pad=5,label=23;
    canvas.width=columns*(tile+pad)+pad;canvas.height=45+Math.ceil(photos.length/columns)*(h+label+pad)+pad;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#101920';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f0eee1';ctx.font='22px sans-serif';ctx.fillText('Summit Run - round one / actual High and Performance views',12,31);
    for(const [i,photo] of photos.entries()){
      const image=new Image();image.src=photo.url;await image.decode();const x=pad+(i%columns)*(tile+pad),y=45+pad+Math.floor(i/columns)*(h+label+pad);
      ctx.drawImage(image,x,y,tile,h);ctx.font='15px sans-serif';ctx.fillText(photo.label,x+4,y+h+17);
    }
    for(const quality of [.85,.75,.65,.55,.45,.35]){const url=canvas.toDataURL('image/jpeg',quality);if(url.length*3/4<=490000)return {url,width:canvas.width,height:canvas.height,quality};}
    throw Error('Actual sheet exceeds 500 KB');
  })()`);
  const sheetPath=join(context.outputDir,'round-1.jpg'),bytes=Buffer.from(sheet.url.split(',')[1],'base64');
  if(bytes.length>500000)throw Error('Actual sheet exceeds 500 KB');
  await writeFile(sheetPath,bytes);context.screenshots.push(sheetPath);
  await writeFile(join(context.outputDir,'summit-run.json'),JSON.stringify({memoryOnly:true,frameMeasurement:false,facts,views:photos.map(photo=>photo.label),sheet:{bytes:bytes.length,width:sheet.width,height:sheet.height,quality:sheet.quality}},null,2)+'\n');
  console.log(`Summit native views: ${photos.length}, ${bytes.length} byte sheet; no frame timing.`);
}
