# DEEP-GO-LIVE

The short board entry controls current state, ownership, dependencies and locks.

The last two pieces before The Deep goes live (Claude, 25 October 2026;
Kyle wants it live today). Design: `docs/THE_DEEP.md` sections 4 and 10.

1. **Place title cards.** The first time a player drives into each place of
   the Kelp Coast (the zone data's `places: [{id, name, fromIndex, toIndex}]`),
   a short title card shows its name, like a circuit's corner names, for
   about 3 s. Saved once per place under `deep.places` (optional field; an
   old save loads untouched; never shown again once saved). Ana's lines
   already wait while a title card shows (DEEP-SIRENA-VIEW).
2. **The four story sounds.** DEEP-SIRENA-VIEW emits `deepSonar`, `deepLift`,
   `deepLiftCancel` and `deepRaised` but nothing plays them. Make four cues
   the same way `src/heli/heli-audio.js` builds its sounds from tones and
   noise (no new files to source): a sonar ping (a clean ping with a soft
   echo), the lift bag filling (a rising air hiss), the fill cancelled (the
   hiss cut short), and a find breaking the surface (a deep bubbling rush).
   Quiet and natural, under the existing master mix; play them through the
   existing Deep audio adapter, only with `the-deep` on.

Acceptance: switch off byte-identical; tests for the title-card rules, the
save field and the four events playing their cues; `deep-sirena` and
`deep-life` scenarios pass; lane tier and build. Locks: `busy-game-files`,
`sound-bank`.
