# HELI-JOB-CLARITY

Owner: Claude (builder lane `claude/heli-job-clarity`). Change note: `docs/changes/HELI-JOB-CLARITY.md`.

## Kyle's report (31 October 2026, live helicopter, condensed)

1. "I don't see the ski panel." The landed card at Summit Run said "Ski drop waiting. Use the ski panel to continue
   or shut down to leave the flight", but no ski panel was on screen.
2. "I took a job to fly to Summit, but there's no conclusion to this job." The card showed a crate from Summit Run
   to Eifel Crown (342 kg, 2,100 credits, +550 clean). Eifel Crown is only on the Pilot's map.
3. "Helipad always restarts at Tremblant instead of the last location. There isn't continuity."
4. "There isn't clear instruction on how to hook up or release the hook."
5. "I took a 959 delivery job, but there is no car to hook up."
6. "The job doesn't come up on screen, so I've forgotten where I'm supposed to deliver the car."

## Reproduced (real game, private QA page, released switches, memory-only saves)

`tools/scenarios/heli-jobs.mjs` (first version) took the board's Stuttgart 959-S job (Pacific Canyon to Panorama
Ridge), flew it with the autopilot and the cruise, and took a ski drop to Summit Run.

## Root causes

1. **Ski panel.** The run menu (`skiOffers`) exists only on the three ski pads, kilometres from Summit Run's
   landing circle. The autopilot and the landed card bring the pilot to the landing circle, and `landedArrival`
   said "use the ski panel" there too, where no panel can show. Reproduced: landed in the circle with a ski drop,
   `skiOffers()` was null and the ski host empty. Nothing said where the pads were.
2. **Crate with no end.** `returnLoadJob` checked only that the leg fits a full tank (400 kg). Summit Run has no
   pump (its truck stands there only during a rescue), and a pilot arrives with about 130 to 200 kg (130 kg in the
   play-through). Summit Run to Eifel Crown is 271 kg, so the cruise is refused and the job cannot end. On top:
   nothing on screen after hooking, and Eifel Crown is not in the Fly To list.
3. **Always Tremblant.** `app.visitHeli` calls `session.start()`, which always entered `HOME_COURSE`; the save had
   no record of where the helicopter stood.
4. **No hook help.** The status row said only "HOOK H"; a hint appeared only after a failed press
   (FIX-HELI-HOOK). Nothing said that H also lets go, or when.
5. **No 959.** Away from home `waitingJobCar` put the customer car in the middle of the landing circle
   (`site.zone`), exactly under the arriving helicopter: out of the behind camera's sight while hovering, and the
   helicopter landed on top of it (play-through picture). The board also said "Pick up at pacific-canyon" (an id,
   since map places were missing from its name table), and Pacific Canyon is only on the Pilot's map.
6. **Job not on screen.** After taking a job only a 4.5 s "Job taken" notice showed; the board lives on the home
   pad, and the landed card hides while a car job is in hand.

## Design answers (Claude)

- D1 Job on screen: a job card, top left, for the whole flight: what, from where to where, the pay, the one next
  step, then "Delivered: N credits" briefly. Real keys; one key hooks and lets go, so the card says so.
- D2 Hook help: near something hookable "Press H to hook" (or what to fix first); carrying over a landing circle
  "Press H to let go".
- D3 Continuity: a new visit starts at the pad where the helicopter last stood; home for new and old saves. One
  additive save field, old saves unchanged.
- D4 Car jobs: the car is at its pick-up when the pilot arrives; a job whose car cannot be placed is not offered.
- D5 Every job ends: jobs name only places the pilot can fly to and land at; pay on delivery; Drop job anywhere,
  no pay and no penalty.
- D6 Ski panel: shows whenever the card says to use it, or the card's words change.
- No change to flight physics, pay rules, fuel rules or released courses.

## Builder decided (Claude to review)

1. **Where the visit starts.** `heli.lastPad` is written on every safe touchdown on a course, at a visit's start,
   and on the return home after a crash (the helicopter really is there). It is written only when it differs from
   home, so a save that never left home stays byte for byte as it was. The visit starts at home anyway when: the
   pilot has not finished the four lessons, the place is not a destination now (a switch went off), the heli-ski
   group job is taken today (the group boards at home), or the story's job is in hand (its crate lies at home).
   A car job works from any pad: the way leads to its pick-up.
2. **Which legs a job may name (D5).** New rule `jobLegFlyable` in `heli-jobs.js`: the leg plus 80 kg for flying at
   its two ends must fit the most fuel the pilot can have on the ground at its start: a full tank at a pump (home,
   and with the map on Harbour Lights, Pacific Canyon, Alpine Serpent; Summit's rescue truck does not count),
   elsewhere a full tank at the nearest pump less that leg and its 80 kg. 80 kg keeps the first slice's round trip
   (Woods to Panorama and back, 120 kg each way) a job. The play-through with the autopilot burned more (107 kg at
   the ends of one leg); the fuel truck stays the backstop. Applied to return crates and to the map's car routes
   (the three original routes all pass). Effects: with the map on (as released, with or without the Table and Kogane)
   no crate from Eifel Crown, Ridge Rally, High Country or Azure Riviera; with the map off Summit Run joins them.
   Kyle's Summit Run to Eifel Crown crate is never offered. These four truly cannot get a crate under the rule:
   even each one's shortest leg, plus the 80 kg, is more than the fuel the pilot can have there (on the ground,
   shortest leg: Eifel Crown 135 kg, 110 to Kogane Pass; Ridge Rally 120, 75; High Country 55, 145; Azure Riviera
   195, 125). Ridge Rally and Azure Riviera are close; a smaller reserve would open them. The fuel rules themselves
   are unchanged.
3. **D4 placement and the "never offered" guard.** The customer car waits on the parking spot beside the landing
   circle on every course (home already did). Every destination's site has a parking and spare spot (courseSite
   throws otherwise), and a new test checks every released destination, so no car job can name a pick-up with no
   room; loading courses at board time to filter jobs would stall the pad, so the guard is the test.
4. **A crate is a job from its first hook** until delivered or dropped (it was already "taken" at the first hook for
   the clean bonus). It is still not saved: leaving the course without it loses it, as before.
5. **Drop job anywhere** is a new `dropJobHere()` on the job card. The board's own Drop job stays at the home pad.
   Drop acts on exactly the job the card shows. A job whose load is on the cable is refused with "Set the load down
   first", so no load is left on the cable with no job. A dropped crate goes back to its own pad: on its own course
   it is laid on the crate spot again at once; dropped elsewhere it is laid there on the next landing at its pad
   (the day's crate stays open). A dropped car job goes back on the board, and retaking it makes one car, not two.
   The hook prompt says why H cannot hook ("Too heavy to lift", "Bucket fitted: take it off at the home pad",
   "Rescue line fitted: ...", "Finish lesson 4 before carrying cars") instead of "Lower N m". The heli-ski group, being
   aboard, is handed back at home only (the card shows no Drop button away from home for it).
6. **D6.** The ski card names the panel only when the run menu is on screen with a run to pick; elsewhere it says
   "Land on a ski pad to ski: the job card on the left shows the nearest." The job card shows the nearest pad with
   distance and heading. The run menu no longer shows on a pad that starts no run (the pickup before aerials open).
7. The landed crate offer now says how to take it: "hover low over the crate beside the pad and press H".

## Not fixed here (noted)

- The day's car jobs are drawn from the courses the pilot owns, so buying a course mid-day can reshuffle the
  board and change which job a taken id means. A follow-up card would freeze the owned list for the play day.
- The Fly To panel shows no fuel figure for Summit Run (it reads legs without the Summit option). Display only.

## Claude answers (31 October 2026)

- **Builder decisions:** all three stand. The 80 kg allowance at the ends of a leg is fair, since the fuel truck catches a pilot who runs dry. A test is the right guard for car placement. Crates still not being saved matches how they worked before.
- **Changed assertions (rule 18 review):** none are loosened.
  - `test-heli-jobs`, car placement: the old check that the car is in the circle becomes two checks, one that it is on the parking spot and one that it is outside the circle.
  - `test-heli-jobs`, crate check: it now also asserts that every crate offered names a leg that can be flown. The only places with no crate are those with no flyable leg, and the test names each one.
  - `test-heli-jobs`, supply-call test: it turns on the pilot's map, which is how the game is released, and keeps its checks unchanged.
  - The two Summit pins changed only because Summit Run with the map off no longer lays a crate. The builder confirmed that with the crate rule undone both pins return to their old values. The flights themselves are unchanged.
- **Approved to merge** after the independent review of the code and the save field.
