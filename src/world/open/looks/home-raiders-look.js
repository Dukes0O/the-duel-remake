// HOME-GROUND-4: mounted Road Rats. The cage, exposed motor, staggered wheels and
// colours follow the parked Rats' Nest buggies. The trail bike follows the TC90 photo.
// The existing Road Rat figures sit on them. Every pose comes from the home rule.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, yardSurface} from '../../scablands-yard-look.js';
import {createStoryPeople} from '../../jobs/story-people.js';
import {createStoryPeopleView} from '../../story-people-view.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {scrapNoise} from '../../scrap-look.js';

// TC90 photo cropped from round-1: wheel centres (180,350)/(610,350), radius ~105 px;
// saddle y=200, tank y=150..225, steering head (510,205). +Z is forward.
// Rat repairs change the finish, not those proportions. All parts stay in one body draw.
function bikeSurface(dark = false) {
  const material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: .84,
    metalness: .12, color: dark ? 0x55504a : 0xffffff, side: THREE.DoubleSide});
  material.onBeforeCompile = shader => {
    shader.uniforms.bikeNoise = {value: scrapNoise()};
    shader.vertexShader = shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 bikePoint;').replace('#include <begin_vertex>',
      '#include <begin_vertex>\nbikePoint = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
      '#include <common>\nuniform sampler2D bikeNoise; varying vec3 bikePoint;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 grain = texture2D(bikeNoise, bikePoint.zy * 3.7 + bikePoint.x * .3).rgb;
        float wearPatch = texture2D(bikeNoise, bikePoint.zy * .8 + bikePoint.x).r;
        // The grey aluminium cases take grime, not the brown rust of painted steel.
        float metal = smoothstep(.025, .075, max(diffuseColor.r, diffuseColor.g) - diffuseColor.b);
        float rust = smoothstep(.53,.65,wearPatch + grain.g * .12) * metal;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.12,.048,.018), rust * .78);
        diffuseColor.rgb *= (.72 + .38 * grain.g) * (1.0 - .23 * smoothstep(.52,.68,wearPatch));
        diffuseColor.rgb *= 1.0 - .17 * smoothstep(.60,.72,grain.b);
      `);
  };
  material.customProgramCacheKey = () => 'home-bike-wear-1';
  return material;
}

function bikeTube(a, b, radius, sides = 7) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), along = to.clone().sub(from);
  return new THREE.CylinderGeometry(radius, radius, along.length(), sides, 1)
    .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize()))
    .translate(...from.add(to).multiplyScalar(.5).toArray());
}

// Closed rounded cross-sections: z, bottom, top, half-width. The side dent is in the skin.
function bikeShell(stations, dent = false) {
  const vertices = [], indices = [], sides = 12;
  stations.forEach(([z, bottom, top, width], row) => {
    for (let n = 0; n < sides; n++) {
      const a = n / sides * Math.PI * 2;
      const pinch = dent && row === 3 && n > 6 && n < 10 ? .77 : 1;
      vertices.push(Math.cos(a) * width * pinch, (top + bottom) / 2 + Math.sin(a) * (top - bottom) / 2, z);
      if (row) {
        const i = row * sides + n, j = row * sides + (n + 1) % sides;
        indices.push(i - sides, j, i, i - sides, j - sides, j);
      }
    }
  });
  for (let n = 1; n < sides - 1; n++) {
    indices.push(0, n + 1, n);
    const last = (stations.length - 1) * sides;
    indices.push(last, last + n, last + n + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function drawRaidBike(f, root, wheels, keep, rubber, rim) {
  const add = (geometry, color) => { f.add(geometry, color); geometry.dispose(); };
  const tube = (a, b, radius = .016, color = 0x343735) => add(bikeTube(a, b, radius), color);
  const round = (r, length, x, y, z, color, axis = 'x') => {
    const piece = new THREE.CylinderGeometry(r, r, length, 12);
    if (axis === 'x') piece.rotateZ(Math.PI / 2);
    if (axis === 'z') piece.rotateX(Math.PI / 2);
    add(piece.translate(x, y, z), color);
  };
  for (const [z, radius, width] of [[-.67, .31, .105], [.68, .33, .085]]) {
    const spin = new THREE.Group(); spin.position.set(0, radius, z); root.add(spin);
    const tyreParts = [new THREE.TorusGeometry(radius - .032, .032, 7, 40).rotateY(Math.PI / 2).scale(width / .064, 1, 1)];
    for (let n = 0; n < 40; n++) for (const side of [-1, 0, 1]) {
      const angle = (n + (side === 0 ? .45 : 0)) * Math.PI / 20;
      tyreParts.push(new THREE.BoxGeometry(width * .36, .017, .027).rotateY(side * .18)
        .translate(side * width * .32, radius - .001, 0).rotateX(angle));
    }
    const metalParts = [new THREE.CylinderGeometry(.061, .061, width * 1.12, 12).rotateZ(Math.PI / 2)];
    for (const side of [-1, 1]) {
      metalParts.push(new THREE.TorusGeometry(radius - .059, .009, 5, 40).rotateY(Math.PI / 2).translate(side * width * .28, 0, 0));
      for (let n = 0; n < 18; n++) {
        const a = (n + (side > 0 ? .5 : 0)) * Math.PI / 9, b = a + side * .32;
        metalParts.push(bikeTube([side * width * .46, Math.cos(a) * .05, Math.sin(a) * .05],
          [side * width * .22, Math.cos(b) * (radius - .06), Math.sin(b) * (radius - .06)], .0028, 4));
      }
    }
    for (const [parts, material] of [[tyreParts, rubber], [metalParts, rim]]) {
      spin.add(new THREE.Mesh(keep(mergeGeometries(parts, false)), material));
      parts.forEach(part => part.dispose());
    }
    wheels.push({spin, radius});
  }
  for (const side of [-1, 1]) {
    const x = side * .085;
    // Cradle, swing arm and seat stays leave daylight round the small motor.
    tube([x,.31,-.67],[x,.34,-.12],.019);
    tube([x,.34,-.12],[x,.78,-.28]); tube([x,.78,-.28],[x,.91,.36]);
    tube([x,.91,.36],[x,.35,.18]); tube([x,.35,.18],[x,.34,-.12]);
    tube([x,.78,-.28],[x,.77,-.68]); tube([x,.77,-.68],[x,.31,-.67]);
    tube([x,.76,-.57],[x,.31,-.67],.024,0x8c8d82);
    // Rear shock springs: separated rings, not a solid support plank.
    for (let n = 0; n < 9; n++) add(new THREE.TorusGeometry(.032,.006,4,9)
      .rotateX(Math.PI / 2 - .22).translate(x,.39+n*.034,-.652+n*.0075),0x555950);
    tube([side*.09,.33,.68],[side*.09,.72,.51],.023,0xa7aaa1);
    tube([side*.09,.70,.52],[side*.09,1.04,.38],.028,0x4a4d46);
    tube([side*.09,1.03,.38],[side*.09,1.12,.35],.014,0xa5aaa5);
    tube([0,1.12,.35],[side*.24,1.18,.29],.012,0x9a9d91);
    tube([side*.24,1.18,.29],[side*.36,1.16,.20],.016,0x252825);
    tube([0,.36,-.08],[side*.26,.36,-.08],.018,0x454943);
    tube([side*.19,.36,-.08],[side*.28,.36,-.08],.025,0x252521);
  }
  // Tank traced along its length, broad shoulders and a narrow rear against the saddle.
  add(bikeShell([[-.23,.79,.88,.045],[-.17,.77,.94,.12],[-.04,.77,1.015,.155],
    [.14,.78,1.055,.16],[.29,.80,1.025,.12],[.36,.83,.94,.045]],true),0x929e8c);
  round(.035,.017,0,1.057,.12,0xa7aaa0,'y');
  add(bikeShell([[-.80,.77,.82,.06],[-.72,.77,.875,.13],[-.59,.775,.845,.145],
    [-.45,.78,.825,.138],[-.32,.78,.84,.13],[-.19,.79,.865,.075]]),0x302b25);
  f.skin([[-.12,.85,-.71],[-.08,.86,-.57],[.09,.865,-.59],[.10,.881,-.72]],0x5b5142);
  // Two faded tape bindings over the worn saddle; their ends fold down its sides.
  for (const z of [-.62,-.37]) {
    f.box(.26,.009,.035,0,.842,z,0x89816a,{lean:.02});
    for (const side of [-1,1]) tube([side*.133,.838,z],[side*.138,.789,z],.012,0x81785f);
  }
  // Crankcase, round cover, inclined air-cooled barrel and separate cooling fins.
  add(new THREE.SphereGeometry(1,14,8).scale(.135,.135,.18).translate(0,.43,-.06),0x6b6b6b);
  round(.092,.035,-.139,.44,-.045,0x898989);
  round(.042,.012,-.163,.44,-.045,0x626262);
  for (let n = 0; n < 5; n++) {
    const a = n * Math.PI * 2 / 5;
    round(.009,.006,-.162,.44+Math.cos(a)*.072,-.045+Math.sin(a)*.072,0x484848);
  }
  tube([0,.51,.025],[0,.70,.07],.073,0x363636);
  for (let n=0;n<7;n++) add(new THREE.CylinderGeometry(.105,.11,.009,10)
    .scale(1.15,1,.95).rotateX(.23).translate(0,.56+n*.022,.04+n*.005),0x525252);
  add(new THREE.CylinderGeometry(.09,.10,.025,10).rotateX(.23).translate(0,.713,.077),0x676767);
  tube([0,.68,.075],[0,.73,.09],.014,0xb8b8a1);
  tube([-.035,.61,-.04],[-.035,.60,-.19],.035,0x3c3c3c);
  tube([-.035,.60,-.19],[-.02,.75,-.24],.025,0x272b25);
  // A salvaged pressed side cover stops short of the open lower cradle.
  for (const side of [-1, 1]) {
    f.skin([[side*.11,.75,-.53],[side*.11,.75,-.20],[side*.12,.55,-.28],[side*.12,.60,-.37]],0x79806d);
    round(.011,.006,side*.125,.67,-.33,0x464b40);
  }
  // Curved header and high muffler, with perforated heat shield.
  const exhaust = [[.11,.62,.11],[.15,.52,.24],[.17,.34,.20],[.18,.31,-.04],[.18,.46,-.34],[.18,.58,-.69]];
  for(let n=1;n<exhaust.length;n++) tube(exhaust[n-1],exhaust[n],n>3?.037:.021,0x554b3f);
  tube([.218,.50,-.37],[.218,.58,-.69],.045,0x828274);
  for(let n=0;n<6;n++) round(.013,.003,.264,.517+n*.01,-.40-n*.044,0x282b27);
  tube([-.16,.31,-.67],[-.16,.34,-.13],.01,0x4c5044);
  tube([-.16,.27,-.65],[-.16,.30,-.13],.009,0x4c5044);
  // Rolled mudguard strips follow the tyre arcs; front is dark replacement steel.
  for(const [z,radius,width,color,start,end] of [[-.67,.365,.135,0x92988c,-1.25,1.35],[.68,.389,.12,0x414a46,-.95,1.02]]) {
    const points=[], uv=[], indices=[];
    for(let n=0;n<=16;n++) for(let side=0;side<3;side++) {
      const a=start+(end-start)*n/16, crown=side===1?.009:0;
      points.push((side-1)*width/2,(z<0?.31:.33)+Math.cos(a)*(radius+crown),z+Math.sin(a)*(radius+crown));
      uv.push(side/2,n/16);
      if(n && side<2){const i=n*3+side;indices.push(i-3,i,i+1,i-3,i+1,i-2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,color);
  }
  round(.069,.09,0,1.015,.48,0x3c423c,'z');
  round(.059,.008,0,1.015,.529,0xb9b7a0,'z');
  tube([-.085,.88,.45],[.085,.88,.45],.018,0x777d72);
  // Small battered jerrycan on the rear rack, tied down with wire.
  for(const side of [-1,1]) tube([side*.12,.78,-.61],[side*.12,.81,-.90],.012,0x75796c);
  add(bikeShell([[-.94,.80,.99,.07],[-.91,.80,1.025,.105],[-.80,.80,1.02,.10],[-.77,.81,.99,.07]],true),0x625e41);
  for(const x of [-.045,.045]) tube([x,1.018,-.9],[x,1.055,-.85],.008,0x31392e);
  tube([-.045,1.055,-.85],[.045,1.055,-.85],.008,0x31392e);
  round(.018,.012,.055,1.025,-.90,0x424837,'y');
  for (const side of [-1, 1]) {
    tube([side*.104,.85,-.89],[side*.104,.96,-.82],.004,0x454b3c);
    tube([side*.104,.96,-.89],[side*.104,.85,-.82],.004,0x454b3c);
  }
  for(const x of [-.075,.075]) tube([x,.79,-.96],[x,1.03,-.8],.0035,0x8d8975);
  // Brake and throttle cables loop into real fittings, not into the sky.
  const cable = [[-.23,1.17,.29],[-.13,1.04,.37],[-.12,.86,.48],[-.10,.35,.68]];
  for(let n=1;n<cable.length;n++) tube(cable[n-1],cable[n],.004,0x242820);
}

const mountedJoints = new WeakMap();
// Fit the existing seated Rat to the bike's real grips and pegs. Only the skin moves.
function fitBikeRider(root, bike) {
  let joints = mountedJoints.get(root);
  if (!joints) {
    joints = {};
    root.traverse(node => {
      if (!node.isSkinnedMesh) return;
      for (const bone of node.skeleton.bones) joints[bone.name.replace(/_\d+$/, '').replace(/\./g, '')] = bone;
    });
    for (const side of ['L', 'R']) joints['handRest' + side] = joints['hand' + side]?.quaternion.clone();
    mountedJoints.set(root, joints);
  }
  // The shared seated pose resets arms and feet, but does not animate the wrists.
  // Start those from their bind rotations so the fit never accumulates frame to frame.
  for (const side of ['L', 'R']) if (joints['hand' + side]) joints['hand' + side].quaternion.copy(joints['handRest' + side]);
  root.updateMatrixWorld(true); bike.updateMatrixWorld(true);
  const point = bone => bone.getWorldPosition(new THREE.Vector3());
  const aim = (bone, end, target) => {
    const origin = point(bone), parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const turn = new THREE.Quaternion().setFromUnitVectors(point(end).sub(origin).normalize(), target.clone().sub(origin).normalize());
    bone.quaternion.premultiply(parent.clone().invert().multiply(turn).multiply(parent));
    bone.updateMatrixWorld(true);
  };
  const limb = (first, middle, last, target, bend) => {
    if (!first || !middle || !last) return;
    const a = point(first), b = point(middle), c = point(last);
    const upper = a.distanceTo(b), lower = b.distanceTo(c), ray = target.clone().sub(a);
    const distance = Math.min(ray.length(), upper + lower - .001);
    ray.normalize();
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    bend.addScaledVector(ray, -bend.dot(ray)).normalize();
    const elbow = a.clone().addScaledVector(ray, along).addScaledVector(bend, Math.sqrt(Math.max(0, upper * upper - along * along)));
    const endRotation = last.getWorldQuaternion(new THREE.Quaternion());
    aim(first, middle, elbow); aim(middle, last, target);
    // Keep the boot sole / palm's seated orientation after moving its joint.
    last.quaternion.copy(last.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(endRotation));
    last.updateMatrixWorld(true);
  };
  for (const [side, sign] of [['L', -1], ['R', 1]]) {
    limb(joints['upper_arm' + side], joints['forearm' + side], joints['hand' + side],
      bike.localToWorld(new THREE.Vector3(sign * .29, 1.18, .245)),
      new THREE.Vector3(sign * .3, -1, -.2).applyQuaternion(bike.quaternion));
    limb(joints['thigh' + side], joints['shin' + side], joints['foot' + side],
      bike.localToWorld(new THREE.Vector3(sign * .255, .60, -.10)),
      new THREE.Vector3(sign * .6, .1, 1).applyQuaternion(bike.quaternion));
  }
}

export function createHomeRaidersLook(loadAsset) {
  const group = new THREE.Group(); group.name = 'home-road-rats';
  const figures = createStoryPeopleView(loadAsset); group.add(figures.group);
  const steel = yardSurface(), rubber = new THREE.MeshStandardMaterial({color: 0x24221f, roughness: .96});
  const rim = new THREE.MeshStandardMaterial({color: 0x76634e, roughness: .65, metalness: .7});
  const bikeRim = new THREE.MeshStandardMaterial({color: 0x96978b, roughness: .72, metalness: .22});
  const wreckBikeRim = bikeRim.clone(); wreckBikeRim.color.setHex(0x41413b);
  const bikeSteel = bikeSurface(), wreckBikeSteel = bikeSurface(true);
  const darkSteel = steel.clone(); darkSteel.color.setHex(0x45413b);
  const darkRim = rim.clone(); darkRim.color.setHex(0x37342f);
  const geometry = [], models = new Map(), riderIds = new WeakMap();
  const keep = value => { geometry.push(value); return value; };
  let cast = [], castKey = '';
  function model(kind, id) {
    if (models.has(id)) return models.get(id);
    const root = new THREE.Group(); root.name = 'home-raid-' + kind;
    const builder = scrapBuilder(), f = builder.frame(0, 0, 0, 0), wheels = [];
    const tube = (a, b, width = .06, color = 0x56463a) => f.strut(a, b, width, color);
    const wheel = (x, z, radius, width) => {
      const spin = new THREE.Group(); spin.position.set(x, radius, z); root.add(spin);
      const tyre = new THREE.Mesh(keep(new THREE.TorusGeometry(radius - width / 2, width / 2, 8, 20).rotateY(Math.PI / 2)), rubber);
      const hub = new THREE.Mesh(keep(new THREE.CylinderGeometry(radius * .45, radius * .45, width * 1.06, 10).rotateZ(Math.PI / 2)), rim);
      spin.add(tyre, hub);
      for (let n = 0; n < 6; n++) {
        const spoke = new THREE.Mesh(keep(new THREE.BoxGeometry(width * .7, radius * 1.6, .035)), rim);
        spoke.rotation.x = n * Math.PI / 3; spin.add(spoke);
      }
      wheels.push({spin, radius});
      const blocks = [];
      for (let n = 0; n < 22; n++) {
        const angle = n * Math.PI / 11;
        blocks.push(new THREE.BoxGeometry(width * 1.08, .055, .09)
          .rotateX(angle).translate(0, Math.cos(angle) * radius, Math.sin(angle) * radius));
      }
      spin.add(new THREE.Mesh(keep(mergeGeometries(blocks, false)), rubber));
      blocks.forEach(block => block.dispose());
    };
    if (kind === 'bike') {
      drawRaidBike(f, root, wheels, keep, rubber, bikeRim);
    } else if (kind === 'crate') {
      f.box(.85, .65, .85, 0, .325, 0, 0x68543b, {ribs: true});
      for (const x of [-.3, .3]) f.box(.07, .68, .89, x, .34, 0, 0x393630);
      f.box(.65, .08, .5, 0, .7, 0, 0x625b4d);
    } else {
      for (const side of [-1, 1]) {
        for (const [z, radius] of [[1.05, .38], [-1.05, .47]]) {
          wheel(side * .89, z, radius, .28);
          tube([side * .41, .41, z + .3], [side * .89, radius, z], .07);
        }
        const rail = [[side * .45, .55, 1.64], [side * .56, .76, .47], [side * .48, 1.52, -.02],
          [side * .47, 1.58, -.67], [side * .6, .68, -1.44]];
        for (let n = 1; n < rail.length; n++) tube(rail[n - 1], rail[n], .09);
        tube([side * .64, .45, .85], [side * .65, .5, -1.4], .08);
        tube([side * .59, .53, .54], [side * .47, 1.58, -.67], .046, 0x87372d);
      }
      for (const [y, z] of [[1.52, -.02], [1.58, -.67], [.53, 1.65]]) tube([-.47, y, z], [.47, y, z]);
      f.box(.95, .09, 1.05, 0, .63, 1.04, 0x87372d, {ribs: true, lean: -.15});
      f.box(1.02, .07, .7, 0, 1.6, -.34, 0x67543e, {ribs: true});
      f.box(.81, .12, 1.22, 0, .39, -.16, 0x302d28);
      f.box(.55, .57, .14, 0, .79, -.55, 0x292722);
      f.box(.67, .44, .56, 0, .61, -1.16, 0x403b33, {ribs: true});
      for (const side of [-1, 1]) {
        tube([side * .25, .66, -1.12], [side * .41, .91, -1.49], .1);
        f.box(.2, .2, .1, side * .38, .69, 1.5, 0xc3b887);
      }
    }
    const body = new THREE.Mesh(keep(mergeGeometries(builder.parts, false)), kind === 'bike' ? bikeSteel : steel);
    builder.parts.forEach(part => part.dispose()); root.add(body);
    root.traverse(node => { if (node.isMesh) node.castShadow = node.receiveShadow = true; });
    group.add(root); const result = {root, wheels, body}; models.set(id, result); return result;
  }
  return {
    group,
    update(world, here, seconds, shift) {
      const rows = world.open?.parts.home?.raid?.riders ?? [];
      const record = world.open?.world?.open?.home;
      const alive = rows.filter(row => row.health > 0 && !row.fled);
      for (const value of models.values()) value.root.visible = false;
      let bedIndex = 0;
      const loot = (record?.loot ?? []).flatMap((piece, index) => {
        const bed = piece.position === 'bed';
        if (bed && !world.open?.parts.home?.flatbedOuting) return [];
        const truck = record.flatbed, slot = bedIndex;
        if (bed) bedIndex++;
        // Three transverse spaces on the existing flatbed. Wrecks keep their full-size silhouette.
        const behind = -.1 - slot * 1.3, yaw = bed ? truck.yaw + Math.PI / 2 : piece.position.yaw;
        const position = bed ? {x: truck.x + Math.sin(truck.yaw) * behind, z: truck.z + Math.cos(truck.yaw) * behind} : piece.position;
        return [{id: `home-loot/${piece.kind}/${index}`, kind: piece.kind, position, yaw, health: 0, travel: 0, bed}];
      });
      for (const row of [...rows, ...loot]) {
        const {root, wheels, body} = model(row.kind, row.id), {x, z} = row.position;
        const wreck = row.health <= 0 && row.kind !== 'crate';
        root.visible = !row.fled;
        const groundX = row.bed ? record.flatbed.x : x, groundZ = row.bed ? record.flatbed.z : z;
        root.position.set(x, scablandsSurfaceHeightAt(groundX, groundZ) + (shift?.(groundX, groundZ) ?? 0) + (row.bed ? 1.5125 : 0), z);
        root.rotation.set(0, row.yaw, wreck ? row.kind === 'bike' ? 1.2 : .18 : 0);
        body.material = row.kind === 'bike' ? (wreck ? wreckBikeSteel : bikeSteel) : (wreck ? darkSteel : steel);
        body.scale.set(1, wreck ? .72 : 1, wreck ? .92 : 1);
        for (const {spin} of wheels) spin.traverse(mesh => { if (mesh.isMesh && (mesh.material === rim || mesh.material === darkRim)) mesh.material = wreck ? darkRim : rim; });
        if (row.kind === 'bike') for (const {spin} of wheels) spin.traverse(mesh => {
          if (mesh.isMesh && (mesh.material === bikeRim || mesh.material === wreckBikeRim)) mesh.material = wreck ? wreckBikeRim : bikeRim;
        });
        for (const {spin, radius} of wheels) spin.rotation.x = row.travel / radius;
      }
      const key = alive.map(row => row.id).join('|');
      if (key !== castKey) {
        castKey = key;
        cast = createStoryPeople(alive.map((row, index) => ({id: row.id,
          figure: row.kind === 'bike' || index % 2 ? 'road-rat-lookout' : 'road-rat-lamp', action: 'sit', seat: 'handcart',
          position: {x: row.position.x, y: scablandsSurfaceHeightAt(row.position.x, row.position.z) + .15, z: row.position.z}, yaw: row.yaw})));
      }
      cast.forEach((person, index) => {
        const row = alive[index], {x, z} = row.position;
        person.position = {x, z, y: scablandsSurfaceHeightAt(x, z) + .15}; person.yaw = row.yaw;
      });
      // The shared pose's ground correction starts upright, never from last frame's lean.
      for (const root of figures.group.children) if (mountedJoints.has(root)) root.rotation.x = 0;
      figures.update({open: world.open, storyPeople: cast}, here, seconds, shift);
      // Lean the existing seated figures into the handlebars, without changing their rule poses.
      const unmatched = new Map(alive.map(row => [row.id, row]));
      figures.group.children.forEach(root => {
        if (!root.visible || !root.name.startsWith('story-person-')) return;
        // Capture identity once after loading. Two riders can reach the same coop door;
        // use heading to tell new roots apart and consume each candidate only once.
        let rider = unmatched.get(riderIds.get(root));
        if (!rider) {
          const angle = row => Math.abs(Math.atan2(Math.sin(row.yaw - root.rotation.y), Math.cos(row.yaw - root.rotation.y)));
          rider = [...unmatched.values()].filter(row => Math.abs(row.position.x - root.position.x) < .0001 &&
            Math.abs(row.position.z - root.position.z) < .0001).sort((a, b) => angle(a) - angle(b))[0];
          if (rider) riderIds.set(root, rider.id);
        }
        if (!rider) return;
        unmatched.delete(rider.id);
        root.rotation.order = 'YXZ';
        root.rotation.x = rider?.kind === 'bike' ? .26 : .08;
        if (rider?.kind === 'bike') {
          root.position.x -= Math.sin(rider.yaw) * .53;
          root.position.z -= Math.cos(rider.yaw) * .53;
          root.position.y += .08;
          fitBikeRider(root, models.get(rider.id).root);
        }
      });
    },
    dispose() { figures.dispose(); geometry.forEach(part => part.dispose()); steel.dispose(); bikeSteel.dispose(); wreckBikeSteel.dispose(); bikeRim.dispose(); wreckBikeRim.dispose(); darkSteel.dispose(); darkRim.dispose(); rubber.dispose(); rim.dispose(); group.clear(); },
  };
}
