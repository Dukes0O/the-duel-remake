# Muddy Hollow: the Titan's playground

Design for a hidden off-road playground for the monster truck, written
26 September 2026 at Kyle's request: the Titan "must also have improved
physics where it can really climb mountains at a high degree and go quite a
ways off road and up hills ... find a place to go way off road and maybe find
a mud pit and huge puddles of water to blast through and jumps to take ...
like an amazing playground as another easter egg but for the monster truck."

## 1. The feeling

Big, dumb, joyful. The Titan is the only car that can go there, and once
there, nothing is timed, nothing is scored against you, and everything is
built to be driven through, over or off. Mud flies, water sprays, the truck
bounces, and there is always one more thing on the horizon to try.

## 2. The Titan climbs

- The Titan already handles slopes up to about 59°; a separate rule tipped it
  over after 24 metres of continuous climbing, so any real hill ended in a
  tumble. That rule goes: the Titan climbs a whole mountain if the slope is
  under its limit. Steeper than that still tips it, so there is a skill to
  picking a line.
- Climbing slows the truck by the slope and descending speeds it up, so a
  hill feels like a hill.
- The rally car keeps its current, lower limits; ordinary cars still cannot
  leave the road far.

## 3. Where it is

On **High Country Grand Tour**, in the Alpine Summit section, a steep grassy
ridge rises beside the road. It is too steep for anything but the Titan. From
its crest you see the Hollow: a green valley about 300 metres across.

- **Getting in:** drive the Titan up the ridge. Past the crest (the point of
  no return, like the Hidden Road), the race ends as "left the course": no
  penalty, no records, the timer and race display fade, and you are free.
- **Getting out:** the menu, or drive back over the ridge to the road.
- **Hint:** after five races on High Country in the Titan, a garage tip on
  the Titan's page: "Locals say the Titan can climb the meadow above the
  Alpine Summit." Nothing on the main menu, ever.

## 4. What is in the Hollow

| Feature | What it does |
| --- | --- |
| Three mud pits | Thick mud: low grip, heavy drag, wheels spin and throw mud; the Titan ploughs through, slowly. Mud sticks to the truck |
| The pond | A big shallow pond with a gravel bottom: blast through at speed for a huge spray; the deeper middle (about a metre) slows you hard |
| Mega jump | A long dirt ramp that throws you over the pond when you hit it fast enough |
| Three dirt kickers | Smaller jumps scattered across the valley floor |
| Log ramp | A ramp of stacked logs over a creek |
| Rock garden | Boulders the Titan crawls over |
| King of the Hill | The steepest climb, with a flag at the top |
| Five gold hubcaps | Hidden around the Hollow: on top of the hill, in the pond's middle, off the mega jump's landing, in a mud pit, behind the log ramp. All five earn the Titan a gold paint job |

## 5. Architecture

Follows the Hidden Road pattern: an authored zone installed into one course,
without disturbing the racing line, its scenery or its random stream.

- `src/muddy-hollow.js`: `installMuddyHollow(course)` for `high-country`
  only; the zone's own height function (valley bowl, ridge, hill, pits,
  pond bed, ramps), `contains(x, z)`, and surface queries.
- **Surfaces:** a shared `surfaceAt` result gains `mud` and `waterDepth`.
  Driving reads them: mud lowers grip and adds drag; water adds drag by
  depth and speed and raises a splash event.
- **Leaving the race:** reuse the Hidden Road departure flow (`exploring`
  status, abandonment settlement, faded race display).
- **Rendering:** its own detailed ground mesh (the shared far terrain is too
  coarse), mud and water materials, splash and mud particles. Art follows
  SPEC 0.11 (existing assets first).
- **Save:** `profile.wasteland`-style additive fields: hollow discovered,
  hubcaps found. Unknown fields preserved.

## 6. Cards

| Card | Owner | Scope |
| --- | --- | --- |
| TITAN-01 | Claude | Climbing without the 24 m cap, slope speed, tests |
| EGG-03 | Claude, then Codex | Zone geometry, mud and water physics, jumps, departure flow, hubcaps and save, detailed ground mesh; Codex polishes art, particles and sound |
