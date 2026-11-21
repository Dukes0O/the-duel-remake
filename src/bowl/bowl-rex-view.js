import * as THREE from 'three';
import {fallPose} from './bowl-hook.js';
import {REX_RULES, rexFacing, rexFightOf, rexPlaces} from './bowl-rex.js';

// The Scrapasaurus in the Bowl (BOWL-REX-FIGHT): its model on the rails, its
// poses, its battery boxes, the cone its fire will fill (drawn on the floor from
// the start of its tell), the ring where a thrown car will land, and its pen of
// junk cars. On nights three and four it stands behind the stands' wall, seen
// before it is fought. It reads state.bowlNight and never writes it.
const MODEL = '/assets/models/wasteland/bowl/scrapasaurus.glb';
const ORANGE = 0xff7a1a, FLAME = 0xffc24a, RING = 0xffe27a;

function disposeTree(root) {
  root?.traverse?.(node => {
    node.geometry?.dispose?.();
    for (const material of [node.material].flat().filter(Boolean)) material.dispose?.();
  });
}

// A flat fan on the floor, its point at the origin, opening along +Z, one metre long.
function fanGeometry(halfAngle, segments = 24) {
  const points = [0, 0, 0];
  for (let i = 0; i <= segments; i++) {
    const a = -halfAngle + 2 * halfAngle * i / segments;
    points.push(Math.sin(a), 0, Math.cos(a));
  }
  const index = [];
  for (let i = 1; i <= segments; i++) index.push(0, i, i + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setIndex(index);
  return geometry;
}

// Drawn over the floor and the ramps, so the cone and the ring are seen even where a ramp rises through them.
const glowMaterial = (color, depthTest = false) => new THREE.MeshBasicMaterial({color, transparent: true, opacity: .5,
  depthWrite: false, depthTest, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending});

export function createRexView({loadModel}) {
  const group = new THREE.Group();
  group.name = 'Bowl Scrapasaurus';
  group.visible = false;
  let course = null, places = null, model = null, mixer = null, actions = {}, loading = null, disposed = false;
  let lastNow = null, boxes = [], tailPivot = null;
  const holder = new THREE.Group(); holder.name = 'Scrapasaurus on its rails';
  const pose = new THREE.Group(); pose.name = 'Scrapasaurus pose';
  holder.add(pose);
  // The tell's chest glow: a furnace light in its chest, under the neck, that brightens until the fire comes.
  const chest = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 10), glowMaterial(ORANGE, true));
  chest.name = 'Scrapasaurus chest glow'; chest.position.set(0, 3.4, 2.6); chest.visible = false;
  const chestLight = new THREE.PointLight(ORANGE, 0, 14, 2);
  chestLight.position.copy(chest.position);
  pose.add(chest, chestLight);
  let asset = null;
  // The cone on the floor (the tell), and the fire filling it.
  const cone = new THREE.Mesh(fanGeometry(REX_RULES.fire.halfAngle), glowMaterial(ORANGE));
  cone.name = 'Scrapasaurus fire cone'; cone.renderOrder = 4; cone.visible = false;
  const fire = new THREE.Group(); fire.name = 'Scrapasaurus fire'; fire.visible = false;
  for (let layer = 0; layer < 3; layer++) {
    const sheet = new THREE.Mesh(fanGeometry(REX_RULES.fire.halfAngle * (1 - layer * .25)), glowMaterial(layer ? FLAME : ORANGE));
    sheet.position.y = .6 + layer * .9; sheet.renderOrder = 6;
    fire.add(sheet);
  }
  // The ring where a thrown car will land, and the car.
  const ring = new THREE.Mesh(new THREE.RingGeometry(REX_RULES.thrown.hitRadius - .35, REX_RULES.thrown.hitRadius, 40), glowMaterial(RING));
  ring.rotation.x = -Math.PI / 2; ring.name = 'Scrapasaurus throw ring'; ring.visible = false; ring.renderOrder = 4;
  const rust = new THREE.MeshStandardMaterial({color: 0x6b4a33, roughness: .9, metalness: .2});
  const thrown = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 4.2), rust);
  thrown.name = 'Scrapasaurus thrown junk car'; thrown.visible = false;
  const cableGeo = new THREE.BufferGeometry();
  cableGeo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(6),3));
  const cable = new THREE.Line(cableGeo,new THREE.LineBasicMaterial({color:0xffe29b}));
  cable.frustumCulled=false;cable.name='Scrapasaurus tow cable';
  const tip=new THREE.Mesh(new THREE.TorusGeometry(.16,.045,6,14),rust);
  tip.name='Truck tow hook';
  const mark=new THREE.Mesh(new THREE.RingGeometry(.59,.68,24),glowMaterial(RING));
  mark.name='Open battery marker';mark.rotation.y=Math.PI/2;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.22,.38,35,12),glowMaterial(0xffd44d));
  beam.name='Open battery beam';beam.material.opacity=.76;
  const progress=new THREE.Mesh(new THREE.RingGeometry(.83,1.06,64),glowMaterial(0x9aff83));
  progress.name='Battery pull progress';progress.material.opacity=1;progress.renderOrder=9;
  const pointerShape=new THREE.Shape();
  pointerShape.moveTo(1,0);pointerShape.lineTo(-.6,.62);pointerShape.lineTo(-.32,0);pointerShape.lineTo(-.6,-.62);pointerShape.closePath();
  const pointer=new THREE.Mesh(new THREE.ShapeGeometry(pointerShape),glowMaterial(RING));
  pointer.name='Offscreen battery arrow';pointer.frustumCulled=false;pointer.renderOrder=10;
  const projected=new THREE.Vector3(), cameraPoint=new THREE.Vector3(), edge=new THREE.Vector3();
  pointer.onBeforeRender=(_renderer,_scene,camera)=>{
    projected.copy(mark.position).project(camera);
    cameraPoint.copy(mark.position).applyMatrix4(camera.matrixWorldInverse);
    const behind=cameraPoint.z>=0;
    if(!behind && Math.abs(projected.x)<=.96 && Math.abs(projected.y)<=.95){
      pointer.material.opacity=0;return;
    }
    let x=projected.x*(behind?-1:1), y=projected.y*(behind?-1:1);
    if(behind && Math.abs(x)+Math.abs(y)<.01)y=-1;
    const fit=Math.max(Math.abs(x)/.88,Math.abs(y)/.76,.001);
    x/=fit;y/=fit;
    edge.set(x,y,0).unproject(camera);pointer.position.copy(edge);
    pointer.scale.setScalar(edge.distanceTo(projected.set(x,y+.045,0).unproject(camera)));
    pointer.quaternion.copy(camera.quaternion);pointer.rotateZ(Math.atan2(y,x*(camera.aspect||1)));
    pointer.material.opacity=1;pointer.updateMatrixWorld(true);
  };
  for(const circle of [mark,progress])circle.onBeforeRender=(_renderer,_scene,camera)=>{
    circle.quaternion.copy(camera.quaternion);circle.updateMatrixWorld(true);
  };
  const pen = new THREE.Group(); pen.name = 'Scrapasaurus pen of junk cars';
  group.add(holder, cone, fire, ring, thrown, pen, cable, tip, mark, beam, progress, pointer);

  // The model loads once for the view; each event on a new course only moves it and rebuilds the pen.
  function clear() {
    for (const child of [...pen.children]) { child.removeFromParent(); child.geometry?.dispose?.(); }
    course = null; places = null;
  }

  function build(next) {
    clear();
    course = next; places = rexPlaces(next);
    loading ??= loadModel(MODEL).then(loaded => {
      if (disposed) { disposeTree(loaded.scene); return; }
      asset = loaded;
      model = asset.scene;
      model.name = 'Scrapasaurus model';
      model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
      pose.add(model);
      boxes = [1, 2, 3].map(index => {
        const part=model.getObjectByName(`battery-box-${index}`);
        const whole=model.getObjectByName(`battery-box-${index}-whole`);
        const open=model.getObjectByName(`battery-box-${index}-open`);
        return {part,whole,open,parent:part?.parent,origin:part?.position.clone()};
      });
      mixer = new THREE.AnimationMixer(model);
      for (const clip of asset.animations || []) actions[/jaw/.test(clip.name) ? 'jaw' : /tail/.test(clip.name) ? 'tail' : clip.name] = mixer.clipAction(clip);
      tailPivot=model.getObjectByName('scrapasaurus-tail');
      group.userData.rexReady = true;
    }).catch(error => { if (!disposed) group.userData.rexError = error?.message || 'The Scrapasaurus could not load'; });
    // The pen beside the rails, between them and the wall (rexPlaces).
    const box = new THREE.BoxGeometry(1.9, 1.15, 4.1);
    for (let i = 0; i < REX_RULES.penCars; i++) {
      const car = new THREE.Mesh(box, rust);
      const p = next.groundAt(places.penS + (i % 4) * 2.2 - 3.3, places.penLateral - places.side * Math.floor(i / 4) * .2);
      car.position.set(p.x, p.y + .58 + Math.floor(i / 4) * 1.15, p.z);
      car.rotation.y = p.heading + (i % 2 ? .25 : -.2);
      pen.add(car);
    }
  }

  // Drawn at the fight's size for this floor (rexPlaces: its head at places.headTop).
  function place(at, heading) {
    holder.position.set(at.x, at.y, at.z);
    holder.rotation.y = heading;
    holder.scale.setScalar(places.scale);
  }

  return {group, update(next, state, now, show) {
    const night = state?.bowlNight, fight = rexFightOf(night);
    const teaser = !fight && (night?.night === 3 || night?.night === 4);
    const enabled = show === true && next?.def?.bowl === true && !disposed && (!!fight || teaser);
    group.visible = enabled;
    if (!enabled) { lastNow = now; chestLight.intensity = 0; return; }
    if (next !== course) build(next);
    const dt = lastNow == null ? 0 : Math.max(0, Math.min(.1, (now - lastNow) / 1000));
    lastNow = now;
    mixer?.update(dt);
    const seconds = now / 1000;
    pen.visible = !!fight;
    cone.visible = fire.visible = ring.visible = thrown.visible = chest.visible = false;
    chestLight.intensity = 0;
    cable.visible=tip.visible=mark.visible=beam.visible=progress.visible=pointer.visible=false;
    if (teaser) {
      // Behind the wall in front of the stands, at the head of the crush line, looking in.
      const at = next.groundAt(places.startS, places.side * (places.edge + 4.5));
      place(at, at.heading - Math.PI / 2);
      pose.position.y = 0; pose.rotation.set(0, 0, 0);
      for(const {part,whole,open,parent,origin} of boxes){
        if(part){if(part.parent!==parent)parent.add(part);part.position.copy(origin);part.rotation.set(0,0,0);part.visible=true;}
        if(whole)whole.visible=true;
        if(open)open.scale.setScalar(0);
      }
      actions.tired?.stop();
      actions.tail?.play();
      return;
    }
    pen.children.forEach((car, index) => { car.visible = index < fight.penCars; });
    place(next.groundAt(fight.s, places.rail), rexFacing(fight, next));
    const fallen=fallPose(fight);
    pose.position.set(0,fallen.lift,0);
    pose.rotation.set(0,0,fallen.roll);
    const tired=actions.tired;
    if(tired){
      if(fight.low){tired.play();tired.paused=true;tired.time=tired.getClip().duration*.8;mixer.update(0);}
      else if(tired.isScheduled()){tired.stop();mixer.update(0);}
    }
    if(actions.jaw){if(['tell','fire','lift'].includes(fight.phase))actions.jaw.play();else actions.jaw.stop();}
    actions.tail?.stop();
    if(tailPivot)tailPivot.rotation.y=fight.tailYaw || 0;
    const hook=fight.hook;
    boxes.forEach(({part,whole,open,parent,origin},index)=>{
      if(!part)return;
      const detached=fight.boxes[index];
      const position=hook.phase==='dragging' && hook.box===index ? hook.drag : fight.dropped[index];
      if(detached && position){
        if(part.parent!==group)group.add(part);part.position.copy(position);part.rotation.set(0,hook.origin?.heading||0,0);
      }else{
        if(part.parent!==parent)parent.add(part);part.position.copy(origin);part.rotation.set(0,0,0);
      }
      part.visible=!detached || !!position;
      const lit=detached || fight.marker?.box===index;
      if(whole)whole.visible=!lit;
      if(open){open.scale.setScalar(lit?1:0);open.visible=lit;}
    });
    if(hook.origin && hook.tip && hook.phase!=='idle'){
      const points=cableGeo.getAttribute('position');
      points.setXYZ(0,hook.origin.x,hook.origin.y,hook.origin.z);
      points.setXYZ(1,hook.tip.x,hook.tip.y,hook.tip.z);
      points.needsUpdate=true;cable.visible=tip.visible=true;tip.position.copy(hook.tip);
    }
    if(fight.marker){
      mark.visible=true;mark.position.copy(fight.marker);
      beam.visible=pointer.visible=true;
      beam.position.copy(mark.position);beam.position.y+=17.5;
      progress.visible=hook.phase==='attached';
      if(progress.visible){
        const required=REX_RULES.level[fight.level].pull[hook.box];
        const steps=Math.floor(64*Math.min(1,hook.pulls[hook.box]/required));
        progress.position.copy(mark.position);progress.geometry.setDrawRange(0,steps*6);
      }
      mark.material.color.setHex(fight.marker.canBite ? 0x99ff77:RING);
    }
    if (fight.cone && (fight.phase === 'tell' || fight.phase === 'fire')) {
      if(cone.userData.halfAngle!==fight.cone.halfAngle){
        cone.geometry.dispose();cone.geometry=fanGeometry(fight.cone.halfAngle);
        cone.userData.halfAngle=fight.cone.halfAngle;
      }
      const y = next.groundAt(fight.s, places.rail).y + .06;
      for (const item of [cone, fire]) {
        item.position.set(fight.cone.x, y, fight.cone.z);
        item.rotation.y = item===fire ? fight.cone.flameHeading : fight.cone.heading;
        item.scale.set(fight.cone.range, 1, fight.cone.range);
      }
      cone.visible = true;
      // The tell: the cone pulses faster as the fire gets close, and its chest glows brighter. The fire: the cone burns.
      const level = REX_RULES.level[fight.level];
      const share = fight.phase === 'tell' ? Math.min(1, fight.t / level.tellSec) : 1;
      chest.visible = true;
      chest.material.opacity = .35 + .55 * share;
      chest.scale.setScalar(.8 + .5 * share + .08 * Math.sin(seconds * 14));
      chestLight.intensity = 40 + 260 * share;
      cone.material.opacity = fight.phase === 'tell' ? .22 + .3 * share * (.5 + .5 * Math.sin(seconds * (6 + share * 10))) : .6;
      fire.visible = fight.phase === 'fire';
      if (fire.visible) fire.children.forEach((sheet, layer) => {
        sheet.material.opacity = .45 + .25 * Math.sin(seconds * 23 + layer * 2.1);
        sheet.scale.setScalar(.92 + .08 * Math.sin(seconds * 17 + layer));
      });
    }
    if (fight.throwAt && (fight.phase === 'lift' || fight.phase === 'throw')) {
      const target = next.groundAt(fight.throwAt.s, fight.throwAt.lateral);
      ring.position.set(target.x, target.y + .07, target.z);
      ring.visible = true;
      ring.material.opacity = .4 + .3 * Math.sin(seconds * 10);
      const head = next.groundAt(fight.s + fight.direction * places.headAhead, places.rail);
      const from = new THREE.Vector3(head.x, head.y + places.headTop, head.z);
      thrown.visible = true;
      if (fight.phase === 'lift') thrown.position.copy(from);
      else {
        const u = Math.min(1, fight.t / REX_RULES.thrown.flightSec);
        thrown.position.set(from.x + (target.x - from.x) * u, from.y + (target.y + .6 - from.y) * u + 6 * u * (1 - u),
          from.z + (target.z - from.z) * u);
        thrown.rotation.x = u * 2.4;
      }
    }
  }, dispose() {
    if (disposed) return;
    disposed = true; clear(); mixer?.stopAllAction(); disposeTree(group);
  }};
}
