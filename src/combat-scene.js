import * as THREE from 'three';

// Fixed reusable geometry: no mesh allocation or disposal during a firefight.
export function createCombatScene(){
 const group=new THREE.Group();group.name='Wasteland weapons and shockwaves';
 const materials={iron:new THREE.MeshStandardMaterial({color:0x342a23,metalness:.8,roughness:.55}),
  fire:new THREE.MeshBasicMaterial({color:0xff8c16,transparent:true,opacity:.85,depthWrite:false}),
  smoke:new THREE.MeshBasicMaterial({color:0x322b24,transparent:true,opacity:.6,depthWrite:false}),
  neon:new THREE.MeshBasicMaterial({color:0x64ffce,wireframe:true}),gold:new THREE.MeshBasicMaterial({color:0xffe16b,wireframe:true}),
  tip:new THREE.MeshBasicMaterial({color:0xffdf89})};
 const sphere=new THREE.IcosahedronGeometry(1,1),ring=new THREE.TorusGeometry(1,.055,6,28),shaft=new THREE.CylinderGeometry(.07,.07,3,5),tip=new THREE.ConeGeometry(.35,.8,5);
 const projectiles=Array.from({length:40},()=>{
  const g=new THREE.Group(),bomb=new THREE.Mesh(sphere,materials.iron),arrow=new THREE.Group();bomb.scale.setScalar(.65);
  const rod=new THREE.Mesh(shaft,materials.iron),head=new THREE.Mesh(tip,materials.tip);head.position.y=1.7;arrow.add(rod,head);arrow.rotation.x=Math.PI/2;
  const fuse=new THREE.Mesh(sphere,materials.tip);fuse.scale.setScalar(.17);fuse.position.y=.7;bomb.add(fuse);g.add(bomb,arrow);group.add(g);return {g,bomb,arrow};
 });
 const bursts=Array.from({length:32},()=>{
  const g=new THREE.Group(),flame=new THREE.Mesh(sphere,materials.fire),smoke=new THREE.Mesh(sphere,materials.smoke),wave=new THREE.Mesh(ring,materials.fire),saucer=new THREE.Mesh(sphere,materials.neon);
  wave.rotation.x=Math.PI/2;saucer.scale.set(5,1,5);g.add(flame,smoke,wave,saucer);
  const shards=Array.from({length:6},()=>{const m=new THREE.Mesh(sphere,materials.iron);g.add(m);return m;});group.add(g);return {g,flame,smoke,wave,saucer,shards};
 });
 const armorGeometry=new THREE.BoxGeometry(1,1,1);
 const rigs=[0,1].map(()=>{
  const g=new THREE.Group(),bumper=new THREE.Mesh(armorGeometry,materials.iron),bow=new THREE.Group();
  bumper.scale.set(2.7,.35,.5);bumper.position.set(0,.5,2.3);g.add(bumper);
  for(let i=-2;i<=2;i++){const spike=new THREE.Mesh(tip,materials.iron);spike.rotation.x=Math.PI/2;spike.position.set(i*.5,.5,2.8);g.add(spike);}
  const rail=new THREE.Mesh(shaft,materials.iron);rail.rotation.x=Math.PI/2;bow.add(rail);
  for(const side of [-1,1]){const arm=new THREE.Mesh(armorGeometry,materials.iron);arm.scale.set(1.3,.12,.18);arm.position.set(side*.55,0,.5);arm.rotation.y=side*.35;bow.add(arm);}
  const bolt=new THREE.Mesh(tip,materials.tip);bolt.rotation.x=Math.PI/2;bolt.position.z=1.5;bow.add(bolt);g.add(bow);group.add(g);return {g,bow};
 });
 const shields=[0,1].map(()=>{const g=new THREE.Group(),ball=new THREE.Mesh(sphere,materials.gold),halo=new THREE.Mesh(ring,materials.gold);ball.scale.set(3,2,5);halo.rotation.x=Math.PI/2;halo.scale.setScalar(5);g.add(ball,halo);group.add(g);return g;});
 function update(duel){
  const s=duel.state,c=s.combat;group.visible=!!c&&s.status!=='menu';if(!group.visible)return;
  projectiles.forEach(({g,bomb,arrow},i)=>{const p=c.projectiles[i];g.visible=!!p;if(!p)return;g.position.set(p.x,p.y,p.z);bomb.visible=p.kind==='bomb';arrow.visible=!bomb.visible;g.rotation.set(0,Math.atan2(p.vx,p.vz),0);bomb.rotation.set(p.age*5,p.age*3,0);});
  bursts.forEach(({g,flame,smoke,wave,saucer,shards},i)=>{
   const b=c.bursts[i];g.visible=!!b;if(!b)return;g.position.set(b.x,b.y,b.z);
   const warp=b.kind==='ufo',star=b.kind==='star',fade=Math.max(0,1-b.age/1.4),size=b.kind==='blast'?1:0.45;
   saucer.visible=warp;saucer.position.y=10+b.age*4;saucer.rotation.y=b.age*4;
   flame.visible=!warp&&!star;smoke.visible=flame.visible;
   flame.scale.setScalar((1+b.age*14)*fade*size);flame.rotation.set(b.age,b.age*3,0);
   smoke.position.y=b.age*5;smoke.scale.setScalar((2+b.age*10)*fade*size);
   wave.material=warp?materials.neon:star?materials.gold:materials.fire;wave.scale.setScalar((1+b.age*24)*fade);wave.position.y=warp?b.age*8:.1;
   shards.forEach((m,j)=>{m.visible=!warp&&!star;const a=j*Math.PI/3+b.id;m.position.set(Math.sin(a)*b.age*16,Math.max(0,b.age*12-b.age*b.age*9),Math.cos(a)*b.age*16);m.scale.set(.4*fade,.15*fade,.7*fade);m.rotation.set(b.age*5+j,b.age*3,0);});
  });
  rigs.forEach(({g,bow},i)=>{const actor=i?s.rival:s;g.visible=!!actor&&!actor.crushed;if(!g.visible)return;const p=duel.course.groundAt(actor.s,actor.lateral),spec=duel._vehicleSpec(actor);g.position.set(p.x,p.y+(actor.airHeight||0),p.z);g.rotation.set(actor.terrainPitch||0,p.heading+(actor.headingError||0),actor.terrainRoll||0);bow.position.y=spec.height+.2;});
  shields.forEach((g,i)=>{const actor=i?s.rival:s;g.visible=!!actor&&(i?c.rivalShield:c.shield)>0;if(!g.visible)return;const p=duel.course.groundAt(actor.s,actor.lateral);g.position.set(p.x,p.y+1+(actor.airHeight||0),p.z);g.rotation.y=s.stageTimeSec*2;});
 }
 return {group,update,dispose(){for(const g of [sphere,ring,shaft,tip,armorGeometry])g.dispose();Object.values(materials).forEach(m=>m.dispose());}};
}
