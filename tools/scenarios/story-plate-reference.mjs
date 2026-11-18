// Part 1 art evidence only. Capture the played-world view at the Blender camera.
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pageSource as peoplePage} from './story-people.mjs';
import {EVERBURN_JOBS} from '../../src/world/jobs/everburn.js';

export function referenceJob(tableau) {
  const [gx,gy,gz]=tableau.gateWorld;
  const toWorld=([x,y,z])=>({x:x+gx,y:y+gy,z:z+gz});
  const carters=new Set(tableau.carts.map(c=>c.owner));
  const storyPeople=tableau.people.map(p=>({id:p.id,position:toWorld(p.position),
    yaw:p.yaw,action:p.action,cart:carters.has(p.id)}));
  const eye=toWorld(tableau.camera.eye), aim=toWorld(tableau.camera.aim);
  const foot={...eye,y:eye.y-tableau.camera.eyeHeight,heading:Math.atan2(aim.x-eye.x,aim.z-eye.z)};
  const step={...EVERBURN_JOBS[1].steps[0],bellowsFootStart:foot};
  return {eye,aim,foot,job:{...EVERBURN_JOBS[1],id:'night-2-plate-reference',storyPeople,steps:[step]}};
}

const expressions={
  loaded:()=>{const game=window.__render?.scene.getObjectByName('The Scablands');
    const crowd=game?.getObjectByName('Wasteland story people');
    if(crowd?.userData.loadError) throw Error(crowd.userData.loadError);
    return game?.userData.assetStatus==='ready'&&!!crowd?.getObjectByName('story-bubble-wim');},
  position:(foot)=>{const app=window.__qaApp,duel=app.duel,state=duel.state,world=state.arena.worldJob;
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!state.onFoot) throw Error('A memory-only on-foot world job is required.');
    app.stop();app.footCameraMode='first-person';state.paused=false;
    Object.assign(state.fighter,duel.course.nearest(foot.x,foot.z),foot,{groundY:foot.y,yaw:foot.heading});
    world.job.stepState.brandBriefed=true;world.job.stepState.dusk=1;app.onFrame?.(state,0);},
  draw:(eye,aim,settings)=>{const a=window.__render;
    const crowd=a.scene.getObjectByName('Wasteland story people');
    const people=crowd.children.filter(ob=>ob.name.startsWith('story-person-'));
    const carts=crowd.children.filter(ob=>ob.name.startsWith('story-handcart-'));
    if(people.length!==11||carts.length!==4) throw Error('Wrong cast in the actual game.');
    const stool=crowd.getObjectByName('story-person-wim').getObjectByName('Camp stool');
    if(!stool) throw Error('Wim has not taken her sitting pose.');
    const {renderer,composer,camera}=a;
    if (Math.abs(camera.near-settings.near)>1e-6 || Math.abs(camera.far-settings.far)>1e-6)
      throw Error('The reference and running game have different clipping planes.');
    const pixelRatio=renderer.getPixelRatio();
    const previous={position:camera.position.clone(),rotation:camera.quaternion.clone(),fov:camera.fov,aspect:camera.aspect,
      width:renderer.domElement.width/pixelRatio,height:renderer.domElement.height/pixelRatio,stool:stool.visible};
    try {
      // A jointed cart supports her in this tableau. Remove its default stool.
      // Capture synchronously after the real game composer draws the frame.
      stool.visible=false;
      renderer.setPixelRatio(1);renderer.setSize(settings.width,settings.height,false);
      composer.setPixelRatio(1);composer.setSize(settings.width,settings.height);
      camera.position.set(eye.x,eye.y,eye.z);camera.up.set(0,1,0);camera.lookAt(aim.x,aim.y,aim.z);
      camera.fov=settings.verticalFov;camera.aspect=settings.width/settings.height;
      camera.updateProjectionMatrix();camera.updateMatrixWorld(true);composer.render();
      const canvas=renderer.domElement;
      if(canvas.width!==settings.width||canvas.height!==settings.height) throw Error('Native camera output dimensions disagree.');
      return canvas.toDataURL('image/png').split(',')[1];
    } finally {
      stool.visible=previous.stool;camera.position.copy(previous.position);camera.quaternion.copy(previous.rotation);
      camera.fov=previous.fov;camera.aspect=previous.aspect;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      renderer.setPixelRatio(pixelRatio);renderer.setSize(previous.width,previous.height,false);
      composer.setPixelRatio(pixelRatio);composer.setSize(previous.width,previous.height);
    }}
};
export function pageSource(name,...args) {
  return '('+expressions[name].toString()+')('+args.map(JSON.stringify).join(',')+')';
}
export async function run(context) {
  const data=JSON.parse(await readFile(join(context.outputDir,'camera-and-cast.json'),'utf8'));
  const fixture=referenceJob(data);
  await context.command('Emulation.setDeviceMetricsOverride',{width:data.width,height:data.height,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,story-choices,warlord-cards&harness=story-plate-reference');
  await context.waitFor(peoplePage('ready'),'memory-only menu',60000);
  await context.evaluate(peoplePage('prepare'));
  await context.waitFor(peoplePage('yard'),'yard',60000);
  await context.evaluate(peoplePage('start',fixture.job));
  await context.waitFor(pageSource('loaded'),'eleven travellers and Tin Town gate',120000);
  await context.evaluate(pageSource('position',fixture.foot));
  await context.evaluate(peoplePage('settled'));
  const png=await context.evaluate(pageSource('draw',fixture.eye,fixture.aim,
    {width:data.width,height:data.height,verticalFov:data.camera.verticalFov,near:data.camera.near,far:data.camera.far}));
  await writeFile(join(context.outputDir,'laptop.png'),Buffer.from(png,'base64'));
}
