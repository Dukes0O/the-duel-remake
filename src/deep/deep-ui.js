import * as THREE from 'three';
import { deepWorldPose, surfaceLocalPoint } from './deep-journey.js';

export function surfaceLocalCamera(camera) {
  const copy=camera.clone();copy.position.y=surfaceLocalPoint(copy.position).y;copy.updateMatrixWorld(true);return copy;
}
export function deepPresentation(duel) {
  const journey=duel.state.deepJourney,car=deepWorldPose(duel);
  if(!journey||!car)return null;
  const tall=duel.state.car==='titan_monster',back=tall?12:8.7,height=tall?5.8:3.65;
  return {car,phase:journey.phase,choiceReady:journey.phase==='choice'&&!duel.state.paused,
    hudOpacity:journey.committed?0:.4,
    camera:{position:{x:car.x-Math.sin(car.heading)*back,y:car.y+height,z:car.z-Math.cos(car.heading)*back},
      target:{x:car.x+Math.sin(car.heading)*26,y:car.y+1.05,z:car.z+Math.cos(car.heading)*26}}};
}
// Views own translated copies and resources. They never write the Duel packet.
export function createDeepView({renderer,createUnderwaterScene,createWaterline,createAmbientShading,createPipeline,createExtras=null}) {
  let visit=null,overlay=null,disposed=false,revision=0;
  function clearVisit() {
    if(!visit)return;
    const current=visit;visit=null;
    current.extras?.dispose();current.look.dispose();current.ambient.dispose();current.pipeline.dispose();
    current.scene.remove(current.car);
    if(current.parent)current.parent.add(current.car);
    current.car.position.copy(current.position);current.car.quaternion.copy(current.quaternion);
    current.car.scale.copy(current.scale);current.car.visible=current.visible;revision++;
  }
  function reset() {clearVisit();overlay?.dispose();overlay=null;}
  return {
    get revision(){return revision;},
    reset,
    // deepRaised: the sea life may react (the whale passes when the Sirena comes up). Read only.
    raised(find){visit?.look.raised(find);},
    render({duel,car,camera,seconds,high,width,height}) {
      if(disposed)return false;
      const journey=duel.state.deepJourney,runtime=duel.deepRuntime;
      if(!journey||!runtime){reset();return false;}
      const local=surfaceLocalCamera(camera);
      if(!journey.committed||journey.phase==='ascending'){
        const position=car.position.clone(),quaternion=car.quaternion.clone(),scale=car.scale.clone(),visible=car.visible;
        clearVisit();car.position.copy(position);car.quaternion.copy(quaternion);car.scale.copy(scale);car.visible=visible;overlay??=createWaterline();overlay.update(local,seconds);return false;
      }
      overlay?.dispose();overlay=null;
      if(visit&&(visit.runtime!==runtime||visit.car!==car||visit.high!==high)){
        const position=car.position.clone(),quaternion=car.quaternion.clone(),scale=car.scale.clone(),visible=car.visible;
        clearVisit();car.position.copy(position);car.quaternion.copy(quaternion);car.scale.copy(scale);car.visible=visible;
      }
      if(!visit){
        const scene=new THREE.Scene(),viewCamera=local.clone();
        const parent=car.parent,position=car.position.clone(),quaternion=car.quaternion.clone(),scale=car.scale.clone(),visible=car.visible;
        const look=createUnderwaterScene({zone:runtime.zone,quality:high?'high':'performance',renderer,scene});
        look.attachCar(car);scene.add(car);
        const ambient=createAmbientShading(scene,viewCamera),pipeline=createPipeline(scene,viewCamera,ambient,high);
        // DEEP-SIRENA-VIEW: what the story adds to the dive (the wreck, parts, bags and the drop).
        const extras=createExtras?.({scene,zone:runtime.zone,deep:look,rampHeading:runtime.ramp.heading})??null;
        ambient.refresh();visit={runtime,car,high,scene,camera:viewCamera,look,ambient,pipeline,parent,position,quaternion,scale,visible,extras,seconds};revision++;
      }
      const pose=surfaceLocalPoint(deepWorldPose(duel));
      visit.camera.copy(local);visit.camera.updateMatrixWorld(true);
      const visual=surfaceLocalPoint(car.position);
      car.position.set(visual.x,visual.y,visual.z);
      visit.look.update({car:pose,camera:visit.camera,seconds});
      visit.extras?.update({duel,seconds,dt:Math.max(0,Math.min(.1,seconds-visit.seconds))});visit.seconds=seconds;
      visit.ambient.enabled=high;
      const ratio=renderer.getPixelRatio?.()??1;
      if(visit.width!==width||visit.height!==height||visit.ratio!==ratio){visit.pipeline.setSize(width,height);visit.width=width;visit.height=height;visit.ratio=ratio;}
      visit.pipeline.render();
      return true;
    },
    drawOverlay() {
      if(!overlay?.active)return;
      const before=renderer.autoClear;renderer.autoClear=false;
      try{renderer.render(overlay.scene,overlay.camera);}finally{renderer.autoClear=before;}
    },
    dispose(){if(disposed)return;reset();disposed=true;},
  };
}
export function createDeepUi({host,onChoose}) {
  const doc=host.ownerDocument,section=doc.createElement('section');
  section.className='deep-choice';section.hidden=true;
  section.setAttribute('role','dialog');section.setAttribute('aria-modal','true');section.setAttribute('aria-labelledby','deep-choice-title');
  section.innerHTML='<h2 id="deep-choice-title">The water opens below.</h2><p>Race paused. Dive into The Deep or return to the road.</p><div><button type="button" data-deep-choice="dive">Dive</button><button type="button" data-deep-choice="turn-back">Turn back</button></div>';
  host.append(section);let visible=false,priorFocus=null,disposed=false;
  const buttons=[...section.querySelectorAll('button')];
  const click=event=>{const button=event.target.closest('[data-deep-choice]');if(button&&!section.hidden)onChoose(button.dataset.deepChoice);};
  const key=event=>{if(section.hidden)return;if(event.key==='Tab'){const first=buttons[0],last=buttons.at(-1);
    if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}event.stopPropagation();}
    else if(['Enter',' '].includes(event.key))event.stopPropagation();};
  section.addEventListener('click',click);section.addEventListener('keydown',key);
  function restore(){if(priorFocus?.isConnected)priorFocus.focus({preventScroll:true});priorFocus=null;}
  return {update(duel){if(disposed)return null;const view=deepPresentation(duel),next=!!view?.choiceReady;
      if(next&&!visible){priorFocus=doc.activeElement;section.hidden=false;buttons[0].focus({preventScroll:true});}
      else section.hidden=!next;
      if(!next&&visible)restore();visible=next;return view;},
    dispose(){if(disposed)return;disposed=true;section.removeEventListener('click',click);section.removeEventListener('keydown',key);section.remove();restore();}};
}
