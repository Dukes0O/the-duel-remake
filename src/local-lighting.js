import * as THREE from 'three';

// A fixed pool keeps nearby lamps convincing without a light for every street.
// These lights add no shadow-map renders and never alter collision geometry.
export function createLocalLighting(scene) {
  const street = Array.from({length:4},()=>{
    const light=new THREE.SpotLight(0xffd29a,0,42,.92,.82,1.5);
    light.name='Nearby street lamp';scene.add(light,light.target);return light;
  });
  const beacons=[0xff2418,0x167bff].map(color=>{
    const light=new THREE.PointLight(color,0,24,1.5);
    light.name='Pursuit light reflection';scene.add(light);return light;
  });
  let currentCourse=null,fixtures=[];
  const local=new THREE.Vector3();
  // Only two/four lamps can illuminate the frame. Reuse a bounded shortlist
  // instead of allocating a distance object per pole and sorting the route.
  const nearest=new Array(street.length),distances=new Float64Array(street.length);
  return {
    update({course,position,police,now,night,high=true,menu=false}) {
      if(currentCourse!==course){
        currentCourse=course;
        fixtures=course.features.poles.filter(p=>p.theme==='city').map(p=>{
          const c=Math.cos(p.heading),s=Math.sin(p.heading);
          return {x:p.x+c*5.4,y:p.y+10.25,z:p.z-s*5.4,target:course.worldAt(p.s,-4.8)};
        });
      }
      let count=0;
      const limit=high?street.length:2;
      if(night)for(const p of fixtures){
        const dx=p.x-position.x,dz=p.z-position.z;
        // Most poles are far down the route; reject the enclosing square
        // before calculating an exact distance for the few nearby fixtures.
        if(Math.abs(dx)>=135||Math.abs(dz)>=135)continue;
        const d=Math.hypot(dx,dz);
        if(!(d<135)||(count===limit&&d>=distances[limit-1]))continue;
        let index=count;
        // Strict comparison preserves the original stable order for ties.
        while(index>0&&d<distances[index-1])index--;
        for(let j=Math.min(count,limit-1);j>index;j--){nearest[j]=nearest[j-1];distances[j]=distances[j-1];}
        nearest[index]=p;distances[index]=d;
        count=Math.min(count+1,limit);
      }
      for(let i=0;i<street.length;i++){
        const light=street[i];
        light.intensity=0;
        if(i<count){
          const p=nearest[i],fade=THREE.MathUtils.smoothstep(distances[i],78,135);
          light.position.set(p.x,p.y,p.z);light.target.position.set(p.target.x,p.target.y,p.target.z);
          light.target.updateMatrixWorld();light.intensity=155*(1-fade);
        }
      }
      for(let i=0;i<beacons.length;i++){
        const light=beacons[i];light.intensity=0;
        if(!menu&&police?.visible){
          local.set(i?.34:-.34,1.7,-.1).applyEuler(police.rotation).add(police.position);
          light.position.copy(local);light.intensity=Math.floor(now/130)%2===i?27:0;
        }
      }
    },
    dispose(){for(const light of street){scene.remove(light,light.target);light.dispose();}for(const light of beacons){scene.remove(light);light.dispose();}}
  };
}
