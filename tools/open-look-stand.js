// QA page only: tools/menu-check.js loads this when the address has `open-look-stand`. Never import it from the game.
//
// It stands one drawn site of the open Scablands in the running land, so that a look scenario can take its pictures before the
// card that places the site exists (OPEN-LOOK-RATS-NEST). It works only with the switch `story-choices` on. For a site with ground
// of its own it cuts that ground into the land's edit layer, the layer the game's own ground drawing and physics read, and asks the
// scene to draw it again. Nothing is saved: the QA page keeps its saves in memory.
//
// `window.__openLookStand.stand(name, {stage, seconds})` returns where the site stands and every named spot in the land's metres.
// In the memory fixture, stand('rats-nest', {stage: 'day', view: 'ground-edge'}) looks down the rim at 35 cm.
// At the stage `night` it also turns the land's own light down while the picture is drawn. That is a stand-in for the night that
// the card which places the site will bring; it is here only so that the site's fires and lamps can be judged in the dark.
import {CHUNK_METRES} from '../src/world/ground-edit.js';
import {installSiteGround} from '../src/world/open/site-ground.js';
import {sitePosition} from '../src/world/open/site-rule.js';
import {scablandsGroundEdit, scablandsNaturalHeightAt, scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';

// One row a site: where it stands and what its look file gives. A later look card adds its row here.
const LOOKS = Object.freeze({
  'rats-nest': async () => {
    const look = await import('../src/world/open/looks/rats-nest-look.js');
    return {at: sitePosition('rats-nest', 0), layout: look.RATS_NEST_LAYOUT,
      build: look.buildRatsNest, update: look.updateRatsNest};
  },
  // OPEN-LOOK-BUS-RING. Until OPEN-T-MARKET places the site, it stands where that card puts it. Its one stage is `camp`;
  // the stand's `night` stands the same camp in the dark.
  'bus-ring': async () => {
    const look = await import('../src/world/open/looks/bus-ring-look.js'), {LAND} = await import('../src/world/scablands-names.js');
    return {at: sitePosition('bus-ring', 0) ?? LAND.at('ridge', -665, -345), layout: look.BUS_RING_LAYOUT,
      build: ({heightAt}) => look.buildBusRing({stage: 'camp', heightAt}), update: look.updateBusRing};
  },
  // OPEN-LOOK-RADIO-HILL. Its stages are 'camp' and 'second-set'; the stand's 'dusk' and 'night' are the camp with its lamps lit.
  'radio-hill': async () => {
    const look = await import('../src/world/open/looks/radio-hill-look.js');
    return {at: sitePosition('radio-hill', 0), layout: look.RADIO_HILL_LAYOUT,
      build: ({stage, heightAt}) => look.buildRadioHill({stage: look.RADIO_HILL_STAGES.includes(stage) ? stage : 'camp', night: stage === 'dusk' || stage === 'night', heightAt}),
      update: look.updateRadioHill};
  },
  // OPEN-LOOK-DACE. The things of Dace Goes Looking, each where the storyline puts it: the pickup at the forge (stages 'ready',
  // 'covered', 'mended'), at the gate ('leaving') and by the road ('stopped'), the stones, the tracks, and its three places.
  ...Object.fromEntries(['dace-forge', 'dace-gate', 'dace-roadside', 'dace-stones', 'dace-tracks', 'deep-sign', 'hangar', 'crows-step'].map(name => [name, async () => {
    const look = await import('../src/world/open/looks/dace-goes-looking-look.js'), row = look.DACE_STAND[name];
    return {at: row.at(0), onDrawnGround: true, layout: {radius: row.radius, spots: {}}, build: ({stage, heightAt}) => look.buildDaceStand(name, {stage, heightAt}),
      update: (group, seconds) => group.userData.update(seconds)};
  }])),
});

const NIGHT = Object.freeze({hemisphere: .22, sun: .09, environment: .14, fog: .07, sky: .06});

export function createOpenLookStand(app, view = () => globalThis.__render) {
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
      // The open land's own views stand a thing on the ground as it is drawn (road mats and the near ground lie a little off the
      // surface the rules read). A row that asks for it is lifted the same way.
      if (stood.onDrawnGround && stood.land.userData.drawnGroundHeightAt)
        stood.group.position.y = stood.land.userData.drawnGroundHeightAt(stood.at.x, stood.at.z) - scablandsSurfaceHeightAt(stood.at.x, stood.at.z);
      stood.update?.(stood.group, stood.seconds);
      if (stood.night && !dimmed) dim(scene);
    };
    scene.onAfterRender = function (...args) { undim(scene); after.apply(this, args); };
  }
  function clear() {
    if (!stood) return false;
    stood.restoreCamera?.();
    stood.group.parent?.remove(stood.group);
    stood.group.userData.dispose?.();
    stood.restoreGround();
    stood.land.userData.updateGroundView?.();
    stood = null;
    return true;
  }

  async function stand(name, {stage, seconds = 7.3, view: requestedView} = {}) {
    const switches = app._switches?.() ?? app.duel.featureFlags;
    if (switches.enabled('story-choices') !== true) throw Error('The open Scablands looks need the switch story-choices.');
    if (!Object.hasOwn(LOOKS, name)) throw Error('No look called ' + name);
    const look = await LOOKS[name](), {at, layout} = look, scene = view().scene, land = scablands();
    // Day and night share the same installed ground. Hot Delivery, used by
    // the look scenario, can borrow it here without starting an open job.
    let restoreGround = stood?.restoreGround;
    if (stood?.name === name && stood.land === land) {
      stood.restoreCamera?.();
      stood.group.removeFromParent();
      stood.group.userData.dispose?.();
    } else {
      clear();
      // An open outing already owns the real Nest at this spot. Borrow it so
      // clearing a QA view cannot remove or resurrect the arena's cut.
      if (scablandsGroundEdit.siteGround?.hasChunkAt(at.x, at.z)) {
        restoreGround = () => {};
      } else {
        restoreGround = installSiteGround(0, [name]);
        land.userData.updateGroundView?.();
      }
    }
    const group = look.build({stage, heightAt: (x, z) => scablandsSurfaceHeightAt(at.x + x, at.z + z)});
    group.position.set(at.x, 0, at.z);
    scene.add(group);
    hook(scene);
    stood = {name, group, update: look.update, seconds, night: stage === 'night', restoreGround, land, at, onDrawnGround: look.onDrawnGround === true};
    let low = Infinity, high = -Infinity;
    for (let z = -layout.radius; z <= layout.radius; z += 8) for (let x = -layout.radius; x <= layout.radius; x += 8) {
      const height = scablandsNaturalHeightAt(at.x + x, at.z + z); low = Math.min(low, height); high = Math.max(high, height);
    }
    const spots = Object.fromEntries(Object.entries(layout.spots).map(([id, spot]) => [id, {
      x: at.x + spot.x, y: scablandsSurfaceHeightAt(at.x + spot.x, at.z + spot.z), z: at.z + spot.z,
      looksAt: spot.looksAt ? {x: at.x + spot.looksAt.x, z: at.z + spot.looksAt.z,
        y: scablandsNaturalHeightAt(at.x + spot.looksAt.x, at.z + spot.looksAt.z) + spot.looksAt.y} : null}]));
    // Look north along the outside of the westernmost square, where the dune bends away from the lattice.
    if (name === 'rats-nest' && scablandsGroundEdit.siteGround) {
      let x = Math.floor(at.x / CHUNK_METRES) * CHUNK_METRES;
      while (scablandsGroundEdit.siteGround.hasChunkAt(x - 1, at.z)) x -= CHUNK_METRES;
      const z = Math.floor(at.z / CHUNK_METRES) * CHUNK_METRES;
      const edge = {x: x - .5, y: scablandsSurfaceHeightAt(x - .5, z + 6), z: z + 6,
        looksAt: {x, y: scablandsSurfaceHeightAt(x, z + 28) + .15, z: z + 28}};
      spots['ground-edge'] = edge;
      if (requestedView === 'ground-edge') {
        const camera = view().camera, target = edge.looksAt;
        // Like the scenario's other pictures, park in the hollow so the near window follows.
        const state = app.duel.state, hollow = spots['car-hollow'];
        const pose = app.duel.course.nearest(hollow.x, hollow.z);
        state.s = state.prevS = pose.s;
        state.lateral = state.prevLateral = pose.lateral;
        state.speedMph = state.yawVelocity = state.pushVelocity = state.headingError = 0;
        const previous = app.inspectionCamera, zoom = camera.zoom;
        const inspection = {position: [edge.x, edge.y + .35, edge.z], target: [target.x, target.y, target.z]};
        app.inspectionCamera = inspection;
        camera.position.fromArray(inspection.position);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        stood.restoreCamera = () => {
          if (app.inspectionCamera !== inspection) return;
          app.inspectionCamera = previous;
          camera.zoom = zoom;
          camera.updateProjectionMatrix();
        };
      }
    }
    return {name, stage, at: {x: at.x, z: at.z}, land: scablandsNaturalHeightAt(at.x, at.z), landFall: high - low, spots,
      draws: group.userData.draws, triangles: group.userData.triangles, lights: group.userData.lights.length};
  }
  return Object.freeze({stand, clear, at: seconds => { if (stood) stood.seconds = seconds; return !!stood; }});
}
