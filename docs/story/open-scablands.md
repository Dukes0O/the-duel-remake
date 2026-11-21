# The open Scablands: freedom, discovery and side stories

Kyle's ideas of 21 November 2026 for the choose-your-own-adventure story, logged to build on. They sit beside
`five-cold-nights.md` (the first act) and apply to every night of it and to the stories after it. Sections 1 to 9 are
Kyle's ideas in his own words. Sections 10 to 22 are Claude's design for them (card STORY-OPEN-WORLD), written the same
day. Nothing here is built yet; section 22 lists the build cards.

Kyle's aim, in his words: "we need to make the code and storylines very flexible to adaptation, extension, enhancement,
variability, choice and randomness."

## 1. People who live, not people who stand to attention

"People shouldn't just be standing at attention motionless all the time. They should be able to move and walk around.
can be aimlessly or on a set track. but standing at attention is just silly."

- Every person in a town or camp has a routine: a set track (a guard's round, a mechanic between bench and car), a
  wander inside an area, or a task in one place (cooking, welding, hauling).
- A person the story needs is found where the routine puts them, and turns to face the driver when spoken to.

## 2. Freedom within each night

"We should be able to go into buildings if we want. We ought to have a large degree of freedom within each of the nights."

- The buildings of a town can be entered on foot: inside are people, services and things to find.
- A night's story waits for the player; the player can leave it, explore, and come back to it.

## 3. Services in town

"when the car is dirty, we should be able to find someone in a building who'll wash it; same with repair."

- A washer and a mechanic each work in a building in town. They wash or repair the car for scrap, and they are the same
  people the player meets elsewhere in the story.

## 4. Skirmishes on the open road

"If we head out and explore in the scablands, there should be an opportunity for more skirmishes."

- **Invisible checkpoints** are spread across the Scablands. Passing one may bring one car or several (a random number)
  onto the road.
- **Random intent:** a car may come to fight, or may only drive by, and the player chooses whether to engage it.
- **Switchable:** "The checkpoints must be able to be turned on and off so that during an actual mission that we're
  following, we don't cause a checkpoint to trigger and have multiple interactions." A mission turns them off while it
  runs; free roaming turns them on.
- All of it is drawn from the seeded generator, so a run can be replayed (AGENTS, "Always").

## 5. Camps that are not on the map

"we should be able to discover various camps that are not on the map ... At a minimum we add the discovery of towns and
encampments that weren't already established, to the map."

- Hidden towns and camps across the Scablands. Finding one adds it to the map for good.
- A camp may need help. Anything that needs supplies is likely too far from the player's town to help at once, but a
  thing that needs fixing can be fixed on the spot with the wrench, for scrap and goodwill.
- Goodwill with a camp is remembered (the ledger, `five-cold-nights.md` section 2).

## 6. Side stories found along the way: the burned camp

"if we discover an encampment, and we've helped them (they've become known and friendly), and we revisit the area, they
could be gone with the encampment destroyed and smouldering - likely we'd see smoke on the horizon and would draw our
attention over to it."

1. **The sign:** smoke on the horizon draws the player to the camp. It is burned and empty.
2. **The clues:** what is left points to an enemy: the Ash Men, Old Smoke, or another hostile camp.
3. **The choices:**
   - scout the enemy's known town; if they are confirmed as the culprits, engage there and then. The player is unlikely to
     win. A loss means capture, and the player's town must pay a large ransom to get the driver back;
   - or take the intel home and decide there: go out with a party to fight and free the friendlies, or leave them.

## 7. Not a straight line

"These can be storylines that get discovered along the way, and are not necessarily set out in a linear experience. so
one can play without actually unlocking these side stories and they'd be available to unlock on most Nights' play."

- Side stories are optional. The main story can be finished without any of them.
- Each side story has conditions (a camp found, goodwill earned, a night reached) and can start on most nights.
- A side story's state lives in the ledger, so it carries across nights and can be picked up again.

## 8. What the foundation must allow

From Kyle's aim above, the design must give:
- **Data, not code, for content:** people and their routines, buildings and their services, checkpoints, camps, side
  stories and their conditions are written as data, so new ones are added without new code.
- **Variety and chance:** encounters, camp needs and side-story starts vary from run to run, drawn from the seed.
- **Choice and consequence:** every choice is recorded and later content can read it.
- **Switches:** the checkpoints, and any system a mission needs quiet, can be turned off by that mission.

## 9. Many storylines that cross, and the town in the same land

Kyle, later on 21 November 2026, on Claude's first plan, which answered only sections 1 to 8: "this isn't enough, we
need a diversity of interweaving storylines, not merely the ones I've dictated. The code and story architecture should
have the ability to support flexibility and diversity. like later we will introduce potential storylines around finding
and drilling wells and building cities, basically integrating the wasteland tycoon into the scablands story. this is
really the incredible tie together of existing assets. we could find wells, build our defences and acquire friends (very
much like the battle of Polytopia concepts)."

- The burned camp is one storyline among many. Claude writes more of them, and the form must let anyone add more.
- The storylines cross: what a player does in one changes what another offers.
- The town building of `docs/WASTELAND_TOWN.md` and the machines of `docs/MACHINES.md` belong to the same land and the
  same story: a player explores, finds wells and camps, builds and defends, and makes friends.

## Fixed points this must respect

- One keyboard; players take turns (`memory/one-keyboard-no-coop`).
- The player is a pre-teen (decisions, 20 November 2026).
- Dialogue is full plain sentences (`memory/dialogue-plain-prose`).
- The story for the helicopter, the Deep and the Lab is made with Gratian (AGENTS rule 18).

---

# The design (Claude, 21 November 2026)

## 10. The form: a land, a ledger and threads

Three things, each written as data, and one rule for how they meet.

1. **The land holds what stands and what moves.** People with routines, buildings with doors, services, checkpoints on
   the roads, and **sites**: camps, wells, ruins, lookouts and dens that a player has to find. Each is a row in a table.
2. **The ledger holds what was done.** It is the one ledger of `five-cold-nights.md` section 7: each people's word for
   the player, things made, stocks, feuds, marks. This design adds sites found, favours owed and where each thread
   stands.
3. **A thread is a storyline written as data.** It has conditions for starting, a sign that draws the player to it,
   beats with choices, and outcomes. Its people are roles ("a camp that is your friend", "a group that is your enemy")
   which the game fills from the ledger when the thread starts. So one written thread plays differently for two players.

**The rule: no thread's file names another thread.** A thread's conditions read the land and the ledger, and its
effects are written to the land and the ledger. Two threads cross because a fact written by one is read by the other. That is how a storyline about a
well can change a storyline about a burned camp without either file naming the other, and how a thread written next
year fits in with those written this year.

**Chance comes from the save's seed.** Every draw is a named draw, as `namedThrow` in `src/story/ledger.js` does it
today: the seed, joined with a name such as `checkpoint/mall-road-2/crossing-7`, gives the same answer every time. A
draw does not depend on the order in which a player did other things, so a run can be replayed from the seed and the
inputs (AGENTS, "Always"), and Kyle's land and Gratian's land differ.

**What a day is.** Five Cold Nights has three parts to a day: at the hearth, on the road, after dark. The open land adds
a fourth that can be taken at any point: **out in the open**, with no mission running. A player may walk Tin Town, go
into its buildings, drive anywhere and come back. The story's next scene stands as a marker on the map until the player
goes to it (section 14).

**The same loop at every size.** Kyle's Polytopia comparison, in the Scablands' own terms:

| The step | In the Scablands | Written as |
| --- | --- | --- |
| Explore | Drive into land nobody has shown you. The big map draws driven ground in full and the rest pale | Section 16 |
| Find | A camp, a well site, a ruin worth salvaging, a lookout, an enemy's den | Sites, section 16 |
| Befriend | Mend something, keep a promise, stand with a people in trouble. Their word for you rises | Goodwill, section 17 |
| Build | Drill the well, raise the fence and the tower, lay the pipe, with the machines and by hand first | Section 20 |
| Defend | Riders come for what stands in the open. Towers warn, friends ride out, and you go and meet them | Sections 15 and 20 |
| Grow | A camp with water and a fence becomes an outpost, and an outpost becomes a town with its own people | Section 20 |

## 11. What exists today, and what each part reuses

Checked against the code on 21 November 2026.

| Part | Already built | What is new |
| --- | --- | --- |
| Being out with no mission | Every way into the Scablands is a job (`src/arena/modes/world-job.js`, `src/world/jobs/job-engine.js`). An empty job ends at once | A step kind `roam` that never completes, and a way out of it |
| People who move | `src/world/jobs/story-people.js` walks a figure along a path once and then stands it. `attendTo` turns a figure to the player. `src/world/story-people-view.js` draws figures, gaze and gestures. `stepMover` (`src/world/scablands-movers.js`) keeps a walker on ground it can climb and out of solids | A routine rule: loops, wandering, tasks, and a different routine for each part of the day |
| Talking | `src/story/talk.js`, `src/story/talk-view.js`, the `talk` step. A talk starts only after a `reach` step today | A talk that starts by walking up to a person |
| Buildings | Tin Town's shacks are drawn with a door frame and are solid boxes (`src/world/tin-town-shacks.js`, `src/world/scablands-solids.js`). None can be entered | A door, a room inside the same building, and a roof that is not drawn while the player is inside |
| Repair | The wrench mends a car on foot (`stepWrench` in `src/onfoot-weapons.js`; 40 armour in 4 seconds). Cues `repair.start`, `repair.complete` | A mechanic who mends all of it for scrap. The wrench in the field mends up to six tenths |
| Washing | Fixed dust and grime finishes (`src/paint-finish-look.js`). Each ground has its own dust colour (`scablandsDriveAt`) | Dirt that builds up with driving, and a wash |
| Scrap | The player's scrap is `profile.wasteland.scrap` (`src/wasteland-progress.js`). The town's till is `src/town/town-money.js` | Prices for services; a ransom |
| Skirmishes | The `rider-fight` step places up to six rider cars at any point (`src/arena/modes/road-riders.js`, `src/world/jobs/rider-rule.js`), and they ram, shoot, box the player in and can be wrecked | Checkpoints, the draw at each one, cars that only pass, and the hold that a mission takes |
| Finding places | `rememberWorldFound` (`src/world/world-save.js`) keeps a list that never shrinks, and nothing calls it yet. `sees` (`src/world/scablands-ways.js`) answers whether one point can see another over the hills. The maps draw places from one table (`landMarks` in `src/world/scablands-picture.js`) | Sites with several possible positions, the rule for when one is found, and found sites on both maps |
| A sign on the horizon | `src/world/smoke-column.js` draws a column seen from kilometres away in one draw | Smoke as a thread's sign |
| Goodwill | The ledger's `word` effect and its five words. The town keeps a standing for each neighbour (`src/town/town-outposts.js`) | Favours owed, and one bridge between a word and a standing |
| A party sent out | `src/town/town-dispatch.js` sends crews on jobs and has a `rescue` kind and a chance worked out from skill, vehicle and standing | Choosing who goes, from the ledger |
| Wells, pipes, towers, outposts | The town's sim (`src/town/`), the drill rig and boring machine (`src/machines/`), the neighbours' outposts standing in the Scablands (`src/town/content/outposts-world.js`), the card TOWN-DEFEND | Finding a well site out in the land, and a site that grows (section 20) |
| Placing things by name | `land.at` and `land.between` (`src/world/scablands-names.js`): no bare positions | Every new table uses them |

## 12. The foundation as data

New content lives in two folders. `src/world/open/` holds the land's tables and the rules that read them.
`src/story/threads/` holds the thread rule and one file for each thread. Every rule is a plain function that returns
new data and reads no graphics, like the ledger's. Adding a person, a building, a checkpoint, a site or a thread is
adding a row or a file; no rule changes.

**One way of asking a question.** Every condition, anywhere, is written in the same small vocabulary, read by one
function, `isTrue(fact, world)`:

```js
{fact: 'word', of: 'glasshouse', atLeast: 'Friendly'}   // a people's word for the player
{fact: 'found', site: 'glasshouse'}                     // a site on the player's map
{fact: 'stage', site: 'glasshouse', is: 'camp'}         // what a site has become
{fact: 'mark', id: 'glasshouse/pump-mended'}            // something that was done
{fact: 'made', id: 'tower/west-fence'}                  // something that stands
{fact: 'feud', of: 'road-rats', atLeast: 'Raiding'}
{fact: 'stock', of: 'embers', atLeast: 2}
{fact: 'night', atLeast: 3}                             // nights banked since the ledger began
{fact: 'thread', id: 'burned-camp', at: 'home'}         // where another thread stands
{fact: 'town', has: 'well'}                             // the town's sim, read only (section 20)
{fact: 'draw', name: 'burned-camp/start', chance: .5}   // a named draw from the seed
{all: [...]}   {any: [...]}   {not: {...}}
```

**One way of changing something.** The ledger's effects stay as they are (`stock`, `word`, `feud`, `roadWord`, `mark`,
`made`, `debt`, `promise`, `settle`, `met`, `tell`, `read`). The open land adds six, journalled the same way with the
choice that caused them, so that somebody can always say later where a thing began:

```js
{type: 'find', site: 'glasshouse'}                  // the site joins the map for good
{type: 'site', id: 'glasshouse', stage: 'burned'}   // a site changes: camp, outpost, town, burned, rebuilt, empty
{type: 'favour', person: 'glasshouse', by: 1}       // a favour owed to the player, or spent by the player
{type: 'scrap', by: -6}                             // the player's scrap
{type: 'thread', id: 'burned-camp', to: 'clues'}    // a thread moves to a beat
{type: 'town', post: 'ransom', scrap: 150}          // a posting to the town's till, or a report (section 20)
```

The ledger keeps one feud today, the Ash Men's. It becomes one feud for each group. The Ash Men's is still read by its
old name, so a ledger saved today loads unchanged.

**The tables.** A short example of each. Numbers are starting values for the builder and for Claude's drive.

*People and routines* (`src/world/open/content/people.js`). A person has a figure, a home place and a routine for each
part of the day. A routine is one of three kinds.

```js
{id: 'odessa', figure: 'odessa', home: 'tin-town',
  routine: {
    day:  {kind: 'track', loop: true, stops: [
             {at: ['forge-shed', 'bench'], task: 'weld', seconds: 40},
             {at: ['forge-shed', 'bay'],   task: 'inspect', seconds: 25},
             {at: ['tin-town', 14, -6],    task: 'carry', seconds: 0}]},
    dusk: {kind: 'wander', around: ['tin-town', 'hearth'], radius: 9, pause: [4, 12]},
    dark: {kind: 'post', at: ['forge-shed', 'cot'], task: 'sleep'}},
  talk: 'odessa'}
```

*Buildings and services* (`src/world/open/content/buildings.js`).

```js
{id: 'forge-shed', place: 'tin-town', shell: 'shack-long', at: [22, -18], heading: 1.57,
  door: {side: 'south', width: 2.4},
  room: {spots: {bench: [-3, 1], bay: [2, 0], cot: [-4, -2]}, things: ['anvil', 'gas-bottles', 'parts-rack']},
  carBay: {at: [2, 5], radius: 4},
  services: [{id: 'repair', by: 'odessa', needs: {fact: 'word', of: 'tin-town', atLeast: 'Wary'},
              price: {scrapPerTenArmour: 2, least: 4}}],
  finds: [{id: 'forge-shed/old-map', needs: {fact: 'night', atLeast: 2}, gives: [{type: 'mark', id: 'rumour/radio-hill'}]}]}
```

*Checkpoints* (`src/world/open/content/checkpoints.js`).

```js
{id: 'mall-road-2', at: {road: 'mall-road', share: .7}, radius: 180,
  chance: .45, cars: [1, 4],
  who: [{group: 'road-rats', weight: 3}, {group: 'traders', weight: 2}, {group: 'ash-men', weight: 1,
         needs: {fact: 'feud', of: 'ash-men', atLeast: 'Raiding'}}]}
```

*Sites* (`src/world/open/content/sites.js`).

```js
{id: 'glasshouse', name: 'The Glasshouse', kind: 'camp', people: 'glasshouse',
  where: [{at: ['ships-in-sand', 2000, 700]}, {at: ['dead-mall', -1500, -2150]}, {at: ['tin-town', -200, 1900]}],
  foundWithin: 160, tell: 'thin-smoke-at-dusk',
  residents: ['marigold', 'finch', 'grower-1', 'grower-2', 'grower-3'],
  needs: ['glasshouse/pump', 'glasshouse/cart-axle', 'glasshouse/seed'], hostileTo: []}
```

*Needs* (`src/world/open/content/needs.js`). A need is either mended on the spot or promised for later.

```js
{id: 'glasshouse/pump', kind: 'mend', what: 'The wind pump has seized.', wrenchSeconds: 12, scrap: 8,
  gives: [{type: 'favour', person: 'glasshouse', by: 1}, {type: 'mark', id: 'glasshouse/pump-mended'}]}
{id: 'glasshouse/seed', kind: 'supply', what: 'They need a sack of seed beans from Dot.', dueNights: 3,
  gives: [{type: 'word', person: 'glasshouse', set: 'Sworn'}]}
```

*Threads* (`src/story/threads/content/`). Section 18 gives the shape, and section 21 writes one in full.

## 13. People who live, buildings to enter, services

Answers Kyle's sections 1, 2 and 3.

**The routine rule** (`src/world/open/routine-rule.js`). Where a person is, which way the person faces and what the
person is doing are worked out from the routine, the clock of the outing in seconds and the seed. Nothing about a
person's place is saved, and two looks at the same moment always agree.

- **A track** is a list of stops. The person walks from stop to stop at the figure's own pace, does the task at each
  for its seconds, and starts again, or turns back at the end when `loop` is false. A guard's round is a track.
- **A wander** picks its next point inside a circle by a named draw, walks there, stands for a drawn pause and picks
  again. Children and people at the hearth wander.
- **A post** is one place and one task: cooking, welding, hauling a sack between two points, sitting, sleeping.
- Each step of a walk goes through `stepMover`, so a person walks round a shack and never through it, and steps aside
  for a car.
- **The part of the day** (day, dusk, dark) comes from where the story stands, because a night passes only when the
  player banks a hearth (`five-cold-nights.md` section 7). People change routine when the part of the day changes.

**Speaking to a person.** Walk up to within two and a half metres and press the on-foot use key (F today). The person
stops, turns and faces the driver, as `attendTo` already does, and goes back to the routine afterwards. What the person
says is the first row of the person's talk table whose conditions are true: a thread's beat first, then a service, then
a line that reads the ledger ("You're the one who gave the Walkers an ember."), then a greeting by the people's word.

**When a scene needs a person.** A scene casts the person. A cast person leaves the routine and stands where the scene
places the person; when the scene ends the routine takes the person back by a walk, never by a jump. A person the story
needs who has not been cast yet is found wherever the routine has put the person, and the map's arrow leads there.

**Going inside.** A building in the table has a door and a room. The room is inside the building's own walls on the
same land: there is no second scene and no wait. Its solid box is replaced by four walls with a gap at the door. While
the player stands inside, the roof and the wall nearest the camera are not drawn and the camera comes in close, so the
room reads like an open doll's house from above and behind. People walk in and out by the same door. A car cannot go
in; a building with a `carBay` has a marked patch outside its door for the car.

**Things to find inside.** A room can hold `finds`: a map on a wall, a note, a part. Each has a condition and effects
like anything else, so a find can begin a thread (section 18).

**Services.** A service belongs to a person and a building, has a condition and a price, and does one thing.

| Service | Who, and where | What it does | Price to start from |
| --- | --- | --- | --- |
| Repair | Odessa, the forge shed, with the car in the bay | Mends all the car's armour. The wrench in the field mends up to six tenths | 2 scrap for every ten armour, 4 at least |
| Wash | Moss, at Big Bess's shed, with a brush and a bucket of grey water | Takes the dirt off | 6 scrap |
| Plate | Odessa, once she has plated Bess (Day 4) | Armour above the car's own, until it is knocked off | Scrap, and forge time |
| A meal and the news | Dot, at the diner; Auntie Solder, at the hearth | A rumour: a circle on the map where a site is said to be | A pie's price, or nothing between friends |
| Trade | A trader who has been helped on the road | Parts, seed, salt, wood | Scrap, by the thing |

- The people are those the story already has. Odessa and Moss need figures made (section 22).
- **A price follows the word.** Friendly takes a quarter off and Sworn takes half off. Wary adds a quarter. A people
  who are Cold will not serve: "I'm busy today, and I expect I'll be busy tomorrow as well."
- **Dirt.** The car gathers dust in the colour of the ground it drives on, faster off the road, and ash where ash
  lands on it. It is drawn with the dust and grime finishes the game has. People notice: Wim says the car is dirty on
  Night 2, and says so again when it is clean. One hidden rule gives the dirt a use. A car grey with ash is taken for
  one of the Ash Men's own from a distance, so their cars at a checkpoint come to fight less often, and strangers at a
  hidden camp are slower to trust the driver. Nobody says so. A player who washes off the ash before a long drive
  through Ash ground finds it out.
- **The car's armour carries over** from one skirmish to the next while the player is out in the open. Banking the
  hearth does not mend it. That is why a mechanic is worth finding.

## 14. Freedom within each night

Answers Kyle's section 2.

- **The step `roam`.** A world job of one step that never completes. It has no goal and no line on the screen. It ends
  when the player goes to a marker and begins what is there, or returns to the hearth and banks it.
- **A night's story stands as a marker.** "Auntie Solder is at the hearth" is a marker on both maps, with its arrow on
  the screen. Nothing counts down. A player who drives off to look at the Ridge finds the gate bell still unanswered
  on coming back, and Auntie Solder has a line about it.
- **Leaving a talk.** Walking away from a person in the middle of a talk ends the talk with no choice made. The person
  says one waiting line, and the choice is there on the player's return. Questions already asked stay asked.
- **A mission in progress cannot be left without losing it,** because a mission is a run, a fight or a chase with
  somebody depending on it. Before a mission begins the player is always asked plainly, by the person who needs it.
- **One large outing a day, in an act with a clock.** Exploring, talking, services and mending a camp's pump cost no
  outing. A thread's mission (a scouting trip, a rescue, a supply run) is an outing, so in Five Cold Nights a player
  who rides out to rescue a camp does not fetch gas that day, and the price is felt that night. Outside an act with a
  clock there is no limit.
- **Losing out in the open.** A wrecked car is towed home by the nearest people who are Friendly, and it spends a
  favour. With no friend near, the player walks to the nearest road, a trader gives a lift for scrap, and the car is
  at the yard at dawn. Nothing is taken that cannot be earned back.

## 15. Skirmishes on the open road, and how a mission switches them off

Answers Kyle's section 4.

**Checkpoints.** About two dozen circles, 180 metres across, on the roads and at the crossings, and a few off the road
where a careful driver would go to avoid them. They are never drawn and never named to the player.

**What happens at one** (`src/world/open/checkpoint-rule.js`). When the car enters a checkpoint that is armed, the
rule makes named draws in this order. The name carries the checkpoint and how many times the player has crossed it.

1. **Does anybody come?** The checkpoint's chance, raised by a feud at Raiding or worse and by the Word on the road,
   lowered near a tower that is kept and near a people who are Friendly.
2. **Who?** One of the checkpoint's groups, by weight: the Road Rats, the Ash Men, traders, travellers on foot.
3. **How many?** One to four cars, weighted toward one and two, and toward more as a feud rises.
4. **What do they mean to do?** One of three, weighted by the group and the feud.
   - **They come to fight.** They turn toward the player with the opening tell that the riders have today.
   - **They only drive by.** They pass on the road at their own pace. Within sixty metres the player can tell who
     they are by their paint and their flag. The player chooses: let them go, hail them, or ram or shoot, which makes
     it a fight. Attacking traders or travellers who meant no harm is a mark, and the Word on the road carries it.
   - **They are in trouble.** One car is stopped with its bonnet up and somebody waving. It may be real, and mended
     with the wrench for scrap and a favour. It may be bait, with two more cars behind the next rise. A careful
     player looks for the tell first: tyre tracks that lead off the road to nowhere.

**Limits, so that a drive is not a string of fights.** One encounter is alive at a time. A checkpoint that has brought
somebody rests until the player has banked a hearth. No checkpoint is armed within 1.2 kilometres of Tin Town or of a
found camp whose people are Friendly. On Easy a fight with one or two cars is won about six times in ten by a pre-teen
(decisions, 20 November 2026), and any encounter can be outrun on a road.

**What a fight costs and pays.** Winning pays scrap from the wrecks and, against a group with a feud, raises that feud.
Losing wrecks the car (section 14) and costs a share of the scrap carried. Against five or more cars the surround of
`five-cold-nights.md` section 5 applies.

**The switch is a hold** (`src/world/open/holds.js`). Kyle: "The checkpoints must be able to be turned on and off so
that during an actual mission that we're following, we don't cause a checkpoint to trigger and have multiple
interactions."

- The open land keeps a list of holds. A hold has a holder and the systems it stops: `checkpoints`, `signs` (a
  thread's smoke or flare appearing), `services` and `routines`.
- **A system runs only while nobody holds it.** Two missions can each hold the checkpoints, and they stay off until
  both have let go, so one mission ending cannot switch them back on under another.
- **Every job holds the checkpoints and the signs unless it says otherwise.** Night 2, the gas run, the town's jobs
  and every thread's mission take the hold when they start and drop it when they end, fail or are left. Only `roam`
  holds nothing. So the rule Kyle asked for is the default, and a writer cannot forget it.
- A mission that wants chance on its road says so with `holds: []`. A supply run to a far camp is the example: the
  danger of the road is its point.
- **When a hold is taken while cars are out,** cars that only pass keep going, and cars that came to fight break off
  and are seen driving away. No car vanishes in view (NIGHT-2-TRY-FIXES, item 3).
- A hold is not saved. Leaving the game in the middle of a mission loses the mission's progress as it does today.

## 16. Places that are not on the map

Answers Kyle's section 5.

**Sites.** A site is anything a player has to find: a camp, a well site, a ruin with salvage, a lookout, an enemy's
den. The eight places of `SCABLANDS_PLACES` are always on the map. A site is on the map only when found.

**Where a site stands is drawn from the seed.** Each site lists two or three places it could stand, each checked by
Claude for flat ground and a way in. The save's seed picks one. So a camp that Gratian found north of the Ridge is not
where Kyle will find it, and finding it is the player's own doing.

**Each site has a tell,** something true that a careful player can read from a distance: thin smoke at dusk, a lamp
at night, cart tracks leaving a road, vultures, a green patch on grey ground, a mast on a hill.

**When a site is found.** The player's car, or the player on foot, is within the site's `foundWithin` and can see it
(`sees`, which knows the hills). Then, once:

1. `rememberWorldFound` adds the site's id to the save's list, which never shrinks.
2. The ledger takes a `find` effect, and a `met` line for its people: "You found the Glasshouse on the third night."
3. Both maps draw it from then on, with its name. `landMarks` takes the found sites as extra places, so a site is
   drawn exactly as a place is. One line shows at the top of the screen, with the cue `open.site.found`: "The
   Glasshouse is on your map."

**A rumour is half a find.** A person, a note in a building or a trader can tell of a site. The map then shows a
circle 600 metres across with "said to be near here". Going there and seeing it turns the circle into the place.
Friends give rumours, so friends open the land, as in `five-cold-nights.md` section 1.

**A site changes and stays.** A site has a stage: `camp`, `outpost`, `town`, `burned`, `rebuilt`, `empty`. A burned
camp stays on the map as "The Glasshouse (burned)". Nothing found is ever taken off the map.

**Driven ground.** The big map draws ground the player has driven over in full, and ground never driven paler, with
its hills still showing. The land is kept as squares 500 metres across, 560 of them, one bit each in the save. This is
a question for Kyle (the questions file), because he approved the map as it is.

**A camp that needs help.** On each visit after a banked night a camp may have one need, drawn from its list.

- **A thing to mend** is mended on the spot: walk to it, hold the wrench on it for its seconds while its picture shows
  what is being done, and pay its scrap for the part. It gives a favour and a mark.
- **A thing to fetch** is too far to help with at once, as Kyle said. The camp asks, and the player may promise. A
  promise goes on the page with its night ("You promised the Glasshouse a sack of seed beans by the sixth night"), and
  keeping it is a supply run. Breaking it costs a word, said to the player's face.

**The first sites.** Nine, so that the land has something in every quarter. More are rows in the table.

| Site | Kind | Its people | Its tell | What it offers |
| --- | --- | --- | --- | --- |
| **The Glasshouse** | Camp | Marigold's growers, nine people who raise beans under old windscreens in the shade of a scarp | Thin smoke at dusk; a glint of glass | Food for a town that grows. Seed. The burned camp (section 21) |
| **Radio Hill** | Camp | Two sisters, Hetty and Bern, who keep a mast and a set that still works | The mast; a voice on the car's radio when near | Rumours. A warning of riders on the roads they can hear |
| **The Bus Ring** | Camp | Tinkers in a ring of bus shells in the hill country | A lamp at night; cart tracks | Parts. A second mechanic, far from home |
| **The Sweet Seep** | Well site | Nobody | A green patch on grey ground; birds | Water near the surface (section 20) |
| **The Deep Sign** | Well site | Nobody | An old pump-house roof in a hollow, half buried | Water a long way down, and a lot of it |
| **The Hangar** | Ruin | Nobody, and then somebody | A curved roof on the skyline of the Boneyard's far side | Salvage by the truckload. A place another people may move into |
| **The Crow's Step** | Lookout | Nobody | A flat-topped rise with a cairn | A view of two roads. A place for a tower |
| **The Rats' Nest** | Den | The Road Rats | Tyre smoke; many tracks into a cutting in the wreck fields | An enemy's home. Scouted in section 21 |
| **The Grey Camp** | Den | The Ash Men | A dull red glow at night on the burn | Old Smoke's people at home. Scouted in section 21 |

## 17. How goodwill is kept

Answers Kyle's section 5, last point.

**Goodwill is the people's word in the one ledger.** A camp's people are a people like the Walkers, with the same five
words: Cold, Wary, Strangers, Friendly, Sworn. There is no second number. The page **What people remember** shows the
word and the sentences of what was done, and the people show it in how they stand: a Friendly camp's people walk out
to meet the car, and a Wary camp's people watch from behind the fence.

| What the player does | What moves |
| --- | --- |
| Mends the first thing for a camp | Strangers becomes Friendly. A mark names the thing |
| Mends more things | A favour is owed each time, two at most at once. The word does not move |
| Keeps a promise to fetch something | Friendly becomes Sworn |
| Stands with them in trouble (a thread's outcome) | Up one word, or Sworn |
| Breaks a promise | Down one word |
| Attacks their people on the road | Down two words, and the Word on the road carries it |
| Leaves them in trouble after being asked | Down one word, and a mark that somebody will speak of later |
| Stays away for a long time | Nothing. Goodwill never fades by itself, and nothing moves while the game is closed |

**A favour is something to spend.** A tow home. A car that rides out when a fight is within a kilometre and a half of
their camp. A watch kept on a tower. A place in a rescue party. A favour is written on the page as a sentence: "The
Glasshouse owes you a favour."

**What a word gives.** Friendly: services at a better price, rumours, no checkpoints near their camp. Sworn: they come
when called, and they speak for the player to other peoples, which starts a stranger camp at Wary or Friendly according
to what was said.

**Friends are not always friends with each other.** A people may have a `hostileTo` list. Helping the Bus Ring's
tinkers, who trade with the Road Rats, makes the Glasshouse Wary until the player has explained it to Marigold. This is
written as data, used rarely, and always said aloud by somebody. It is what makes "acquire friends" a matter of choice.

**The town's neighbours.** Dot, Miss Quill, Old Tam, Captain Imre and Pim each have a standing from -100 to 100 in the
town's sim. One bridge keeps the two in step (section 20): a word that moves posts a change of 25 to the standing, and
a standing that crosses a quarter moves the word. Each change is journalled with its cause, so it is never applied
twice.

## 18. Threads: storylines written as data

Answers Kyle's sections 6, 7, 8 and 9. This is the part that lets the game hold many storylines, written by anybody,
over years.

**What a thread is.** One file in `src/story/threads/content/`, checked when the game is built
(`validateThread`, as `validateTalkScene` checks a talk today). It has seven parts.

```js
{id: 'burned-camp', title: 'Smoke over a friend',
  reads: ['word', 'found', 'feud', 'favour', 'made', 'stock'],        // for the crossings table (section 19)
  writes: ['word', 'site', 'feud', 'mark', 'favour', 'stock', 'scrap'],
  cast: {                                                             // roles, filled when the thread starts
    camp:  {from: 'sites', where: {all: [{fact: 'stage', is: 'camp'}, {fact: 'word', atLeast: 'Friendly'}]}},
    enemy: {from: 'groups', where: {fact: 'feud', atLeast: 'Watching'}, weightBy: 'feud'},
    blamed: {from: 'groups', draw: 'false-trail', chance: .3, otherwise: 'enemy'}},
  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: 'burned-camp', at: 'any'}},
                 {fact: 'draw', name: 'start', chance: .5}]},
  sign: {kind: 'smoke', at: 'camp', seenWithin: 3500, lastsNights: 2},
  beats: {
    sign:  {when: 'sign-seen', thoughts: [...], next: 'clues'},
    clues: {when: {reach: 'camp'}, explore: [...], choices: [...]},
    scout: {mission: 'burned-camp/scout', holds: ['checkpoints', 'signs'], outcomes: {...}},
    ...},
  ends: ['freed', 'bought-back', 'left', 'taken']}
```

1. **Reads and writes.** The same two lists that `five-cold-nights.md` section 7 asks of every story. A tool prints
   every thread's lists side by side, and that is how two writers see that their threads touch the same people.
2. **A cast of roles.** A thread never names the camp it happens to. It asks for "a camp whose people are Friendly",
   and the game fills the role from the player's own ledger by a named draw. The burned camp is the Glasshouse for one
   player and Radio Hill for another, and the enemy is whichever group that player has a feud with. Lines are written
   once with the role's names put in: "{camp.leader} would never have left {camp.thing} behind." Lines that only one
   people could say are written for that people and chosen by condition.
3. **Conditions for starting,** in the vocabulary of section 12. Most include a named draw, so that a thread begins
   on most nights for one player and later for another, as Kyle asked in section 7.
4. **A sign.** How the player comes to know. Every thread uses one of the same few kinds, so the player learns to
   read the land and a writer has no new machinery to ask for:

   | Kind of sign | What the player meets |
   | --- | --- |
   | Smoke, a flare, a glow, lights | Something seen far off, drawn where it truly is |
   | Tracks, wreckage, a thing out of place | Something come across on a drive |
   | A call | A voice on the car's radio, or the gate bell |
   | A person's words | A line in somebody's talk table: a rumour, a worry, a request |
   | A find | A map, a note or a part inside a building |
   | A stranger | Somebody walks or drives up to the player's town |
   | A notice | A card on Tin Town's board, or a report from the town |

5. **Beats.** Each beat has a condition for when it is live, and holds one of: a talk scene (`src/story/talk.js`, as
   it is), things to find on foot (the `explore` step), a mission (a job on the job engine, with its holds), or a
   choice made by going somewhere. A beat's choices carry effects. A beat may be reached days later: the thread's
   place is kept in the ledger, so a player can put a thread down and pick it up, as Kyle asked.
6. **Ends.** Named outcomes. Each leaves marks, a site's stage, words and favours behind for other threads to read.
7. **What it costs to ignore.** Every thread says what happens if the player never follows the sign: usually
   something smaller and sadder that somebody mentions later. Ignoring a sign is a choice like any other.

**Who decides which thread begins: the director** (`src/story/threads/director.js`). A plain rule, run when the player
banks a hearth and again when the player first enters a region that day.

- It lists the threads whose conditions are true and whose roles can be filled.
- It keeps at most two signs alive in the land at once, and at most one thread in a mission.
- It does not begin two threads of the same kind one after the other. A thread's kind is one of: trouble, a find, a
  need, a feud, a stranger, a thing to build, a rival.
- In an act with a clock it begins nothing on the act's last night, and no thread whose mission would cost the
  player's last ember.
- It picks among what is left by weight and a named draw. A thread's weight rises with each night it has been
  possible and has not begun, so nothing waits for ever.

**Where a thread's state lives.** In the ledger, as one small record for each thread begun: its beat, its cast, the
night it began and its own marks. It is saved with the ledger and replayed with it (`src/story/ledger-replay.js`).

**The main story is a thread too.** Five Cold Nights keeps its own files and its written nights. Its scenes use the
same conditions, effects, casting and holds, so a side thread can read "the Walkers were refused" and the fifth night
can read "the Glasshouse was left to the Road Rats". No side thread is ever needed to finish it (Kyle's section 7).

**How threads cross.** Four ways, all through the land and the ledger.

- **A fact one wrote and another reads.** A tower built in "The watch line" is a tower that shortens the odds at
  every checkpoint it can see, and gives a rescue party warning of riders.
- **A person in two casts.** The trader helped on the road in "The stranded hauler" is the trader who, in "The burned
  camp", says where the captives' cart was seen.
- **A site that changes.** A well drilled at the Sweet Seep makes "A place to stand" possible there. A camp left to
  burn makes it impossible.
- **A favour spent.** A favour has one use. The Walkers' watch that guards the fence cannot also ride to the rescue.

**The rule that keeps it from tangling** is the one in `five-cold-nights.md` section 7: every thread can be played
alone. For each fact a thread reads, its file says what happens when nobody ever wrote that fact.

## 19. The first shelf of threads

Twelve, written by Claude beyond the one Kyle dictated, to show the range. Each is one file. The burned camp is in
full in section 21, and each of the others is written in full the same way before its card is cut. More are added at
any time, by anybody, without changing a rule.

| Thread | Kind | The sign | The choice at its heart | What it leaves in the land |
| --- | --- | --- | --- | --- |
| **Smoke over a friend** (the burned camp) | Trouble | Smoke on the horizon | Scout and fight alone, take what you know home and raise a party, buy them back, or leave them | A camp freed, bought, moved or lost. A feud |
| **The stranded hauler** | A stranger | A car with its bonnet up at a checkpoint | Stop for a stranger who may be bait | A trader who comes to the gate with goods and news, or an ambush survived |
| **Water under the grey** | A find | A green patch; an old pump-house roof | Whose water is it: Tin Town's alone, a camp's, or everybody's? | A well. The start of an outpost (section 20) |
| **A place to stand** | A thing to build | A Friendly camp at a well asks for a fence | Do they keep their own name and ways, or fly Tin Town's flag? | An outpost, and in time a town |
| **The watch line** | A thing to build | Auntie Solder's worry; a rider seen too late | Which three high places get towers, and who keeps each | Towers that warn, and friends tied to places |
| **A toll on the Mall Road** | A feud | A gate of wrecks across a road | Pay it, break it, go round it, or get every camp on the road to refuse it together | A road that is free, taxed or closed |
| **The voice on Radio Hill** | A find | A voice on the car's radio at night, giving bearings | Trust a voice you cannot see, and drive where it says | Radio Hill found, or a trap sprung. Later, warnings of riders |
| **The runaway** | A stranger | A grey boy hiding in a shed in Tin Town | Hide somebody who has left the Ash Men, hand him back, or send him on | A stoker who knows the Grey Camp from inside. Clinker's anger |
| **Dace goes looking** | A need | Dace, if he owes you, asks for the old pickup and two days | Let a boy of fourteen drive out alone | A site found by somebody else, and a short log of how it went. Or a boy to fetch home |
| **The dry pump** | A need | A camp's need for a part that only the Dead Mall has | Spend the day's outing on somebody else's water | A camp Sworn. A way into the Dead Mall learnt |
| **Lights on the Whites** | A find | Lamps moving on the salt at night, far off | Follow lights that lead away from every road | The Deck Folk's lost shore party, and the way into Ships in the Sand |
| **Market day** | A thing to build | Three peoples are Friendly at once, and Dot says so | Who is asked, who sits beside whom, and who is left out | Every friend's service in one place for a day. A quarrel mended or begun |
| **Somebody else's flag** | A rival | A new drill tower on a well site the player found and did not claim | Share the water, buy them out, or drive them off | Mrs Vane's water men as neighbours or as a feud |

**What each one reads from the others.** The first six rows of the crossings, kept as a table beside the thread files
and printed by a tool, as `five-cold-nights.md` section 7 keeps its own.

| When this has happened | This changes |
| --- | --- |
| A tower stands on the Crow's Step (The watch line) | The smoke over a friend is seen a day sooner, and the keeper names the road the raiders took |
| The trader was helped (The stranded hauler) | At the burned camp, the trader's cart tracks are there, and the trader can be asked what was seen |
| The runaway was hidden (The runaway) | He draws the Grey Camp's back way in the dirt, and a rescue party's odds are better |
| A well was shared (Water under the grey) | The camp beside it is the one most likely to be raided, and the one with most friends to answer |
| The toll was broken (A toll on the Mall Road) | The Road Rats' feud is Raiding, so they are the likelier enemy in every thread that asks for one |
| Radio Hill is Friendly (The voice on Radio Hill) | Every sign that is a call reaches the player wherever the car is, and not only near home |

## 20. The town in the same land

Answers Kyle's section 9: "integrating the wasteland tycoon into the scablands story."

The town of `docs/WASTELAND_TOWN.md` and the machines of `docs/MACHINES.md` are built and stand behind their own
switches. They and the story already share the land: the neighbours' outposts stand in the Scablands, and a town job
is a world job. What is missing is that neither reads the other. This section joins them, and adds nothing to the
town's own rules.

**One idea does most of it: a site grows.** A site's stage runs `camp`, `outpost`, `town`. A camp is a few people
with routines. An outpost is a camp with water and a fence, and it is a row in the town's own table of neighbours,
with a standing, a trade and a road. A town is an outpost that the town's sim builds as it builds the player's first
town. The people, routines, buildings, services and needs are the same tables at every stage; a stage adds rows.

**Finding water.** Water is the thing every people lacks, as the Long Dry says, so a well is the largest find there is.

1. **Find the site.** A well site is a site (section 16) with a tell: green on grey, birds, an old roof in a hollow.
   Old Tam on the Ridge saw the sea go and can say where water used to stand, which is a rumour.
2. **Prove it.** A test pit, dug by hand or with the dozer, as Odessa asks for in the town's first chapter. The
   town's groundwater rule answers how deep the water is there.
3. **Drill it.** With the drill rig, by the player's own hands the first time (MACHINES section 2: do it, then teach
   it, then hand it over). A well site far from home needs the rig driven there, which is a slow run past whoever
   holds the road, with the checkpoints' danger left on.
4. **Decide whose it is.** This is the thread "Water under the grey". Tin Town's alone: pipe it home, guard the pipe
   for ever, and every camp that hears of it thinks less of the town. A camp's: they settle beside it, and it is the
   seed of an outpost. Everybody's: a free tap on a road, friends everywhere, and Mrs Vane's water men at Raiding,
   because free water is the end of their kiosks.

**Building defences.** The watchtower of `five-cold-nights.md` section 8 is the pattern: hauled and raised, never
bought with a button, and kept by a friend from the ledger.

- A tower at a lookout site sees the roads below it. Checkpoints it can see bring cars less often, and a raid on a
  site it can see is reported before the smoke rises.
- A fence round a camp is the town's Fence run. A fenced camp cannot be the camp in "Smoke over a friend" unless its
  fence was first broken in another thread.
- The town's radar, once built, does at a distance what a tower does by eye (TOWN-DEFEND).
- What stands in the open is a target (MACHINES section 7). A wellhead, a pipe and a tower can each be the thing in
  trouble in a thread of the kind "trouble", cast by the same rule that casts a camp.

**Acquiring friends.** Section 17 is the whole of it. A people's word is earned by mending, by promises kept and by
standing with them. A Sworn people at an outpost trade, send a car when called, keep a tower and speak for the player
to strangers. An enemy can become a neighbour: Old Smoke can be made peace with (Kyle's ruling of 18 November 2026),
and so, by the same form, can the Road Rats' leader, Sump, whose price is a road of their own.

**How the two sides read each other.** One file, `src/world/open/town-bridge.js`, and it is the only place where the
story and the town's sim touch.

| The story reads from the town | The town reads from the story |
| --- | --- |
| Whether a well, a tower, a fence or a radar stands, and where (`{fact: 'town', has: ...}`) | Each neighbour's word, as a standing |
| What is in the till, for a ransom or a price | Sites found, as places a route or a pipe can run to |
| Who has been taught which machine | Things made in a thread (a tower, a tunnel), as things standing |
| Whether a crew is free to be sent | A camp that became an outpost, as a new neighbour with its trade |

- The bridge only ever posts through doors the town already has: a report, a posting to the till, a change of
  standing, a new neighbour. It never reaches into the town's state.
- **With the town's switch off, the bridge answers "nothing stands",** and every thread says what it does then. The
  story can be played before the town is released, and the town before the story.
- A town saved today loads unchanged. The bridge adds no field to the town's save.

**The order.** The open land is built first (section 22) because it is small and playable by itself. The bridge and
the threads "Water under the grey", "A place to stand" and "The watch line" come after Kyle has tried the first slices
and answered the questions, because they join two large things and should be right on paper first.

## 21. One thread in full: Smoke over a friend

Kyle's burned camp (section 6), written the way `five-cold-nights.md` writes a chapter, under the rules of its section
2: talk bubbles, thought bubbles, and nothing shown that a person standing there would not know. Every line is a whole
plain sentence (Kyle, 19 November 2026).

| This thread reads | This thread writes |
| --- | --- |
| A camp that is found and Friendly or better | The camp's stage: burned, then rebuilt, moved or empty |
| Each group's feud, to choose the enemy | That group's feud |
| Who owes the player, for the party | Favours and debts spent |
| Towers standing, Radio Hill, the trader, the runaway (section 19) | Marks that later scenes read |
| Embers and scrap, for a ransom | Embers and scrap |

**It can begin** on any night from the second, once a found camp's people are Friendly or better and the player has
banked a hearth since last visiting them. The director draws for it each night at an even chance. It does not begin on
the last night of an act, or while another thread of the kind "trouble" is open.

**Its cast.** *The camp* is drawn from the camps that qualify. *The enemy* is drawn from the groups with a feud,
weighted by the feud. Three times in ten there is also a *false trail*: the enemy has dressed the camp to look like
another group's work. The chapter below is written for the Glasshouse and the Road Rats with no false trail. What
changes for the Ash Men, and for a false trail, follows it.

**People in it.** Auntie Solder, Cinder and Moss, as they are. Whoever the ledger holds: Rell and Dace here. New:
**Marigold**, who leads the Glasshouse's nine growers, and is kinder to her bean plants than to people. **Finch**, her
grandson, twelve, who drives the water cart and thinks ahead. **Sump**, who leads the Road Rats, is cheerful and greedy,
and treats everything as a deal.

**Where things stand, in this example.** It is the third day of Five Cold Nights. The player found the Glasshouse on
the second day and mended its wind pump, so the growers are Friendly and owe one favour. The Walkers are Friendly and
owe two nights' watch. The Road Rats are Watching. There are three embers in the store and 140 scrap in the car.

### Scene 1. The sign

The player is out in the open, on any road within three and a half kilometres of the camp. A column of smoke stands
where the Glasshouse is, dark at the foot and leaning with the wind (`src/world/smoke-column.js`). Nothing is marked on
the map and no line appears on the screen. The first time the smoke is in view for three seconds, two thought bubbles
come.

> *That smoke is over by the Glasshouse, and it's far too thick and dark for a cooking fire.*
>
> *Marigold burns bean stalks in her stove, and they hardly make any smoke at all.*

If a tower stands on the Crow's Step, its keeper speaks first, on the radio, before the player has seen anything.

> **The keeper:** *(on the radio)* I can see smoke to the north-east, where your bean people live. Six buggies went up
> that way before dawn, and I counted only five coming back with a cart behind them.

The player may drive there now, later, or never. The smoke stands for the rest of that day and all of the next. After
that the camp is cold, and what is left to read there is less (Scene 2).

### Scene 2. The camp

The player stops the car at the edge of the camp and gets out. The camp is burned and empty. The store tent is ash on
its poles. Nobody answers. There are six things to find, each by walking up to it. The cue `open.clue.found` marks
each, and each gives one thought.

| What is there | The thought | What it tells |
| --- | --- | --- |
| The glass frames are smashed, and tyre marks run straight down the bean rows | *Somebody drove right through the beans. Nobody who was hungry would have done that.* | They did not come for food |
| A car lamp lies broken in the ash of the store tent | *This is a lamp off a car, and somebody threw it. That's exactly how Dot's diner was set on fire.* | The Road Rats burn things by throwing lamps |
| Many narrow tyre tracks leave the camp to the south-east | *These tracks are narrow, and there are a lot of them. Those were buggies. A truck would leave tracks twice as wide.* | Light, fast cars. Not the Ash Men's trucks |
| Two deep ruts run beside the tracks, with small footprints between them | *Those ruts are from the water cart, and people were walking beside it. They were taken away alive.* | The growers are captives, and so is the cart |
| A green bean pod lies on the track, and another twenty steps on, and another | *Somebody dropped these one at a time, and they're still fresh. Somebody wanted to be followed.* | The way they went. Finch thinks ahead |
| The wind pump is still turning | *That's the pump I mended. It's still turning, and there's nobody left here to drink from it.* | Nothing. It is there to be felt |

**You may call home before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Cinder, would the Ash Men burn a camp?" | **Cinder:** *(on the radio)* The Ash Men put fires out, and they're proud of it. Burning a whole camp to the ground isn't like them at all. I'd look for somebody who enjoys a blaze. | Probably not the Ash Men |
| "Auntie, who takes people?" | **Auntie Solder:** *(on the radio)* The Road Rats do. They put people to work sorting scrap, and they sell them back to anyone who'll pay. They've a place somewhere in the wreck fields, and I've never wanted to know exactly where. | Who, why, and roughly where |
| "Moss, what leaves narrow tracks?" | **Moss:** *(on the radio)* Buggies leave narrow tracks. Bess doesn't, and neither do the Ash Men's trucks. If you're following buggies, don't expect to catch them on soft ground. | The tracks, confirmed |
| "Rell, have your people seen anything?" *(only if the Walkers are Friendly)* | **Rell:** *(on the radio)* Six buggies crossed below our camp before first light, heading for the wreck fields, and they were pulling a cart. I thought it was odd, because Rats never carry water. | The number, and the cart |

**If the player comes after the smoke has gone,** the wind has taken the tracks, the ruts and the bean pods. The
broken lamp, the smashed frames and the pump are left. The player can still be nearly sure who did it, and cannot tell
from the camp which way they went.

**The decision** is made by going somewhere. Two thought bubbles come when the last thing has been found, or when the
player walks back to the car.

> *The tracks are still fresh, so I could follow them now, before the wind covers them.*
>
> *There were six buggies here. If I find them, I'll be finding all six of them at once.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Follow the tracks south-east | The bean pods lead that way | *I only need to look. Nobody said I have to fight.* | A scouting mission begins (Scene 3). It is the day's outing |
| 2 | Drive home and tell Auntie Solder | The road home is on the map | *Tin Town ought to hear about this before I do anything.* | The talk at the hearth (Scene 5), with what was found here and nothing more |
| 3 | Drive on | Nothing | *It isn't my camp, and I have a town of my own to keep warm.* | Mark: "You saw the Glasshouse burned and drove on." |

**The ledger when the player leaves.** The Glasshouse: burned, and on the map as "The Glasshouse (burned)". Mark: "The
Glasshouse was burned and its people taken." One further mark for each thing found.

### Scene 3. The scouting

A mission. It holds the checkpoints and the signs (section 15), so nothing else happens on this road.

**The drive, about four minutes.** The bean pods last as far as the Girder Bridge road, and the tracks go on from there
into the wreck fields. Two lookout buggies watch the two roads into the fields from heaps of wrecks. Each can see as
far as the hills let it. The rule is the one Old Smoke's furnace uses: if the car stays in a lookout's view for eight
seconds, the lookout has seen it. The player crosses by the gullies, or waits behind a wreck for a lookout to turn.

- *Not seen:* the Road Rats do not know anybody is looking.
- *Seen:* the lookout fires a flare and two buggies come out to fight. Win or outrun them, and the scouting goes on,
  but the Rats' Nest will have twice the watch on it from tonight.

**The rim, on foot, about three minutes.** The player leaves the car in a hollow and walks up to the edge of a
cutting. Below is the Rats' Nest: a yard of wrecks, tyre fires and tin roofs. There are three places along the rim to
look from, and each shows one thing, with the cue `open.scout.seen`.

| From | What is seen | The thought |
| --- | --- | --- |
| The north end | A ring of wrecked cars with a chained gate, and nine people sitting inside it. One of them is small, and looks up | *There are nine of them in that pen, and that's all of the growers. The small one is Finch, and I think he saw me.* |
| The middle | The Glasshouse's water cart, with glass frames stacked on it | *That's Marigold's cart and Marigold's glass. So it was these people who burned the camp, and now I know it for certain.* |
| The south end | Six buggies in a row, about fourteen Rats, and a drain as tall as a man under the east wall of the cutting | *I can count six cars and about fourteen of them. There's also a drain under that wall, and nobody is watching it.* |

**The decision at the rim.**

> *I know where they are and how many of them there are. Back at Tin Town, nobody else knows any of it.*
>
> *There are six cars down there, and there's only one of me.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | Drive in now, alone | Six cars | *If I'm quick, they won't all get to their cars in time.* | A fight you are unlikely to win (Scene 4) |
| b | Go in by the drain, on foot *(only if the south end was looked from)* | A dark drain, and one guard with a lamp | *Finch is small enough to get through that drain, and so am I.* | A creep past the guard. A few may be freed. Being caught is being taken |
| c | Slip away home with what you have seen | The road home | None | The talk at the hearth (Scene 5), with the count and the drain known |

**The ledger at the rim.** Marks, one for each thing seen: "You found the Rats' Nest." "You counted six cars." "You
know the drain." The Rats' Nest is on the map for good. If the player was seen: "The Road Rats know somebody was
looking."

### Scene 4. The fight, and the pen

**Driving in alone, by car, about two minutes.** The player comes down the cutting's road with the lamps on. Two
buggies are away from the row at once and four follow within twenty seconds. They ram, they shoot, and with five of
them round the car they box it in, as the riders do today. On Easy a pre-teen wins this about twice in ten, and the
thought at the rim said as much.

- **If the player wins,** four buggies are wrecked and the rest run for the wreck fields. Sump shouts from a roof.

  > **Sump:** All right, all right, you can take them! They ate more than they sorted anyway. But you've cost me four
  > cars today, and I write down everything that I'm owed.

  The pen's gate is opened with the wrench. The growers walk out behind the water cart, and the player brings them
  home at a walking pace (Scene 6, the road home). The Road Rats go to Raiding. Mark: "You took the Glasshouse's
  people out of the Rats' Nest by yourself."
- **If the car is wrecked or boxed in for six seconds,** it is the surround. Sump walks up to the window.

  > **Sump:** Well, look at this. You drove all the way out here by yourself to bring me a car. That's the nicest
  > thing anybody has done for me all week.
  >
  > **Sump:** There's no need to look so worried. I never hurt people, because nobody pays good scrap for hurt
  > people. You're going to sit in my pen while I find out what Tin Town thinks you're worth.

**Going in by the drain, on foot, about three minutes.** One guard walks a round with a lamp, and the round is a
routine like anybody's (section 13). The player keeps out of the lamp's light, reaches the pen and holds the wrench on
the gate chain for eight seconds. Finch and two growers come out with the player through the drain. The others are
too slow for it, and Marigold will not leave them.

> **Marigold:** *(low)* Take the boy and go. I'm too old and too wide for a drain, and somebody has to stay and keep
> this lot cheerful.

If the lamp's light is on the player for two seconds, the guard shouts, and the player is taken.

**The pen.** The player is inside the ring of wrecks with the growers, on foot, with no car and no wrench. It is
dusk.

> **Marigold:** Oh, it's you. First you mended our pump, and now you've come to share our pen. Nobody could say you
> do things by halves.
>
> **Finch:** I dropped beans all the way here so that somebody could follow us. Did you see them? I ran out of beans
> at the bridge.
>
> **Marigold:** They want us to sort their scrap for them. I told Sump that all I know is how to grow beans, and he
> said scrap grows too, if you leave it lying about for long enough.

Sump calls Tin Town on the player's own radio, standing where the player can hear.

> **Sump:** *(on the radio, to Tin Town)* Good evening, Tin Town. I have your driver here, and I have your driver's
> car as well. I'd like a hundred and fifty scrap for the pair of them, or two of those embers that I keep hearing
> about. You can have until morning to think about it.
>
> **Auntie Solder:** *(on the radio)* You'll have your answer in the morning. If that child has so much as a scratch
> by then, you'll have me as well, and I'm a great deal worse than a scratch.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "How many of them keep watch at night?" | **Finch:** Only one of them stays awake, and he walks round with a lamp. He stops by the tyre fire every time, to warm his hands. I've counted, and he stands there for about as long as it takes to say the alphabet twice. | The guard's round, and its gap |
| "Where have they put my car?" | **Marigold:** It's at the end of the row with theirs, and they've taken the wheels off one side already. You won't be driving it out of here tonight. | The car cannot be taken back tonight |
| "What does Sump want with you?" | **Marigold:** He wants what he wants with everybody, which is to sell us. He's waiting to see whether anybody comes asking for us. Nobody has yet, because the only people who knew us are sitting in this pen. | They can be bought. Nobody else is coming |

**The decision in the pen.**

> *Auntie will pay to get me back. She'll pay with scrap if we have enough, and with embers if we don't.*
>
> *Finch says there's only one guard, and that he stops at the fire every time he comes round.*

| | You say or do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Wait for morning | The price was said aloud: 150 scrap or two embers | *It's a lot. I wonder what Auntie will have to go without to pay it.* | The ransom is paid. The growers stay in the pen |
| 2 | Break out tonight, with Finch | One guard, one lamp, one drain | *If we're caught, the price won't stay at a hundred and fifty.* | A creep on foot. Luck plays no part: it is the player's own feet. Caught, and the price rises to 220 scrap or three embers |
| 3 | "Sump, I'd like to make you an offer myself." | Sump likes a deal | *He treats everything as a deal. Maybe I have something he wants more than scrap.* | A promise in place of the price (below) |

**1. Waiting for morning.** The night passes in the pen. At Tin Town the hearth is banked without the player, and one
ember burns. At first light Moss drives Big Bess up to the cutting.

> **Moss:** I've brought it, and you can count it if you like. Auntie says she counted it three times, and that she
> didn't enjoy it any more the third time.
>
> **Sump:** It's a pleasure, Tin Town. Your driver was no trouble at all, and neither was the car, once we had the
> wheels off it.

The ransom is paid from the scrap the player was carrying first, then from the town's till, and in embers only if
both are short. Here the player had 140 scrap, so the till pays the last ten. The player's car is given back with its
wheels on and no armour mended. The growers stay.

> **Marigold:** Off you go, then. Don't you look back at us like that. You came all this way, and that's more than
> anybody else has done.

**The ledger.** Scrap: 0. Mark: "Tin Town paid the Road Rats to get you back." The Road Rats: Watching still.

**Tied back,** the next time the Road Rats are met at a checkpoint.

> **Sump's rider:** We know that car, don't we? That's the one from Tin Town, where they pay up. Sump says the price
> will be higher next time, because you've shown him that you can find the scrap.

**2. Breaking out.** About three minutes, on foot, in the dark. The guard's round is the routine Finch described. The
player and Finch go from wreck to wreck while the guard warms his hands, and reach the drain. Each grower whose
hiding place the player passes on the way can be waved along: three at most, the quickest of them.

- *Out:* the player, Finch and up to three growers come out of the drain into the wreck fields and walk to the Girder
  Bridge road. If a people owe the player a favour, their car is waiting there. Otherwise it is a long walk and the day is gone.
  The car stays with Sump. Mark: "You got Finch out of the Rats' Nest by the drain."

  > **Finch:** Gran said I had to go if I got the chance. She also said I was to tell you that she isn't cross with
  > you. She said it twice, so I think she's a bit cross.

- *Caught:* the guard's lamp finds them.

  > **Sump:** Now that was rude of you, and I'd been so pleasant about everything. The price has gone up to two
  > hundred and twenty, and I'm putting two men on the lamp tonight.

**3. Making Sump an offer.** A short talk. Sump names what he wants more than scrap: a road.

> **Sump:** Here's what I'd like. I'm putting a gate across the Mall Road next week. If Tin Town's trucks pay my toll
> at it five times without any fuss, then other people will see them paying, and they'll pay as well. Give me your
> word on that, and you and your car can go home tonight.

| | You say | What happens |
| --- | --- | --- |
| a | "You have my word. Tin Town will pay your toll five times." | The player drives home tonight with the car. A promise goes on the page: "You promised the Road Rats that Tin Town would pay their toll five times." It begins the thread "A toll on the Mall Road" with the gate already standing |
| b | "No. Tin Town doesn't pay tolls to anybody." | **Sump:** Then Tin Town can pay for you in the morning, the same as everybody else does. *(The choice goes back to waiting or breaking out.)* |

### Scene 5. Home, and the choice

At the hearth, at dusk, however the player came home: from the camp with only the clues, from the rim with the count
and the drain, ransomed, or out through the drain with Finch. This is Kyle's second road: take what is known home, and
decide there.

> **Auntie Solder:** Sit down and tell me all of it. You can start with how many of them there are.
>
> **Cinder:** There are nine people sorting scrap in a pen tonight, and they never did any of us any harm. I'm only
> saying it out loud so that somebody has said it.
>
> **Auntie Solder:** We also have three embers left, and a fence that needs watching every night. I'm saying that
> out loud as well.
>
> **Moss:** Bess could carry twelve people in the tank cradle, if they didn't mind the smell of gas. I'm not
> offering to go. I'm only telling you what Bess is able to do.

If Finch came home with the player, he is at the hearth with a bowl of soup, and says one thing.

> **Finch:** Gran will be telling the others that somebody is coming for them. She always says that. I'd like it to
> be true this time.

**You may ask who would come. Asking costs nothing.** Each person the ledger holds gives an answer in person. Somebody
who owes nothing and is no friend is not there to ask.

| Who, and on what condition | What is said | What that helper would do |
| --- | --- | --- |
| **Rell,** if the Walkers are Friendly | **Rell:** We owe you two nights' watch on your fence. I'll give you one night at their fence instead, with six of my people, and after that we're square. We can get through any drain that a goat can. | Open the pen by the drain. It spends the watch they owe |
| **Dace,** if he is at Tin Town | **Dace:** I can get through a drain faster than any of them, because I'm thinner. And I've run away from enough people to know how it's done. | Open the pen, alone and quickly. He may be caught |
| **Moss,** always | **Moss:** If you ask me to, I'll bring Bess. But if they put a hole in Bess, nobody fetches gas tomorrow, and you'll be the one who explains that to Auntie. | Carry all nine home at once. Bess is at risk |
| **The keeper of a tower,** if one stands | **The keeper:** I can't leave my tower, but I can watch their road for you. I'll tell you the moment the buggies turn round and come back. | A warning during the rescue |
| **The trader,** if the stranded hauler was helped | **The trader:** I sell tyres to Sump, so his gate opens for my truck. I could be delivering tyres at dusk tomorrow, very slowly, right in the middle of his gateway. | Block the gate, so only half the buggies get out |
| **Nobody,** if the ledger holds no friend | **Auntie Solder:** I've nobody to send with you. I'm not saying that to stop you. I'm saying it so that you know. | The player goes alone, or does not go |

**The decision.**

> *Every person I take to the Rats' Nest is a person who won't be on our fence tonight.*
>
> *I wonder what Marigold is saying to the others right now about whether anybody is coming.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "We're going to get them out. Who is coming with me?" | The player picks up to three of those who said yes. Each one's favour or debt is spent, and the page says so | *I'll owe every one of them something if this goes wrong.* | The rescue (Scene 6). The fence at home is thinner tonight |
| 2 | "We'll buy them back. Sump said himself that he sells people." | Auntie Solder says the price she expects: about 300 scrap, or three embers | *He'll take it. I wonder what he'll decide to sell us next.* | Sump's price goes up for everybody who is known to pay |
| 3 | "We can't do it. Not with three embers left and the fence as it is." | Nothing changes at Tin Town | *I wonder how long Marigold will go on telling them that somebody is coming.* | The growers stay. Somebody will speak of it later |

**1. "We're going to get them out."** Scene 6.

**2. "We'll buy them back."** Moss drives the price out at first light, and the player rides beside Bess as on any
run. The price is drawn between 260 and 340 scrap. It is paid from the player's scrap, then the till, then in embers,
at a hundred scrap to the ember.

> **Sump:** Nine growers, one water cart and a stack of glass. I'll even throw in the cart for nothing, because it
> squeaks. It's always a pleasure doing business with Tin Town.
>
> **Marigold:** You paid for us as if we were sacks of flour. I ought to be offended. I find that I'm not offended at
> all.

**The ledger.** Scrap and embers as paid. The Glasshouse: Sworn. The Road Rats: Watching. Mark: "Tin Town bought the
Glasshouse's people back from the Road Rats." Scene 7 follows.

**Tied back,** when the Road Rats next take anybody, in any thread.

> **Sump:** I've put my prices up. I had to, after Tin Town paid three hundred for nine bean growers without even
> arguing. Everybody on the road heard about that.

**3. "We can't do it."**

> **Auntie Solder:** No. I don't think we can either, and I've been sitting here wishing I could think otherwise.
>
> **Cinder:** I'll remember that we talked about it, at least. That's more than most camps out there would get.

**The ledger.** The Glasshouse: its people's word falls to Wary. The site is "The Glasshouse (burned)" and empty.
Mark: "You left the Glasshouse's people in the Rats' Nest."

**Tied back,** some nights later, by any trader at the gate or on the road.

> **The trader:** I saw the bean woman at the Rats' Nest last week. She was sorting bolts into tins. She asked me
> whether anybody from Tin Town had said anything about her, and I didn't know what to tell her.

And once, on a later drive, Finch is seen at a checkpoint in the back of a Road Rats' buggy, looking at the player's
car as it passes. He does not wave.

### Scene 6. The rescue

A mission, at dusk the next day. It holds the checkpoints and the signs. Three jobs have to be done, and each one that
no helper takes falls to the player, one after another.

| The job | A helper who can take it | If the player has to do it |
| --- | --- | --- |
| Draw the buggies out | Nobody. It is always the player's, by car | |
| Open the pen | Rell's six, or Dace, by the drain | The player comes back on foot after the chase, and the buggies are back sooner |
| Carry the growers home | Moss, with Bess | They walk behind the water cart, and the road home takes three times as long |

**What the scouting was worth.** If the player knows the drain, the helpers go by it. If not, there is only the gate,
and somebody has to break its chain with the buggies still at home. If the player counted the cars, the screen says how
many are left as each one is wrecked. If the Road Rats saw the player looking, there are two guards on the pen.

**The chase, by car, about three minutes.** The player drives at the gate with the lamps on, wrecks the lookout's
buggy and turns for the wreck fields. Four buggies follow, or two if the trader's truck is stuck in the gateway. The
player is the one being chased here, and has to stay ahead without getting away: far enough ahead to be safe, and near
enough that they do not turn back. The tower's keeper, if there is one, calls the moment any buggy turns for home.

**The whistle.** When the pen is open, Rell whistles (the cue `night.whistle`, which the player has heard before).

> **Rell:** *(on the radio)* They're all out, every one of the nine. The old woman wanted to go back for her glass,
> and I told her no.

**The road home, about three minutes.** The player turns back and rides beside the growers: beside Bess, or beside a
line of people on foot with a squeaking cart. Two buggies come back. They can be shoved off as on any run.

**How it can end.**

- **All nine come home.** The Road Rats: Raiding. The Glasshouse: Sworn. Mark: "You rode out with friends and brought
  the Glasshouse's people home."
- **Some come home.** If the player's car is wrecked before the whistle, the helpers bring out whoever was through
  the drain by then, and the player walks home with them. The rest are still in the pen, at twice the guard.
- **Nobody comes home.** If the car is wrecked in the first minute, the helpers fall back without going in. Nobody is
  taken and nobody is hurt. Each helper's people think one word less of the player, and they say why.

  > **Rell:** I brought six people to a drain, and we waited there for a whistle that never came. I'm not angry with
  > you. I'm just not going to do that again in a hurry.

- **Bess is holed,** if Moss came and a buggy reached her. She still carries the growers home. Tomorrow's gas run
  leaves late and brings home less.

### Scene 7. What becomes of the camp

At Tin Town's gate, at dawn, whenever the growers have come home by any road.

> **Marigold:** We've nothing to go back to except broken glass and a pump. It's a good pump, mind you. Somebody
> mended it properly.

| | You say | Plain to see | Kept out of sight |
| --- | --- | --- | --- |
| a | "Stay here with us. There's room inside the fence." | Nine more people at the hearth | In an act with a clock the hearth burns an extra ember every second night, as it does for the Walkers. A bean bed is dug by the south fence, and from the third night it feeds the town. The site stays burned |
| b | "We'll help you build it again." | A promise goes on the page: a load of windscreens from the Boneyard | A hauling job, and a day's outing. The site becomes "The Glasshouse" again, rebuilt. Its people are Sworn |
| c | "There's water at the Sweet Seep now. Why not build there?" *(only if that well was drilled and shared)* | The Sweet Seep is on the map | The growers settle at the well. It is the beginning of an outpost (section 20) |

> **Marigold:** *(a)* Inside a fence? I haven't lived inside a fence since I was a girl. Finch, go and find out which
> side gets the morning sun.
>
> **Marigold:** *(b)* You'd haul glass across the Scablands for a few rows of beans? Then you'll have the first
> basket of every crop, and I won't hear any argument about it.
>
> **Marigold:** *(c)* Beans beside a well that never runs dry. I've been dreaming about that for thirty years, and I
> never once thought to ask anybody for it.

### How you can lose

- **You are taken.** A ransom is paid, in scrap or in embers, and a night passes without you at the fence.
- **You are caught breaking out.** The price rises, and the guard is doubled.
- **The rescue fails.** Friends think less of you, and the growers are harder to reach.
- **Bess is holed.** There is less gas tomorrow.
- **You pay.** Everybody on the road learns that Tin Town pays, and the next price is higher.
- **You leave them.** Nothing is lost at Tin Town. People who knew are told, and one of them tells you.
- **You never go to the smoke.** Some nights later Dot mentions it: "There used to be a camp out past the Ridge that
  grew beans. I bought from them every spring. Nobody has seen them this year, and I can't think why not."

Nobody dies, nothing saved is wiped, and no screen says the game is over.

### What this changes later

- A Glasshouse that is Sworn sends a car when called, and a basket of beans is at the gate each dawn.
- The Rats' Nest is on the map for good. Every later thread that involves the Road Rats can use it.
- The Road Rats at Raiding come to fight at checkpoints more often. On the fifth of the Cold Nights they may ride
  with the Ash Men, and Cinder says why.
- A favour or a watch that was spent here is not there on the night it was first meant for.
- Finch, at Tin Town, is a boy of twelve who thinks ahead, and other threads can cast him.

### When the enemy is the Ash Men

The same beats, with these changes. During Five Cold Nights the director draws the Ash Men only after their raid on
Day 4.

| | With the Ash Men |
| --- | --- |
| The camp | It is not burned by a thrown lamp. The cook fire is smothered under a heap of ash, the stove is gone, and the fire that took the tents spread from a brazier kicked over in the struggle |
| The tracks | Two wide tracks, from trucks. The Ash Men take the camp's fire as well as its people |
| The den | The Grey Camp, on the burn. Its pen is a ring of ash banks, and its captives carry coal for the furnace |
| Who speaks | Clinker |
| The price | Embers only, and never scrap |
| On the fifth night | Old Smoke speaks of it at the parley, whichever way it went |

> **Clinker:** Old Smoke has no use for your scrap. He wants two embers out of your store, carried here in a pot.
> When he has them, you can have your driver back.

### When there is a false trail

Three times in ten, the Road Rats have emptied a sack of ash over the camp's dead cook fire, to put the blame on the
Ash Men. The broken lamp and the narrow tracks are still there for a player who looks at everything.

| You ask | The answer |
| --- | --- |
| "Cinder, there's ash heaped on the cook fire here." | **Cinder:** *(on the radio)* Put your hand under the ash for me. Is it still warm underneath? If it's stone cold, then somebody tipped that ash onto a fire that was already dead. The Ash Men smother a fire while it's burning. They don't dress up a dead one. |

A player who drives to the Grey Camp on the strength of the ash spends the day's outing and finds no pen there.

> *There's no pen here, and there's no water cart. Whoever burned the Glasshouse, it wasn't these people.*

If the Ash Men saw the player looking, their feud rises for nothing. The Rats' Nest is tomorrow's outing, by tracks a
day older.

### What it takes to play

Three sittings of about ten minutes, which may be days apart: the camp, the scouting, and the rescue or the price. A
player who goes home from the camp and chooses to leave them has played five minutes of it.

### What it needs made

| What | New or in hand |
| --- | --- |
| The Glasshouse: windscreen frames over bean rows, a wind pump, a store tent, a water cart | New. The pump and the cart are small things in the town's set to look for first. A burned state of each |
| The Rats' Nest: a cutting in the wreck fields, a ring of wrecks for a pen, tyre fires, tin roofs, a drain | The wrecks and the shacks are in hand (`src/world/boneyard-wrecks.js`, `src/world/tin-town-shacks.js`). The cutting and the drain are new ground |
| The Grey Camp | New, when the Ash Men's turn of this thread is built. Not in the first cards |
| Figures: Marigold, Finch, Sump, three growers, two Road Rats on foot | By the method that made the Walkers |
| Buggies | The riders' cars in hand, in the Road Rats' paint |
| The smoke | In hand |

**Sound cues.** `open.smoke.seen`: wind, and one low note, when the smoke first comes into view. `open.clue.found`: a
small find. `open.scout.seen`: a held breath. `open.lookout.flare`: a flare going up. `open.pen.chain`: a chain
falling. `open.taken`: the pen's gate shutting. `open.ransom.paid`: scrap poured out on a bonnet. The whistle is
`night.whistle`, in hand.

## 22. What is built, and in what order

Every card is behind the switch `story-choices`, which is off for players. Codex builds each on its own branch; the
card names its model. Under AGENTS rule 23 a card that a player cannot reach runs the small set and merges, and Claude
drives the merged game a batch at a time. Three cards are not covered by rule 23, because they touch what is saved or
what the player owns: OPEN-STATE, OPEN-BURNED-PEN and OPEN-BURNED-RESCUE keep the lane tier and one independent review
before they merge.

| | Card | What a player can do when it is merged | Needs |
| --- | --- | --- | --- |
| 1 | **OPEN-ROAM** | Be in Tin Town with no mission, walk and drive anywhere, watch people go about their day, walk up to one and talk | Nothing |
| 2 | **OPEN-FIGURES** | See Odessa, Moss and three of Tin Town's people as figures | Nothing |
| 3 | **OPEN-DOORS** | Walk into the forge shed, have Odessa mend the car, and have Moss wash it | 1 and 2 |
| 4 | **OPEN-STATE** | Leave the game and come back to the same car, the same scrap and the same finds | 1 |
| 5 | **OPEN-CHECKPOINTS** | Meet cars on the open road that fight, pass by or need help; and never meet them during a mission | 4 |
| 6 | **OPEN-FIGURES-2** | See Marigold, Finch, the growers, the sisters of Radio Hill, Sump and the Road Rats on foot | Nothing |
| 7 | **OPEN-SITES** | Find the Glasshouse and Radio Hill, see them join the map, mend something for them and earn their word | 4 and 6 |
| 8 | **OPEN-THREADS** | See smoke over a camp that was helped, drive to it, read what is left and choose where to go | 5 and 7 |
| 9 | **OPEN-BURNED-SCOUT** | Follow the tracks to the Rats' Nest, get past the lookouts and look down into it | 8 |
| 10 | **OPEN-BURNED-PEN** | Drive in alone or creep in by the drain; be taken, ransomed, break out or make Sump an offer | 9 |
| 11 | **OPEN-BURNED-RESCUE** | Go home, choose a party, ride out, bring the growers home and decide where they live | 10 |
| | **OPEN-SOUND** (Claude) | Hear every new cue, chosen and listened to | The cards above, as each merges |

**The first slice is cards 1 to 3:** people who walk about, and one building with a service. Claude drives it by hand
from the integration folder as soon as card 3 has merged, and Kyle can try it then.

**Sound.** `src/sound-bank.js` is a lock that one card holds at a time. Each build card writes the names of its cues
into `src/world/open/open-cues.js`, with one line saying what each is, and plays them by name. OPEN-SOUND, Claude's
card, registers and chooses them, as BOWL-SOUND does for the Bowl.

**Not cut yet, and why.**

- **The town bridge, and the threads "Water under the grey", "A place to stand" and "The watch line"** (section 20).
  They wait for Kyle's answers in the questions file and for his try of the first slice.
- **The other threads of section 19.** Each is written in full by Claude, as section 21 is, before its card is cut.
- **The Ash Men's turn of the burned camp and the Grey Camp.** After the Road Rats' turn has been played by hand.
- **The remaining sites of section 16.** Rows in a table, added as their threads need them.

**Removed by this work.** Nothing is replaced: no released screen, job or rule changes with the switch off. When
OPEN-ROAM merges, people who stand still in Tin Town during a night's story stop being the only kind there is, and the
suites that name Night 2's placements are brought up to date by the card that moves them.
