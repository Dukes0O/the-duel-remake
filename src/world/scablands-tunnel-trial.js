import {SCARPS} from './scablands-scarps.js';
import {trialTubeBetween} from './ground-tunnels.js';

// Start just inside the foot so the bore floor stays below the open ground.
export function westScarpTrial(heightAt) {
  const {a, b} = SCARPS.find(scarp => scarp.id === 'scab-west').stretches[0];
  const mid = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const across = {x: -(b.z - a.z) / length, z: (b.x - a.x) / length};
  const at = distance => ({x: mid.x + across.x * distance, z: mid.z + across.z * distance});
  return trialTubeBetween(at(2), at(102), 4, heightAt);
}
