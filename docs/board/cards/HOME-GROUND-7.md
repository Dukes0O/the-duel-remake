# HOME-GROUND-7

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules, story outcomes and words), Home Ground's step 7, first half: people move in. The order board
at the gate is HOME-GROUND-7B. Kyle's direction of 27 November 2026 (night): carry the building and the story lines on;
Claude settles the design. Design: `docs/HOME_GROUND.md` section 13, and Kyle's ruling of 21 November that the town and
the Scablands' crossing storylines are one story (decisions page). Behind `home-ground`; it changes the save, so it
keeps the lane tier and one independent review.

## Design, settled by Claude before code

**Who may come.** Each person may move in once his or her own storyline in the open land has ended well for them. The
outcome is read from the ledger the threads already write (`world.open` and the story ledger: marks such as
`runaway/found-him`, `burned-camp/broke-out`, `finch/friendly`, `hetty/friendly`, `penny/second-trip`; find the exact
marks each thread writes for a good end, and name them in the change note). A storyline that ended badly for someone
never brings them; nobody is lost for it, they simply stay where they are.

| Who | From | What they do at his ground |
| --- | --- | --- |
| Slack | The Runaway | Gathers the eggs each real day once Gratian has gathered a box with him watching once |
| Finch | The break-out from the pen | Keeps a tower when Gratian is not on it: a crossbow covering 25 m in a raid |
| Dace | Dace Goes Looking | A mechanic's bay: the car he drove out in is mended while he is away |
| Hetty | Radio Hill | A radio mast: a raid is called 60 seconds before dusk instead of at it |
| Mr Penny | The Dry Pump | A motor pump on the well: a tank fills in 4 real hours instead of 12 |
| Marigold's growers | The burned camp | Tend the beds and greenhouse: a ripe crop goes into the store by itself, and they bring two Marans hens (dark chocolate brown eggs, about 3 a real day) |

**How someone arrives.** When a storyline ends well, the board says so in the person's own voice, one whole sentence
(for example Slack: "If you've a corner and a roof, I'll keep your hens."). He builds them a hut, a new build kind
(2 by 2 cells, four stages from a flatbed load at Tin Town's gate, as the coop), and marks it for that person with F at
the board. They walk from wherever they live, through the gate, and stay. Each has a place they keep (Slack at the
coop, Finch at a tower, Dace in a bay beside his shed, Hetty at a mast beside her hut, Mr Penny at the well, the growers
at the greenhouse), a few words when he walks up (F), and a day: in at dark, out at first light.

**The Marans** are the second breed, with their own darker look from HOME-HEN-BODY's hen recoloured, and name boxes as
the browns have.

**The save:** the next version adds `folk` (each `{id, hut, arrived}`), Slack's `shown`, and the Marans in `hens`.
Older versions load unchanged after the verified backup.

**Sound cues** to name: `home.folk.arrive`, `home.folk.greet`, `home.hut.stage`, `home.mast.call`,
`home.pump.motor`, `home.crossbow`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: nobody arrives without a good end to their storyline; each arrives after
  a hut; each does what the table says, on the real clock where it says so; Finch's crossbow fights only in a raid and
  never when Gratian is on that tower; a save from step 6 loads unchanged.
- The lane tier, the rule 23 guards, the suites that name each storyline touched, `node tools/combat-balance.mjs
  --check` (Finch's crossbow), and `npm run build`. One independent review of the save. Claude drives it by hand.

## Claude answers
