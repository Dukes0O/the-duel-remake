# MACHINE-PLANT

**What changed.** The concrete chain of MACHINES section 4 is in the machine yard behind `wasteland-town`: a blasted-rock heap, a crusher whose hopper takes the dump truck's load (dirt is screened onto the ground), a 20 m belt to a gravel pile, a loader that scoops gravel or sand into the batch plant's bins, a central-mix batch plant that fills the mixer truck's turning drum in a fixed mix, a chute that pours into two forms, and concrete that sets over two minutes and turns from dark wet grey to pale. Rules are `src/machines/plant.js` (data `content/plant.js`); every stored kilogram goes through TOWN-GOODS, `cement` is a new good, water is the plant's own tank. Yard glue `plant-yard.js`, view `plant-view.js`, sounds `plant-sounds.js`; small hooks in `dig-sandbox.js`, `dig-game.js`, `controls-view.js`, `content/machines.js`. No save is read or written.

**Checks** (commit and results filled in at hand-over): `node tools/test-machine-plant.mjs` (mass kept at every step, the mix, the setting time, the town side with a save round trip, the yard hooks), the lane tier, `npm run build`, browser scenario `machine-plant`.

**Changed assertions.** `tools/test-machine-roads.mjs`: the Q order now ends `borer, loader, mixer, excavator` (two machines added, nothing removed). `tools/scenarios/machine-borer-apprentice.mjs`: the return from Mabel to the excavator presses Q up to three times, because the loader and the mixer now follow Mabel.

**Try in the browser** (`?flags=wasteland-town,the-dig`, THE DIG): dig the rock heap west of the excavator and load the truck; back the truck's bed over the crusher hopper and tip; watch gravel ride the belt to the pile; Q to the loader, drive into the pile holding Space, then hold E at the bins (gravel, then sand from the sand pile); Q to the mixer, back it under the batch plant tower, Tab, hold Space; drive to a form, Tab, swing the chute with A and D, hold Space; watch it set.

**Removed:** nothing; the chain is new. The yard's ledger is replaced by the town's when a later card puts the machines into a town.
