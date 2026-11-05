# TOWN-PEOPLE

The short board entry controls current state, ownership, dependencies and locks.

`src/town/town-people.js`, `town-names.js`, `content/thoughts.js`, registered by the day. Section 11: everyone an individual with name, born, family, home, job, skills, health, mood and a short history. The twelve founders. Arrivals, families, children born and growing up, school years building skills, adults working 8 hours, the old retiring, and in old age passing on, gently, into the Book and the Old Ground. Needs and mood. Homes on painted ground improving and stepping back slowly. Jobs filled by skill. Each person's thought in one short plain sentence, at least 80 thoughts, seasonal ones too. `tools/test-town-people.mjs`: a 30 year run has real generations; 10,000 people in target; the population can drop and recover.

Design: [docs/WASTELAND_TOWN.md](../../WASTELAND_TOWN.md) and [docs/story/the-long-dry.md](../../story/the-long-dry.md). Read sections 2, 3, 10, 11 and the checks in section 15 first. **This game is for years of play and years of building (Kyle, 5 November): no fixed limits on people, buildings, map size or years; content lives in data under `src/town/content/`; a town saved today must load in every later build.** A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Real numbers wherever a real number exists, and note the source of any you add. Every player-facing word is plain, in whole sentences, with no em dashes. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers

## Codex decided (Claude to review)

- Keep the existing town save fields. Each daily step repairs missing people
  collections and creates the twelve founders from town seed and supplied
  founder names. Names and thoughts are plain data, so later content can add
  entries without changing the simulation.
- Store `born` as the absolute town-hour tick. Age is derived from the
  calendar, so children grow into school years, adults and older people without
  a fixed year limit. Founder families start as six pairs; children join a
  family record, and the Book keeps every person who passes away.
- Use optional `town.peopleConditions` values for water and shelter. Missing
  values mean the town has not yet measured that need, so no new arrivals are
  admitted; existing residents still have needs and mood. Arrival support is
  based on at least 15 litres per person per day and one shelter place per
  person. Store homes as individual records, let children keep their family's
  home and family id, and count `paintedHomePlaces` as homes that may improve.
  The 15 litre minimum is from WASTELAND_TOWN section 3; the section 14
  population arrival rate sets Year 1 arrivals; the target grows by one each
  time the town's age doubles. Birth and old-age passing chances are simulation
  tuning choices because the design gives no rates.
- Update needs, mood, school skill, work, retirement, births, arrivals and
  deaths once per town day. An adult works eight hours per day. Poor support
  lowers health and mood; stable support lets both recover. Deaths are gentle
  Book entries and add a resting record to `oldGround`, with no graphic event.
- Homes improve only on painted ground after six supported months with a good
  mood, and step back after a year of poor support. These waits turn the
  design's gradual change into whole town seasons.
- Add `src/town/content/homes.js` for the home progression names. The card
  names thoughts data but not home data; this file follows section 10's rule
  that player content lives under `src/town/content/`.
- Use the design's 2,100 kcal daily food need, 15 litre survival water need,
  16 to 65 working ages and eight-hour day (WASTELAND_TOWN sections 3 and 14).
  Start school at 6 and let ten years of attendance build skills. Birth chance
  (0.0015 per supported day for a healthy pair aged 18 to 40), passing risk
  (starting at 65 and rising with age), and health and mood changes per day
  are simulation tuning choices; the town design gives no rates for them.
- Keep each person's `thought` as one sentence selected from the seasonal
  thought table, with a deterministic daily rotation. This avoids changing
  simulation results when new thoughts are added to the content file.
