import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {UnsignedByteType} from 'three';

// Source shortlist capture only. Load the production wall through the real
// course renderer using a private memory-only fixture; no profile is changed.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width:1280,height:720,deviceScaleFactor:1,mobile:false,
  });
  await context.navigate('/tools/menu-check.html?flags=hidden-road,wasteland2');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'private Rustwall menu', 60000);
  await context.evaluate(`(() => {
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
       !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only QA storage required');
    const app=window.__qaApp;app.stop();app.audio.setMuted(true);
    if(!app.duel.startHiddenRoadVisit({seed:1989,car:'banshee_muscle'}))
      throw Error('Production Hidden Road visit unavailable');
    Object.assign(app.duel.state,{status:'racing',countdown:0,paused:false,
      speedMph:0,traffic:[],opponents:[],rival:null});
    app.inspectionCamera=null;window.__render.renderFrame();
  })()`);
  await context.waitFor(`(() => {
    const r=window.__render;r.renderFrame();const wall=r.scene.getObjectByName('Rustwall');
    if(wall?.userData.assetStatus==='failed')throw Error(wall.userData.loadErrors.join('; '));
    return wall?.userData.assetStatus==='ready';
  })()`, 'current production Rustwall', 60000);
  const capture=await context.evaluate(`(() => {
    const app=window.__qaApp,r=window.__render,road=app.duel.course.hiddenRoad;
    window.requestAnimationFrame=()=>0;
    const at=road.poseAt(road.length),h=at.heading;
    const world=local=>[at.x+Math.cos(h)*local[0]+Math.sin(h)*local[2],
      at.y+local[1],at.z-Math.sin(h)*local[0]+Math.cos(h)*local[2]];
    const position=world([0,21,-95]),target=world([0,19,0]);
    app.inspectionCamera={position,target};r.renderFrame();
    const wall=r.scene.getObjectByName('Rustwall');
    wall.userData.setGateOpen(0);
    const lights=[];r.scene.traverse(n=>{if(n.isLight)lights.push(n.clone());});
    const placement=wall.getObjectByName('Rustwall gate placement');
    if(!placement?.getObjectByName('gate-panel'))throw Error('Production gate mesh missing');
    placement.updateWorldMatrix(true,true);r.scene.attach(placement);r.scene.add(...lights);
    for(const child of r.scene.children)child.visible=child===placement||lights.includes(child);
    r.scene.fog=null;r.scene.environment=null;
    const material=placement.getObjectByProperty('isMesh',true).material;
    r.scene.background=material.color.clone().setHex(0x7b7770);
    r.renderer.setPixelRatio(1);r.renderer.setSize(1280,720,false);
    r.camera.position.fromArray(position);r.camera.lookAt(...target);
    r.camera.fov=32;r.camera.aspect=1280/720;r.camera.near=.1;r.camera.updateProjectionMatrix();
    const output=new r.composer.renderTarget1.constructor(1280,720,{type:${UnsignedByteType},depthBuffer:true});
    output.texture.colorSpace=r.renderer.outputColorSpace;
    const pixels=new Uint8Array(1280*720*4);
    r.renderer.shadowMap.enabled=false;r.renderer.setScissorTest(false);
    r.renderer.setRenderTarget(output);r.renderer.clear(true,true,true);
    r.renderer.info.reset();r.renderer.render(r.scene,r.camera);
    r.renderer.readRenderTargetPixels(output,0,0,1280,720,pixels);
    r.renderer.setRenderTarget(null);output.dispose();
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const flipped=new Uint8ClampedArray(pixels.length);
    for(let y=0;y<720;y++)flipped.set(pixels.subarray(y*1280*4,(y+1)*1280*4),(719-y)*1280*4);
    canvas.getContext('2d').putImageData(new ImageData(flipped,1280,720),0,0);
    if(r.renderer.info.render.calls<1||r.renderer.info.render.triangles<1000)
      throw Error('Current wall was not drawn');
    return {png:canvas.toDataURL('image/png'),drawCalls:r.renderer.info.render.calls,
      triangles:r.renderer.info.render.triangles,camera:{position,target,fov:32},
      assetStatus:wall.userData.assetStatus,loadErrors:wall.userData.loadErrors,
      scope:'Production wall GLB and renderer, isolated closed-gate front view; private memory-only fixture'};
  })()`);
  const path=join(context.outputDir,'current-rustwall.png');
  await writeFile(path,Buffer.from(capture.png.split(',')[1],'base64'));
  context.screenshots.push(path);
  const {png,...metrics}=capture;
  await writeFile(join(context.outputDir,'current-rustwall.json'),JSON.stringify(metrics,null,2)+'\n');
  console.log('Current Rustwall source capture: '+JSON.stringify(metrics));
}
