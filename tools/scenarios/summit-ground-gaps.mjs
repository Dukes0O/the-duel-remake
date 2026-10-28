// Manual card evidence: the five areas in Kyle's 26 October pictures.
// No frame timing. Run with tools/browser-harness.mjs scenario summit-ground-gaps.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=grand-prix,snow-world,summit-run');
  await context.waitFor(`window.__qaApp&&window.__render&&!document.querySelector('#start-engine')?.disabled`, 'Summit menu',60000);
  await context.evaluate(`(()=>{
    const app=window.__qaApp;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage required');
    app.stop();app.audio.setMuted(true);app.setGraphicsQuality('high');
    const index=[...document.querySelector('#scene-select').options].map(o=>Number(o.value)).find(i=>app.getMenuCourse(i)?.def.id==='summit-run');
    window.__groundCourse=app.getMenuCourse(index);
  })()`);
  const views=[['15-foothills',3650],['16-pine-entry',4700],['17-switchbacks',5620],['18-snowfields',7990],['19-gallery',10450]];
  for(const leg of ['before','after']){
    await context.evaluate(`(()=>{
      const original=window.__groundCourse;
      window.__groundLeg=${JSON.stringify(leg)}==='before'?new original.constructor({...original.def,scenery:{...original.def.scenery,continuousGround:false}},original.seed):original;
    })()`);
    for(const [name,s] of views){
    await context.evaluate(`(()=>{
      window.__groundShot={done:false};
      window.__render.captureTrackSnapshot({course:window.__groundLeg,flag:{id:${JSON.stringify(name)},snapshotS:${s},camera:{up:2.5,ahead:90}}})
        .then(canvas=>Object.assign(window.__groundShot,{done:true,url:canvas.toDataURL('image/jpeg',.9)}),error=>Object.assign(window.__groundShot,{done:true,error:error.message}));
    })()`);
    await context.waitFor(`(()=>{window.__render.renderFrame();return window.__groundShot.done;})()`,name,60000);
    const shot=await context.evaluate(`window.__groundShot`);
    if(shot.error)throw Error(shot.error);
    const path=join(context.outputDir,leg+'-'+name+'.jpg');
    await writeFile(path,Buffer.from(shot.url.split(',')[1],'base64'));context.screenshots.push(path);
    await context.evaluate('window.__render.clearTrackSnapshot()');
    }
  }
}
