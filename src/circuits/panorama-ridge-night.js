import {PANORAMA_RIDGE, manifest as parentManifest} from './panorama-ridge.js';
import {lightVariant} from '../circuit-variants.js';
const variant = lightVariant(PANORAMA_RIDGE, parentManifest, {id: 'panorama-ridge-night',
  name: 'Panorama Ridge Night', look: 'night', releaseOrder: 7, state: 'on'});
export const PANORAMA_RIDGE_NIGHT = variant.definition;
export const manifest = variant.manifest;
