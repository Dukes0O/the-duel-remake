# MAP-VIEW questions (cloud session, 25 October 2026)

Carried on with the recommended pick in each case; say so if one should change.

## 1. The three map sounds are synthesised, not library recipes

You asked for three recipe rows (`map.open`, `map.close`, `map.pin`) in `tools/audio/catalog.json`. Every row there is a
sourced file (ElevenLabs, Freesound, OpenGameArt) with its URL, author, licence, checksum and download. The libraries are on
the laptop only, so I cannot pick a real Freesound sound or compute its checksum here, and I will not invent one.

- **A (picked):** the three cues are built in `src/heli/heli-audio.js` from noise and tones, like `heli.found` (paper unfolding
  and folding are filtered noise bursts with a soft tone; the pin is a click and a short falling tone). They are in the sound
  bank behind the helicopter switch under the ids `map.open`, `map.close`, `map.pin`. No catalog rows.
- B: the laptop picks library sounds for the same ids later and adds the catalog rows then. The cue ids and the places that
  play them (`app.setHeliMap`, `app.heliMapPick`) stay as they are.

Recommended: A now, B if Claude does not like how they sound.

## 2. The controls help has no helicopter page to put the key on

`H` is the hook in the helicopter, and the controls-help panel is only shown while racing. The key is therefore listed in
the cockpit's own key line (`MAP N` beside `AUTOPILOT P`, `VIEW C`, `HOOK H`) and in the FLY TO panel's button, and
`controlsHelp()` now has a Kestrel One page that lists it, for whenever a help page is wired for the helicopter.

## 3. The Table's art and rules disagree, so I fitted the art to the rules

`table-mesa.glb` has a 400 m flat top, a 110 m cliff and a 55 m apron; `map-secrets.js` has a 260 m top, 90 m high, a 20 m
ramp. The helicopter's ground is the rules, so the mesa is scaled to fit them (0.65 across, 0.545 tall: top 130 m radius,
foot at the floor) and a flat desert covers the model's far skirt. The lookout and the wreck stand where the rules put their
obstacles (not at the model's own spots), and the dirt strip is laid over the rules' oval, so `table-strip.glb` (a straight
190 m strip) is unused. Recommended: keep. The alternative is a MAP-ART follow-up to match the rules.

## 4. Fire pits are drawn without flames

`sign-fire-pits.glb` carries empties for the game's fire and smoke sprites; I draw the model (lit coals baked in) and not the
moving flames. Nothing in the rules needs them. A small follow-up can add the sprites.
