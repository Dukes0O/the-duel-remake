import {TREMBLANT_WOODS, manifest as parentManifest} from './tremblant-woods.js';
import {reverseVariant} from '../circuit-variants.js';
export const {definition, manifest} = reverseVariant(TREMBLANT_WOODS, parentManifest, {
  id: 'tremblant-woods-reverse', name: 'Tremblant Woods Reverse', releaseOrder: 11,
});
