import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {renderedGroundHeight} from './rendered-ground.js';

const CLIPS=['chest-beat','idle','lope','roar','walk-off'];
const loadModel=path=>new GLTFLoader().loadAsync(path);
function disposeSource(scene){
  const resources=new Set();scene?.traverse(node=>{
    if(node.geometry)resources.add(node.geometry);
    for(const material of [node.material].flat().filter(Boolean)){resources.add(material);for(const value of Object.values(material))if(value?.isTexture)resources.add(value);}
  });for(const item of resources)item.dispose();
}
function disposeSkeletons(root){root.traverse(node=>{if(node.isSkinnedMesh)node.skeleton.dispose();});}
export function createYetiAssets({loadAsset=loadModel}={}){
  let status='idle',pending,error='',retired=false;const assets=new Map();
  return {get status(){return status;},get error(){return error;},
    load(){
      if(pending)return pending;
      status='loading';pending=Promise.all(['high','low'].map(async quality=>{
        const asset=await loadAsset('/assets/models/circuits/kits/yeti'+(quality==='low'?'-lod':'')+'.glb');
        if(retired){disposeSource(asset.scene);return;}
        if(!CLIPS.every(name=>asset.animations.some(clip=>clip.name===name))){disposeSource(asset.scene);throw Error('Accepted Yeti clips are missing.');}
        assets.set(quality,asset);
      })).then(()=>{if(!retired)status='ready';}).catch(reason=>{error=String(reason.message??reason);if(!retired)status='error';});return pending;
    },
    clone(quality='low'){const asset=assets.get(quality);if(status!=='ready'||!asset)throw Error('Accepted Yeti model is not ready.');return {scene:cloneSkeleton(asset.scene),animations:asset.animations};},
    dispose(){if(retired)return;retired=true;status='retired';for(const asset of assets.values())disposeSource(asset.scene);assets.clear();}
  };
}
export function createYetiRoof(assets){
  const {scene}=assets.clone('low');scene.name='Yeti seated roof';
  // Pose the real LOD skeleton once; the roof item has no animation driver.
  for(const side of ['L','R']){
    const upper=scene.getObjectByName('UpperLeg'+side),lower=scene.getObjectByName('LowerLeg'+side);
    if(!upper||!lower)throw Error('Accepted Yeti leg rig is missing.');
    upper.rotateX(-Math.PI/2);lower.rotateX(Math.PI/2);
  }
  scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(scene,true),height=bounds.max.y-bounds.min.y;
  if(!(height>0))throw Error('Accepted Yeti roof bounds are invalid.');
  const group=new THREE.Group();group.name='Yeti roof look';scene.scale.multiplyScalar(.45/height);
  scene.position.y-=bounds.min.y*.45/height;group.add(scene);
  let disposed=false;return {group,dispose(){if(disposed)return;disposed=true;group.removeFromParent();disposeSkeletons(scene);}};
}
function cloneFurMaterials(scene,furTint){
  if(furTint==null)return [];
  const owned=new Map();
  const tinted=material=>{
    if(material?.name!=='round-two-yeti-matted-ivory')return material;
    if(!owned.has(material)){
      const clone=material.clone();clone.color.set(furTint);owned.set(material,clone);
    }
    return owned.get(material);
  };
  scene.traverse(node=>{
    if(Array.isArray(node.material)){
      const next=node.material.map(tinted);
      if(next.some((material,index)=>material!==node.material[index]))node.material=next;
    }else if(node.material)node.material=tinted(node.material);
  });
  return [...owned.values()];
}
function makeActor(assets,quality,furTint){
  const asset=assets.clone(quality),group=new THREE.Group();group.add(asset.scene);
  const mixer=new THREE.AnimationMixer(asset.scene),feet=[];
  asset.scene.traverse(mesh=>{
    if(!mesh.isSkinnedMesh)return;
    for(const side of ['L','R']){
      const joint=mesh.skeleton.bones.findIndex(bone=>bone.name==='Foot'+side),indices=[];
      const weights=mesh.geometry.attributes.skinWeight,bones=mesh.geometry.attributes.skinIndex;
      if(joint<0)continue;
      for(let vertex=0;vertex<weights.count;vertex++)for(let part=0;part<4;part++){
        if(bones.getComponent(vertex,part)===joint && weights.getComponent(vertex,part)>.25){indices.push(vertex);break;}
      }
      if(!indices.length)continue;
      feet.push({mesh,joint,indices});
    }
  });
  if(!['FootL','FootR'].every(name=>feet.some(data=>data.mesh.skeleton.bones[data.joint].name===name)))throw Error('Accepted Yeti foot vertices are missing.');
  return {group,scene:asset.scene,mixer,clips:asset.animations,feet,clip:null,materials:cloneFurMaterials(asset.scene,furTint)};
}
export function createYetiView(assets,{furTint}={}){
  const group=new THREE.Group();group.name='The yeti';let actors,retired=false;
  const vertex=new THREE.Vector3(),foot=new THREE.Vector3();
  return {group,
    update(state,course,high=true){
      if(retired)return;const yeti=state?.yeti;
      group.visible=!!yeti?.appears && course?.def.id==='summit-run' && state.status!=='menu';
      if(!group.visible)return;
      if(!actors){actors=[makeActor(assets,'high',furTint),makeActor(assets,'low',furTint)];for(const actor of actors)group.add(actor.group);}
      const age=yeti.seen?Math.max(0,state.stageTimeSec-yeti.seenAt):0;
      const phases=[['roar',0,1.7],['chest-beat',1.7,3.5],['lope',3.5,6],['walk-off',6,12]];
      const phase=yeti.seen?phases.find(row=>age>=row[1]&&age<row[2]):['idle',0,Infinity];
      if(!phase){group.visible=false;return;}
      const away=yeti.seen?Math.max(0,age-3.5)*1.6:0;
      const point=course.groundAt(yeti.site.s,yeti.site.lateral+Math.sign(yeti.site.lateral)*away);
      point.y=renderedGroundHeight(course,point,{requireSurface:true});
      if(!Number.isFinite(point.y))throw Error('Yeti has no actual rendered ground.');
      for(const [index,actor] of actors.entries()){
        actor.group.visible=index===(high?0:1);if(!actor.group.visible)continue;
        actor.group.position.set(point.x,point.y,point.z);actor.group.rotation.y=point.heading;
        if(actor.clip!==phase[0]){actor.mixer.stopAllAction();actor.mixer.clipAction(actor.clips.find(clip=>clip.name===phase[0])).play();actor.clip=phase[0];}
        actor.mixer.setTime(age-phase[1]);actor.group.updateMatrixWorld(true);
        // Seat to the lower contact: the other foot can sink into deep snow.
        let lift=Infinity;
        for(const data of actor.feet){
          data.mesh.skeleton.bones[data.joint].getWorldPosition(foot);
          const near=course.nearest(foot.x,foot.z,yeti.site.s),ground=course.groundAt(near.s,near.lateral);
          const height=renderedGroundHeight(course,{x:foot.x,z:foot.z,y:ground.y},{requireSurface:true});
          if(!Number.isFinite(height))throw Error('Yeti foot has no actual rendered ground.');
          let low=Infinity;for(const index of data.indices){data.mesh.getVertexPosition(index,vertex).applyMatrix4(data.mesh.matrixWorld);low=Math.min(low,vertex.y);}
          lift=Math.min(lift,height-low);
        }
        actor.group.position.y+=lift;actor.group.updateMatrixWorld(true);
      }
    },
    reset(){group.visible=false;},
    dispose(){if(retired)return;retired=true;for(const actor of actors??[]){actor.mixer.stopAllAction();actor.mixer.uncacheRoot(actor.scene);disposeSkeletons(actor.scene);for(const material of actor.materials)material.dispose();}group.removeFromParent();group.clear();}
  };
}
