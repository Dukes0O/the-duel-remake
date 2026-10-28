# SKIN-RULES: earning, buying, wearing, gear, dirt and the wash

Card: SKIN-RULES (Claude, SIM lane, no locks). Design: `docs/HELI_WILDLIFE.md`
sections 5 and 6. Switch: `heli-skins` (dev, from SKIN-SAVE). Nothing is
visible or playable: no screen, session, menu or drawing changes (SKIN-HOOKS
and SKIN-VIEW do those).

## What changed

- **`src/heli/heli-skins.js`** (new, pure: no screen, storage, clock or
  random). A profile goes in and a new profile comes out; money moves only
  through the returned profile, so applying a result once can never charge
  twice (a second call on the new profile refuses). Every helper takes
  `{enabled}`, the `heli-skins` switch.
- **`tools/test-heli-skins.mjs`** (new): 57 groups, a check for each number
  and each rule below.

## Rules and numbers (each written once, in a named table)

| Table | Holds |
|---|---|
| `EARN_AT` | 5 missions of one kind earn the skin |
| `SKIN_PRICE` | 2,500 base, less 400 per mission of that kind done, never below 900; TV skin flat 2,500 |
| `WASH` | cost 100; Brian's hint when grime first passes 80 |
| `SKINS` | name, look (body, lower, stripe), the count that earns it, its gear |
| `GEAR`, `BASE_GEAR` | section 5.3 numbers laid over the base kit (below) |
| `DIRT_RULES` | how each dirt builds (below) |

Tallies read from the mission record: fire = `firesOut`, medevac = `hoists`,
rescue = `searches`, wildlife = `wildlifeCounts`, supply = `supplies`. The TV
skin has no tally (bought only; `cameraFlights` never earns it).

Functions: `skinsOf`, `tallyOf`, `skinPrice`, `skinRows` (paint shop rows,
"Fire service 3/5"), `earnSkins`, `buySkin`, `wearSkin`, `skinOffer` (the fit
button's "and wear" offer), `gearWorn`, `gearStats`, `grimeOf`, the flight
tally (`createFlightDirt`, `addFlightTime`, `addLanding`, `addDip`, `addDrop`,
`settleFlightDirt`), `addDirt`, `washHelicopter`.

- **Earning.** `earnSkins` gives every skin at 5 or more that is not owned, so
  missions done before H3 count at once. Several at once come in the order of
  `SKIN_KINDS`. Earned skins are added to `owned` and `fresh`. `first` is true
  when it gives the save's first skin (Brian's line, the board note).
- **Buying.** Whole price or nothing; refuses an owned skin, stock, an unknown
  name, a shortfall (says how many credits are missing) and a skin already
  earned (it is free through `earnSkins`).
- **Wearing.** Any owned skin or stock. The first wearing of a bought or
  earned skin is a fresh coat: all four dirts go to 0 and the skin leaves
  `fresh`. Wearing the skin already worn changes nothing.
- **Gear table** (worn skin only; stock or switch off gives the base kit):

  | Skin | Gear | Sets |
  |---|---|---|
  | Fire service | water gauge, drop sight | `litreGauge`, `dropSight` on |
  | Medevac | winch, stretcher | line 5 to 40 m (base 15 fixed), reel 1.5 m/s; bump hurts above 8 m/s, two steps above 14 m/s; hoist pay +200 |
  | Search and rescue | searchlight, heat camera | search runs 8 minutes into night; heat range 150 m, buried skier 30 m, animals shown |
  | Wildlife | quiet tips, zoom camera | scare distance 50 m (base 100); count reach 100 m (base 60) |
  | Supply | cargo net, stronger hook | 2 crates (base 1); hook reach 5 m (base 3); hook limit stays 1,500 kg |
  | TV camera | steady nose camera | fifth camera view on |

- **Dirt** (flight tally, plain data the session keeps; `settleFlightDirt`
  turns it into whole levels and returns the part intervals left over to carry
  on with):

  | Kind | Builds by |
  |---|---|
  | Dust | 1 per 600 s engine time anywhere; 1 per 120 s below 30 m over Panorama Ridge or Summit Run; 2 per landing off a pad there |
  | Mud | 3 per landing off a pad at Tremblant Woods or Snow; 1 per bucket dip |
  | Soot | 2 per water drop within 30 m of a burning cell; 1 per 60 s within 100 m of a fire |
  | Salt | 1 per 120 s below 50 m over the sea (the caller says "over the sea") |

- **Cap.** `addDirt` keeps each kind at 100 and the four together at 100 (the
  drawn grime, `grimeOf`). When the coat is full, new dirt still goes on and the
  same amount comes off the other kinds one level at a time, largest first (ties
  in the order dust, mud, soot, salt). It says `hint: true` when the grime first
  passes 80.
- **Wash.** `washHelicopter`: 100 credits, on the ground only, all four dirts to
  0; whole price or nothing; a clean helicopter is neither washed nor charged.
  A dirty helicopter flies like a clean one: gear and skins are unchanged.

## Open for Claude

1. Dust rows add: low time over a dry course counts on top of the 10 minute
   engine time (the packet reads as two separate rows).
2. `summit-time-attack` is counted as Summit Run for dust (same mountain).
3. A skin with 5 or more missions is refused by `buySkin` ("It is free")
   instead of sold at the 900 floor; the caller runs `earnSkins` first.
4. Several skins earned in one call come in `SKIN_KINDS` order.
5. Part intervals (for example 7 minutes of engine time) are carried by the
   session in the flight tally's leftover; the save has no field for them, so
   they are lost when the game closes.
6. Base values for the stretcher's bump limits are null: the H4 bump rule
   without the gear lives in `heli-rescue.js` (SKIN-GEAR reads it there).
7. The 1.5 second wear fade is the view's, not a rule here.

## Claude decided

Director's verdict on the open list: items 1, 2, 3, 5, 6, 7 and 8 stand as
built. Item 4 changed: when the four dirt kinds together are at 100, new dirt of
one kind still goes on and the same amount comes off the other kinds, largest
first (ties in the order dust, mud, soot, salt), so the grime always shows the
latest flying (a fire after a dusty week turns the coat sooty). Each kind still
stops at 100 and the sum at 100. Built as one level at a time from the current
largest, which levels the biggest kinds down together. When several kinds are
added in one call they go on in dirt order, each taking from the others.

## Changed assertions

None to any existing test. The cap tests written in the first commit of this card (never merged) were rewritten for the new cap rule. No existing file is edited. No registry or count test needs a row: the
runner picks up `tools/test-heli-skins.mjs` by name.

## Checks

`test-heli-skins` (62 groups) and `test-heli-save` (43 groups) pass. Lane tier on f926cbaf (`--changed --jobs 4 --keep-going`): 23 passed, 0 failed, 0 not run, 191 s. `npm run build`: built, only the usual large-file notice.

## Removed

Nothing replaced; no old code, test or document is removed.

## Money review fix

`settleFlightDirt` floored raw float sums, so 6000 s in 1/60 s steps gave 9 dust
levels, not 10. Each floor now adds a 1e-9 slack and each leftover is clamped
at 0. A new test checks small steps against one big step for every interval.
