import {SUMMIT_RUN, manifest as summitManifest} from './summit-run.js';
import {SUMMIT_ATTACK_ID, summitAttackTargets} from '../summit-attack.js';

// The same authored road and generation identity; only the event changes.
// One genuine stock F42 / winter / .95-line / Medium / 1989 whole run.
const attackBaselineSec = 266.6;
export const SUMMIT_TIME_ATTACK = Object.freeze({
  ...SUMMIT_RUN,
  id: SUMMIT_ATTACK_ID,
  name: 'Summit Time Attack',
  defaultMode: 'timetrial',
  attackBaselineSec,
  attackTimes: summitAttackTargets(attackBaselineSec),
  laps: 1,
  grandPrixLaps: 1,
  fieldSize: 1,
  hasRival: false,
  noTraffic: true,
  noCombat: true,
});

export const manifest = Object.freeze({
  id: SUMMIT_ATTACK_ID,
  flag: summitManifest.flag,
  state: summitManifest.state,
  price: 0,
  grandPrix: false,
  releaseOrder: 6,
  driver: summitManifest.driver,
  unlock: Object.freeze({kind: 'owned-course', defaultEventId: 'summit-run'}),
});
