import * as THREE from 'three';
import { CARS } from './config.js';
import { vehicleGroundPoint } from './vehicle-grounding.js';

// World-space pools: tire dust and gravel persist where contact occurred.
// One generated smoke sprite is shared by the fixed particle pool.
export function createDrivingEffects() {
  const group = new THREE.Group();
  group.name = 'Driving contact and impact effects';
  const count = 640, markCount = 320, chipCount = 28;
  const position = new Float32Array(count * 3), color = new Float32Array(count * 3);
  const size = new Float32Array(count), opacity = new Float32Array(count), kind = new Float32Array(count);
  const spin = new Float32Array(count);
  const velocity = new Float32Array(count * 3), life = new Float32Array(count), lifetime = new Float32Array(count);
  const floor = new Float32Array(count), initialSize = new Float32Array(count);
  const floorX = new Float32Array(count), floorZ = new Float32Array(count), floorSlopeX = new Float32Array(count), floorSlopeZ = new Float32Array(count), particleStrength = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  for (const [name, array, width] of [['position', position, 3], ['color', color, 3], ['particleSize', size, 1], ['particleAlpha', opacity, 1], ['particleKind', kind, 1], ['particleSpin',spin,1]]) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, width).setUsage(THREE.DynamicDrawUsage));
  }
  geometry.boundingSphere = new THREE.Sphere();
  const smokeTexture=typeof document==='undefined'?new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1):new THREE.TextureLoader().load('/assets/textures/tire-smoke.png');
  smokeTexture.colorSpace=THREE.SRGBColorSpace;if(smokeTexture.isDataTexture)smokeTexture.needsUpdate=true;
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, vertexColors: true,
    uniforms:{smokeTexture:{value:smokeTexture}},
    vertexShader: `attribute float particleSize; attribute float particleAlpha; attribute float particleKind;
      attribute float particleSpin; varying float vSpin;
      varying vec3 vColor; varying float vAlpha; varying float vKind;
      void main(){vColor=color;vAlpha=particleAlpha;vKind=particleKind;vSpin=particleSpin;
        vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
        gl_PointSize=clamp(particleSize*540./max(1.,-mv.z),1.,110.);}`,
    fragmentShader: `varying vec3 vColor;varying float vAlpha;varying float vKind;varying float vSpin;uniform sampler2D smokeTexture;
      void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);
        float mask=1.-smoothstep(.12,1.,r);
        if(vKind>.5)mask=1.-smoothstep(.64,1.,r);
        if(vKind>1.5)mask=exp(-dot(p*vec2(3.8,.8),p*vec2(3.8,.8)))*1.2;
        if(vKind>2.5&&vKind<3.5){vec2 uv=mat2(cos(vSpin),-sin(vSpin),sin(vSpin),cos(vSpin))*p*.5+.5;
          vec4 smoke=texture2D(smokeTexture,clamp(uv,0.0,1.0));
          mask=smoke.a*(.65+.35*smoke.r)*step(0.0,uv.x)*step(0.0,uv.y)*step(uv.x,1.0)*step(uv.y,1.0);}
        if(vKind>3.5&&vKind<4.5)mask=1.-smoothstep(.45,1.,length(p*vec2(.82,1.18)));
        if(vKind>4.5)mask=(1.-smoothstep(.32,1.,length(p*vec2(2.8,.58))))*(.72+.28*cos(p.x*13.));
        gl_FragColor=vec4(vColor,vAlpha*mask);if(gl_FragColor.a<.008)discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const particles = new THREE.Points(geometry, material);
  particles.renderOrder = 2;
  particles.visible=false;
  group.add(particles);

  const markGeometry = new THREE.PlaneGeometry(1, 1);
  const markAlpha = new Float32Array(markCount), markLife = new Float32Array(markCount), markDirt = new Float32Array(markCount), markMaxAlpha = new Float32Array(markCount);
  markGeometry.setAttribute('markAlpha', new THREE.InstancedBufferAttribute(markAlpha, 1).setUsage(THREE.DynamicDrawUsage));
  markGeometry.setAttribute('markDirt', new THREE.InstancedBufferAttribute(markDirt, 1).setUsage(THREE.DynamicDrawUsage));
  const markMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
    vertexShader: `attribute float markAlpha;attribute float markDirt;varying float vAlpha;varying float vDirt;varying vec2 vUv;
      void main(){vAlpha=markAlpha;vDirt=markDirt;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `varying float vAlpha;varying float vDirt;varying vec2 vUv;
      void main(){float edge=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);
        float grooves=.82+.18*sin(vUv.x*70.);
        float tread=.5+.5*smoothstep(.32,.5,fract(vUv.y*9.+abs(vUv.x-.5)*2.5));
        vec3 tint=mix(vec3(.035,.026,.02),vec3(.13,.08,.035),vDirt);
        gl_FragColor=vec4(tint,vAlpha*edge*mix(grooves,tread,vDirt));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  markMaterial.forceSinglePass = true;
  const marks = new THREE.InstancedMesh(markGeometry, markMaterial, markCount);
  marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // A small world-space pool can span behind the camera; disable instance culling
  // rather than risk marks vanishing when the original pool origin leaves view.
  marks.frustumCulled = false;
  marks.visible=false;
  group.add(marks);

  const chipGeometry = new THREE.TetrahedronGeometry(.12);
  const chipMaterial = new THREE.MeshStandardMaterial({ color: 0x383533, roughness: .76, metalness: .3 });
  const chips = new THREE.InstancedMesh(chipGeometry, chipMaterial, chipCount);
  chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  chips.frustumCulled = false;
  chips.visible=false;
  group.add(chips);
  const chipPosition = new Float32Array(chipCount * 3), chipVelocity = new Float32Array(chipCount * 3);
  const chipLife = new Float32Array(chipCount), chipFloor = new Float32Array(chipCount), chipFloorX = new Float32Array(chipCount), chipFloorZ = new Float32Array(chipCount), chipSlopeX = new Float32Array(chipCount), chipSlopeZ = new Float32Array(chipCount);
  const transform = new THREE.Object3D();
  const normal = new THREE.Vector3(), along = new THREE.Vector3(), across = new THREE.Vector3(), markAlong = new THREE.Vector3(), markAcross = new THREE.Vector3(), basis = new THREE.Matrix4();
  transform.scale.setScalar(0); transform.updateMatrix();
  for (let i = 0; i < markCount; i++) marks.setMatrixAt(i, transform.matrix);
  for (let i = 0; i < chipCount; i++) chips.setMatrixAt(i, transform.matrix);
  let cursor = 0, markCursor = 0, chipCursor = 0, previousImpact = 0;
  let dustBudget = 0, gravelBudget = 0, skidBudget = 0, smokeBudget=0,
    mudBudget=0,waterBudget=0,previousWaterDepth=0,previousX, previousZ;
  let previousAirborne = false, peakAirHeight = 0, previousCourse;
  let previousMarkContacts = null;
  let previousCrushSerial = 0;
  let liveParticles=0,liveMarks=0,liveChips=0,emitted=false,marksAdded=false,chipsAdded=false;

  function emit(x, y, z, vx, vy, vz, type, strength = 1, contact = null) {
    emitted=true;
    const i = cursor++ % count, n = i * 3;
    position[n] = x; position[n + 1] = y; position[n + 2] = z;
    velocity[n] = vx; velocity[n + 1] = vy; velocity[n + 2] = vz;
    floor[i] = contact?.y ?? y - .09; floorX[i] = contact?.x ?? x; floorZ[i] = contact?.z ?? z;
    floorSlopeX[i] = contact?.slopeX || 0; floorSlopeZ[i] = contact?.slopeZ || 0;
    particleStrength[i] = strength; kind[i] = type;spin[i]=Math.random()*Math.PI*2;
    lifetime[i] = type === 0 || type===3 ? 1.0 + Math.random() * .95 :
      type===4 ? .55+Math.random()*.65 : type===5 ? .38+Math.random()*.48 :
      type === 1 ? .45 + Math.random() * .55 : .23 + Math.random() * .48;
    life[i] = lifetime[i];
    initialSize[i] = type === 0 || type===3 ? .65 + Math.random() * .7 :
      type===4 ? .13+Math.random()*.22 : type===5 ? .65+Math.random()*.65 :
      type === 1 ? .055 + Math.random() * .075 : .1 + Math.random() * .2;
    const shade = .78 + Math.random() * .22;
    color[n] = (type === 2 ? 3.4 : type === 1 ? .45 : .72) * shade;
    color[n + 1] = (type === 2 ? 1.8 : type === 1 ? .31 : .49) * shade;
    color[n + 2] = (type === 2 ? .32 : type === 1 ? .18 : .28) * shade;
    if(type===3){color[n]=.72*shade;color[n+1]=.75*shade;color[n+2]=.78*shade;}
    if(type===4){color[n]=.19*shade;color[n+1]=.105*shade;color[n+2]=.045*shade;}
    if(type===5){color[n]=.75*shade;color[n+1]=.92*shade;color[n+2]=1.0*shade;}
    opacity[i] = type === 0 ? .28 * strength : .95;
  }

  function update({ p, state, dt, now = 0, course = null }) {
    if (!(dt > 0) || !p || !state) return;
    dt = Math.min(dt, .06);
    emitted=false;marksAdded=false;chipsAdded=false;
    const activeDrive = !state.status || state.status === 'racing' ||
      state.status === 'exploring' && state.muddyHollowDeparture?.departed === true;
    const speed = Math.abs(state.speedMph || 0), direction = state.speedMph < 0 ? -1 : 1, moving = speed > 9 && activeDrive;
    const heading = (p.heading || 0) + (state.headingError || 0) + (state.slipAngle || 0);
    const fx = Math.sin(heading), fz = Math.cos(heading), rx = Math.cos(heading), rz = -Math.sin(heading);
    const ground = Number.isFinite(state.groundHeight)?state.groundHeight:p.y || 0, vehicle = CARS[state.car] || {}, monster = vehicle.kind === 'monster', rally = vehicle.kind === 'rally';
    const roughness = Math.max(monster ? .65 : .2, state.roughness || 0);
    const airborne = !!state.airborne || !!state.tumble || (state.airHeight || 0) > .08;
    const dirt = !!state.offRoad || !!course?.def.arena || !!course?.def.offroad;
    const surfaceMud=Math.max(0,Math.min(1,Number(state.surfaceMud)||0));
    const waterDepth=Math.max(0,Math.min(1,Number(state.waterDepth)||0));
    const wheelTrack = monster ? 1.32 : rally ? .89 : 1, rearAxle = monster ? 1.5 : rally ? 1.25 : 1.4;
    const impact = state.impactTimer || 0;
    const teleported = previousCourse !== course || previousX !== undefined && Math.hypot(p.x - previousX, p.z - previousZ) > 45;
    if (teleported) { life.fill(0); markLife.fill(0); chipLife.fill(0); dustBudget = gravelBudget = skidBudget = smokeBudget = mudBudget = waterBudget = 0; previousWaterDepth=waterDepth; previousMarkContacts=null; previousAirborne = false; peakAirHeight = 0; previousImpact = 0; previousCrushSerial = state.crushBurst?.serial || 0; }
    previousCourse = course;
    previousX = p.x; previousZ = p.z;

    const roadFrame = course?.at(state.s || 0);
    const surfacePoint = (distance, lateral) => {
      const point = vehicleGroundPoint(course, distance, lateral), surface = course.surfaceAt(distance, lateral);
      // Follow the same visible surface as the tires, including flattened
      // shortcut joins. Decals need only a small lift to avoid depth flicker.
      return { x: point.x, y: point.y + (surface.road ? .009 : .026), z: point.z };
    };
    const roadContactAt = (distance, lateral) => {
      const center = surfacePoint(distance, lateral), front = surfacePoint(distance + .4, lateral), back = surfacePoint(distance - .4, lateral);
      const right = surfacePoint(distance, lateral + .4), left = surfacePoint(distance, lateral - .4);
      along.set(front.x - back.x, front.y - back.y, front.z - back.z);
      across.set(right.x - left.x, right.y - left.y, right.z - left.z);
      normal.crossVectors(along, across).normalize(); if (normal.y < 0) normal.negate();
      return { ...center, nx: normal.x, ny: normal.y, nz: normal.z, slopeX: -normal.x / Math.max(.2, normal.y), slopeZ: -normal.z / Math.max(.2, normal.y) };
    };
    const contactAt = (dx, dz) => {
      if(Number.isFinite(state.groundHeight)){
        const along=state.tumble?0:Math.tan(state.terrainPitch||0),across=state.tumble?0:Math.tan(state.terrainRoll||0),slopeX=fx*along+rx*across,slopeZ=fz*along+rz*across,length=Math.hypot(slopeX,1,slopeZ);
        return{x:p.x+dx,y:ground+dx*slopeX+dz*slopeZ+.04,z:p.z+dz,nx:-slopeX/length,ny:1/length,nz:-slopeZ/length,slopeX,slopeZ};
      }
      if (!course?.groundAt || !roadFrame) return { x: p.x + dx, y: ground + .04, z: p.z + dz, nx: 0, ny: 1, nz: 0, slopeX: 0, slopeZ: 0 };
      const cs = Math.cos(roadFrame.heading), sn = Math.sin(roadFrame.heading);
      const distance = (state.s || 0) + (dx * sn + dz * cs) / Math.max(.25, 1 - roadFrame.curvature * (state.lateral || 0));
      const lateral = (state.lateral || 0) + dx * cs - dz * sn;
      return roadContactAt(distance, lateral);
    };
    // Sample tire planes only when an emitter or mark can use them. Clean
    // paved driving needs none; existing particles retain their cached planes.
    // Landing, crush and impact bursts sample their own contact below.
    const braking = Number((state.gear===-1?state.input?.throttle:state.input?.brake) || 0) > .2;
    const sliding = !!state.drifting || (Math.abs(state.slipAngle || 0) > .075);
    let contacts = moving && !airborne && (dirt || braking || sliding || impact > .1) ? [-1, 1].map(side => contactAt(-fx * rearAxle + rx * side * wheelTrack, -fz * rearAxle + rz * side * wheelTrack)) : [];
    if(!contacts.length&&moving&&!airborne&&(surfaceMud>0||waterDepth>0))
      contacts=[-1,1].map(side=>contactAt(-fx*rearAxle+rx*side*wheelTrack,-fz*rearAxle+rz*side*wheelTrack));
    if (airborne) peakAirHeight = Math.max(peakAirHeight, state.airHeight || 0);
    if (previousAirborne && !airborne && activeDrive && !teleported) {
      const contact = contactAt(0, 0), power = Math.min(1, .3 + peakAirHeight * .16), amount = Math.round((monster ? 65 : 40) * power);
      for (let i = 0; i < amount; i++) {
        const angle = i / amount * Math.PI * 2 + Math.random() * .2, radius = .7 + Math.random() * 1.3, vx = Math.cos(angle), vz = Math.sin(angle);
        const x = contact.x + vx * radius, z = contact.z + vz * radius;
        const y = contact.y + (x - contact.x) * contact.slopeX + (z - contact.z) * contact.slopeZ;
        emit(x, y + .09, z, vx * (3 + power * 4), .8 + Math.random() * 1.8, vz * (3 + power * 4), i % 5 ? 0 : 1, power, contact);
      }
      peakAirHeight = 0;
    }
    previousAirborne = airborne;

    const crush = state.crushBurst;
    if (crush && crush.serial !== previousCrushSerial) {
      previousCrushSerial = crush.serial;
      if (activeDrive && Math.hypot(crush.x - p.x, crush.z - p.z) < 180) {
        const contact = course?.groundAt ? roadContactAt(crush.s, crush.off) : contactAt(crush.x - p.x, crush.z - p.z);
        const power = Math.max(.35, Math.min(1, crush.strength || .5));
        for (let n = 0; n < 32 + power * 35; n++) {
          const angle = Math.random() * Math.PI * 2, vx = Math.cos(angle), vz = Math.sin(angle), radius = Math.random() * 1.5;
          emit(crush.x + vx * radius, contact.y + .3, crush.z + vz * radius,
            vx * (2 + Math.random() * 5), 1 + Math.random() * 3, vz * (2 + Math.random() * 5), n % 7 === 0 ? 2 : 0, power, contact);
        }
        for (let n = 0; n < 6 + power * 6; n++) {
          chipsAdded=true;
          const i = chipCursor++ % chipCount, j = i * 3;
          chipLife[i] = 1.8; chipFloor[i] = contact.y + .035; chipFloorX[i] = contact.x; chipFloorZ[i] = contact.z; chipSlopeX[i] = contact.slopeX; chipSlopeZ[i] = contact.slopeZ;
          chipPosition[j] = crush.x; chipPosition[j + 1] = contact.y + .65; chipPosition[j + 2] = crush.z;
          chipVelocity[j] = (Math.random() - .5) * 8; chipVelocity[j + 1] = 2 + Math.random() * 4; chipVelocity[j + 2] = (Math.random() - .5) * 8;
        }
      }
    }

    if (dirt && moving && !airborne) {
      const tireScale = monster ? 1.8 : rally ? 1.3 : 1;
      dustBudget += dt * Math.min(85, 16 + speed * .3) * roughness * tireScale;
      gravelBudget += dt * Math.min(70, speed * .37) * roughness * tireScale;
      while (dustBudget >= 1) {
        dustBudget--;
        const contact = contacts[Math.random() < .5 ? 0 : 1];
        emit(contact.x, contact.y + .1, contact.z,
          -fx * direction * 1.8 + rx * (Math.random() - .5) * 2.6, .8 + Math.random() * .8,
          -fz * direction * 1.8 + rz * (Math.random() - .5) * 2.6, 0, monster ? 1.3 : 1, contact);
      }
      while (gravelBudget >= 1) {
        gravelBudget--;
        const side = Math.random() < .5 ? -1 : 1, scatter = side * (1.5 + Math.random() * 3), contact = contacts[side < 0 ? 0 : 1];
        emit(contact.x, contact.y + .12, contact.z,
          -fx * direction * (3 + speed * .035) + rx * scatter, 1.8 + Math.random() * 3,
          -fz * direction * (3 + speed * .035) + rz * scatter, 1, 1, contact);
      }
    } else { dustBudget = 0; gravelBudget = 0; }

    if(moving&&!airborne&&contacts.length&&surfaceMud>0){
      const spin=Math.max(.35,Math.min(2,Number(state.mudWheelSpin)||1));
      mudBudget+=dt*(10+speed*.42)*surfaceMud*spin*(monster?1.55:1);
      while(mudBudget>=1){
        mudBudget--;
        const side=cursor%2,contact=contacts[side];
        emit(contact.x,contact.y+.16,contact.z,
          -fx*direction*(2.4+speed*.028)+rx*(side?1:-1)*(1.2+Math.random()*2.4),
          1.2+Math.random()*3.6,
          -fz*direction*(2.4+speed*.028)+rz*(side?1:-1)*(1.2+Math.random()*2.4),
          4,.55+surfaceMud*.55,contact);
      }
    }else mudBudget=0;

    const enteredWater=waterDepth>=.05&&previousWaterDepth<.05;
    if(moving&&!airborne&&contacts.length&&waterDepth>=.05){
      waterBudget+=dt*(8+speed*.32)*waterDepth*(monster?1.45:1);
      const burst=enteredWater?Math.round(12+Math.min(28,speed*.28)*waterDepth):0;
      for(let n=0;n<burst;n++){
        const side=n%2,contact=contacts[side],spread=(Math.random()-.5)*(5+waterDepth*6);
        emit(contact.x,contact.y+.2,contact.z,
          fx*direction*(1+speed*.018)+rx*spread,2.5+Math.random()*(4+waterDepth*5),
          fz*direction*(1+speed*.018)+rz*spread,5,.65+waterDepth*.5,contact);
      }
      while(waterBudget>=1){
        waterBudget--;
        const side=cursor%2,contact=contacts[side],spray=(side?1:-1)*(1.8+Math.random()*2.8);
        emit(contact.x,contact.y+.15,contact.z,
          -fx*direction*(1.2+speed*.02)+rx*spray,1.5+Math.random()*3.2,
          -fz*direction*(1.2+speed*.02)+rz*spray,5,.45+waterDepth*.55,contact);
      }
    }else waterBudget=0;
    previousWaterDepth=airborne?0:waterDepth;

    if (impact > previousImpact + .12) {
      const power = Math.max(.25, Math.min(1, state.impactStrength || .5)), side = state.impactSide || 1;
      const x = p.x + rx * side, z = p.z + rz * side;
      const contact = contactAt(rx * side, rz * side), bodyHeight = (state.airHeight || 0) + .45;
      for (let i = 0; i < 30 + power * 65; i++) {
        const spread = (Math.random() - .5) * (4 + power * 13);
        emit(x, ground + bodyHeight, z, -fx * direction * (3 + Math.random() * 12) + rx * spread,
          Math.random() * (4 + power * 4), -fz * direction * (3 + Math.random() * 12) + rz * spread, i % 5 === 0 ? 0 : 2, power, contact);
      }
      for (let n = 0; n < 7 + power * 9; n++) {
        chipsAdded=true;
        const i = chipCursor++ % chipCount, j = i * 3;
        chipLife[i] = 1.8; chipFloor[i] = contact.y + .035; chipFloorX[i] = contact.x; chipFloorZ[i] = contact.z; chipSlopeX[i] = contact.slopeX; chipSlopeZ[i] = contact.slopeZ;
        chipPosition[j] = x; chipPosition[j + 1] = ground + bodyHeight; chipPosition[j + 2] = z;
        chipVelocity[j] = -fx * direction * 5 + (Math.random() - .5) * 10;
        chipVelocity[j + 1] = 2 + Math.random() * 5;
        chipVelocity[j + 2] = -fz * direction * 5 + (Math.random() - .5) * 10;
      }
    }
    previousImpact = impact;

    if(activeDrive&&!dirt&&!airborne&&speed>40&&sliding&&contacts.length){
      const strength=Math.min(1,Math.max(.18,Math.abs(state.slipAngle||0)*2.8));
      const night=course?.def.timeOfDay==='night'||course?.themeAt(state.s||0)==='city';
      smokeBudget+=dt*(12+48*strength);
      while(smokeBudget>=1){smokeBudget--;const side=cursor%2,contact=contacts[side];
        emit(contact.x,contact.y+.12,contact.z,-fx*direction*1.4+rx*(side?1:-1)*.45,.5+strength*.4,-fz*direction*1.4+rz*(side?1:-1)*.45,3,strength*(night?.72:1),contact);
      }
    }else smokeBudget=0;
    if (activeDrive && !airborne && speed > (dirt ? 12 : 24) && (dirt || braking || sliding || impact > .1)) {
      skidBudget += dt;
      const interval = .045;
      if (skidBudget >= interval) {
        skidBudget %= interval;
        for (let side=0;side<contacts.length;side++) {
          const contact=contacts[side],previous=previousMarkContacts?.[side];
          const span=previous?Math.hypot(contact.x-previous.x,contact.y-previous.y,contact.z-previous.z):.4;
          if(span<.05)continue;
          const i = markCursor++ % markCount;
          marksAdded=true;
          markLife[i] = dirt ? 9 : 7; markDirt[i] = dirt ? 1 : 0; markMaxAlpha[i] = dirt ? monster ? .62 : .44 : .48;
          transform.position.set(previous?(contact.x+previous.x)/2:contact.x,previous?(contact.y+previous.y)/2:contact.y,previous?(contact.z+previous.z)/2:contact.z);
          normal.set(contact.nx, contact.ny, contact.nz);
          if(previous)markAlong.set(previous.x-contact.x,previous.y-contact.y,previous.z-contact.z);
          else markAlong.set(-fx*direction,0,-fz*direction);
          markAlong.addScaledVector(normal,-markAlong.dot(normal)).normalize();
          markAcross.crossVectors(markAlong, normal).normalize();
          basis.makeBasis(markAcross, markAlong, normal); transform.quaternion.setFromRotationMatrix(basis);
          // Join the real tire endpoints, including low frame rates and curves.
          // A small overlap hides seams without guessing travel from speed.
          transform.scale.set(monster ? .76 : rally && dirt ? .4 : .27,span+.06,1);
          transform.updateMatrix(); marks.setMatrixAt(i, transform.matrix);
        }
        previousMarkContacts=contacts;
      }
    } else {skidBudget = 0;previousMarkContacts=null;}

    // Empty pools neither upload buffers nor enter the draw list. Keep the
    // fixed storage for the next burst; paused frames and reuse allocate none.
    if(!liveParticles&&!liveMarks&&!liveChips&&!emitted&&!marksAdded&&!chipsAdded)return;
    if(liveParticles||emitted){
    liveParticles=0;
    let minX = p.x, maxX = p.x, minY = ground, maxY = ground, minZ = p.z, maxZ = p.z;
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) { opacity[i] = 0; size[i] = 0; continue; }
      life[i] -= dt;
      if(life[i]>0)liveParticles++;
      const n = i * 3, age = 1 - Math.max(0, life[i]) / lifetime[i], isDust = kind[i] === 0||kind[i]===3;
      velocity[n + 1] -= (isDust ? -.15 : 12) * dt;
      position[n] += velocity[n] * dt; position[n + 1] += velocity[n + 1] * dt; position[n + 2] += velocity[n + 2] * dt;
      const contactFloor = floor[i] + (position[n] - floorX[i]) * floorSlopeX[i] + (position[n + 2] - floorZ[i]) * floorSlopeZ[i];
      if (!isDust && position[n + 1] < contactFloor) { position[n + 1] = contactFloor; velocity[n + 1] = Math.abs(velocity[n + 1]) * .22; velocity[n] *= .6; velocity[n + 2] *= .6; }
      size[i] = initialSize[i] * (isDust ? 1 + age * 2.3 : 1);
      opacity[i] = (isDust ? .26 : .95) * particleStrength[i] * Math.pow(1 - age, isDust ? 1.3 : .6) * Math.min(1, (age + .05) * 8);
      minX = Math.min(minX, position[n]); maxX = Math.max(maxX, position[n]);
      minY = Math.min(minY, position[n + 1]); maxY = Math.max(maxY, position[n + 1]);
      minZ = Math.min(minZ, position[n + 2]); maxZ = Math.max(maxZ, position[n + 2]);
    }
    geometry.boundingSphere.center.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
    geometry.boundingSphere.radius = Math.hypot(maxX - minX, maxY - minY, maxZ - minZ) / 2 + 5;
    for(const name of ['position','particleSize','particleAlpha'])geometry.attributes[name].needsUpdate=true;
    if(emitted)for(const name of ['color','particleKind','particleSpin'])geometry.attributes[name].needsUpdate=true;
    particles.visible=liveParticles>0;
    }
    if(liveMarks||marksAdded){
    liveMarks=0;
    for (let i = 0; i < markCount; i++) { markLife[i] = Math.max(0, markLife[i] - dt); markAlpha[i] = Math.min(markMaxAlpha[i], markLife[i] * .2);if(markLife[i]>0)liveMarks++; }
    markGeometry.attributes.markAlpha.needsUpdate = true;
    if(marksAdded){markGeometry.attributes.markDirt.needsUpdate=true;marks.instanceMatrix.needsUpdate=true;}
    marks.visible=liveMarks>0;
    }
    if(liveChips||chipsAdded){
    liveChips=0;
    for (let i = 0; i < chipCount; i++) {
      chipLife[i] = Math.max(0, chipLife[i] - dt);
      const j = i * 3;
      if (chipLife[i] > 0) {
        liveChips++;
        chipVelocity[j + 1] -= 13 * dt;
        for (let axis = 0; axis < 3; axis++) chipPosition[j + axis] += chipVelocity[j + axis] * dt;
        const contactFloor = chipFloor[i] + (chipPosition[j] - chipFloorX[i]) * chipSlopeX[i] + (chipPosition[j + 2] - chipFloorZ[i]) * chipSlopeZ[i];
        if (chipPosition[j + 1] < contactFloor) { chipPosition[j + 1] = contactFloor; chipVelocity[j + 1] = Math.abs(chipVelocity[j + 1]) * .3; chipVelocity[j] *= .78; chipVelocity[j + 2] *= .78; }
        transform.position.set(chipPosition[j], chipPosition[j + 1], chipPosition[j + 2]);
        transform.rotation.set(now * (3 + i % 4), now * (i % 5 + 2), i);
        transform.scale.setScalar(Math.min(1, chipLife[i] * 3));
      } else transform.scale.setScalar(0);
      transform.updateMatrix(); chips.setMatrixAt(i, transform.matrix);
    }
    chips.instanceMatrix.needsUpdate = true;
    chips.visible=liveChips>0;
    }
  }

  return { group, update, dispose() {
    marks.dispose(); chips.dispose();
    geometry.dispose(); material.dispose(); smokeTexture.dispose(); markGeometry.dispose(); markMaterial.dispose();
    chipGeometry.dispose(); chipMaterial.dispose(); group.removeFromParent(); group.clear();
  } };
}
