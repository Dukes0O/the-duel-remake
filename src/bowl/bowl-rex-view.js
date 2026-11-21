import * as THREE from 'three';
import {fallPose} from './bowl-hook.js';
import {REX_RULES, rexFacing, rexFightOf, rexPlaces} from './bowl-rex.js';
import {createFlameMaterial, createSmokeMaterial} from '../world/scrap-look.js';
import {createSpray, createSteelCable, nearCap} from './bowl-fx.js';

// The Scrapasaurus in the Bowl (BOWL-REX-FIGHT): its model on the rails, its
// poses, its battery boxes, the chest tell and fire, the ring where a thrown car
// will land, and its pen of
// junk cars. On nights three and four it stands behind the stands' wall, seen
// before it is fought. It reads state.bowlNight and never writes it.
// BOWL-REX-LOOK draws the fight's moments: steam off the tired sag, the tall
// beam over the open box, its fire as tongues of flame, the torn leads and the
// sparks of a box tearing out, a cable that hangs slack and then pulls straight,
// and the fall, with its lights dying, dust, and the arena's flame jets firing
// together (`group.userData.allJetsFire`, read by bowl-view.js).
// BOWL-LOOK-FIX: the cable is lit steel wire rope; sparks are sized to show from the driver's seat, and a dragged box
// scrapes a trail of them along the floor; the fire may not cover more than a share of the picture close up.
const MODEL = '/assets/models/wasteland/bowl/scrapasaurus.glb';
const ORANGE = 0xff7a1a, RING = 0xffe27a;
// The moments, in seconds after the event that starts each one (docs/ART_LINE.md, "A moment keeps one clock").
export const REX_MOMENTS = Object.freeze({fireGrow: .35, tearSparks: 1, fallLand: 1.5, jetsFrom: 1.3, dustSeconds: 2.6,
  lightsOut: .5, steamBurst: 1.5, dragBurst: 1.4});
const unit = (index, k) => { const v = Math.sin(index * 127.1 + k * 311.7) * 43758.5453; return v - Math.floor(v); };
// How bright the fire may be: the tongues' gain, the stream's strength, and the share left when the camera is in it.
export const REX_FIRE_CAP = Object.freeze({gain: .55, stream: .8, close: .35});

// A soft vertical fade for a beam: bright at its foot, gone at its top. Additive, so dark is see-through.
function fadeUp(geometry, foot = 1, top = 0) {
  const position = geometry.getAttribute('position'), colours = [];
  geometry.computeBoundingBox();
  const {min, max} = geometry.boundingBox;
  for (let i = 0; i < position.count; i++) {
    const share = (position.getY(i) - min.y) / (max.y - min.y || 1);
    const level = foot + (top - foot) * Math.pow(share, .7);
    colours.push(level, level, level);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  return geometry;
}

// Soft puffs that face the viewer, each with its own fade and seed on one shared material (as createDustTrail).
function puffs(name, count, colour, cap = 0) {
  const holder = new THREE.Group(); holder.name = name;
  const material = createSmokeMaterial(colour), card = new THREE.PlaneGeometry(1, 1);
  for (let index = 0; index < count; index++) {
    const puff = new THREE.Mesh(card, material);
    puff.name = name + ' puff'; puff.userData.fade = 0; puff.renderOrder = 3; puff.visible = false; puff.frustumCulled = false;
    // With `cap`, a puff close to the camera fades before it can fill the picture (BOWL-LOOK-FIX).
    puff.onBeforeRender = (_renderer, _scene, camera) => {
      material.uniforms.uFade.value = puff.userData.fade * (cap ? cap * nearCap(puff, camera, puff.scale.x) : 1);
      material.uniforms.uSeed.value = index * .37;
      material.uniformsNeedUpdate = true; };
    holder.add(puff);
  }
  return holder;
}

function disposeTree(root) {
  root?.traverse?.(node => {
    node.geometry?.dispose?.();
    for (const material of [node.material].flat().filter(Boolean)) material.dispose?.();
  });
}

// The throw ring is visible even where a ramp rises through it.
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
  // Under the front of its chest, where the neck meets the ribs (BOWL-REX-LOOK: at 3.4 m it hung between the legs).
  chest.name = 'Scrapasaurus chest glow'; chest.position.set(0, 6.7, 3.1); chest.visible = false;
  const chestLight = new THREE.PointLight(ORANGE, 0, 14, 2);
  chestLight.position.copy(chest.position);
  pose.add(chest, chestLight);
  let asset = null;
  // Only the beast's chest warns the driver before the fire.
  // Its fire as fire (owed from BOWL-FINISH): a rolling stream of fireballs pours from its mouth down onto the floor,
  // and tongues of flame burn along the orange out to the end of the rules' reach, with a light on the floor.
  const fire = new THREE.Group(); fire.name = 'Scrapasaurus fire'; fire.visible = false;
  // The shared flame drawing at a lower gain, so that many tongues overlapping stay orange instead of burning white.
  const flameMaterial = createFlameMaterial(), flameCard = new THREE.PlaneGeometry(1, 1);
  flameMaterial.uniforms.uGain = {value: .55};
  const gained = flameMaterial.fragmentShader
    .replace('uniform float uSeed;', 'uniform float uSeed;uniform float uGain;')
    .replace('gl_FragColor=vec4(colour*body*1.05,body);', 'gl_FragColor=vec4(colour*body*uGain,body*uGain);');
  // Only when both lines were found: otherwise the shared drawing is kept as it is, brighter but whole.
  if (/uniform float uGain;[\s\S]*body\*uGain\)/.test(gained)) flameMaterial.fragmentShader = gained;
  // Close up the fire is capped (batch drive 3: it flooded the picture orange): each tongue fades as it grows past a
  // share of the picture, and the whole fire dims as the camera comes within a few metres of it.
  const TONGUES = 26, tongues = [], fireCentre = new THREE.Vector3(), fireEye = new THREE.Vector3();
  let fireNear = 1;
  for (let index = 0; index < TONGUES; index++) {
    const tongue = new THREE.Mesh(flameCard, flameMaterial);
    tongue.name = 'Scrapasaurus flame tongue'; tongue.renderOrder = 6; tongue.frustumCulled = false;
    tongue.onBeforeRender = (_renderer, _scene, camera) => {
      if (index === 0) {
        fireCentre.set(0, 2, (fire.userData.reach || 16) * .5).applyMatrix4(fire.matrixWorld);
        fireEye.setFromMatrixPosition(camera.matrixWorld);
        fireNear = REX_FIRE_CAP.close + (1 - REX_FIRE_CAP.close) * Math.min(1, Math.max(0, (fireCentre.distanceTo(fireEye) - 6) / 14));
      }
      flameMaterial.uniforms.uSeed.value = index * .173;
      flameMaterial.uniforms.uGain.value = REX_FIRE_CAP.gain * fireNear * nearCap(tongue, camera, tongue.scale.y);
      flameMaterial.uniformsNeedUpdate = true; };
    fire.add(tongue); tongues.push(tongue);
  }
  const stream = puffs('Scrapasaurus fire stream', 24, 0xff6a12, REX_FIRE_CAP.stream);
  stream.children[0].material.blending = THREE.AdditiveBlending;
  fire.add(stream);
  const fireLight = new THREE.PointLight(0xff8a2a, 0, 26, 1.8); fire.add(fireLight);
  // The ring where a thrown car will land, and the car.
  const ring = new THREE.Mesh(new THREE.RingGeometry(REX_RULES.thrown.hitRadius - .35, REX_RULES.thrown.hitRadius, 40), glowMaterial(RING));
  ring.rotation.x = -Math.PI / 2; ring.name = 'Scrapasaurus throw ring'; ring.visible = false; ring.renderOrder = 4;
  const rust = new THREE.MeshStandardMaterial({color: 0x6b4a33, roughness: .9, metalness: .2});
  const thrown = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.2, 4.2), rust);
  thrown.name = 'Scrapasaurus thrown junk car'; thrown.visible = false;
  // The cable: a bright steel rope that hangs to the floor while it is slack and pulls straight when it is tight,
  // thick enough to follow from across the arena.
  // BOWL-LOOK-FIX: lit steel wire rope with its strands' twist, not a flat pale ribbon.
  const CABLE_STEPS = 24, steelCable = createSteelCable(CABLE_STEPS, 'Scrapasaurus tow cable'), cable = steelCable.group;
  const ropePoints = Array.from({length: CABLE_STEPS + 1}, () => new THREE.Vector3());
  const tip=new THREE.Mesh(new THREE.TorusGeometry(.16,.045,6,14),rust);
  tip.name='Truck tow hook';
  const mark=new THREE.Mesh(new THREE.RingGeometry(.59,.68,24),glowMaterial(RING));
  mark.name='Open battery marker';mark.rotation.y=Math.PI/2;
  // The beam: a hard core and a wide soft halo, 60 m tall, standing up from the open box and fading into the dark,
  // with a warm light on the box itself.
  const BEAM_HEIGHT = 60;
  const beam=new THREE.Mesh(fadeUp(new THREE.CylinderGeometry(.3,.45,BEAM_HEIGHT,14,8,true)),glowMaterial(0xffd44d));
  beam.name='Open battery beam';beam.material.opacity=.9;beam.material.vertexColors=true;beam.frustumCulled=false;
  const halo=new THREE.Mesh(fadeUp(new THREE.CylinderGeometry(1.5,2.1,BEAM_HEIGHT,20,8,true),.9,0),glowMaterial(0xffb030));
  halo.name='Open battery beam halo';halo.material.opacity=.2;halo.material.vertexColors=true;halo.frustumCulled=false;
  beam.add(halo);
  const boxLight=new THREE.PointLight(0xffb84a,0,14,1.8);boxLight.name='Open battery light';
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
  // Sparks: two from each socket's torn leads while its box is out, a shower where a box tears free, and a trail
  // scraped along the floor by the box the truck drags (seen from the driver's seat, where the socket is not).
  const leadSparks = [0, 1, 2].map(() => [createSpray(18, 'Scrapasaurus lead sparks'), createSpray(18, 'Scrapasaurus lead sparks')]);
  const tearSparks = [0, 1, 2].map(() => createSpray(110, 'Scrapasaurus tear sparks'));
  const dragSparks = createSpray(70, 'Scrapasaurus dragged box sparks');
  // The box lands behind the truck, under the chase camera, so the tear is also seen at the cable's truck end: the
  // hitch crackles with a burst thrown up over the tailgate.
  const hitchSparks = createSpray(150, 'Scrapasaurus hitch sparks');
  for (const points of [...leadSparks.flat(), ...tearSparks, dragSparks, hitchSparks]) { points.visible = false; group.add(points); }
  const across = new THREE.Vector3(), backward = new THREE.Vector3();
  // Steam off its back and shoulders while it sags, in the pose's own metres so it sags with it.
  const steam = puffs('Scrapasaurus steam', 16, 0xd9d4c8); pose.add(steam);
  const STEAM_VENTS = [[-1.4, 5.2, -1.6], [1.4, 5.2, -1.6], [-1.2, 5.5, 1.2], [1.2, 5.5, 1.2], [0, 5.0, -4.2], [0, 5.3, 3.4]];
  // Dust thrown up along its length where it lands, in the rails' metres (not rolled with the body).
  const dust = puffs('Scrapasaurus fall dust', 18, 0x8a7458); holder.add(dust);
  group.add(holder, fire, ring, thrown, pen, cable, tip, mark, beam, boxLight, progress, pointer);
  const moments = {tornAt: [null, null, null], tiredAt: null, fight: null};
  let clockNow = 0;
  const sinceTearOf = index => moments.tornAt[index] == null ? Infinity : clockNow - moments.tornAt[index];
  let lamps = [];
  const scratch = new THREE.Vector3(), outward = new THREE.Vector3(), centre = new THREE.Vector3();

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
        const leads=model.getObjectByName(`battery-leads-${index}`);
        const sparks=['a','b'].map(end=>model.getObjectByName(`battery-spark-${index}-${end}`)).filter(Boolean);
        const socket=model.getObjectByName(`battery-socket-${index}`);
        return {part,whole,open,leads,sparks,socket,parent:part?.parent,origin:part?.position.clone()};
      });
      // Its lamps get their own material copies so the fall can put them out without touching anything else.
      lamps = [];
      model.traverse(node => {
        if (!node.isMesh || !/headlamp|copper/i.test(node.material?.name || '')) return;
        node.material = node.material.clone();
        lamps.push({material: node.material, glow: node.material.emissiveIntensity ?? 1});
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
    if (!enabled) { lastNow = now; chestLight.intensity = 0; group.userData.allJetsFire = false; return; }
    if (next !== course) build(next);
    const dt = lastNow == null ? 0 : Math.max(0, Math.min(.1, (now - lastNow) / 1000));
    lastNow = now;
    mixer?.update(dt);
    const seconds = now / 1000;
    clockNow = seconds;
    const truckMph = state?.speedMph || 0;
    pen.visible = !!fight;
    fire.visible = ring.visible = thrown.visible = chest.visible = false;
    chestLight.intensity = 0;
    cable.visible=tip.visible=mark.visible=beam.visible=progress.visible=pointer.visible=false;
    boxLight.intensity=0;fireLight.intensity=0;
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
      for(const {leads} of boxes)leads?.scale.setScalar(0);
      for(const points of [...leadSparks.flat(),...tearSparks,dragSparks,hitchSparks])points.visible=false;
      steam.visible=dust.visible=false;group.userData.allJetsFire=false;
      for(const lamp of lamps)lamp.material.emissiveIntensity=lamp.glow;
      actions.tired?.stop();
      actions.tail?.play();
      return;
    }
    pen.children.forEach((car, index) => { car.visible = index < fight.penCars; });
    place(next.groundAt(fight.s, places.rail), rexFacing(fight, next));
    if (moments.fight !== fight) { moments.fight = fight; moments.tornAt = [null, null, null]; moments.tiredAt = null; }
    const fallen=fallPose(fight), falling=fight.phase==='fallen';
    // It sways once before it goes over, and its weight rocks it from foot to foot as it walks.
    const sway=falling ? .1*Math.sin(fight.t*11)*Math.max(0,1-fight.t/.9) : 0;
    const stride=fight.phase==='walk' ? Math.abs(Math.sin(seconds*3.1)) : 0;
    pose.position.set(0,fallen.lift+.22*stride,0);
    pose.rotation.set(0,0,fallen.roll+sway+(fight.phase==='walk' ? .025*Math.sin(seconds*3.1) : 0));
    // Its lights die as it falls.
    const lit=falling ? Math.max(0,1-fight.t/REX_MOMENTS.lightsOut) : 1;
    for(const lamp of lamps)lamp.material.emissiveIntensity=lamp.glow*lit;
    // The arena's flame jets fire together once it is down (bowl-view.js reads this).
    group.userData.allJetsFire=falling && fight.t>=REX_MOMENTS.jetsFrom;
    // Dust along its length where it lands, on the side it falls to (+x of its rails).
    const sinceLand=falling ? fight.t-REX_MOMENTS.fallLand : -1;
    dust.visible=sinceLand>=0 && sinceLand<REX_MOMENTS.dustSeconds;
    if(dust.visible)dust.children.forEach((puff,index)=>{
      const age=Math.min(1,sinceLand/REX_MOMENTS.dustSeconds), along=-10+19*index/(dust.children.length-1);
      const grow=1-Math.pow(1-age,2.2);
      puff.position.set(3+6*unit(index,1)+2.5*grow*unit(index,2),.6+3.2*grow,along+1.4*(unit(index,3)-.5));
      puff.scale.set(2.5+7*grow,1.6+4.5*grow,1);
      puff.userData.fade=Math.min(1,age/.06)*Math.pow(1-age,1.4)*.55;puff.visible=puff.userData.fade>.004;
    });
    // Steam while it sags: a burst as it drops, then a steady seep from its back and shoulders.
    if(fight.low && !falling){ if(moments.tiredAt==null)moments.tiredAt=seconds; } else moments.tiredAt=null;
    steam.visible=moments.tiredAt!=null;
    if(steam.visible){
      const since=seconds-moments.tiredAt, burst=Math.max(0,1-since/REX_MOMENTS.steamBurst);
      steam.children.forEach((puff,index)=>{
        const vent=STEAM_VENTS[index%STEAM_VENTS.length], age=(seconds/2.2+index/steam.children.length)%1;
        puff.position.set(vent[0]+Math.sin(index*2.1+age*3)*.5*age,vent[1]+3.4*age,vent[2]+.6*age*Math.cos(index));
        puff.scale.setScalar(1+2.6*age+1.5*burst);
        puff.userData.fade=Math.min(1,age/.12)*Math.pow(1-age,1.2)*(.32+.4*burst);puff.visible=true;
      });
    }
    const tired=actions.tired;
    if(tired){
      if(fight.low){tired.play();tired.paused=true;tired.time=tired.getClip().duration*.8;mixer.update(0);}
      else if(tired.isScheduled()){tired.stop();mixer.update(0);}
    }
    if(actions.jaw){if(['tell','fire','lift'].includes(fight.phase))actions.jaw.play();else actions.jaw.stop();}
    actions.tail?.stop();
    if(tailPivot)tailPivot.rotation.y=fight.tailYaw || 0;
    const hook=fight.hook;
    dragSparks.visible=hitchSparks.visible=false;
    holder.updateMatrixWorld(true);
    boxes.forEach(({part,whole,open,leads,sparks,socket,parent,origin},index)=>{
      if(!part)return;
      const detached=fight.boxes[index];
      const dragged=hook.phase==='dragging' && hook.box===index;
      const position=dragged ? hook.drag : fight.dropped[index];
      if(detached && position){
        if(part.parent!==group)group.add(part);part.position.copy(position);part.rotation.set(0,hook.origin?.heading||0,0);
        // A dragged box bounces along behind the truck.
        if(dragged){part.position.y+=.35*Math.abs(Math.sin(seconds*8.3));part.rotation.x=.12*Math.sin(seconds*6.1);
          // Steel scraping the floor while the truck moves, thrown high and out to both sides so it rises into view.
          const scrape=Math.min(1,Math.abs(truckMph)/15);
          if(hook.origin && scrape>.1){
            backward.set(position.x-hook.origin.x,0,position.z-hook.origin.z);
            if(backward.lengthSq()<1e-6)backward.set(0,0,-1);
            backward.normalize();across.set(-backward.z,0,backward.x);
            scratch.set(position.x,position.y+.2,position.z);
            dragSparks.visible=true;
            dragSparks.userData.place(seconds,scratch,backward,across,{reach:2.4,rise:6,both:true,share:.3+.5*scrape,life:1.5});
          }
        }
      }else{
        if(part.parent!==parent)parent.add(part);part.position.copy(origin);part.rotation.set(0,0,0);
      }
      part.visible=!detached || !!position;
      const lit=detached || fight.marker?.box===index;
      if(whole)whole.visible=!lit;
      if(open){open.scale.setScalar(lit?1:0);open.visible=lit;}
      // A box that is out leaves its torn leads, which spit sparks in bursts; it tears free in a shower of them.
      leads?.scale.setScalar(detached?1:0);
      if(detached && moments.tornAt[index]==null)moments.tornAt[index]=seconds;
      if(!detached)moments.tornAt[index]=null;
      const sinceTear=moments.tornAt[index]==null ? Infinity : seconds-moments.tornAt[index];
      holder.getWorldPosition(centre);group.worldToLocal(centre);
      leadSparks[index].forEach((points,end)=>{
        const anchor=sparks[end];
        points.visible=detached && !!anchor && !falling && ((seconds*1.25+index*.37+end*.5)%1)<.5;
        if(!points.visible)return;
        anchor.getWorldPosition(scratch);group.worldToLocal(scratch);
        outward.set(scratch.x-centre.x,0,scratch.z-centre.z);
        if(outward.lengthSq()<1e-6)outward.set(1,0,0);
        outward.normalize();
        across.set(-outward.z,0,outward.x);
        points.userData.place(seconds*1.6+end,scratch,outward,across,{reach:1.6,rise:1.4,spread:.5});
      });
      const shower=tearSparks[index];
      shower.visible=detached && !!socket && sinceTear<REX_MOMENTS.tearSparks;
      if(shower.visible){
        socket.getWorldPosition(scratch);group.worldToLocal(scratch);
        outward.set(scratch.x-centre.x,0,scratch.z-centre.z);
        if(outward.lengthSq()<1e-6)outward.set(1,0,0);
        outward.normalize();
        across.set(-outward.z,0,outward.x);
        // A burst that grows out of the socket and dies over its second.
        shower.userData.place(sinceTear,scratch,outward,across,{reach:5,rise:4,spread:1,share:1-sinceTear/REX_MOMENTS.tearSparks,life:1.6});
      }
    });
    // The moment a box tears free the hitch crackles, whether the driver keeps the box on the cable or drops it.
    const newest=Math.min(sinceTearOf(0),sinceTearOf(1),sinceTearOf(2)), burst=Math.max(0,1-newest/REX_MOMENTS.dragBurst);
    if(burst>0 && hook.origin && !falling){
      backward.set(-Math.sin(hook.origin.heading||0),0,-Math.cos(hook.origin.heading||0));across.set(-backward.z,0,backward.x);
      scratch.set(hook.origin.x,hook.origin.y+.3,hook.origin.z);
      hitchSparks.visible=true;
      hitchSparks.userData.place(seconds,scratch,backward,across,{reach:2.2,rise:7,both:true,share:burst,life:1.8});
    }
    if(hook.origin && hook.tip && hook.phase!=='idle'){
      // Slack, it hangs as a rope of its length would (a parabola's sag), never below the floor under the truck;
      // tight, it is straight and brighter, and trembles while the truck pulls.
      const from=hook.origin,to=hook.tip;
      const span=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
      const length=hook.phase==='attached' ? hook.length : span;
      const sag=hook.tight || hook.phase!=='attached' ? 0 : Math.sqrt(Math.max(0,3*span*(length-span)/8));
      const floor=Math.min(from.y,to.y)-1.1, tremble=hook.pulling ? .05 : 0;
      ropePoints.forEach((point,k)=>{
        const u=k/CABLE_STEPS;
        point.set(from.x+(to.x-from.x)*u,from.y+(to.y-from.y)*u-4*sag*u*(1-u),from.z+(to.z-from.z)*u);
        point.y=Math.max(point.y,floor)+tremble*Math.sin(seconds*60+k*1.7)*Math.sin(Math.PI*u);
      });
      // A wire rope as thick as a thumb, drawn a little fatter so it can be followed from across the arena.
      steelCable.lay(ropePoints,hook.tight ? .085 : .095,!!hook.tight);
      cable.visible=tip.visible=true;tip.position.copy(hook.tip);
    }
    if(fight.marker){
      mark.visible=true;mark.position.copy(fight.marker);
      beam.visible=pointer.visible=true;
      beam.position.copy(mark.position);beam.position.y+=BEAM_HEIGHT/2-.4;
      beam.material.opacity=.78+.14*Math.sin(seconds*5.2);
      boxLight.position.copy(mark.position);boxLight.position.y-=.2;boxLight.intensity=90+30*Math.sin(seconds*5.2);
      progress.visible=hook.phase==='attached';
      if(progress.visible){
        const required=REX_RULES.level[fight.level].pull[hook.box];
        const steps=Math.floor(64*Math.min(1,hook.pulls[hook.box]/required));
        progress.position.copy(mark.position);progress.geometry.setDrawRange(0,steps*6);
      }
      mark.material.color.setHex(fight.marker.canBite ? 0x99ff77:RING);
    }
    if (fight.cone && (fight.phase === 'tell' || fight.phase === 'fire')) {
      const y = next.groundAt(fight.s, places.rail).y + .06;
      fire.position.set(fight.cone.x, y, fight.cone.z);
      fire.rotation.y = fight.cone.flameHeading;
      // The chest grows brighter until the fire starts.
      const level = REX_RULES.level[fight.level];
      const share = fight.phase === 'tell' ? Math.min(1, fight.t / level.tellSec) : 1;
      chest.visible = true;
      chest.material.opacity = .35 + .55 * share;
      chest.scale.setScalar(.8 + .5 * share + .08 * Math.sin(seconds * 14));
      chestLight.intensity = 40 + 260 * share;
      fire.visible = fight.phase === 'fire';
      if (fire.visible) {
        // The stream leaves the mouth and comes down onto the floor a third of the way out; the tongues burn along the
        // floor from there to the end of the fire's reach. The jet grows out of the mouth over its first moment, and never
        // reaches past the rules' range.
        const mouth = places.headTop * places.scale - 2.6, reach = fight.cone.range, land = reach * .32;
        fire.userData.reach = reach;
        const grown = Math.min(1, fight.t / REX_MOMENTS.fireGrow), spread = REX_RULES.fire.halfAngle * .9;
        flameMaterial.uniforms.uTime.value = seconds;
        stream.children.forEach((ball, index) => {
          const u = (seconds * 2.4 + index / stream.children.length) % 1;
          const angle = (unit(index, 3) * 2 - 1) * spread * u, distance = u * land * grown + .6;
          ball.position.set(Math.sin(angle) * distance, Math.max(.8, mouth * Math.pow(1 - u, 1.25)) + .4, Math.cos(angle) * distance);
          ball.scale.setScalar((1.3 + 3.6 * u) * (.85 + .3 * unit(index, 5)));
          ball.userData.fade = Math.min(1, u / .08) * (.75 - .25 * u) * fireNear; ball.visible = true;
        });
        tongues.forEach((tongue, index) => {
          const u = (seconds * 1.3 + index / TONGUES) % 1, cycle = Math.floor(seconds * 1.3 + index / TONGUES);
          const angle = (unit(index, cycle % 97) * 2 - 1) * spread;
          const distance = (land + u * (reach - land - 1.5)) * grown, size = 2.4 + 4.2 * u;
          tongue.position.set(Math.sin(angle) * distance, size * .45, Math.cos(angle) * distance);
          const fade = Math.min(1, u / .1) * (u > .8 ? 1 - (u - .8) / .2 : 1);
          tongue.scale.set(size * fade, size * 1.25 * fade, 1);
          tongue.visible = fade > .02 && grown > .6;
        });
        fireLight.position.set(0, 3, reach * .45 * grown);
        fireLight.intensity = (300 + 90 * Math.sin(seconds * 19)) * fireNear;
      }
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
