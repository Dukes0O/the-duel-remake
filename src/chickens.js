import * as THREE from 'three';
import {makeRng} from './rng.js';

export function createChickens(course){
  const group=new THREE.Group();group.name='Roadside chickens';const rng=makeRng(775+course.def.stage),count=48,o=new THREE.Object3D();
  const feather=new THREE.MeshStandardMaterial({color:0xfff7df,roughness:.94});
  const red=new THREE.MeshStandardMaterial({color:0xc83925,roughness:.8});
  const gold=new THREE.MeshStandardMaterial({color:0xda9b35,roughness:.82});
  function mesh(geometry,material,n=count){const m=new THREE.InstancedMesh(geometry,material,n);m.castShadow=true;m.receiveShadow=true;m.frustumCulled=false;group.add(m);return m;}
  const body=mesh(new THREE.SphereGeometry(1,12,8),feather),heads=mesh(new THREE.SphereGeometry(1,10,8),feather);
  const wings=mesh(new THREE.SphereGeometry(1,10,6),feather,count*2),tails=mesh(new THREE.ConeGeometry(1,1,5),feather);
  const combs=mesh(new THREE.SphereGeometry(1,8,6),red),beaks=mesh(new THREE.ConeGeometry(1,1,5).rotateX(Math.PI/2),gold);
  const legs=mesh(new THREE.CylinderGeometry(.017,.022,.23,5),gold,count*2);
  const eyes=mesh(new THREE.SphereGeometry(.024,7,5),new THREE.MeshStandardMaterial({color:0x13100d,roughness:.5}),count*2);
  const feet=mesh(new THREE.BoxGeometry(.075,.02,.14),gold,count*2);
  const birds=Array.from({length:count},(_,i)=>{
    const cluster=Math.floor(i/4),s=cluster===0?187:cluster===1?900:cluster===2?course.length-55:220+(cluster-3)*(course.length-450)/9;
    const off=(cluster%2?1:-1)*(12+rng.range(0,7));const tint=new THREE.Color(i%5===0?0xa06b39:i%5===1?0xd5b98d:0xffffff);
    body.setColorAt(i,tint);heads.setColorAt(i,tint);tails.setColorAt(i,tint);for(let j=0;j<2;j++)wings.setColorAt(i*2+j,tint);
    return {s:s+rng.range(-6,6),off,phase:rng.range(0,6.28),scale:rng.range(.85,1.2)};
  });
  function set(m,i,x,y,z,sx,sy,sz,angle=0,tilt=0){o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(tilt,angle,0);o.updateMatrix();m.setMatrixAt(i,o.matrix);}
  function update(state,t){
    birds.forEach((b,i)=>{
      const near=state.status==='racing'&&Math.abs(state.s-b.s)<28&&state.speedMph>20;
      const stroll=Math.sin(t*.55+b.phase),s=b.s+stroll*1.6,off=b.off+Math.sin(t*.37+b.phase)*1.3+(near?Math.sign(b.off)*1.7:0);
      const p=course.worldAt(s,off),edge=Math.max(0,Math.abs(off)-13),wave=Math.sin(s*.009+off*.007)*Math.cos(off*.021+s*.004);
      p.y+=edge<1?-.06:Math.max(-2,wave*Math.min(32,edge*.13)+edge*.014-.2);
      const angle=p.heading+Math.cos(t*.55+b.phase)*1.3+(b.off>0?.9:-.9),fx=Math.sin(angle),fz=Math.cos(angle),rx=Math.cos(angle),rz=-Math.sin(angle),k=b.scale;
      const walk=Math.sin(t*(near?22:8)+b.phase),peck=Math.max(0,Math.sin(t*1.7+b.phase))**8;
      const x=p.x,y=p.y,z=p.z;
      set(body,i,x,y+.42*k,z,.24*k,.25*k,.34*k,angle);
      const hx=x+fx*.26*k,hz=z+fz*.26*k,hy=y+(.69-peck*.29)*k;
      set(heads,i,hx,hy,hz,.14*k,.16*k,.14*k,angle);
      set(combs,i,hx,hy+.15*k,hz,.038*k,.087*k,.12*k,angle);
      set(beaks,i,hx+fx*.16*k,hy-.012*k,hz+fz*.16*k,.065*k,.13*k,.055*k,angle);
      set(tails,i,x-fx*.31*k,y+.59*k,z-fz*.31*k,.16*k,.34*k,.18*k,angle,-.5);
      for(const [j,side] of [[0,-1],[1,1]]){
        set(wings,i*2+j,x+rx*side*.22*k,y+(.44+(near?walk*.045:0))*k,z+rz*side*.22*k,.07*k,.17*k,.26*k,angle);
        set(legs,i*2+j,x+rx*side*.095*k,y+.17*k,z+rz*side*.095*k,.9*k,k,k,angle,walk*side*.28);
        set(feet,i*2+j,x+rx*side*.095*k+fx*.025,y+.055*k,z+rz*side*.095*k+fz*.025,k,k,k,angle);
        set(eyes,i*2+j,hx+rx*side*.119*k+fx*.049*k,hy+.025*k,hz+rz*side*.119*k+fz*.049*k,k,k,k,angle);
      }
    });
    group.children.forEach(m=>m.instanceMatrix.needsUpdate=true);
  }
  update({status:'menu'},0);return {group,update};
}
