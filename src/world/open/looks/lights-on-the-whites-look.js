import * as THREE from 'three';
import story from '../../../story/threads/content/lights-on-the-whites.js';
import {lightsVisible} from '../../../story/threads/signs.js';
import {createHandcartView} from '../../handcart-view.js';
import {WHITES_DECKS, WHITES_LADDER} from '../../deck-plates.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {isFound} from '../open-record.js';
import {distance, sitePosition} from '../site-rule.js';
import {LIGHTS_ID, LIGHTS_LADDER_MARK, lightsMark, lightsPlaces} from '../content/lights-on-the-whites-places.js';

const SALT = story.beats.salt.mission;
const HAZE = story.notes.haze;
const LAMPS = story.notes.lamps;
const CART_BEATS = ['salt', 'crew', 'crew-after-sounding', 'buoy', 'sounding', 'back-to-cart', 'two-trips', 'walk-in'];

export function createLightsLook() {
  const group = new THREE.Group();
  group.name = 'Lights on the Whites';
  const rust = new THREE.MeshStandardMaterial({color: 0x5c3d30, roughness: .93, metalness: .28});
  const iron = new THREE.MeshStandardMaterial({color: 0x424144, roughness: .83, metalness: .35});
  const gold = new THREE.MeshStandardMaterial({color: 0x947749, roughness: .65, metalness: .45});
  const glow = new THREE.MeshBasicMaterial({color: 0xffc277, fog: false, toneMapped: false});
  const lampShape = new THREE.SphereGeometry(1, 10, 6);
  const lamps = Array.from({length: 4}, (_, i) => {
    const lamp = new THREE.Mesh(lampShape, glow);
    lamp.name = 'Sounding boat lamp ' + (i + 1);
    group.add(lamp);
    return lamp;
  });
  const fire = new THREE.MeshBasicMaterial({color: 0xff8e3f, fog: false, toneMapped: false});
  const basket = new THREE.Mesh(lampShape, fire);
  const rail = new THREE.Mesh(lampShape, glow);
  rail.name = 'Patience rail lamp';
  group.add(rail);
  basket.name = 'Patience fire basket';
  group.add(basket);

  const box = (root, material, width, height, depth, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };
  const buoy = new THREE.Group();
  buoy.name = 'The Bell Buoy';
  const float = new THREE.Mesh(new THREE.CylinderGeometry(.78, 1.18, 3.5, 12), rust);
  float.position.set(-.45, .9, 0);
  float.rotation.z = -1.44;
  buoy.add(float);
  box(buoy, iron, 2.2, .17, .18, 1.05, 1.22);
  box(buoy, iron, .16, 1.18, .15, 2, .65);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(.16, .42, .48, 12, 1, true), gold);
  bell.position.set(1.55, .97, 0);
  buoy.add(bell);
  group.add(buoy);

  const hulls = new THREE.Group();
  hulls.name = 'Three ships on the salt';
  for (const deck of WHITES_DECKS) {
    const [a, b, c] = deck.outline;
    const x = (a.x + c.x) / 2, z = (a.z + c.z) / 2;
    const shape = new THREE.Shape();
    for (const [i, p] of deck.outline.entries()) shape[i === 0 ? 'moveTo' : 'lineTo'](p.x - x, z - p.z);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: 6, bevelEnabled: false});
    geometry.rotateX(-Math.PI / 2);
    const hull = new THREE.Mesh(geometry, rust);
    hull.position.set(x, deck.y - 6, z);
    hulls.add(hull);
    const upper = new THREE.Group();
    upper.position.set(x, deck.y, z);
    upper.rotation.y = Math.atan2(b.x - c.x, b.z - c.z);
    box(upper, iron, 4.5, 2.7, 4.1, 0, 1.35, -8);
    box(upper, iron, .25, 13.7, .25, 0, 6.85, 3.8);
    hulls.add(upper);
  }
  const ladder = new THREE.Group();
  ladder.name = 'Patience quarter ladder';
  const {foot, top} = WHITES_LADDER;
  const footY = scablandsSurfaceHeightAt(foot.x, foot.z);
  const from = new THREE.Vector3(foot.x, footY, foot.z), to = new THREE.Vector3(top.x, 4, top.z);
  const delta = to.clone().sub(from);
  ladder.position.copy(from).lerp(to, .5);
  ladder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  for (const side of [-.37, .37]) box(ladder, iron, .085, delta.length(), .085, side);
  for (let y = .23; y < delta.length(); y += .31) box(ladder, iron, .75, .055, .085, 0, y - delta.length() / 2);
  hulls.add(ladder);
  group.add(hulls);
  const cart = createHandcartView();
  cart.root.name = 'Sounding boat handcart';
  const kit = new THREE.Group();
  cart.root.add(kit);
  box(kit, iron, .07, 1.65, .07, .38, 1.08, .33);
  const coil = new THREE.Mesh(new THREE.TorusGeometry(.21, .07, 6, 14), gold);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-.12, .59, -.26);
  kit.add(coil);
  box(kit, iron, .13, .15, .27, .14, .57, .2);
  group.add(cart.root);

  const onGround = (mesh, at, shift, above = 0) => {
    mesh.position.set(at.x, (at.y ?? scablandsSurfaceHeightAt(at.x, at.z)) + (shift?.(at.x, at.z) ?? 0) + above, at.z);
  };
  const show = (mesh, at, viewer, range, shift, elevation = 0) => {
    const gap = distance(viewer, at);
    mesh.visible = gap <= range;
    if (!mesh.visible) return;
    onGround(mesh, at, shift, elevation);
    mesh.scale.setScalar(Math.max(.12, Math.min(4, gap / 620)));
  };

  let landSeed, places, buoyAt;
  return {
    group,
    update(open, sign, viewer, shift) {
      const land = open?.world.open.landSeed;
      const context = open?.parts.threads;
      group.visible = context?.places.checkpointsEnabled === true;
      if (!group.visible) return;
      if (land !== landSeed) {
        landSeed = land;
        places = lightsPlaces(land);
        buoyAt = sitePosition('bell-buoy', land);
      }
      const world = open.world;
      const record = world.open.threads[LIGHTS_ID];
      const beat = record?.end ? null : record?.beat;
      const active = open.parts.missions?.active;
      const mission = active?.thread === LIGHTS_ID ? active : null;
      const at = places['whites-crew'], seconds = open.seconds;
      const saltTime = seconds - (context.beatSeconds?.[LIGHTS_ID]?.salt ?? seconds);
      const crewTime = seconds - (context.beatSeconds?.[LIGHTS_ID]?.crew ?? seconds);
      const signSeen = sign && lightsVisible(sign, viewer);
      const showingCrew = CART_BEATS.includes(beat);
      const waitAt = mission?.state.route.meeting && mission.state.phase === 'search' ? mission.state.route.meeting : at;
      const cartPoint = mission?.state.walkers ?? waitAt;
      const heading = Math.atan2(at.x - places['whites-ship-side'].x, at.z - places['whites-ship-side'].z);
      cart.root.visible = showingCrew && (mission?.mission.kind !== 'rescue' || !mission.state.reunion) &&
        distance(viewer, cartPoint) < 100;
      if (cart.root.visible) cart.update({...cartPoint, y: scablandsSurfaceHeightAt(cartPoint.x, cartPoint.z),
        yaw: heading, travel: mission?.state.walked ?? 0}, shift?.(cartPoint.x, cartPoint.z) ?? 0);

      let count = 0;
      if (signSeen) count = LAMPS.seen;
      else if (beat === 'salt') count = saltTime < SALT.rule.seconds ? saltTime < HAZE.downAfterSecondsOffRoad &&
        !lightsMark(world, 'entered/ships') ? 3 : 2 : 0;
      else if (beat === 'two-trips' && !mission?.state.reunion) count =
        (mission?.state.lampAge ?? crewTime) < (mission?.mission.rule.lampSeconds ?? LAMPS.secondsEach) ? 1 : 0;
      else if (showingCrew && beat !== 'walk-in') count = crewTime < LAMPS.secondsEach ? 2 : 0;
      for (const [i, lamp] of lamps.entries()) {
        if (i >= count) { lamp.visible = false; continue; }
        const phase = seconds * .6 + i * .38;
        const spread = signSeen || beat === 'salt' ? 12 : 1;
        show(lamp, {x: cartPoint.x + i * spread + Math.sin(phase) * (signSeen ? 6 : .1),
          z: cartPoint.z + i * spread * .12 + Math.cos(phase) * (signSeen ? 4 : .1)},
        viewer, signSeen || saltTime < HAZE.downAfterSecondsOffRoad ? story.sign.seenWithin : HAZE.handLampMetres, shift, 2.2);
      }
      const lit = lightsMark(world, 'lit-the-basket') && record &&
        (world.ledger.night === record.began || !record.end && showingCrew);
      if (lit) show(basket, places['whites-basket'], viewer, HAZE.fireBasketMetres, shift);
      else basket.visible = false;
      const ship = places['whites-ship-side'];
      const atRail = places['whites-boat'];
      show(rail, atRail, viewer, 380, shift);
      hulls.visible = distance(viewer, ship) < 2100;
      hulls.position.y = shift?.(ship.x, ship.z) ?? 0;
      ladder.visible = world.ledger.made.includes(LIGHTS_LADDER_MARK);
      buoy.visible = distance(viewer, buoyAt) < story.beats.buoy.mission.rule.bellHeardMetres &&
        (!!record || isFound(world, 'bell-buoy'));
      if (buoy.visible) {
        onGround(buoy, buoyAt, shift);
        bell.rotation.x = Math.sin(seconds * 2.3) * .12;
      }
    },
    dispose() {
      for (const mesh of kit.children) mesh.geometry.dispose();
      cart.dispose();
      const geometries = new Set();
      group.traverse(mesh => { if (mesh.geometry) geometries.add(mesh.geometry); });
      for (const geometry of geometries) geometry.dispose();
      for (const material of [rust, iron, gold, glow, fire]) material.dispose();
      group.removeFromParent();
    },
  };
}
