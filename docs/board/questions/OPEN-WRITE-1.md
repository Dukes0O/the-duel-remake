# OPEN-WRITE-1: questions, each with the pick I carried on with

Claude (cloud), 26 November 2026. None of these stopped the writing. Each says what needs deciding, the options and my
pick. `checkThread` passes all three files as they stand, apart from the two new people it names.

1. **A role that may be empty.** Three roles are only wanted if somebody fits: the site for Tally's free news
   (`rumoured`), a burned camp she can be asked about (`burned`), and a people who owe a favour and can be sent to the
   Mall (`friend`). Options: the cast rule fills a role marked `optional: true` when it can and starts the storyline
   anyway when it cannot; or I take the roles out, and the lines that need them. **Pick: `optional: true`,** as
   written. Rows that need the role are conditioned on `{cast: '<role>'}`.
2. **A rumour of a role's site.** Section 12 writes a rumour as the mark `rumour/<site>`, and a role is only made a
   real id when it is the whole string, so `rumour/@rumoured` cannot be written. **Pick:** the row carries
   `rumour: '@rumoured'` (the hauler's free news) or `rumour: {site: '@site'}` (Dace), and whichever card draws the
   rumour's circle writes the land's mark from it.
3. **Beat conditions that are not facts.** I use `{banked: n}` (so many hearths banked since the beat was reached),
   `{after: beat}`, `{near: 'sign', within: m}`, `{cast: role, is: id}`, `{explored: id}`, `{due: promise}`,
   `{call: 'trouble'}`, `{came: choice}` and the words `outing-costs-the-gas-run` and `outing-is-free`. `checkThread`
   does not read them. **Pick:** OPEN-THREADS gives each the meaning its file's header and comments state. Any it
   would rather have as a mark, I rewrite.
4. **Where a mark's sentence lives.** **Pick:** a `marks` table at the foot of each file, id to sentence, `null` for a
   mark that is never shown, as `src/story/ledger-ui.js` keeps them today.
5. **A sign at a checkpoint.** The hauler's truck stands at a checkpoint that traders come to, and a checkpoint cannot
   be a role. **Pick:** `sign.at: {checkpoint: {who: 'traders'}}`, and the director chooses which.
6. **Mends inside a storyline.** Tally's shaft, Mr Penny's pipe, the camp's valve and the pickup's three faults are
   written as `mend` rows in the beat (`wrenchSeconds`, `scrap`, effects), because this card may not add rows to the
   needs table. **Pick:** OPEN-THREADS reads them as needs of the kind `mend`, and the needs rule charges the scrap.
7. **What Tally owes.** A favour is owed by a people, and Tally is one person, so the mend writes a debt
   (`stranded-hauler/tally-owes`) that her tow settles. **Pick: the debt.** If hauliers should owe as a people, it
   becomes a favour owed by `traders`.
8. **Mr Penny's people.** A person in the register belongs to a people. Options: a people of one for the Dead Mall
   (`seaview`, "the Seaview Centre", leader `mr-penny`), or `travellers`. **Pick: a people of one,** so that his word
   and the promise to him have somebody to belong to.
9. **"Dace owes the player."** Read as any of: the marks `dace-runner` or `dace-secret`, the debt
   `walkers-great-favour`, or any debt whose person is `dace`. **Pick: as written.** A later scene that makes him owe
   need only write a debt of his.
10. **Two nights left.** Dace asks for two days, so the director's rule for an act's last night must become "not with
    fewer nights left than the storyline needs". **Pick:** `sign.nightsNeeded: 2`, read by the director.
