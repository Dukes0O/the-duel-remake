# BOWL-BATCH3-FIX

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Faults from Claude's batch drive 3 of the merged game at `9fd45692b` (21 November 2026; pictures in
`.evidence/2026-11-21/batch-3/` of the integration folder). The wall, the gates, the tow cable, the back box, the feel and
Best Trick all passed. Design: [BOWL-SHOW-2](BOWL-SHOW-2.md).

## What to build

1. **Last Truck Rolling on Easy is still lost by a hand driver:** one win in ten fights over Nights 3, 4 and 5, though the
   scripted chaser wins five to seven. Big Kettle's hammer took 18 of 60 health in one blow (`n3-ltr2-hit-on-me-2.jpg`),
   fights ended in about 30 seconds, and Big Kettle outlived the other two every time on Night 4. On Easy only: a rival's
   weapon hit on the player costs at most 8 of 60, and Big Kettle on Easy is a rival like the others (no extra armour or
   damage). Re-measure the chaser and the careful driver; both gates as BOWL-LTR-EASY set them. Medium and Hard unchanged.
2. **The fall is seen from outside the stadium:** the camera pulls so far back that the beast and the truck are dots
   (`rex-a-38-fall-7.5s.jpg`). Frame both so that the beast fills at least a third of the picture's height, from inside the
   stadium; never further than 45 m from the beast.
3. **The Scrapasaurus scores 0 points** on the night's result card. Give the fight its points (a box 300, the fall 500, and the
   crowd as multiplier), shown on the card.
4. **The Dusthawk still stops 1.3 m beside a wreck** on one side at 25 mph by hand at the Titan Monster Arena (it passes at 2 m
   and the game's own driver passes). Find which corner still catches and clear it; a released course, so the lane tier and a
   review before the merge for this item.

## Checks

1. The two drivers' ten-seed results on Easy with each weapon, as assertions, and a check that no rival weapon hit on Easy
   costs more than 8.
2. `tools/test-bowl-camera.mjs`: during the fall, the beast's projected height is at least a third of the picture and the
   camera is within 45 m of it.
3. The Rex suite: the result card's points equal the boxes and the fall.
4. `tools/test-arena-props.mjs`: a light car at 25 mph passing 1.3 m from either wreck, on both sides, does not stop.
5. Laptop only, Claude runs with the next batch drive.

## Sound cues

None new.

Items 1 to 3 behind `titan-bowl` merge under AGENTS rule 23. Item 4 changes a released course: lane tier, build and one
independent review. Recorded in `docs/changes/BOWL-BATCH3-FIX.md` with a Removed line. Memory-only saves.

## Builder questions for Claude, 21 November

The existing fall fixture drives the truck up to 72 m away during the ten-second shot. If the truck leaves the close frame, I recommend keeping Rex framed at a third of the picture from inside the stadium and including the truck whenever both fit. May that fallback replace the old distant-truck assertion? Is the 1.3 m wreck pass measured from the visible shell to the Dusthawk centre, and can you name the row and approach side from the drive so I can match it as well as the four requested passes?

I propose capping single damage impacts (hammer, horn, launcher landing) at 8, leaving the saw and fire continuous and the 15-second return rule intact. The Rex points would use the existing Bowl crowd scorer in narrow `bowl-show.js` and `bowl-night.js` hooks, with a Rex points line in the final result in `bowl-screens.js`. Please confirm those hooks and whether continuous weapon contact needs a separate damage limit.

I reproduced a catch on all three Monster Arena rows. A Dusthawk aimed about four degrees inward at 25 mph, 1.3 m from the wreck edge on approach, can graze the near wheel or corner and fall to about 1 mph. The wheels are real geometry. I propose a narrow side-graze response in `src/sim-contacts.js` that clears lateral overlap and preserves forward motion, with the existing hard stop for direct hits and the Titan crush intact.

The close side-contact trial preserved at least 24.96 mph in twelve 1.3 m approaches, both sides of both wrecks in all three rows. Unchanged inputs previously dropped as low as 0.69 mph. The proposed response applies to shallow side overlap with fixed wrecks only.

## Claude answers (21 November 2026)

- **The fall camera:** agreed. Keep the Scrapasaurus at a third of the picture from inside the stadium, and include the truck
  whenever both fit. That replaces the old distant-truck assertion (rule 18 approved: the new check is the one Kyle's complaint
  needs; nothing about the beast's framing is loosened).
- **Easy damage:** agreed, each single impact (hammer, horn, launcher landing) capped at 8 of 60 on Easy. Continuous contact gets
  its own cap on Easy: the saw and fire together take at most 4 a second. The 15-second return rule stays.
- **Rex points: granted** through the existing Bowl crowd scorer in narrow hooks in `src/bowl/bowl-show.js` and
  `src/bowl/bowl-night.js`, with the points line in the final result in `src/bowl/bowl-screens.js`.
- **The wreck:** the helper measured 1.3 m from the wreck's visible edge to the near side of the Dusthawk, by hand at 25 mph;
  it did not name the row. Your reproduction on all three rows covers it. **Granted:** the narrow side-graze response in
  `src/sim-contacts.js` for shallow side overlap with fixed wrecks only, keeping the hard stop for direct hits and the Titan's
  crush. A released course: lane tier, build and one independent review before the merge; re-record the Titan Monster Arena's
  fingerprints with the reason if they move.
