# The Duel

A browser remake in the spirit of *Test Drive II: The Duel* — point-to-point
road stages, two-way traffic you pass in the oncoming lane, fixed radar traps
and a police pursuer, a beatable AI rival, and a manual gearbox you can blow on
Pro. Procedural low-poly 3D chase cam. Fully offline after `npm install`: zero
non-localhost requests.

## STATUS

**Works (verified):**
- Full stage loop: countdown → race → checkpoint/results → next stage →
  campaign complete / game over. 5 lives, crash/penalty/clean-stage/missed-
  station scoring.
- Two-way traffic + collisions; off-road crashes; police radar trap with an
  escalating detector warning bar, a pursuer, ticket screen, and escape.
- Manual gearbox (Pro) with redline engine-blow; automatic (Casual). Beatable
  AI rival with rubber-banding in Duel mode; solo Time Trial mode.
- 2 themes × 2 stages core campaign; start menu (car / difficulty / mode);
  3D chase-cam rendering of road, traffic, rival, police, scenery; HUD with
  speedo, tach + gear, radar bar; localStorage best times.
- `?autopilot=1` drives stage 1 through the radar trap to the results screen.

**Partial / stretch (in config, not all wired end-to-end):**
- 2 stretch themes (coast, city) exist in `config.js` and render through the
  same generator but aren't in the default 4-stage campaign rotation.
- Audio (engine/skid/beep) not implemented (procedural WebAudio was the
  cut-first polish item).
- Rendered rear-view mirror not implemented (cop lamps stand in, per brief).

**Next step:** extend `COURSE` with the stretch themes and add procedural
WebAudio in `app.js`.

## Run

```
npm install
npm run dev      # http://localhost:5174
```

Port is pinned to **5174** (strictPort). Tests: `npm test`.

## Controls

`↑` throttle · `↓` brake · `←`/`→` steer · `Q`/`E` shift down/up (manual).
Pick a car, difficulty, and mode on the start menu, then race. Beat the rival,
reach each gas station, and don't get clocked at a radar trap.

## Dev hooks

- `?seed=N` — deterministic RNG (default 1989)
- `?autopilot=1` — scripted full-stage driver
- `?car=falcone_f42|stuttgart_959s`, `?diff=casual|pro`

`window.__game` exposes `stage`, `speed`, `gear`, `lives`, `penalties`,
`status`, `police`, plus verbs (`startCampaign`, `nextStage`, `setInput`,
`advance`, `autopilotOn`). `window.__render.renderFrame()` / `.sample()` render
and read back pixels for headless verification.
