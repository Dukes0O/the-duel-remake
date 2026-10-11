# FIX-P4-KERB-NORMALS

## Decision, before code

A genuine High Snow frame contains NaNs before Bloom. The first invalid pixel
hits a kerb with a zero vertex normal. Opposing duplicate triangles share the
same vertices and cancel their normals. The material already draws both sides.
Remove only the redundant reverse triangles. Keep vertex positions, UV data,
materials, road physics and seeded race results exact. Keep Bloom enabled.

Test real authored left/right curved, banked and climbing kerbs first: every
normal must be finite and unit length. Record their exact pre-fix position,
UV and material digest, then require it unchanged after the normal repair.
Native Snow must read finite actual scene, bright and blur targets, with
state/profile/memory saves unchanged. Gates and review precede integration.

## Checks

Focused regression RED: actual Snow ridge normal 160 has zero length.
GREEN after one reverse-index line removal: 2,112 finite unit normals and
1,056 nondegenerate faces across both sides, red/white, climb and bank cases.
Pre-fix position/UV/material digest 077a29a3...9e075d remains exact.
Native Snow High/Performance passes with eight cars, zero warnings/errors,
zero NaN/Inf in all12 actual HalfFloat scene/Bloom targets, default Bloom on.
Director source review clear; current integration genuinely synced. Exact e6b82a12 lane74/74 in91.20s and build616ms pass.
No existing test assertion or tolerance changes. No world signatures regenerated.

## Removed

Remove duplicate reverse kerb triangles. DoubleSide material remains the
existing back-face rendering path; no alternate Bloom or material path added.
