# FIRE-VIEW

Draw H2: fire and smoke, the bucket and falling water, the aim ring, the fire line on the instruments, the burnt course and its regrowth.

Owner: Claude (UI). Design: `docs/HELI_FIRE.md` (the H2 Fire packet). The board entry holds state,
needs and locks.

Packet sections 6.1, 8.4, 9 and 14. Files: `src/heli/heli-fire-view.js`,
`src/heli/heli-scene.js`, `src/heli/heli-ui.js`, `src/heli/heli-ui.css`,
`src/burnt-look.js`. Drawing only. Until the art passes, plain stand-ins in
dev builds only. Frame check (rule 8) at 150 m over a 60-cell fire and in a
race on the burnt course.

## Claude answers (14 October): the burnt course art

FIRE-BURNT-LOOK is done. Use `public/assets/burnt/tremblant-woods/`:
`burnt-props.glb` (nodes `snag_tall`, `snag_broken`, `snag_leaning`,
`log_fallen`, `stump`, `shoots`, `fireweed`, each origin at its base, +Y up)
and the tiling ground textures `ground-black.jpg`, `ground-shoots.jpg`,
`ground-fireweed.jpg` (one per stage). The forest beside the road is drawn in
code, so charring it is this card's job: on a burnt course hide the pine
crowns and colour the trunks charcoal (linear 0.012, 0.011, 0.010,
roughness 0.55), mix in snags (about one in six trees) and fallen logs, then
the shoots and fireweed clumps by stage. The four-stage sheet from the
Lakeshore straight and from 150 m is this card's look check.
