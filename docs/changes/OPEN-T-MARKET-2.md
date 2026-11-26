# OPEN-T-MARKET-2: the Market Day browser scenario runs to dusk

**Cause.** The scenario set the part of the day on the job's definition, which the open roam's day clock
(`src/world/open/day-rule.js`) now overrides, so the yard stayed at day and Auntie Solder's stakes talk (dusk only)
never opened. Next, at the gate, Dot stands where Lug's rider talk is; the stranded hauler's one-off aside by Dot is
checked before Market Day, so the first F opened it, and the scenario never answered its one reply.
**A player** meets neither wall: dusk comes after 16 minutes of play, the yard is 17 m from where every outing starts
at dawn, and after "I hear you." the next F opens Lug. Game unchanged; no word changed.
**Fix.** `tools/scenarios/open-market-day.mjs`: `setDay` sets the roam's `daySeconds` and part of the day; a talk
answers a lone "I hear you." aside and speaks again; a timed-out wait reports the talk box, beat, part of the day,
night, mission, step and position.
**Checks** (on 1b7cf3ebf plus this change): `open-market-day` passed, both pictures looked at; test-open-market-day,
test-open-missions, test-open-threads, test-open-roam, test-open-apprentice-run, test-thread-shape, core, the three
guards (11 of 11 passed) and `npm run build` passed.
**Removed:** nothing.
