import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {UnsignedByteType} from 'three';

// Source comparison only. This uses the production hands, RPG and renderer in
// a private memory-only fixture and never reads or writes a player profile.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width:1280,height:720,deviceScaleFactor:1,mobile:false,
  });
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'private hands menu', 60000);
  await context.evaluate(`(() => {
    if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value ||
        !window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage required');
    const app=window.__qaApp;
    app.stop();app.audio.setMuted(true);
    app.duel.startCampaign({mode:'wasteland',car:'banshee_muscle',startStage:0,
      seed:1989,discoveredGate:true,crewId:'rook'});
    const state=app.duel.state;
    Object.assign(state,{status:'racing',countdown:0,paused:false,s:500,prevS:500,
      speedMph:0,traffic:[],opponents:[],stageTimeSec:10,crewId:'rook'});
    state.raids=null;state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;
    state.input.interact=true;
    for(let i=0;i<50&&!state.onFoot;i++)app.duel.step(1/120);
    state.input.interact=false;
    if(!state.onFoot||state.fighter.crewId!=='rook')throw Error('Production Rook exit failed');
    app._footCameraMode='first-person';
    state.fighter.speed=0;state.fighterInput={};
    Object.assign(state.footWeapons,{selected:'rpg',ammo:3,serial:0,
      lastFireAt:undefined,nextFireAt:0,repairing:false});
    window.__render.renderFrame();
  })()`);
  await context.waitFor(`(() => {
    window.__render.renderFrame();
    return window.__render.scene.getObjectByName('First-person hands and gear')?.userData.assetStatus==='ready';
  })()`, 'production hands and RPG assets', 60000);
  const capture=await context.evaluate(`(() => {
    const render=window.__render;
    window.requestAnimationFrame=()=>0;
    render.renderFrame();
    const rig=render.scene.getObjectByName('First-person hands and gear');
    if(!rig.visible||rig.userData.presentation.crewId!=='rook'||
       rig.userData.presentation.weapon!=='rpg'||rig.userData.loadErrors.length)
      throw Error('Production Rook hands holding the RPG required');
    const lights=[];render.scene.traverse(node=>{if(node.isLight)lights.push(node.clone());});
    render.scene.add(rig,...lights);
    for(const child of render.scene.children)child.visible=child===rig||lights.includes(child);
    rig.visible=true;render.scene.fog=null;render.scene.environment=null;
    const skin=rig.getObjectByProperty('isSkinnedMesh',true);
    render.scene.background=skin.material.color.clone().setHex(0x686d70);
    render.renderer.setPixelRatio(1);render.renderer.setSize(1280,720,false);
    render.camera.position.set(0,0,0);render.camera.lookAt(0,0,-1);
    render.camera.fov=72;render.camera.aspect=1280/720;render.camera.updateProjectionMatrix();
    rig.position.set(0,0,0);rig.quaternion.identity();rig.updateMatrixWorld(true);
    const target=new render.composer.renderTarget1.constructor(1280,720,{type:${UnsignedByteType},depthBuffer:true});
    target.texture.colorSpace=render.renderer.outputColorSpace;
    const pixels=new Uint8Array(1280*720*4);
    render.renderer.shadowMap.enabled=false;render.renderer.setScissorTest(false);
    render.renderer.setRenderTarget(target);render.renderer.clear(true,true,true);
    render.renderer.info.reset();render.renderer.render(render.scene,render.camera);
    render.renderer.readRenderTargetPixels(target,0,0,1280,720,pixels);
    render.renderer.setRenderTarget(null);target.dispose();
    const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
    const flipped=new Uint8ClampedArray(pixels.length);
    for(let y=0;y<720;y++)flipped.set(pixels.subarray(y*1280*4,(y+1)*1280*4),(719-y)*1280*4);
    canvas.getContext('2d').putImageData(new ImageData(flipped,1280,720),0,0);
    if(render.renderer.info.render.calls<2)throw Error('Hands and RPG were not both rendered');
    return {png:canvas.toDataURL('image/png'),presentation:{...rig.userData.presentation},
      drawCalls:render.renderer.info.render.calls,triangles:render.renderer.info.render.triangles,
      scope:'Production GLBs and renderer; isolated idle Rook holding RPG; private memory-only fixture'};
  })()`);
  const path=join(context.outputDir,'current-rook-rpg.png');
  await writeFile(path,Buffer.from(capture.png.split(',')[1],'base64'));
  context.screenshots.push(path);
  const {png,...metrics}=capture;
  await writeFile(join(context.outputDir,'current-rook-rpg.json'),JSON.stringify(metrics,null,2)+'\n');
  console.log('Current hands and RPG source comparison: '+JSON.stringify(metrics));
}
