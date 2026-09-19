import * as THREE from 'three';
import {makeRng} from './rng.js';

export const CHICKEN_VISIBILITY=Object.freeze({fadeStart:240,radius:300});
const smoothFade=distance=>{const t=Math.max(0,Math.min(1,(distance-CHICKEN_VISIBILITY.fadeStart)/(CHICKEN_VISIBILITY.radius-CHICKEN_VISIBILITY.fadeStart)));return 1-t*t*(3-2*t);};

// The simulation owns flock locations and collection. Rendering only reads it.
export function createChickens(course){
  const group=new THREE.Group();group.name='Roadside chicken flocks';
  const birds=[],flockViews=[],collectedAt=new Map(),o=new THREE.Object3D();let lastTime=-Infinity;
  const white=new THREE.Color(),brown=new THREE.Color(),tailColor=new THREE.Color();
  for(const flock of course.features.flocks){
    const rng=makeRng(flock.seed);
    const view={flock,center:course.groundAt(flock.s,flock.off),active:false,age:-1,nearby:false};flockViews.push(view);
    for(let j=0;j<flock.count;j++){
      const angle=rng.range(0,Math.PI*2),radius=Math.sqrt(rng.float())*flock.radius*.66;
      const variety=rng.int(0,5),rooster=variety===5;
      const colors=[0xfff5df,0xf8eee1,0xc48243,0x9d592d,0xd0a36c,0xac622d];
      white.set(colors[variety]);brown.copy(white).multiplyScalar(variety<2?.88:.77);
      tailColor.set(rooster?0x283b32:variety<2?0xe4d6bc:0x674125);
      birds.push({flock,view,sourceIndex:birds.length,ds:Math.cos(angle)*radius,off:Math.sin(angle)*radius,
        phase:rng.range(0,Math.PI*2),direction:angle,scale:rng.range(.86,1.2),rooster,
        feather:white.clone(),wing:brown.clone(),tail:tailColor.clone()});
    }
  }
  const count=birds.length;
  group.userData.flockCount=course.features.flocks.length;group.userData.chickenCount=count;
  const activeBirdIndices=new Int32Array(count).fill(-1);
  group.userData.activeBirdIndices=activeBirdIndices;
  group.userData.sourceFlockIds=birds.map(bird=>bird.flock.id);
  group.userData.visibleChickenCount=0;
  const feather=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94});
  const red=new THREE.MeshStandardMaterial({color:0xd64227,roughness:.8});
  const gold=new THREE.MeshStandardMaterial({color:0xe6a23c,roughness:.82});
  function mesh(name,geometry,material,n=count){
    const m=new THREE.InstancedMesh(geometry,material,n);m.name=name;m.castShadow=true;m.receiveShadow=true;
    m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(m);return m;
  }
  const body=mesh('Chicken bodies',new THREE.SphereGeometry(1,12,8),feather);
  const heads=mesh('Chicken heads',new THREE.SphereGeometry(1,10,8),feather);
  const wings=mesh('Chicken wings',new THREE.SphereGeometry(1,10,6),feather,count*2);
  const tails=mesh('Chicken tails',new THREE.ConeGeometry(1,1,5),feather);
  const combs=mesh('Chicken combs',new THREE.SphereGeometry(1,8,6),red);
  const wattles=mesh('Chicken wattles',new THREE.SphereGeometry(1,7,5),red);
  const beaks=mesh('Chicken beaks',new THREE.ConeGeometry(1,1,5).rotateX(Math.PI/2),gold);
  const legs=mesh('Chicken legs',new THREE.CylinderGeometry(.017,.022,1,5),gold,count*2);
  const eyes=mesh('Chicken eyes',new THREE.SphereGeometry(.024,7,5),new THREE.MeshStandardMaterial({color:0x13100d,roughness:.5}),count*2);
  const feet=mesh('Chicken feet',new THREE.BoxGeometry(.075,.02,.14),gold,count*2);
  const singleParts=[body,heads,tails,combs,wattles,beaks],pairedParts=[wings,legs,eyes,feet];
  // Allocate fixed colour buffers once. Compact slots keep their source bird's
  // appearance even as flocks enter and leave the nearby population.
  for(const mesh of[body,heads,tails,wings]){mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(mesh.instanceMatrix.count*3),3).setUsage(THREE.DynamicDrawUsage);}
  function set(m,i,x,y,z,sx,sy,sz,angle=0,tilt=0,roll=0){
    o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(tilt,angle,roll);o.updateMatrix();m.setMatrixAt(i,o.matrix);
  }
  function update(state,t){
    const collected=new Set(state.collectedFlocks||[]);
    // Starting/replaying a stage must restore flocks even when this renderer survives.
    if(t<lastTime)collectedAt.clear();lastTime=t;
    for(const id of collectedAt.keys())if(!collected.has(id))collectedAt.delete(id);
    for(const id of collected)if(!collectedAt.has(id))collectedAt.set(id,t);
    const viewer=course.groundAt(state.s??172,state.lateral||0);
    for(const view of flockViews){
      const flock=view.flock;view.age=collectedAt.has(flock.id)?Math.max(0,t-collectedAt.get(flock.id)):-1;
      // Includes pickup radius and the complete flyaway. Exact bird distance is
      // checked below, so collection movement cannot disappear at this margin.
      view.active=view.age<=3.6&&Math.hypot(view.center.x-viewer.x,view.center.z-viewer.z)<CHICKEN_VISIBILITY.radius+flock.radius+24;
      const gap=Math.abs(Math.atan2(Math.sin(((state.s??172)-flock.s)/course.length*Math.PI*2),Math.cos(((state.s??172)-flock.s)/course.length*Math.PI*2))*course.length/(Math.PI*2));
      view.nearby=state.status==='racing'&&gap<26&&state.speedMph>20;
    }
    let visible=0,colorsChanged=false;
    for(const bird of birds){
      const {flock,view}=bird;if(!view.active)continue;
      const {age,nearby}=view;
      const stroll=t*.6+bird.phase;
      let ds=bird.ds+Math.sin(stroll)*.58,off=bird.off+Math.sin(t*.43+bird.phase)*.48;
      // Normal wandering stays wholly inside the flock's pickup circle.
      const distance=Math.hypot(ds,off),limit=Math.max(.1,flock.radius-.4);
      if(distance>limit){ds*=limit/distance;off*=limit/distance;}
      const escape=Math.max(0,age),travel=escape*(3.3+bird.scale*.8);
      ds+=Math.cos(bird.direction)*travel;off+=Math.sin(bird.direction)*travel;
      const s=flock.s+ds,lateral=flock.off+off,p=course.groundAt(s,lateral);
      const range=Math.hypot(p.x-viewer.x,p.z-viewer.z);if(range>=CHICKEN_VISIBILITY.radius)continue;
      const i=visible++;
      if(activeBirdIndices[i]!==bird.sourceIndex){
        activeBirdIndices[i]=bird.sourceIndex;colorsChanged=true;
        body.setColorAt(i,bird.feather);heads.setColorAt(i,bird.rooster?bird.wing:bird.feather);tails.setColorAt(i,bird.tail);
        for(let j=0;j<2;j++)wings.setColorAt(i*2+j,bird.wing);
      }
      const localAngle=age>=0?bird.direction:Math.cos(stroll)*1.15+bird.direction;
      const angle=p.heading+localAngle,fx=Math.sin(angle),fz=Math.cos(angle),rx=Math.cos(angle),rz=-Math.sin(angle);
      const fade=age>2.85?Math.max(0,(3.6-age)/.75):1,k=bird.scale*fade*smoothFade(range);
      const flying=age>=0,hop=flying?Math.sin(Math.min(1,escape/2.8)*Math.PI)*1.1+Math.min(3,escape)*.3:0;
      const walk=Math.sin(t*(flying?25:nearby?15:7)+bird.phase),peck=flying?0:Math.max(0,Math.sin(t*1.7+bird.phase))**8;
      const bob=flying?Math.sin(escape*15+bird.phase)*.035:Math.abs(walk)*.012;
      const x=p.x,y=p.y+hop,z=p.z;
      set(body,i,x,y+(.38+bob)*k,z,.25*k,.255*k,.35*k,angle,peck*.09);
      const reach=(.26+peck*.13)*k,hx=x+fx*reach,hz=z+fz*reach,hy=y+(.67-peck*.3+bob)*k;
      set(heads,i,hx,hy,hz,.14*k,.16*k,.14*k,angle);
      set(combs,i,hx,hy+.15*k,hz,.039*k,(bird.rooster?.13:.087)*k,.12*k,angle);
      set(wattles,i,hx+fx*.06*k,hy-.13*k,hz+fz*.06*k,.05*k,.078*k,.04*k,angle);
      set(beaks,i,hx+fx*.16*k,hy-.012*k,hz+fz*.16*k,.065*k,.13*k,.055*k,angle,peck*.4);
      set(tails,i,x-fx*.31*k,y+.54*k,z-fz*.31*k,.17*k,(bird.rooster?.45:.32)*k,.18*k,angle,-.6);
      for(let j=0;j<2;j++){
        const side=j===0?-1:1,flap=flying?Math.sin(t*27+bird.phase)*.6:0;
        const spread=flying?.14+Math.abs(flap)*.15:0;
        set(wings,i*2+j,x+rx*side*(.23+spread)*k,y+(.41+flap*.15)*k,z+rz*side*(.23+spread)*k,.08*k,.18*k,.27*k,angle,0,side*flap);
        const footForward=.025+walk*side*.045,footAcross=side*.095;
        const footS=s+(-Math.sin(localAngle)*footAcross+Math.cos(localAngle)*footForward)*k;
        const footOff=lateral+(Math.cos(localAngle)*footAcross+Math.sin(localAngle)*footForward)*k;
        const ground=course.groundAt(footS,footOff),lift=flying?.12:Math.max(0,walk*side)*.035;
        const footY=ground.y+hop+(.012+lift)*k,legHeight=Math.max(.07*k,y+.25*k-footY);
        set(legs,i*2+j,ground.x,footY+legHeight*.5,ground.z,.9*k,legHeight,k,angle);
        set(feet,i*2+j,ground.x,footY,ground.z,k,k,k,angle);
        set(eyes,i*2+j,hx+rx*side*.119*k+fx*.049*k,hy+.025*k,hz+rz*side*.119*k+fz*.049*k,k,k,k,angle);
      }
    }
    activeBirdIndices.fill(-1,visible);group.userData.visibleChickenCount=visible;group.visible=visible>0;
    for(const mesh of singleParts)mesh.count=visible;
    for(const mesh of pairedParts)mesh.count=visible*2;
    if(colorsChanged)for(const mesh of[body,heads,tails,wings])mesh.instanceColor.needsUpdate=true;
    group.children.forEach(m=>m.instanceMatrix.needsUpdate=true);
  }
  update({status:'menu',s:172},0);return {group,update};
}
