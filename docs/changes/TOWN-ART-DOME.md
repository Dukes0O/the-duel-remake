# TOWN-ART-DOME

Status: one art round built and submitted for Claude's look verdict. Not wired
into the game.

## Design

Built one 28 by 20 cell oval bowl and a separate 6 by 3 cell gate. The oval has
seven rising wreck tiers, a rough steel support bank, a packed gravel floor,
the Heap, scaffold stands, torn banners and emissive flood lamps. The gate uses
two tilted bus bodies, a clear drive-through opening, a readable painted sign
and a ticket booth. The shared atlas uses the generated rust tile and the
existing rally gravel texture. Prompts and credits are recorded beside the
candidate asset.

The exported candidate read back at 28,504 triangles and 2,301,280 bytes. It
has the `town-dome` root, `dome-outer` and `dome-gate` children, the named lamp
hook, and one embedded 1K JPEG atlas. The card says this model is not wired into
the game, so the generated GLB stays in ignored `.qa-dist/` and is not committed.

## Evidence and checks

- One comparison sheet: `docs/board/looks/town-art-dome/round-1.jpg` (under
  500 KB) with the photo reference, gate view, mayor view and driver view.
- Claude should judge likeness, especially the rusty support bank versus the
  reference's stacked crushed cars, along with the gate and roofline views.
- `node tools/test-blender-output.mjs`: passed, 239 checks; the candidate read-back
  measured 28,504 triangles and 2,301,280 bytes.
- `node tools/test-repo-hygiene.mjs`: passed.
- `node --test tools/test-review-evidence.mjs`: 8 of 9 subtests passed. The audio
  fixture failed twice at `spawnSync ffmpeg EPERM`; JPG size and review-note checks
  passed.
- Lane tier: all 47 suite results were written; 45 passed and two failed on the
  same FFmpeg loudness/permission problem (`test-circuit-eifel` and
  `test-review-evidence`). The runner did not return its summary after the final
  suite, so its shell was stopped after the completed results were preserved.
  `test-circuit-eifel` was rerun alone and failed at the same FFmpeg loudness step.
- `npm.cmd run build`: passed. PowerShell blocked the `npm` script shim, so the
  equivalent `npm.cmd` entry point ran the build.
- Browser and frame checks: not run; the card says they belong to Claude and
  no frame check applies to art.
- Changed assertions: added the TOWN-ART-DOME read-back, name, triangle, byte
  and 1K atlas checks. Private candidates in `.qa-dist/` are allowed to exist
  before approval, while a candidate under `public/` must remain absent. The
  existing candidate byte check now uses a card's declared `maxBytes` when
  supplied; existing budgets remain unchanged.
- Race fingerprints: not applicable; no game or race code changed.

## Removed

Deleted trial Blender renders, the candidate GLB, temporary `.blend`, and logs
after the final checks. No prior model or source asset was replaced.
