import * as THREE from 'three';

// Only presentation-owned transforms change. Hit history and collision data are read-only.
export function createSnowmenView(kits) {
  const group=new THREE.Group();group.name='Snowman bursts';
  const geometry=new THREE.SphereGeometry(.09,5,3), material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1});
  const bursts=new Map(), base=new THREE.Matrix4(), pose=new THREE.Matrix4();
  let retired=false;
  function clear(id){const entry=bursts.get(id);if(entry){group.remove(entry.group);bursts.delete(id);}}
  function create(hit,high){
    const container=new THREE.Group(), parts=[];
    for(const name of ['hat','carrot']){
      const mesh=kits.snowmanPart(name,high);
      if(!mesh)throw new Error('Approved snowman is missing its real '+name+'.');
      parts.push({mesh,local:mesh.matrix.clone(),name});container.add(mesh);
    }
    const flakes=Array.from({length:high?24:12},(_,index)=>{
      const mesh=new THREE.Mesh(geometry,material);container.add(mesh);return {mesh,index};
    });
    group.add(container);return {group:container,parts,flakes,high};
  }
  return {group,
    update(state,high=true){
      if(retired)return;
      const hits=state?.snowmenEnabled===true && state.status!=='menu'?state.snowmanBursts ?? []:[];
      const active=new Set();
      for(const hit of hits){
        const age=state.stageTimeSec-hit.atTime;
        if(!Number.isFinite(age)||age<0||age>2.2)continue;
        active.add(hit.id);
        if(bursts.get(hit.id)?.high!==high)clear(hit.id);
        const entry=bursts.get(hit.id) ?? create(hit,high);bursts.set(hit.id,entry);
        base.makeRotationY(hit.heading);base.setPosition(hit.x,hit.y,hit.z);
        for(const {mesh,local,name} of entry.parts){
          pose.copy(base).multiply(local);
          const point=new THREE.Vector3().setFromMatrixPosition(pose),lift=name==='hat'?4.2:3.1;
          point.x+=hit.directionX*age*(name==='hat'?2:3.5);
          point.z+=hit.directionZ*age*(name==='hat'?2:3.5);
          point.y+=lift*age-4.9*age*age;
          pose.multiply(new THREE.Matrix4().makeRotationZ(age*(name==='hat'?3:7)));
          pose.setPosition(point);mesh.matrix.copy(pose);mesh.matrixWorldNeedsUpdate=true;
        }
        for(const {mesh,index} of entry.flakes){
          const angle=index*2.399963229728653,spread=.6+(index%5)*.22;
          mesh.position.set(hit.x+Math.cos(angle)*spread*age+hit.directionX*age,
            hit.y+.6+(3+(index%4)*.35)*age-4.9*age*age,
            hit.z+Math.sin(angle)*spread*age+hit.directionZ*age);
          mesh.scale.setScalar(Math.max(0,1-age/2.2));
        }
      }
      for(const id of bursts.keys())if(!active.has(id))clear(id);
    },
    dispose(){if(retired)return;retired=true;bursts.clear();group.clear();geometry.dispose();material.dispose();},
  };
}
