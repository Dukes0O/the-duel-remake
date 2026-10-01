import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {UnsignedByteType} from 'three';

// Current shipped women only. WAR-04 has not exposed Vesper's figure.
export async function run(context) {
  await mkdir(context.outputDir,{recursive:true});
  for(const crew of ['nell','odessa','wren']) {
    await context.navigate('/tools/menu-check.html?flags=wasteland2');
    await context.waitFor('window.__qaApp?.visualReady && !!window.__render','private art menu',60000);
    await context.evaluate(`(() => {
      if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
          !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Private memory store required');
      const app=window.__qaApp;app.stop();
      app.duel.startCampaign({mode:'wasteland',car:'banshee_muscle',startStage:0,
        seed:1989,discoveredGate:true,crewId:'${crew}'});
      const s=app.duel.state;
      Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
        speedMph:0,traffic:[],opponents:[],stageTimeSec:10,crewId:'${crew}'});
      s.raids=null;s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
      s.input.interact=true;
      for(let i=0;i<50&&!s.onFoot;i++)app.duel.step(1/120);
      if(!s.onFoot||s.fighter.crewId!=='${crew}')throw Error('Production crew exit failed');
      s.input.interact=false;s.fighter.presentation=null;
      app._footCameraMode='overhead';window.__render.renderFrame();
    })()`);
    await context.waitFor(`window.__render.scene.getObjectByName('Rigged on-foot fighters')?.userData.crews.${crew}==='ready'`,'current '+crew+' GLB',60000);
    const result=await context.evaluate(`(() => {
      const r=window.__render,s=window.__qaApp.duel.state;
      window.requestAnimationFrame=()=>0;
      Object.assign(s.fighter,{x:0,y:0,z:0,yaw:0,groundY:0,speed:0});
      s.stageTimeSec=.25;r.renderFrame();
      const rig=r.scene.getObjectByName('Rigged on-foot fighters');
      const active=rig.children.find(n=>n.visible&&n.userData.crewId==='${crew}'&&n.userData.clip==='idle');
      if(!active)throw Error('Current idle crew required');
      const lights=[];r.scene.traverse(n=>{if(n.isLight)lights.push(n.clone());});
      r.scene.add(rig,...lights);
      for(const child of r.scene.children)child.visible=child===rig||lights.includes(child);
      rig.visible=true;r.scene.fog=null;r.scene.environment=null;
      const skin=active.getObjectByProperty('isSkinnedMesh',true);
      r.scene.background=skin.material.color.clone().setHex(0x777777);
      r.renderer.setPixelRatio(1);r.renderer.setSize(432,576,false);
      r.camera.position.set(0,.96,5);r.camera.lookAt(0,.96,0);
      r.camera.fov=28;r.camera.aspect=432/576;r.camera.updateProjectionMatrix();
      const target=new r.composer.renderTarget1.constructor(432,576,{type:${UnsignedByteType},depthBuffer:true});
      target.texture.colorSpace=r.renderer.outputColorSpace;
      const pixels=new Uint8Array(432*576*4);
      r.renderer.shadowMap.enabled=false;r.renderer.setScissorTest(false);r.renderer.setRenderTarget(target);
      r.renderer.clear(true,true,true);r.renderer.info.reset();r.renderer.render(r.scene,r.camera);
      if(r.renderer.info.render.calls!==1)throw Error('Current crew must draw only production skin');
      r.renderer.readRenderTargetPixels(target,0,0,432,576,pixels);
      r.renderer.setRenderTarget(null);target.dispose();
      const canvas=document.createElement('canvas');canvas.width=432;canvas.height=576;
      const data=new Uint8ClampedArray(pixels.length);
      for(let y=0;y<576;y++)data.set(pixels.subarray(y*432*4,(y+1)*432*4),(575-y)*432*4);
      canvas.getContext('2d').putImageData(new ImageData(data,432,576),0,0);
      const visible=n=>{for(let p=n;p;p=p.parent)if(p.visible!==true)return false;return true;};
      const meshes=[];rig.traverse(n=>{if(n.isMesh&&visible(n))meshes.push({name:n.name,triangles:n.geometry.index.count/3});});
      if(meshes.length!==1||meshes[0].name!=='${crew}-near')throw Error('Expected current near crew skin');
      return {png:canvas.toDataURL('image/png'),crewId:'${crew}',clip:active.userData.clip,
        detail:active.userData.detail,drawCalls:r.renderer.info.render.calls,
        triangles:r.renderer.info.render.triangles,meshes};
    })()`);
    const image=join(context.outputDir,'current-'+crew+'.png');
    await writeFile(image,Buffer.from(result.png.split(',')[1],'base64'));context.screenshots.push(image);
    const {png,...metrics}=result;
    await writeFile(join(context.outputDir,'current-'+crew+'.json'),JSON.stringify(metrics,null,2)+'\n');
    console.log('Current production woman: '+JSON.stringify(metrics));
  }
}
