// QA page only: tools/menu-check.js loads this when the address has `open-look-stand`. Never import it from the game.
//
// It stands one drawn site of the open Scablands in the running land, so that a look scenario can take its pictures before the
// card that places the site exists (OPEN-LOOK-RATS-NEST). It works only with the switch `story-choices` on. For a site with ground
// of its own it cuts that ground into the land's edit layer, the layer the game's own ground drawing and physics read, and asks the
// scene to draw it again. Nothing is saved: the QA page keeps its saves in memory.
//
// The land's own near ground is drawn in cells of about 23 by 17 m, which stand far above a cut 9 m deep with steep sides. So, for
// the pictures only, the stand has the edit layer draw every 32 m square round the site at its own 1 m grain and sinks the near
// ground's corners there out of sight. The card that places the site for play has to join the two grounds properly.
//
// `window.__openLookStand.stand(name, {stage, seconds})` returns where the site stands and every named spot in the land's metres.
// At the stage `night` it also turns the land's own light down while the picture is drawn. That is a stand-in for the night that
// the card which places the site will bring; it is here only so that the site's fires and lamps can be judged in the dark.
import {LAND} from '../src/world/scablands-names.js';
import {scablandsGroundEdit, scablandsNaturalHeightAt, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';

// One row a site: where it stands and what its look file gives. A later look card adds its row here.
const LOOKS = Object.freeze({
  'rats-nest': async () => {
    const look = await import('../src/world/open/looks/rats-nest-look.js');
    // The Rats' Nest's one position in "Claude answers" of docs/board/cards/OPEN-SITES.md.
    return {at: LAND.at('boneyard', -150, -900), layout: look.RATS_NEST_LAYOUT, ground: look.ratsNestGround,
      build: look.buildRatsNest, update: look.updateRatsNest};
  },
});

const NIGHT = Object.freeze({hemisphere: .22, sun: .09, environment: .14, fog: .07, sky: .06});
const SINK = Object.freeze({margin: 26, drawn: 50, drop: 14, deepest: 10.5});

export function createOpenLookStand(app, view = () => globalThis.__render) {
  const dug = new Set();
  let stood = null, hooked = false, dimmed = null;

  function scablands() {
    let root = null;
    view().scene.traverse(node => { if (node.name === 'The Scablands') root = node; });
    if (!root) throw Error('The Scablands is not on the screen.');
    return root;
  }
  // Turn the land's own light down for one drawing, and put it back afterwards so that the game's lighting keeps its own values.
  function dim(scene) {
    const lights = scene.children.filter(node => node.isHemisphereLight || node.isDirectionalLight);
    const skies = scene.children.filter(node => node.material?.uniforms?.horizon && node.material.uniforms.top);
    const colours = skies.flatMap(sky => ['top', 'horizon', 'cloudTint'].map(name => sky.material.uniforms[name]?.value).filter(value => value?.isColor || value?.isVector3));
    dimmed = {lights: lights.map(light => [light, light.intensity]), environment: scene.environmentIntensity,
      fog: scene.fog ? scene.fog.color.clone() : null, colours: colours.map(colour => [colour, colour.clone()])};
    for (const light of lights) light.intensity *= light.isHemisphereLight ? NIGHT.hemisphere : NIGHT.sun;
    scene.environmentIntensity *= NIGHT.environment;
    scene.fog?.color.multiplyScalar(NIGHT.fog);
    for (const colour of colours) colour.multiplyScalar(NIGHT.sky);
  }
  // Keep the near ground's corners round the site below anything that can be seen (see the top of this file).
  function sink(land) {
    const near = land.getObjectByName('Scablands near ground'), points = near?.geometry.attributes.position;
    if (!points) return;
    const reach = stood.reach + SINK.margin;
    let moved = false;
    for (let index = 0; index < points.count; index++) {
      const x = points.getX(index) + near.position.x, z = points.getZ(index) + near.position.z;
      if (Math.abs(x - stood.at.x) > reach || Math.abs(z - stood.at.z) > reach) continue;
      if (points.getY(index) + near.position.y < scablandsNaturalHeightAt(x, z) - SINK.deepest) continue;
      points.setY(index, points.getY(index) - SINK.drop); moved = true;
    }
    if (moved) points.needsUpdate = true;
  }
  function undim(scene) {
    if (!dimmed) return;
    for (const [light, intensity] of dimmed.lights) light.intensity = intensity;
    scene.environmentIntensity = dimmed.environment;
    if (dimmed.fog) scene.fog.color.copy(dimmed.fog);
    for (const [colour, saved] of dimmed.colours) colour.copy(saved);
    dimmed = null;
  }
  function hook(scene) {
    if (hooked) return;
    hooked = true;
    const before = scene.onBeforeRender, after = scene.onAfterRender;
    scene.onBeforeRender = function (...args) {
      before.apply(this, args);
      if (!stood) return;
      stood.update?.(stood.group, stood.seconds);
      if (stood.dug) sink(stood.land);
      if (stood.night && !dimmed) dim(scene);
    };
    scene.onAfterRender = function (...args) { undim(scene); after.apply(this, args); };
  }
  function clear() {
    if (!stood) return false;
    stood.group.parent?.remove(stood.group);
    stood.group.userData.dispose?.();
    stood = null;
    return true;
  }

  async function stand(name, {stage, seconds = 7.3} = {}) {
    const switches = app._switches?.() ?? app.duel.featureFlags;
    if (switches.enabled('story-choices') !== true) throw Error('The open Scablands looks need the switch story-choices.');
    if (!Object.hasOwn(LOOKS, name)) throw Error('No look called ' + name);
    const look = await LOOKS[name](), {at, layout} = look, scene = view().scene, land = scablands();
    clear();
    if (look.ground && !dug.has(name)) {
      const reach = Math.ceil(layout.radius), x0 = Math.round(at.x), z0 = Math.round(at.z);
      for (let z = z0 - reach; z <= z0 + reach; z++) for (let x = x0 - reach; x <= x0 + reach; x++) {
        const depth = look.ground(x - at.x, z - at.z);
        if (depth > .02) scablandsGroundEdit.cut({x, z, radius: .4}, scablandsNaturalHeightAt(x, z) - depth);
      }
      // A cut that asks for no change still gives its 32 m square to the edit layer, which then draws that square at its 1 m grain.
      for (let z = z0 - reach - SINK.drawn; z <= z0 + reach + SINK.drawn; z += 16) for (let x = x0 - reach - SINK.drawn; x <= x0 + reach + SINK.drawn; x += 16)
        scablandsGroundEdit.cut({x, z, radius: .4}, scablandsNaturalHeightAt(x, z));
      dug.add(name);
      land.userData.updateGroundView?.();
    }
    const group = look.build({stage, heightAt: (x, z) => scablandsSurfaceHeightAt(at.x + x, at.z + z)});
    group.position.set(at.x, 0, at.z);
    scene.add(group);
    hook(scene);
    stood = {name, group, update: look.update, seconds, night: stage === 'night', dug: !!look.ground, land, at, reach: layout.radius};
    let low = Infinity, high = -Infinity;
    for (let z = -layout.radius; z <= layout.radius; z += 8) for (let x = -layout.radius; x <= layout.radius; x += 8) {
      const height = scablandsNaturalHeightAt(at.x + x, at.z + z); low = Math.min(low, height); high = Math.max(high, height);
    }
    const spots = Object.fromEntries(Object.entries(layout.spots).map(([id, spot]) => [id, {
      x: at.x + spot.x, y: scablandsSurfaceHeightAt(at.x + spot.x, at.z + spot.z), z: at.z + spot.z,
      looksAt: spot.looksAt ? {x: at.x + spot.looksAt.x, z: at.z + spot.looksAt.z,
        y: scablandsNaturalHeightAt(at.x + spot.looksAt.x, at.z + spot.looksAt.z) + spot.looksAt.y} : null}]));
    return {name, stage, at: {x: at.x, z: at.z}, land: scablandsNaturalHeightAt(at.x, at.z), landFall: high - low, spots,
      draws: group.userData.draws, triangles: group.userData.triangles, lights: group.userData.lights.length};
  }
  return Object.freeze({stand, clear, at: seconds => { if (stood) stood.seconds = seconds; return !!stood; }});
}
