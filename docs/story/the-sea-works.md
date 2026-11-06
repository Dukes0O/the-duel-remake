# Act 5: The Day the Sea Came Back

Claude, 5 November 2026. The end of the first great arc of `docs/story/the-long-dry.md`, across game Years 18 to 25 or so of a town. Every
line, every part and every job. Where this page and the Long Dry differ on a detail of Act 5, this page wins. Kyle and Gratian can overrule anything.

## 1. The story in one breath

Hollis said he could open it and would need a lot of help. So you build the Sea Works, the biggest job anyone has ever tried out here: years of steel,
wages and people. Children from the school run the sites. Old Tam gets a goat he is owed. Magnus finally gets asked for his magnet. Auntie Solder casts a
new gear in 24 sections, because no forge alive can pour it in one, and the Mule hauls it across the map while the Clean Fleet tries to stop it. You
fly the last section up to the gate on Kestrel One's hook. Every warlord you made peace with turns up at the dam. Mrs Vane comes in person, for the first
and only time, and asks Hollis very nicely to stop. He says no, ma'am, and turns the wheel. You are the last one on the lake bed, and you drive for the shore
with the sea behind you. A fortnight later the ships lift. Captain Imre finally has something to report. And after twenty years of asking, Bo gets his answer.

**The fortnight.** The whole arc turns on one word. They told a boy of nineteen the gate would be shut for a fortnight. Brian works out on the radio how long the sea takes to come back, using real numbers, and the answer is about a fortnight. Hollis's last entry in the gate log reads, "Sea gate open. Back on duty."

## 2. The parts and the pace

The Sea Works is about 2,000,000 worker hours and 400 tonnes of steel. A hundred people working full days put in about 240,000 hours a year, so that is more than eight years
for a town of ordinary size, and quicker with a bigger town. People who were children in Act 2 run it. Some who start it do not see it finished, and their names go in the Book (the town's own people, from the sim, never a named character unless this page says so).

Every part opens at the start, and they are done in whatever order you like, with these exceptions: the pour needs the old gear's pattern, the haul needs the pour, the lift needs the haul, and the line, the wheel, the convoy and the last run come at the end, in that order. A site short of steel stops and says so, and the town goes on around it.

| Part | What has to be true | What it is | Real work | Job |
| --- | --- | --- | --- | --- |
| **The Fund** | Chapter 23 done | A line in the Ledger. The Vultures, or Mr Pell if they were driven off, say what it costs and what it is worth | Rent, sets and trade, for years. It never asks for a lump sum, and it pays wages as work is done | None |
| **The Dam Road** | | A paved road from your north gate to the dam, so trucks can get there | About 600 m. Your first go on the dozer and roller, then your apprentices (`docs/MACHINES.md`) | Machines |
| **The Works Camp** | The Dam Road | Homes and a kitchen for 200, on the lake bed under the dam | 40,000 worker hours | None |
| **Hull Patch** | Deck Town standing 30 or more | Every hull made fit to float | Plate, 60 tonnes, five years of the Deck Folk's own work | Side job |
| **The Causeway** | | Pim's line lifted above where the sea will be, so the railway survives. A bank of stone 800 m long and about 4 m high across the bed | 80,000 tonnes of stone. Quarry, crusher, dump trucks, dozer. Your first load, then a crew | Machines |
| **The Harbour Wall** | The Dam Road | Your town sits barely above where the sea will be. The old harbour wall is under the sand. Dig it out, raise it, and put gates in it for the roads | About 900 m. 100,000 worker hours, 6,000 tonnes of stone. The gates stay open until the convoy | None |
| **The Gas Line** | | A pipe from the Everburn to the dam, for the gate's boilers | About 700 m of 200 mm pipe: 84 tonnes. Your first trench, then Bo | Machines |
| **The Long Ember** | The Gas Line | Carry a flame from the Everburn to light those boilers | | Job 1 |
| **Finally** | The Works Camp | Bring Magnus and his crane to lift the old gear out of the silt | A week of slow lifting | Job 2 |
| **The Pour** | Finally | Twenty-four sections at Tin Town, one pour at a time, each cooled for two weeks | About a year. 34 tonnes of steel, and the old gear is the pattern | Job 3, for the first section. Auntie Solder's people do the rest |
| **The Haul** | The Pour | The Mule brings all 24 sections to the dam on one run | | Job 4 |
| **The Lift** | The Haul, and the Helipad | Up from the rail head to the gate's gearbox, where no crane reaches | 24 flights. You fly the first, teach Dune or an apprentice, and fly the last | Job 5 |
| **The Spillway** | | Decades of wrecks jammed in the channel, cleared in front of a crowd | One big show | Job 6 |
| **The Line** | Everything above finished | She sends everything she has | | Job 7 |
| **The Wheel** | The Line held | Vesper and Isolde read the codes. Hollis takes the wheel | | Job 8, no driving |
| **The Convoy** | Straight after | Everyone off the bed before the water comes | | Job 9 |
| **The Last Run** | Straight after | The sea, behind you | | Job 10 |
| **A Fortnight** | Straight after | The town on the shore, day by day. The ships lift | | Scene |

Between these, Mrs Vane's Clean Fleet raids the works about twice a year (reports, `TOWN-DEFEND`), and she keeps writing.

**The real numbers.** Every line keeps to these.

| Thing | Number | Where it comes from |
| --- | --- | --- |
| A year's work | 100 people × 8 hours × about 300 days = 240,000 hours | Simple arithmetic |
| The new gear | 24 sections of 1,400 kg, about 34 tonnes, about 7 m across | Very large gears really are cast in sections and bolted together, because no one pours them whole |
| Kestrel One's hook | 1,500 kg, which is why a section is 1,400 kg | `src/heli/heli-cable.js` |
| Cooling a big casting | About two weeks | A big casting cooled too fast cracks |
| Gas pipe | 700 m at 120 kg a metre, about 84 tonnes | `docs/WASTELAND_TOWN.md` section 14, the 200 mm pipe |
| The Causeway | 800 m long, 4 m high, 6 m wide on top and 22 m at the foot: 56 m² × 800 m ≈ 45,000 m³, at about 1.7 tonnes a m³, so about 80,000 tonnes | Crushed stone in a bank |
| The Mule with the gear | 100 tonnes empty + 34 = 134 tonnes | `docs/story/iron-mule.md` |
| The sea behind the dam | About 20 km³ to fill the basin: 1,000 km² at an average depth of 20 m | Round numbers for a small sea. Everyone is told they are round |
| The gate | 40 m wide, 20 m high. Ocean about 30 m above the bed outside it, so water comes through at about 24 m/s: speed = √(2 × 9.8 × 30). That is about 19,000 m³ every second | Real water through a hole |
| That flow | About as much as the Mississippi carries at its mouth | About 17,000 m³ a second |
| How long | 20 km³ ÷ 19,000 m³ a second ≈ 12 days, slowing as it fills, so **about a fortnight** | Brian's sum |
| The front of the water | About 120 km/h at first: twice √(9.8 × 30) m/s, about 34 m/s. It is at its tallest at the dam and gets lower as it spreads | Real dam-break waves |

## 3. Who is where by now

The town's calendar is the truth, so ages below are for Year 22 or so, and lines that give an age read it from the town.

| Who | Now | How to handle it |
| --- | --- | --- |
| **Hollis** | About seventy-two. Slow on stairs, not much slower at anything else | Still uses as few words as possible |
| **Bo** | About twenty-six, with his own very good truck | Runs a site. Still asks. Has apprentices of his own who ask him |
| **Miss Quill** | Very old. Teaches from a chair | Has a line saved |
| **Pim** | Old, and still on time | **This is the third Tuesday.** `sea.haul.tuesday` says so |
| **Captain Imre** | Very old. Has never missed a watch | Reports |
| **Old Tam** | Older than anyone knows | Lives to see it. Gets his goat |
| **Isolde** | About eighty-three, and as sharp as ever | Runs the Drawing Office. Vesper is about forty-eight |
| **Odessa, Jax, Nell, Cinder and the crew** | Grey | Same words |
| **Mr Crisp** | Over seventy. Still apologising | Tells you he has written it all up, and hands it in |
| **Mrs Vane** | Nobody knows | She looks exactly the same |

## 4. Every line

Rules: `docs/story/the-long-dry.md` section 9. Ids go in `src/story/sea-lines.js`, built as `src/story/ember-lines.js`: captions with the radio click, no voice file, no new cue, except the bell, `town.bell`.

### The start, and the Fund

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.start.hollis` | Hollis | Next visit after the gatehouse | The gate's stuck, driver. Its big gear rotted in the silt before you were born. Its boilers are dead. There's a channel full of wrecks in the way, and she'll fight us for every bit of it. |
| `sea.start.isolde` | Isolde | Straight after | I have drawn it. Two million hours of work and four hundred tonnes of steel. A hundred people would take more than eight years. Your town has grown. Do hurry. |
| `sea.start.odessa` | Odessa | Straight after | Eight years, she says. I've mended things for longer than that. Right. Where do you want the first trench? |
| `sea.fund.vultures` | The Vultures | The Fund, at peace | Two columns. What it costs is in that one. What a sea is worth is in the other. Fish, salt, trade and every boat that ever wants to park. We ran it twice. We got two answers. Both are very large. |
| `sea.fund.pell` | Mr Pell | The Fund, Vultures driven off | I've done the sum, and we can't afford it. I've also worked out what a sea is worth, and we can't afford not to. I have put both in the Ledger. I'd like a bigger desk. |
| `sea.fund.toll` | The Tollkeeper | When you hold 12 deeds | I looked it up. There's a deed for the ground under the sea, and she holds it. There has never been a deed for the sea itself. Nobody thought to write one. She'll be very cross, in a very calm way. |
| `sea.vane.letter1` | Mrs Vane (letter) | The first site opens | Dear Neighbour, I see you have begun digging near my dam. I do hope you know what you are doing. Mr Hollis did not, as I recall. Kind regards. |
| `sea.vane.letter2` | Mrs Vane (letter) | About a year on | Dear Neighbour, I must tell you that from now on I will be sending more than letters. Please do not take it personally. Mr Crisp will explain, and apologise. Kind regards. |
| `sea.crisp.fleet` | Mr Crisp | First raid on the works | So sorry. These are all the trucks she has. It's called the Clean Fleet. I did suggest another name. Nothing personal. |
| `sea.quill.names` | Miss Quill | A person from the town dies during the works | {name} started on the Dam Road. I taught {name} to read. Put it in the Book, please, and spell it properly. |
| `sea.bo.site` | Bo | Bo runs his first site | They've given me a whole trench and six people. One of them asked if he could drive my digger. I said no. It felt terrible. Can I drive it now? |

### The sites

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.road.start` | Odessa | The Dam Road opens | Nothing gets to that dam without a road. You know the dozer. Do the first stretch, take someone with you, and they can do the rest. |
| `sea.camp.done` | Hollis | The Works Camp finished | Two hundred people asleep on the lake bed, in a town built to be drowned. I told them about that. They said to mind the kitchen. |
| `sea.hull.imre` | Captain Imre | Report: Hull Patch opens | Deck Town, forenoon watch. Every plate on these ships has been chipped and painted, every year, for {aground} years. That is what the watch was for. Five years' more work, and she'll float. Nothing to report. |
| `sea.hull.vesper` | Vesper | Straight after | All those years, you were keeping them ready? You knew? |
| `sea.hull.imre2` | Captain Imre | Straight after | I knew she was late. |
| `sea.cause.pim` | Pim | Report: the Causeway opens | I have seen your plans, and my line runs across the bottom of your sea. I will not have the 2:15 cancelled due to water. I want a bank of stone, eight hundred metres long, and four high. |
| `sea.cause.odessa` | Odessa | Straight after | That's eighty thousand tonnes of stone. He's right, mind. Get the quarry going, and put your first load down yourself so they can see where it goes. |
| `sea.cause.done` | Pim | The Causeway finished | The first train across will run at walking pace. So will the second. I've told the fish. |
| `sea.wall.start` | Isolde | Report: the Harbour Wall opens | Your whole town sits about a metre above where the sea is going to be. I did mention that. There is an old harbour wall under the sand. Dig it out and raise it, with gates for the roads. |
| `sea.wall.done` | Odessa | The wall finished | That's the wall up, and gates in it. We shut the gates when the water's coming, and not before. Somebody write that down somewhere nobody can lose it. |
| `sea.gas.cinder` | Cinder | Report: the Gas Line opens | Those boilers need more gas than a pot can carry. So we pipe it from the well. Dig me seven hundred metres, and don't crack it. It's been burning for a hundred years. It's not patient. |
| `sea.gas.bo` | Bo | Bo learns the trencher | Show me once. Only once. I've been watching you for twenty years. |

### Job 1: The Long Ember

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.ember.start` | Cinder | Job starts | Pipe's done. Now somebody lights those boilers with fire from the Everburn, in the pot, on your roof. The whole way round the map, because her people have the west road. You've done this. You were younger. |
| `sea.ember.match` | Odessa | Straight after | You could light a boiler with a match, you know. |
| `sea.ember.match2` | Cinder | Straight after | I could. |
| `sea.ember.dome` | Cinder | Past the town | That's your town, going by. There were twelve of them when you started. Don't hit it. |
| `sea.ember.auntie` | Auntie Solder | At Tin Town | Slow down. Let me feed it. I lit my forge off that pot a long time ago. There. It'll get you to the dam if you don't do anything stupid. So be careful of that. |
| `sea.ember.fleet` | Mr Crisp | Clean Fleet on the bed | So sorry. Would you mind awfully stopping? I've been told to put that out. It seems a shame. |
| `sea.ember.spill` | Cinder | Pot spilled | That's the pot on the road. Go back to the last place you were safe. I'm not angry. I'm never angry. I'm on fire. |
| `sea.ember.imre` | Captain Imre | Passing Deck Town | Deck Town, afternoon watch. Car going by with its roof on fire. Nothing to report. |
| `sea.ember.won` | Cinder | At the boilers | Open the valve. There. That's a hundred years of fire, and it's finally doing a job. Nobody else lets me bring the pot. |

### Job 2: Finally

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.magnus.ask` | Isolde | Job starts | The old gear weighs forty tonnes, and it's under two metres of silt. There is only one magnet in the Wasteland big enough. I'm told you know the man. Do ask him nicely. |
| `sea.magnus.yes` | Magnus | You ask | Finally. Someone who understands. For years I've built a bigger one, and people have complained about their roofs. Where is this gear? How big? Oh. OH. |
| `sea.magnus.go` | Hollis | Straight after | He's on his way. It's not a fast crane. Keep the Fleet off him, and keep your forks in a drawer. |
| `sea.magnus.town` | Odessa | The crane nears the town | MIND THE ROOFS! Everyone hold on to your roofs! |
| `sea.magnus.bump` | Mr Crisp | Fleet on the crane | So sorry, I can't seem to get near him. My pickup keeps going sideways. Oh dear. Now it's going up. |
| `sea.magnus.stuck` | Magnus | Crane stopped | I must rest the magnet. It is tired. It has been lifting. It is not sulking. |
| `sea.magnus.there` | Magnus | At the gate | Stand back. Everyone stand back! No, further. Everyone metal, stand a lot further back. |
| `sea.magnus.up` | Hollis | The lift | That's the old gear. I greased that, once. |
| `sea.magnus.won` | Magnus | Lifted | EVERYTHING metal comes to Magnus. Today it was the right thing. Do not tell anyone I was useful. |
| `sea.magnus.stay` | Isolde | Straight after | Have it taken to Tin Town. Auntie Solder needs it for a pattern. And thank you. |
| `sea.magnus.stay2` | Magnus | Straight after | Nobody has said that before. I will build a bigger one. |

### Job 3: The Pour

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.pour.start` | Auntie Solder | Job starts | I can't pour forty tonnes at once. Nobody can. So it's twenty-four sections, about fourteen hundred kilos each, bolted up on site. They all have to fit. Get out of your car and work the three levers. |
| `sea.pour.why` | Isolde | Straight after | That's the weight Kestrel One can carry on her hook. I did the sum before I drew it. Your Auntie Solder asked me if I wanted a medal. |
| `sea.pour.exit` | Auntie Solder | Still in the car | You can't pour steel from inside a car. I've seen it tried. Hold F. |
| `sea.pour.lever1` | Auntie Solder | First lever | Tip the ladle. Slowly. Steel at this heat doesn't forgive anybody. |
| `sea.pour.lever2` | Auntie Solder | Second lever | Open the gate on the mould. There she goes. Look at that. Don't look at that. It'll hurt your eyes. |
| `sea.pour.lever3` | Auntie Solder | Third lever | Close it. That's one. Now nobody touches her for two weeks, because a big casting cooled in a hurry cracks right through. |
| `sea.pour.won` | Auntie Solder | Job won | That's one down and twenty-three to go. My people can do the rest. It's most of a year, and I won't be hurried. Stop asking. Nobody asked. Stop looking like you're going to. |
| `sea.pour.done` | Auntie Solder | Report: all 24 cast | They all fit! Every one of them, first try. I've been doing this since before you could drive. Come and get them before I start showing them to people. |

### Job 4: The Haul

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.haul.start` | Pim | Job starts | Today's working: Tin Town to the dam, with thirty-four tonnes of gear. Jax has the throttle. You will ride up top with the harpoon. Here is the token. Keep it safe. I've been waiting to give you that again. |
| `sea.haul.tuesday` | Pim | Straight after | This is Tuesday. Her grandmother was Tuesday. It's less to write on the timetable. |
| `sea.haul.jax` | Jax | Rolling | A hundred and thirty-four tonnes, and I can feel every one. I can't stop her fast, so don't ask. If they get on the line, you're going to have to go and shift them. |
| `sea.haul.first` | Mr Crisp | First attack | So sorry. These are my last good trucks, and I am asked to derail you. Please don't take it personally. |
| `sea.haul.block` | Jax | Wreck on the line | They've parked a truck on the line! I can't stop in time and I can't go round! Jump down and clear it. You've got till I get there, and I'm slowing as hard as she'll let me. |
| `sea.haul.exit` | Pim | On the ground | There's a lever for the old siding, right beside you. Throw it, and it will send her round the wreck. Tuesday will show you. Tuesday does not take after her grandmother. She's much quicker. |
| `sea.haul.clear` | Jax | Points thrown | That's the way! Grab hold as I go by. I'm not stopping for anyone. Sorry. I've been around Crisp too long. |
| `sea.haul.nell` | Nell | Second block | I made another charge. It's only a small one. Jax, tell them it's only a small one. |
| `sea.haul.fall` | Jax | Left behind | I can see you back there, waving. Come on. She's only doing walking pace now. I'm not stopping, but I am embarrassed. |
| `sea.haul.causeway` | Pim | On the Causeway | There's the bank. Eighty thousand tonnes of stone and not a drop of sea, as yet. I'd slow down. I would like it noted that I said so. |
| `sea.haul.won` | Pim | Stopped at the rail head | All twenty-four sections, at the dam. On time. I have written that down twice, in case the first was a dream. |

### Job 5: The Lift

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.lift.start` | Isolde | Job starts | The gearbox is high up on the dam, where no crane can reach. Each section goes up on a hook, one at a time. It's fourteen hundred kilos and it swings. You fly the first. |
| `sea.lift.roger` | Roger | First lift | Kestrel One, Tremblant. Say again your load? I've got you down for one gear section, over a dam, in a desert. I've stopped asking. Mind the swing. Move slowly, and she'll settle. |
| `sea.lift.swing` | Roger | The load swings hard | It's swinging, Kestrel One. Don't chase it. Hold still over the spot and let it come back to you. Brian has a whole lesson on this, and I know you did it. I've seen your marks. |
| `sea.lift.dropped` | Roger | The load is set down badly | That's the load on the ground, Kestrel One. It's fine. It's steel. Hook on again. |
| `sea.lift.taught` | Dune | First section set | I watched that. I watched it twice. I don't fly, but I know a man who owes me a helicopter, and I reckon I can do the next twenty-two. Go and do something else. |
| `sea.lift.nopilot` | Dune | No pilot | I'll fly them up. All of them, if you like. I've got a helicopter now. Don't ask. Come back for the last, if you've had the lessons. It's only right. |
| `sea.lift.report` | Isolde | Report: 23 sections up | Twenty-three up and bolted. They're all true to the width of a hair. There's one left, and it's yours. |
| `sea.lift.last` | Hollis | The last section | Bring it up steady, driver. |
| `sea.lift.won` | Isolde | Set | That's the wheel whole, for the first time in {aground} years. Hollis, take your hat off. No, leave it on. I don't know what I'm saying. |
| `sea.lift.hollis` | Hollis | Straight after | Yes, ma'am. |

### Job 6: The Spillway

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.spill.isolde` | Isolde | Report | That channel has been filling with wrecks for {aground} years, every one of them somebody's bad day. If the water can't run off down the spillway, it goes over the dam's shoulder and the dam goes with it. |
| `sea.spill.mo` | Big Mo | Job starts | LADIES AND GENTLEMEN AND ALSO DOGS! TONIGHT, ONE NIGHT ONLY, AT THE BOTTOM OF A DAM! EVERY TRUCK IN THE WASTELAND! AND THEY'RE ALLOWED! IT'S FOR SCIENCE! |
| `sea.spill.crowd` | Dot | Straight after | I've brought pies. I've sold every one. Get on with it, I've got a good view. |
| `sea.spill.rival` | Big Mo | A rival truck joins | THAT'S {truck}, FOLKS! THE WORST OF ENEMIES, ALL OF THEM! TONIGHT THEY ARE PUSHING IN THE SAME DIRECTION! I AM VERY MOVED! |
| `sea.spill.half` | Big Mo | Half cleared | HALFWAY! THE WRECK COUNT IS FALLING! THE CROWD IS STANDING! SOME OF THEM HAVE ALWAYS BEEN STANDING! THERE ARE NOT MANY SEATS! |
| `sea.spill.bo` | Bo | Three quarters | That's a very good truck, you know. It's mine. I'm driving it. I just wanted to say so, where people could hear. |
| `sea.spill.won` | Big Mo | All clear | THE CHANNEL IS CLEAR! THANK YOU AND GOOD NIGHT! PLEASE TAKE ALL YOUR PIECES OF CAR WITH YOU! |
| `sea.spill.hollis` | Hollis | Straight after | That'll do. |

### Job 7: The Line

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.line.letter` | Mrs Vane (letter) | Report: the line opens | Dear Neighbour, I understand you are nearly finished. I am coming to see you. I shall bring everyone. Please do not go to any trouble. Kind regards. |
| `sea.line.hollis` | Hollis | Job starts | That's all of it, coming across the bed. Everything she's got. We've got this dam, and whoever comes. Stand by the gate, driver. Don't let them near the wheel. |
| `sea.line.crisp` | Mr Crisp | First wave | So very sorry. Every truck, I'm afraid. Nothing personal. I do mean that. |
| `sea.line.count` | Odessa | Between waves | Don't look at how many. Look at the next one. |
| `sea.line.sal` | Sawtooth Sal | At peace, arrives | Nobody cuts this pipe but me. Who's first? |
| `sea.line.dust` | The Dustmonger | At peace, arrives | I brought dust! My dust! It's definitely mine! Everybody get in it! |
| `sea.line.mirage` | Mother Mirage | At peace, arrives | Look, darling. Over there, on the ridge. A hundred more trucks! They're boards. She doesn't know that. |
| `sea.line.gunn` | Gearhead Gunn | At peace, arrives | I brought the turret. I've had a word with it. Everybody please stand behind me. No, in front of me. |
| `sea.line.kettle` | Kettle Kingpin | At peace, arrives | Stand still. It hurts less. I've brought the big drill. |
| `sea.line.vultures` | The Vultures | At peace, arrive | There were forty of them. Now it's thirty-eight. Or forty. Do the math. |
| `sea.line.tusk` | Tusk | In the crew | Heh. Forty trucks. Is that all? |
| `sea.line.none` | Hollis | Nobody at peace | Nobody's coming. That's all right. I've kept a gate alone before. |
| `sea.line.enemy` | Mr Crisp | One you drove off is on her side | So sorry. {warlord} is with us today. You may recall the circumstances. I did write them up. |
| `sea.line.magnus` | Magnus | The last wave | EVERYTHING METAL COMES TO MAGNUS. EVERYTHING. I HAVE UPGRADED. YOU ARE ALL METAL. |
| `sea.line.magnus2` | Odessa | Straight after | He's got every white truck she owns stuck to one magnet. And our gate. Tell him to mind our gate! |
| `sea.line.restart` | Odessa | They reached the wheel | They got to the wheel! Once more, from the start of that lot. |
| `sea.line.won` | Hollis | Waves over | That's the lot. Nobody move. Somebody's coming up the road. |

### Job 8: The Wheel

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.wheel.start` | Isolde | Job starts | First half of the codes. I have had them in my head for most of my life, and I would like them out. Read me the gate log, Vesper. |
| `sea.wheel.codes` | Vesper | Straight after | Four, eleven, nine. Open the steam. Seven, seven, two. Open the second. That's the lot, Mother. Is it meant to make that noise? |
| `sea.wheel.steam` | Cinder | Straight after | You've got steam. You've got a lot of steam. If anyone wants to do something, do it now. |
| `sea.wheel.vane` | Mrs Vane | She walks up the steps, in person | Good afternoon, Mr Hollis. You have kept that gate very well, for a very long time. I do hope you will go on. |
| `sea.wheel.driver` | Mrs Vane | Straight after | You must be the neighbour. How do you do. I have so enjoyed our letters. |
| `sea.wheel.isolde` | Mrs Vane | Straight after | Isolde. You look well, for a dead woman. Your handwriting has got worse. |
| `sea.wheel.isolde2` | Isolde | Straight after | Hello, Prudence. |
| `sea.wheel.ask` | Mrs Vane | Straight after | Mr Hollis, you were told it was for a fortnight. I am sorry about that. I am asking you, very nicely, to leave it shut. |
| `sea.wheel.no` | Hollis | Straight after | No, ma'am. |
| `sea.wheel.see` | Mrs Vane | Straight after | I see. Kind regards. |
| `sea.wheel.crisp` | Mr Crisp | She goes. He stays | So sorry. I've written it all up, every year of it, every invoice. I don't believe I want it any more. Would you give this to Mr Pell? And I am sorry. I did always mean that. |
| `sea.wheel.help` | Vesper | Hollis at the wheel | It's as big as a house, Hollis. It took six men to shut it. Let somebody help you. |
| `sea.wheel.hollis` | Hollis | Straight after | I shut it. |
| `sea.wheel.brian` | Brian | On the radio | Brian here. I've done the sum. Twenty cubic kilometres to fill, and that gate lets through nineteen thousand cubic metres a second, about the same as the Mississippi. That's twelve days, slowing as it fills. |
| `sea.wheel.brian2` | Brian | Straight after | So, call it a fortnight. |
| `sea.wheel.hollis2` | Hollis | Straight after | I've heard that before. |
| `sea.wheel.turn` | Hollis | He starts to turn it | Get everyone off that bed, driver. You've got until I finish, and I am not as quick as I was. Go on. |

### Job 9: The Convoy

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.convoy.start` | Odessa | Job starts | Every truck we own, and two hundred people in the Works Camp, and half the town down here to watch. Lead them out along the Dam Road and through the wall, and don't let anybody stop to take a picture. |
| `sea.convoy.names` | Odessa | Straight after | Look at who's driving. That's {child1}, and {child2} behind. I remember them with their first teeth. Their parents walked in here with nothing. |
| `sea.convoy.short` | Dot | The last truck | That big flatbed's got forty children on it and nobody at the wheel! Who's meant to be on that truck? |
| `sea.convoy.quill` | Miss Quill | Straight after, from the back of the flatbed | Bo. Get in the truck. |
| `sea.convoy.bo` | Bo | Straight after | Yes, Miss. |
| `sea.convoy.bo2` | Bo | Straight after | I've been waiting my whole life for somebody to say that. |
| `sea.convoy.rumble` | Hollis | Convoy nearly off | It's moving. It's moving, driver. Where are you? |
| `sea.convoy.won` | Odessa | The last truck up the shore | That's everybody. That's all of them, I counted. Hold on. Where's Imre's lot? Where's the driver? |

### Job 10: The Last Run

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.run.imre` | Captain Imre | Job starts | Deck Town, afternoon watch. The Deck Folk are staying with their ships. It's what they're for. There are two lookouts at the far end of the bed, under the dam, who haven't heard, and you're the last car down here. |
| `sea.run.rescue` | Pim | First leg | They're in the old wreck under the dam. Pick them up. Don't stop for long. I would not stop for long. |
| `sea.run.gate` | Hollis | Straight after | She's open. |
| `sea.run.brian` | Brian | The water | The front of that is doing about a hundred and twenty kilometres an hour. It's taller than a house at the dam, and it gets lower as it spreads. You can go faster than that. So drive. |
| `sea.run.roger` | Roger | Kestrel One overhead | Kestrel One to the car on the lake bed. I've got eyes on you, and on it. I wouldn't look behind you. I am looking behind you. Don't look behind you. |
| `sea.run.deck` | Captain Imre | Passing Deck Town | Deck Town, afternoon watch. Nothing to report, yet. |
| `sea.run.mo` | Big Mo | On the shore | LADIES AND GENTLEMEN! AND ALSO DOGS! THERE IS A CAR! AND BEHIND THE CAR IS THE SEA! I HAVE NOTHING TO ADD! |
| `sea.run.shut` | Odessa | First leg | We've shut every gate but the east ramp. We had to, or we'd lose the town. So that's your way out, right across the bed. Go on! |
| `sea.run.left` | Odessa | Near the ramp | There's the ramp! Up, up, up! Go on, go on, go on! |
| `sea.run.caught` | Odessa | The water caught you | You're floating. That's not a thing cars do. Somebody fished you out, and it's only your pride. Back to the last marker, and this time, don't let it catch up. |
| `sea.run.won` | Bo | Up the ramp | Is that your real car? It's got a fish in it. Can I drive it now? |
| `sea.run.tam` | Old Tam | Straight after | Mad. I told you. Seas don't dry up in a fortnight. I never said they don't come back in one. |
| `sea.run.goat` | Hollis | On the radio, Old Tam on the shore | Tam. There's a goat for you at the gate. |
| `sea.run.goat2` | Old Tam | Straight after | About time. |

### A Fortnight

The town comes down to the shore. This scene runs as day captions over a moving view of the water rising and the ships beginning to stir, about two minutes altogether. Any key moves it along.

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.day.1` | Screen | Day 1 | Day 1. It's brown, and there's a great deal of it. |
| `sea.day.2` | Brian | Day 2 | It's rising about a metre and a half a day. I'm getting up at dawn to look, and I don't need to. I just want to. |
| `sea.day.3` | Hollis | Day 3 | Still turning that valve. Nobody asked me to. Somebody ought to keep an eye on it. |
| `sea.day.4` | Dot | Day 4 | I've moved the pie stand twice now. Everyone's sitting on the shore and nobody's doing a thing. I've never sold so much in my life. |
| `sea.day.6` | Ana | Day 6, on the radio | Ana here, up at the Kelp Coast. Driver? What on earth did you do? The fish are all going north. |
| `sea.day.7` | Barely News | Day 7 | Just the bear facts: a sea has appeared. More after this. |
| `sea.day.9` | Miss Quill | Day 9 | The children have asked me what it is for. I have told them to go and find out. It is the best lesson I ever gave, and I didn't give it. |
| `sea.day.11` | Vesper | Day 11 | Mother, it's reached the lighthouse step. You swept that this morning. |
| `sea.day.11b` | Isolde | Straight after | Then it will be clean. |
| `sea.day.12` | Pim | Day 12 | Water on both sides of the Causeway. The 2:15 ran at walking pace, and on time. Tuesday barked at a fish. I've put it in the timetable. |
| `sea.day.13` | Captain Imre | Day 13 | Deck Town, morning watch. Felt her stir at four bells. Nothing to report. |
| `sea.day.14` | Screen | Day 14 | Day 14. The Patience lifts. Then the Marigold. Then the Good Hope. Every ship on the sand comes up off the bottom and turns on her chain, and the Deck Folk ring the bell. |
| `sea.imre.report` | Captain Imre | Straight after | Afternoon watch. One thing to report. Sea's here. |
| `sea.hollis.log` | Hollis | At the gatehouse | Last page of the gate log, driver. You can read it. "Sea gate open. Back on duty." It took a little longer than a fortnight. I'd like that noted. |
| `sea.vane.invoice` | Mrs Vane (letter) | Last of all | Dear Neighbour, I enclose my invoice for one sea. Kind regards. |
| `sea.pell.invoice` | Mr Pell | Straight after | I've been through it. She has charged you for the salt twice. I'll write to her. |

### Bo's answer

| Id | Who | When | Line |
| --- | --- | --- | --- |
| `sea.boat.hollis` | Hollis | Next town visit | There's a pilot boat at your north gate. I told everyone not to sit in it. I'd say that's over. |
| `sea.boat.isolde` | Isolde | Straight after | Forty feet of her, and she'd go down the old slipway on one good push. Well, then. Who's driving? |
| `sea.boat.bo` | Bo | Straight after | Is that a real boat? Can I drive it? Can I drive it now? |
| `sea.boat.answer` | Hollis | Straight after | Well? It's your town, driver. |
| `sea.boat.go` | Button | The player's only choice, and the only answer | Go on, then. |
| `sea.boat.bo2` | Bo | He has the wheel | I don't know how to drive a boat. |
| `sea.boat.quill` | Miss Quill | Straight after | Then you had better read the manual. |
| `sea.next` | Screen (NEXT line) | From then on | The sea's back. There's a harbour to build, and a lady with a white tower is still buying. It's your town. |

## 5. The job list, as data

This block goes into `src/world/jobs/sea-works.js` (SEA-JOBS-1 and SEA-JOBS-2). It has the shape of `src/world/jobs/everburn.js`. As in Everburn, `easy` blocks only record the Easy numbers, and the step's own numbers must be the ones a child can win. A place's `y` is the ground height there, except the dam's walkway, which is on the dam.

```js
const place = (id, x, z, radius = 12, y = 0) => Object.freeze({id, position:Object.freeze({x, y, z}), radius});
const path = (...places) => Object.freeze(places);
const step = (kind, fields) => Object.freeze({kind, ...fields});

const everburn = place('everburn', -424, 304, 18, 2), domeGate = place('dome-gate-front', 0, -112, 14, -0.2);
const tinTown = place('tin-town', 600, 0, 18, 0), deckTown = place('deck-town', 0, -430, 20, -2), northGate = place('town-north-gate', 0, -205, 14, .2);
const boilers = place('dam-boilers', -420, -340, 14, -3), gateFoot = place('dam-gate-foot', -445, -345, 14, -3), railHead = place('rail-head-dam', -462, -330, 14, -3);
const emberEast = place('ember-east-road', 340, 90, 14, 1.1), emberBed = place('ember-bed', 250, -300, 14, -1.8), emberMid = place('ember-mid-bed', -100, -310, 14, 1.6);
const wheelWalk = place('sea-wheel-walkway', -445, -395, 8, 28), spillway = place('dam-spillway', -360, -320, 18, -3);
const shoreRamp = place('shore-ramp', 300, -295, 18, -1.9), shoreTop = place('shore-top', 250, -255, 20, -2), lighthouseFoot = place('lighthouse-door', 170, -395, 18, -0.5);
const craneStart = place('magnus-crane-start', 400, -90, 14, -0.4), craneMid = place('magnus-crane-mid', 110, -220, 14, -0.5), craneBed = place('magnus-crane-bed', -250, -330, 14, 0.8);

// The Sea Works, as rows for src/town/content/sea-works.js. `hours` is worker hours, and `materials` is what the site uses, in kg.
// `machine:true` means the player does the first of it in that machine and an apprentice carries on (docs/MACHINES.md).
export const SEA_WORK = Object.freeze([
  Object.freeze({id:'sea-fund', kind:'ledger', startLineIds:['sea.start.hollis', 'sea.start.isolde', 'sea.start.odessa'], fundLineId:'sea.fund.vultures', altFundLineId:'sea.fund.pell'}),
  Object.freeze({id:'dam-road', kind:'site', at:'town-north-gate', machine:'dozer', hours:14000, materials:Object.freeze({brickKg:135000}), startLineId:'sea.road.start'}),
  Object.freeze({id:'works-camp', kind:'site', at:'rail-head-dam', hours:40000, materials:Object.freeze({steelKg:40000, timberKg:30000}), after:'dam-road', doneLineIds:['sea.camp.done']}),
  Object.freeze({id:'hull-patch', kind:'site', at:'deck-town', hours:60000, materials:Object.freeze({steelKg:60000}), opensWhen:Object.freeze({standingAtLeast:Object.freeze({'deck-town':30})}), startLineIds:['sea.hull.imre', 'sea.hull.vesper', 'sea.hull.imre2']}),
  Object.freeze({id:'causeway', kind:'site', at:'rail-bed-mid', machine:'dump-truck', hours:900000, materials:Object.freeze({stoneKg:80000000}), startLineIds:['sea.cause.pim', 'sea.cause.odessa'], doneLineIds:['sea.cause.done']}),
  Object.freeze({id:'sea-wall', kind:'site', at:'dam-road-gate', hours:100000, materials:Object.freeze({stoneKg:6000000}), after:'dam-road', startLineId:'sea.wall.start', doneLineIds:['sea.wall.done']}),
  Object.freeze({id:'gas-line', kind:'site', at:'everburn', machine:'trencher', hours:60000, materials:Object.freeze({pipeKg:84000}), startLineIds:['sea.gas.cinder'], teachLineId:'sea.gas.bo'}),
  Object.freeze({id:'dam-works', kind:'site', at:'dam-boilers', hours:700000, materials:Object.freeze({steelKg:170000, brickKg:200000})}),
  Object.freeze({id:'gear-sections', kind:'make', at:'tin-town', people:6, days:360, needs:Object.freeze({steelKg:34000}), after:'job:sea-the-pour', doneLineIds:['sea.pour.done']}),
  Object.freeze({id:'gear-up', kind:'dispatch', at:'dam-gate-foot', days:30, after:'job:sea-first-section', doneLineIds:['sea.lift.report']}),
]);

const emberRoute = path(everburn, domeGate, emberEast, tinTown, emberBed, deckTown, emberMid, boilers);
const craneRoute = path(craneStart, craneMid, craneBed, gateFoot);
const mainLine = path(place('rail-tin-town', 650, -60, 14, 0), place('rail-east-run', 560, -120, 8, 1), place('rail-east-cut', 330, -200, 8, -1.9), place('rail-bridge', 300, -335, 10, -1.5), place('rail-bed-east', 170, -340, 8, -0.9), place('rail-bed-mid', -120, -335, 8, 1.9), place('rail-bed-west', -300, -335, 8, 0.4), railHead);
const convoyRoute = path(railHead, place('dam-road-mid', -260, -310, 14, 0.6), place('dam-road-gate', -150, -295, 14, 1.2), place('dam-road-east', -60, -240, 14, 0.7), northGate);
const runStart = place('run-start', -390, -340, 18, -3), runLegs = path(runStart, place('run-pit-rim', -250, -420, 16, 1.1), place('run-wreck-gap', -100, -430, 16, -0.4), place('run-deck-gap', -20, -445, 16, -2), place('run-past-marigold', 100, -430, 16, -1.1), lighthouseFoot, place('run-far-bed', 290, -420, 16, -0.1), place('run-turn', 320, -340, 16, -1.3), shoreRamp, shoreTop);

export const SEA_JOBS = Object.freeze([
  Object.freeze({id:'sea-long-ember', storyId:'sea', number:1, name:'The Long Ember', kind:'delivery',
    opensWhen:Object.freeze({chapterDone:23, workDone:['gas-line']}),
    lineId:'sea.ember.start', resultLineId:'sea.ember.won', easy:Object.freeze({crashLimit:8, markerRadius:18}),
    steps:[step('carry',{what:"Carry Cinder's pot from the Everburn round the map to the dam's boilers.", load:'everburn-ember-pot', origin:everburn, destination:boilers, radius:14,
      route:emberRoute, safePoints:path(domeGate, tinTown, deckTown), crashLimit:8, burnable:true, spillLineId:'sea.ember.spill', barriers:path(place('clean-barricade-1', 250, -300, 12, -1.8), place('clean-barricade-2', -100, -310, 12, 1.6)),
      lentWeapon:'flamethrower', opening:['sea.ember.match', 'sea.ember.match2'], sayNear:[{place:domeGate, lineId:'sea.ember.dome'}, {place:tinTown, lineId:'sea.ember.auntie'}, {place:emberBed, lineId:'sea.ember.fleet'}, {place:deckTown, lineId:'sea.ember.imre'}],
      arrivalLineId:'sea.ember.won'})]}),
  Object.freeze({id:'sea-finally', storyId:'sea', number:2, name:'Finally', kind:'escort',
    opensWhen:Object.freeze({chapterDone:23, workDone:['works-camp']}),
    lineId:'sea.magnus.ask', resultLineId:'sea.magnus.won', easy:Object.freeze({truckHealth:140, raiderPressure:'low'}),
    steps:[
      step('escort',{what:"Keep the Clean Fleet off Magnus's crane on the way to the dam.", actorId:'magnus-crane', actor:{id:'magnus-crane', model:'magnus-crane', escort:true, health:140, speed:7, path:craneRoute}, path:craneRoute, destination:gateFoot,
        speed:7, health:140, restLineId:'sea.magnus.stuck', restartFrom:'last-marker', raiders:path(place('clean-pickup-m1', 60, -240, 10, 0.1), place('clean-pickup-m2', -180, -320, 10, 1.4)),
        opening:['sea.magnus.yes', 'sea.magnus.go'], sayNear:[{place:craneMid, lineId:'sea.magnus.town'}, {place:craneBed, lineId:'sea.magnus.bump'}], wonLineId:'sea.magnus.there'}),
      step('hold',{what:'Stay clear of the crane while the old gear comes up.', place:gateFoot, radius:30, keepOutside:18, stopSpeed:99,
        gauge:Object.freeze({label:'lifted', total:100, seconds:40}), sayAt:[{progress:.5, lineId:'sea.magnus.up'}], closing:['sea.magnus.stay', 'sea.magnus.stay2']}),
    ], rewards:['old-gear-at-tin-town']}),
  Object.freeze({id:'sea-the-pour', storyId:'sea', number:3, name:'The Pour', kind:'on-foot',
    opensWhen:Object.freeze({jobDone:'sea-finally'}),
    lineId:'sea.pour.start', resultLineId:'sea.pour.won', easy:Object.freeze({markerRadius:3}),
    steps:[step('onfoot',{what:'Get out and work the three levers at the forge.', requiresExit:true, exitCarLineId:'sea.pour.exit', radius:3, returnToCar:tinTown, startLineId:'sea.pour.why',
      places:[
        Object.freeze({...place('pour-lever-1', 620, 6, 3, 0), action:'use', hint:'sea.pour.lever1'}),
        Object.freeze({...place('pour-lever-2', 628, 12, 3, 0), action:'use', hint:'sea.pour.lever2'}),
        Object.freeze({...place('pour-lever-3', 634, 4, 3, 0), action:'use', hint:'sea.pour.lever3'}),
      ], wonLineId:'sea.pour.won'})]}),
  Object.freeze({id:'sea-the-haul', storyId:'sea', number:4, name:'The Haul', kind:'escort',
    opensWhen:Object.freeze({jobDone:'sea-the-pour', workDone:['gear-sections', 'causeway']}),
    lineId:'sea.haul.start', resultLineId:'sea.haul.won', easy:Object.freeze({truckHealth:140, speed:9}),
    steps:[
      step('escort',{what:'Keep them off the Mule. Jax has the throttle.', actorId:'iron-mule', actor:{id:'iron-mule', model:'iron-mule-gear', escort:true, health:140, speed:9, path:mainLine}, path:mainLine, destination:railHead,
        speed:9, health:140, massTonnes:134, restartFrom:'last-marker', lentCrew:'jax', raiders:path(place('clean-pickup-h1', 480, -160, 10, -0.2), place('clean-pickup-h2', 200, -340, 10, -1.2)),
        opening:['sea.haul.tuesday', 'sea.haul.jax'], sayAt:[{progress:.1, lineId:'sea.haul.first'}, {progress:.72, lineId:'sea.haul.causeway'}], wonLineId:'sea.haul.won',
        interrupts:[
          {progress:.35, step:step('onfoot',{what:'Jump down and throw the points to send her round the wreck.', requiresExit:false, radius:3, places:[Object.freeze({...place('haul-points-1', 290, -318, 3, -1.7), action:'use'})], startLineId:'sea.haul.block', afterStartLineId:'sea.haul.exit', wonLineId:'sea.haul.clear'})},
          {progress:.6, step:step('onfoot',{what:'Plant Nell\'s charge on the wreck, then get clear.', requiresExit:false, radius:3, places:[Object.freeze({...place('haul-wreck-2', -20, -326, 3, 1), action:'use'})], startLineId:'sea.haul.nell', wonLineId:'sea.haul.clear'})},
        ], fallLineId:'sea.haul.fall'}),
    ], rewards:['gear-at-dam']}),
  Object.freeze({id:'sea-first-section', storyId:'sea', number:5, name:'The Lift', kind:'flying',
    opensWhen:Object.freeze({jobDone:'sea-the-haul', buildingBuilt:'helipad'}),
    lineId:'sea.lift.start', resultLineId:'sea.lift.taught', noPilotLineId:'sea.lift.nopilot', easy:Object.freeze({setRadius:6}),
    steps:[step('helihook',{what:'Lift the gear section off the wagon and set it in the gearbox on the dam.', load:'gear-section', massKg:1400, pickup:railHead, setDown:wheelWalk, setRadius:6, easySetRadius:6, maxSetSpeed:2,
      opening:['sea.lift.roger'], swingLineId:'sea.lift.swing', droppedLineId:'sea.lift.dropped', wonLineId:'sea.lift.taught'})]}),
  Object.freeze({id:'sea-last-section', storyId:'sea', number:6, name:'The Last Section', kind:'flying',
    opensWhen:Object.freeze({workDone:['gear-up']}),
    lineId:'sea.lift.last', resultLineId:'sea.lift.won', easy:Object.freeze({setRadius:6}),
    steps:[step('helihook',{what:'Bring up the last section and set it in place.', load:'gear-section', massKg:1400, pickup:railHead, setDown:wheelWalk, setRadius:6, maxSetSpeed:2,
      swingLineId:'sea.lift.swing', droppedLineId:'sea.lift.dropped', wonLineId:'sea.lift.won', closing:['sea.lift.hollis']})]}),
  Object.freeze({id:'sea-the-spillway', storyId:'sea', number:7, name:'The Spillway', kind:'clear',
    opensWhen:Object.freeze({chapterDone:23, workPercent:Object.freeze({'dam-works':50})}),
    vehicle:Object.freeze({oneOf:['titan_monster'], lendIfNone:'titan_monster', lendLineId:'story.ships.6.mo'}), lineId:'sea.spill.mo', resultLineId:'sea.spill.won', easy:Object.freeze({wrecks:9}),
    steps:[step('clear',{what:'Push every wreck out of the channel. Everybody is watching.', place:spillway, wrecks:12, easyWrecks:9, spreadMetres:45, pushOutTo:place('wreck-heap', -320, -285, 20, -0.8), helpers:'bowl-rivals', crowd:true,
      opening:['sea.spill.crowd'], sayAt:[{progress:.25, lineId:'sea.spill.rival'}, {progress:.5, lineId:'sea.spill.half'}, {progress:.75, lineId:'sea.spill.bo'}], wonLineId:'sea.spill.won', closing:['sea.spill.hollis']})]}),
  Object.freeze({id:'sea-the-line', storyId:'sea', number:8, name:'The Line', kind:'defence',
    opensWhen:Object.freeze({jobDone:['sea-long-ember', 'sea-last-section', 'sea-the-spillway'], workDone:['dam-road', 'works-camp', 'hull-patch', 'causeway', 'sea-wall', 'gas-line', 'dam-works']}),
    lineId:'sea.line.hollis', resultLineId:'sea.line.won', easy:Object.freeze({placeHealth:160, waves:[2, 2, 3, 3, 3]}),
    steps:[step('defend',{what:'Keep the Clean Fleet off the wheel.', place:gateFoot, placeId:'sea-gate-wheel', health:160,
      waves:[{count:3, lineId:'sea.line.crisp'}, {count:3, lineId:'sea.line.count'}, {count:4}, {count:4}, {count:5, lineId:'sea.line.magnus', magnusClears:true}],
      easyWaves:[{count:2, lineId:'sea.line.crisp'}, {count:2, lineId:'sea.line.count'}, {count:3}, {count:3}, {count:3, lineId:'sea.line.magnus', magnusClears:true}],
      helpers:'warlords-at-peace', helperLineIds:Object.freeze({sal:'sea.line.sal', dustmonger:'sea.line.dust', mirage:'sea.line.mirage', gunn:'sea.line.gunn', kettle:'sea.line.kettle', vultures:'sea.line.vultures'}), noHelperLineId:'sea.line.none',
      enemies:'warlords-driven-off', enemyLineId:'sea.line.enemy', crewLineIds:Object.freeze({tusk:'sea.line.tusk'}),
      raiderEntry:place('clean-entry', -250, -335, 8, 0.9), raiderHold:place('clean-hold', -425, -345, 8, -3), approachSpeed:1.5, refill:{place:gateFoot, crateId:'line-supply', carWeapon:'flamethrower', footAmmo:'rpg'},
      startLineId:'sea.line.letter', restartLineId:'sea.line.restart', wavesOverLineId:'sea.line.magnus2', wonLineId:'sea.line.won'})]}),
  Object.freeze({id:'sea-the-wheel', storyId:'sea', number:9, name:'The Wheel', kind:'scene',
    opensWhen:Object.freeze({jobDone:'sea-the-line'}), lineId:'sea.wheel.start', resultLineId:'sea.wheel.turn',
    steps:[step('reach',{what:'Go up to the wheel.', place:wheelWalk, radius:8,
      opening:['sea.wheel.codes', 'sea.wheel.steam', 'sea.wheel.vane', 'sea.wheel.driver', 'sea.wheel.isolde', 'sea.wheel.isolde2', 'sea.wheel.ask', 'sea.wheel.no', 'sea.wheel.see', 'sea.wheel.crisp', 'sea.wheel.help', 'sea.wheel.hollis', 'sea.wheel.brian', 'sea.wheel.brian2', 'sea.wheel.hollis2', 'sea.wheel.turn']})]}),
  Object.freeze({id:'sea-the-convoy', storyId:'sea', number:10, name:'The Convoy', kind:'escort',
    opensWhen:Object.freeze({jobDone:'sea-the-wheel'}), lineId:'sea.convoy.start', resultLineId:'sea.convoy.won', easy:Object.freeze({truckHealth:9999}),
    steps:[step('escort',{what:'Lead every truck along the Dam Road to the north gate.', actorId:'town-convoy', actor:{id:'town-convoy', model:'town-convoy', escort:true, health:9999, speed:11, path:convoyRoute}, path:convoyRoute, destination:northGate,
      speed:11, health:9999, raiders:path(), lead:true, opening:['sea.convoy.names'], sayAt:[{progress:.3, lineId:'sea.convoy.short'}, {progress:.33, lineId:'sea.convoy.quill'}, {progress:.36, lineId:'sea.convoy.bo'}, {progress:.39, lineId:'sea.convoy.bo2'}, {progress:.9, lineId:'sea.convoy.rumble'}], wonLineId:'sea.convoy.won'})]}),
  Object.freeze({id:'sea-the-last-run', storyId:'sea', number:11, name:'The Last Run', kind:'outrun',
    opensWhen:Object.freeze({jobDone:'sea-the-convoy'}), lineId:'sea.run.imre', resultLineId:'sea.run.won', easy:Object.freeze({waveSpeed:18, leadMetres:140}),
    steps:[
      step('rescue',{what:'Pick up the two lookouts in the old wreck under the dam.', people:[place('last-lookout-1', 150, -378, 10, -0.5), place('last-lookout-2', 190, -380, 10, -0.7)], seats:2, boardSeconds:1, radius:10, stopSpeed:.5, startLineId:'sea.run.rescue', home:lighthouseFoot, homeRadius:18}),
      step('outrun',{what:'DRIVE. Follow the markers to the shore.', path:runLegs, waveFrom:gateFoot, waveSpeed:34, easyWaveSpeed:18, leadMetres:90, easyLeadMetres:140, catchRestartsLeg:true, caughtLineId:'sea.run.caught',
        opening:['sea.run.gate'], sayAt:[{progress:.02, lineId:'sea.run.brian'}, {progress:.12, lineId:'sea.run.shut'}, {progress:.25, lineId:'sea.run.deck'}, {progress:.45, lineId:'sea.run.roger'}, {progress:.7, lineId:'sea.run.mo'}, {progress:.9, lineId:'sea.run.left'}], wonLineId:'sea.run.won', closing:['sea.run.tam', 'sea.run.goat', 'sea.run.goat2']}),
    ], rewards:['sea-open', 'a-fortnight-scene']}),
]);

export const SEA_SIDE_JOBS = Object.freeze([
  Object.freeze({id:'sea-hull-patch', name:'Hull Patch', kind:'repair', unlockAfter:'chapter:23', easy:Object.freeze({seconds:2}),
    steps:[step('repair',{what:'Bolt three plates on the Good Hope\'s hull.', requiresExit:true, carPlace:place('hull-patch-car', -38, -400, 14, -2), seconds:2,
      joints:[place('hull-plate-1', -44, -408, 3, -2), place('hull-plate-2', -36, -410, 3, -2), place('hull-plate-3', -28, -408, 3, -2)], reward:'scrap'})]}),
]);
```

## 6. What the new pieces do

- **`helihook`** (SEA-LIFT). Kestrel One with its existing cable and load from `src/heli/heli-cable.js`, over the Scablands (HELI-RUSTWALL). A load of 1,400 kg is under the base hook limit, so nobody needs the Heavy hook. The step ends when the load is below `maxSetSpeed` and inside `setRadius` of the mark. A hard drop is a dropped load and you hook on again, and it can't be lost. With no pilot, Dune does it and you see a report, and the `sea-last-section` waits until you have done the lessons, or Dune does that too. **Nobody is stopped from finishing.**
- **The Harbour Wall** (SEA-FLOOD, art WW-ART-SEA). A stone wall too high for a car, from the east mesa along the old shore at about z = -295 to x = -300, then round the rim of the west basin to about (-510, -225). It appears when `sea-wall` is finished and its gates stand open: the Dam Road gate at (-150, -295), a road gate at (0, -295) and the east ramp at (300, -295). The Causeway goes through an arch too low for a car. After The Convoy every gate shuts but the east ramp, which is why the last run has to cross the bed. It stays after the sea as the harbour's quay, and the sea stays on its far side.
- **`outrun`** (SEA-RUN). A water front moves along from `waveFrom`, along the same markers as the player, at `waveSpeed`, and stays at least `leadMetres` behind for the first few seconds of each leg. On Easy it goes at 18 m/s and slows when the driver slows, so a child who keeps moving is never caught. If it catches you, you float, and that leg restarts with one press. Water does not touch race rules or the physics of a car before the catch. A test driver at child pace wins it at least 8 times in 10, and no version of this step is timed.
- **The flood** (SEA-FLOOD). The lake bed has no shape of its own today: the ground is about as high inside it as outside. Before the wall, it stays that way. Once `sea-open` is set, the Scablands' ground gets a saved shape, a bed that falls from the Harbour Wall to about 12 m deep at the north edge, through the same edit layer the town's grading uses, and a water surface sits at about y = -1. The Causeway stays above it. Deck Town's hulls float and swing on their chains (view only, seeded). The lighthouse stands on a rock. Driving into the sea stops the car gently and puts it back on the shore, with a line. Courses and any other venue are untouched. Before and after both pass a frame check.
- **Old jobs after the sea.** Every job on the bed still in the story lists (Ships, Iron Mule side jobs, Lamp Oil and Hull Patch) has been finished by then, or is moved: Lamp Oil goes by boat (later) and stops being offered until then, and the Milk Run uses the Causeway, which runs on the same line. A test walks every job in every list, checks it against the flooded ground, and refuses one that lands in the sea.
- **`escort` with `interrupts`.** The Haul stops the train's progress at each interrupt (she slows to a walk), runs the small on-foot step, and carries on. If you fall behind, she keeps walking and you can catch her. Nothing can be lost.
- **`clear` with `helpers`.** Bowl rivals (BOWL-RIVALS) as computer trucks, pushing the same wrecks. The crowd is the town's population, read as in TOWN-BOWL-LINK.
- **`defend` with `helpers` and `enemies`.** Each warlord at peace arrives once at their wave, with their line, and fights on your side through `combat-teams.js` and the arena pilot. Those driven off fight on hers. On Easy, a driven-off warlord only adds one to that wave's count. `magnusClears` ends the last wave with Magnus's magnet lifting the remaining trucks. He gets to be useful one more time, and he does not know it.
- **`hold` with `keepOutside`.** The gauge fills while you stay outside the inner ring. Metal things that come inside it stick to the magnet and drop off again, unharmed.
- **The scene `sea-the-wheel`.** Plain lines, one after another, in view of the wheel. Nothing can go wrong. Mrs Vane is a walker model in white (WW-ART-SEA) who walks up, speaks and walks away. Nobody can touch her, and the player's weapons do not fire in this scene.
- **A Fortnight.** A fixed view and rising water, reading the same flood shape, with captions in order, about two minutes altogether. Any key moves on to the next. The town's clock moves on by 14 days.
- **Sound.** Reuse banks first. New cues: `sea.gate` (a very low groan, and it should be felt), `sea.wave` (a long roar that grows), `sea.ship-lift` (hull creak, bell). `town.bell` for the Deck Folk's bell.

## 7. Removed

`docs/story/the-long-dry.md` Act 5's table stays as the summary and points here. "The gear wheel" there means the 24 sections here.
