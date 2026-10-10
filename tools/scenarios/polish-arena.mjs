import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function settled(c) {
  await c.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;
    a.onFrame(a.duel.state,0);r.renderFrame();return a.visualReady &&
    document.querySelector('#renderer-loading')?.hidden &&
    r.scene.getObjectByName('Salt Flats')?.userData.assetStatus==='ready' &&
    r.scene.getObjectByName('convoy-tanker')?.children.length>0;})()`, 'native Salt and tanker ready',60000);
}
export async function run(c) {
  const report={card:'POLISH-ARENA',variant:process.env.ARENA_POLISH_VARIANT||'after',captures:[],frames:[]};
  await c.command('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']) {
    await c.navigate('/tools/menu-check.html?harness=polish-arena-'+quality);
    await c.waitFor('!!window.__qaApp && !!window.__render','private app',60000);
    await c.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
      if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only fixture required');
      a.setGraphicsQuality('${quality}');a.duel.state.wastelandGateDiscovered=true;
      if(!a.duel.startArenaEvent({venueId:'salt-flats',mode:'convoy-raid',car:'falcone_f42',seed:1989,
        opponents:[{car:'dusthawk_rally'},{car:'aurora_gt'},{car:'dusthawk_rally'}]}))throw Error('Convoy entry failed');
      for(let i=0;i<720;i++)a.duel.step(1/120);a.setCamera('chase');
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    })()`);
    await settled(c);
    for(const view of ['island','ridges','tanker']) {
      const witness=await c.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state,r=window.__render;
        const rig=s.opponents[0],p=d.course.groundAt(rig.s,rig.lateral),h=p.heading;
        const view='${view}';
        if(view==='island')a.inspectionCamera={position:[-105,58,115],target:[0,0,0]};
        if(view==='ridges')a.inspectionCamera={position:[-40,38,-54],target:[-40,0,-72]};
        if(view==='tanker') {
          a.inspectionCamera={position:[p.x-Math.sin(h)*88+Math.cos(h)*8,p.y+12,p.z-Math.cos(h)*88-Math.sin(h)*8],target:[p.x,p.y+2,p.z]};
          s.arena.convoy.valves=[0,0,0];
        }
        // Pin inspection pose before rendering so vertical camera damping
        // cannot make baseline/candidate witnesses depend on capture timing.
        r.camera.position.fromArray(a.inspectionCamera.position);
        const before=JSON.stringify(s);a.onFrame(s,0);r.renderFrame();
        if(JSON.stringify(s)!==before)throw Error('Renderer changed race state');
        const tanker=r.scene.getObjectByName('convoy-tanker');
        const far=tanker.getObjectByName('convoy-tanker-distant');
        const lamps=[];far.traverse(n=>{if(n.isMesh&&n.name.startsWith('tanker-warning-lamp-'))lamps.push(n.material.emissiveIntensity);});
        return {view,quality:'${quality}',raceStateUnchanged:true,distantVisible:far.visible,lamps,
          cameraDistance:r.camera.position.distanceTo(tanker.position)};})()`);
      if(view==='tanker'&&(!witness.distantVisible||witness.cameraDistance<85||witness.cameraDistance>90||
          witness.lamps.length!==2||witness.lamps.some(value=>value<=0)))throw Error('Expected lit distant tanker at native play distance');
      await settled(c);
      await c.evaluate(`document.querySelector('.combat-opponent-layer').style.visibility='hidden'`);
      const path=await c.screenshot(quality+'-'+view);report.captures.push({...witness,path});
    }
    if(process.env.ARENA_POLISH_FRAMES==='1') {
      const frames=await c.evaluate(`new Promise(done=>{const a=window.__qaApp,r=window.__render,rows=[];let last;
        function tick(t){a.onFrame(a.duel.state,0);r.renderFrame();if(last!==undefined)rows.push(t-last);last=t;
          if(rows.length<240)return requestAnimationFrame(tick);const sorted=[...rows].sort((x,y)=>x-y);
          done({samples:rows.length,meanMs:rows.reduce((x,y)=>x+y,0)/rows.length,p95Ms:sorted[Math.ceil(rows.length*.95)-1],
            calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles});}requestAnimationFrame(tick);})`);
      report.frames.push({quality,...frames});
    }
  }
  await writeFile(join(c.outputDir,'polish-arena.json'),JSON.stringify(report,null,2)+'\n');
}
