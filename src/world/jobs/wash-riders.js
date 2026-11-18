// A stand-alone fight for the laptop review at the Wash. Nothing on the story wall starts it.
import {LAND} from '../scablands-names.js';
import {makeRng} from '../../rng.js';
import {RIDER_RULE} from './rider-rule.js';

export function washRiderJob({seed=1,count=3,boxIn=false,weapon='ash-sack',fightToEnd=false}={}) {
  const rng=makeRng(seed), wash=LAND.at('the-wash'), slots=RIDER_RULE.wash;
  const carStart={x:wash.x+slots.bankOffset,z:wash.z,heading:0};
  const scatter=boxIn ? slots.roadblockScatter : slots.scatter;
  if(boxIn) carStart.speedMph=slots.approachMph;
  const riders=(boxIn ? slots.roadblock : slots.starts).slice(0,count).map(([side,ahead],index)=>{
    const id=`ash-${index+1}`, x=carStart.x+side+(rng.float()-.5)*scatter, z=carStart.z+ahead+(rng.float()-.5)*scatter;
    return {id,name:`Ash rider ${index+1}`,car:'dusthawk_rally',weapon,boxIn,fightToEnd,
      start:{x,z,heading:boxIn ? carStart.heading : Math.atan2(carStart.x-x,carStart.z-z), speedMph:boxIn ? slots.approachMph : 0},
      home:{x:carStart.x+side*slots.homeScale,z:carStart.z+ahead*slots.homeScale}};
  });
  return {id:'wash-road-riders',name:'Riders at the Wash',steps:[{kind:'rider-fight',id:'wash',carStart,riders}]};
}
