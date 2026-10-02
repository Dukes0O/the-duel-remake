// One key steps through every view in this order (Kyle, 1 October 2026).
export const CAMERA_CYCLE_KEY='KeyC';
export const CAMERA_MODES=Object.freeze(['chase','hood','wide','front','back','right','left']);
export const DIRECTIONAL_CAMERA_MODES=Object.freeze(['front','back','right','left']);

// Directions follow the car's heading, even when it reverses or leaves the road.
export function directionalCameraPose(mode,position,heading,tall=false){
  if(!DIRECTIONAL_CAMERA_MODES.includes(mode))return null;
  const reach=tall?13:10,side=mode==='right'?reach:mode==='left'?-reach:0;
  const forward=mode==='front'?reach:mode==='back'?-reach:0;
  const sin=Math.sin(heading),cos=Math.cos(heading),lookAhead=mode==='back'?3:0;
  return {position:{x:position.x+sin*forward+cos*side,y:position.y+(tall?5.5:3.3),z:position.z+cos*forward-sin*side},
    target:{x:position.x+sin*lookAhead,y:position.y+(tall?1.9:1.05),z:position.z+cos*lookAhead}};
}
