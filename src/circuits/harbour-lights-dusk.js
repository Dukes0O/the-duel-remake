import {HARBOUR_LIGHTS, manifest as parentManifest} from './harbour-lights.js';
import {lightVariant} from '../circuit-variants.js';
const variant = lightVariant(HARBOUR_LIGHTS, parentManifest, {id: 'harbour-lights-dusk',
  name: 'Harbour Lights Dusk', look: 'dusk', releaseOrder: 8});
export const HARBOUR_LIGHTS_DUSK = variant.definition;
export const manifest = variant.manifest;
