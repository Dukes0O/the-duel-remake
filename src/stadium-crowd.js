import * as THREE from 'three';

export const STADIUM_SECTIONS=24,STADIUM_ROWS=8;
let atlas;
function crowdTexture(){
  if(!atlas){atlas=new THREE.TextureLoader().load('/assets/textures/stadium-crowd.png');atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;atlas.userData.sharedAsset=true;}
  return atlas;
}

export function stadiumCrowdGeometry(course,section){
  const sectionLength=course.length/STADIUM_SECTIONS,s=(section+.5)*sectionLength,width=sectionLength*.86;
  const positions=[],uv=[],colors=[],indices=[];
  for(let row=0;row<STADIUM_ROWS;row++)for(let seat=0;seat<28;seat++){
    if((seat*7+row*13+section*3)%8===0)continue;
    const off=32+row*2,y=1.7+row*1.13,along=(seat-13.5)*(width-2)/28;
    const p=course.worldAt(s,off),sn=Math.sin(p.heading),cs=Math.cos(p.heading);
    const height=1.82*(.94+((seat*3+row+section)%5)*.025),cardWidth=height*.375;
    const x=p.x+sn*along,z=p.z+cs*along,bottom=p.y+y-.6;
    const variant=(seat*5+row*3+section)%8,u0=(variant+.008)/8,u1=(variant+.992)/8;
    const first=positions.length/3,tint=.81+((seat+row*2+section)%7)*.025;
    // The front of the card faces the infield. Transparent padding preserves
    // individual silhouettes; cards stay behind the solid stadium wall.
    for(const [horizontal,vertical,u,v] of [[-.5,0,u0,0],[.5,0,u1,0],[-.5,1,u0,1],[.5,1,u1,1]]){
      positions.push(x-sn*horizontal*cardWidth,bottom+height*vertical,z-cs*horizontal*cardWidth);uv.push(u,v);colors.push(tint,tint,tint);
    }
    indices.push(first,first+1,first+2,first+2,first+1,first+3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  return geometry;
}

export function addStadiumCrowd(group,course){
  const material=new THREE.MeshStandardMaterial({map:crowdTexture(),alphaTest:.55,roughness:1,side:THREE.DoubleSide,vertexColors:true});
  const crowd=new THREE.Group();crowd.name='Stadium spectators';
  for(let i=0;i<STADIUM_SECTIONS;i++){
    const mesh=new THREE.Mesh(stadiumCrowdGeometry(course,i),material);mesh.name=`Grandstand spectators ${i+1}`;mesh.receiveShadow=true;crowd.add(mesh);
  }
  group.add(crowd);return crowd;
}
