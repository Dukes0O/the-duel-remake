import {HARBOUR_LIGHTS, HARBOUR_STREET, manifest as parentManifest} from './harbour-lights.js';
import {reverseVariant} from '../circuit-variants.js';
import {buildKitPlacements} from '../circuit-kit-layout.js';
export const {definition, manifest} = reverseVariant(HARBOUR_LIGHTS, parentManifest, {
  id: 'harbour-lights-reverse', name: 'Harbour Lights Reverse', releaseOrder: 10,
  placements: (d, {spans}) => buildKitPlacements(d, {...HARBOUR_STREET,
    paddock: {...HARBOUR_STREET.paddock, garages: {...HARBOUR_STREET.paddock.garages, side: -HARBOUR_STREET.paddock.garages.side,
      from: -HARBOUR_STREET.paddock.garages.to, to: -HARBOUR_STREET.paddock.garages.from},
      stands: {...HARBOUR_STREET.paddock.stands, side: -HARBOUR_STREET.paddock.stands.side,
        from: -HARBOUR_STREET.paddock.stands.to, to: -HARBOUR_STREET.paddock.stands.from}},
    rows: spans(HARBOUR_STREET.rows), strings: spans(HARBOUR_STREET.strings),
    signs: spans([HARBOUR_STREET.signs])[0],
    singles: HARBOUR_STREET.singles.map(p => ({...p, lateral: -p.lateral})),
  }),
});
