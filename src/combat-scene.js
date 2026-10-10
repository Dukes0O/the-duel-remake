import {createFlameResources, createFlameView, createFlameScorch, createFlameLighting} from './flame-view.js';
import {FLAME_RULES} from './arsenal/flamethrower.js';
import {SIGNATURE_GEAR} from './crew-gear/gear.js';
import {createSmokeCloud, smokeHazeOpacity} from './combat-effects.js';
import {
  arsenalEnabled, hazardsActive, point
} from './combat-weapons.js';
import {
  carEffect
} from './arsenal/car-effects.js';
import {
  actorForTarget
} from './arsenal/targeting.js';
import {wastelandRulesActive} from './wasteland-access.js';
import {
  hazardsFor
} from './arsenal/hazards.js';
import * as THREE from 'three';
import {teslaChargePoint} from './arsenal/tesla.js';
import {
  createVehicleAttachmentRegistry
} from './vehicle-attachments.js';
import {
  createArmorKitMeshes
} from './armor-kit-meshes.js';
import {
  createRiggedFighterFigures
} from './rigged-fighter.js';
import {
  createRaiderMarkers
} from './raider-markers.js';
import {
  createSalvageMarkers
} from './salvage-markers.js';
import {
  COMBAT_TUNING
} from './wasteland-tuning.js';
// Reusable effects geometry; the flagged fighter pool is prepared on asset load.
export function createCombatScene(attachments = createVehicleAttachmentRegistry(), {
  loadFighterAsset, loadFlameTexture = () => new THREE.Texture()
} = {
}){
  const group=new THREE.Group();
  group.name='Wasteland weapons and shockwaves';
  const onFootFigures=createRiggedFighterFigures({
    loadAsset:loadFighterAsset
  });
  group.add(onFootFigures.group);
  const raiderMarkers=createRaiderMarkers();
  group.add(raiderMarkers.group);
  const salvageMarkers=createSalvageMarkers();
  group.add(salvageMarkers.group);
  const materials={
    iron:new THREE.MeshStandardMaterial({
      color:0x342a23,metalness:.8,roughness:.55
    }),
    fire:new THREE.MeshBasicMaterial({
      color:0xff8c16,transparent:true,opacity:.85,depthWrite:false
    }),
    smoke:new THREE.MeshBasicMaterial({
      color:0x322b24,transparent:true,opacity:.6,depthWrite:false
    }),
    neon:new THREE.MeshBasicMaterial({
      color:0x64ffce,wireframe:true
    }),gold:new THREE.MeshBasicMaterial({
      color:0xffe16b,wireframe:true
    }),
    shield:new THREE.MeshBasicMaterial({
      color:0xffd69b,wireframe:true,transparent:true,opacity:.16,depthWrite:false
    }),
    shieldRim:new THREE.LineBasicMaterial({
      color:0xffd69b,transparent:true,opacity:.32,depthWrite:false
    }),
    tip:new THREE.MeshBasicMaterial({
      color:0xffdf89
    })
  };
  const sphere=new THREE.IcosahedronGeometry(1,1),ring=new THREE.TorusGeometry(1,.055,6,28),shaft=new THREE.CylinderGeometry(.07,.07,3,5),tip=new THREE.ConeGeometry(.35,.8,5);
  // Preallocate the same bounded pool as the native hazard registry.
  const oilGeometry=new THREE.CircleGeometry(1,32);
  const caltropsGeometry=new THREE.ConeGeometry(.1,.38,4);
  const caltropsMaterial=new THREE.MeshStandardMaterial({
    color:0xd2d6d5,metalness:.95,roughness:.18
  });
  const spikeTransform=new THREE.Object3D();
  const tetherSegments = 16;
  const tetherSides = 6;
  const tetherRadius = .06;
  const tetherSag = .4;
  const tetherMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8592c, metalness: .65, roughness: .55
  });
  const tetherRing = new Float32Array((tetherSides + 1) * 2);
  for (let side = 0; side <= tetherSides; side++) {
    const angle = side / tetherSides * Math.PI * 2;
    tetherRing[side * 2] = -Math.cos(angle);
    tetherRing[side * 2 + 1] = Math.sin(angle);
  }
  const tetherViews = Array.from({length: 4}, () => {
    const path = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(), new THREE.Vector3(0, -2 * tetherSag, .5),
      new THREE.Vector3(0, 0, 1)
    );
    const geometry = new THREE.TubeGeometry(path, tetherSegments, tetherRadius, tetherSides, false);
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);
    const cable = new THREE.Mesh(geometry, tetherMaterial);
    cable.userData.arsenalTether = true;
    cable.frustumCulled = false;
    cable.visible = false;
    group.add(cable);
    return cable;
  });
  const tetherPosition = new THREE.Vector3();
  const tetherTangent = new THREE.Vector3();
  const tetherNormal = new THREE.Vector3();
  const tetherBinormal = new THREE.Vector3();
  function tetherPoint(duel, actor, out) {
    const at = duel.course.groundAt(actor.s, actor.lateral);
    return out.set(at.x, at.y + COMBAT_TUNING.pointHeight + (actor.airHeight || 0), at.z);
  }
  function updateTethers(duel, active) {
    const enabled = active && arsenalEnabled(duel);
    for (let index = 0; index < tetherViews.length; index++) {
      const cable = tetherViews[index];
      const actor = index === 0 ? duel.state : duel.state.opponents?.[index - 1];
      const effect = enabled && actor && carEffect(actor, 'tether');
      const shooter = effect && actorForTarget(duel, effect.shooterId);
      cable.visible = !!shooter;
      if (!shooter) continue;
      const geometry = cable.geometry;
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      const path = geometry.parameters.path;
      const from = tetherPoint(duel, shooter, path.v0);
      const to = tetherPoint(duel, actor, path.v2);
      // A quadratic's midpoint is half its control-point offset.
      path.v1.addVectors(from, to).multiplyScalar(.5);
      path.v1.y -= 2 * tetherSag;
      path.needsUpdate = true;
      const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
      for (let segment = 0; segment <= tetherSegments; segment++) {
        const fraction = segment / tetherSegments;
        path.getPoint(fraction, tetherPosition);
        tetherTangent.set(dx, dy - 4 * tetherSag * (1 - 2 * fraction), dz);
        if (tetherTangent.lengthSq() === 0) tetherTangent.set(0, 0, 1);
        tetherTangent.normalize();
        if (Math.abs(tetherTangent.y) < .95) tetherNormal.set(-tetherTangent.z, 0, tetherTangent.x);
        else tetherNormal.set(0, tetherTangent.z, -tetherTangent.y);
        tetherNormal.normalize();
        tetherBinormal.crossVectors(tetherTangent, tetherNormal);
        for (let side = 0; side <= tetherSides; side++) {
          const cosine = tetherRing[side * 2], sine = tetherRing[side * 2 + 1];
          const nx = cosine * tetherNormal.x + sine * tetherBinormal.x;
          const ny = cosine * tetherNormal.y + sine * tetherBinormal.y;
          const nz = cosine * tetherNormal.z + sine * tetherBinormal.z;
          const vertex = segment * (tetherSides + 1) + side;
          normals.setXYZ(vertex, nx, ny, nz);
          positions.setXYZ(vertex, tetherPosition.x + tetherRadius * nx,
            tetherPosition.y + tetherRadius * ny, tetherPosition.z + tetherRadius * nz);
        }
      }
      positions.needsUpdate = true;
      normals.needsUpdate = true;
    }
  }
  const hazardViews=Array.from({
    length:24
  },(_,index)=>{
    const holder=new THREE.Group();
    holder.name='arsenal-hazard-'+index;
    holder.visible=false;
    const oilMaterial=new THREE.MeshStandardMaterial({
      color:0x171512,metalness:.35,
      roughness:.22,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide
    });
    const smokeCloud = createSmokeCloud();
    const oil=new THREE.Mesh(oilGeometry,oilMaterial);
    oil.rotation.x=-Math.PI/2;
    const smoke = smokeCloud.mesh;
    const caltrops=new THREE.InstancedMesh(caltropsGeometry,caltropsMaterial,40);
    for(let i=0;i<40;i++){
      spikeTransform.position.set((i%5-2),.17,(Math.floor(i/5)-3.5));
      spikeTransform.rotation.set(i%2?.5:-.5,(i%4)*Math.PI/2,.28);
      spikeTransform.updateMatrix();
      caltrops.setMatrixAt(i,spikeTransform.matrix);
    }
    caltrops.instanceMatrix.needsUpdate=true;
    holder.add(oil,smoke,caltrops);
    group.add(holder);
    return {
      holder,oil,smoke,caltrops,oilMaterial,smokeCloud
    };
  });
  const smokeHazeMaterial = new THREE.MeshBasicMaterial({color: 0x81796f,
    transparent: true, opacity: 0, depthTest: false, depthWrite: false,
    side: THREE.BackSide, fog: false, toneMapped: false});
  const smokeHaze = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), smokeHazeMaterial);
  smokeHaze.name = 'smoke-camera-haze';
  smokeHaze.frustumCulled = false;
  smokeHaze.visible = false;
  smokeHaze.renderOrder = 1000;
  group.add(smokeHaze);
  const smokeClouds = [];
  function updateHazards(duel,active,vehicles){
    smokeClouds.length = 0;
    const hazards=active&&hazardsActive(duel) ? hazardsFor(duel) : [];
    hazardViews.forEach((view,index)=>{
      const hazard=hazards[index];
      view.holder.visible=!!hazard && hazard.opacity>0 && hazard.age<hazard.lifetime;
      if(!view.holder.visible)return;
      view.holder.position.set(hazard.x,(hazard.y||0)+.025,hazard.z);
      const oil=hazard.kind==='oil',caltrops=hazard.kind==='caltrops';
      view.oil.visible=oil;
      view.smoke.visible=hazard.kind==='smoke';
      view.caltrops.visible=caltrops;
      view.holder.rotation.y=hazard.shape==='strip' ? hazard.heading||0 : 0;
      if(caltrops){
        view.holder.position.y=(hazard.y||0)-COMBAT_TUNING.pointHeight+.03;
        view.caltrops.scale.set(hazard.width/5,1,hazard.length/8);
      }
      if(oil)view.oil.scale.setScalar(hazard.radius);
      if(view.smoke.visible) {
        const nearest = duel.course.nearest(hazard.x, hazard.z);
        const ground = duel.course.groundAt(nearest.s, nearest.lateral);
        view.holder.position.y = ground.y + .025;
        view.smokeCloud.update(hazard, vehicles.camera, vehicles.smokeTexture);
        smokeClouds.push({...hazard, y: ground.y});
      }
      view.oilMaterial.opacity=.9*hazard.opacity;

    });
    const camera = vehicles.camera;
    smokeHazeMaterial.opacity = smokeHazeOpacity(smokeClouds, camera?.position);
    smokeHaze.visible = smokeHazeMaterial.opacity > 0;
    if (camera) smokeHaze.position.copy(camera.position);
  }
  const rocketBody=new THREE.CylinderGeometry(.16,.16,1.25,8),rocketNose=new THREE.ConeGeometry(.21,.38,8);
  const shieldShell=new THREE.IcosahedronGeometry(1,0);
  const shieldRim=new THREE.BufferGeometry().setFromPoints(Array.from({
    length:64
  },(_,i)=>new THREE.Vector3(Math.cos(i*Math.PI/32),0,Math.sin(i*Math.PI/32))));
  const projectiles=Array.from({
    length:40
  },(_,index)=>{
    const g=new THREE.Group(),bomb=new THREE.Mesh(sphere,materials.iron),arrow=new THREE.Group();
    bomb.scale.setScalar(.65);
    const rod=new THREE.Mesh(shaft,materials.iron),head=new THREE.Mesh(tip,materials.tip);
    head.position.y=1.7;
    arrow.add(rod,head);
    arrow.rotation.x=Math.PI/2;
    const rocket=new THREE.Group();
    rocket.name=`combat-rpg-${index}`;
    const casing=new THREE.Mesh(rocketBody,materials.iron),nose=new THREE.Mesh(rocketNose,materials.tip),exhaust=new THREE.Mesh(sphere,materials.fire);
    nose.position.y=.8;
    exhaust.position.y=-.73;
    exhaust.scale.set(.12,.27,.12);
    rocket.add(casing,nose,exhaust);
    const fuse=new THREE.Mesh(sphere,materials.tip);
    fuse.scale.setScalar(.17);
    fuse.position.y=.7;
    bomb.add(fuse);
    g.add(bomb,arrow,rocket);
    group.add(g);
    return {
      g,bomb,arrow,rocket
    };
  });
  const crewTurret = new THREE.Group();
  const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(.48,.62,.42,8), materials.iron);
  const turretHead = new THREE.Mesh(new THREE.BoxGeometry(.8,.48,.62), materials.iron);
  const turretBarrel = new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.82,6), materials.iron);
  turretHead.position.y=.43; turretBarrel.position.set(0,.48,.62);
  turretBarrel.rotation.x=Math.PI/2;
  crewTurret.add(turretBase,turretHead,turretBarrel); crewTurret.visible=false; group.add(crewTurret);
  const flameResources = createFlameResources({loadTexture: loadFlameTexture});
  const flameScorch = createFlameScorch({resources: flameResources});
  const flameLighting = createFlameLighting();
  group.add(flameScorch.group, flameLighting.group);
  const cinderGear = SIGNATURE_GEAR.cinder;
  function flameView(name, options) {
    const view = createFlameView({resources: flameResources, ...options});
    view.group.name = name; group.add(view.group); return view;
  }
  const crewFlame = flameView('crew-flamer', {range: cinderGear.range, halfAngle: cinderGear.cone / 2});
  const cpuGearViews = Array.from({length: 12}, (_, index) => {
    const turret = crewTurret.clone(true);
    const flame = flameView(`cpu-crew-flamer-${index}`, {range: cinderGear.range, halfAngle: cinderGear.cone / 2});
    turret.name = `cpu-crew-turret-${index}`; turret.visible = false; group.add(turret);
    return {turret, head: turret.children[1], flame};
  });
  const arsenalFlames = Array.from({length: 12}, (_, index) => flameView(`arsenal-flame-${index}`,
    {range: FLAME_RULES.range, halfAngle: FLAME_RULES.halfConeRadians}));
  const burningCars = Array.from({length: 13}, (_, index) => flameView(`burning-car-${index}`, {body: true}));
  const flameLightSources = [];
  let flameScorchTimes = new WeakMap();
  let flameRaceState = null;
  function presentFlame(view, {active, at, heading = 0, seconds, camera, quality, age,
    range = FLAME_RULES.range, coneHalfAngle, body = false}, duel) {
    if (active) {
      view.group.position.set(at.x, at.y, at.z); view.group.rotation.set(0, heading, 0);
    }
    view.update({active, seconds, camera, quality, age, coneHalfAngle});
    if (!active) {flameScorchTimes.delete(view); return;}
    const center = body ? 0 : range * .45;
    const x = at.x + Math.sin(heading) * center, z = at.z + Math.cos(heading) * center;
    flameLightSources.push({x, y: at.y, z, range, body});
    const last = flameScorchTimes.get(view) ?? -Infinity;
    if (seconds - last >= .24) {
      const nearest = duel.course.nearest?.(x, z);
      const ground = nearest ? duel.course.groundAt(nearest.s, nearest.lateral) : at;
      flameScorch.stamp({x, y: ground.y, z, heading, size: body ? 1.1 : range * .32}, seconds);
      flameScorchTimes.set(view, seconds);
    }
  }
  const arsenalMagnets = Array.from({length: 12}, (_, index) => {
    const view = new THREE.Mesh(ring, materials.neon);
    view.name = `arsenal-magnet-${index}`;
    view.rotation.x = Math.PI / 2;
    view.visible = false;
    group.add(view);
    return view;
  });
  const mortarRingGeometry = new THREE.RingGeometry(.86, 1, 48);
  const mortarRingMaterial = new THREE.MeshBasicMaterial({color: 0xff3020,
    transparent: true, opacity: .85, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2});
  const mortarViews = Array.from({length: 24}, (_, index) => {
    const marker = new THREE.Mesh(mortarRingGeometry, mortarRingMaterial);
    marker.name = `arsenal-mortar-ring-${index}`;
    marker.rotation.x = -Math.PI / 2;
    marker.visible = false;
    const shell = new THREE.Mesh(rocketBody, materials.iron);
    shell.name = `arsenal-mortar-shell-${index}`;
    shell.visible = false;
    group.add(marker, shell);
    return {marker, shell};
  });
  const teslaMaterial = new THREE.LineBasicMaterial({color: 0xa8ebff,
    transparent: true, opacity: .9, depthWrite: false, toneMapped: false});
  const teslaPulseMaterial = new THREE.MeshBasicMaterial({color: 0x76dfff,
    transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide,
    toneMapped: false});
  const teslaViews = Array.from({length: 12}, (_, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12 * 6), 3));
    geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    const arcs = new THREE.LineSegments(geometry, teslaMaterial);
    arcs.name = `arsenal-tesla-charge-${index}`;
    arcs.frustumCulled = false;
    const pulse = new THREE.Mesh(mortarRingGeometry, teslaPulseMaterial);
    pulse.name = `arsenal-tesla-pulse-${index}`;
    pulse.rotation.x = -Math.PI / 2;
    arcs.visible = pulse.visible = false;
    group.add(arcs, pulse);
    return {arcs, pulse};
  });
  function updateWaveThree(duel, active) {
    const combat = duel.state.combat, enabled = active && arsenalEnabled(duel);
    mortarViews.forEach((view, index) => {
      const shell = enabled && combat.mortarShells?.[index];
      view.marker.visible = view.shell.visible = !!shell;
      if (!shell) return;
      view.marker.position.set(shell.x, shell.y + .08, shell.z);
      view.marker.scale.setScalar(shell.radius);
      const part = Math.min(1, shell.age / shell.lifetime);
      view.shell.position.set(shell.from.x + (shell.x - shell.from.x) * part,
        shell.from.y + (shell.y - shell.from.y) * part + 16 * part * (1 - part),
        shell.from.z + (shell.z - shell.from.z) * part);
      view.shell.rotation.set(0, Math.atan2(shell.x - shell.from.x, shell.z - shell.from.z),
        Math.PI / 2 - Math.atan2(16 * (1 - 2 * part) + shell.y - shell.from.y,
          Math.hypot(shell.x - shell.from.x, shell.z - shell.from.z)));
    });
    teslaViews.forEach((view, index) => {
      const charge = enabled && combat.teslaCharges?.[index];
      const owner = charge && actorForTarget(duel, charge.ownerId);
      view.arcs.visible = !!owner;
      if (owner) {
        const at = teslaChargePoint(duel,charge,owner), positions = view.arcs.geometry.attributes.position;
        view.arcs.scale.setScalar(charge.crewShock ? .55 : 1);
        view.arcs.position.set(at.x, at.y + .5, at.z);
        for (let arc = 0; arc < 12; arc++) {
          const angle = arc * Math.PI / 6 + charge.age * 11;
          const length = 2.1 + .8 * Math.sin(charge.age * 80 + arc * 3);
          positions.setXYZ(arc * 2, Math.sin(angle) * .6, 0, Math.cos(angle) * .6);
          positions.setXYZ(arc * 2 + 1, Math.sin(angle) * length,
            .5 * Math.sin(charge.age * 55 + arc), Math.cos(angle) * length);
        }
        positions.needsUpdate = true;
      }
      const pulse = enabled && combat.teslaPulses?.[index];
      view.pulse.visible = !!pulse;
      if (pulse) {
        view.pulse.position.set(pulse.x, pulse.y - COMBAT_TUNING.pointHeight + .1, pulse.z);
        view.pulse.scale.setScalar(pulse.radius * Math.min(1, .15 + pulse.age / pulse.lifetime));
      }
    });
  }
  const boardingCharge = new THREE.Group();
  boardingCharge.name = 'crew-boarding-charge';
  const chargeBase = new THREE.Mesh(new THREE.BoxGeometry(.55,.18,.65), materials.iron);
  const chargeLamp = new THREE.Mesh(sphere, materials.fire);
  chargeLamp.name = 'crew-boarding-charge-lamp';
  chargeLamp.position.y = .18;
  chargeLamp.scale.setScalar(.14);
  boardingCharge.add(chargeBase, chargeLamp);
  boardingCharge.visible = false;
  group.add(boardingCharge);
  const bursts=Array.from({
    length:32
  },()=>{
    const g=new THREE.Group(),flame=new THREE.Mesh(sphere,materials.fire),smoke=new THREE.Mesh(sphere,materials.smoke),wave=new THREE.Mesh(ring,materials.fire),saucer=new THREE.Mesh(sphere,materials.neon);
    wave.rotation.x=Math.PI/2;
    saucer.scale.set(5,1,5);
    g.add(flame,smoke,wave,saucer);
    const shards=Array.from({
      length:6
    },()=>{
      const m=new THREE.Mesh(sphere,materials.iron);
      g.add(m);
      return m;
    });
    group.add(g);
    return {
      g,flame,smoke,wave,saucer,shards
    };
  });
  const armorGeometry=new THREE.BoxGeometry(1,1,1);
  const pickupColors={
    ufo:0x64ffce,bomb:0xff8c16,crossbow:0x6cbcff,star:0xffe16b,armor:0x62ff8d
  };
  const pickupMaterials=Object.fromEntries(Object.entries(pickupColors).map(([key,color])=>[key,new THREE.MeshBasicMaterial({
    color
  })]));
  const pickups=Array.from({
    length:6
  },(_,index)=>{
    const g=new THREE.Group(),box=new THREE.Mesh(armorGeometry,materials.gold),halo=new THREE.Mesh(ring,materials.gold);
    g.name=`combat-pickup-${index}`;
    const armorCross=new THREE.Group();
    const crossBar=new THREE.Mesh(armorGeometry,pickupMaterials.armor),crossStem=new THREE.Mesh(armorGeometry,pickupMaterials.armor);
    crossBar.scale.set(2.2,.48,.55);
    crossStem.scale.set(.48,2.2,.55);
    armorCross.add(crossBar,crossStem);
    const weaponTip=new THREE.Mesh(tip,materials.tip);
    weaponTip.name='seeded-weapon-tip';
    weaponTip.position.y=1.45;
    box.scale.setScalar(1.8);
    halo.scale.setScalar(2.3);
    g.add(box,halo,armorCross,weaponTip);
    group.add(g);
    return {
      g,box,halo,armorCross,weaponTip
    };
  });
  const rigs = [0, 1, 2, 3].map(index => {
    const bumper = new THREE.Group();
    bumper.name = `combat-bumper-${index}`;
    const bar = new THREE.Mesh(armorGeometry, materials.iron);
    bumper.add(bar);
    const spikes = Array.from({
      length: 5
    }, () => {
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
    return {
      bumper, bar, spikes, bow, shield, ball, halo
    };
  });
  const bindings = [null, null, null, null];
  const armorKits = createArmorKitMeshes(attachments);
  group.add(armorKits.group);
  function rigMounts(index, rig) {
    return [
    {
      owner: `combat-bumper-${index}`, socket: 'front', object: rig.bumper
    },
    {
      owner: `combat-bow-${index}`, socket: 'roof', object: rig.bow
    },
    {
      owner: `combat-shield-${index}`, socket: 'shield', object: rig.shield
    },
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
    for (const mount of mounts) attachments.attach({
      ...mount, vehicle, fallback: group
    });
    const {
      width, length, height
    } = vehicle.userData.size;
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
    armorKits.detachVehicle(vehicle);
    for (let index = 0; index < bindings.length; index++) {
      if (bindings[index] === vehicle) bindVehicle(index, null);
    }
  }
  const fighterRoster = new Array(12).fill(null);
  const localFighterEntry = {
    fighter:null, local:true, input:null, weapons:null, presentation:null
  };
  const raiderEntries = Array.from({
    length:12
  }, () => ({
    fighter:null,
    knockdownDuration:COMBAT_TUNING.raider.knockdownSeconds
  }));
  const cpuEntries = Array.from({length: 12}, () => ({fighter: null,
    knockdownDuration: 3, input: {aim: true}, weapons: {}, presentation: null}));
  const fighterOptions = {
    active:false, enabled:false, time:0
  };
  function update(duel, vehicles = {
  }, useAtlas = false){
    const s = duel.state, c = s.combat;
    const active = !!c && s.status !== 'menu';
    group.visible = active;
    const flameSeconds = s.stageTimeSec || 0;
    if (flameRaceState !== s) {
      flameRaceState = s;
      flameScorch.reset();
      flameScorchTimes = new WeakMap();
    }
    flameLightSources.length = 0;
    flameLighting.update(flameLightSources, flameSeconds);
    updateHazards(duel,active,vehicles);
    updateTethers(duel,active);
    updateWaveThree(duel, active);
    const departed = s.footPresentation;
    const showDeparted = !s.onFoot && departed &&
    s.stageTimeSec >= departed.presentation.startedAt &&
    s.stageTimeSec < departed.presentation.startedAt + departed.presentation.duration;
    const showFighter=active&&s.mode==='wasteland'&&
    wastelandRulesActive(s)&&((s.onFoot&&!!s.fighter)||showDeparted);
    let fighterCount = 0;
    const fighterCapacity = showFighter ? 11 : 12;
    if (active && duel.featureFlags?.enabled('cpu-crews') === true) {
      for (const actor of s.opponents || []) {
        const crew = actor.cpuCrew;
        const departed = crew?.departed;
        const showReturn = departed && s.stageTimeSec >= departed.presentation.startedAt &&
          s.stageTimeSec < departed.presentation.startedAt + departed.presentation.duration;
        const fighter = crew?.fighter || showReturn && departed.fighter;
        if (!fighter || fighterCount >= fighterCapacity) continue;
        const entry = cpuEntries[fighterCount];
        entry.fighter = fighter;
        entry.presentation = crew.fighter ? fighter.presentation : departed.presentation;
        Object.assign(entry.weapons, {selected: fighter.repairing ? 'wrench' : 'rpg',
          repairing: !!fighter.repairing, repairSeconds: crew.repairSeconds,
          serial: crew.serial, lastFireAt: crew.lastFireAt, nextFireAt: crew.nextFireAt});
        fighterRoster[fighterCount++] = entry;
      }
    }
    if (active && s.raids) {
      for (let zoneIndex = 0; zoneIndex < s.raids.zones.length && fighterCount < fighterCapacity; zoneIndex++) {
        const raiders = s.raids.zones[zoneIndex].raiders;
        for (let index = 0; index < raiders.length && fighterCount < fighterCapacity; index++) {
          const entry = raiderEntries[fighterCount];
          entry.fighter = raiders[index];
          fighterRoster[fighterCount++] = entry;
        }
      }
    }
    if (showFighter) {
      localFighterEntry.fighter = showDeparted ? departed.fighter : s.fighter;
      localFighterEntry.presentation = showDeparted ? departed.presentation : s.fighter.presentation;
      localFighterEntry.input = s.fighterInput;
      localFighterEntry.weapons = showDeparted ? null : s.footWeapons;
      fighterRoster[fighterCount++] = localFighterEntry;
    }
    for (let index = fighterCount; index < fighterRoster.length; index++) fighterRoster[index] = null;
    fighterOptions.active = fighterCount > 0;
    fighterOptions.enabled = s.mode === 'wasteland' && wastelandRulesActive(s);
    fighterOptions.time = s.stageTimeSec ?? 0;
    fighterOptions.cameraPosition = vehicles.camera?.position || null;
    onFootFigures.update(fighterRoster, fighterOptions);
    raiderMarkers.update(duel);
    salvageMarkers.update(duel);
    rigs.forEach((rig, index) => {
      const actor = index ? index === 1 ? s.opponents?.[0] ?? s.rival : s.opponents?.[index-1] : s;
      const vehicle = index ? index === 1 ? vehicles.rival : vehicles.extraOpponents?.[index-2]?.mesh : vehicles.player;
      bindVehicle(index, vehicle);
      const visible = active && !!actor && !actor.crushed && !!vehicle;
      rig.bumper.visible = visible;
      // An explicit disabled bumper removes the spike advantage and its teeth
      // in the flagged combat rules. Existing Wasteland rigs remain unchanged.
      const spikesVisible = !(s.mode === 'wasteland' && wastelandRulesActive(s) &&
      actor?.combatBumperSpikes === false);
      rig.spikes.forEach(spike => {
        const nitro = active && arsenalEnabled(duel) && carEffect(actor, 'nitro');
        spike.visible = spikesVisible || !!nitro;
        spike.scale.y = nitro ? 2.4 : 1;
      });
      rig.bow.visible = visible;
      rig.shield.visible = visible && (index ? index === 1 ? c.rivalShield : actor.combatShield : c.shield) > 0;
      if (rig.shield.visible) rig.shield.rotation.y = s.stageTimeSec * 2;
    });
    armorKits.update(duel, vehicles, useAtlas);
    if (!active) return;
    pickups.forEach(({
      g,box,halo,armorCross,weaponTip
    },i)=>{
      const p=c.pickups[i];
      g.visible=!!p;
      if(!p)return;
      const at=duel.course.groundAt(p.s,p.lateral??0);
      g.position.set(at.x,at.y+2+Math.sin(p.age*3)*.4,at.z);
      const repair=p.kind==='armor';
      box.visible=!repair;
      armorCross.visible=repair;
      weaponTip.visible=p.kind==='weapon';
      box.material=pickupMaterials[p.weapon]||pickupMaterials.armor;
      weaponTip.material=box.material;
      halo.material=repair?pickupMaterials.armor:materials.gold;
      box.rotation.set(p.age,p.age*1.5,0);
      armorCross.rotation.set(0,p.age*1.5,0);
      halo.rotation.set(Math.PI/2,p.age,0);
    });
    projectiles.forEach(({
      g,bomb,arrow,rocket
    },i)=>{
      const p=c.projectiles[i];
      g.visible=!!p;
      if(!p){rocket.visible=false;return;}
      g.position.set(p.x,p.y,p.z);
      bomb.visible=p.kind==='bomb'||(p.crewGearShot&&p.kind!=='marksman');
      arrow.visible=p.kind==='crossbow'||p.kind==='harpoon'||p.kind==='marksman';
      rocket.visible=p.kind==='rpg'||p.kind==='rocket-pod';
      rocket.scale.setScalar(p.kind==='rocket-pod'?.65:1);
      g.rotation.set(0,Math.atan2(p.vx,p.vz),0);
      rocket.rotation.x=Math.PI/2-Math.atan2(p.vy,Math.hypot(p.vx,p.vz));
      bomb.rotation.set(p.age*5,p.age*3,0);
    });
    const flameFrame = {seconds: flameSeconds, camera: vehicles.camera, quality: vehicles.quality || 'high'};
    arsenalFlames.forEach((view, index) => {
      const burst = arsenalEnabled(duel) && c.flameBursts?.[index];
      const owner = burst && actorForTarget(duel, burst.ownerId);
      const at = owner && point(duel, owner);
      presentFlame(view, {...flameFrame, active: !!owner, at,
        heading: at ? at.heading + (owner.headingError || 0) : 0, age: burst?.age}, duel);
    });
    arsenalMagnets.forEach((view, index) => {
      const magnet = arsenalEnabled(duel) && c.magnets?.[index];
      const owner = magnet && actorForTarget(duel, magnet.ownerId);
      view.visible = !!owner;
      if (!owner) return;
      const at = point(duel, owner);
      view.position.set(at.x, at.y + .25, at.z);
      view.scale.setScalar(6 + Math.sin(magnet.age * 6) * .8);
    });
    const turret=s.crewGear?.turret;
    crewTurret.visible=active&&duel.featureFlags?.enabled('crew-gear')===true&&!!turret;
    if(crewTurret.visible){
      crewTurret.position.set(turret.x,turret.y,turret.z);
      const target=turret.targetId?actorForTarget(duel,turret.targetId):null;
      if(target){const at=point(duel,target);turretHead.rotation.y=Math.atan2(at.x-turret.x,at.z-turret.z);}
      turretBase.rotation.y=s.stageTimeSec*.3;
    }
    const fighter=s.fighter;
    // The native hand-flamer test uses fighter x/z as its origin. Pitch narrows
    // its horizontal sector through the same projected direction cosine.
    const cinderCosine = Math.cos(cinderGear.cone / 2) / Math.max(1e-9, Math.cos(fighter?.pitch || 0));
    const cinderHalfAngle = Math.acos(Math.min(1, cinderCosine));
    presentFlame(crewFlame, {...flameFrame,
      active: active && duel.featureFlags?.enabled('crew-gear') === true &&
        s.onFoot && fighter?.flaming === true && cinderHalfAngle > 0,
      at: fighter && {x: fighter.x, y: fighter.y + .85, z: fighter.z},
      heading: fighter?.yaw, range: cinderGear.range, coneHalfAngle: cinderHalfAngle}, duel);
    cpuGearViews.forEach((view, index) => {
      const crew = s.opponents?.[index]?.cpuCrew;
      const enabled = active && duel.featureFlags?.enabled('cpu-crews') === true;
      const turret = enabled && crew?.turret, fighter = enabled && crew?.fighter;
      view.turret.visible = !!turret;
      if (turret) {
        view.turret.position.set(turret.x, turret.y, turret.z);
        const target = actorForTarget(duel, turret.targetId);
        if (target) {
          const at = target === s && s.onFoot && s.fighter || point(duel, target);
          view.head.rotation.y = Math.atan2(at.x - turret.x, at.z - turret.z);
        }
      }
      presentFlame(view.flame, {...flameFrame, active: fighter?.flaming === true,
        at: fighter && {x: fighter.x, y: fighter.y + .85, z: fighter.z},
        heading: fighter?.yaw, range: cinderGear.range}, duel);
    });
    burningCars.forEach((view, index) => {
      const actor = index ? s.opponents?.[index - 1] : s;
      const burn = arsenalEnabled(duel) && actor && carEffect(actor, 'burning');
      const at = burn && point(duel, actor);
      presentFlame(view, {...flameFrame, active: !!burn, at, body: true,
        heading: at ? at.heading + (actor.headingError || 0) : 0}, duel);
    });
    flameScorch.update(flameSeconds);
    flameLighting.update(flameLightSources, flameSeconds);
    const boarding = s.boarding;
    const chargeTarget = active && duel.featureFlags?.enabled('crew-gear') === true &&
      boarding?.phase === 'charge' ? actorForTarget(duel, boarding.targetId) : null;
    boardingCharge.visible = !!chargeTarget;
    if (chargeTarget) {
      const roof = duel.course.groundAt(chargeTarget.s, chargeTarget.lateral);
      boardingCharge.position.set(roof.x,
        roof.y + (chargeTarget.airHeight || 0) + duel._vehicleSpec(chargeTarget).height + .11,
        roof.z);
      boardingCharge.rotation.y = roof.heading + (chargeTarget.headingError || 0);
      chargeLamp.visible = Math.floor((s.stageTimeSec || 0) * 10) % 2 === 0;
    }
    bursts.forEach(({
      g,flame,smoke,wave,saucer,shards
    },i)=>{
      const b=c.bursts[i];
      g.visible=!!b&&!(useAtlas&&(b.kind==='blast'||b.kind==='spark'));
      if(!b)return;
      g.position.set(b.x,b.y,b.z);
      const warp=b.kind==='ufo',star=b.kind==='star',fade=Math.max(0,1-b.age/1.4),size=b.kind==='blast'?1:0.45;
      saucer.visible=warp;
      saucer.position.y=10+b.age*4;
      saucer.rotation.y=b.age*4;
      flame.visible=!warp&&!star;
      smoke.visible=flame.visible;
      flame.scale.setScalar((1+b.age*14)*fade*size);
      flame.rotation.set(b.age,b.age*3,0);
      smoke.position.y=b.age*5;
      smoke.scale.setScalar((2+b.age*10)*fade*size);
      wave.material=warp?materials.neon:star?materials.gold:materials.fire;
      wave.scale.setScalar((1+b.age*24)*fade);
      wave.position.y=warp?b.age*8:.1;
      shards.forEach((m,j)=>{
        m.visible=!warp&&!star;
        const a=j*Math.PI/3+b.id;
        m.position.set(Math.sin(a)*b.age*16,Math.max(0,b.age*12-b.age*b.age*9),Math.cos(a)*b.age*16);
        m.scale.set(.4*fade,.15*fade,.7*fade);
        m.rotation.set(b.age*5+j,b.age*3,0);
      });
    });
  }
  return {
    group,
    onFootFigures,
    update,
    detachVehicle,
    dispose(){
      onFootFigures.dispose();
      raiderMarkers.dispose();
      salvageMarkers.dispose();
      armorKits.dispose();
      for (const vehicle of [...bindings]) if (vehicle) detachVehicle(vehicle);
      rigs.forEach((rig, index) => rigMounts(index, rig).forEach(mount => attachments.detach(mount.owner)));
      for(const geometry of [oilGeometry,sphere,ring,shaft,tip,rocketBody,rocketNose,armorGeometry,shieldShell,shieldRim,
        turretBase.geometry,turretHead.geometry,turretBarrel.geometry,
        chargeBase.geometry])geometry.dispose();
      hazardViews.forEach(view=>{
        view.oilMaterial.dispose();
        view.smokeCloud.dispose();
        view.caltrops.dispose();
      });
      smokeHaze.geometry.dispose();
      smokeHazeMaterial.dispose();
      caltropsGeometry.dispose();
      caltropsMaterial.dispose();
      tetherViews.forEach(cable=>cable.geometry.dispose());
      tetherMaterial.dispose();
      Object.values({
        ...materials,...pickupMaterials
      }).forEach(material=>material.dispose());
      for (const view of [crewFlame, ...cpuGearViews.map(entry => entry.flame), ...arsenalFlames, ...burningCars]) view.dispose();
      flameScorch.dispose(); flameLighting.dispose(); flameResources.dispose();
      mortarRingGeometry.dispose();
      mortarRingMaterial.dispose();
      teslaViews.forEach(view => view.arcs.geometry.dispose());
      teslaMaterial.dispose();
      teslaPulseMaterial.dispose();
    },
  };
}
