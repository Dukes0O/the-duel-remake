import {SUMMIT_RUN, manifest as summitManifest} from './summit-run.js';
import {SUMMIT_ATTACK_ID} from '../summit-attack.js';

// The same authored road and generation identity; only the event changes.
// Root supplies attackBaselineSec and attackTimes after the accepted native run.
export const SUMMIT_TIME_ATTACK = Object.freeze({
  ...SUMMIT_RUN,
  id: SUMMIT_ATTACK_ID,
  name: 'Summit Time Attack',
  defaultMode: 'timetrial',
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
