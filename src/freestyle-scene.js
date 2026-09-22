import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {freestyleLayout,freestyleHeightAt,FREESTYLE_DRAG} from './freestyle-course.js';
import {addMountainLandscape,rockTexture} from './mountain-landscape.js';
import {createPavedRoadMaterial} from './road-surface.js';

// World-space ground avoids folded inside ribbons when the truck turns around
// or crosses the oval's open centre. Render and physics sample the same hills.
export function freestyleTerrainGeometry(course){
  const {bounds,mounds}=freestyleLayout(course),blockSize=16;
  const minX=Math.floor(bounds.minX/blockSize)*blockSize,minZ=Math.floor(bounds.minZ/blockSize)*blockSize;
  const maxX=Math.ceil(bounds.maxX/blockSize)*blockSize,maxZ=Math.ceil(bounds.maxZ/blockSize)*blockSize;
  const detailed=mounds.map(m=>{const c=Math.abs(Math.cos(m.heading)),s=Math.abs(Math.sin(m.heading)),x=c*m.halfX+s*m.halfZ+2,z=s*m.halfX+c*m.halfZ+2;return {minX:m.x-x,maxX:m.x+x,minZ:m.z-z,maxZ:m.z+z};});
  const position=[],uv=[],color=[],weights=[],indices=[];
  const base=new THREE.Color('#ebdbbe'),vertices=new Map();
  function vertex(x,z){
    const key=`${x},${z}`;if(vertices.has(key))return vertices.get(key);
    const index=position.length/3,y=freestyleHeightAt(course,x,z),shade=.86+.065*Math.sin(x*.08)*Math.cos(z*.09)+.025*Math.sin(z*.8);
    position.push(x,y,z);uv.push(x/22,z/22);color.push(base.r*shade,base.g*shade,base.b*shade);weights.push(1,0,0);
    vertices.set(key,index);return index;
  }
  // Only the authored hills need two-metre triangles. The remaining floor is
  // exactly flat, so sixteen-metre quads preserve support and texture detail.
  // Fine/coarse edge vertices are collinear at Y=0: no cracks or skirts.
  for(let z=minZ;z<maxZ;z+=blockSize)for(let x=minX;x<maxX;x+=blockSize){
    const step=detailed.some(b=>x+blockSize>=b.minX&&x<=b.maxX&&z+blockSize>=b.minZ&&z<=b.maxZ)?2:blockSize;
    for(let dz=0;dz<blockSize;dz+=step)for(let dx=0;dx<blockSize;dx+=step){
      const a=vertex(x+dx,z+dz),b=vertex(x+dx+step,z+dz),c=vertex(x+dx,z+dz+step),d=vertex(x+dx+step,z+dz+step);
      indices.push(a,c,b,b,c,d);
    }
  }
  const g=new THREE.BufferGeometry();g.name='Freestyle continuous quarry ground';
  for(const [name,data,size]of[['position',position,3],['uv',uv,2],['color',color,3],['biomeWeights',weights,3]])g.setAttribute(name,new THREE.Float32BufferAttribute(data,size));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}

// Cheap distant ground keeps the open arena from ending in a visible square.
// All interactive mounds live in the dense grid; this flat extension has two
// triangles, no boundary collision and no extra per-frame terrain generation.
export function freestyleFarGeometry(course){
  const {bounds}=freestyleLayout(course),cx=(bounds.minX+bounds.maxX)*.5,cz=(bounds.minZ+bounds.maxZ)*.5,r=6000;
  const points=[[cx-r,cz-r],[cx+r,cz-r],[cx-r,cz+r],[cx+r,cz+r]],g=new THREE.BufferGeometry();
  const base=new THREE.Color('#d4c4a8');
  g.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(([x,z])=>[x,-.15,z]),3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(points.flatMap(([x,z])=>[x/22,z/22]),2));
  g.setAttribute('color',new THREE.Float32BufferAttribute(points.flatMap(()=>[base.r,base.g,base.b]),3));
  g.setAttribute('biomeWeights',new THREE.Float32BufferAttribute(points.flatMap(()=>[1,0,0]),3));
  g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();return g;
}

export function addFreestyleScenery(world,course){
  if(!course.def.practice)return null;
  const group=new THREE.Group();group.name='Freestyle quarry training areas';
  const materials={wood:new THREE.MeshStandardMaterial({color:0x806142,roughness:.92}),steel:new THREE.MeshStandardMaterial({color:0x46505a,metalness:.55,roughness:.64}),
    asphalt:createPavedRoadMaterial({asphalt:null}),
    concrete:new THREE.MeshStandardMaterial({color:0xb8aa8f,roughness:.96}),orange:new THREE.MeshStandardMaterial({color:0xd26c2d,roughness:.85}),
    lamp:new THREE.MeshStandardMaterial({color:0xffedc7,emissive:0xffdfa0,emissiveIntensity:1.4,roughness:.4})};
  const batches=new Map();
  const signParts=[];
  const labels=[['FREESTYLE','NO CLOCK  /  UNLIMITED NITRO'],['CRUSH + CRAWL','SALVAGE CARS  /  ROCK GARDEN'],['BIG AIR','THREE JUMPS  /  SUMMIT CLIMB'],['DRAG STRIP','4 KM STRAIGHT  /  NITRO EVERYWHERE'],['SLOW DOWN','600 M BRAKING RUNOUT'],['1 KM','KEEP IT STRAIGHT'],['2 KM','FULL THROTTLE'],['3 KM','1 KM TO BRAKING ZONE']];
  function box(kind,size,x,y,z,heading=0){
    const geometry=new THREE.BoxGeometry(...size);geometry.rotateY(heading);geometry.translate(x,y,z);
    if(kind==='asphalt'){const pos=geometry.attributes.position,uv=geometry.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getZ(i)/5,pos.getX(i)/10);}
    if(!batches.has(kind))batches.set(kind,[]);batches.get(kind).push(geometry);
  }
  function local(feature,kind,size,across,y,along){
    const c=Math.cos(feature.heading),s=Math.sin(feature.heading);
    box(kind,size,feature.x+c*across+s*along,feature.y+y,feature.z-s*across+c*along,feature.heading);
  }
  let standIndex=0;
  const drag=FREESTYLE_DRAG;
  // Flat, open-ended speed runway. Thin paint is visual only: no hidden walls.
  materials.asphalt.color.set(0x343a3d);
  box('asphalt',[drag.runoutEndX,.02,drag.halfWidth*2],drag.runoutEndX/2,0,0);
  for(const z of[-drag.halfWidth+1,drag.halfWidth-1])box('concrete',[drag.runoutEndX,.015,.16],drag.runoutEndX/2,.018,z);
  for(let x=30;x<drag.runoutEndX;x+=40)box('concrete',[15,.015,.16],x,.018,0);
  for(const x of[drag.startX,drag.endX])for(let row=0;row<2;row++)for(let lane=0;lane<16;lane++)box((lane+row)%2?'asphalt':'concrete',[1,.018,2],x+row,.022,-15+lane*2);
  for(let x=drag.startX;x<=drag.endX;x+=200)for(const side of[-1,1]){
    box('orange',[.7,1.2,.7],x,.6,side*(drag.halfWidth+3));
    box('concrete',[.4,.02,2],x,.022,side*(drag.halfWidth-2));
  }
  for(let x=drag.endX+30;x<drag.runoutEndX;x+=30)for(const side of[-1,1])box('orange',[1.2,.018,10],x,.022,side*8);
  for(const [x,row]of[[drag.startX,3],[drag.endX,4],[drag.startX+1000,5],[drag.startX+2000,6],[drag.startX+3000,7]]){
    const board=new THREE.PlaneGeometry(32,5),uv=board.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)+labels.length-1-row)/labels.length);
    board.rotateY(-Math.PI/2);board.translate(x,11,0);signParts.push(board);
    for(const z of[-20,20])box('steel',[.3,14,.3],x,7,z);
    box('steel',[.3,.4,40],x,14,0);
  }
  for(const feature of course.features.practiceStructures){
    if(feature.practiceBlock){local(feature,'concrete',[1.2,1.1,6.4],0,.55,0);local(feature,Math.round(feature.s/40)%2?'orange':'steel',[.025,.5,6.2],-.607,.63,0);continue;}
    for(let row=0;row<6;row++){
      const x=-6+row*2.1,y=.4+row*.85;
      local(feature,'wood',[2,.18,43],x,y,0);
      local(feature,'steel',[.13,.9,43],x+.7,y+.5,0);
      for(const z of[-19,-9,1,11,20])local(feature,'steel',[.18,y,.18],x,y*.5,z);
    }
    for(const z of[-22,22]){
      local(feature,'steel',[.22,16,.22],6,8,z);
      local(feature,'steel',[.5,1.6,3.6],6,16,z);
      for(const dz of[-1.2,0,1.2])for(const y of[15.5,16.3])local(feature,'lamp',[.12,.52,.72],5.71,y,z+dz);
    }
    // One three-row atlas keeps the landmark boards legible with one draw.
    const board=new THREE.PlaneGeometry(15,4),uv=board.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)+labels.length-1-standIndex)/labels.length);
    board.rotateY(feature.heading-Math.PI/2);
    board.translate(feature.x-Math.cos(feature.heading)*7,feature.y+7,feature.z+Math.sin(feature.heading)*7);
    signParts.push(board);standIndex++;
    local(feature,'steel',[.18,7,.18],-6.6,3.5,-7);local(feature,'steel',[.18,7,.18],-6.6,3.5,7);
  }
  // Painted edge blocks guide each jump without narrowing the landing lane.
  for(const mound of course.features.practiceMounds.slice(0,3))for(const side of[-1,1])for(let i=-2;i<=2;i++){
    const along=i*mound.halfZ*.4,across=side*(mound.halfX+2.8),c=Math.cos(mound.heading),s=Math.sin(mound.heading);
    const x=mound.x+c*across+s*along,z=mound.z-s*across+c*along;
    box('orange',[.5,1,.5],x,freestyleHeightAt(course,x,z)+.5,z,mound.heading);
  }
  for(const [kind,parts]of batches){const geo=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());const mesh=new THREE.Mesh(geo,materials[kind]);mesh.name=`Practice ${kind} structures`;mesh.castShadow=kind!=='lamp';mesh.receiveShadow=true;group.add(mesh);}
  for(const [kind,material]of Object.entries(materials))if(!batches.has(kind))material.dispose();
  if(signParts.length){
    const geometry=mergeGeometries(signParts,false);signParts.forEach(part=>part.dispose());
    const canvas=typeof document!=='undefined'?document.createElement('canvas'):null;
    let texture=null;
    if(canvas){
      canvas.width=1024;canvas.height=256*labels.length;const ctx=canvas.getContext('2d');
      for(const [i,[title,detail]]of labels.entries()){
        const y=i*256;ctx.fillStyle='#17292b';ctx.fillRect(0,y,1024,256);ctx.fillStyle='#e88c43';ctx.fillRect(0,y,20,256);ctx.fillRect(1004,y,20,256);
        ctx.textAlign='center';ctx.fillStyle='#fff0cb';ctx.font='bold 86px sans-serif';ctx.fillText(title,512,y+121);
        ctx.fillStyle='#eab782';ctx.font='bold 34px sans-serif';ctx.fillText(detail,512,y+194);
      }
      texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    }
    const signs=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,color:texture?0xffffff:0x17292b,roughness:.9,side:THREE.DoubleSide}));
    signs.name='Batched practice zone boards';group.add(signs);
  }
  const stone=new THREE.MeshStandardMaterial({color:0xb0a48f,map:rockTexture('arena'),bumpMap:rockTexture('arena'),bumpScale:.18,roughness:1});
  const rocks=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,1),stone,course.features.rocks.length),pose=new THREE.Object3D();
  course.features.rocks.forEach((rock,i)=>{const p=course.groundAt(rock.s,rock.off);pose.position.set(p.x,p.y+.1,p.z);pose.rotation.set(0,p.heading+rock.angle,0);pose.scale.set(...rock.scale);pose.updateMatrix();rocks.setMatrixAt(i,pose.matrix);});
  rocks.name='Progressive practice rock garden';rocks.castShadow=rocks.receiveShadow=true;rocks.computeBoundingSphere();group.add(rocks);
  addMountainLandscape(group,course);world.add(group);return group;
}
