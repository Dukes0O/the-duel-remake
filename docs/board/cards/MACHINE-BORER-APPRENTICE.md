# MACHINE-BORER-APPRENTICE

**The boring machine's apprentice: two cuts by hand, the rest sent, and a way to look in.**

## Kyle's direction (16 November 2026)

> "the two 9.4km cuts will take too long for game play to be enjoyable. that means the first 2 cuts need to train an
> apprentice who can be sent off on the other 2 cuts. We should be able to check in and see the apprentice's progress"

Kyle was reading a table of four ways for Hot Delivery (driving routes, two of them 9.4 km) as four cuts of the boring
machine. No cut is that long today: the trial mesa is 306 m and takes ten minutes by hand. The direction holds all the same,
and it is the rule from now on for every long piece of machine work: **the player does the first two by hand, which teaches
an apprentice; the apprentice is sent on the rest; and the player can look in on the work at any time.** The Far Side's
tunnel through the Ridge is over a kilometre, forty minutes by hand, and nobody should have to hold a lever for that.
`docs/MACHINES.md` section 2 ("Do it, teach it, hand it over") already says this in general; this card builds it for her.

## The design, settled before code (Claude, 16 November 2026)

**Teaching: two cuts.**
- An apprentice rides with the player from the first bore. The player picks who (anyone in the town who is free; with no
  town yet, the Dig offers one person).
- **The first cut** is the player's, start to daylight. The screen shows the apprentice watching and what has been seen:
  the survey read, the lever eased at a stall, the grade held. Words, not a bare bar: "{name} has seen you free a stall."
- **The second cut** is the player's too, with the apprentice calling the survey's numbers aloud as the screen shows them.
  At its daylight the apprentice is taught. A cut counts if it is 100 m or more and reaches daylight.
- **They learn what the player did** (MACHINES section 2). From the two cuts the game keeps three numbers, and they become
  the apprentice's own: how far off level the player came out (the apprentice's error on a line), how often the player
  stalled her in each 100 m (the apprentice's stalls), and the player's pace against what the rock allowed (the apprentice's
  pace). A player who came out dead level with no stalls has an apprentice who does. On Easy nobody learns badly enough to
  be a problem (error at most 0.5 m, pace at least four fifths).
- The player can always ride along again on a later cut and show them again; the better figures replace the worse.

**Sending.**
- At any face the face rule accepts, with a survey line that finds a far side, the Dig offers "Send {name}". That makes a
  work order of kind `bore`: the mouth, the heading, the grade the survey gives and the metres to the far side. It uses the
  town's own orders and `advanceDelegatedWork` (`src/town/town-apprentices.js`); no second apprentice system.
- There is one Mabel, so bores are done one after another, in the order they were sent. The player may not take her for
  another bore while one is being cut, but may take her over at the working face (below).
- A delegated bore goes on while the player does anything else in the game, at the pace `docs/MACHINES.md` section 2 sets
  for delegated work, and only while the game is open (the town's rule: nothing happens while it is closed).
- The ground is cut and the spoil laid in steps as the order advances, by the same two functions her hand-driven cut uses.

**Looking in (Kyle's "check in and see the apprentice's progress").**
- **The bore board,** on the yard's screen and in the Dig: for each bore, who is cutting, metres done of metres to go, how
  far the floor is off the line, stalls so far, and about how many minutes to daylight; and for a finished bore, how level it
  came out and who cut it.
- **Go and see.** Choosing a bore puts the Dig's camera at the working face. She is there cutting, the lining grows behind
  her, the spoil bank grows, and the apprentice is at the lever. The player's own cameras work (following, from the mouth).
- **Take the lever.** At the face the player may take over at once, cut for as long as wanted, and hand back. The work is
  one piece of work whoever holds the lever: nothing is thrown away and nothing is done twice.
- **She calls.** When the work needs the player, a line is said wherever the player is, once, with the bore's name: a stall
  the apprentice has failed to free three times; a line gone more than a metre off; coming out more than a metre up a face
  (spoil is wanted below the mouth). The apprentice keeps trying, slowly; the player is never made to come.
- **Daylight is told** wherever the player is: "{name}: Daylight. She is through, 0.4 m off level." The tunnel is then on
  the map and can be driven.

**Saved.** Bores, their orders and what an apprentice has learned are kept with the town. That changes the save's shape, so
it is the second slice, built with the save checker (AGENTS rule 6), and nothing a player has is touched.

## Slices

1. **In one sitting of the Dig, nothing saved:** teaching over two cuts, sending, the order advancing while the player uses
   another machine, the bore board, go and see, take the lever, she calls, daylight told.
2. **Kept with the town:** bores, orders and apprentices saved and loaded; the board on the yard's screen.

## Words (Odessa has the story's lines in `docs/story/the-far-side.md`; these are the Dig's own, plain)

- "{name} is riding with you. Cut two tunnels and {name} can cut the rest."
- "{name} has seen you read the survey." / "...free a stall." / "...hold a grade." / "...come out to daylight."
- "{name} can run her now. At a face, choose Send {name}."
- "{name}: She's stopped at {metres} m. Hard rock. Come and look, or I'll keep at it."
- "{name}: We're {drift} m off the line at {metres} m. Come and set her straight."
- "{name}: Daylight. She is through, {off} m off level."

## Checks (named before code)

1. Rules: after two hand cuts the apprentice's three numbers equal the player's; one cut does not teach; a cut under 100 m
   does not count; Easy's floor holds.
2. Rules: a sent bore on the real Dig ground reaches daylight with two mouths while the player's machine is another, the
   ground cut and spoil laid match a hand cut of the same line within 0.1 m, and nothing advances with the game closed.
3. Rules: each of the three calls is made once at its cause, and the work goes on.
4. Browser scenario (Claude runs it): the board with a bore under way, "go and see" at the working face, taking the lever
   and handing back, and the daylight line said while another machine is in use.
5. Claude drives it by hand before it is called done: two cuts, a send, a look in, a take-over.

Sound: `borer.call` (the apprentice's call), `borer.daylight` as now.

Also owed from MACHINE-BORER, Claude's to draw while this is built: the spoil bank's look (it is a flat pale slab).

## Codex decided (Claude to review)

- The Dig offers Pim because it has no town available without a save. The town record stores the measured line error separately and expresses accuracy as 1 / (1 + error in metres). Later lessons improve each measured figure independently.
- The Dig uses the current Easy setting (`cpuDifficulty`) for the apprentice's Easy limits.
- Mabel is free to start another cut after driving 12 m beyond a daylight mouth. Until then she can reverse back into the tunnel.

- A held grade means 50 consecutive metres within 1 in 50 of the surveyed grade.

- A face already in the bore queue cannot be sent a second time with the same heading.

- Only the active bore offers a visit. Waiting bores have no working face yet.
