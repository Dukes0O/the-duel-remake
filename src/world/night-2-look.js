import * as THREE from 'three';
import {NIGHT_2_SITES as sites, night2Point} from './jobs/night-2-sites.js';
import {createBraziers} from './ember-pot.js';
import {saltLeanToShape} from './salt-lean-to-look.js';
import {SALT_RIDERS} from './jobs/ember-rule.js';
import {STORY_FIGURES} from './jobs/story-people.js';
import {worldPose} from '../arena/arena-floor.js';

// STORY-NIGHT-2-FLOW item 2: cold breath that reads as breath. Kyle's play of 19 November 2026 showed a grey blob over the
// Walkers' faces: one sphere a quarter of a metre across, at eye height, pushed straight out toward the gate camera. Now
// each exhale is three small soft wisps that leave the mouth, slide to one side of the face as the picture sees it, then rise
// and thin out within about a second and a half. Drawing only; it reads the cast and moves nothing.
export const NIGHT_2_BREATH = Object.freeze({
  wisps: 3, wispGapSec: .14, lifeSec: 1.35, cycleSec: 2 * Math.PI / 1.87,
  startRadius: .03, endRadius: .15, forward: .22, aside: .34, rise: .3, opacity: .11,
});
// The mouth sits a little above and in front of the head bone (measured on the cast: the head bone is at about 0.85 of
// standing height, the face front about 0.11 m ahead of it on a 1.75 m figure).
export const NIGHT_2_MOUTH = Object.freeze({upShare: .036, forwardShare: .06});

const STORY_FIGURE_INDEX = id => STORY_FIGURES[id]?.index ?? 0;

export function createNight2Look(course) {
  const group = new THREE.Group();
  group.name = 'Strangers at the gate';
  const resources = [];
  const material = (color, extra) => {
    const value = new THREE.MeshStandardMaterial({color, roughness: .85, ...extra});
    resources.push(value);
    return value;
  };
  const metal = material(0x554d42, {metalness: .45});
  const salt = material(0xe3d9c8);
  const wool = material(0x6f4938, {side: THREE.DoubleSide});
  const canvas = material(0x776552, {side: THREE.DoubleSide, vertexColors: true});
  const flame = material(0xfcb35b, {emissive: 0xff7a20, emissiveIntensity: 2});
  const mesh = (parent, geometry, finish, x = 0, y = 0, z = 0) => {
    resources.push(geometry);
    const body = new THREE.Mesh(geometry, finish);
    body.position.set(x, y, z);
    body.castShadow = body.receiveShadow = true;
    parent.add(body);
    return body;
  };
  const place = (name, at) => {
    const part = new THREE.Group();
    part.name = name;
    part.position.set(at.x, at.y, at.z);
    group.add(part);
    return part;
  };
  const bell = place('Tin Town gate bell', {x: sites.gate.x - 4.3, y: 3.45, z: sites.gate.z + 1.2});
  mesh(bell, new THREE.BoxGeometry(.11, .12, .65), metal, 0, .37, -.19);
  mesh(bell, new THREE.LatheGeometry([[0, .28], [.14, .28], [.18, .12], [.22, .03], [.31, -.15],
    [.3, -.19], [.25, -.15], [.15, .06], [.11, .23], [0, .23]].map(([x,y]) => new THREE.Vector2(x,y)), 16), metal);
  mesh(bell, new THREE.SphereGeometry(.056, 8, 6), metal, 0, -.15);
  const gateLights = [-3.4, 3.4].map(x => {
    const light = new THREE.PointLight(0xffad61, 125, 34);
    light.name = 'Night 2 gate lamp';
    light.position.set(sites.gate.x + x, 5.83, sites.gate.z);
    group.add(light);
    return light;
  });
  const hearthLight = new THREE.PointLight(0xffa66b, 135, 24);
  hearthLight.name = 'Night 2 hearth light';
  hearthLight.position.copy(sites.hearth.position);
  hearthLight.position.y += 1.8;
  group.add(hearthLight);
  const saltPile = place('Salt blocks from the Walkers',
    {...sites.gateOutside.position, x: sites.gate.x - 2.8, z: sites.gate.z + 9.4});
  [[-.31,.14,0], [.25,.14,-.13], [-.15,.42,-.07], [.07,.14,.27], [.31,.42,.02]].forEach(([x,y,z], i) => {
    const block = mesh(saltPile, new THREE.BoxGeometry(.43, .25, .38), salt, x, y, z);
    block.rotation.y = i * .37;
  });
  const ladle = place('Auntie Solder’s ladle', {x: 0, y: 0, z: 0});
  const brightIron = material(0xab9680, {metalness: .62, roughness: .32, emissive: 0x5b3011, emissiveIntensity: .3});
  mesh(ladle, new THREE.CylinderGeometry(.028, .036, .43, 7), brightIron, 0, .18, 0);
  mesh(ladle, new THREE.SphereGeometry(.14, 10, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), brightIron, 0, -.04, 0);
  const ember = mesh(ladle, new THREE.DodecahedronGeometry(.095, 0), flame, .08, .004, .06);
  ember.name = 'Ember in Dace’s ladle';
  const emberGlow = new THREE.PointLight(0xff984f, 3, 4);
  emberGlow.position.set(.09,.06,.08);
  ladle.add(emberGlow);
  const shawl = place('Auntie’s shawl', {x: 0, y: 0, z: 0});
  const shawlShape = new THREE.PlaneGeometry(.59, .74, 5, 5);
  const cloth = shawlShape.attributes.position;
  for (let i = 0; i < cloth.count; i++) cloth.setZ(i, .18 * Math.cos(cloth.getX(i) * 5) + .04 * Math.cos(i * 2));
  shawlShape.computeVertexNormals();
  mesh(shawl, shawlShape, wool).rotation.x = -1.07;
  const shelters = [-5, 5].map(offset => {
    const shelter = place('Walkers’ canvas lean-to', sites.campShelter.position);
    shelter.userData.offset = offset;
    mesh(shelter, saltLeanToShape({halfX: SALT_RIDERS.shelterHalfX, halfZ: SALT_RIDERS.shelterHalfZ,
      height: SALT_RIDERS.shelterHeight}), canvas);
    return shelter;
  });
  const campFires = createBraziers(2, {smokeLook: {height: 4.2, foot: .19, top: 1.4, lean: .45,
    wind: {x: 1, z: .38}, colour: 0xc8bbb2, pale: 0xf3e6d5, strength: .37}});
  campFires.group.name = 'Walkers’ camp fires';
  const campFireSites = [[-5, -5], [-2, 6]].map(([x, z]) => night2Point(sites.camp.position.x + x, sites.camp.position.z + z));
  campFires.group.children.forEach((fire, index) => {
    fire.scale.setScalar(.72);
    fire.add(new THREE.PointLight(0xff9f48, 30, 14).translateY(1.8));
    fire.name = `Walkers’ camp fire ${index + 1}`;
  });
  group.add(campFires.group);
  const lamps = new THREE.MeshBasicMaterial({color: 0xffd3a3, fog: false, toneMapped: false});
  const glass = new THREE.SphereGeometry(.36, 8, 6);
  resources.push(lamps, glass);
  const riderLights = Array.from({length: 3}, (_, index) => {
    const pair = place(`Wash rider ${index + 1} lights`, {x: 0, y: 0, z: 0});
    for (const side of [-.8, .8]) {
      const lens = new THREE.Mesh(glass, lamps);
      // High enough for the tower to see both roof lamps over each car’s own body.
      lens.position.set(side, 2.02, .45);
      pair.add(lens);
    }
    return pair;
  });
  // A soft round wisp made in code: full in the middle, nothing at the edge.
  const wispSize = 32, wispPixels = new Uint8Array(wispSize * wispSize * 4);
  for (let y = 0; y < wispSize; y++) for (let x = 0; x < wispSize; x++) {
    const r = Math.hypot(x + .5 - wispSize / 2, y + .5 - wispSize / 2) / (wispSize / 2), i = (y * wispSize + x) * 4;
    wispPixels.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - r) ** 2)], i);
  }
  const wispTexture = new THREE.DataTexture(wispPixels, wispSize, wispSize);
  wispTexture.needsUpdate = true;
  resources.push(wispTexture);
  const breathCast = 11;
  const breath = Array.from({length: breathCast * NIGHT_2_BREATH.wisps}, () => {
    const mist = new THREE.SpriteMaterial({map: wispTexture, color: 0xf1efea, transparent: true, depthWrite: false, opacity: 0});
    resources.push(mist);
    const wisp = new THREE.Sprite(mist);
    wisp.name = 'Night 2 breath';
    wisp.visible = false;
    group.add(wisp);
    return wisp;
  });
  const mouth = new THREE.Vector3();

  // The rider laying siege drives with its headlights on: a beam forward along the ground, so a dark camp can be found by it.
  // It stays in the scene and goes dark (intensity 0) when the rider is not there, so the scene's light count never changes.
  const siegeBeam = new THREE.SpotLight(0xffe2b8, 0, 48, .42, .55, 2);
  siegeBeam.name = 'Wash siege rider headlights';
  group.add(siegeBeam, siegeBeam.target);

  return {group, update(worldJob, seconds, shift, opponents, view = {}) {
    const chapter = worldJob?.night2;
    group.visible = Boolean(chapter);
    if (!chapter) return;
    const cast = worldJob.storyPeople;
    const {props} = chapter;
    for (const light of gateLights) light.visible = chapter.night;
    hearthLight.visible = chapter.night;
    saltPile.visible = props.salt;
    ladle.visible = props.ladle;
    if (ladle.visible) {
      const dace = cast.find(person => person.id === 'dace');
      const {x, y, z} = dace.position;
      ladle.position.set(x + .34 * Math.cos(dace.yaw), y + shift(x, z, y) + .99,
        z - .34 * Math.sin(dace.yaw));
      ladle.rotation.y = dace.yaw;
      emberGlow.intensity = 3 + .8 * Math.sin(seconds * 11);
      ladle.rotation.z = -.32 + (dace.action === 'run' ? .4 * Math.sin(seconds * 13) : 0);
    }
    shawl.visible = props.shawl;
    if (shawl.visible) {
      const wim = cast.find(person => person.id === 'wim');
      const {x, y, z} = wim.position;
      shawl.position.set(x, y + shift(x, z, y) + .45, z + .08);
      shawl.rotation.y = wim.yaw;
    }
    const camp = ['pump', 'sleep'].includes(chapter.set) ? sites.pump : sites.campShelter;
    for (const shelter of shelters) {
      shelter.visible = props.shelter;
      const {x,y,z} = camp.position;
      const zx = z + shelter.userData.offset + (camp === sites.pump ? 8 : 0);
      shelter.position.set(x - (camp === sites.pump ? 4 : 0), y + shift(x,zx,y), zx);
    }
    campFires.group.visible = props.campLights;
    if (props.campLights) {
      campFires.place(campFireSites.map(at => ({...at, y: at.y + shift(at.x, at.z, at.y)})));
      campFires.animate(seconds);
    }
    // The riders' lights show wherever the riders are, on the dark camp's branches too.
    riderLights.forEach((pair, index) => {
      const id = `wash-rider-${index + 1}`;
      const rider = worldJob.actors.find(actor => actor.id === id && actor.position);
      const fighter = opponents.find(car => car.roadRider?.id === id && !car.combatWrecking && car.roadRider.phase !== 'home');
      const pose = rider ? {...rider.position, heading: rider.heading}
        : fighter ? {...worldPose({course}, fighter), y: fighter.groundHeight} : null;
      pair.visible = Boolean(pose);
      if (index === 0) siegeBeam.intensity = pose ? 70 : 0;
      if (!pose) return;
      const {x, y, z} = pose;
      pair.position.set(x, y + shift(x, z, y), z);
      pair.rotation.y = pose.heading;
      if (index === 0) {
        const sin = Math.sin(pose.heading), cos = Math.cos(pose.heading), lift = y + shift(x, z, y);
        siegeBeam.position.set(x + sin * 2.1, lift + 1, z + cos * 2.1);
        siegeBeam.target.position.set(x + sin * 18, lift, z + cos * 18);
      }
    });
    const walkers = chapter.set === 'gate' ? cast.filter(person => !['auntie-solder', 'cinder'].includes(person.id)) : [];
    const viewer = view.viewer ?? chapter.camera?.position;
    const B = NIGHT_2_BREATH;
    breath.forEach(wisp => { wisp.visible = false; });
    walkers.slice(0, breathCast).forEach((person, slot) => {
      const index = STORY_FIGURE_INDEX(person.id);
      // In step with the chest's own rise and fall in the people view: the exhale starts as the chest begins to fall.
      const sinceExhale = ((seconds + (index * 1.5 - Math.PI / 2) / 1.87) % B.cycleSec + B.cycleSec) % B.cycleSec;
      const drawn = view.mouthOf?.(person.id, mouth);
      const yaw = drawn?.yaw ?? person.yaw;
      if (!drawn) {
        const {x, y, z} = person.position, h = person.height;
        mouth.set(x + Math.sin(yaw) * NIGHT_2_MOUTH.forwardShare * h, y + shift(x, z, y) + h * (person.action === 'sit' ? .64 : .89),
          z + Math.cos(yaw) * NIGHT_2_MOUTH.forwardShare * h);
      }
      // Aside is across the picture: perpendicular to the line from the camera, toward the side the night air leans.
      let sideX = Math.cos(yaw), sideZ = -Math.sin(yaw);
      if (viewer) {
        const lx = mouth.x - viewer.x, lz = mouth.z - viewer.z, length = Math.hypot(lx, lz) || 1;
        sideX = lz / length; sideZ = -lx / length;
      }
      if (sideX * 1 + sideZ * .38 < 0) { sideX = -sideX; sideZ = -sideZ; }
      for (let w = 0; w < B.wisps; w++) {
        const age = sinceExhale - w * B.wispGapSec, t = age / B.lifeSec;
        if (t <= 0 || t >= 1) continue;
        const wisp = breath[slot * B.wisps + w], out = 1 - (1 - t) ** 2, late = t * t;
        wisp.visible = true;
        wisp.position.set(mouth.x + Math.sin(yaw) * B.forward * out + sideX * B.aside * out,
          mouth.y - .02 * out + B.rise * late, mouth.z + Math.cos(yaw) * B.forward * out + sideZ * B.aside * out);
        wisp.scale.setScalar(2 * (B.startRadius + (B.endRadius - B.startRadius) * out));
        wisp.material.opacity = B.opacity * Math.min(1, t / .12) * (1 - t) * (1 - w * .2);
      }
    });
  }, dispose() {
    campFires.dispose();
    for (const resource of resources) resource.dispose();
    group.removeFromParent();
  }};
}
