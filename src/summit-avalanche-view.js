import * as THREE from 'three';
import {AVALANCHE} from './summit-avalanche.js';
import {createSummitForkSigns,createSummitDrift} from './track-script-scene.js';

// Pure presentation: phase and progress come only from the fixed-step controller.
export function createSummitAvalancheView(course) {
  const group=new THREE.Group();group.name='Summit avalanche';
  group.add(createSummitForkSigns(course));
  const drift=createSummitDrift(course);group.add(drift);drift.visible=false;
  const geometry=new THREE.SphereGeometry(1,6,4),material=new THREE.MeshStandardMaterial({color:0xf1f5f8,roughness:1});
  const flakes=Array.from({length:72},(_,index)=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name='Avalanche plume '+index;group.add(mesh);return mesh;
  });
  let retired=false;
  return {group,
    update(state,high=true){
      if(retired)return;
      const event=state?.avalanche,active=event && state.status!=='menu';
      drift.visible=!!active && event.phase==='after';
      const moving=active && ['tell','slide'].includes(event.phase),time=state?.stageTimeSec??0;
      const progress=event?.phase==='slide'?Math.max(0,Math.min(1,(time-event.slideAt)/AVALANCHE.slideSec)):0;
      flakes.forEach((mesh,index)=>{
        mesh.visible=!!moving && index<(high?72:24);if(!mesh.visible)return;
        const distance=AVALANCHE.from+(AVALANCHE.to-AVALANCHE.from)*(index%18)/17;
        const lateral=event.phase==='slide'?2-40*progress:2;
        const p=course.groundAt(distance,lateral),size=.65+(index%7)*.14;
        mesh.position.set(p.x+Math.sin(time*2+index)*1.8,p.y+(event.phase==='slide'?16*(1-progress):20)+(index%4)*1.2,p.z);
        mesh.scale.setScalar(size);
      });
    },
    dispose(){if(retired)return;retired=true;const geometries=new Set(),materials=new Set();
      group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of [node.material].flat().filter(Boolean))materials.add(material);});
      for(const item of geometries)item.dispose();for(const item of materials){item.map?.dispose();item.dispose();}group.clear();}
  };
}
export function summitAvalancheShake(state) {
  return state?.status==='racing' && ['tell','slide'].includes(state.avalanche?.phase) ? .055 : 0;
}
