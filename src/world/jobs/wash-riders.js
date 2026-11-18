// A stand-alone fight for the laptop review at the Wash. Nothing on the story wall starts it.
import {LAND} from '../scablands-names.js';
import {makeRng} from '../../rng.js';
import {RIDER_RULE} from './rider-rule.js';

export function washRiderJob({seed=1, count=3, boxIn=false, weapon='ash-sack', fightToEnd=false}={}) {
  const rng = makeRng(seed), wash = LAND.at('the-wash'), rules = RIDER_RULE.wash;
  const carStart = {x:wash.x+rules.bankOffset, z:wash.z, heading:0};
  const scatter = boxIn ? rules.roadblockScatter : rules.scatter;
  const starts = boxIn ? rules.roadblock : rules.starts;
  if (boxIn) carStart.speedMph = rules.approachMph;

  const riders = starts.slice(0,count).map(([side,ahead],index) => {
    const x = carStart.x + side + (rng.float()-.5)*scatter;
    const z = carStart.z + ahead + (rng.float()-.5)*scatter;
    const heading = boxIn ? carStart.heading : Math.atan2(carStart.x-x,carStart.z-z);
    return {
      id:'ash-'+(index+1), name:'Ash rider '+(index+1), car:'dusthawk_rally', weapon, boxIn, fightToEnd,
      start:{x,z,heading,speedMph:boxIn ? rules.approachMph : 0},
      home:{x:carStart.x+side*rules.homeScale,z:carStart.z+ahead*rules.homeScale},
    };
  });
  const what = boxIn ? 'Keep turning to escape the roadblock.' : 'Drive off the Ash riders and keep your car running.';
  return {id:'wash-road-riders', name:'Riders at the Wash', steps:[
    {kind:'rider-fight',id:'wash',what,carStart,riders,onSurrounded:'lose'},
  ]};
}
