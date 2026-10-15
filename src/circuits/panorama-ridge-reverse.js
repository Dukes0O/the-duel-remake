import {PANORAMA_RIDGE, manifest as parentManifest, panoramaPlacements} from './panorama-ridge.js';
import {reverseVariant} from '../circuit-variants.js';
import {buildTrackScript} from '../track-script.js';
const straight = buildTrackScript(PANORAMA_RIDGE).pieces.find(p => p.name === 'Pit Straight');
const paddock = new Set(['start-gantry', 'pit-garage', 'grandstand', 'pit-wall']);
export const {definition, manifest} = reverseVariant(PANORAMA_RIDGE, parentManifest, {
  id: 'panorama-ridge-reverse', name: 'Panorama Ridge Reverse', releaseOrder: 9,
  scriptStart: straight.s1 - straight.s0 - PANORAMA_RIDGE.scriptStart,
  placements: (d, {mappedKit}) => [...PANORAMA_RIDGE.kitPlacements.filter(p => !paddock.has(p.id)).map(mappedKit),
    ...panoramaPlacements(buildTrackScript(d), 1).filter(p => paddock.has(p.id))],
});
