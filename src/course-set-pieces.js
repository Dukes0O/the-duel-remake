// Small physical placement contract for the Blender-built landmark family.
// Mesh data stays in the lazy renderer; physics imports only these footprints.
export const SET_PIECE_BOUNDS = Object.freeze({
  lodge:{halfX:5.85,halfZ:4.65,height:9.7},
  gallery:{halfX:12.85,halfZ:5.55,height:10.85},
  pavilion:{halfX:9.15,halfZ:5.95,height:10.1},
  tower:{halfX:5.6,halfZ:4.6,height:13.4},
  gantry:{halfX:12.25,halfZ:2.6,height:16.3},
  skydeck:{halfX:12.2,halfZ:8.2,height:9},
});

export function buildCourseSetPieces(course){
  if(!course.def.expansion)return [];
  const key=course.def.expansion.landmark,bounds=SET_PIECE_BOUNDS[key],preferred=course.length*course.def.expansion.landmarkFraction;
  for(const shift of [0,32,-32,64,-64,96,-96])for(const off of [-38,38,-48,48,-62,62]){
    const s=preferred+shift,frame=course.at(s),pose=course.worldAt(s,off),c=Math.cos(frame.heading),sn=Math.sin(frame.heading);
    let minimum=Infinity,maximum=-Infinity,clear=true;
    for(const x of [-bounds.halfX,0,bounds.halfX])for(const z of [-bounds.halfZ,0,bounds.halfZ]){
      const point={x:pose.x+c*x+sn*z,z:pose.z-sn*x+c*z},near=course.nearest(point.x,point.z);
      if(near.distance<course.roadHalfWidthAt(near.s)+9||course.tunnelAt(near.s)&&near.distance<40){clear=false;break;}
      const y=course.groundAt(near.s,near.lateral).y;minimum=Math.min(minimum,y);maximum=Math.max(maximum,y);
    }
    if(!clear||maximum-minimum>9)continue;
    const radius=Math.hypot(bounds.halfX,bounds.halfZ)+5;
    if(course.sections.some(sec=>{const station=course.worldAt(sec.start+195,-26);return Math.hypot(station.x-pose.x,station.z-pose.z)<radius+15;}))continue;
    return [{id:`set-piece-${key}`,kind:'building',setPiece:key,s,off,x:pose.x,z:pose.z,y:minimum-.25,
      baseY:maximum+.08,foundationDepth:maximum-minimum+.33,heading:frame.heading,shape:'box',
      halfX:bounds.halfX,halfZ:bounds.halfZ,height:bounds.height+maximum-minimum+.33,theme:course.themeAt(s)}];
  }
  throw new Error(`No safe landmark placement for ${course.def.id}`);
}
