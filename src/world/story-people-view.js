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


function sourceFor(id) {
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
  let body;
  model.traverse(node => {
    if (!node.isSkinnedMesh) return;
    if ((source === WALKERS && node.name !== 'skin-' + profile.asset) ||
        (source === CINDER && node.name.includes('-far'))) removed.push(node);
    else body = node;
  });
  for (const mesh of removed) { mesh.removeFromParent(); mesh.skeleton.dispose(); }
  if (!body) throw new Error('Story cast has no bound body for ' + id);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
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
  return {root, model, joints, body, owned, soles, baseY:model.position.y, facing: {yaw:0, headYaw:0},
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

function poseFigure(figure, person, target, speaking, clock, dt, shift) {
  const {root, joints, facing, model} = figure, profile = STORY_FIGURES[person.id];
  if (figure.first) { facing.yaw = person.yaw; figure.first = false; }
  attendTo(person, facing, target, dt);
  root.rotation.y = facing.yaw;
  const at = person.position;
  root.position.set(at.x, at.y + shift, at.z);
  const blend = 1 - Math.exp(-9 * dt);
  figure.seated += ((person.action === 'sit' || person.action === 'sleep' ? 1 : 0) - figure.seated) * blend;
  figure.asleep += ((person.action === 'sleep' ? 1 : 0) - figure.asleep) * blend;
  figure.armReach += ((person.action === 'push-cart' ? 1 : 0) - figure.armReach) * blend;
  const sit = figure.seated, sleep = figure.asleep, push = figure.armReach;
  const moving = person.action === 'walk' || person.action === 'run' || person.action === 'push-cart';
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
    const longLeg = sign < 0 ? sleep : 0;
    poseBone(joints['thigh' + side], -1.43 * sit - .71 * sleep + .55 * longLeg - swing * (running ? .81 : .46), 0, sign * .23 * sit);
    poseBone(joints['shin' + side], 1.65 * sit + 1.20 * sleep - 2.77 * longLeg + lift * (running ? 1.07 : .47));
    poseBone(joints['foot' + side], -.26 * sit - .44 * sleep + 1.29 * longLeg - lift * .19);
    const gestureSide = sign > 0 ? gesture : .15 * gesture;
    poseBone(joints['upper_arm' + side], swing * (running ? .5 : .31) * (1 - push) -
      .68 * push - .43 * sit - .23 * gestureSide, 0, -sign * (.055 + .10 * gestureSide + (sign < 0 ? .49 : .39) * sleep));
    poseBone(joints['forearm' + side], -.09 - .14 * push - .66 * sit - .29 * sleep - (running ? .69 : 0) - .5 * gestureSide,
      0, -sign * (sign < 0 ? .34 : .25) * sleep);
  }
  // After bending the legs, put the weight back on the lower boot. The head
  // anchor, seated posture and moving cart handle all follow the same pose.
  model.position.y = figure.baseY;
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  let lowest = Infinity;
  for (const index of figure.soles) {
    figure.body.getVertexPosition(index, foot).applyMatrix4(figure.body.matrixWorld);
    lowest = Math.min(lowest, foot.y);
  }
  model.position.y += root.position.y - lowest;
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
        poseFigure(figure, person, speaking ? viewer : speakerAt, speaking, clock, dt, shift);
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
