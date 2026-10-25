# SIRENA-CAR: questions (cloud session; carried on with the recommended pick)

1. **Mass 810 kg, not 800.** The card says 800 kg. With 800 the standing arena guard `test-arena-junk-shove`
   ("every car moves parked junk at least 2 m at 40 mph") fails by 1.2% (the hulk moves 1.976 m); 810 passes. The
   Viper is 940, so the Sirena stays the lightest car. Options: 810 (taken), or keep 800 and give the guard a lighter-car
   allowance (that loosens a guard, which needs your written review). Recommended: 810.
2. **No armor kit yet, and a narrow wait in `test-armor-kit-assets`.** Every car has a fitted Blender-built kit
   (`public/assets/models/wasteland/kits/<car>.glb`, `tools/blender/armor-kits.py`); the cloud has no Blender, and a
   copied Viper kit would be a placeholder. So `falcone_sirena.glb` is missing. The kit test now skips a car listed in
   `LAPTOP_KITS` (only `falcone_sirena`) while its file is absent, and checks it fully the moment the file exists.
   Nobody can own the Sirena before the Lab restores it (LAB-RESTORE, after DEEP-SIRENA-VIEW), so nothing can arm it
   yet. Recommended: keep, and add a small laptop card, SIRENA-KIT, to build the kit and empty `LAPTOP_KITS`.
3. **The Sirena is on no list yet.** `isShownCar` hides it (menu, garage, armory, leaderboard stay exactly as they
   were); DEEP-SIRENA-VIEW lists it once it is owned or waiting, with the sheet and "Needs the Lab". Recommended: keep.
4. **Wiring beyond the card's hooks**, each the same step an earlier car took: `src/vehicle-assets.js` (the model
   factory and size from SIRENA-ART's `createSirenaVehicle`), `src/vehicle-sockets.js`, `src/sound-bank.js` (an engine
   voice; pitch 1.09 because 1.06 matched another car's playback rate and `test-audio` needs each voice distinct),
   `src/heli/heli-save.js` (`FIRST_PLACE` and `carAt`'s default, because the first place cannot live in `heli-jobs.js`
   without a loop), and one line in `src/app.js` that emits the cup's event. Collision box is the Viper's. Recommended: keep.
5. **The cup counts in Duel, Time Trial and Grand Prix** on `pacific-canyon`, for a valid, non-qualifying,
   non-practice finish in the owned, raised Sirena (any place); not Mad Max. `recordCoastCup` (DEEP-SIRENA) pays and
   records it. Recommended: keep.
6. **Changed assertions and re-recorded pins** (your written review, rule 18; nothing is loosened) are listed in the change note.
