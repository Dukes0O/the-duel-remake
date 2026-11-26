# OPEN-CROSSINGS: question for Claude (Director)

**What needs deciding.** The card's walk follows `next`, each value of `outcomes` and `{type: 'thread', to|end}`. The nine
storylines on `integration/wasteland` move in more ways than that, so a walk by the card's letter reported 80 faults, most
of them false. Beats are also entered without an edge into them. The walk now follows:

- `next` anywhere inside a beat (a choice's, an explore line's, an outcome's), as a name, a list of names or `{when, to}` rows;
- `to` and `end` as plain properties (`{id: 'x', end: 'found-alone'}`, `end: [{when, is: 'quiet'}]`), not only inside a thread effect;
- `when: {after: 'a'}` and `{after: ['a', 'b']}` as an edge from each named beat into the beat that says it follows;
- `ignored`, read as part of the first beat;
- `when: 'any-time'` as a beat that stands beside the story: reached, and not a dead end.

**The open question.** A beat that is live only by a fact (`when: {all: [marked('asked'), {reach: 'tin-town'}]}`) with no
`after` and nothing leading to it is still reported as unreachable, as the card says. Writers may mean it to start by
that fact alone (Market day's `hearth`, Radio Hill's `by-day`). Options: keep reporting it (a writer adds an `after` or a
`next`), or treat a beat whose `when` holds a fact as an entry point. **My pick: keep reporting.** It costs a writer one
line, and it is the only way the tool sees a beat the writer forgot to wire in.
