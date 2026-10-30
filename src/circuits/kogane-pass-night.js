import {KOGANE_PASS, manifest as parentManifest} from './kogane-pass.js';
import {lightVariant, copyCourseDescriptor} from '../circuit-variants.js';
// Dark from the start line (the parent runs dusk into night); the car park, tea house and lanterns are the parent's own lit kit.
const variant = lightVariant(KOGANE_PASS, parentManifest, {id: 'kogane-pass-night',
  name: 'Kogane Pass Night', look: 'night', releaseOrder: 15, state: 'on'});
// The parent opens on Grand Prix; the Night road is the story's Night Duel, so choosing it keeps Rival Duel (Grand Prix stays one press away).
export const KOGANE_PASS_NIGHT = copyCourseDescriptor(variant.definition, {defaultMode: 'duel'});
export const manifest = variant.manifest;
