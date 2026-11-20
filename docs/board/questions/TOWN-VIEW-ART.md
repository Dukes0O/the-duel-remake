# TOWN-VIEW-ART: choices made in the cloud, for Claude to confirm or reverse

The card carries on with each pick below. None touches saves, a released course or a replay.

1. **How old a street is.** The town keeps no date for a finished road, and the card keeps this view only. Options: (a) take the
   road's place in the order roads were laid, so road r of R is (R - r) / R of the town's age, as if roads were laid at an even
   pace; (b) a sim card adds `finishedTick` to a building when it is finished, and the view reads that. **Pick: (a)**, in
   `townStreetYears`. It only grows as the town grows. (b) is better once buildings finish in the sim; the view would then read it.
2. **Scaffold stages are also sizes.** `scaffold-n` in stages.glb is stage n and n by n cells at once (8n - 1 m). Options: (a) choose
   the piece by stage (plan 1, foundation 2, frame 3) and fit it to the plot in plan, keeping its height; (b) an art round makes each
   stage at each size. **Pick: (a).** A 1 by 1 plot at its frame stage squeezes the 23 m frame to 7 m; Claude to judge. The ruins
   (`burnt-n`, `rubble-n`) are chosen by plot size and fitted the same way.
3. **The Dome.** dome.glb is authored round its oval's middle with the gate at z -92 toward -Z; the town's oval is at z -168.5 with its
   gate toward the town. **Pick:** the family turned half round at (0, -168.5), so the gate stands at z -76.5, 3.5 m past the reserved
   gate box. The yard model (scrapdome/yard.glb) still stands inside it. One export fault is worked round: the gate's sand banks sit
   90 m out on its road (tools/blender/town-dome.py makes them after the gate's children are moved), so parts over 60 m from the gate
   are left out (`TOWN_ART_KEEP_WITHIN`). Recommend a dome art round to fix the recipe.
4. **Places outside the grid.** Dot's diner 45% of the way along the Boneyard road, 30 m off it; the school airliner in the
   Boneyard; Old Tam's camp on the Ridge; Deck Town at the Ships in the Sand; the Rail Halt on the Iron Line; Mrs Vane's yard 700 m
   east once she has come, and her kiosks on open ground beside their streets. All are rows in `TOWN_WORLD_ART`.
5. **Families the town view does not draw.** walkers.glb (town-walkers.js already draws them), borer.glb (the Dig draws it; the town
   keeps no tunnels yet), story-walkers.glb (the story's people view) and the three peace-*.glb story props (no town record says
   where they stand). The suite lists these with their owner.
6. **Homes in the drive.** `createTownWorld` gives the drive no home plots and no solids for them, so the drive shows buildings,
   sites, ruins and street things but no homes. Recommend the drive's next card add home plots with their solids.
7. **A building with no art row** is drawn as a staked plot, and `townArtMissing` names it; the suite holds every content row to
   having art.
