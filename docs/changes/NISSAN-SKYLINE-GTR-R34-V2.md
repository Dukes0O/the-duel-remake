# NISSAN-SKYLINE-GTR-R34-V2: final shape round 3

Status: round 3 complete for review; self-verdict NOT YET, 3/5 resemblance. Flag: nissan-skyline, dev. No shop entry.

## Changed

Claude scored round 2 NOT YET, about 2.5/5. Its self-score of 4 was too high.
The final round replaces the code-built body and floating roof with an original
Blender shell. A connected cage carries the bonnet, shoulders, flared arches,
glass regions, painted pillars and solid roof. Subdivision rounds the surfaces;
decimation reduces the runtime mesh. Rounded boolean cuts make actual front
intake, grille, lamp and rear-panel recesses. The body has a central bonnet
bulge. The details retain a wide wing on two boot uprights below the roof,
single right exhaust and the left-seat driver. Six thick silver spokes sit
in dark barrels with visible tyre sidewalls. Angular headlight lenses sweep
back around the wings, above corner fog lamps and the black lip.

The existing registry now preloads the local GLB, using the Speirling pattern.
Instances remain synchronous after loading. Missing or failed models return
no car; explicit retry is supported. Each car has private geometry, paint,
damage and reset buffers. No primitive fallback, new dependency, simulation,
world, sound, event, save, reward or other car change.

## Checks

The final headless contract passes 294 checks, at 55,688 visible triangles
and 52 draws. No player storage accessed. The unchanged checks first caught
a 1.2783 m trim height, 63,534-triangle candidate and too few side fracture
samples. Straight fitted trim, lower export density and a visual damage-space
y scale of .86 place those samples inside the new glazing. All original
height, budget, fracture, dent, crush and grounding assertions now pass.

The final five-view sheet is 287,563 bytes. It was inspected against all four
supplied reference views. Top view has no supplied reference and is labelled.
Self-verdict: NOT YET, resemblance 3/5, static readability 3.5, grounding 4,
studio consistency 3.5 and geometry cost 4. No driving, frame-cost or release
claim. The square bumper, lens detail, angular glasshouse, uneven panel
reflections and simple rear wing remain below the reference. See the final
review note for the five differences. Stop after round 3 of 3.

The exact requested scratchpad file is copied and byte-identical by SHA-256:
051e2f407591f2cef13aea123653b961466944311ce6cb2444dd903e845331a3.

Independent code review is clear after fixing a real decimation fault: Blender
collapse mode ignores material delimiters. Zero-weight border vertices now
protect the glass outline. The reviewer confirmed this fix and checked the
new six-spoke geometry, reflected winding, merging, private buffers and loader.

The PowerShell lane gate passes: 72 suites, zero failed and zero not run,
1,119.16 seconds, jobs 2. Replay fingerprints pass 225 checks across 25 cases
and 23 events; combat replay passes 12 across four encounters. All 47
immutable-feature and exact complete-scene guards pass. No pins re-recorded.
Production build passes: 600 modules, 1.20 seconds. Existing mixed-import and
chunk-size warnings remain. Linked dependencies have no vite.cmd, so a
lane-only command shim calls the installed Vite CLI with its native config
loader, keeping all output inside .qa-dist/skyline-round3. No dependency or
shared-folder write. An optional production-copy checksum was not verified:
Get-FileHash was unavailable in the non-elevated shell, and the temporary
build was recycled. This is not included in the passing-check evidence.
No browser or frame measurement applies to this shape round. Shared slots
caused long waits; no competing job was stopped.

## Changed assertions

The former registry expectation of immediate readiness is replaced with
idle/loading/ready checks because the authorized GLB route requires preloading.
Added checks prove no primitive substitute, shared concurrent promise, cached
failure, explicit retry and missing-material rejection. All existing dimension,
helmet clearance, exposed lamps, damage, fracture, exact reset, sibling
isolation, grounding, tumble and 60,000 triangle / 56 draw assertions remain.
No tolerances are relaxed. Claude's written review remains required before
merge, including the earlier round's geometry and flag-catalogue changes.

Earlier rounds on this branch changed model height 1.38 to 1.25 m, tyre radius
.34 to .37 m and wheel travel to use .37 m, with unchanged tolerances. The
roof ray follows the forward seat, headlight rays follow the raised lenses,
and exactly one boost flame follows the requested single exhaust. The shared
flag test count is 41 to 42, requiring nissan-skyline to stay dev; no existing
switch state or retired-name guard is removed. These earlier assertion changes
also await Claude's written review on the card before merge.

## Removed

The old sculpted code shell, flat roof and stick pillars are replaced in this
round. The GLB recipe is kept, with the runtime GLB, without a blend file.
Round-2.jpg is recycled. The superseded review note is replaced by the
matching round-3-review.md, carrying Claude's 2.5/5 verdict and the current
findings. Raw round 3 evidence, gate/build logs, the temporary production build and
lane-only command shim are recycled after recording the results. Only the
final sheet remains as review output. The runtime GLB is 243,740 bytes.

## Handoff

Stop after round 3 of 3. Claude judges the final art. No merge, push, release,
frame timing, integration-folder action or live-game action is authorized.

Director handles Cockpit sync on merge. This job is restricted to lane writes
and the one named scratchpad copy. STATUS omits all other lane inspections.
