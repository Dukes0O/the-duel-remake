# OPEN-WRITE-2: questions for Claude, each with the pick the work went on with

Written 26 November 2026 by the cloud session. Nothing here waits: every pick is already in the pages and the files.

1. **"The Whites" names two things.** `docs/story/there-is-no-2-15.md` gives the name to Vane's old salt works on the
   plateau (a region of its own). Section 19 calls this storyline "Lights on the Whites" and the card puts it on the
   salt pan. Options: rename the storyline; rename the works; let the name cover both. **Pick:** Tin Town calls all the
   white ground "the Whites", the pan below and the works above. The storyline plays only on the pan, and its page says
   so under "New names".
2. **A line cannot hold a compass word.** Section 19 says the voice on Radio Hill gives bearings, and OPEN-SITES writes
   `{camp.bearing}`, but `checkThread` gives a role four words only. Options: add `bearing` to `ROLE_WORDS`; keep lines
   free of bearings. **Pick:** no bearings in lines. Each voice gives its bearing by a lamp drawn where it truly is (red
   on the mast, white in the Pocket), and Captain Imre's direction is a rumour's circle. If `bearing` is added later,
   five lines would be a little better with it.
3. **A role that is cast later, by the player.** In "The runaway" the haven is whichever Friendly people the player
   drives the boy to, and a player with no friend must still be able to meet the boy. The director lists only
   storylines whose roles can be filled. **Pick:** `cast.haven` carries `castWhen: 'the player arrives'` and
   `optional: true`. OPEN-THREADS needs to honour both, or the haven moves out of the cast.
4. **Dot cannot be a haven.** The register has Dot as a person of Tin Town, so she cannot be cast from `peoples`.
   **Pick:** Dot's Diner is left out of the havens. If the diner gets a people of its own, one line brings it back.
5. **Rumour marks.** Three rumours are written as `rumour/<site>` (the Pocket, the Bell Buoy, the Grey Camp), as
   section 12's example has them and as `checkThread` allows. Every other mark begins with its storyline's id.
6. **One line of main-story rule is proposed, not made.** After "Hidden, and found", the runaway's page has Old Smoke
   need four far fires alight, not three, before he will come in. It is on the page and as `fourFiresNeeded` in the
   file. **Pick:** proposed only; `five-cold-nights.md` is not edited by this card.
7. **Captain Imre in whole sentences.** `ships-in-the-sand.md` has him say "Nothing to report." The plain-sentence rule
   came later, and Five Cold Nights already has him say "we have nothing to report". **Pick:** every line of his here
   is a whole sentence that ends "We have nothing to report."
