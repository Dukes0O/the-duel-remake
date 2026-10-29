import {KOGANE_PASS, manifest as parentManifest} from './kogane-pass.js';
import {lightVariant} from '../circuit-variants.js';
// Dark from the start line (the parent runs dusk into night); the car park, tea house and lanterns are the parent's own lit kit.
const variant = lightVariant(KOGANE_PASS, parentManifest, {id: 'kogane-pass-night',
  name: 'Kogane Pass Night', look: 'night', releaseOrder: 15});
export const KOGANE_PASS_NIGHT = variant.definition;
export const manifest = variant.manifest;
