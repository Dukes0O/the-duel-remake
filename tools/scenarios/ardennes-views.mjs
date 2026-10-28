// P4-ARDENNES: actual native High/Performance art views and two-lap field.
// Existing browser harness, disposable memory-only App, no frame measurement.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeBundle} from './p4-panorama.mjs';

const names = ['La Fontaine', 'Red Water', 'The Wall', 'Kestrel Straight', 'Les Combes', 'Riverside', 'Stavelot', 'Bus Stop Exit'];


// The repaired full-field test driver must now finish without a player crash.
// Keep complete observer/CPU receipt consistency; the former Long Left exception
// is no longer an admission path.
export function ardennesPlayerCrashAccepted(setup, final, observer) {
  if (!observer?.restored || !Array.isArray(observer.playerEvents) || !Array.isArray(observer.incidents) ||
      !Array.isArray(observer.playerIncidents) || !Array.isArray(observer.cpuIncidents) ||
      !Number.isInteger(final.stageCrashes) || final.stageCrashes < 0) return false;
  const events = observer.playerEvents, incidents = observer.incidents;
  if (incidents.some(row => !row || !Number.isInteger(row.index) || row.index < -1 || row.index > 6)) return false;
  const player = incidents.filter(row => row.index === -1), cpu = incidents.filter(row => row.index >= 0);
  if (JSON.stringify(observer.playerIncidents) !== JSON.stringify(player) ||
      JSON.stringify(observer.cpuIncidents) !== JSON.stringify(cpu) ||
      player.length !== events.length || events.length !== final.stageCrashes) return false;
  return final.crashes === 0 && final.stageCrashes === 0 && events.length === 0;
}

// Reused selected-sweep/resolution-endpoint observer; no input or solver changes.
function installArdennesObserver(duel) {
  const {sweepObstacle, sceneryIdentity, offroadCapability} = window.__panQa;
  let originalContactDescriptor, originalRoadDescriptor, activeContact = null, lastResolution = null, unsubscribe;
  const playerEvents = [], resolutions = [];
  originalContactDescriptor = Object.getOwnPropertyDescriptor(duel, '_staticContacts');
  originalRoadDescriptor = Object.getOwnPropertyDescriptor(duel, '_roadPosition');
  const originalContact = duel._staticContacts, originalRoad = duel._roadPosition;
  duel._staticContacts = function (car, player, ...args) {
    const previous = activeContact;
    if (player && car === this.state && !car.crushed && !car.combatWrecking && !car.tumble) {
      if (offroadCapability(this.car) !== null) throw Error('Expected ordinary 959 contact path');
      const oldS = car.prevS ?? car.s, oldLateral = car.prevLateral ?? car.lateral;
      const start = this.course.worldAt(oldS, oldLateral), end = this.course.worldAt(car.s, car.lateral);
      if (car.airborne || car.airHeight > 0 || car.prevAirHeight > 0 || car.groundHeight != null) {
        start.y = (car.prevGroundHeight ?? this.course.groundAt(oldS, oldLateral).y) + (car.prevAirHeight ?? car.airHeight ?? 0);
        end.y = (car.groundHeight ?? this.course.groundAt(car.s, car.lateral).y) + (car.airHeight || 0);
      } else start.y = end.y = undefined;
      activeContact = {start, end, oldS, oldLateral, distance: car.s, verifiable: true,
        heading: this.course.at(car.s).heading + (car.headingError || 0) + (car.dir < 0 ? Math.PI : 0) + (car.slipAngle || 0),
        dimensions: {...this._vehicleSpec(car), useModelBounds: !!(car.airborne || car.airHeight > 0 || car.prevAirHeight > 0)}};
      lastResolution = null;
    } else activeContact = null;
    try {return originalContact.call(this, car, player, ...args);} finally {activeContact = previous;}
  };
  duel._roadPosition = function (point, reference, ...args) {
    const result = originalRoad.call(this, point, reference, ...args);
    if (!activeContact) return result;
    const before = JSON.stringify(this.state), context = activeContact, car = this.state;
    const candidates = [];
    let first = null;
    for (const obstacle of this._obstacles(context.oldS, context.distance)) {
      if (this._brokenSceneryIds?.has(sceneryIdentity(obstacle)) || this._brokenSnowmanIds?.has(obstacle.snowmanId)) continue;
      if (obstacle.kind === 'tree' && obstacle.theme === 'desert' && this._fallenCactusIds?.has(obstacle.id)) continue;
      if (obstacle.snowmanId && Math.hypot(context.end.x - context.start.x, context.end.z - context.start.z) < .0001) continue;
      const start = obstacle.verticalClearance && !Number.isFinite(context.start.y) ? {...context.start,
        y: (car.prevGroundHeight ?? this.course.groundAt(context.oldS, context.oldLateral).y) + (car.prevAirHeight ?? car.airHeight ?? 0)} : context.start;
      const end = obstacle.verticalClearance && !Number.isFinite(context.end.y) ? {...context.end,
        y: (car.groundHeight ?? this.course.groundAt(context.distance, car.lateral).y) + (car.airHeight || 0)} : context.end;
      const hit = sweepObstacle(start, end, obstacle, context.heading, context.dimensions);
      if (hit) {candidates.push(hit); if (!first || hit.t < first.t) first = hit;}
    }
    let expected = null, stop = null;
    if (first) {
      const {t, nx, nz, penetration} = first, dx = context.end.x - context.start.x, dz = context.end.z - context.start.z;
      stop = {x: context.start.x + dx * t + nx * (penetration + .04), z: context.start.z + dz * t + nz * (penetration + .04),
        y: Number.isFinite(context.start.y) ? context.start.y + (context.end.y - context.start.y) * t : undefined};
      const remainingX = dx * (1 - t), remainingZ = dz * (1 - t), inward = Math.min(0, remainingX * nx + remainingZ * nz);
      expected = first.inside ? stop : {x: stop.x + remainingX - nx * inward, z: stop.z + remainingZ - nz * inward, y: context.end.y};
    }
    const verified = context.verifiable && expected && point.x === expected.x && point.z === expected.z && point.y === expected.y;
    const facts = hit => {
      const match = /^kit-solid-(\d+)-/.exec(hit.obstacle.id || '');
      const placement = match ? this.course.def.kitPlacements[Number(match[1])] : null;
      const authoredPlacement = placement && hit.obstacle.id === 'kit-solid-' + match[1] + '-' + placement.id ? {...placement} : null;
      return {id: hit.obstacle.id, kind: hit.obstacle.kind, barrier: !!hit.obstacle.barrier,
        kitSolid: !!hit.obstacle.kitSolid, s: hit.obstacle.s, off: hit.obstacle.off,
        x: hit.obstacle.x, z: hit.obstacle.z, heading: hit.obstacle.heading,
        halfX: hit.obstacle.halfX, halfZ: hit.obstacle.halfZ, t: hit.t, nx: hit.nx, nz: hit.nz,
        penetration: hit.penetration, inside: hit.inside, authoredPlacement};
    };
    lastResolution = {time: car.stageTimeSec, verified: !!verified,
      selectedProp: verified ? facts(first) : null, candidates: candidates.map(facts),
      start: {...context.start}, end: {...context.end}, dimensions: {...context.dimensions}, heading: context.heading,
      actualResolutionEnd: {...point}, expectedResolutionEnd: expected, actualRoadPose: {...result}};
    resolutions.push(lastResolution);
    if (verified) {context.start = stop; context.end = {...point};}
    else context.verifiable = false;
    if (JSON.stringify(this.state) !== before) throw Error('Contact observer wrote native state');
    return result;
  };
  unsubscribe = duel.onChange((state, event) => {
    if (!event.crash) return;
    const before = JSON.stringify(state);
    playerEvents.push(JSON.parse(JSON.stringify({completedLaps: state.completedLaps, time: state.stageTimeSec, s: state.s, lateral: state.lateral,
      majorCrashes: state.majorCrashes, lastCrashReason: state.lastCrashReason, crashSite: state.crashSite,
      event, contact: activeContact ? lastResolution : null,
      propIdentityVerified: !!(activeContact && lastResolution?.verified && lastResolution.selectedProp.kind === event.crash),
      piece: duel.course.script.pieceAt(duel.course.phase(state.s))})));
    if (JSON.stringify(state) !== before) throw Error('Crash observer wrote native state');
  });
  let receipt;
  return () => {
    if (receipt) return receipt;
    unsubscribe();
    for (const [name, descriptor] of [['_staticContacts', originalContactDescriptor], ['_roadPosition', originalRoadDescriptor]]) {
      if (descriptor) Object.defineProperty(duel, name, descriptor); else delete duel[name];
      const current = Object.getOwnPropertyDescriptor(duel, name);
      if (current?.value !== descriptor?.value || current?.get !== descriptor?.get || current?.set !== descriptor?.set ||
          current?.writable !== descriptor?.writable || current?.configurable !== descriptor?.configurable ||
          current?.enumerable !== descriptor?.enumerable) throw Error('Contact observer restoration failed');
    }
    const incidents = duel.state.field.stats.crashes.map(row => ({...row}));
    if (incidents.some(row => !Number.isInteger(row.index) || row.index < -1 || row.index > 6))
      throw Error('Unknown native field crash index');
    receipt = {restored: true, playerEvents, resolutionCount: resolutions.length, incidents,
      playerIncidents: incidents.filter(row => row.index === -1), cpuIncidents: incidents.filter(row => row.index >= 0)};
    return receipt;
  };
}

export async function run(context) {
  const report = {passed: false, qualities: [], captures: [], failures: [], observers: []};
  const persist = () => writeFile(join(context.outputDir, 'ardennes-views.json'), JSON.stringify(report, null, 2) + '\n');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const bundle = await nativeBundle();
  try {
    for (const quality of (process.env.ARDENNES_VIEW_QUALITIES ?? 'high,performance').split(',')) {
      await context.navigate('/tools/menu-check.html?flags=grand-prix,ardennes-forest');
      await context.waitFor('window.__qaApp?.visualReady && !!window.__render', 'memory-only Ardennes menu', 60000);
      await context.evaluate(bundle);
      const setup = await context.evaluate(`(() => {
        const app = window.__qaApp;
        if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Memory-only QA required');
        window.__panQa.ownTestCourses(app); app.audio.setMuted(true); app.setGraphicsQuality(${JSON.stringify(quality)});
        const stage = [...document.querySelector('#scene-select').options].map(option => Number(option.value))
          .find(index => app.getMenuCourse(index)?.def.id === 'ardennes-forest');
        if (!Number.isSafeInteger(stage) || !app.startCampaign({mode: 'grandprix', startStage: stage,
          car: 'stuttgart_959s', seed: 1989, fieldSeed: 1000, cpuDifficulty: 'medium', difficulty: 'casual'}))
          throw Error('Native Ardennes start rejected');
        app.stop(); app.autopilot = true; app._scriptedCrashDone = true; window.__panQa.useRacingLine(app, .95);
        app.onFrame?.(app.duel.state, 0); app.duel.state.field.deferFinish = true;
        const d = app.duel, s = d.state;
        if (s.opponents.length !== 7 || s.lapsTotal !== 2 || s.traffic.length || d.course.features.radarTraps.length || s.police.pursuit)
          throw Error('Native eight-car two-lap grid missing');
        document.head.insertAdjacentHTML('beforeend', '<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
        return {id: d.course.def.id, seed: s.seed, fieldSeed: s.fieldSeed, nativeFieldSize: 1 + s.opponents.length,
          car: s.car, cpuDifficulty: s.cpuDifficulty, lineSkill: .95, stock: Object.keys(s.upgrades).length > 0 && Object.values(s.upgrades).every(value => value === 0),
          placement: {...d.course.def.kitPlacements[1901]}, length: d.course.length, laps: s.lapsTotal, kits: d.course.def.kitPlacements.length};
      })()`);
      await context.waitFor('(()=>{window.__render.renderFrame();return window.__qaApp.visualReady && document.querySelector("#view3d").dataset.trackKitAsset==="ready";})()', quality + ' real kits', 90000);
      await context.evaluate('window.__finishArdennesObserver = (' + installArdennesObserver.toString() + ')(window.__qaApp.duel)');
      try {
      const witness = await context.evaluate(`(() => {
        const a = window.__qaApp, v = window.__render, before = JSON.stringify(a.duel.state), profile = JSON.stringify(a.profile);
        v.renderFrame(); const kits = v.scene.getObjectByName('Approved track kits');
        if (!kits?.children.length || !v.scene.getObjectByName('Ardennes red-brown stream')) throw Error('Actual Ardennes scenery missing');
        if (JSON.stringify(a.duel.state) !== before || JSON.stringify(a.profile) !== profile) throw Error('Render wrote race or profile');
        return {kitChildren: kits.children.length, renderedStateUnchanged: true};
      })()`);
      async function capture(name, phase) {
        const camera = await context.evaluate(`(() => {
          const a = window.__qaApp, c = a.duel.course, s = a.duel.state;
          if (${JSON.stringify(name)} === 'Kestrel Underbridge') {
            const bridge = c.def.kitPlacements.find(row => row.id === 'forest-footbridge');
            if (!bridge || s.completedLaps !== 0 || s.s < bridge.s - 24 || s.s >= bridge.s - 18)
              throw Error('Actual first-lap footbridge approach was not reached');
            window.__render.renderFrame();
            const ground = c.groundAt(s.s, s.lateral);
            const roots = window.__render.scene.children.filter(root => root.visible && root.userData?.vehicleKey === s.car &&
              root.position.x === ground.x && root.position.z === ground.z);
            if (roots.length !== 1) throw Error('Actual rendered player root is missing or ambiguous');
            const root = roots[0]; root.updateWorldMatrix(true, false);
            const eye = root.localToWorld(root.position.clone().set(0, 1.05, 0));
            const target = root.localToWorld(root.position.clone().set(0, 1.05, 18));
            const playerCamera = {kind: 'actual-player-eye', bridgeS: bridge.s, s: s.s, lateral: s.lateral,
              eyeHeight: 1.05, rootMatrix: root.matrixWorld.toArray(), eye: eye.toArray(), target: target.toArray()};
            a.inspectionCamera = {position: playerCamera.eye, target: playerCamera.target};
            window.__render.renderFrame();
            return {position: a.inspectionCamera.position, playerCamera};
          }
          if (${JSON.stringify(name)} === 'Beech Grove' || ${JSON.stringify(name)} === 'Kestrel Wide') {
            if (s.completedLaps !== 1) throw Error('Beech view requires the actual clear second lap');
            const group=window.__render.scene.getObjectByName('Approved track kits');
            const kestrel=c.script.pieces.find(piece=>piece.name==='Kestrel Straight');
            const rows=group?.userData.trackKitPlacements;
            const choices=(rows??[]).map((row,index)=>({row,index})).filter(({row})=>row.id==='ardennes-beech'&&row.s>=kestrel.s0&&row.s<=kestrel.s1);
            // The thickest beech group on the straight (most beeches within 22 m of one of them, then nearest its middle).
            const byId=new Map(c.features.trees.map(tree=>[tree.id,tree]));
            const crowd=row=>{const own=byId.get(row.scenery.id);return choices.filter(({row:other})=>{const t=byId.get(other.scenery.id);
              return Math.sign(t.off)===Math.sign(own.off)&&Math.hypot(t.x-own.x,t.z-own.z)<=22;}).length;};
            choices.sort((a,b)=>crowd(b.row)-crowd(a.row)||Math.abs(a.row.s-(kestrel.s0+kestrel.s1)/2)-Math.abs(b.row.s-(kestrel.s0+kestrel.s1)/2)||a.row.scenery.id.localeCompare(b.row.scenery.id));
            const chosen=choices[0];
            if (!chosen) throw Error('No actual bound Kestrel beech group');
            const tree=byId.get(chosen.row.scenery.id);
            if (!tree) throw Error('Beech has no original simulation tree identity');
            const side=Math.sign(tree.off)||1, wide=${JSON.stringify(name)}==='Kestrel Wide';
            const group22=choices.map(({row})=>byId.get(row.scenery.id)).filter(t=>Math.sign(t.off)===side&&Math.hypot(t.x-tree.x,t.z-tree.z)<=22);
            const centre={x:group22.reduce((n,t)=>n+t.x,0)/group22.length,z:group22.reduce((n,t)=>n+t.z,0)/group22.length,s:group22.reduce((n,t)=>n+t.s,0)/group22.length,off:group22.reduce((n,t)=>n+t.off,0)/group22.length};
            // Close view: from beside the road inside the catch fence, looking at the group from the spot along the road with the
            // fewest firs between (counted on the map). Wide view: back along the straight and higher.
            const beechIds=new Set(choices.map(({row})=>row.scenery.id)), firs=c.features.trees.filter(t=>!beechIds.has(t.id)&&Math.abs(t.s-centre.s)<120);
            const blocked=(eyeS0,off0)=>{const p0=c.groundAt(eyeS0,off0);return firs.filter(t=>{
              const dx=centre.x-p0.x,dz=centre.z-p0.z,len2=dx*dx+dz*dz,u=((t.x-p0.x)*dx+(t.z-p0.z)*dz)/len2;
              return u>.05&&u<.95&&Math.hypot(t.x-(p0.x+u*dx),t.z-(p0.z+u*dz))<1.5+t.scale;}).length;};
            const eyeOff=side*(c.roadHalfWidthAt(centre.s)+(wide?6:10));
            let eyeS=centre.s-55;
            if(!wide){let best=Infinity;for(let d=-45;d<=45;d+=3){const n=blocked(centre.s+d,eyeOff);if(n<best){best=n;eyeS=centre.s+d;}}}
            const e=c.groundAt(eyeS,eyeOff);
            const ground=window.__panQa.renderedGroundHeight(c,{...e,s:eyeS,off:eyeOff},{requireSurface:true});
            const targetGround=window.__panQa.renderedGroundHeight(c,{x:centre.x,z:centre.z,s:centre.s,off:centre.off},{requireSurface:true});
            if (![ground,targetGround].every(Number.isFinite)) throw Error('Beech camera has no actual drawn ground');
            const eyeHeight=wide?7:4.5,targetHeight=wide?8:6.5;
            a.inspectionCamera={position:[e.x,ground+eyeHeight,e.z],target:[centre.x,targetGround+targetHeight,centre.z]};window.__render.renderFrame();
            return {position:a.inspectionCamera.position,closeView:{kind:wide?'actual-kestrel-wide':'actual-beech-grove',station:tree.s,
              eyeS,eyeOff,eyeGround:ground,eyeHeight,targetHeight,target:a.inspectionCamera.target,treeId:tree.id,placementIndex:chosen.index,
              fenceToTree:Math.abs(tree.off)-c.roadHalfWidthAt(tree.s)-14.3,groupBeeches:group22.length,groupCentre:centre,
              tree:{s:tree.s,off:tree.off,x:tree.x,y:tree.y,z:tree.z,heading:tree.heading,scale:tree.scale},groupCount:choices.length}};
          }
          if (${JSON.stringify(name)} === 'Stream From Car') {
            // The actual player car at the Red Water crossing; the eye keeps the car's place on the road, raised, and looks along the stream.
            if (s.completedLaps !== 1) throw Error('Stream car view requires the actual clear second lap');
            const bridge = c.def.kitPlacements.find(row => row.id === 'stone-stream-bridge');
            // Level with the stream line, from the road edge beside the car and a little above the fence, looking up the channel toward the arch.
            const eyeOff = s.lateral + 6, eye = c.groundAt(bridge.s, eyeOff), eyeGround = window.__panQa.renderedGroundHeight(c, {...eye, s: bridge.s, off: eyeOff}, {requireSurface: true});
            const aim = c.groundAt(bridge.s, bridge.lateral - 8), aimGround = window.__panQa.renderedGroundHeight(c, {...aim, s: bridge.s, off: bridge.lateral - 8}, {requireSurface: true});
            if (![eyeGround, aimGround].every(Number.isFinite)) throw Error('Stream car view has no actual drawn ground');
            a.inspectionCamera = {position: [eye.x, eyeGround + 3.4, eye.z], target: [aim.x, aimGround - .6, aim.z]};
            window.__render.renderFrame();
            return {position: a.inspectionCamera.position, closeView: {kind: 'actual-stream-from-car', station: s.s, lateral: s.lateral,
              bridgeS: bridge.s, eyeOff, eyeGround, eyeHeight: 3.4, target: a.inspectionCamera.target}};
          }
          if (['Stone Bridge Stream', 'Village Streets'].includes(${JSON.stringify(name)})) {
            if (s.completedLaps !== 1) throw Error('Close art view requires the actual clear second lap');
            const bridge = c.def.kitPlacements.find(row => row.id === 'stone-stream-bridge');
            const town = c.def.circuitLandmarks.find(row => row.id === 'stavelot-valley-town');
            const village = ${JSON.stringify(name)} === 'Village Streets';
            if (!bridge || !town?.streets?.length) throw Error('Actual close-view descriptors missing');
            const station = village ? town.s - 30 : bridge.s;
            // Bridge: stand on the bank beside the water, a little toward the road, and look at the arch with the stream in front of it.
            const eyeS = village ? station - 40 : station + 6.5, eyeOff = village ? -2 : bridge.lateral - 12;
            const targetS = village ? station + 20 : station - .5, targetOff = village ? 38 : bridge.lateral - 2;
            const e = c.groundAt(eyeS, eyeOff), t = c.groundAt(targetS, targetOff);
            const ground = window.__panQa.renderedGroundHeight(c, {...e, s: eyeS, off: eyeOff}, {requireSurface: true});
            const targetGround = window.__panQa.renderedGroundHeight(c, {...t, s: targetS, off: targetOff}, {requireSurface: true});
            if (![ground, targetGround].every(Number.isFinite)) throw Error('Close view has no actual drawn ground');
            a.inspectionCamera = {position: [e.x, ground + (village ? 35 : 2.1), e.z], target: [t.x, targetGround + (village ? 1.5 : 1.7), t.z]};
            window.__render.renderFrame();
            return {position: a.inspectionCamera.position, closeView: {kind: village ? 'actual-town-streets' : 'actual-stone-bridge-stream',
              station, eyeS, eyeOff, eyeGround:ground, eyeHeight:village?35:2.1, targetGround, targetHeight:village?1.5:1.7, targetS, targetOff, target: a.inspectionCamera.target,
              ...(village ? {streets: town.streets.length} : {bridge: {...bridge}, stream: {...c.def.effects.stream}})}};
          }
          const piece = c.script.pieces.find(piece => piece.name === ${JSON.stringify(name)});
          if (!piece) throw Error('Missing authored view');
          const at = ${JSON.stringify(name)} === 'Pit Straight' ? 0 : Math.max(0, piece.s0 - 35);
          const off = -32;
          const e = c.groundAt(at, off);
          const targetS = ${JSON.stringify(name)} === 'Stavelot' ? c.def.circuitLandmarks.find(row => row.id === 'stavelot-valley-town').s : piece.s0 + 25;
          const targetOff = ${JSON.stringify(name)} === 'Stavelot' ? c.def.circuitLandmarks.find(row => row.id === 'stavelot-valley-town').lateral : ${JSON.stringify(name)} === 'Red Water' ? 36 : 0;
          const t = c.groundAt(targetS, targetOff);
          const ground = window.__panQa.renderedGroundHeight(c, {...e, s: at, off}, {requireSurface: true});
          const targetGround = window.__panQa.renderedGroundHeight(c, {...t, s: targetS, off: targetOff}, {requireSurface: true});
          if (![ground, targetGround].every(Number.isFinite)) throw Error('View lacks actual rendered ground');
          a.inspectionCamera = {position: [e.x, ground + 18, e.z], target: [t.x, targetGround + 3, t.z]};
          window.__render.renderFrame(); return {position: a.inspectionCamera.position};
        })()`);
        await context.waitFor(`(()=>{const c=window.__render.camera,p=${JSON.stringify(camera.position)};window.__render.renderFrame();return Math.hypot(c.position.x-p[0],c.position.y-p[1],c.position.z-p[2])<.001;})()`, 'actual ground camera', 10000);
        const facts = await context.evaluate(`(() => {
          const a = window.__qaApp, d = a.duel, s = d.state, c = d.course, before = JSON.stringify(s), profile = JSON.stringify(a.profile);
          window.__render.renderFrame(); if (JSON.stringify(s) !== before || JSON.stringify(a.profile) !== profile) throw Error('Photo changed native state');
          const distance = s.s, light = window.__panQa.sampleCourseLightPath(c, {distance});
          const cars = window.__render.scene.children.filter(node => node.visible && node.userData.vehicleKey);
          return {s: s.s, time: s.stageTimeSec, laps: s.completedLaps, distance, fogNear: light.settings.fogNear,
            nativeFieldSize: 1 + s.opponents.length, nativeCars: cars.length,
            camera: window.__render.camera.position.toArray(), stateUnchanged: true};
        })()`);
        const file = 'ardennes-' + name.toLowerCase().replaceAll(' ', '-') + '-' + quality + '-' + phase;
        await context.screenshot(file); report.captures.push({quality, name, phase, file: file + '.png', ...facts, ...(camera.playerCamera ? {playerCamera: camera.playerCamera} : {}), ...(camera.closeView ? {closeView: camera.closeView} : {})}); await persist();
      }
      await capture('Pit Straight', 'mist-grid');
      const targets = await context.evaluate(`(() => {
        const c=window.__qaApp.duel.course, targets=${JSON.stringify(names)}.map(name=>({name,s:c.script.pieces.find(piece=>piece.name===name).s0}));
        const bridge=c.def.kitPlacements.find(row=>row.id==='forest-footbridge');
        if(!bridge)throw Error('Authored Kestrel footbridge is missing');
        targets.splice(targets.findIndex(row=>row.name==='Kestrel Straight')+1,0,{name:'Kestrel Underbridge',s:bridge.s-24});
        return targets;
      })()`);
      const closeTargets = await context.evaluate(`(() => {
        const c=window.__qaApp.duel.course;
        const kestrel=c.script.pieces.find(piece=>piece.name==='Kestrel Straight');
        const rows=window.__render.scene.getObjectByName('Approved track kits').userData.trackKitPlacements;
        const trees=rows.filter(row=>row.id==='ardennes-beech'&&row.s>=kestrel.s0&&row.s<=kestrel.s1);
        trees.sort((a,b)=>Math.abs(a.s-(kestrel.s0+kestrel.s1)/2)-Math.abs(b.s-(kestrel.s0+kestrel.s1)/2)||a.scenery.id.localeCompare(b.scenery.id));
        if(!trees.length)throw Error('Actual bound Kestrel beech view missing');
        const bridge=c.def.kitPlacements.find(row=>row.id==='stone-stream-bridge');
        return [{name:'Beech Grove',s:trees[0].s},{name:'Kestrel Wide',s:trees[0].s-60},{name:'Stone Bridge Stream',s:bridge.s},{name:'Stream From Car',s:bridge.s-4},
          {name:'Village Streets',s:c.def.circuitLandmarks.find(row=>row.id==='stavelot-valley-town').s}].sort((a,b)=>a.s-b.s);
      })()`);
      let closeIndex = 0;
      const progress = []; let targetIndex = 0, clear = false;
      for (let batch = 0; batch < 70; batch++) {
        const target = targets[targetIndex]?.s ?? null;
        const closeTarget = closeTargets[closeIndex]?.s ?? null;
        const result = await context.evaluate(`(() => {
          const a=window.__qaApp,d=a.duel,s=d.state,target=${JSON.stringify(target)},closeTarget=${JSON.stringify(closeTarget)};
          for(let i=0;i<600;i++) {
            if(!['racing','countdown'].includes(s.status) || s.completedLaps>=2&&s.opponents.every(r=>r.finished))break;
            if(target!==null&&s.completedLaps===0&&s.s>=target)break;
            if(closeTarget!==null&&s.completedLaps===1&&d.course.phase(s.s)>=closeTarget)break;
            a.advance(1/60,1/60);
          }
          const before=JSON.stringify(s);window.__render.renderFrame();if(JSON.stringify(s)!==before)throw Error('Render wrote race');
          if(![s,...s.opponents].every(r=>[r.s,r.lateral,r.speedMph].every(Number.isFinite)))throw Error('Nonfinite native racer');
          return {status:s.status,time:s.stageTimeSec,s:s.s,laps:s.completedLaps,finished:s.opponents.filter(r=>r.finished).length,
            lapTimes:[...s.lapTimes],crashes:s.majorCrashes,stageCrashes:s.stageCrashes,resets:s.boundaryResets,
            firstLapPileUp:new Set(s.field.stats.crashes.filter(crash=>crash.t<=30).map(crash=>crash.index)).size>=3,
            allDone:s.completedLaps>=2&&s.opponents.every(r=>r.finished)};
        })()`);
        progress.push(result);
        if(target!==null&&result.laps===0&&result.s>=target) {await capture(targets[targetIndex].name,'first-lap');targetIndex++;}
        if(result.laps>=1&&!clear) {await capture('Pit Straight','clear-second-lap');clear=true;}
        if(closeTarget!==null&&result.laps===1&&result.s-setup.length>=closeTarget) {
          await capture(closeTargets[closeIndex].name,'clear-second-lap');closeIndex++;
        }
        if(result.allDone||!['racing','countdown'].includes(result.status))break;
      }
      const final = progress.at(-1), observer = await context.evaluate('window.__finishArdennesObserver()');
      const playerAccepted = ardennesPlayerCrashAccepted(setup, final, observer);
      report.qualities.push({quality,...setup,witness,progress,final,observer,playerAccepted, knownPlayerException: false}); await persist();
      if (!final?.allDone || final.laps !== 2 || final.finished !== 7 || !playerAccepted || final.resets !== 0 || final.firstLapPileUp)
        report.failures.push({quality, error: 'Native Ardennes field did not finish: '+JSON.stringify(final)});
      if (targetIndex !== targets.length || !clear) throw Error('Native required art views were not reached');
      if (closeIndex !== closeTargets.length) throw Error('Native clear close views were not reached');
      } finally {
        const observer = await context.evaluate('window.__finishArdennesObserver()');
        report.observers.push({quality, ...observer}); await persist();
      }
    }
    if (report.failures.length) throw Error(report.failures.map(failure => failure.error).join('\n'));
    report.passed = true;
  } finally {await persist();}
  console.log('Ardennes native field and actual High/Performance art views complete. No frame timing.');
}
