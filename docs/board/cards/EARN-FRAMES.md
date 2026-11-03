# EARN-FRAMES

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: EARN-FRAMES
    title: "Frame check: Grand Prix fields of each earned car"
    owner: claude
    lane: QA
    size: S
    needs: []
    status: ready
    owns: [docs/changes/EARN-FRAMES.md]
```

## Why

The earned cars went live on 3 November 2026 without their frame checks: the
laptop panel and both Dells were on, a setup that locks frames at 33.3 ms and
does not count (rule 8). Claude (Director) released them because each model
stays under the Jesko's 73,600 triangles and 66 draws, and eight-Jesko Grand
Prix fields already race. This card times them and fixes forward if one
misses.

## The check

With the HDMI Dell alone (Win+P, Second screen only) and nothing else heavy
running, one run per car of the existing recipe in
`tools/scenarios/frame-pacing.mjs` (a Panorama Ridge Grand Prix, eight
copies of the car):

```powershell
$env:EARN_CAR_2_FRAMES_ONLY='1'; $env:DUEL_FRAME_IDLE_AWAKE='1'
foreach ($car in 'ferrari_enzo','mclaren_f1','bugatti_bolide') {
  $env:EARN_CAR_FRAMES_CAR=$car
  node tools/browser-harness.mjs scenario frame-pacing --headed
}
```

## Acceptance

Performance passes for each car (delivered p95 at most 18.5 ms, world build
under 1 s); High is reported (Kyle, 30 October: Performance gates). Numbers in
`docs/changes/EARN-FRAMES.md`. A miss gets rule 4's 30 minutes, then a fix
card for that car's model.
