import * as THREE from 'three';
import { createVehicleAttachmentRegistry } from './vehicle-attachments.js';

// Fixed reusable geometry: no mesh allocation or disposal during a firefight.
export function createCombatScene(attachments = createVehicleAttachmentRegistry()){
 const group=new THREE.Group();group.name='Wasteland weapons and shockwaves';
 const materials={iron:new THREE.MeshStandardMaterial({color:0x342a23,metalness:.8,roughness:.55}),
  fire:new THREE.MeshBasicMaterial({color:0xff8c16,transparent:true,opacity:.85,depthWrite:false}),
  smoke:new THREE.MeshBasicMaterial({color:0x322b24,transparent:true,opacity:.6,depthWrite:false}),
  neon:new THREE.MeshBasicMaterial({color:0x64ffce,wireframe:true}),gold:new THREE.MeshBasicMaterial({color:0xffe16b,wireframe:true}),
  shield:new THREE.MeshBasicMaterial({color:0xffd69b,wireframe:true,transparent:true,opacity:.16,depthWrite:false}),
  shieldRim:new THREE.LineBasicMaterial({color:0xffd69b,transparent:true,opacity:.32,depthWrite:false}),
  tip:new THREE.MeshBasicMaterial({color:0xffdf89})};
 const sphere=new THREE.IcosahedronGeometry(1,1),ring=new THREE.TorusGeometry(1,.055,6,28),shaft=new THREE.CylinderGeometry(.07,.07,3,5),tip=new THREE.ConeGeometry(.35,.8,5);
 const shieldShell=new THREE.IcosahedronGeometry(1,0);
 const shieldRim=new THREE.BufferGeometry().setFromPoints(Array.from({length:64},(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/32),0,Math.sin(i*Math.PI/32))));
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
 const pickupColors={ufo:0x64ffce,bomb:0xff8c16,crossbow:0x6cbcff,star:0xffe16b,armor:0x62ff8d};
 const pickupMaterials=Object.fromEntries(Object.entries(pickupColors).map(([key,color])=>[key,new THREE.MeshBasicMaterial({color})]));
 const pickups=Array.from({length:6},(_,index)=>{
  const g=new THREE.Group(),box=new THREE.Mesh(armorGeometry,materials.gold),halo=new THREE.Mesh(ring,materials.gold);
  g.name=`combat-pickup-${index}`;
  const armorCross=new THREE.Group();
  const crossBar=new THREE.Mesh(armorGeometry,pickupMaterials.armor),crossStem=new THREE.Mesh(armorGeometry,pickupMaterials.armor);
  crossBar.scale.set(2.2,.48,.55);crossStem.scale.set(.48,2.2,.55);armorCross.add(crossBar,crossStem);
  const weaponTip=new THREE.Mesh(tip,materials.tip);weaponTip.name='seeded-weapon-tip';weaponTip.position.y=1.45;
  box.scale.setScalar(1.8);halo.scale.setScalar(2.3);
  g.add(box,halo,armorCross,weaponTip);group.add(g);
  return {g,box,halo,armorCross,weaponTip};
 });
 const rigs = [0, 1, 2, 3].map(index => {
  const bumper = new THREE.Group();
  bumper.name = `combat-bumper-${index}`;
  const bar = new THREE.Mesh(armorGeometry, materials.iron);
  bumper.add(bar);
  const spikes = Array.from({ length: 5 }, () => {
   const spike = new THREE.Mesh(tip, materials.iron);
   spike.rotation.x = Math.PI / 2;
   bumper.add(spike);
   return spike;
  });

  const bow = new THREE.Group();
  bow.name = `combat-bow-${index}`;
  const rail = new THREE.Mesh(shaft, materials.iron);
  rail.rotation.x = Math.PI / 2;
  bow.add(rail);
  for (const side of [-1, 1]) {
   const arm = new THREE.Mesh(armorGeometry, materials.iron);
   arm.scale.set(1.3, .12, .18);
   arm.position.set(side * .55, 0, .5);
   arm.rotation.y = side * .35;
   bow.add(arm);
  }
  const bolt = new THREE.Mesh(tip, materials.tip);
  bolt.rotation.x = Math.PI / 2;
  bolt.position.z = 1.5;
  bow.add(bolt);

  const shield = new THREE.Group();
  shield.name = `combat-shield-${index}`;
  const ball = new THREE.Mesh(shieldShell, materials.shield);
  const halo = new THREE.LineLoop(shieldRim, materials.shieldRim);
  shield.add(ball, halo);
  group.add(bumper, bow, shield);
  return { bumper, bar, spikes, bow, shield, ball, halo };
 });
 const bindings = [null, null, null, null];

 function rigMounts(index, rig) {
  return [
   { owner: `combat-bumper-${index}`, socket: 'front', object: rig.bumper },
   { owner: `combat-bow-${index}`, socket: 'roof', object: rig.bow },
   { owner: `combat-shield-${index}`, socket: 'shield', object: rig.shield },
  ];
 }

 function bindVehicle(index, vehicle) {
  if (bindings[index] === vehicle) return;
  const rig = rigs[index];
  const mounts = rigMounts(index, rig);
  for (const mount of mounts) {
   attachments.detach(mount.owner);
   mount.object.visible = false;
  }
  bindings[index] = vehicle ?? null;
  if (!vehicle) return;

  for (const mount of mounts) attachments.attach({ ...mount, vehicle, fallback: group });
  const { width, length, height } = vehicle.userData.size;
  rig.bar.scale.set(width * 1.16, height > 2 ? .52 : .35, .48);
  rig.bar.position.set(0, 0, .12);
  rig.spikes.forEach((spike, spikeIndex) => {
   spike.position.set((spikeIndex - 2) * width * .21, 0, .45);
  });
  rig.bow.scale.setScalar(Math.max(.78, Math.min(1.2, width / 2.3)));
  // Leave a narrow gap around the body, with a low rim near the wheel line.
  rig.ball.scale.set(width * .62, height * .58 + .12, length * .57);
  rig.halo.scale.set(width * .50, 1, length * .44);
  rig.halo.position.y = -height * .36;
 }

 function detachVehicle(vehicle) {
  for (let index = 0; index < bindings.length; index++) {
   if (bindings[index] === vehicle) bindVehicle(index, null);
  }
 }
 function update(duel, vehicles = {}){
  const s = duel.state, c = s.combat;
  const active = !!c && s.status !== 'menu';
  group.visible = active;
  rigs.forEach((rig, index) => {
   const actor = index ? index === 1 ? s.opponents?.[0] ?? s.rival : s.opponents?.[index-1] : s;
   const vehicle = index ? index === 1 ? vehicles.rival : vehicles.extraOpponents?.[index-2]?.mesh : vehicles.player;
   bindVehicle(index, vehicle);
   const visible = active && !!actor && !actor.crushed && !!vehicle;
   rig.bumper.visible = visible;
   // An explicit disabled bumper removes the spike advantage and its teeth
   // in the flagged combat rules. Existing Wasteland rigs remain unchanged.
   const spikesVisible = !(s.mode === 'wasteland' && duel.featureFlags?.enabled('wasteland2') &&
    actor?.combatBumperSpikes === false);
   rig.spikes.forEach(spike => { spike.visible = spikesVisible; });
   rig.bow.visible = visible;
   rig.shield.visible = visible && (index ? index === 1 ? c.rivalShield : actor.combatShield : c.shield) > 0;
   if (rig.shield.visible) rig.shield.rotation.y = s.stageTimeSec * 2;
  });
  if (!active) return;
  pickups.forEach(({g,box,halo,armorCross,weaponTip},i)=>{
   const p=c.pickups[i];g.visible=!!p;if(!p)return;
   const at=duel.course.groundAt(p.s,p.lateral??0);
   g.position.set(at.x,at.y+2+Math.sin(p.age*3)*.4,at.z);
   const repair=p.kind==='armor';
   box.visible=!repair;armorCross.visible=repair;weaponTip.visible=p.kind==='weapon';
   box.material=pickupMaterials[p.weapon]||pickupMaterials.armor;
   weaponTip.material=box.material;halo.material=repair?pickupMaterials.armor:materials.gold;
   box.rotation.set(p.age,p.age*1.5,0);
   armorCross.rotation.set(0,p.age*1.5,0);
   halo.rotation.set(Math.PI/2,p.age,0);
  });
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
 }
 return {
  group,
  update,
  detachVehicle,
  dispose(){
   for (const vehicle of [...bindings]) if (vehicle) detachVehicle(vehicle);
   rigs.forEach((rig, index) => rigMounts(index, rig).forEach(mount => attachments.detach(mount.owner)));
   for(const geometry of [sphere,ring,shaft,tip,armorGeometry,shieldShell,shieldRim])geometry.dispose();
   Object.values({...materials,...pickupMaterials}).forEach(material=>material.dispose());
  },
 };
}
