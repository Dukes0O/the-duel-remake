# ARENA-06: Salt Flats

Status: accepted final art and public Source implemented. Final gates pending.

## Changed

The real yard offers Scrapdome and Salt Flats once the named player has found
Wasteland and reached rank nine, with Salt's own dev switch enabled. Last Car
Rolling and Fuel Run launch the selected native Course. Their own mode flags
and existing rank requirements still apply. Unknown or locked venue requests
refuse before run creation; ordinary Scrapdome entry keeps its default.
Rematch keeps the actual venue and mode. The clickable controls use the same
pure eligibility as the public App launcher, which reads the current owner.

The accepted final model is now installed at its production GLB loader URL.
Its geometry, donor transforms, materials and embedded generated textures are
unchanged from the accepted candidate. The model is 23,283,392 bytes,
172 meshes and 184,340 triangles. No fourth art round or redesign was made.

Kyle's generated ground replaces the repeating photograph. The fixed-seed
1536 by 1024 atlas has broad tone drift, irregular salt polygons, a dusty
Course-aligned driving band, independently preserved normal relief and close
world grain. Four matching world-coordinate strips cover its edges.
Distant heat remains view-only. All Bus, crane, ramp and collider geometry is
unchanged; inner-island scrap belongs to P3-POLISH.

Claude's 2 October 00:30 answer approves Last Car Rolling and Fuel Run here.
Bounty Hunt and Ambush Alley add Salt in their own cards.

## Tests first and Source checks

Independent public App tests first gave 22 checks, 13 PASS and 9 genuine RED:
missing Salt declaration, ignored venue selection, rank/off gates and unknown
venue fallback. Additive independent panel and native-gate checks then gave
32 checks, 26 PASS and 6 genuine RED before their Source: missing venue buttons,
wrong selected entry label and native disabled-Salt admission in both modes.
No future API or stub was used. Current bounded entry checks pass 32/32;
released arena UI controls pass 6/6 and Wasteland flag controls pass 8/8.
The exact feature declaration assertion adds the new dev flag, without
changing the states or production admission of released features.

Independent review approved the Fuel test migration to its real published
180 s round and Infinity sudden death. A separate 600 s observation watchdog
never changes the game limits, forces a result or changes next-delivery rules.
Native fixtures explicitly enable the genuine Salt and Fuel dev flags.

The bounded generated-ground/control check passes two of three. The remaining
frozen eight-second Scrapdome trace predates the merged lower ordinary-car
wreck rate. Its physical geometry and ordinary replay-file hashes stay exact;
its trace differs. Independent paired-baseline review is required before any
fixture update. No fixture, main replay pin or physical tolerance was changed.

The prepared memory-only browser recipe clicks real yard venue/mode controls,
launches both native modes in High and Performance, checks the production GLB
load, and clicks rematch and return. It has not run yet. Both existing native
full-round assertions pass with seeded repeated traces and genuine results.
The additive --rounds-only selection runs those two checks without Blender;
default whole-card selection and every assertion are unchanged. Current
Blender registration, lane tier and build remain pending.

Independent output-registration tests now cover the actual Salt CLI in plain
Python, with its normal root, private output, fit config and seed arguments.
Three checks give one PASS and two genuine RED: the early bpy import prevents
both empty temporary roots from planning venue.glb, manifest.json and the three
existing packed PNG outputs. Planning creates no files. The shared output guard
passes 43/43 with Salt beside Vesper in its native-suite list; Tanker and Vesper
assertions remain exact. Source must handle --paths-only before Blender imports.

## Accepted private evidence

Earlier generated config and two controls passed. All 16 registered Course
geometry and 29 native boundary/collision cases passed. Repeated exports retain
native geometry and actual colour/normal bytes. All sixteen final game views
pass without browser errors or warnings; independent Source review was clear.
Headless renderer and effects pass eight cases each. The critic scored every
assessed art item four in both qualities. Paired 180-frame Scrapdome/Salt
captures had P95 16.8/16.8 ms in both qualities, within ten percent. This Source
changes entry, not geometry or presentation; it does not claim new sound or
motion judgments, or a current whole-card merge gate from that earlier proof.

## Removed

Removed active photo configuration/loading, embedded photo, mirrored sampler,
JPEG helper and photo-only assertions under Kyle's written ground decision.
Removed the consumed mode-scope question and obsolete finite Fuel sudden-death
assertion under independent review. Licensed donor/photo provenance, current
game assets, physical rules and existing main replay pins remain intact.
