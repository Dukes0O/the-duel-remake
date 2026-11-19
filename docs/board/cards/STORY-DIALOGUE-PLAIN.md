# STORY-DIALOGUE-PLAIN

Claude's card. Kyle, 19 November 2026, after playing Night 2: the lines of Cinder and Auntie Solder are "meaningless
staccato bursts of speech", and he did not understand the opening ("four embers, four nights"). Simple prose is
required, so every line of the story gets a full review. The Walkers' lines read reasonably and are the model.

## What to do

1. **Rewrite every spoken line and thought** in `src/story/scenes/night-2.js` and in `docs/story/five-cold-nights.md`
   (Nights 1 to 5) as plain, complete, conversational sentences. Each line has one job: what is happening, what it
   costs, or who this person is. No fragments, no riddles, no telegraph style. Example: "Eleven people. Blankets for
   about six. It freezes tonight." becomes "There are eleven of them and we only have blankets for six. It's going to
   freeze tonight."
2. **Explain the stakes before the first choice.** Night 2 opens with a short scene that says plainly: the hearth
   burns one ember a night; the store holds four, so the town has four nights of fire; Big Bess leaves at first light
   to fetch gas, and twenty units of gas bake one new ember. Decide whether that is spoken by Auntie at the hearth, or
   a short illustrated opening in HTML before the 3D scene (Kyle asked); a player who has not played Night 1 must
   understand it.
3. Keep every line under the talk view's 260 characters, and keep the choice costs exactly as the ledger has them.

## Checks

`test-night-2` and `test-story-talk` (they check the lines and branches); Kyle reads the new lines before Codex builds
the opening scene.

## Story logic

Kyle, 19 November: the Walkers had a fire at the Wash after being refused an ember. Check every branch for facts that contradict each other (who has fire, who knows the way, who is where), and write the result into the design page. STORY-NIGHT-2-FLOW item 6 settles the camp's fire.
