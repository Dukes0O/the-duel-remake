// Real unchanged circuit kits through production world readiness. Memory-only;
// no art round or frame measurement. Run only in the Director's quiet slot.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {TRACK_KIT_IDS} from '../../src/track-kits.js';

function stage(entries,quality) {
  const app=window.__qaApp;
  if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
      !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only QA required');
  app.stop();app.audio.setMuted(true);app.setGraphicsQuality(quality);
  const def=app.getMenuCourse(0).def;
  const original=Object.getOwnPropertyDescriptor(def,'kitPlacements');
  try {
    Object.defineProperty(def,'kitPlacements',{value:entries,enumerable:true,configurable:true,writable:true});
    app.duel.startCampaign({mode:'grandprix',startStage:0,car:'falcone_f42',seed:1989,
      fieldSeed:12,fieldSize:7,cpuDifficulty:'medium'});
    app.duel.course.def={...def};
  } finally {
    if(original)Object.defineProperty(def,'kitPlacements',original);else delete def.kitPlacements;
  }
  if(JSON.stringify(Object.getOwnPropertyDescriptor(def,'kitPlacements'))!==JSON.stringify(original))
    throw Error('Native catalog did not restore');
  const course=app.duel.course,target=course.groundAt(150,100),eye=course.groundAt(50,100);
  app.inspectionCamera={position:[eye.x,eye.y+45,eye.z],target:[target.x,target.y+4,target.z]};
  app.onFrame?.(app.duel.state,0);window.__render.renderFrame();
  window.__kitState=JSON.stringify(app.duel.state);window.__kitProfile=JSON.stringify(app.profile);
}

export async function run(context) {
  const report={passed:false,qualities:[]};
  const persist=()=>writeFile(join(context.outputDir,'track-kits.json'),JSON.stringify(report,null,2)+'\n');
  try {
    for(const quality of ['high','performance']) {
      await context.navigate('/tools/menu-check.html?flags=grand-prix');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render','native empty-route ready',60000);
      const rows=TRACK_KIT_IDS.map((id,index)=>({id,s:100+Math.floor(index/7)*50,
        lateral:80}));
      await context.evaluate('('+stage.toString()+')('+JSON.stringify(rows)+','+JSON.stringify(quality)+')');
      await context.waitFor(`(() => {const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
        return document.querySelector('#view3d').dataset.trackKitAsset==='ready' && a.visualReady;})()`,
        quality+' complete native kit world and shader preparation',60000);
      const detail=await context.evaluate(`(() => {
        const app=window.__qaApp,view=window.__render,group=view.scene.getObjectByName('Approved track kits');
        if(!group?.children.length)throw Error('Production world kit group missing');
        const versions=new Set(),textures=new Set();let batches=0,skins=0;
        group.traverse(node=>{if(node.isInstancedMesh){batches++;versions.add(node.userData.trackKitVersion);}
          if(node.isSkinnedMesh)skins++;
          if(node.isMesh)for(const material of [].concat(node.material||[]))
            for(const value of Object.values(material))if(value?.isTexture)textures.add(value);});
        if(!batches||!skins||versions.size!==2||!textures.size)throw Error('Real native High/LOD kit content incomplete');
        for(const texture of textures){const image=texture.image;if(!image||!image.width||!image.height)
          throw Error('Actual runtime kit texture failed decoding');}
        const highBatches=group.children.filter(node=>node.isInstancedMesh&&node.userData.trackKitVersion==='high');
        const active=mesh=>{const array=mesh.instanceMatrix.array;for(let i=0;i<array.length;i+=16)
          if(array[i]||array[i+1]||array[i+2])return true;return false;};
        if(${JSON.stringify(quality)}==='performance'&&highBatches.some(active))throw Error('Performance submitted High kit instances');
        if(${JSON.stringify(quality)}==='high'&&!highBatches.some(active))throw Error('Near High kit instances missing');
        if(view.renderer.info.programs.some(program=>!program.isReady()))throw Error('Kit world claimed ready before native shader readiness');
        if(JSON.stringify(app.duel.state)!==window.__kitState||JSON.stringify(app.profile)!==window.__kitProfile)
          throw Error('Kit loading or rendering changed race/profile');
        return {batches,skins,textures:textures.size,worldBuilds:document.querySelector('#view3d').dataset.worldBuilds,
          programs:view.renderer.info.programs.length};
      })()`);
      // Advance the actual seeded GP countdown without running race physics.
      for(let light=1;light<=5;light++) {
        await context.evaluate(`(() => {const app=window.__qaApp;for(let i=0;i<10;i++)app.duel.step(.1);
          const before=JSON.stringify(app.duel.state);window.__render.renderFrame();
          const group=window.__render.scene.getObjectByName('Approved track kits');
          let count=0;group.traverse(node=>{if(node.isMesh&&/^lamp-[1-5]$/.test(node.name)){
            const expected=Number(node.name.slice(-1))<=${light};
            if((node.material.emissiveIntensity>0)!==expected)throw Error('Genuine GP lamp sequence mismatch');count++;}});
          if(count!==10)throw Error('Both native gantry versions need five named lamps');
          if(app.duel.state.field.start.lights!==${light}||JSON.stringify(app.duel.state)!==before)
            throw Error('Presentation changed genuine countdown');})()`);
      }
      await context.evaluate(`(() => {const a=window.__qaApp;while(a.duel.state.status==='countdown')a.duel.step(.1);
        const before=JSON.stringify(a.duel.state);window.__render.renderFrame();
        const group=window.__render.scene.getObjectByName('Approved track kits');
        group.traverse(node=>{if(node.isMesh&&/^lamp-[1-5]$/.test(node.name)&&node.material.emissiveIntensity!==0)
          throw Error('Countdown lamps did not go dark');});
        if(JSON.stringify(a.duel.state)!==before)throw Error('Lights-out render changed simulation');})()`);
      report.qualities.push({quality,...detail});await persist();
      // A bad authored source uses the existing visible error and never claims ready.
      await context.evaluate('('+stage.toString()+')('+JSON.stringify([{id:'missing-kit',s:100,lateral:80}])+','+JSON.stringify(quality)+')');
      await context.waitFor(`(() => {const a=window.__qaApp;window.__render.renderFrame();a.onFrame?.(a.duel.state,0);
        return document.querySelector('#view3d').dataset.trackKitAsset==='error' &&
          !document.querySelector('#renderer-error').hidden && !a.visualReady;})()`,quality+' visible source failure',10000);
      await context.evaluate(`(() => {const group=window.__render.scene.getObjectByName('Approved track kits');
        if(document.querySelector('#renderer-error strong').textContent!=="The track scenery couldn't load.")
          throw Error('Kit source error not shown');
        const app=window.__qaApp;app.returnToMenu();app.onFrame?.(app.duel.state,0);window.__render.renderFrame();})()`);
      await context.waitFor(`(() => {window.__render.renderFrame();return window.__qaApp.visualReady &&
        document.querySelector('#view3d').dataset.trackKitAsset==='off';})()`,quality+' empty route recovery',60000);
    }
    report.passed=true;
  } finally {await persist();}
  console.log('Track kits: real textures, both native qualities, genuine countdown, read-only state and visible source failure passed.');
}
