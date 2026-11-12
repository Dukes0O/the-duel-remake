// Tin Town's gate (SCABLANDS-LAND), built in code from plain boxes, drums and sheets, with the scrap wear drawn over it.
// Two posts of stacked drums and girders, 7 m tall, stand 9 m apart; a beam of girders runs across them with three
// hanging lamps; a tin sign reading TIN TOWN stands on the beam; 14 m of corrugated fence runs out from each post.
// The group's own +Z is the way a truck drives through, +X runs along the beam. Nothing here changes race state.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear} from './scrap-look.js';

export const TIN_TOWN_GATE=Object.freeze({
  x:575,z:62,opening:9,postHeight:7,fenceLength:14,
  // The way trucks drive through: the line from the furnace's approach (610, 170) to the road home (430, 70), which
  // the furnace's own path bends round at the gate (src/world/jobs/everburn.js).
  through:Object.freeze({x:-180,z:-100}),
});
const POST_WIDTH=2.1,POST_CENTRE=TIN_TOWN_GATE.opening/2+POST_WIDTH/2;
const BEAM_TOP=7.64;

const corrugated=(width,height)=>{
  // A zig-zag strip with a rib every 0.22 m, standing 4 cm out and in.
  const ribs=Math.round(width/.11),positions=[],uv=[],indices=[];
  for(let index=0;index<=ribs;index++){
    const x=-width/2+width*index/ribs,z=index%2?.04:-.04;
    positions.push(x,0,z,x,height,z);uv.push(index/ribs,0,index/ribs,1);
  }
  for(let index=0;index<ribs;index++){const a=index*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
};

// The sign: tin, a rusted border and dark stencil letters, drawn on a small canvas when a page is there to draw on.
function signTexture(){
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=220;
  const draw=canvas.getContext('2d');
  draw.fillStyle='#a8a69c';draw.fillRect(0,0,1024,220);
  draw.strokeStyle='#5a3a24';draw.lineWidth=14;draw.strokeRect(10,10,1004,200);
  draw.fillStyle='#2a211a';draw.font='bold 150px Impact, "Arial Black", sans-serif';draw.textAlign='center';draw.textBaseline='middle';
  draw.fillText('TIN TOWN',512,116);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}

// Gathers boxes, drums and sheets by material and merges each material's pieces into one mesh, so that the whole gate
// costs a handful of draw calls.
function assembly(name){
  const group=new THREE.Group();group.name=name;
  const pieces=new Map(),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler(),one=new THREE.Vector3(1,1,1);
  const put=(material,geometry,x,y,z,turn=[0,0,0],scale=one)=>{
    matrix.compose(new THREE.Vector3(x,y,z),quaternion.setFromEuler(euler.set(turn[0],turn[1],turn[2])),scale);
    geometry.applyMatrix4(matrix);
    if(!pieces.has(material))pieces.set(material,[]);pieces.get(material).push(geometry);
  };
  const finish=()=>{
    for(const [material,list] of pieces){
      const merged=mergeGeometries(list);for(const geometry of list)geometry.dispose();
      const mesh=new THREE.Mesh(merged,material);mesh.name=`${name}, ${material.name}`;mesh.castShadow=true;mesh.receiveShadow=true;
      group.add(mesh);
    }
    pieces.clear();return group;
  };
  return {group,put,finish};
}

export function createTinTownGate({ground=0}={}){
  const gate=new THREE.Group();gate.name='Tin Town gate';
  const through=TIN_TOWN_GATE.through,yaw=Math.atan2(through.x,through.z);
  gate.position.set(TIN_TOWN_GATE.x,ground,TIN_TOWN_GATE.z);gate.rotation.y=yaw;
  const std=(name,colour,rough=.88,extra={})=>new THREE.MeshStandardMaterial({name,color:colour,roughness:rough,metalness:.1,...extra});
  const materials={
    drumRed:std('rusted drums',0x8a4024),drumTin:std('tin drums',0x74726b),drumBlue:std('faded blue drums',0x42585f),
    iron:std('girders',0x4a4036),tin:std('corrugated tin',0x77746b,.8,{side:THREE.DoubleSide,flatShading:true}),
    sign:std('tin sign',0xb4b2a8,.75),wire:std('chain',0x25211c),
    lamp:std('lamp glass',0x3a2410,.4,{emissive:0xff9a38,emissiveIntensity:.85}),
  };
  const texture=signTexture();
  if(texture)materials.sign.map=texture;

  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  // Posts: a slab, six stacked drums turned a little each, four upright girders at the corners, ties and a cap.
  const postAt=side=>{
    const {group,put,finish}=assembly(`Gate post ${side<0?'left':'right'}`);
    put(materials.iron,box(POST_WIDTH,.35,POST_WIDTH),0,.175,0);
    const drums=[materials.drumRed,materials.drumTin,materials.drumBlue];
    for(let level=0;level<6;level++){
      put(drums[(level+(side<0?0:1))%3],new THREE.CylinderGeometry(.52,.52,1.05,14),((level*7)%5-2)*.025,.35+1.05*(level+.5),((level*3)%5-2)*.025,[0,level*.7,0]);
      // The rolled rims at the top and bottom of every drum.
      put(materials.iron,new THREE.CylinderGeometry(.55,.55,.07,14),0,.35+1.05*level+.04,0);
    }
    for(const sx of [-1,1])for(const sz of [-1,1])put(materials.iron,box(.22,TIN_TOWN_GATE.postHeight,.22),sx*.9,TIN_TOWN_GATE.postHeight/2,sz*.9);
    for(const y of [1.6,3.5,5.4])for(const sz of [-1,1]){put(materials.iron,box(1.8,.14,.14),0,y,sz*.9);put(materials.iron,box(.14,.14,1.8),sz*.9,y,0);}
    put(materials.iron,box(POST_WIDTH,.35,POST_WIDTH),0,TIN_TOWN_GATE.postHeight-.175,0);
    finish();group.position.x=side*POST_CENTRE;return group;
  };
  gate.add(postAt(-1),postAt(1));

  // The beam: top and bottom chords, uprights and diagonals between them, resting on the post caps.
  {
    const {group,put,finish}=assembly('Gate beam');const span=2*POST_CENTRE+POST_WIDTH+.8;
    put(materials.iron,box(span,.28,.62),0,BEAM_TOP-.14,0);
    put(materials.iron,box(span,.2,.5),0,6.85,0);
    const cells=Math.round(span/1.6);
    for(let cell=0;cell<=cells;cell++)put(materials.iron,box(.12,.62,.12),-span/2+span*cell/cells+0,7.15,0);
    for(let cell=0;cell<cells;cell++){
      const length=Math.hypot(span/cells,.62);
      put(materials.iron,box(length,.09,.09),-span/2+span*(cell+.5)/cells,7.15,0,[0,0,(cell%2?1:-1)*Math.atan2(.62,span/cells)]);
    }
    // Two struts carry the sign above the beam.
    for(const sx of [-3,3])put(materials.iron,box(.14,1.0,.14),sx,BEAM_TOP+.5,0);
    finish();gate.add(group);
  }

  // The sign: a tin plate with lettering on both faces.
  {
    const {group,put,finish}=assembly('Gate sign');
    put(materials.iron,box(7.4,.12,.2),0,BEAM_TOP+.95,0);
    finish();
    const plate=new THREE.Group();plate.name='Gate sign plate';plate.userData.text='TIN TOWN';
    const front=new THREE.Mesh(new THREE.PlaneGeometry(7,1.5),materials.sign),back=front.clone();
    front.position.set(0,BEAM_TOP+1.75,.07);back.position.set(0,BEAM_TOP+1.75,-.07);back.rotation.y=Math.PI;
    const edge=new THREE.Mesh(new THREE.BoxGeometry(7,1.5,.12),materials.iron);edge.position.set(0,BEAM_TOP+1.75,0);
    front.castShadow=back.castShadow=edge.castShadow=true;
    plate.add(edge,front,back);group.add(plate);gate.add(group);
  }

  // Three lamps on short chains under the beam. They glow a little.
  {
    const {group,put,finish}=assembly('Gate lamps');
    for(const sx of [-3.4,0,3.4]){
      put(materials.wire,box(.05,.9,.05),sx,6.4,0);
      put(materials.iron,new THREE.CylinderGeometry(.12,.3,.22,8),sx,5.88,0);
      put(materials.lamp,new THREE.SphereGeometry(.2,8,6),sx,5.7,0);
    }
    finish();gate.add(group);
  }

  // Fence: 14 m of corrugated tin each side, in 2 m sheets of uneven height, leaning a little on thin posts.
  for(const side of [-1,1]){
    const {group,put,finish}=assembly(`Gate fence ${side<0?'left':'right'}`);
    const sheets=Math.round(TIN_TOWN_GATE.fenceLength/2),start=POST_CENTRE+POST_WIDTH/2;
    for(let sheet=0;sheet<sheets;sheet++){
      const x=side*(start+sheet*2+1),height=2.5+((sheet*5)%4)*.22;
      put(materials.tin,corrugated(2,height),x,-.05,((sheet%3)-1)*.06,[0,0,((sheet%2?1:-1)*.012)]);
      put(materials.iron,box(.12,height+.4,.12),side*(start+sheet*2),(height+.4)/2-.05,0);
    }
    put(materials.iron,box(.12,3.1,.12),side*(start+sheets*2),1.5,0);
    finish();gate.add(group);
  }

  // The wear, drawn over every material that does not glow, with the gate's own foot as its origin.
  const wear=createScrapWear({paint:1});
  wear.uniforms.uScrapInverse.value.makeTranslation(gate.position.x,gate.position.y,gate.position.z).invert();
  for(const material of Object.values(materials))if(material!==materials.lamp)wear.apply(material);
  gate.userData={opening:TIN_TOWN_GATE.opening,postHeight:TIN_TOWN_GATE.postHeight,yaw,fireHeight:BEAM_TOP,
    dispose(){texture?.dispose();for(const material of Object.values(materials))material.dispose();}};
  return gate;
}
