import {PANORAMA_RIDGE, manifest as parentManifest, panoramaPlacements} from './panorama-ridge.js';
import {reverseVariant} from '../circuit-variants.js';
import {buildTrackScript} from '../track-script.js';
const straight = buildTrackScript(PANORAMA_RIDGE).pieces.find(p => p.name === 'Pit Straight');
const paddock = new Set(['start-gantry', 'pit-garage', 'grandstand', 'pit-wall']);
export const {definition, manifest} = reverseVariant(PANORAMA_RIDGE, parentManifest, {
  id: 'panorama-ridge-reverse', name: 'Panorama Ridge Reverse', releaseOrder: 9,
  scriptStart: straight.s1 - straight.s0 - PANORAMA_RIDGE.scriptStart,
  placements: (d, {mappedKit}) => {
    const road=buildTrackScript(d);
    const rows=PANORAMA_RIDGE.kitPlacements.filter(p=>!paddock.has(p.id)).map(mappedKit).map(p=>{
      if(p.id!=='catch-fence')return p;
      // The native width blend follows the new direction. The actual4m panel
      // (asset half-length2m, scaleX2) must clear its complete road-side span.
      const setback=Math.max(...[-4,0,4].map(ds=>road.halfWidthAt(p.s+ds)))+1.8;
      return {...p,lateral:Math.sign(p.lateral)*Math.max(Math.abs(p.lateral),setback)};
    });
    return [...rows,...panoramaPlacements(road,1).filter(p=>paddock.has(p.id))];
  },
});
