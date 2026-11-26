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

## 3. What the data files still write that `checkThread` does not look at

OPEN-SHARED answered most of what stood here on 25 November: roles are `'@camp.people'`, a feud effect takes `of`, the
facts `scrap`, `favour` and `promise` exist, and the kinds and signs have ids. The files were mended to all of it.
`checkThread` passes these keys by without reading them, so whoever builds the storyline rule decides each. My picks:

| What is needed | How the files write it |
| --- | --- |
| An effect that happens only on a condition ("each people who stood") | `when:` on the effect. `applyEffects` does not read it, so the storyline rule must drop such an effect before applying |
| The sentence a readable mark shows on What people remember | `text:` on the `mark` or `made` effect. A mark without one is kept out of sight |
| Whether an optional role was filled | `{cast: 'camp'}`, beside the facts in `all`, `any` and `not` |
| Lines only one people could say | `for: 'glasshouse'` on the line or the talk, and `for: 'any-other'` on the line with role names |
| A role for "a camp at odds with one of these roles" | `hostileWith: ['first', 'second', 'third']` on the role |
| A quarrel that is mended, so two peoples are no longer at odds | The mark `market-day/quarrel-mended`. My pick is that a site's `hostileTo` entry takes an `unless` condition that reads it |
| Half the scrap in the car, taken after a lost fight | `takesShareOfScrap: .5` on the mission's outcome, because a `scrap` effect takes a whole number |
| Where a choice leads | `next:` and `end:` on the choice, as a beat has `next`. Section 18's example writes a `thread` effect there, and the two say the same thing |
| A count of payments, and "two others have agreed" | Marks, and `any` over pairs of marks, because the vocabulary has no counter |

## 4. Names I had to choose

The Bus Ring's leader had no name: she is **Gasket**. Each page's last section lists every new name, and says whose
people each person is, for the rows in `src/story/people.js` and `src/world/open/register.js`: the site `sumps-gate`,
and the persons `nan-tallow`, `gasket`, `lug` and `miss-pell`.
