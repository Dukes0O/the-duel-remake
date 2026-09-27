# WAR-SAL-ART — Sawtooth Sal look and sound

## Result

Built the settled Banshee-only side-saw rig and its future fight presentation
hooks. The Banshee GLB now has a named Sal root, separate left/right blade
pivots, braced mounts and a bounded spark group. The renderer exposes idle,
spin-up and sparking without changing race state. One positional
`arena.sal-saw` cue is gated by `scrapdome` for the future fight event.

The third and final bounded review sheet is ready for Claude. The independent
critic rejected round 1, accepted the round-2 blade, material, motion and
framing changes, and requested one final spark-only fix. Round 3 replaces the
rigid spark comb with short, unequal, two-colour streaks that phase
deterministically. The final independent verdict passed, so this card should
move to `status: review` and `waiting_on: claude`; board metadata remains
Director-owned.

## Design used

The implementation follows the settled card and `docs/SCRAPDOME.md` section 5:
Sawtooth Sal drives the Banshee Muscle, and the future Saw Sweep tell spins the
saws with sparks and a rising scream. No encounter rule, reward, simulation
state or generic Raider kit changed.

The GLB is rebuilt by:

```text
blender -b --python tools/blender/armor-kits.py -- --root <repo> --cars banshee_muscle
```

Only `banshee_muscle.glb` was exported. The focused acceptance test pins the
other eight kit hashes byte-for-byte.

## Audio source and recipe

`Circular Saw 02 170501_1491.wav` by megashroom, Freesound 390712, CC0 1.0.
The public HQ Ogg preview is cached outside the repository. Its primary page,
download URL, SHA-256 and processing recipe are in `tools/audio/catalog.json`.
`node tools/audio/build-sal.mjs` verifies the source hash and builds an exactly
1.200-second mono Vorbis runtime cue. Audio QA measured -14.4 LUFS and -2.9
dBFS true peak, no clipping or click spike, and about +8.8 dB over the raw
high-load engine after the cue gain. Both shipped credit views name the source,
author, licence and recipe.

## Tests first

Commit `03b245a` added the acceptance suite before implementation. Its first
run had 1 passing and 8 failing tests for the missing rig, state, scope, cue,
source recipe, credits, review paths and sheet. No assertion was weakened or
changed during implementation.

## Checks

- `node --test tools/test-sal-art.mjs`: 9/9 tests passed; 93 acceptance checks.
- `node tools/test-armor-kit-authored.mjs`: 5/5 passed.
- `node tools/test-armor-kit-resource-lifecycle.mjs`: 1/1 passed.
- `node tools/test-armor-kit-assets.mjs`: 2/2 passed, including all nine GLBs
  and UV coverage.
- `node tools/test-armor-kit-fit.mjs`: 1/1 passed.
- `node tools/test-sound-bank.mjs`: passed.
- `node tools/test-audio.mjs`: 460 checks passed with 617,062 finite audio
  automation commands and actual PCM decoding. This required direct host
  access to the installed FFmpeg decoder; the first restricted run could not
  decode the recordings and was not a product failure.
- `node tools/test-repo-hygiene.mjs`: passed; size targets remain advisory.
- `node tools/browser-harness.mjs scenario sal-art --output-dir
  .evidence/sal/round-3`: private port 49451; High and Performance idle,
  spin-up, sparking and chase spark-peak; 8 screenshots; memory-only saves;
  0 warnings and 0 errors. Rig-off/on CPU submission measurements are recorded
  in the round-3 look note.

The Banshee kit grew from 441,000 bytes to 508,492 bytes. All three review
sheets are below the 500 KB cap. The runtime Ogg is 17,309 bytes.

## Race fingerprints and save safety

No simulation, inputs, rewards, storage or save code changed. The saw poses
derive only from existing stage time and the future presentation state, and
the renderer does not mutate either. No race fingerprint was repinned. Browser
QA used only the harness's memory-only storage facade.

## Visual review

All three bounded rounds and their verdict records remain under
`docs/board/looks/sal/`. Round 2 enlarged and moved the blades outward, used
cool honed steel, added a rotating asymmetric spoke and tightened the state
and chase framing. Round 3 changed only the rejected sparks: a short fan of
unequal white-hot and orange streaks now emits from the blade edge and phases
deterministically instead of forming a static comb. Claude should still judge
the moving spin in Preview when the fight hook is built. The three-round cap
is exhausted. Independent round-3 review passed every scored area at 4 or
better and found the final sparks contained and readable in High and
Performance close and chase views.

## Removed

- Deleted disposable High/Performance PNG captures, the browser report, the
  isolated QA bundle and the generated `.blend` after recording the verdict.
- No runtime asset, generic Raider part, old model, test, or code path was
  replaced. The other eight armor-kit GLBs remain byte-for-byte unchanged.
