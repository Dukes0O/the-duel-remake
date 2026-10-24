# DEEP-SIRENA: questions (cloud session; carried on with the recommended pick)

1. **How the badge is raised.** THE_DEEP 6.2 says "drive up and stop beside it" and 10.1 says the badge is
   "raised" and needs no sonar, but Ana's bag line comes later, after the sonar. Built: the badge is raised by
   stopping within 4 m under 3 km/h for 1 s, with no F and no bag (no `deepLift` event, only `deepRaised`). The four
   parts and the car use F and the bag as written. Recommended: keep (the first thing a new diver does is stop,
   not press an unexplained key).
2. **Parts wait for the badge.** Without the sonar (before the badge) F beside a part does nothing, and `raiseFind`
   refuses a part before the badge, so the story order is the same in the save as on screen. Recommended: keep.
3. **The badge is one of the five parts that pay 100.** 6.6 says "each Sirena part raised (five)" and 6.2 counts
   "five pieces" before the car: the badge plus the steering wheel, wheel, bonnet and door. So the five parts pay 500,
   the car 500, the cup 1,000: 2,000 for the whole story. Recommended: keep.
4. **Small additions to the 10.1 events** (DEEP-AUDIO and the view read them): `deepSonar {blip, echoSeconds}`
   (the echo time, 2 x distance / 1,500 s, is in the payload as the card asks; `null` with "No echo"); `blip` also
   carries `relative`, the bearing relative to the car's heading when the car's picture has one (bearing alone is the
   world angle, 0 = +z, positive to the left); and one more event, `deepLiftCancel {find}`, so the view can stop the
   bag's sound when driving off cancels a lift. Recommended: keep.
5. **Units.** The car's picture is `{x, z, speed (mph, as `deepWorldPose` gives it), heading?}`; the 3 km/h limit is
   converted. Horizontal distance only (the car's `below` ignored) for the sonar and the lift, as 10.1 says for lifts.
6. **The Coast Cup.** `recordCoastCup(profile, {enabled})` pays 1,000 and records `deep.coastCup` once, and only
   once `sirena-car` is raised. SIRENA-CAR is the card that calls it when the race finishes in the restored car.
7. **Changed assertions** (for your written review, rule 18; nothing loosened) are listed in the change note:
   `test-deep-save` (fixtures 09 and 16 both carry a Deep field and each player is now checked against its own saved
   field), `test-deep-look` (five exact import entries for the new test), `test-save-fixtures` (roster 17 to 18, and
   a new check that a saved Deep field is kept exactly and never added to an older save).
