# OPEN-WRITE-3: questions for the Director

Claude (cloud), 26 November 2026. Each has my pick, and the work carried on with that pick. Nothing here waits.

## 1. Does anybody in "Somebody else's flag" say Mrs Vane's name?

The town's own story keeps her name back until the note signed V. and her first letter, years in
(`docs/story/the-polite-letter.md`, chapters 17 and 18). A player may meet her water men in the open land long before.

- **a. Nobody says it (my pick, and how the page is written).** Her people call her "the Office". Miss Pell has never
  met her and says only that she writes on very nice paper. The board carries PURE. SAFE. YOURS.
- b. Miss Pell says "Mrs Vane" once. It is plainer, and it spends the town's reveal.
- c. Mr Crisp leads the crew. His "first meeting" line in the town's story would then be a second meeting.

## 2. How does the toll read the promise made to Sump in the burned camp?

Section 21 has the promise begin "A toll on the Mall Road" by name, and no storyline's file may name another.

- **a. A mark named for the people, `road-rats/toll-promised` (my pick).** Whoever writes the promise writes this
  mark beside it. The toll reads it in `starts` and in Sump's first lines, and settles a promise of the same id.
- b. A new fact for promises (`{fact: 'promise', id: ...}`). Section 12 has none.

## 3. What the data files needed that sections 12 and 18 do not give

I wrote each the plainest way I could and will bring all three files into `checkThread`'s shape when OPEN-SHARED lands.

| What was needed | How the files write it |
| --- | --- |
| A condition that asks about a role of the cast | `{fact: 'word', role: 'camp', atLeast: 'Friendly'}`; and `{cast: 'camp'}` for "this role was filled" |
| An effect that happens only on a condition ("each people who stood") | `when:` on the effect |
| The sentence a readable mark shows on What people remember | `text:` on the `mark` or `made` effect. A mark without one is kept out of sight |
| Half the scrap in the car, taken after a lost fight | `{type: 'scrap', share: -.5}` |
| A feud that moves for one group | `{type: 'feud', of: 'road-rats', by: 1}` |
| A choice that needs scrap the player may not have | Nothing: I took it that the rule refuses a choice whose `scrap` effect would go below nothing |
| Lines only one people could say | `for: 'glasshouse'` on the line or the talk, and `for: 'any-other'` on the line with role names |
| A role for "a people at odds with one of these roles" | `hostileWith: ['first', 'second', 'third']` on the role |
| A quarrel that is mended, so two peoples are no longer at odds | The mark `market-day/quarrel-mended`. My pick is that a site's `hostileTo` entry takes an `unless` condition that reads it |
| Ids for the kinds and the signs | Kinds `feud`, `build`, `rival`. Signs `out-of-place` (a thing out of place) and `words` (a person's words) |
| A count of payments, and "two others have agreed" | Marks, and `any` over pairs of marks, because the vocabulary has no counter |

## 4. Names I had to choose

The Bus Ring's leader had no name: she is **Gasket**, and the people's id is `bus-ring`. The role name for a camp's
young one is `{camp.child}`. The water men's id is `water-men`. Each page's last section lists every new name.
