// Presentation only: read the simulation's ground clearance, never estimate
// height from speed, scenery elevation or the vehicle's cosmetic suspension.
const LANDING_HOLD_SECONDS=2;
const hidden=()=>({phase:'hidden',heightMeters:0,peakMeters:0,distanceMeters:0,durationSeconds:0});
const counter=value=>Number.isFinite(value)&&value>=0?value:0;

export function createJumpHeightReadout(){
  let previousCourse=null,previousTime=null,previousCrashes=null,previousResets=null;
  let airborne=false,peak=0,distance=0,duration=0,landedAt=null;
  const clear=()=>{airborne=false;peak=0;distance=0;duration=0;landedAt=null;};
  return {update(state,course){
    const time=state?.stageTimeSec,crashes=counter(state?.stageCrashes),resets=counter(state?.boundaryResets);
    const changedCourse=course!==previousCourse;
    const rewound=previousTime!==null&&Number.isFinite(time)&&time<previousTime;
    const recovered=(previousCrashes!==null&&crashes!==previousCrashes)||(previousResets!==null&&resets!==previousResets);
    previousCourse=course;previousTime=Number.isFinite(time)?time:null;previousCrashes=crashes;previousResets=resets;
    if(changedCourse||rewound)clear();
    // _safeReset clears _jumpY; a normal physical landing leaves it at the
    // ground height. Do not present a recovery teleport as a landed jump.
    const safeReset=!state?.airborne&&state?._jumpY===null&&(airborne||landedAt!==null);
    if(!course||state?.status!=='racing'||!Number.isFinite(time)||time<0||state.impactTimer>0||recovered||safeReset){
      clear();return hidden();
    }
    if(state.airborne){
      const height=Number.isFinite(state.airHeight)?Math.max(0,state.airHeight):0;
      if(!airborne){peak=0;distance=0;duration=0;}
      // Physics owns the takeoff point and final landing measurement. Reading
      // that value avoids display-rate-dependent distance or speed estimates.
      distance=counter(state.airDistance);duration=counter(state.airTime);
      airborne=true;landedAt=null;peak=Math.max(peak,height);
      return {phase:'airborne',heightMeters:height,peakMeters:peak,distanceMeters:distance,durationSeconds:duration};
    }
    if(airborne){airborne=false;landedAt=time;distance=counter(state.airDistance);duration=counter(state.airTime);}
    if(landedAt!==null&&time-landedAt<LANDING_HOLD_SECONDS-1e-9)return {phase:'landed',heightMeters:0,peakMeters:peak,distanceMeters:distance,durationSeconds:duration};
    clear();return hidden();
  }};
}
