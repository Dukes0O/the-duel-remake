# The Water Road: a Wasteland story

Claude, 31 October 2026, after Kyle: "Gratian likes the wasteland the most."
Design only: no game code. Same shape as `docs/story/kogane-invitation.md`.
Sections 1 to 7 are for Kyle and Gratian: plain words, what you see and do.
Sections 8 to 12 are for the builders.

The top rule for every card (Kyle, 31 October 2026): smooth play and a screen
that always says what to do next. A child must be able to pick this up and
enjoy it without help.

## 1. The story in one breath

Behind the Rustwall, the camp's well has run dry. **Hollis**, the gatekeeper
who let you in ("Outsiders don't find this road by accident"), tells you why:
the eight warlords have cut the old water road into pieces. Each one holds a
stretch of it, and at the end of the road Baron Blackiron sits on the Cistern,
the last clean water in the Wasteland.

So you win the water back, one warlord at a time. Each chapter is one job in a
mode you already know, then the warlord's fight. Every chapter fixes one part
of the camp's water works, and you can see it in the yard: a patched pipe, a
pump that runs, a water tower that fills a little more each time.

All the way, someone inside the Baron's gang sends you notes signed **"V."**.
When the Baron falls, V. turns out to be **Vesper Blackiron**, his own
daughter, who joins your crew (that part is already in the game). Water runs
into the camp, and the tower is full.

Then a dust cloud on the horizon: **a ninth warlord** has heard the water is
flowing. That warlord is **Gratian's**: he names them and picks their car,
their trick and their hideout (section 6). Gratian asked to be
surprised, so Claude chose: **Magnus the Magnet** (section 6, Answers).

## 2. The chapters

| # | Chapter | You do (a mode you know) | Then | The yard gets |
| --- | --- | --- | --- | --- |
| 0 | The dry well | Read Hollis's note on the Story card | | The dry well, a slack pipe and an empty water tower appear in the yard |
| 1 | Saws on the pipe | Win a Mad Max Duel on Sal's road (Pacific Canyon or Red Mesa) | Beat Sawtooth Sal | The pipe is patched |
| 2 | Fuel for the pump | Win a Fuel Run | Beat the Dustmonger | The pump coughs into life |
| 3 | The stolen valve | Win a Bounty Hunt: the thief carries the valve | Beat Mother Mirage | The valve is back on the pipe |
| 4 | Hold the yard | Hold the fort in Ambush Alley while Odessa fits the pump | Beat Gearhead Gunn | The pump house has a roof |
| 5 | The boiler | Win Last Car Rolling in the Scrapdome | Beat Kettle Kingpin | The boiler boils water clean |
| 6 | The water truck | Win a Mad Max Duel on Alpine Serpent: the Vultures have the truck | Beat the Twin Vultures | The water truck is home |
| 7 | The tanker | Win a Convoy Raid on the Salt Flats | Beat the Tollkeeper | The tanker fills the tower to the top line |
| 8 | The Cistern | Beat Baron Blackiron | | Water runs into the camp; Vesper joins |
| 9 | The ninth warlord | Beat Gratian's warlord | | Their wanted poster on the Story Wall, and their prize |

How it works:
- Each chapter opens when the one before is done. Chapter 9 opens after
  chapter 8 and is built once Gratian has answered section 6.
- **Warlords you already beat count.** If you beat Sal before the story came
  out, chapter 1 shows a tick and you only play its job if you want to.
- **Warlord fights still open the usual way** (the territory's hold reaches
  100). The story job adds hold the way any win does (+25), and the Story card
  always shows how far the hold is, with a bar and the words "2 more wins on
  Sal's road open the fight".
- **A mode not open yet** (Fuel Run at rank 6, Bounty Hunt and the Salt Flats at
  rank 9, Ambush Alley at rank 12) shows the rank needed and a bar to it. Every
  chapter's job counts toward rank, as all races do.
- Nothing is timed. Lose a job or a fight and you just try again.
- Kyle and Gratian each have their own story, as each named player has their
  own save. Nothing needs two players at once.

## 3. Where it shows up

| Where | What shows |
| --- | --- |
| **The yard** (Scrapdome Yard, existing) | A **"Next up"** line that is always right. Today it says "Sal is waiting on the territory map" whatever you have done; it will name the next chapter's job and the one button that starts it. The water works stand in the yard and change with each chapter |
| **Story Wall** tab (existing, "The road remembers") | Chapter list with ticks, Hollis's note and V.'s notes, each chapter's one button ("Race on Sal's road", "Start a Fuel Run", "Fight Sal"). Locked chapters say what to do first, with the bar |
| **Main menu** | The STORY button opens a choice of the two stories (Kogane and the Water Road) when you have both. A red dot means a new note |
| **Before a story job** (existing setup) | The story fills in the mode, venue or road. You still press START. Change them and the job is not a story job any more, so it cannot be won by accident |
| **During a race or fight** | One caption at the start (Hollis or V. by radio, with the radio click). Warlords keep their intro cards |
| **Results** | A win shows the chapter's tick and what the yard got |

## 4. How hard it is

The modes and warlords keep their own rules and their Easy, Medium and Hard.
Nothing about the shared difficulty numbers changes.

**Every chapter must be winnable on Easy by a young driver.** The card that
builds each chapter proves it with the game's test drivers, as the Kogane duel
did: on Easy, the child-pace driver wins the job and the fight at least 8 times
in 10. Where a warlord on Easy is too hard for that, the story may only use
that warlord's own Easy settings, never the shared numbers. If it still cannot,
the card stops and asks Claude.

## 5. Every line

Captions with the radio click, like Kogane (no new voice files; Hollis can
later use the gatekeeper's existing voice if credits are spent). No caption over
260 characters. Draft lines (the LINES card polishes them, keeping the facts):

| Id | Who | When | Text |
| --- | --- | --- | --- |
| `story.water.hollis.note` | Hollis (note) | The Story card, first | Driver, the well is dry. The old water road runs from here to the Cistern, and eight warlords have cut it into pieces. Win it back stretch by stretch and this camp drinks again. Start with Sal. She sawed straight through our pipe. Hollis |
| `story.water.hollis.1` | Hollis | Chapter 1 job starts | Sal's crew is on the pipe road. Show them whose road it is. |
| `story.water.v.1` | V. (note) | After chapter 1 | Nice driving. The Dustmonger guards the fuel your pump needs. He hides in his own dust: stay close behind him. V. |
| `story.water.hollis.2` | Hollis | Chapter 2 job | The pump needs fuel. Bring the cans home before they do. |
| `story.water.v.2` | V. (note) | After chapter 2 | Mirage paid a thief to steal your valve. The thief wears a mark. Catch them. V. |
| `story.water.hollis.3` | Hollis | Chapter 3 job | Somebody out there has our valve. Find the marked car. |
| `story.water.v.3` | V. (note) | After chapter 3 | Gunn is sending raiders to wreck your pump while Odessa fits it. Hold them off. V. |
| `story.water.odessa.4` | Odessa | Chapter 4 job | Give me five waves of quiet and this pump will run forever. |
| `story.water.v.4` | V. (note) | After chapter 4 | Kettle Kingpin sits on a boiler that makes dirty water clean. Win it in his dome. V. |
| `story.water.hollis.5` | Hollis | Chapter 5 job | Last car rolling takes the boiler. Make it you. |
| `story.water.v.5` | V. (note) | After chapter 5 | The Vultures stole your water truck. Two of them, one of you. Watch both mirrors. V. |
| `story.water.hollis.6` | Hollis | Chapter 6 job | That truck is ours. Bring it home. |
| `story.water.v.6` | V. (note) | After chapter 6 | The Tollkeeper's tanker is full of your water. Three valves, then the charge. V. |
| `story.water.hollis.7` | Hollis | Chapter 7 job | Break the valves, plant the charge, and the water is ours. |
| `story.water.v.7` | V. (note) | After chapter 7 | Only my father is left. He uses every warlord's trick. You have beaten them all, so you know them all. V. |
| `story.water.vesper.8` | Vesper | After the Baron | It was me all along. Vesper. The Cistern is open and the water is yours. I'm done with my father's road. Can I ride with you? |
| `story.water.hollis.end` | Hollis | Next yard visit | Listen to that. Water in the pipes. Thank you, driver. |
| `story.water.hollis.9` | Hollis | After the end line | Dust on the horizon. Somebody heard the water is flowing. A new warlord is coming. |

The ninth warlord's own lines are written with Gratian (section 6).

## 6. Gratian's warlord: questions for Gratian

Gratian decides these. Anything he leaves out, Claude fills in and he can
change it later.

1. **Name.** What is your warlord called? (Like "Sawtooth Sal" or "Baron
   Blackiron".)
2. **Car.** Which car do they drive? Any car in the game, and it gets warlord
   armour and paint.
3. **Trick.** What is their special move? Some ideas: a giant magnet that pulls
   you in, a ramp that launches them over you, mines left behind, a shield
   that blocks rockets, or something new.
4. **Hideout.** Where do they live? In the Scrapdome, the Pit, the Salt Flats,
   or somewhere new (a canyon, a junkyard tower, an old dam).
5. **Words.** What do they say before the fight? And what do they say when you
   beat them?
6. **Friend or enemy at the end?** Do they join your crew when beaten, like
   Vesper, or stay an enemy for a rematch?
7. **Prize.** What do you win for beating them?

### Answers (Claude, 2 November 2026)

Kyle, 2 November: "Gratian would like to be surprised." So Claude picked all
seven, and Gratian meets the warlord for the first time when he plays chapter 9.
He can change any of it later. The build rules are in `docs/SCRAPDOME.md`,
"Settled for build: Magnus the Magnet".

1. **Name.** Magnus the Magnet.
2. **Car.** An old Falcone Heritage that he pulled out of a scrap pile, covered
   in scrap plates, with a crane on the roof holding a giant round magnet.
3. **Trick.** The Big Pull. The magnet hums and glows blue, and a blue ring on
   the ground shows how far it reaches. Then every car inside the ring is
   dragged towards him. Drive straight away from him and you get free. After a
   pull the magnet is red hot, and he sits still while it cools: that is when
   you hit him. When he is wrecked once, he pulls twice in a row.
4. **Hideout.** His scrapyard on the Salt Flats, the Salt Flats Scrapyard,
   where everything metal in the Wasteland ends up.
5. **Words.** Before the fight: "Everything metal comes to Magnus. Your car is
   metal." When you beat him: "You broke my magnet! Fine, keep your water. I'll
   build a bigger one."
6. **Friend or enemy?** Enemy. He goes back to his scrapyard to sulk, and you
   can fight him again any time from the Territory Map.
7. **Prize.** The Tesla Coil (the arsenal's lightning pulse, which stops cars'
   weapons for 3 seconds), the coil that powered his magnet, if you do not have
   it yet; scrap; and his card on the Story Wall.

He opens for everyone who has beaten Baron Blackiron, story or not. On Easy a
young driver must beat him at least 8 times in 10 (section 4), using his own
Easy numbers only.

## 7. What changes for a player with progress

Nothing is taken away. Warlords already beaten count as done chapters (their
jobs are optional replays). A finished player (all eight beaten) opens the
Story card to a full tower, Vesper already in the crew, and chapter 9 waiting.

---

## 8. For the builders: what exists (read 31 October 2026, integration a06d3fb5)

- **Entry:** the Rustwall gate (`src/hidden-road-ui.js`), then the Scrapdome
  Yard (`src/screen-yard-home.js`, tabs CAREER, TERRITORY MAP, ARMORY, CREW,
  STORY WALL, SCRAPDOME). The stale "Sal is waiting" copy is at
  `screen-yard-home.js:16,27`.
- **Territories and courses:** `TERRITORIES` in `src/wasteland-career.js:2-11`
  (sal: pacific-canyon, red-mesa; dustmonger: high-country, ridge-rally; mirage:
  azure-riviera; gunn: eifel-crown; kettle: titan-arena and the scrapdome;
  vultures: alpine-serpent; tollkeeper: neon-docks and salt-flats; blackiron:
  harbor-highlands, cloudbreak-skyway). Hold +25 per qualifying win; fight opens
  at hold 100 (`src/warlords.js:53-65`).
- **Modes:** `src/arena/modes/fuel-run.js` (rank 6), `bounty-hunt.js` (rank 9),
  `ambush-alley.js` (rank 12), `convoy-raid.js` (Salt Flats and Tollkeeper
  hold), Last Car Rolling (`src/arena/arena-event.js`), warlord fights
  (`src/arena/warlord-event.js`). Arena and warlord results settle in
  `src/arena/arena-settlement.js` and `src/arena/warlord-settlement.js`, not
  `settleRace`.
- **Ladder end (WAR-04, built):** story cards and wanted posters
  (`src/warlord-cards.js`), the Story Wall (`src/screen-card-wall.js`), Vesper
  joins (`src/crew.js:57-67`).
- **Voices:** crew callouts and `gatekeeper.welcome` in
  `tools/audio/catalog.json`; `src/fight-voices.js` plays them in Mad Max Duel
  races only. Warlords have no voice.
- **Save:** `profile.wasteland` (`src/wasteland-progress.js:89-177`) holds rank,
  scrap, territories, warlords, crew, kits and cards.
- **The story system is Kogane-only today:** `src/story/story-save.js` (steps
  and writers), `story-lines.js` (one caption table), `story-radio.js` (imports
  Kogane's table), `story-ui.js` (one card, one button). Reusable as they stand:
  `story-caption-view.js` and the radio queue. `normalizeStory` keeps unknown
  keys, so `story.water` survives older builds.

## 9. The save

`profile.story.water`, beside `profile.story.kogane`, following section 9 of the
Kogane packet (optional, created on first write, marks only rise, newer version
kept, unknown names kept):

```js
profile.story.water = {
  read: true,                 // Hollis's note opened
  jobs: ['sal', 'dustmonger'], // chapter jobs won as story jobs, in order
  notes: 2,                   // V.'s notes shown
  end: true,                  // Hollis's end lines shown
}
```

A chapter is **done** when its warlord is defeated in `profile.wasteland`
(read, never copied), so a player's ladder progress is the story's progress.
The chapter's job is done when its id is in `jobs` or the warlord is already
defeated. Chapter 9 adds `ninth: {...}` when it is built. No other field is
touched by the story; scrap, XP, hold and the warlord records stay with their
own writers. One independent save review (rule 17).

## 10. Switch

`water-road`, state `dev` while built, then on at release (Kyle, 31 October:
no Preview step). Needs `hidden-road`, the Scrapdome and `warlord-cards` on.
Off: today's game exactly, except the yard's "Next up" fix, which ships on its
own (card WATER-YARD-NEXT) because it is a plain fix.

## 11. Cards

| Card | Needs | Locks | Files it owns | Done when |
| --- | --- | --- | --- | --- |
| **WATER-YARD-NEXT** | none | none | `src/screen-yard-home.js`, its test | The yard's line always names the real next step from the save (next territory to work, a fight that is open, rank needed); never "Sal is waiting" after Sal falls. Ships alone, no switch |
| **STORY-MULTI** | none | `save-shape` | `src/story/story-save.js` (a story registry: each story has its key, steps, writers), `story-lines.js` (lookup across stories), `story-radio.js` (no Kogane import), `story-ui.js` (one card per story, a chooser when more than one) | Kogane plays and saves exactly as before (its scenario and suites pass unchanged); a second story can be registered with data only |
| **WATER-SAVE** | STORY-MULTI | `save-shape` | `src/story/water-save.js`, fixture, `tools/test-water-save.mjs` | Section 9 rules; chapter done read from `profile.wasteland`; independent save review |
| **WATER-LINES** | STORY-MULTI | none | `src/story/water-lines.js`, test | Every line of section 5, no em dash, none over 260 characters |
| **WATER-HOOKS** | WATER-SAVE | `busy-game-files` | the story mark through arena, warlord and race settlement; "Start job" filling the setup | A story job counts only from the Story card's button; changing mode, venue or road clears it; lose, quit or abandon grants nothing |
| **WATER-YARD-ART** | none | none | `tools/blender/` recipe for the water works (well, pipe, pump house, boiler, truck bay, water tower with eight fill levels), `public/assets/models/wasteland/scrapdome/` | Three-round cap; gritty, never toy-like; shows each stage in the yard; frame check when wired in |
| **WATER-SCREENS** | WATER-SAVE, WATER-LINES | none | Story Wall chapters, the bars, the yard stages, results tick | Every chapter says what to do with one button; locked chapters show the bar to the next gate; nothing shows with the switch off |
| **WATER-EASY** | WATER-HOOKS | none | `tools/test-water-easy.mjs` | Section 4: child-pace driver wins each chapter's job and fight on Easy at least 8 in 10 |
| **WATER-FINISH** | all above | none | change note | Claude plays chapters 0 to 8 as a young driver on Easy on a fresh memory-only career, and as a finished player; sends Kyle a sheet; switch on |
| **WARLORD-NINE** | WATER-FINISH, Gratian's answers | none | the ninth warlord (rules, art within the cap, lines), chapter 9 | Gratian's design built; winnable on Easy; Gratian plays it |

STORY-MULTI, WATER-YARD-NEXT and WATER-YARD-ART can start at once.

## 12. Removed

The yard's fixed "Sal is waiting on the territory map" line (replaced by
WATER-YARD-NEXT). Kogane-only code in `src/story/` becomes the general story
registry in STORY-MULTI, in the same change; nothing else is removed.
