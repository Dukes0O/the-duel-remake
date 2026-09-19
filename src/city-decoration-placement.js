// Match the actual sidewalk tiles and solid footprints. A small spatial grid
// keeps this build-time cosmetic filter independent of the physics broadphase.
const CELL=32,MAX_MARGIN=1;
function polygonDistanceSq(points,x,z){
  let inside=false,best=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[j],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz))),px=x-a.x-t*dx,pz=z-a.z-t*dz;
    best=Math.min(best,px*px+pz*pz);
  }
  return inside?0:best;
}
export function createCityDecorationPlacement(course){
  const cells=new Map();
  const add=points=>{
    const minX=Math.floor((Math.min(...points.map(p=>p.x))-MAX_MARGIN)/CELL),maxX=Math.floor((Math.max(...points.map(p=>p.x))+MAX_MARGIN)/CELL);
    const minZ=Math.floor((Math.min(...points.map(p=>p.z))-MAX_MARGIN)/CELL),maxZ=Math.floor((Math.max(...points.map(p=>p.z))+MAX_MARGIN)/CELL);
    for(let x=minX;x<=maxX;x++)for(let z=minZ;z<=maxZ;z++){const key=`${x}:${z}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(points);}
  };
  const box=(feature,halfX,halfZ)=>{
    const c=Math.cos(feature.heading),s=Math.sin(feature.heading);
    add([[-halfX,-halfZ],[halfX,-halfZ],[halfX,halfZ],[-halfX,halfZ]].map(([x,z])=>({x:feature.x+c*x+s*z,z:feature.z-s*x+c*z})));
  };
  for(const section of course.sections.filter(section=>section.theme==='city'))for(let s=section.start+12;s<section.end-12;s+=6){
    const end=Math.min(section.end-12,s+6),middle=(s+end)/2;
    if(course.features.stations.some(station=>Math.abs(station.s-middle)<23))continue;
    if(course.features.shortcuts.some(cut=>middle>cut.start-18&&middle<cut.end+18))continue;
    for(const side of[-1,1])add([[s,.75],[s,5.1],[end,5.1],[end,.75]].map(([ss,d])=>course.groundAt(ss,side*(course.roadHalfWidthAt(ss)+d))));
  }
  // Facade trim projects about 0.4 m beyond the existing body. The margin is
  // cosmetic only: no collision hull, building, tree or physical rock moves.
  for(const building of course.features.buildings)if((building.theme||course.themeAt(building.s))==='city')box(building,building.halfX+.45,building.halfZ+.45);
  for(const station of course.features.stations)if((station.theme||course.themeAt(station.s))==='city')box(station,10.5,9);
  const clearAt=(x,z,margin=.65)=>{
    if(!(margin>=0&&margin<=MAX_MARGIN))throw new RangeError('City decoration margin must be within 0–1 m.');
    return !(cells.get(`${Math.floor(x/CELL)}:${Math.floor(z/CELL)}`)||[]).some(points=>polygonDistanceSq(points,x,z)<=margin*margin);
  };
  const relocate=(position,index)=>{
    if(clearAt(position.x,position.z))return position;
    const origin=course.nearest(position.x,position.z),side=Math.sign(origin.lateral)||1;
    // No RNG consumption: changing city decoration cannot perturb later
    // physical rocks, delineators, or placements in the other biomes.
    for(const ds of[0,6,-6,14,-14,28,-28,48,-48]){
      const s=course.phase(origin.s+ds);if(course.themeAt(s)!=='city')continue;
      for(const direction of[side,-side])for(let attempt=0;attempt<12;attempt++){
        const off=direction*(Math.max(course.roadHalfWidthAt(s)+6.25,Math.abs(origin.lateral))+1.3+(index%7)*.31+attempt*3.5);
        if(Math.abs(off)>76||course.surfaceAt(s,off).road||course.tunnelAt(s)&&Math.abs(off)<35)continue;
        const point=course.groundAt(s,off),nearest=course.nearest(point.x,point.z);
        if(course.surfaceAt(nearest.s,nearest.lateral).road||!clearAt(point.x,point.z))continue;
        return point;
      }
    }
    return null;
  };
  return{clearAt,relocate};
}
