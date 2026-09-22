import {CARS,COURSE} from './config.js';
import {normalizeDriverId} from './drivers.js';

export function normalizeRival(value) {
  const v=value&&typeof value==='object'?value:{};
  // A live simulation actor is not a saved setup (some callers spread state
  // into result payloads). Never classify the legacy CPU as a custom rival.
  if('s' in v||'speedMph' in v)return null;
  const car=Object.hasOwn(CARS,v.car)?v.car:'match';
  const driverId=normalizeDriverId(v.driverId);
  const upgradeLevel=Number.isFinite(v.upgradeLevel)?Math.max(0,Math.min(3,Math.floor(v.upgradeLevel))):0;
  return car==='match'&&driverId==='club'&&upgradeLevel===0?null:{car,driverId,upgradeLevel};
}
export function rivalSignature(result) {
  const stage=COURSE[result.stageIndex],rival=normalizeRival(result.rivalSettings??result.rival);
  if(!rival||result.mode==='timetrial'||!stage?.hasRival||stage.practice)return '';
  return `${rival.car}:${rival.driverId}:${rival.upgradeLevel}`;
}
