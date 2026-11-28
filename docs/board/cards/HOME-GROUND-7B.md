# HOME-GROUND-7B

The short board entry controls current state, ownership, dependencies and locks.

Codex's card (Sol: rules and words), Home Ground's step 7, second half: the order board at the gate. Needs
HOME-GROUND-7 merged. Design: `docs/HOME_GROUND.md` section 12 ("The order board at the gate"). Behind `home-ground`;
a save change keeps the lane tier and one independent review.

## Design, settled by Claude before code

**The board** stands beside his news board at the gate, and shows three requests at a time, each from a named person
of the land, each in one whole sentence, for things he can make now: eggs (brown, and dark brown once he has the
Marans), vegetables from his beds, scrap. Examples: "Dot wants a dozen brown eggs for her pies.", "Auntie Solder wants
20 scrap to mend her gate.", "Moss would trade a bag of grain for six carrots."

**Filling one:** F at the board with enough in his store hands it over. It pays scrap, and once in five it pays that
people's good word too (a ledger mark the open land's people already read, so a person he has helped greets him
warmly). A filled request is replaced by a new one after a real hour; a request he cannot fill waits and never expires.

**Choosing requests:** from the seeded generator, weighted to what he can make, never more than his ground could
produce in about two real days, and never two from the same person at once. People whose storylines ended badly for
them never ask.

**The save:** the next version adds `orders` (three, each `{from, wants, count, pays, word}`) and `filled`. Older
versions load unchanged after the verified backup.

**Sound cues** to name: `home.order.new`, `home.order.filled`.

## Checks

- `tools/test-home-ground.mjs` by behaviour: three requests, never two from one person; a request needs the store to
  hold enough; filling pays scrap and one in five a good word; a new one comes after a real hour; nothing expires; a
  save from step 7 loads unchanged.
- The lane tier, the rule 23 guards and `npm run build`. One independent review of the save. Claude drives it by hand.

## Claude answers
