# HELI-LOGBOOK paints: round 2

26 October 2026. **Ready for Claude's second-round verdict. No round 3 has
been run; no new art acceptance is claimed.**

Picture: [round-2.jpg](round-2.jpg), 494,163 bytes. The native game renderer
shows stock plus all five paints, at the same home pad, side camera, near
24-degree lens and native 55-degree lens as round 1, in High and Performance.
No frame timing was run. The round 1 sheet and its note remain available
as the reviewed comparison history.

Changes follow Claude's verdict on the card:

- Student and Mountain keep their accepted colours and bands. Only the
  requested light wear is added to these two paints.
- Private has one bright silver line about 13 cm wide. It rises from the
  cabin waist onto the tail boom and remains continuous along its metal.
- Commercial has a clear cream cabin-side band. Its original cream flying
  kestrel is now large on the tail boom, clear of the canopy boundary.
- Chief has a broader signal-red belly and a red tail fin. Its original
  red-brown kestrel is hand-painted on the cream tail boom.
- All five receive light exhaust soot immediately behind the engine,
  fading aft onto the tail root. The skid rails receive fine dark contact
  scratches in their actual material. The scuffs apply only to the skids;
  shared mast metal keeps its existing material. Stock and mission paint
  restore the original skid materials, and disposal releases the clones.

Builder's observation: the brighter line, cream band, broader red area and
tail kestrels now read in the matched views. The soot and skid marks remain
light at this distance. Claude decides whether these meet the requested
finish; this note does not stand in for that verdict. Parent has viewed the
sheet and the independent rendering code review is clear.

Checks:

- `tools/test-heli-rank-paint.mjs` passes, including four new assertions:
  rank paint uses a separate scuffed skid material; the shared mast stays
  unchanged; returning to existing paint restores the original skids;
  disposal restores them before scene cleanup. No old assertion changed.
- `node tools/check-art-intake.mjs` passes. Separate `inspectPng` validation
  confirms all five maps remain opaque RGB, 1024 square and under the
  recorded 1,500,000-byte limit: Student 1,136,484; Private 751,423;
  Commercial 881,720; Mountain 1,109,000; Chief 1,122,524 bytes.
- The existing manual-only `heli-logbook-art` browser recipe passes:
  private port 25388, memory-only storage, 25 pictures, zero warnings or
  errors. The scuff shader compiles in the native renderer. No player saves
  or live port were used.
- Before Blender generation and browser capture, the current integration
  inbox was read by its absolute path; no active hold was present. Both
  jobs were admitted under three outer heavy processes. The browser's
  one-minute check counted two; Blender generation ended in seven seconds.

Provenance: full current prompts, date, tool, exact runtime use and credits
are in `docs/WASTELAND_ART.md`. The deterministic Blender/NumPy recipe is
`tools/blender/heli-logbook-paints.py`. Original output was generated outside
the repository in `%TEMP%/duel-heli-logbook-originals-round-2-2026-10-26/`.
There is no external source art, licensed mark or new lettering.

Removed: round 2 replaces the five round 1 runtime texture files. The old
door kestrel path is removed from the recipe; there is one tail motif.
Raw round 2 browser pictures, temporary original outputs and their QA
bundle are recycled after these observations and the sheet are saved.
Parent's gate logs and prior compact round sheets remain untouched.
