# WILD-ART-SRC

Source the animals for every course: real, local species, gritty and
natural, never cartoon. Owner: Codex (ART); Claude judges each round. No
game code. Design: Kyle's storyboard (14 October 2026), the "Animals by
course" table, copied here.

| Group | Animals |
| --- | --- |
| North woods (Tremblant) | White-tailed deer, moose, black bear, beaver, eastern wolf |
| Western mountains (Summit, High Country, Ridge Rally, Timberline, Cloudbreak) | Mule deer, elk, black bear, coyote, cougar, yellow-bellied marmot, bighorn sheep, raven |
| Australia (Panorama Ridge) | Eastern grey kangaroo, sulphur-crested cockatoo, kookaburra, echidna |
| Europe (Ardennes, Eifel, Alps, Riviera) | Roe deer, red deer, wild boar, red fox, wildcat, black stork, chamois, ibex, alpine marmot, golden eagle, gull |
| Desert and coast (Pacific Canyon, Red Mesa) | Roadrunner, coyote, jackrabbit, sea lion, pelican, desert bighorn, collared lizard, condor |
| Asia and cities (Harbour Lights, city courses) | Black kite, egret, black-faced spoonbill, pigeon, raccoon, cat, owl |

## How

- Order: North woods first (the wildlife count starts at Tremblant), then
  Western mountains, then the rest.
- CC0 first (Quaternius and Kenney animal packs, Poly Pizza CC0), then CC-BY
  with credit (SPEC 0.11). An idle and a walk or run each where the pack has
  them; birds need a flight loop. At most 5,000 triangles per animal (birds
  2,000), textures at most 1K.
- Candidates in `C:/Users/kyleb/dev/art-library/wild-*`; only picked
  runtime models go to `public/assets/wildlife/`. Credits on the credits
  page.
- At most three rounds per group (SPEC 0.11): one comparison sheet per
  round (JPG, at most 500 KB) under `docs/board/looks/wildlife/`, judged by
  Claude. Evidence deleted after each verdict.

## Done

Picked models in `public/assets/wildlife/`, credits added, round notes
committed. Placing animals on courses is WILD-PLACE and WILD-VIEW (Claude),
designed in `docs/HELI_WILDLIFE.md` section 3.

## Claude answers - North woods source choice

Read-only preflight: Workspace Catalog is fresh; no local wild-* candidate folder exists in the verified art library. No downloads, lane, model change, art round or acceptance yet. Primary source leads are [Nioma moose](https://sketchfab.com/3d-models/low-poly-moose-ad0d58f8668f43d5b362d529371a7f6d), CC-BY/844 triangles/walk; [UC Davis black bear](https://sketchfab.com/3d-models/american-black-bear-7c304db470dc4b9f801acf587962f1e5), CC-BY/3000 triangles, animation unknown; [Poly beaver](https://poly.pizza/m/fwtA7VLrXPr), CC-BY, actual budget/animation unknown. Archive and1K texture/rig verification remain pending; some live source pages refuse automated fetches.

[Quaternius animated animals](https://quaternius.com/packs/ultimateanimatedanimals.html) is CC0 with animated deer/wolf, but their creator does not identify white-tailed deer or eastern wolf. The verified exact whitetail alternative isabout39400 triangles and unrigged, outside this card. Claude: may the generic CC0 deer/wolf be adapted visibly to the named local species for your actual round1 judgment, or must we continue finding species-labelled donors? Natural gritty appearance and all budgets/clips remain required; no silent relabel, cartoon placeholder or new account is proposed. Art/source choice stays yours under rule16; other priority cards continue.

## Claude answers - North woods donors, 14 October evening

Yes, adapt the CC0 Quaternius deer and wolf to white-tailed deer and eastern
wolf, credited as adapted from Quaternius (CC0), with these conditions:
proportions nudged to the real species (deer: white tail underside and
throat patch, slimmer legs; wolf: grizzled grey-brown coat, longer legs), and
textured with natural fur colour and shading, never flat cartoon colours.
Kyle wants gritty, not toy-like; Claude judges that strictly in round 1, and a
toy-looking result sends that animal back to a species-labelled donor. The
Nioma moose and UC Davis black bear (both CC BY) are the picks for those two;
the beaver from Poly Pizza if its budget fits. No new accounts.

## North woods source-only lane during the release hold

Claude's exact donor/species answer above is settled. The new wild-art-src lane owns tools/blender/wildlife-north-woods.py, tools/art/wildlife-north-woods.json and its own change note; candidates stay in the card's existing art-library/wild-* source cache. Only documented public downloads without an account are allowed. Keep original licensed archives/credits as one current copy, verify actual creator/licence and bytes; report inaccessible donors without extraction tricks or substitute species. The approved Quaternius adaptation must preserve its actual rig/clips and receive the named natural markings/proportions, not a flat recolour labelled finished.

Prepare the existing-style reproducible five-model recipe and manifest only after source access is proved. Runtime destinations, after actual art acceptance, are the five named animals under public/assets/wildlife; no game, placement, save, switch, registry or CREDITS edits yet. The later existing all-Blender generator registration will be named before code when this recipe exists; no new test harness. Source preparation/download inspection only: no Blender/import/export/render, game browser, gate, build, frame, art sheet or round starts until Root GO after RELEASE DONE and a fresh slot check. North woods has its own three-round cap; no art verdict is inferred from donor approval. Spend at most30minutes on any inaccessible source problem, then record it and continue available sources. Root owns shared metadata, scheduling and merges; other lanes' files stay intact.