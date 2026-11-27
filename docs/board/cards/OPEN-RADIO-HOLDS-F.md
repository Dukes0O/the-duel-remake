# OPEN-RADIO-HOLDS-F

The short board entry controls current state, ownership, dependencies and locks.

**Found in Claude's drive of the merged batch, 27 November 2026** (`docs/board/looks/drive-2026-11-27.md`).

**What a player meets.** At the burned camp, after the clues, the player asks one radio question and ends the call
("I will call again if I need you."). Back at the car, holding F opens the radio again instead of getting in. It does
so every time, until every question has been asked. A player who does not want to ask more cannot drive away.

**Measured.** Burned camp, beat `clues`, on foot 2.2 m from the car (re-entry range 3.5 m, hold 0.6 s). With one
question asked (mark `burned-camp/asked/buggies`), F held for 0.4 s and for 1.0 s, three times: each opened the radio,
`onFoot` stayed true. After all four questions were asked, one 1.0 s hold of F put the player in the car.

**Likely cause.** `src/world/open/parts/threads.js` about line 725: the radio opens when `!asked.size`, and `asked` is
built only from this frame's events, not from the questions already written in the ledger. With no staging point for
this storyline, `atTalk` is true anywhere on foot. A fix might count the ledger's asked questions, and not open the
radio when the player is within re-entry range of the car after the call was ended. Check: a suite that asks one
question, ends the call and holds F at the car; `open-burned-camp` scenario still passes.
