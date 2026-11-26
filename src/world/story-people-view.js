// Only the world job moves a person's feet across the land. Gaze, weight,
// breathing, gestures and the point above the head belong to the presentation.
import * as THREE from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';
import {clone as cloneSkin} from 'three/addons/utils/SkeletonUtils.js';
import {disposeFigureAsset} from '../rigged-fighter.js';
import {createHandcartView, createCampStool} from './handcart-view.js';
import {HANDCART, STORY_FIGURES, attendTo} from './jobs/story-people.js';

const WALKERS = '/assets/models/wasteland/town/story-walkers.glb';
const FOLK = '/assets/models/wasteland/scablands/folk.glb';
const CINDER = '/assets/models/wasteland/crew/cinder.glb';
const rotation = new THREE.Quaternion(), angles = new THREE.Euler(0, 0, 0, 'YXZ');
const foot = new THREE.Vector3(), up = new THREE.Vector3();
const EMPTY = Object.freeze([]);
const SIDES = Object.freeze([['L', -1], ['R', 1]]);


const TIN_PEOPLE = '/assets/models/wasteland/town/open-figures.glb';
const tinCast = new Set(['odessa', 'moss', 'tin-cook', 'tin-porter', 'tin-child']);

function sourceFor(id) {
  if (tinCast.has(id)) return TIN_PEOPLE;
  if (STORY_FIGURES[id].family === 'open-figures-2') return OPEN_FIGURES_2;
  if (id === 'cinder') return CINDER;
  if (id === 'clinker' || id === 'auntie-solder') return FOLK;
  return WALKERS;
}

function poseBone(joint, pitch = 0, yaw = 0, roll = 0) {
  // Gestures are authored about the standing figure's axes. In these rigs a
  // thigh bone points down and the opposite arm's bind axes are mirrored.
  rotation.setFromEuler(angles.set(pitch, yaw, roll));
  joint.bone.quaternion.copy(joint.inverse).multiply(rotation).multiply(joint.parent).multiply(joint.rest);
}

// The stock folk kit joins each person's goggles, apron and shoulder plates
// into a rigid outfit. Bind the pieces where they are worn so the glasses
// follow the head and the split coat bends when the wearer sits.
function bindClothing(model, body, joint, owned) {
  const garments = [];
  model.traverse(node => { if (node.isMesh && !node.isSkinnedMesh) garments.push(node); });
  const bounds = new THREE.Box3().setFromObject(body, true);
  const height = bounds.max.y - bounds.min.y;
  const transform = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3(), n = new THREE.Vector3();
  const fromBind = body.skeleton.bones.map((bone, index) => new THREE.Matrix4()
    .multiplyMatrices(body.matrixWorld, body.bindMatrixInverse)
    .multiply(bone.matrixWorld).multiply(body.skeleton.boneInverses[index]).multiply(body.bindMatrix));
  const localScale = new THREE.Vector3(), inverse = new THREE.Matrix4();
  for (const garment of garments) {
    const box = new THREE.Box3().setFromObject(garment,true);
    const tall = box.max.y-box.min.y > .26*height;
    const size = garment.getWorldScale(localScale);
    // The old apron is a box with corners only. Add rows of vertices to let
    // the leather lie across the lap and hang down over the shins.
    const geom = tall
      ? new TessellateModifier(.12/Math.max(size.x,size.y,size.z),6).modify(garment.geometry)
      : garment.geometry.clone();
    const points = geom.getAttribute('position'), normals = geom.getAttribute('normal');
    const indices = new Uint16Array(points.count * 4);
    const weights = new Float32Array(points.count * 4);
    for (let i = 0; i < points.count; i++) {
      up.fromBufferAttribute(points, i).applyMatrix4(garment.matrixWorld);
      const h = (up.y - bounds.min.y) / height, side = up.x < 0 ? 'L' : 'R';
      let a='chest', b='chest', mix = 0;
      if (h>.86) a=b='head';
      else if (h<.39) {a='shin'+side; b='thigh'+side; mix=THREE.MathUtils.smoothstep(h,.25,.39);}
      else if (h<.57) {a='thigh'+side; b='pelvis'; mix=THREE.MathUtils.smoothstep(h,.43,.57);}
      else if (h<.67) {a='pelvis'; b='chest'; mix=THREE.MathUtils.smoothstep(h,.57,.67);}
      const first = joint[a].index, second = joint[b].index;
      // The folk kit carries its original line-up in the bind matrices. Undo
      // the complete weighted bind transform at this garment point.
      for (let element=0;element<16;element++) inverse.elements[element] =
        (1-mix)*fromBind[first].elements[element]+mix*fromBind[second].elements[element];
      inverse.invert();
      up.applyMatrix4(inverse);
      points.setXYZ(i, up.x, up.y, up.z);
      if (normals) {
        transform.multiplyMatrices(inverse, garment.matrixWorld);
        n.fromBufferAttribute(normals, i).applyNormalMatrix(normalMatrix.getNormalMatrix(transform));
        normals.setXYZ(i, n.x, n.y, n.z);
      }
      indices[i*4]=first; weights[i*4]=1-mix;
      indices[i*4+1]=second; weights[i*4+1]=mix;
    }
    geom.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geom.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const bound = new THREE.SkinnedMesh(geom, garment.material);
    bound.name = garment.name;
    bound.frustumCulled = false;
    bound.bind(body.skeleton, body.bindMatrix);
    bound.position.copy(body.position);
    bound.quaternion.copy(body.quaternion);
    bound.scale.copy(body.scale);
    body.parent.add(bound);
    garment.removeFromParent();
    owned.push(geom);
  }
}

// Sample the actual boot hull in directions reached by the gait. An ankle
// alone sits at the same height when a swinging toe has gone into the ground.
function soleVertices(body, floor, height) {
  const best = [new Map(), new Map()];
  const directions = [[0,0],[0,-3],[0,-1],[0,1],[0,3],[-1,0],[1,0]];
  for (let i = 0; i < body.geometry.attributes.position.count; i++) {
    body.getVertexPosition(i, foot).applyMatrix4(body.matrixWorld);
    if (foot.y > floor + height * .16) continue;
    const side = best[Number(foot.x > 0)];
    for (const [j, [x,z]] of directions.entries()) {
      const score = foot.y + x * foot.x + z * foot.z;
      if (!side.has(j) || score < side.get(j).score) side.set(j, {index:i, score});
    }
  }
  return [...new Set(best.flatMap(side => [...side.values()].map(point => point.index)))];
}

function makeFigure(id, asset) {
  const profile = STORY_FIGURES[id], source = sourceFor(id);
  const piece = source === FOLK
    ? asset.scene.getObjectByName(id === 'clinker' ? 'ash-man-raider-1_root' : 'auntie-solder_root')
    : asset.scene;
  if (!piece) throw new Error('Story cast is missing ' + id);
  const model = cloneSkin(piece);
  model.position.set(0, 0, 0);
  const removed = [];
  const props = [];
  let body;
  model.traverse(node => {
    if (source === TIN_PEOPLE && node.isMesh && !node.isSkinnedMesh) {
      const [owner, action] = node.name.split('_');
      if (owner !== id) removed.push(node);
      else if (action !== 'wear') props.push({node, action});
    }
    if (!node.isSkinnedMesh) return;
    if (((source === WALKERS || source === TIN_PEOPLE || source === OPEN_FIGURES_2) && node.name !== 'skin-' + profile.asset) ||
        (source === CINDER && node.name.includes('-far'))) removed.push(node);
    else body = node;
  });
  for (const mesh of removed) { mesh.removeFromParent(); mesh.skeleton?.dispose(); }
  if (!body) throw new Error('Story cast has no bound body for ' + id);
  // Loose task implements live in the same GLB. Fit only the dressed body to its profile.
  const looseTools = {};
  if (source === OPEN_FIGURES_2) {
    for (const node of [...model.children]) {
      if (!node.name.startsWith('implement-')) continue;
      node.removeFromParent();
      looseTools[node.name.slice(10)] = node;
      node.visible = false;
    }
  }
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source === TIN_PEOPLE ? body : model, true);
  const height = bounds.max.y - bounds.min.y;
  const scale = profile.height / height;
  model.scale.multiplyScalar(scale);
  model.scale.x *= profile.width;
  model.position.y -= bounds.min.y * scale;
  const root = new THREE.Group();
  root.name = 'story-person-' + id;
  root.add(model);
  root.updateMatrixWorld(true);
  const joints = {};
  for (const [index, bone] of body.skeleton.bones.entries()) {
    const name = bone.name.replace(/_\d+$/, '').replace(/\./g, '');
    const parent = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    joints[name] = {bone, index, rest: bone.quaternion.clone(), parent, inverse: parent.clone().invert()};
  }
  const owned = [];
  if (source === FOLK) bindClothing(model, body, joints, owned);
  model.traverse(node => {
    if (!node.isMesh) return;
    node.castShadow = node.receiveShadow = true;
    node.frustumCulled = false; // the bounded actor root handles distance culling
  });
  const anchor = new THREE.Object3D();
  anchor.name = 'story-bubble-' + id;
  joints.head.bone.add(anchor);
  anchor.position.copy(joints.head.bone.worldToLocal(up.set(0, profile.height + .12, 0)));
  const soles = soleVertices(body, 0, profile.height);
  const work = source === OPEN_FIGURES_2 ? prepareWorkKit(root, body, joints, looseTools, id) : null;
  return {root, model, joints, body, owned, soles, props, work, baseY:model.position.y, facing: {yaw:0, headYaw:0},
    first:true, seated:0, asleep:0, armReach:0};
}

// Set the shafts' width and pitch once from this person's relaxed, pushing
// grip. The axle and both handles stay rigid throughout the walking cycle.
function fitCart(figure, person) {
  const actor = {id:person.id, position:{x:0,y:0,z:0}, yaw:0, action:'push-cart', distance:0};
  const {seated, asleep, armReach, first} = figure;
  const savedFacing = {...figure.facing};
  Object.assign(figure,{seated:0,asleep:0,armReach:1,first:true});
  poseFigure(figure,actor,null,false,0,0,0);
  figure.root.updateMatrixWorld(true);
  const {body,joints} = figure, {position,skinIndex,skinWeight} = body.geometry.attributes;
  const hands = [joints.handL.index,joints.handR.index];
  const centre = new THREE.Vector3(), point = new THREE.Vector3();
  let weight = 0;
  for (let i=0;i<position.count;i++) {
    for (let slot=0;slot<4;slot++) {
      const w=skinWeight.getComponent(i,slot);
      if (w < .6 || !hands.includes(skinIndex.getComponent(i,slot))) continue;
      body.getVertexPosition(i,point).applyMatrix4(body.matrixWorld);
      point.x = Math.abs(point.x);
      centre.addScaledVector(point,w);
      weight += w;
    }
  }
  Object.assign(figure,{seated,asleep,armReach,first});
  Object.assign(figure.facing,savedFacing);
  if (!weight) return undefined;
  centre.divideScalar(weight);
  return {spread:centre.x, height:centre.y, back:centre.z-HANDCART.axleAhead+.055};
}

function poseFigure(figure, person, target, speaking, clock, dt, shift, openJob = false) {
  const {root, joints, facing, model} = figure, profile = STORY_FIGURES[person.id];
  // Wim also appears in the older fence scene. Only the open land changes her rest.
  const openResident = openJob || tinCast.has(person.id) || !!figure.work;
  if (figure.first) {
    if (openResident && person.action === 'sleep') {
      figure.seated = 1;
      figure.asleep = 1;
    }
    facing.yaw = person.yaw;
    if (person.action === 'sit' && person.seat === 'handcart') figure.seated = 1;
    figure.first = false;
  }
  attendTo(person, facing, target, dt);
  root.rotation.y = facing.yaw;
  const at = person.position;
  root.position.set(at.x, at.y + shift, at.z);
  const blend = 1 - Math.exp(-9 * dt);
  figure.seated += ((person.action === 'sit' || person.action === 'sleep' ? 1 : 0) - figure.seated) * blend;
  figure.asleep += ((person.action === 'sleep' ? 1 : 0) - figure.asleep) * blend;
  figure.armReach += ((person.action === 'push-cart' ? 1 : 0) - figure.armReach) * blend;
  const sit = figure.seated, sleep = figure.asleep, push = figure.armReach;
  const sideRest = openResident ? sleep : 0;
  const campSleep = openResident ? 0 : sleep;
  const moving = person.action === 'walk' || person.action === 'run' || person.action === 'push-cart' ||
    person.action === 'walk-tied' || person.action === 'carry-frame' || person.action === 'carry-lamp';
  const running = person.action === 'run';
  const phase = 2 * Math.PI * person.distance / (profile.height * (running ? 1.42 : .86)) + profile.index * .93;
  const stride = moving ? Math.sin(phase) : 0;
  const breath = Math.sin(clock * 1.87 + profile.index * 1.5);
  const settle = Math.sin(clock * .63 + profile.index * 2.1);
  const gesture = speaking ? .5 + .5 * Math.sin(clock * 2.4 + profile.index) : 0;
  poseBone(joints.pelvis, 0, stride * .07, (moving ? stride * .023 : settle * .011) * (1 - sit));
  poseBone(joints.chest, running ? .17 : push * .12 + sit * .06 - sleep * .28 + .011 * breath,
    -.07 * stride + .06 * gesture, .017 * settle + .28 * sleep);
  poseBone(joints.neck, .007 * breath + .045 * gesture + .46 * sleep, facing.headYaw * .68 - .10 * sleep);
  poseBone(joints.head, .035 * gesture * Math.sin(clock * 3.1) + .38 * sleep,
    facing.headYaw * .32 - .10 * sleep, .33 * sleep);
  for (const [side, sign] of SIDES) {
    const swing = sign * stride;
    const lift = moving ? Math.max(0, sign * Math.cos(phase)) : 0;
    const longLeg = sign < 0 ? campSleep : 0;
    poseBone(joints['thigh' + side], -1.43 * sit - .71 * campSleep + .55 * longLeg - swing * (running ? .81 : .46), 0, sign * .23 * sit);
    poseBone(joints['shin' + side], 1.65 * sit + 1.20 * campSleep - 2.77 * longLeg + lift * (running ? 1.07 : .47));
    poseBone(joints['foot' + side], -.26 * sit - .44 * campSleep + 1.29 * longLeg - lift * .19);
    const gestureSide = sign > 0 ? gesture : .15 * gesture;
    poseBone(joints['upper_arm' + side], swing * (running ? .5 : .31) * (1 - push) -
      .68 * push - .43 * sit - .23 * gestureSide, 0, -sign * (.055 + .10 * gestureSide + (sign < 0 ? .49 : .39) * sleep));
    poseBone(joints['forearm' + side], -.09 - .14 * push - .66 * sit - .29 * sleep - (running ? .69 : 0) - .5 * gestureSide,
      0, -sign * (sign < 0 ? .34 : .25) * sleep);
  }
  if (tinCast.has(person.id)) poseTinTask(figure, person, clock);
  if (figure.work) poseWork(figure, person, clock, stride);
  // After bending the legs, put the weight back on the lower boot. The head
  // anchor, seated posture and moving cart handle all follow the same pose.
  if (sideRest > .0001) poseSideRest(figure, sideRest, profile.height);
  else if (openResident) {
    model.rotation.set(0, 0, 0);
    model.position.x = 0;
  }
  model.position.y = figure.baseY;
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const index of figure.soles) {
    figure.body.getVertexPosition(index, foot).applyMatrix4(figure.body.matrixWorld);
    lowest = Math.min(lowest, foot.y);
  }
  if (sideRest > .001) {
    // Each height band supplies the leftmost body point from the rest mesh.
    // These contacts follow the hip, sleeve and head as the skeleton rolls.
    if (!figure.sideContacts) {
      const bands = new Map();
      const positions = figure.body.geometry.attributes.position;
      for (let index = 0; index < positions.count; index++) {
        const band = Math.floor(positions.getY(index) * 20);
        const current = bands.get(band);
        if (current === undefined || positions.getX(index) < positions.getX(current)) bands.set(band, index);
      }
      figure.sideContacts = [...bands.values()];
    }
    for (const index of figure.sideContacts) {
      figure.body.getVertexPosition(index, foot).applyMatrix4(figure.body.matrixWorld);
      lowest = Math.min(lowest, foot.y);
    }
  }
  model.position.y += root.position.y - lowest;
  if (figure.work) fitHandTool(figure, person.action);
}

// Fold both legs forward and stack them. The lower arm rests beneath the cheek.
function poseSideRest({model, joints}, amount, height) {
  model.rotation.set(0.25 * amount, 0, 1.58 * amount);
  // Roll around the hips so the sleeper stays on the assigned bed.
  model.position.x = .52 * height * Math.sin(model.rotation.z);
  for (const [name, pitch, yaw, roll] of SIDE_REST_JOINTS) {
    const joint = joints[name];
    previousPose.copy(joint.bone.quaternion);
    poseBone(joint, pitch, yaw, roll);
    joint.bone.quaternion.slerp(previousPose, 1 - amount);
  }
}

const previousPose = new THREE.Quaternion();
const SIDE_REST_JOINTS = [
  ['chest', 0.18, 0.12, 0.06],
  ['neck', 0.46, 0.16, 0.1],
  ['head', 0.48, 0.35, 0.17],
  ['upper_armL', -1.33, -.08, .31],
  ['upper_armR', -.44, -.12, -.28],
  ['forearmL', -1.53, .19, .34],
  ['forearmR', -1.52, -.68, -.79],
  ['thighL', -1.6, -0.14, 0.08],
  ['thighR', -1.46, -0.13, -0.31],
  ['shinL', 2.06, 0.02, 0.1],
  ['shinR', 2.39, 0.38, -0.34],
  ['footL', -0.22, 0, 0],
  ['footR', -0.22, 0, 0],
];

// Shoulder and elbow pitches for the two hands, then chest and gaze pitches.
const tinPoses = {
  weld: [-.48,-.82,-.72,-.51,.17,.27],
  inspect: [-.30,-1.42,-.52,-1.08,.23,.39],
  carry: [-.57,-.90,-.59,-.88,-.06,.08],
  scrub: [-.64,-.76,-.45,-.48,.23,.18],
  'carry-bucket': [-.19,-.18,.04,-.08,.13,.06],
  cook: [-.32,-.87,-.58,-.54,.08,.19],
  'haul-sack': [-.69,-.96,-.56,-1.12,-.12,.07],
};
function poseTinTask(figure, person, clock) {
  const {joints} = figure;
  for (const {node, action} of figure.props) node.visible = action === person.action;
  const pose = tinPoses[person.action];
  if (pose) {
    const stroke = person.action === 'scrub' ? .20*Math.sin(clock*2.5) : 0;
    const stir = person.action === 'cook' ? .18*Math.sin(clock*2) : 0;
    poseBone(joints.upper_armL, pose[0]+stroke, 0, .21);
    poseBone(joints.forearmL, pose[1]);
    poseBone(joints.upper_armR, pose[2]+stroke, stir, -.21);
    poseBone(joints.forearmR, pose[3]-stroke*.5);
    poseBone(joints.chest, pose[4]);
    poseBone(joints.head, pose[5], figure.facing.headYaw*.32);
  } else if (person.id === 'moss' && person.action !== 'sleep') {
    poseBone(joints.chest, .19);
  }
}

function releaseFigure(figure) {
  figure.cart?.dispose();
  figure.stool?.dispose();
  const skeletons = new Set();
  figure.root.traverse(node => { if (node.skeleton) skeletons.add(node.skeleton); });
  for (const skeleton of skeletons) skeleton.dispose();
  for (const geometry of figure.owned) geometry.dispose();
  figure.root.removeFromParent();
}

export function createStoryPeopleView(loadAsset) {
  const group = new THREE.Group();
  group.name = 'Wasteland story people';
  group.visible = false;
  const assets = new Map(), figures = new Map();
  let cast = EMPTY, time = null, disposed = false;
  const populate = async people => {
    for (const person of people) {
      const url = sourceFor(person.id);
      if (!assets.has(url)) assets.set(url, Promise.resolve().then(() => loadAsset(url)));
    }
    await Promise.all(people.map(async person => {
      const asset = await assets.get(sourceFor(person.id));
      if (disposed || cast !== people) return;
      const figure = makeFigure(person.id, asset);
      // The dialogue camera may look up this head before the next update places it in the world.
      figure.root.visible = false;
      figures.set(person.id, figure);
      group.add(figure.root);
    }));
  };
  return {group,
    update(worldJob, viewer, clock, drawnShift) {
      if (disposed) return;
      const people = worldJob?.storyPeople ?? EMPTY;
      if (cast !== people) {
        for (const figure of figures.values()) releaseFigure(figure);
        figures.clear();
        cast = people;
        group.userData.loadError = null;
        group.userData.ready = populate(people).catch(error => {
          if (cast === people && !disposed) group.userData.loadError = String(error.message || error);
        });
      }
      group.visible = people.length > 0;
      const dt = time === null ? 1 / 60 : Math.max(0, Math.min(.2, clock - time));
      time = clock;
      const speaker = worldJob?.storySpeaker;
      const speakerAt = speaker && people.find(person => person.id === speaker)?.position;
      for (const person of people) {
        const figure = figures.get(person.id);
        if (!figure) continue;
        const at = person.position;
        if (person.cart) {
          if (!figure.cart) {
            figure.cart = createHandcartView(fitCart(figure,person));
            figure.cart.root.name = 'story-handcart-' + person.id;
            group.add(figure.cart.root);
          }
          const c = person.cart;
          figure.cart.root.visible = Math.hypot(c.x-viewer.x,c.z-viewer.z) < 95;
          if (figure.cart.root.visible) figure.cart.update(c, drawnShift?.(c.x,c.z,c.y,undefined,figure.cart.root) ?? 0);
        }
        figure.root.visible = Math.hypot(at.x - viewer.x, at.z - viewer.z) < 95;
        if (!figure.root.visible) continue;
        const shift = drawnShift?.(at.x, at.z, at.y, undefined, figure.root) ?? 0;
        if (person.action === 'sit' && !person.seat && !figure.stool) {
          figure.stool = createCampStool(person.height);
          figure.root.add(figure.stool.root);
        }
        if (figure.stool) figure.stool.root.visible = person.action === 'sit' && !person.seat;
        const speaking = person.id === speaker;
        poseFigure(figure, person, speaking ? viewer : speakerAt, speaking, clock, dt, shift, !!worldJob.open);
      }
      // Both skeletons must have reached this frame before fitting a shared pane.
      for (const person of people) {
        if (person.action === 'carry-frame' && person.id < person.framePartner)
          fitCarriedFrame(person, people, figures);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const figure of figures.values()) releaseFigure(figure);
      for (const request of assets.values()) request.then(disposeFigureAsset, () => {});
      figures.clear();
      assets.clear();
      group.removeFromParent();
    },
  };
}

// OPEN-FIGURES-2. The old gate company keeps its original poses and draw path.
const OPEN_FIGURES_2 = '/assets/models/wasteland/scablands/open-figures-2.glb';
const localX = new THREE.Vector3(1, 0, 0), localY = new THREE.Vector3(0, 1, 0);
const leftPalm = new THREE.Vector3(), rightPalm = new THREE.Vector3(), span = new THREE.Vector3();

function prepareWorkKit(root, body, joints, looseTools, id) {
  const tools = {};
  const names = id.startsWith('grower-') ? ['hoe', 'ties', 'frame', 'glass'] :
    id === 'road-rat-lamp' ? ['lamp'] : [];
  for (const name of names) {
    tools[name] = looseTools[name];
    root.add(tools[name]);
  }
  if (tools.lamp) {
    looseTools.mantle.visible = true;
    tools.lamp.add(looseTools.mantle);
  }
  const palms = {};
  if (names.length) {
    const {position, skinIndex, skinWeight} = body.geometry.attributes;
    for (const [side] of SIDES) {
      const hand = joints['hand' + side];
      const contact = new THREE.Vector3();
      let count = 0;
      for (let i = 0; i < position.count; i++) {
        if (skinIndex.getX(i) !== hand.index || skinWeight.getX(i) < .8) continue;
        contact.add(body.getVertexPosition(i, foot).applyMatrix4(body.matrixWorld));
        count++;
      }
      if (!count) throw new Error('No palm on the work rig for ' + id);
      const socket = new THREE.Object3D();
      socket.position.copy(hand.bone.worldToLocal(contact.divideScalar(count)));
      hand.bone.add(socket);
      palms[side] = socket;
    }
  }
  return {tools, palms};
}

// Angles are in the standing person's axes. Swing at the shoulder and return at
// the elbow to rest a hand on a hip or to hold the two tied wrists together.
const WORK_STANCES = {
  marigold: {stand:'hands-on-hips'},
  sump: {stand:'hold-ledger', walk:'hold-ledger'},
  bern: {stand:'hold-coil', walk:'hold-coil'},
  'road-rat-lamp': {stand:'carry-lamp', walk:'carry-lamp'},
  'road-rat-lookout': {stand:'lookout'},
};
// The long overalls and narrow shirts place the palms at different distances from the rig's wrists.
const BOUND_GRIP = {
  'grower-1': [-.05, -1.15, -.95],
  'grower-2': [.02, -1.03, -.71],
  'grower-3': [.04, -.84, -.67],
};
const WORK_POSES = {
  hoe(arm, joints, clock) {
    const stroke = Math.sin(clock * 2.1);
    poseBone(joints.chest, .30 + .16 * stroke, -.13, .08);
    arm('L', -.73 + .31*stroke, .06, -.23, .43);
    arm('R', -.78 + .22*stroke, -.12, -1.25, -.55);
  },
  'walk-tied'(arm, joints, clock, stride, id) {
    const [spread, elbow, inward] = BOUND_GRIP[id];
    for (const [side, sign] of SIDES) arm(side, -.18 + .035*stride, sign*spread, elbow, sign*inward);
  },
  'carry-frame'(arm) {
    for (const [side, sign] of SIDES) arm(side, -.19, sign*.06, -.94, -sign*.28);
  },
  'hands-on-hips'(arm) {
    for (const [side, sign] of SIDES) arm(side, -.29, sign*1.01, -.34, -sign*1.69);
  },
  'hold-ledger'(arm, joints) {
    arm('L', .53, -.55, -2.11, .55);
    poseBone(joints.head, -.06, .07, -.065);
  },
  'hold-coil'(arm) { arm('R', .34, .07, -2.63, -.26); },
  'carry-lamp'(arm, joints, clock, stride) { arm('R', -.16 + .025*stride, .24, -1.22, -.18); },
  lookout(arm, joints, clock) {
    arm('R', -1.73, .12, -1.77, -.84);
    poseBone(joints.neck, -.05, .31 * Math.sin(clock * .63));
  },
};

function poseWork({joints}, {id, action}, clock, stride) {
  const pose = WORK_POSES[WORK_STANCES[id]?.[action] ?? action];
  if (!pose) return;
  const arm = (side, shoulder, spread, elbow, inward = 0) => {
    poseBone(joints['upper_arm' + side], shoulder, 0, spread);
    poseBone(joints['forearm' + side], elbow, 0, inward);
  };
  pose(arm, joints, clock, stride, id);
}

function palmIn(root, socket, out) {
  return root.worldToLocal(socket.getWorldPosition(out));
}

function fitHandTool({root, work}, action) {
  const {tools, palms} = work;
  if (!palms.L) return;
  for (const tool of Object.values(tools)) tool.visible = false;
  palmIn(root, palms.L, leftPalm);
  palmIn(root, palms.R, rightPalm);
  if (tools.lamp) {
    tools.lamp.visible = true;
    tools.lamp.position.copy(rightPalm);
  } else if (action === 'hoe') {
    tools.hoe.visible = true;
    tools.hoe.position.copy(leftPalm);
    tools.hoe.quaternion.setFromUnitVectors(localY, span.subVectors(rightPalm,leftPalm).normalize());
  } else if (action === 'walk-tied') {
    fitSpan(tools.ties, leftPalm, rightPalm);
  }
}

// Frame and bindings are authored from x=0 at the first grip to x=1 at the other.
function fitSpan(mesh, first, last) {
  mesh.position.copy(first);
  span.subVectors(last, first);
  mesh.scale.x = span.length();
  mesh.quaternion.setFromUnitVectors(localX, span.normalize());
  mesh.visible = true;
}

function fitCarriedFrame(person, people, figures) {
  const partner = people.find(other => other.id === person.framePartner);
  if (partner?.action !== 'carry-frame' || partner.framePartner !== person.id) return;
  const first = figures.get(person.id), last = figures.get(partner.id);
  if (!first?.root.visible || !last?.root.visible || !first.work?.tools.frame || !last.work?.tools.frame) return;
  const root = first.root;
  const partnerOnRight = root.worldToLocal(last.root.getWorldPosition(span)).x >= 0;
  palmIn(root, first.work.palms[partnerOnRight ? 'R' : 'L'], leftPalm);
  palmIn(root, last.work.palms[partnerOnRight ? 'L' : 'R'], rightPalm);
  // Always build left-to-right so that reversed placement keeps the pane upright.
  const a = partnerOnRight ? leftPalm : rightPalm, b = partnerOnRight ? rightPalm : leftPalm;
  fitSpan(first.work.tools.frame, a, b);
  fitSpan(first.work.tools.glass, a, b);
}
