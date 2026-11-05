# Story 2: The Iron Mule

Claude, 5 November 2026. Chapter 22 of `docs/story/the-long-dry.md`, Act 3, around Year 13 or 14 of a town. Every line and
every job. Where this page and `docs/WASTELAND_WORLD.md` section 6 differ, this page
wins. Kyle and Gratian can overrule anything.

## 1. The story in one breath

Pim has been hearing a train with no lights go past for years. It is Mrs Vane's secret
water train, the Iron Mule, run by Mr Crisp, and it is how her white kiosks stay full.
With Pim and his dog Tuesday you put it on a siding, free the people locked in its last
wagon (Jax is one of them), run it down across the lake bed, cut the cab free and mend
it at the Rail Halt. Then **you drive the train**, flat out across the lake bed and
through the steel rail gate at the foot of the Dry Dam, and you find where all that
water has been coming from. The wall in there is wet, and it tastes of salt. Hollis
hears that on the radio and goes very short with everyone. You bring the Mule home,
and it reaches Pim's platform at exactly 2:15.

**Two gates.** The Dry Dam has two. The **rail gate** is a steel door at the dam's foot,
big enough for a train. You smash that one here. The **sea gate** is the huge one that
holds back the ocean. Nobody touches it until Act 5, and nobody here knows what it is.

**What the salt is for.** It is the first real clue that the sea did not dry up. Nobody
works it out yet, and nobody sees the ocean. Isolde explains it in Story 3.

## 2. The jobs

| # | Job | Kind | What happens | You get |
| --- | --- | --- | --- | --- |
| 1 | **Points Failure** | On foot | Get out at the Rail Halt, and follow Tuesday to three rail switches so the Mule runs onto the old siding and stops | Pim's help |
| 2 | **The Wrong Wagon** | Rescue | Mr Crisp cuts the last wagon loose and takes the rest away. Stop beside it and take Jax out. Then find Mr Pell, from Accounts, who has wandered off, and drive both to the Halt | Jax rides with you for the rest of the story |
| 3 | **Before the Bridge** | Chase | Catch the Mule across the lake bed, past Deck Town. Get right beside it, and Jax puts a harpoon in the last wagon | The Mule slows down |
| 4 | **The Coupling** | Boarding | Step out, grapple onto the moving roof, walk the wagons, and plant Nell's charge on the coupling. Jump clear | The cab is yours |
| 5 | **The Yellow Line** | Defence | Hold the Rail Halt for three lots of Mr Crisp's people while Odessa mends the boiler | Steam |
| 6 | **On Time** | You drive the train | Out to the Deck Town loop, then flat out through the rail gate, then home | **The Mule is yours. Jax is on your side. Pim's clock has a 2:15. Freight gets cheap** |

Each job pays like a Wasteland win and counts toward rank. Fail, and that step restarts
with one press. There is no racing clock anywhere, and 2:15 is a story beat, never a
timer: whenever you pull in, Pim's clock says 2:15. The jobs open one after another, with no
game-time wait, and each plays in real time at the wheel while the town ticks along (section
11 of `docs/WASTELAND_TOWN.md`).

**Side job, after job 6: The Milk Run.** Take the Mule from the Halt to Tin Town, as often
as you like, for a little scrap. Pim comments on your stopping.

**Controls for the train.** W is the throttle and S is the brake. There is no steering,
because she goes where the rails go. Holding Space blows the whistle. Nothing about
driving the train can be lost except hitting the gate too slowly, and then you back up
and go again.

**What the town gets (TOWN-PACE tunes the number).** With the Mule yours, trade roads
pay 25% more, and a Mule tick shows on the Ledger. Dispatches to places on the Iron Line
take half a day less.

**Two kinds of Jax.** Jax joins by rank at rank 8, as he always has, so plenty of drivers
will already know him. Every Jax line has a version for each. Below rank 8, finishing job
6 brings him into the crew (CREW-STORY-JOIN). Nobody loses anything.

## 3. Every line

Rules: `docs/story/the-long-dry.md` section 9. Ids go in `src/story/iron-lines.js`, built
as `src/story/ember-lines.js`: captions with the radio click, no voice file, no new cue.

### Before the jobs

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.hollis.note` | Hollis (note) | The Story Wall, after Free Water Day | Driver, that train of Pim's is hers. Water goes out every night and none of it is on any bill I can find. Go and see Pim. Do what the dog says. Hollis |
| `story.iron.next` | Screen (NEXT line) | Chapter 22 opens | Go and see Pim at the Rail Halt. |

### Job 1: Points Failure

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.1.start` | Pim | Job starts | She comes through when she pleases, which is the worst thing I can say about a train. Throw three switches and she goes down the old siding and stops. That is called a points failure. They happen. |
| `story.iron.1.tuesday` | Pim | Straight after | Tuesday knows where they are. Follow Tuesday. Do not give Tuesday your sandwich. |
| `story.iron.1.exit` | Pim | Still in the car | You can't throw a switch from inside a car. Hold F to step out. |
| `story.iron.1.switch1` | Pim | Heading for switch 1 | First switch is by the water crane. Long red handle. Walk up and lean on it. |
| `story.iron.1.switch2` | Pim | Heading for switch 2 | Second one is behind the coal heap. There is no coal. It is still called the coal heap. |
| `story.iron.1.switch3` | Pim | Heading for switch 3 | Last one is by the old signal. Tuesday is sitting on it. Ask nicely. |
| `story.iron.1.won` | Pim | Job won | Here she comes. No lights, no timetable and no shame. |

### Job 2: The Wrong Wagon

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.2.start` | Mr Crisp | Job starts | So sorry, everyone, a points failure. We'll be off now, without that last wagon. There are people in it who asked questions. Nothing personal. |
| `story.iron.2.pim` | Pim | Straight after | He has cut a wagon loose on my siding. That is against every rule I have. Stop right by its door and wait. They will not be quick. They have been sitting down for nine days. |
| `story.iron.2.jax.known` | Jax | Stopped at the wagon, Jax already in the crew | Driver? About time. I said I'd go and have a look at that train. I've had a very long look. |
| `story.iron.2.jax.new` | Jax | Stopped at the wagon, rank under 8 | Name's Jax Harrow. I went to have a look at this train. I've had a very long look. If you've got food, I like you. |
| `story.iron.2.jax.pell` | Jax | In the car | There was another one in here. Little fellow with a ledger. He wandered off up the line to find a desk. |
| `story.iron.2.pell` | Mr Pell | Stopped beside him | Pell, Accounts. I asked why the water bills don't add up. I was told it wasn't my department. Then I was told this wagon was my department. |
| `story.iron.2.won` | Mr Pell | Job won | That train goes out full every night and nobody ever pays to fill it. I've written that down three times. That is water from nowhere. |
| `story.iron.2.hollis` | Hollis | Straight after | Nothing comes from nowhere. Go and get that train. |

### Job 3: Before the Bridge

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.3.start` | Jax | Job starts | She has to slow down for the bridge, far side of the lake bed. Get me right beside her before that, and I'll do the rest. I've got a harpoon and I've got feelings about this. |
| `story.iron.3.far` | Jax | Falling behind | Closer! I can't throw a harpoon at a train that's in another town! |
| `story.iron.3.imre` | Captain Imre | Passing Deck Town | Deck Town, afternoon watch. Train going by at speed, car behind it. Nothing to report. |
| `story.iron.3.crisp` | Mr Crisp | Beside the Mule | So sorry, could you drive a little further away? I do have a schedule. |
| `story.iron.3.won` | Jax | Job won | Got her! Hook's in the last wagon and she's dragging. She won't go fast now. That's all the slow you're getting. |

### Job 4: The Coupling

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.4.start` | Jax | Job starts | Drive up beside her. Hold F to step out, press 3 for my grapple and point it at her roof. It pulls you up. Mind your head on the way. |
| `story.iron.4.nell` | Nell | On the roof | I made you a charge. It's only a small one. Put it on the coupling, that's the big steel fist holding the cab to the wagons. Hold F to plant it. |
| `story.iron.4.walk` | Jax | Walking the roof | Keep walking. The gaps are small. If you fall off, you're only on the ground, and she's not going anywhere fast. |
| `story.iron.4.guard` | Mr Crisp | A guard on the roof | So sorry, this roof is for staff only. I've asked him to push you off. Would you mind very much? |
| `story.iron.4.fall` | Jax | Fell off | Back up you go. Nobody saw. I saw. Nobody else. |
| `story.iron.4.planted` | Nell | Charge planted | That's the one. I'd get off now, if it were me. I always say it's small. |
| `story.iron.4.won` | Jax | Job won | Cab's stopped dead. The wagons are rolling away with Crisp on them. He's waving. I think he's apologising. |

### Job 5: The Yellow Line

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.5.start` | Pim | Job starts | We towed her back to the Halt. It took all night, and I have put a note in the timetable. Mr Crisp's people will be along. They are always punctual. |
| `story.iron.5.odessa` | Odessa | Straight after | Her boiler's split. Give me three lots of them and she'll run. I can mend anything if nobody's shooting at me. |
| `story.iron.5.rule` | Pim | First wave | No fighting on the platform, please. There is a yellow line. Kindly do it on the other side of the yellow line. |
| `story.iron.5.tuesday` | Pim | Second wave | Tuesday says they are coming from the north. Tuesday has not been wrong since the business with the sandwich. |
| `story.iron.5.crisp` | Mr Crisp | Third wave | Nothing personal. We do have a train to collect. So sorry about the platform. |
| `story.iron.5.restart` | Odessa | They reached the boiler | They got to my boiler! Once more, from the start of that lot. Keep them away from me this time. |
| `story.iron.5.steam` | Odessa | Waves over | That's it. She's got steam. Get in the cab, driver. You'll want to do this yourself. |
| `story.iron.5.won` | Pim | Job won | In all my years at this halt I have never once said this to anyone. All aboard. |

### Job 6: On Time

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.6.start` | Jax | Job starts | The Mule's ours, but the water's still hers. It's all kept behind the rail gate at the foot of the Dry Dam. That gate is solid steel. We are not going to knock. |
| `story.iron.6.controls` | Pim | Straight after | W is the throttle and S is the brake. There is no steering. She goes where the rails go. Space is the whistle, and I would like to hear it. |
| `story.iron.6.loop` | Odessa | Pulling away | She won't break a gate from here. Take her out to the loop at Deck Town, turn her round and come back flat out. |
| `story.iron.6.imre` | Captain Imre | At the loop | Deck Town, afternoon watch. Stolen train turning in our loop. Bell rung once, to be polite. Nothing to report. |
| `story.iron.6.flat` | Pim | Leaving the loop | Now then. Full throttle. I have written this in the timetable and I do not want to cross it out. |
| `story.iron.6.trucks` | Mr Crisp | Trucks on the line | So sorry, this line is closed. We've parked on it. Terribly sorry about the trucks. |
| `story.iron.6.keepgoing` | Jax | Straight after | Don't slow down! Those are only trucks! |
| `story.iron.6.slow` | Odessa | Hit the gate too slowly | You hit that like a polite knock. Back her up and mean it this time. |
| `story.iron.6.through` | Jax | Through the gate | HA! Did you see that? We're in! We are IN! |
| `story.iron.6.tanks` | Jax | Inside the dam | Look at these tanks. Every drop she ever sold us was parked in here. |
| `story.iron.6.wet` | Odessa | Straight after | Hold on. This wall's wet. It's a dry dam. Why is the inside of a dry dam wet? |
| `story.iron.6.salt` | Jax | Straight after | Salt. Go on, taste it. It's salt. |
| `story.iron.6.lick` | Odessa | Straight after | I will not. And stop licking the wall. |
| `story.iron.6.hollis` | Hollis | Straight after | Say again. Salt? |
| `story.iron.6.hollis2` | Hollis | Straight after | Don't go any further in. Fill her up and bring her home, driver. |
| `story.iron.6.home` | Pim | Pulling out for home | Bring her in nice and steady. I have waited a long time for this. Please do not hit my platform. |
| `story.iron.6.won` | Pim | Stopped at the Halt | Two fifteen. On time. All these years I've kept a timetable for trains that do not exist. Tuesday, sit up. We have a railway. |
| `story.iron.6.jax.known` | Jax | Straight after, Jax already in the crew | Back in the crew, if it's all the same. I've got a grudge now. It's a good one. |
| `story.iron.6.jax.new` | Jax | Straight after, rank under 8 | I'm with you, if you'll have me. I've got a harpoon, a grudge, and you're the only one who stopped. |
| `story.iron.6.freight` | Odessa | Next town visit | The Mule hauls for us now, so everything that comes by rail is cheaper. Pim will not run her late, so don't ask him to. |
| `story.iron.6.letter` | Mrs Vane (letter) | Next town visit | Dear Neighbour, you appear to have my train. I enclose my invoice for one gate and several trucks. I would so prefer you stayed out of the dam. It is damp, and you might catch something. Kind regards. |
| `story.iron.6.pell` | Mr Pell | Next town visit | I've been through her invoice. She has charged you for the gate twice. I've written to her. I expect I'll be locked in something. |

### The Milk Run

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `story.iron.milk.start` | Pim | Job starts | Today's working: the Halt to Tin Town. Mind your speed past Deck Town. They will not report it, but I will. |
| `story.iron.milk.won` | Auntie Solder | Stopped at Tin Town | A train! In my town! Put it down gently, I've only just got this place how I like it. |

## 4. The job list, as data

This block goes into `src/world/jobs/iron-mule.js` as it stands (MULE-JOBS). It has the
shape of `src/world/jobs/everburn.js`.

The `onfoot`, `rescue`, `chase` and `defend` steps run on today's engine. `board` and
`drivetrain` are two new step kinds from MULE-RAILS, because nothing today can walk a
moving roof or drive on rails. Their fields below are what that card builds. As in
Everburn, the `easy` blocks only record the Easy numbers: the engine reads the step's own
numbers, which must be the ones a child can win, plus the `easy...` fields the step kind
reads itself. A place's `y` is the ground height there, because the steps measure in three
dimensions, and `tools/test-iron-mule-easy.mjs` checks every `y` against the ground.

```js
const place = (id, x, z, radius = 12, y = 0) => Object.freeze({id, position:Object.freeze({x, y, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

const halt = place('rail-halt', -600, 0, 16), sidingEnd = place('rail-siding-end', -620, 90, 8);
const pellWalk = place('mr-pell', -585, 110, 8, -1.3), northCut = place('rail-north-cut', -590, -130, 8, 1.6);
const damJunction = place('rail-dam-junction', -500, -245, 8, -2.8), bedWest = place('rail-bed-west', -300, -335, 8, .4);
const bedMid = place('rail-bed-mid', -120, -335, 8, 1.9), bedEast = place('rail-bed-east', 170, -340, 8, -.9);
const bridge = place('rail-bridge', 300, -335, 10, -1.5), eastCut = place('rail-east-cut', 330, -200, 8, -1.9);
const eastRun = place('rail-east-run', 560, -120, 8, 1), tinSiding = place('rail-tin-town', 650, -60, 14);
const loopWest = place('rail-loop-west', -60, -325, 8, 1.7), loopSouth = place('rail-loop-south', 0, -310, 8, 1.1);
const loopEast = place('rail-loop-east', 40, -325, 8, .8), loopNorth = place('rail-loop-north', 0, -350, 8, -2);
const railGate = place('dam-rail-gate', -445, -345, 10, -3), fillingShed = place('dam-filling-shed', -462, -368, 10, -3);

// The whole Iron Line, in order, from the Rail Halt to Tin Town. MULE-RAILS lays it and
// the Act 5 haul uses it. It never enters the town's grid (x within 256, z within 192).
export const IRON_LINE = path(sidingEnd, halt, northCut, damJunction, bedWest, bedMid, loopWest, loopNorth, loopEast, bedEast, bridge, eastCut, eastRun, tinSiding);
const toTheBridge = path(halt, northCut, damJunction, bedWest, bedMid, loopWest, loopNorth, loopEast, bedEast, bridge);
const pastTheBridge = path(bridge, eastCut, eastRun, tinSiding);

export const IRON_MULE_JOBS = Object.freeze([
  Object.freeze({id:'iron-points-failure', storyId:'iron', number:1, name:'Points Failure', kind:'on-foot',
    lineId:'story.iron.1.start', resultLineId:'story.iron.1.won', easy:Object.freeze({markerRadius:3, knockedDownRecovery:'last-marker'}),
    steps:[step('onfoot',{what:'Get out and follow Tuesday to the three rail switches.',
      places:[place('mule-switch-1', -588, -60, 3), place('mule-switch-2', -604, -8, 3), place('mule-switch-3', -615, 44, 3)]
        .map((at, index) => Object.freeze({...at, action:'use', hint:`story.iron.1.switch${index + 1}`})),
      radius:3, requiresExit:true, returnToCar:halt, exitCarLineId:'story.iron.1.exit',
      startLineId:'story.iron.1.tuesday', wonLineId:'story.iron.1.won'})]}),
  Object.freeze({id:'iron-wrong-wagon', storyId:'iron', number:2, name:'The Wrong Wagon', kind:'rescue',
    lineId:'story.iron.2.start', resultLineId:'story.iron.2.won', easy:Object.freeze({seats:2, boardSeconds:1.5}),
    steps:[step('rescue',{what:'Stop by the wagon door, find Mr Pell, and drive them to the Halt.',
      people:[place('mule-prison-wagon', -620, 90, 8), pellWalk], seats:2, boardSeconds:1.5, radius:8, stopSpeed:.5,
      home:halt, homeRadius:16, startLineId:'story.iron.2.pim',
      peopleLineIds:['story.iron.2.jax', 'story.iron.2.pell'], afterFirstLineId:'story.iron.2.jax.pell',
      wonLineId:'story.iron.2.hollis', reward:'scrap'})]}),
  Object.freeze({id:'iron-before-the-bridge', storyId:'iron', number:3, name:'Before the Bridge', kind:'chase',
    lineId:'story.iron.3.start', resultLineId:'story.iron.3.won', easy:Object.freeze({targetSpeed:15, leashDistance:220, contactRadius:12}),
    steps:[step('chase',{what:'Catch the Mule before the bridge. Get right beside her.', targetId:'iron-mule',
      actor:{id:'iron-mule', model:'iron-mule', health:9999, speed:15, path:toTheBridge}, path:toTheBridge,
      targetSpeed:15, leashDistance:220, contactRadius:12, leashLineId:'story.iron.3.far',
      lentCrew:'jax', sayNear:[{place:loopWest, lineId:'story.iron.3.imre'}], contactLineId:'story.iron.3.crisp',
      startLineId:'story.iron.3.start', wonLineId:'story.iron.3.won'})]}),
  Object.freeze({id:'iron-the-coupling', storyId:'iron', number:4, name:'The Coupling', kind:'boarding',
    lineId:'story.iron.4.start', resultLineId:'story.iron.4.won', easy:Object.freeze({speed:8, roofGuards:0}),
    steps:[step('board',{what:'Step out with F, then press 3 and grapple onto her roof.',
      then:'Walk the roof and hold F on the coupling.', clearWhat:'Jump off and get clear!',
      actor:{id:'iron-mule', model:'iron-mule', health:9999, speed:8, path:pastTheBridge}, path:pastTheBridge, speed:8,
      lentCrew:'jax', boardUnderKmh:90, roofWalk:['tank-wagon-2', 'tank-wagon-1'], coupling:'cab-coupling', plantSeconds:1,
      roofGuards:1, easyRoofGuards:0, clearDistance:15, stopsAtEnd:true,
      roofLineId:'story.iron.4.nell', walkLineId:'story.iron.4.walk', guardLineId:'story.iron.4.guard',
      fallLineId:'story.iron.4.fall', plantedLineId:'story.iron.4.planted', wonLineId:'story.iron.4.won'})]}),
  Object.freeze({id:'iron-the-yellow-line', storyId:'iron', number:5, name:'The Yellow Line', kind:'defence',
    lineId:'story.iron.5.start', resultLineId:'story.iron.5.won', easy:Object.freeze({placeHealth:120, waves:[1, 2, 2]}),
    steps:[step('defend',{what:"Keep Mr Crisp's people off the platform while Odessa works.", place:halt, placeId:'rail-halt-boiler', health:120,
      waves:[{count:2, lineId:'story.iron.5.rule'}, {count:2, lineId:'story.iron.5.tuesday'}, {count:3, lineId:'story.iron.5.crisp'}],
      easyWaves:[{count:1, lineId:'story.iron.5.rule'}, {count:2, lineId:'story.iron.5.tuesday'}, {count:2, lineId:'story.iron.5.crisp'}],
      raiderEntry:place('rail-halt-approach', -580, -40, 8), raiderHold:place('rail-halt-raiders-hold', -597, -6, 8), approachSpeed:1.5,
      refill:{place:halt, crateId:'pim-platform-crate', footAmmo:'rpg'},
      startLineId:'story.iron.5.odessa', restartLineId:'story.iron.5.restart', wavesOverLineId:'story.iron.5.steam'})]}),
  Object.freeze({id:'iron-on-time', storyId:'iron', number:6, name:'On Time', kind:'train',
    lineId:'story.iron.6.start', resultLineId:'story.iron.6.won', easy:Object.freeze({gateSpeed:14}),
    steps:[
      step('drivetrain',{what:'Drive the Mule to the Deck Town loop. W goes, S stops.', path:path(halt, northCut, damJunction, bedWest, bedMid, loopWest, loopSouth, loopEast),
        maxSpeed:26, acceleration:3, brake:8, startLineId:'story.iron.6.controls', sayAt:[{progress:.05, lineId:'story.iron.6.loop'}, {progress:.9, lineId:'story.iron.6.imre'}]}),
      step('drivetrain',{what:'Flat out! Hold W and hit the rail gate at the Dry Dam.', path:path(loopEast, loopNorth, loopWest, bedMid, bedWest, railGate),
        maxSpeed:26, acceleration:3, brake:8, gate:{place:railGate, speed:20, easySpeed:14, tooSlowLineId:'story.iron.6.slow', throughLineId:'story.iron.6.through'},
        crushOnTrack:[{id:'clean-pickup-1', progress:.55}, {id:'clean-pickup-2', progress:.7}], startLineId:'story.iron.6.flat',
        sayAt:[{progress:.48, lineId:'story.iron.6.trucks'}, {progress:.52, lineId:'story.iron.6.keepgoing'}]}),
      step('drivetrain',{what:'Bring her home to the Halt, nice and steady.', path:path(fillingShed, railGate, bedWest, damJunction, northCut, halt),
        maxSpeed:18, acceleration:3, brake:8, stopAtEnd:true, opening:['story.iron.6.tanks', 'story.iron.6.wet', 'story.iron.6.salt', 'story.iron.6.lick', 'story.iron.6.hollis', 'story.iron.6.hollis2'],
        startLineId:'story.iron.6.home', wonLineId:'story.iron.6.won', closing:['story.iron.6.jax']}),
    ], nextVisit:['story.iron.6.freight', 'story.iron.6.letter', 'story.iron.6.pell'], rewards:['jax-crew-member', 'iron-mule-owned', 'pim-two-fifteen', 'freight-cheaper', 'milk-run-open']}),
]);

export const IRON_MULE_SIDE_JOBS = Object.freeze([
  Object.freeze({id:'iron-milk-run', name:'The Milk Run', kind:'train', unlockAfter:'iron-on-time', easy:Object.freeze({}),
    steps:[step('drivetrain',{what:'Take the Mule from the Halt to Tin Town and stop at the end.', path:path(halt, northCut, damJunction, bedWest, bedMid, loopWest, loopNorth, loopEast, bedEast, bridge, eastCut, eastRun, tinSiding),
      maxSpeed:26, acceleration:3, brake:8, stopAtEnd:true, startLineId:'story.iron.milk.start', wonLineId:'story.iron.milk.won', reward:'scrap'})]}),
]);
```

**The two versions of Jax.** `story.iron.2.jax` above picks `.known` or `.new` from whether
he is already available in the crew, and so does `story.iron.6.jax`.

## 5. What the new step kinds do (MULE-RAILS)

- **The train.** One actor, with a cab, two tank wagons and a guard wagon (art WW-ART-MULE),
  moved along its path by the job, smoothed into a curve through the points. It never
  collides with the ground and never derails. Raiders and pickups never stop it.
- **`board`.** Three stages on one step: get on (Jax's grapple under 90 km/h, as in
  `docs/CREW.md` section 2), walk the roof plates in order, hold F on the coupling, then get
  15 m clear. Fall off, and you stay at the plate you had reached. Press F by the wagon again
  to climb on at any time. A guard can push you off and never hurts you. On Easy there are no
  guards. The train stops at its buffers at the end of the path and waits, so there is
  nothing to miss.
- **`drivetrain`.** The player sits in the cab, with the car's own view. W and S change speed
  and the step tracks how far along the path the train is. With a `gate`, reaching it below
  the speed bounces the train back 150 m and says the line; at speed the gate breaks. Pickups
  on the track are crushed with a bang and take 2 m/s off. With `stopAtEnd`, the step finishes
  when the train stops in the last place's ring. At full throttle a test driver always clears
  the gate, even from the slowest start.
- **`lentCrew`.** Lends a crew member for the step the way `cinders-hand-flamer` does, and is
  undone the same way at the end of the job. The save never changes.
- **Lines on a step.** One small player for both stories, `src/world/jobs/step-lines.js`. `opening`
  and `closing` play in order as captions, with the step held until they finish or the player
  presses Space. `startLineId`, `afterStartLineId`, `wonLineId`, `sayAt`, `sayNear`, `sayOnce`,
  `peopleLineIds`, `afterFirstLineId`, `nearLineId`, `contactLineId`, a wave's `lineId`, and a
  place's `lineId` and `thenLineId` play as the player gets there. A job's `nextVisit` lines play
  on the next town visit.
- **`stepReach`'s marker.** Today it sends the place's id, and the mode needs the place, so no
  marker shows. Everburn never used `reach`. Send the place itself.

## 6. Removed

STORY-IRON-MULE's own card went when this page landed. `docs/WASTELAND_WORLD.md` section 6
points here. The old idea of a scrap train that steals from the camp's pipe is gone, and
so is Tusk joining here (he comes through Kettle).
