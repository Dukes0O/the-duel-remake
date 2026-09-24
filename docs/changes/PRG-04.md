# PRG-04 — Armor kit purchases and equipping

## What changed

- Added Scrapper, Raider, and Warlord kit purchases per car under `profile.wasteland.kits`. Buying equips the kit. Players can switch owned kits or return to stock without another charge.
- Kit purchase helpers require an already migrated version 1 Wasteland profile, so they cannot skip the verified startup backup for older saves.
- Scrapper needs Notoriety rank 3, Raider needs rank 12, and Warlord needs a defeated warlord. Prices are 350, 950, and 2,500 credits per car respectively. These are within the approved 350–2,500 credit range and rise with the armor bonus.
- An equipped player kit adds 10, 20, or 30 maximum armor in flagged Wasteland races. Ordinary races and flag-off races keep their existing armor behavior.
- The Armory shows the selected car's kit ownership and gates behind `wasteland2`. The render layer shows only the equipped player tier. CPU opponents keep their current Scrapper appearance by an explicit CPU fallback.
- Warlord currently means any defeated warlord. Boss-specific piece unlocks and art belong to the later warlord work.

## Checks

- Focused tests: 37/37 passed across kit purchase, visual tier, combat armor, profile migration, historical save fixtures, storage budget, and combat replay fingerprints.
- Storage budget model now includes all three kits on every car for all modeled players; passed under the existing 4 MB limit.
- Production build passed.
- Private browser scenario `armor-kit-purchase` passed on port 21684 with memory-only saves: purchase, 350-credit debit, 110 starting armor, visible equipped Scrapper kit, two screenshots, zero browser warnings/errors.
- The first browser attempts sampled the visual before shader warmup finished; the scenario now waits for the first rendered kit frame. This was a QA timing issue, with the kit and 110 armor already present in simulation.
- Existing VIS-02 test and browser setup formerly assumed a free player Scrapper appearance. The fixture now explicitly equips Scrapper for its plate-break checks, and a new assertion verifies stock player plates are hidden while CPU plates remain visible. No assertion was removed.
- Existing combat replay fingerprints passed all 12 checks across four encounters. No fingerprints were regenerated.
