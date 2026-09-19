# Shortcut pace audit

Version 3 shortcuts now save time in clean, repeatable driving. The original audit found that Pacific gravel branches cost time and Ridge could not use nitro. The revised paths and prepared-gravel physics address both problems.

Run `node tools/benchmark-shortcut-pace.mjs all` to reproduce the current five-event comparison. Omit `all` for Pacific/Ridge only. `DUEL_PACE_SEEDS=1,20` selects additional seeds. This is an audit harness; it does not change production physics.

## Version 3 results

All 24 main/shortcut pairs across five events, two cars, and seeds 1989/42 finished cleanly: **48 drives, zero crashes, zero resets, and zero time off the legal surface**. The largest tracking error was 1.01 m on the city branch; scenic-route errors stayed below 0.14 m.

| Event | Falcone time saving | Dusthawk time saving |
|---|---:|---:|
| Pacific Canyon | 9.13–12.20% | 10.77–12.46% |
| High Country | 3.96–4.97% | 4.02–4.42% |
| Harbor & Highlands | 6.46–6.80% | 3.02–3.84% |
| Midnight Chase | 10.52–12.48% | 11.76–12.11% |
| Ridge Rally | 11.99–12.26% | 11.66–12.22% |

Additional Harbor fallback checks were also clean. Seed 1 saves 3.11–6.49%; seed 20 saves 2.73–2.93%. The latter is useful but slightly below the 3% design aim. These are controller-specific measurements, not claims of optimal lap times.

The new generator builds quintic world-space paths whose entrance and exit follow the road tangent and curvature. It stores a smooth sampled lateral profile for the shared driving, collision, and rendering APIs. Candidate ranking considers braking, acceleration, tire grip, and curvature-limited speed. A paved fallback is used when a gravel branch cannot repay its traction cost. Routes retain one good branch rather than an additional slow detour; city layouts retain two.

The nine-seed geometry suite found **59 branches across 45 circuits**, all with at least 3.03% actual 3D distance savings. **1,449,561 Titan-width obstacle sweeps** passed. All profiles stay within 112 m lateral offset, retain a projection factor above 0.3 across the full vehicle corridor, and have maximum lateral slope 0.617. Typical branch spans are 620–1100 m; the difficult fallback search can use 1340 m. Search results are cached by complete course definition and seed.

Prepared gravel now has its own speed, grip, scrub, and roughness settings; leaving the legal route retains the original shoulder penalties. The benchmark reads these exact physics settings through `Duel._drivingSurface`. Nitro works on legal gravel: in the same ten-second request used by the original audit it was active for 3.58 seconds and used 68.1% of the tank. The controller brakes for corners, so it does not hold boost continuously. Physics tests separately verify sustained boost and tank behavior.

Non-arena `layoutVersion` is now 3 so old course ghosts cannot replay against changed geometry.

## Method

- Two seeds, 1989 and 42; Pacific Canyon and Ridge Rally; stock Falcone and Dusthawk; both branches.
- Standard 120 Hz `Duel.step`, automatic gears, no upgrades, no nitro, and all scenery collisions retained. Traffic and radar are removed to isolate route performance.
- A common 220 m main-road run-up starts at 60 mph. Both alternatives receive the same complete state at the branch entrance, including speed and steering momentum.
- After that starting fixture, only throttle, brake, and steering inputs move the car. No position corrections, forced progress, or recovery suppression are used.
- The controller uses App's yaw feedback and corner-speed approach. Branch tangent and curvature come from actual world-space path samples. The normal path and the branch use the same controller.
- Times include the branch span plus 100 m of exit runout, or 40 m where the finish seam leaves less space. This includes the effect of leaving a branch at lower speed.

This measures competent repeatable driving, not an optimal racing line. In particular, the App-style speed planner brakes conservatively for approaching bends. The large gravel disadvantage is clear; the smaller paved disadvantage should also be checked with a more aggressive human line before treating these times as theoretical limits. Falcone in the garage-gated Ridge event is a headless comparison only.

## Original version 2 results

All 32 measured runs finished with **zero crashes, zero resets, and zero time outside the legal driving surface**. The largest branch tracking error was 2.27 m. Main and branch entry speeds matched exactly within each pair.

Positive gain means the shortcut was faster.

| Event | Seed | Car | Branch surface | Main time | Branch time | Gain |
|---|---:|---|---|---:|---:|---:|
| Pacific | 1989 | Falcone | Gravel | 11.009 s | 23.983 s | −12.974 s / −117.85% |
| Pacific | 1989 | Falcone | Paved | 11.818 s | 12.677 s | −0.859 s / −7.27% |
| Pacific | 1989 | Dusthawk | Gravel | 11.216 s | 14.006 s | −2.790 s / −24.88% |
| Pacific | 1989 | Dusthawk | Paved | 11.455 s | 11.900 s | −0.445 s / −3.88% |
| Pacific | 42 | Falcone | Gravel | 12.751 s | 23.385 s | −10.634 s / −83.40% |
| Pacific | 42 | Falcone | Paved | 10.720 s | 11.949 s | −1.229 s / −11.46% |
| Pacific | 42 | Dusthawk | Gravel | 12.203 s | 14.620 s | −2.417 s / −19.81% |
| Pacific | 42 | Dusthawk | Paved | 10.521 s | 11.167 s | −0.646 s / −6.14% |
| Ridge | 1989 | Falcone | Gravel 1 | 27.701 s | 26.133 s | +1.568 s / +5.66% |
| Ridge | 1989 | Falcone | Gravel 2 | 26.052 s | 24.499 s | +1.553 s / +5.96% |
| Ridge | 1989 | Dusthawk | Gravel 1 | 15.037 s | 14.748 s | +0.289 s / +1.92% |
| Ridge | 1989 | Dusthawk | Gravel 2 | 14.142 s | 13.302 s | +0.840 s / +5.94% |
| Ridge | 42 | Falcone | Gravel 1 | 27.701 s | 25.975 s | +1.726 s / +6.23% |
| Ridge | 42 | Falcone | Gravel 2 | 26.052 s | 24.713 s | +1.339 s / +5.14% |
| Ridge | 42 | Dusthawk | Gravel 1 | 15.037 s | 14.657 s | +0.380 s / +2.53% |
| Ridge | 42 | Dusthawk | Gravel 2 | 14.142 s | 13.432 s | +0.710 s / +5.02% |

## Original findings that drove the changes

1. **Treat prepared gravel separately from leaving the course.** Legal gravel uses the same low speed limit, continuous speed scrub, and roughness ramp as an arbitrary shoulder. Falcone falls to about 68 mph; Dusthawk falls to about 125 mph. A branch only 4–6% shorter cannot repay that speed loss. Preserve the existing rough shoulder penalties outside legal routes. For a first prepared-gravel trial, use roughly 95% of road top speed for ordinary cars, up to full top speed for the rally car, grip factors around 0.9 and 1.0 respectively, and scrub around 0.04–0.08 instead of 0.48/0.20. These are starting values to benchmark, not validated final tuning.
2. **Judge generated shortcuts by predicted time as well as distance.** Pacific's cosine transitions increase peak curvature from 0.00518 to 0.00979 in the first 1989 branch, and from 0.00723 to 0.01193 in the paved branch. The geometry saves distance but adds tighter bends. Smooth the entry/exit curvature or choose route windows with gentler joins; require a measured clean-driving gain after the surface pass. Raising gravel pace alone does not address the paved result.
3. **Enable nitro on legal prepared routes.** A ten-second request on Ridge at driving speed produced zero active boost time and left the tank full. Both the activation condition and the later offroad cancellation would need to distinguish prepared gravel from the shoulder. Keep the available tire grip and higher drift risk; do not erase the rally surface feel. Also lift the prepared-surface cap while boosting so speed scrub does not immediately cancel the acceleration. This would make chicken refills useful in the rally event.

Ridge's existing clean shortcut gains are real but modest for Dusthawk: about 0.3–0.8 seconds. Preserve those gains when tuning prepared gravel, and remeasure both branch and main-route pace together.
