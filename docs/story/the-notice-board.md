# The Notice Board: your crew asks a favour

Claude, 5 November 2026. A new strand, as `docs/story/the-long-dry.md` section 12 allows. Every line and every job. Kyle and Gratian can overrule anything.

**Why this one, and why now.** Everything in the Long Dry and The Far Side needs a town, a train or a tunnel first. This needs none of them. It runs on the Scablands, the job engine and the step kinds that are already in the game, so it is the story that can be played soonest. It also gives the crew something they have never had: a reason to be more than a perk and a gadget. Gratian picks these people before every fight and knows nothing about them.

## 1. The strand in one breath

Tin Town's notice board already holds odd jobs. From now on, some of them are in handwriting you know. Each crew member has one small, funny favour to ask, that nobody else would do. Rook left a car somewhere. Nell has an old box that has started to sweat. Odessa thinks you should know how an engine works. Wren has hidden seven flags and will not say where. Dune is stuck on an airliner. Tusk has bought a piano. Cinder has a word with the Ash Men who were left behind. Jax wants his grandfather's harpoon back, from when there was something to harpoon.

None of it saves the Wasteland. By the end you know who you've been riding with.

**Where they stand.** After the Everburn's second job, when the board opens. A crew member's story shows once that person is available to you, by rank or by story, the same rule `availableCrew` uses. So they spread themselves out through a career on their own. Nothing here is required, and nothing else depends on it. Each job can be replayed from the board for a little scrap.

## 2. The jobs

| Who | Story | Job | Kind | What happens | You get |
| --- | --- | --- | --- | --- | --- |
| **Rook** | The Long Way Home | 1 | Explore | Rook left a car in the Boneyard years ago, and has forgotten where. Find four bits of it | |
| | | 2 | Carry | Take the steering wheel, which is all that was worth saving, to Tin Town | Paint: Rook's Regret |
| **Nell** | It's Only a Small One | 1 | Carry | Move a box of very old dynamite from the Dead Mall to open ground, on your roof, gently | |
| | | 2 | On foot | Get out, lay the charge and the long fuse, walk away, and do not run | A crater, and a look at what a real bang is |
| **Odessa** | Suck, Squeeze, Bang, Blow | 1 | On foot | Odessa takes apart an engine in the Boneyard and has you fix the four things it needs | Paint: Oil Change |
| **Wren** | Where Two Lines Cross | 1 | Explore | Seven flags. Each hint is two lines to walk along, from the radio mast and the pillar of smoke | A map mark for every flag; a way of finding anything |
| **Dune** | Day Three | 1 | Rescue | Dune climbed an airliner for the view and the ladder fell off. Stop beside the plane and wait. A lizard is involved | |
| | | 2 | Carry | Carry Gerald the lizard home in a box. Nobody is to mention it | Gerald, on your dashboard |
| **Tusk** | The Piano | 1 | Escort | Tusk has bought a piano. Keep Road Rats away from Big Bess as she brings it to Tin Town | |
| | | 2 | On foot | It won't go down the alley. Help find a way | One very bad song, for good, at Tin Town |
| **Cinder** | Leftovers | 1 | Rescue | The Ash Men who were left behind are starving under the Dead Mall. Bring them out, two at a time | Tin Town gets its Ash Men back as people |
| **Jax** | Something to Harpoon | 1 | Heist | The Ash Men took a harpoon and hung it on a wall in the Dead Mall. Sneak in and get it | Paint: Whaler |

**How hard.** A child-pace test driver wins each on Easy at least 8 times in 10, as everywhere else. Nothing here is timed. None of them stops you doing anything else.

**True things in here.** Each of these is real, and each is said in a character's own words:

| Thing | Where |
| --- | --- |
| Very old dynamite "sweats": the explosive inside seeps out and gathers on the sticks, which makes it far more touchy | Nell, job 1 |
| Blasters walk away from a fuse, because a runner can trip, and a long fuse burns at a known rate, about 30 seconds for each 30 cm | Nell, job 2 |
| An engine does four things over and over: it sucks in air and fuel, squeezes them, lights them, and blows out what's left | Odessa |
| Two straight lines from two known places cross at one point. That is how you find anything on a map, and it's called taking a bearing | Wren |
| An upright piano weighs about 230 kg, most of it an iron frame | Tusk |
| Lizards warm up in the sun in the morning because they can't make their own heat | Dune |
| Whale harpoons were real, and were thrown by hand from small boats | Jax |

## 3. Every line

Rules: `docs/story/the-long-dry.md` section 9. Ids go in `src/story/board-lines.js`, built as `src/story/ember-lines.js`: captions with the radio click, no voice file, no new cue. The board card for each job shows its Card line. Lines about Rook, Dune, Wren and Tusk use no pronoun for them.

### Rook: The Long Way Home

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.rook.card` | Card, on the board | The board | Lost: one car, Boneyard, some years back. Answers to Regret. Ask for Rook. |
| `board.rook.1.start` | Rook | Job 1 starts | I left a car in the Boneyard. I meant to go back for it. I've been meaning to for a while. Red, mostly. Find me whatever's left. |
| `board.rook.1.hint1` | Rook | Hint | I parked by a plane with a nose like a sad dog. There's a lot of planes. Most of them look sad. |
| `board.rook.1.found1` | Rook | First find | That's the door! I'd know that dent. I gave it that dent. |
| `board.rook.1.hint2` | Rook | Hint | The bonnet came off further along, under a wing. I was going quite fast at the time. |
| `board.rook.1.found2` | Rook | Second find | That's the bonnet. Somebody's been living under it. They've left it very tidy. |
| `board.rook.1.hint3` | Rook | Hint | An engine's heavy, so it won't have gone far. Try where the row of planes stops. |
| `board.rook.1.found3` | Rook | Third find | There's the engine, and a tree growing through it. How is there a tree? Nothing grows out here. It's just that stubborn. |
| `board.rook.1.hint4` | Rook | Hint | The last bit's the wheel. It'd be in the seat, if there's a seat. Look for the seat. |
| `board.rook.1.won` | Rook | All four | There she is. There's nothing to fix, is there? I just wanted to see her. Bring the wheel. I'll carry the rest in my head. |
| `board.rook.2.start` | Rook | Job 2 starts | Tin Town. That wheel's been everywhere I've been running from. Mind it on the bumps. It's not that it's worth anything. |
| `board.rook.2.spill` | Rook | Dropped | You've dropped a steering wheel on the road. Back you go. I've done worse with the whole car. |
| `board.rook.2.won` | Rook | Delivered | Hang it up by the board. There. That's the first time in years I've known where something of mine is. Thanks, driver. |
| `board.rook.2.auntie` | Auntie Solder | Straight after | I'm charging rent on that wall. Stop looking like that. It's a very small rent. |

### Nell: It's Only a Small One

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.nell.card` | Card, on the board | The board | Wanted: careful driver. Not a joke. Please read that twice. Nell. |
| `board.nell.1.start` | Nell | Job 1 starts | There's a box of very old dynamite in the back of the Dead Mall, and it's started to sweat. That means what's inside is leaking out, and now a hard look could set it off. It's only a small box. |
| `board.nell.1.roof` | Nell | Box on the roof | It's on your roof. Take it out to the flat ground past the Boneyard road. Don't brake hard. Don't turn hard. Don't sneeze. |
| `board.nell.1.bump` | Nell | Second bump | I felt that from here. I'm a long way from here. On purpose. |
| `board.nell.1.spill` | Nell | Crashed | It's all right, I swapped that box for sand. That's what the first go is for. Now go and get the real one. |
| `board.nell.1.real` | Nell | Second try, if you crashed | This one's the real one. Probably. I had three boxes. Stop looking at me. |
| `board.nell.1.won` | Nell | Set down | Lovely. Nobody's ever brought one back with the paint still on. Stay there. Don't go anywhere. Get out of the car. |
| `board.nell.2.start` | Nell | Job 2 starts | Now the fun bit. It wants blowing up, out here, on purpose. Hold F to step out. Lay the charge on the box, and I'll hand you the fuse. |
| `board.nell.2.fuse` | Nell | Charge laid | Now walk the fuse back to the flag. That's six metres, and about ten minutes of burning. Why so long? Because then nobody has to run. |
| `board.nell.2.walk` | Nell | Fuse lit, walking away | Walk. Don't run. Runners trip, and they fall down right next to what they were running from. That's the whole of what I know. |
| `board.nell.2.wait` | Nell | At the far flag | Now we sit. It's the bit nobody tells you about. You've got time for a sandwich. I always bring a sandwich. |
| `board.nell.2.won` | Nell | The bang | THAT'S what I'm talking about! Look at that hole! That was only a small one! Do you want to see a big one? No. You're right. Nobody does. |

### Odessa: Suck, Squeeze, Bang, Blow

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.odessa.card` | Card, on the board | The board | You've driven a thousand miles and you don't know how it goes. I can't stand it. Come here. Odessa. |
| `board.odessa.1.start` | Odessa | Job starts | There's a good dead engine in the Boneyard, with its head off, so you can see in. It only does four things, over and over. It's dying because each of them's gone wrong. Hold F to step out. |
| `board.odessa.1.hint1` | Odessa | Heading for the first | First the air filter. Suck. The piston drops and pulls in air and a mist of fuel. This one's solid with sand. Knock it clean. |
| `board.odessa.1.done1` | Odessa | Done | That's one. An engine's mostly a very loud way of breathing. |
| `board.odessa.1.hint2` | Odessa | Heading for the second | Now the head gasket. Squeeze. The piston comes back up and crushes all that into a tiny space. If it leaks, you've got nothing. Tighten her down. |
| `board.odessa.1.done2` | Odessa | Done | Two. Squash a thing and it gets hot. Pump up a tyre and feel the pump. Same reason. |
| `board.odessa.1.hint3` | Odessa | Heading for the third | Now the spark plug. Bang. A little spark, and all that squashed fuel goes off at once, and shoves the piston down. That's the only part that does any work. |
| `board.odessa.1.done3` | Odessa | Done | Three. Every mile you've ever driven came from that, a few thousand times a minute. Nobody ever says thank you. |
| `board.odessa.1.hint4` | Odessa | Heading for the fourth | And the exhaust. Blow. The piston comes up again and pushes out what's left, ready to start over. This pipe's got a bird in it. Ask it to leave. |
| `board.odessa.1.bird` | Odessa | Done | That bird was not pleased. All right, stand back. Suck, squeeze, bang, blow. Say it. Go on. Nobody's listening. |
| `board.odessa.1.won` | Odessa | The engine starts | LISTEN TO THAT! She started! That hasn't run since before you were born. There. Now you know what you've been sitting on. Go on, get out of here. And change your oil. |

### Wren: Where Two Lines Cross

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.wren.card` | Card, on the board | The board | I hid seven flags. You won't find them. Wren. |
| `board.wren.start` | Wren | Job starts | Here's all you need. You can see the radio mast from anywhere, and the smoke from the Everburn. Walk a line from one, walk a line from the other, and where they cross, that's one place. There's only ever one. |
| `board.wren.how` | Wren | Straight after | So my hints are two lines each. You don't need a map. The map's only that, with the drawing done for you. |
| `board.wren.1` | Wren | Hint, flag 1 | Mast straight behind you, smoke on your right hand. Keep going until you see something shaped like a mistake. |
| `board.wren.2` | Wren | Hint, flag 2 | Smoke dead ahead, mast dead behind. Stop where the road forgets itself. |
| `board.wren.3` | Wren | Hint, flag 3 | Mast on your left, smoke behind your left shoulder. There's a plane that has sat down facing the wrong way. |
| `board.wren.4` | Wren | Hint, flag 4 | Mast on your right, smoke far behind you. It's the top of something. You'll need a run-up. |
| `board.wren.5` | Wren | Hint, flag 5 | The mall's sign, then a line from it to the smoke. A little way along, there's a car that was parked by somebody in a hurry. |
| `board.wren.6` | Wren | Hint, flag 6 | Tin Town behind you, mast in front. There's a lot of nothing, and I've put a flag in the middle of it. |
| `board.wren.7` | Wren | Hint, flag 7 | You're standing near it. You've been past it twice. No more help. |
| `board.wren.found` | Wren | A flag found | That's {found}. Took you long enough. I'd have been there and back. |
| `board.wren.won` | Wren | All seven | All seven. Nobody has ever done that. Dune got four and said the rest were a rumour. Keep the map, then. I can walk it in my sleep. I have. |

### Dune: Day Three

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.dune.card` | Card, on the board | The board | Day 3. Still on the plane. Ladder has left. Bring water. Dune. |
| `board.dune.1.start` | Odessa | Job 1 starts | A note's come in, tied to a crossbow bolt. It landed in my lunch. Dune has climbed one of the airliners for the view, and the ladder has fallen off. Go and get our marksman. Don't laugh. |
| `board.dune.1.log1` | Dune | On the radio, driving | Day 3. Have eaten a lizard. Regret the lizard. |
| `board.dune.1.log2` | Dune | On the radio, driving | Have found a lizard. A different one. Am not eating this one. We have an understanding. |
| `board.dune.1.stop` | Dune | Near the plane | Stop right under the wing and wait. I'm going to jump. That's your roof. It'll be fine. It's a very good view, though. |
| `board.dune.1.won` | Dune | Aboard, at the road | Drive. Don't talk about it. And go slowly, I've got something in my coat. |
| `board.dune.2.start` | Dune | Job 2 starts | This is Gerald. It's a lizard. It's morning, so he's cold and slow, because he can't make his own heat. He warms up on a rock. It's why he won't run away. Put the box on your roof. It's sunny up there. |
| `board.dune.2.spill` | Dune | Dropped | You've dropped Gerald. He's fine. He's disappointed. Go back, he won't have moved. He's still cold. |
| `board.dune.2.warm` | Dune | Halfway | He's warmed up. He's looking at me. He does this. |
| `board.dune.2.won` | Dune | Home | I'm not keeping him. I'm only looking after him. For a while. Nobody's to mention it. Where's a good rock? |
| `board.dune.2.dash` | Odessa | Next time in your car | Why's there a lizard on your dashboard? No. Don't tell me. I don't want to know how you've all got so soft. |

### Tusk: The Piano

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.tusk.card` | Card, on the board | The board | Got a piano. Need help. Tusk. |
| `board.tusk.1.start` | Tusk | Job 1 starts | I bought a piano. Off a man in the Boneyard. It's for my auntie. It's two hundred and thirty kilos, nearly all iron. I'm not carrying it. Moss is. You keep them off it. |
| `board.tusk.1.moss` | Moss | Straight after | Bess has carried a good many things. This one's playing notes on every bump. Hold on. |
| `board.tusk.1.rats` | Tusk | Road Rats | They think it's treasure. Tell them it's a piano. No, don't. Hit them. |
| `board.tusk.1.rest` | Moss | Bess resting | She needs a minute. It's the low notes. They upset her. |
| `board.tusk.1.won` | Tusk | At Tin Town | There. Tin Town. Now we only have to get it in. How hard can that be? Hold on. Which one of you built these alleys? |
| `board.tusk.2.start` | Auntie Solder | Job 2 starts | Tusk Brannigan, what is that? You've brought me WHAT? That alley's as wide as my shoulders. Go and look for another way. Go on, the pair of you. |
| `board.tusk.2.aunt` | Tusk | Straight after | She's my auntie. Yes. I know. Don't say anything. Hold F to step out, and walk the alleys. See if there's a gap. |
| `board.tusk.2.one` | Tusk | First alley | Too narrow. That's my shoulder. It went in, but it won't come out. |
| `board.tusk.2.two` | Tusk | Second alley | There's steps. I'm not doing steps. I've done steps. Ask anyone who was under me. |
| `board.tusk.2.three` | Tusk | Third | There. Over the wall, if the scaffold holds. Stand back. I said I wasn't carrying it. I've changed my mind. |
| `board.tusk.2.won` | Auntie Solder | It's in | Well. It's in my kitchen. There's no room for me, but it's in. Does either of you play? No. Tusk, sit down. Press something. |
| `board.tusk.2.song` | Tusk | Straight after | I only know one. It isn't very good. It's the one she taught me. |
| `board.tusk.2.after` | Auntie Solder | Next visit to Tin Town | He practises every morning, and it hasn't got any better. Don't you dare tell him to stop. |

### Cinder: Leftovers

Opens when Old Smoke is beaten. It needs a Long Dry fact only at the end, and that line has a version for each case.

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.cinder.card` | Card, on the board | The board | Some of you know what I used to be. Meet me at the Mall. Bring your seats. Cinder. |
| `board.cinder.1.start` | Cinder | Job starts | Old Smoke's gone, and there's still Ash Men under the mall, the ones nobody told. No boss and no food. I wore that mask for six years. I know exactly how hungry they are. |
| `board.cinder.1.hollis` | Hollis | Straight after | They burned a good many things. You don't owe them. Your call. |
| `board.cinder.1.go` | Cinder | Straight after | Your car only takes two at a time. Stop beside them and wait. Don't get out, and don't hurry them. They've forgotten how to get in a car. |
| `board.cinder.1.one` | Ash Man | First pick-up | Is it you? Are you the new one? What do we burn? Where do we go? |
| `board.cinder.1.two` | Cinder | Straight after | There's nothing to burn. There's soup. Sit down. Mind the seat. |
| `board.cinder.1.three` | Ash Man | Second pick-up | I can mend things. I used to mend things. Before. Do they want anything mended? |
| `board.cinder.1.auntie` | Auntie Solder | First trip home | Those are Ash Men! In my town! They let my forge go cold for a year. Bring them in. Don't you look at me like that. I said bring them in. It's only soup. |
| `board.cinder.1.won` | Cinder | All home | That's everybody. They'll be useless for a while. So was I. Nobody else let me bring the pot, either. |
| `board.cinder.1.after` | Auntie Solder | Next visit to Tin Town | That one's mending my roof. He's terrible. He won't stop. He's got a little hat now. |

### Jax: Something to Harpoon

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `board.jax.card` | Card, on the board | The board | Somebody's got something of mine. I want it back quietly. Harrow. |
| `board.jax.1.start` | Jax | Job starts | You ever wonder why a man's a harpooner, in a desert? My grandad's harpoon. He threw it by hand, out of a little boat, at things as big as this mall. Ash Men took it for a wall decoration. Back of the Dead Mall. |
| `board.jax.1.inside` | Jax | Inside | Keep out of their lamps. It's up on the wall in what used to be a shoe shop. They've hung it the wrong way up. I've got feelings about that. |
| `board.jax.1.alarm` | Jax | Seen | They've seen you! Run! It's a long stick, you can't hide it, so don't try! |
| `board.jax.1.taken` | Jax | Got it | You got it? It's heavier than it looks. That's oak and iron, and it's older than anything out here. Walk it back to the car. |
| `board.jax.1.won` | Jax | At the car | Look at that. There were whales right here, you know. Right where we're standing, for all I can tell. He used to say the sea went out one day and he stayed in a boat for a week, waiting. Daft old man. |
| `board.jax.1.imre` | Jax | Straight after, Captain Imre met | Reminds me of somebody. Sea's late, eh? |

## 4. The job list, as data

This block goes into `src/world/jobs/board-stories.js` (BOARD-JOBS). It has the shape of `src/world/jobs/everburn.js` and uses only steps that exist today: `carry`, `explore`, `onfoot`, `rescue`, `escort` and `heist`. The only additions are `requiresCrew`, two small fields on `carry` and a small set of props, in section 5. A place's `y` is the ground height there. As in Everburn, `easy` blocks only record the Easy numbers, and the step's own numbers must be the ones a child can win.

```js
const place = (id, x, z, radius = 12, y = 0) => Object.freeze({id, position:Object.freeze({x, y, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});
const crewJob = (crew, fields) => Object.freeze({storyId:`board-${crew}`, requiresCrew:crew, unlockAfter:'everburn-get-out-and-walk', ...fields});

const tinTown = place('tin-town', 600, 0, 18, 0), boardPost = place('tin-town-notice-board', 600, -10, 8, 0);
const boneyard = place('boneyard', 424, 304, 18, 1), mall = place('dead-mall', 0, 430, 14, -1), safeRoad = place('safe-road', 230, 150, 16, 1.6);
const mallRoom = place('mall-back-room', -12, 430, 7, -1), flats = place('blast-flat', 300, 60, 14, 1.6);
const planeRow = place('plane-row', 280, 380, 12, -0.7), wingGap = place('wing-gap', 140, 410, 12, -2);
const dunesPlane = place('dune-airliner', 360, 330, 10, 1), dunesRock = place('gerald-rock', 590, 18, 8, 0);
const yard = place('yard-gate', 0, 0, 12, 0);

export const BOARD_JOBS = Object.freeze([
  crewJob('rook', {id:'board-rook-1', number:1, name:'The Long Way Home', kind:'exploring', cardLineId:'board.rook.card',
    lineId:'board.rook.1.start', resultLineId:'board.rook.1.won', easy:Object.freeze({findCount:4, markerRadius:10}),
    steps:[step('explore',{what:'Find what is left of Rook\'s car in the Boneyard.', inOrder:true, finds:[
      Object.freeze({...place('regret-door', 450, 290, 10, 1), hint:'board.rook.1.hint1', lineId:'board.rook.1.found1'}),
      Object.freeze({...place('regret-bonnet', 390, 340, 10, 1), hint:'board.rook.1.hint2', lineId:'board.rook.1.found2'}),
      Object.freeze({...place('regret-engine', 280, 370, 10, -0.7), hint:'board.rook.1.hint3', lineId:'board.rook.1.found3'}),
      Object.freeze({...place('regret-wheel', 330, 300, 10, 1), hint:'board.rook.1.hint4', lineId:'board.rook.1.won'}),
    ]})]}),
  crewJob('rook', {id:'board-rook-2', number:2, name:'The Wheel', kind:'delivery', opensWhen:Object.freeze({jobDone:'board-rook-1'}),
    lineId:'board.rook.2.start', resultLineId:'board.rook.2.won', easy:Object.freeze({crashLimit:10, markerRadius:12}),
    steps:[step('carry',{what:'Take Rook\'s steering wheel to Tin Town.', load:'regret-wheel', origin:place('regret-wheel', 330, 300, 10, 1), destination:boardPost, radius:12, crashLimit:10,
      safePoints:path(place('east-road-halfway', 480, 130, 16, -0.9)), spillLineId:'board.rook.2.spill', arrivalLineId:'board.rook.2.won', closing:['board.rook.2.auntie'], reward:'paint:rooks-regret'})]}),
  crewJob('nell', {id:'board-nell-1', number:1, name:'It\'s Only a Small One', kind:'delivery', cardLineId:'board.nell.card',
    lineId:'board.nell.1.start', resultLineId:'board.nell.1.won', easy:Object.freeze({crashLimit:6, markerRadius:14}),
    steps:[step('carry',{what:'Carry the old dynamite to the flat ground. Gently.', load:'old-dynamite', origin:mall, destination:flats, radius:14, crashLimit:6,
      safePoints:path(place('dynamite-halfway', 150, 240, 16, -0.3)), spillLineId:'board.nell.1.spill', secondGoLineId:'board.nell.1.real', bumpLineId:'board.nell.1.bump', startLineId:'board.nell.1.roof', arrivalLineId:'board.nell.1.won'})]}),
  crewJob('nell', {id:'board-nell-2', number:2, name:'Walk, Don\'t Run', kind:'on-foot', opensWhen:Object.freeze({jobDone:'board-nell-1'}),
    lineId:'board.nell.2.start', resultLineId:'board.nell.2.won', easy:Object.freeze({markerRadius:3}),
    steps:[step('onfoot',{what:'Lay the charge, take the fuse to the flag, then walk to the far flag.', requiresExit:true, radius:3, returnToCar:flats, places:[
      Object.freeze({...place('dynamite-box', 300, 60, 3, 1.6), action:'use', lineId:'board.nell.2.fuse'}),
      Object.freeze({...place('fuse-flag', 306, 60, 3, 1.5), action:'use', lineId:'board.nell.2.walk'}),
      Object.freeze({...place('far-flag', 350, 75, 4, 1), action:'use', lineId:'board.nell.2.wait'}),
    ], wonLineId:'board.nell.2.won', blast:Object.freeze({at:'dynamite-box', radius:6, leavesCrater:true}), reward:'scrap'})]}),
  crewJob('odessa', {id:'board-odessa-1', number:1, name:'Suck, Squeeze, Bang, Blow', kind:'on-foot', cardLineId:'board.odessa.card',
    lineId:'board.odessa.1.start', resultLineId:'board.odessa.1.won', easy:Object.freeze({markerRadius:3}),
    steps:[step('onfoot',{what:'Fix the four things the engine needs.', requiresExit:true, radius:3, returnToCar:boneyard, places:[
      Object.freeze({...place('engine-filter', 408, 288, 3, 1), action:'use', hint:'board.odessa.1.hint1', lineId:'board.odessa.1.done1'}),
      Object.freeze({...place('engine-head', 412, 286, 3, 1), action:'use', hint:'board.odessa.1.hint2', lineId:'board.odessa.1.done2'}),
      Object.freeze({...place('engine-plug', 412, 292, 3, 1), action:'use', hint:'board.odessa.1.hint3', lineId:'board.odessa.1.done3'}),
      Object.freeze({...place('engine-exhaust', 406, 294, 3, 1), action:'use', hint:'board.odessa.1.hint4', lineId:'board.odessa.1.bird'}),
    ], wonLineId:'board.odessa.1.won', reward:'paint:oil-change'})]}),
  crewJob('wren', {id:'board-wren-1', number:1, name:'Where Two Lines Cross', kind:'exploring', cardLineId:'board.wren.card',
    lineId:'board.wren.start', resultLineId:'board.wren.won', easy:Object.freeze({findCount:7, markerRadius:14}),
    steps:[step('explore',{what:'Find Wren\'s seven flags, one at a time.', inOrder:true, opening:['board.wren.how'], foundLineId:'board.wren.found', finds:[
      Object.freeze({...place('wren-flag-1', -200, -150, 14, -1.5), hint:'board.wren.1'}),
      Object.freeze({...place('wren-flag-2', -280, 100, 14, 0.3), hint:'board.wren.2'}),
      Object.freeze({...place('wren-flag-3', 200, 340, 14, -1.4), hint:'board.wren.3'}),
      Object.freeze({...place('wren-flag-4', 400, -140, 14, -0.9), hint:'board.wren.4'}),
      Object.freeze({...place('wren-flag-5', -130, 360, 14, 0.4), hint:'board.wren.5'}),
      Object.freeze({...place('wren-flag-6', 380, 40, 14, 0.6), hint:'board.wren.6'}),
      Object.freeze({...place('wren-flag-7', 40, 60, 14, 0.7), hint:'board.wren.7'}),
    ], reward:'map:wren-marks'})]}),
  crewJob('dune', {id:'board-dune-1', number:1, name:'Day Three', kind:'rescue', cardLineId:'board.dune.card',
    lineId:'board.dune.1.start', resultLineId:'board.dune.1.won', easy:Object.freeze({seats:1, boardSeconds:2}),
    steps:[step('rescue',{what:'Stop right under the airliner\'s wing and wait for Dune.', people:[dunesPlane], seats:1, boardSeconds:2, radius:10, stopSpeed:.5, home:safeRoad, homeRadius:16,
      sayNear:[{place:safeRoad, radius:40, lineId:'board.dune.1.log1'}, {place:boneyard, radius:60, lineId:'board.dune.1.log2'}, {place:dunesPlane, radius:30, lineId:'board.dune.1.stop'}], wonLineId:'board.dune.1.won'})]}),
  crewJob('dune', {id:'board-dune-2', number:2, name:'Gerald', kind:'delivery', opensWhen:Object.freeze({jobDone:'board-dune-1'}),
    lineId:'board.dune.2.start', resultLineId:'board.dune.2.won', easy:Object.freeze({crashLimit:10, markerRadius:10}),
    steps:[step('carry',{what:'Carry Gerald to a good rock at Tin Town.', load:'gerald-box', origin:safeRoad, destination:dunesRock, radius:10, crashLimit:10,
      safePoints:path(place('gerald-halfway', 420, 80, 16, 0.1)), spillLineId:'board.dune.2.spill', sayNear:[{place:place('gerald-halfway', 420, 80, 16, 0.1), radius:30, lineId:'board.dune.2.warm'}], arrivalLineId:'board.dune.2.won', reward:'ornament:gerald'})], nextVisit:['board.dune.2.dash']}),
  crewJob('tusk', {id:'board-tusk-1', number:1, name:'The Piano', kind:'escort', cardLineId:'board.tusk.card',
    lineId:'board.tusk.1.start', resultLineId:'board.tusk.1.won', easy:Object.freeze({truckHealth:120, raiderPressure:'low', breakdownRecovery:'one-rest-then-restart'}),
    steps:[step('escort',{what:'Keep the Road Rats off Big Bess and the piano.', actorId:'big-bess', actor:{id:'big-bess', renderCar:'falcone_heritage', escort:true, health:120, speed:9, path:path(boneyard, safeRoad, tinTown)}, path:path(boneyard, safeRoad, tinTown), destination:tinTown,
      speed:9, health:120, restLineId:'board.tusk.1.rest', restartFrom:'last-marker', raiders:path(place('piano-raid-1', 360, 270, 12, 1), place('piano-raid-2', 500, 90, 12, -0.8)), afterStartLineId:'board.tusk.1.moss',
      sayNear:[{place:place('piano-raid-1', 360, 270, 12, 1), radius:40, lineId:'board.tusk.1.rats'}], wonLineId:'board.tusk.1.won'})]}),
  crewJob('tusk', {id:'board-tusk-2', number:2, name:'It Won\'t Go In', kind:'on-foot', opensWhen:Object.freeze({jobDone:'board-tusk-1'}),
    lineId:'board.tusk.2.start', resultLineId:'board.tusk.2.won', easy:Object.freeze({markerRadius:3}),
    steps:[step('onfoot',{what:'Walk Tin Town\'s alleys and find a way in for the piano.', requiresExit:true, radius:3, returnToCar:tinTown, startLineId:'board.tusk.2.aunt', places:[
      Object.freeze({...place('piano-alley-1', 612, 2, 3, 0), action:'use', lineId:'board.tusk.2.one'}),
      Object.freeze({...place('piano-alley-2', 620, 10, 3, 0), action:'use', lineId:'board.tusk.2.two'}),
      Object.freeze({...place('piano-alley-3', 612, 14, 3, 0), action:'use', lineId:'board.tusk.2.three'}),
    ], wonLineId:'board.tusk.2.won', closing:['board.tusk.2.song'], reward:'tin-town-piano'})], nextVisit:['board.tusk.2.after']}),
  crewJob('cinder', {id:'board-cinder-1', number:1, name:'Leftovers', kind:'rescue', cardLineId:'board.cinder.card', opensWhen:Object.freeze({jobDone:'everburn-the-everburn'}),
    lineId:'board.cinder.1.start', resultLineId:'board.cinder.1.won', easy:Object.freeze({seats:2, boardSeconds:2}),
    steps:[step('rescue',{what:'Bring the Ash Men from the mall to Tin Town, two at a time.', opening:['board.cinder.1.hollis', 'board.cinder.1.go'],
      people:[place('ash-man-1', 18, 418, 8, -1), place('ash-man-2', -22, 412, 8, -1), place('ash-man-3', 30, 440, 8, -1), place('ash-man-4', -34, 440, 8, -1)], seats:2, boardSeconds:2, radius:8, stopSpeed:.5, home:tinTown, homeRadius:18,
      peopleLineIds:['board.cinder.1.one', 'board.cinder.1.three'], afterFirstLineId:'board.cinder.1.two', sayNear:[{place:tinTown, radius:60, lineId:'board.cinder.1.auntie'}], wonLineId:'board.cinder.1.won', reward:'scrap'})], nextVisit:['board.cinder.1.after']}),
  crewJob('jax', {id:'board-jax-1', number:1, name:'Something to Harpoon', kind:'heist', cardLineId:'board.jax.card',
    lineId:'board.jax.1.start', resultLineId:'board.jax.1.won', easy:Object.freeze({lampRange:10, alarmIsFailure:false, walkSpeed:1}),
    steps:[step('heist',{what:'Take the harpoon from the back of the Dead Mall and carry it to your car.', takeId:'jax-harpoon', zone:mallRoom, carPlace:mall, carRadius:18,
      escapePlace:mall, escapeRadius:18, walkSpeed:1, lamps:[place('harpoon-lamp-1', -25, 420, 12, -1), place('harpoon-lamp-2', 10, 444, 12, -1)], coneDegrees:65, alarmWaveSize:2,
      alarmLineId:'board.jax.1.alarm', startLineId:'board.jax.1.inside', takenLineId:'board.jax.1.taken', wonLineId:'board.jax.1.won', closing:['board.jax.1.imre'], reward:'paint:whaler'})]}),
]);
```

## 5. What the new pieces do

- **`requiresCrew`.** The board shows a story's card only when `availableCrew(profile)` includes that person. It reads the rule and never changes it. Jobs follow `unlockAfter` and `opensWhen` as other side jobs do.
- **`bumpLineId` and `secondGoLineId`** on `carry`. The first plays once, on the first knock that does not spill the load. The second plays when the job restarts after a spill. Both are optional, and no existing job sets them.
- **The board.** The Tin Town board lists these beside the three side jobs it has now. Each story's card line is shown in that person's handwriting, picked from a font that ships with the game, or simply in quotes with their name if none suits. A finished story's card stays, with a tick, and its jobs can be replayed for a little scrap, without giving the reward twice.
- **Rewards go through the existing side-job settlement.** New paints use the paint list from SKIN-WASTE. `ornament:gerald` is a small lizard on the dashboard, view only. `tin-town-piano` is a sound: the very bad song plays faintly, near Auntie Solder's. `map:wren-marks` adds the seven flags to the map.
- **`blast`** on Nell's last step: when the last place is reached, the game's own explosion effect at that place, and a crater decal. On Scablands with the edit layer, a real shallow pit is welcome (`docs/MACHINES.md` section 10), and it needs no more than `cut`.
- **Props.** WW-ART-CREW: the box of dynamite, Regret's four bits, the engine with its head off and a bird in the pipe, Wren's flag, Dune's airliner with no ladder, Gerald and his box, the piano on Big Bess, the harpoon on a shoe shop's wall. A small set: almost everything else is already on the map.
- **The Ash Men as people.** `board.cinder.1.after`'s man stands in Tin Town in a little hat, in view only. Later, if a town exists, the four can go in the Book by name, but nothing here waits for that.

**Sound.** Reuse banks first. New cues: `board.piano` (a very bad upright, a few notes for each bump on Big Bess), `board.song` (one bad tune), `board.engine-start` (reuse an engine bank), `board.fuse` (a long hiss, then the game's own big blast).

## 6. Removed

Nothing. The three side jobs on the board stay as they are.
