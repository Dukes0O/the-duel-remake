# TOWN-ART-WATER — round 4

Updated the water-tower, pump-house, treatment plant and reservoir in the
exported town family. The well and standpipe geometry remain as submitted in
round 3. Replaced the corrugated-tin picture with a dark, finer-ribbed photo
texture and credited its prompt in the town texture `CREDITS.md`.

The tower now has dark 28 cm timber legs and 25 cm braces, bolted joints, a
thicker plank deck, a dark rusted tank and a ladder that reaches it. The pond
has an irregular eroded earth slope, lower dark water, sandbags and an outlet
pump joined into its bank. The pump house is open at the front, with an
overhanging fine-rib roof, engine block, flywheel, piping and sandbag base. The
treatment works have brown settling water, a faded rusted-steel clean tank,
thicker linked pipes and lower rusted roofs on posts.

The recipe standardizes joined mesh UV layers to `UVMap` before export. The
round 4 sheet renders the exported GLB after importing it into an empty Blender
scene. It places the generated reference photo beside the road-height view,
then shows the mayor view and separate building details. The source reference
photo stays outside the repository; only its crop is on the sheet.

## Checks and review

- `node tools/test-blender-output.mjs`: passed, 251 checks and no failures. It
  confirms the six named buildings and moving parts, per-building triangle
  limits, the 3 MB family limit, embedded JPEGs, metallic factors at or below
  0.3, and one ranged `TEXCOORD_0` on every primitive.
- `node tools/test-repo-hygiene.mjs`: passed. Repository placement is clean;
  the tool reports existing repository size targets as advisory.
- No lane tier or build was run; this art card uses its named checks only.
- No browser or in-game look check was run. Claude should review
  `docs/board/looks/town-art-water/round-4.jpg`, especially the tank and bolted
  frame, the pump-house engine, the treatment pipe connections, the pond bank
  and outlet, and the full mayor view. Browser checks are outside this lane.
- No race rules, saves, tests of gameplay or replay fingerprints changed.
  The UV range assertion is new; no existing assertion was loosened.

Reference image prompt (built-in ImageGen):

> Photorealistic documentary modeling reference, wide landscape, plain bright
> overcast daylight: a dusty improvised desert town waterworks. A tall dark
> rusted cylindrical steel water tank sits on heavy weathered square timber
> legs with bolted joints, substantial cross braces, thick plank platform and
> a ladder reaching the tank. Nearby is an open-front pump shed with a shallow
> overhanging finely ribbed rust-streaked corrugated tin roof; show the diesel
> engine block, large flywheel and connected pipes inside on a sandbag base.
> Foreground: an irregular dug pond with a real sloping eroded earth bank,
> uneven sandbags, muddy lip and dark water reflecting a little cloudy sky; an
> outlet pipe visibly joins the bank. Beside it, linked treatment stages:
> brown settling water inside thick stained concrete walls with timber
> walkways, a sand filter, a compact rusted boiler, then a covered weathered
> painted-steel clean tank; thick pipes join the sequence. Real proportions,
> gritty hand-built construction, rich but muted dark brown rust and dusty
> earth, no pale aqua, saturated orange or toy appearance. Eye-level
> three-quarter documentary camera, 35 mm lens, tower and pump shed prominent,
> pond and treatment process readable, even bright light, crisp surface
> detail. No people, labels, text, watermark or fantasy elements.

## Removed

- Deleted the round 1 and round 2 sheets and their review notes, as superseded
  by the round 4 submission. Round 3 remains as prior review evidence.
- Removed the pump-house front panels and raised block reservoir edges. The
  replacement forms use an open front and a sloped bank.
- No player data, game rules or saves were removed.
