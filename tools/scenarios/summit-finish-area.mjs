// Round 2: five requested poses, High/Performance, dusk/night. No timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SUMMIT_PADS} from '../../src/ski/runs/summit-zones.js';

const poses=['car-100m','car-30m','at-line','helipad','wide'];
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const photos=[],facts=[];
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=grand-prix,snow-world,summit-run');
    await context.waitFor(`window.__qaApp&&window.__render&&!document.querySelector('#start-engine')?.disabled`,'Summit menu',60000);
    await context.evaluate(`(()=>{
      const app=window.__qaApp;
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage required');
      app.stop();app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
      const index=[...document.querySelector('#scene-select').options].map(o=>Number(o.value)).find(i=>app.getMenuCourse(i)?.def.id==='summit-run');
      window.__finishOriginal=app.getMenuCourse(index);
      window.__finishReadOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,storage:Array.from({length:localStorage.length},(_,i)=>{const k=localStorage.key(i);return [k,localStorage.getItem(k)];})});
    })()`);
    for(const look of ['dusk','night']){
      await context.evaluate(`(()=>{
        const original=window.__finishOriginal;
        // Declared ART lighting copies; normal race lighting is unchanged.
        window.__finishCourse=new original.constructor({...original.def,lightPath:{axis:'distance',keyframes:[{at:0,look:${JSON.stringify(look)}},{at:original.length,look:${JSON.stringify(look)}}]}},original.seed);
      })()`);
      for(const name of poses){
        await context.evaluate(`(()=>{
          const c=window.__finishCourse,end=c.at(c.length),name=${JSON.stringify(name)};
          const extended=(along,off=0)=>{const p=c.worldAt(Math.min(c.length,c.length+along),off);if(along>0){p.x+=Math.sin(end.heading)*along;p.z+=Math.cos(end.heading)*along;}return p;};
          let position,target;
          if(name.startsWith('car-')||name==='at-line'){
            const back=name==='car-100m'?100:name==='car-30m'?30:0;
            position=extended(-back);position.y+=1.65;target=extended(35);target.y+=1.3;
          }else if(name==='wide'){
            position=extended(-75,-60);position.y+=40;target=extended(12);target.y+=2;
          }else{
            const pad=${JSON.stringify(SUMMIT_PADS.summit)},hut=extended(-16,17);
            const dx=hut.x-pad.x,dz=hut.z-pad.z,length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
            position={x:pad.x-ux*20,y:pad.y+2,z:pad.z-uz*20};target={x:pad.x+ux*24,y:pad.y+.5,z:pad.z+uz*24};
          }
          const camera=window.__render.camera,lookAt=camera.lookAt;
          // Capture-only override uses the real world, lighting and quality
          // pipeline. No simulation mutation or new renderer API is needed.
          window.__finishRestore=()=>{camera.lookAt=lookAt;};
          camera.lookAt=function(){this.position.set(position.x,position.y,position.z);return lookAt.call(this,target.x,target.y,target.z);};
          window.__finishShot={done:false,before:window.__finishReadOnly(),position,target};
          window.__render.captureTrackSnapshot({course:c,flag:{id:'finish-'+name,snapshotS:c.length-40,camera:{up:2,ahead:30}}})
            .then(canvas=>Object.assign(window.__finishShot,{done:true,url:canvas.toDataURL('image/jpeg',.9)}),error=>Object.assign(window.__finishShot,{done:true,error:error.message}));
        })()`);
        await context.waitFor(`(()=>{window.__render.renderFrame();return window.__finishShot.done;})()`,`${quality} ${look} ${name}`,60000);
        const shot=await context.evaluate(`(()=>{
          const shot=window.__finishShot;window.__finishRestore();
          if(shot.error)throw Error(shot.error);
          if(shot.before!==window.__finishReadOnly())throw Error('Capture changed race/profile/memory storage');
          if(document.querySelector('#view3d').dataset.trackKitAsset!=='ready')throw Error('Actual High/LOD kits not ready');
          return {url:shot.url,position:shot.position,target:shot.target};
        })()`);
        await writeFile(join(context.outputDir,`${quality}-${look}-${name}.jpg`),Buffer.from(shot.url.split(',')[1],'base64'));
        photos.push({quality,look,name,url:shot.url});facts.push({quality,look,name,position:shot.position,target:shot.target});
        await context.evaluate('window.__render.clearTrackSnapshot()');
      }
    }
  }
  const result=await context.evaluate(`(async()=>{
    const photos=${JSON.stringify(photos)},poses=${JSON.stringify(poses)},columns=[['high','dusk'],['performance','dusk'],['high','night'],['performance','night']];
    const canvas=document.createElement('canvas'),tile=480,h=270,pad=5,label=24;
    canvas.width=1945;canvas.height=55+poses.length*(h+label+pad);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#111b24';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#f2eee4';ctx.font='23px sans-serif';
    ctx.fillText('SUMMIT FINISH / ROUND 2 / native High + Performance / dusk + night',12,32);
    for(let row=0;row<poses.length;row++)for(let col=0;col<4;col++){
      const [quality,look]=columns[col],photo=photos.find(p=>p.name===poses[row]&&p.quality===quality&&p.look===look);
      const img=new Image();img.src=photo.url;await img.decode();const x=pad+col*(tile+pad),y=55+row*(h+label+pad);
      ctx.drawImage(img,x,y,tile,h);ctx.font='16px sans-serif';ctx.fillText(quality+' / '+look+' / '+poses[row],x+3,y+h+18);
    }
    for(const quality of [.88,.8,.72,.64,.56,.48,.4]){const url=canvas.toDataURL('image/jpeg',quality);if(url.length*.75<490000)return {url,width:canvas.width,height:canvas.height};}
    throw Error('Round 2 sheet exceeds 500 KB');
  })()`);
  const path=join(context.outputDir,'round-2.jpg'),bytes=Buffer.from(result.url.split(',')[1],'base64');
  await writeFile(path,bytes);context.screenshots.push(path);
  await writeFile(join(context.outputDir,'summit-finish-area.json'),JSON.stringify({round:2,memoryOnly:true,frameMeasurement:false,artLightingCopies:true,facts,sheet:{bytes:bytes.length,width:result.width,height:result.height}},null,2)+'\n');
  console.log(`Round 2: ${photos.length} native views, ${bytes.length} byte sheet; no frame timing.`);
}
