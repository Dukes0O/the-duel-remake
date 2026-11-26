# The runaway

A storyline of the open Scablands (`docs/story/open-scablands.md`, section 19), written in full in the form of that
page's section 21. Kind: a stranger. Its data is `src/story/threads/content/runaway.js`, and every line below is in
that file exactly as it is here. Card OPEN-WRITE-2, 26 November 2026. Nothing here is built yet.

The choice at its heart: hide somebody who has left the Ash Men, hand him back, or send him on.

It keeps to what `docs/story/five-cold-nights.md` says of Clinker and Old Smoke. Clinker is Old Smoke's stoker. He
counts, he is polite, he makes people watch a fire go out, and he says "We will remember". Old Smoke speaks slowly, is
certain, and keeps all fire in his furnace. Clinker's own boy, who comes to the gate on the fifth night, is a
different and younger child, and this storyline leaves him as he is.

## 1. What it reads and what it writes

| This storyline reads | This storyline writes |
| --- | --- |
| The Ash Men's feud | The Ash Men's feud |
| Embers in the store, for a price | Embers |
| Who is Friendly or better, for where a boy can be sent: the Walkers, the Deck Folk, a found camp | That people's word for the player, if Clinker is told where the boy went |
| Whether the Walkers live inside the fence | A way into the Grey Camp by its back (a thing made), and a rumour of where the Grey Camp is |
| The night, for when it can begin | Marks that later scenes read, the fifth night's parley above all |

## 2. When it can begin, and its sign

**It can begin** at first light on any day from the second, while the player is in Tin Town. The director draws for it
each day at one chance in three. It does not begin on the last day of an act, or while another storyline of the kind
"a stranger" is open.

In the facts of section 12: `{all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: 'runaway', at: 'any'}},
{fact: 'draw', name: 'start', chance: .35}]}`.

**Its sign is a stranger,** and this stranger does not come to the gate. He is already inside, and what the player
meets is what he has left out of place: small grey footprints, a washed bowl, and two people in Tin Town who have
noticed. The sign lasts one day. At dark he goes back under the wire by himself, and the storyline has been ignored
(section 6).

## 3. Its cast, and the people in it

This storyline is tied to one place, Tin Town, so it names it. *The boy* is always the same boy. *The haven* is
whichever people the player drives him to, out of those who are Friendly or better; a line may hold `{haven.name}` or
`{haven.leader}`. The haven is cast when the player arrives there, and not when the storyline starts, so a player with
no friend at all can still meet the boy.

**People in it.** Auntie Solder, Cinder, Moss and Odessa, as they are. Clinker, as he is. Rell and Wim, and Captain
Imre, if the ledger holds them. New: **Slack**, about twelve, grey with ash to the eyebrows, a stoker's boy
from the Grey Camp. He carried coal to Old Smoke's furnace and ash away from it for three years. Two nights ago he
carried one hot coal to an old woman who was cold, was seen, and ran. He is frightened and proud, he asks for very
little, and he washes what he uses. Slack is not his name. It is the dust at the bottom of a coal heap, and it is what
the Ash Men call a boy who is small. His name is **Nat**, and he says so to a player who asks.

**Clinker's two searchers** have no names and say nothing.

## 4. Where things stand, in this example

It is the third day of Five Cold Nights, at first light, before Bess goes for gas. The example continues from the
watch trade of the second night: two embers in the store, the Walkers Friendly and camped at the Wash, the Ash Men
Watching, the Word on the road 1, and 90 scrap in the car. The Deck Folk have not been met. No camp has been found. The player is in Tin Town with no mission running.

## 5. Scenes

### Scene 1. Things out of place

Tin Town, first light. Moss is at Big Bess's shed with a brush and a bucket, as he is every morning. When the player
comes near, he speaks first. Auntie Solder says her line at the hearth, to a player who goes there.

> **Moss:** Somebody slept in Bess's shed last night. Whoever it was folded the sacks up afterwards, which is more
> than I ever do.
>
> **Auntie Solder:** Somebody had a bowl of my soup in the night, and then washed the bowl. Nobody in this town has
> ever washed a bowl without being told to.

There are four things to find, each by walking up to it. The cue `open.clue.found` marks each, and each gives one
thought.

| What is there | The thought | What it tells |
| --- | --- | --- |
| Small grey footprints lead from the west fence to Bess's shed, close together | *These are prints of ash, and they're no bigger than mine. Whoever made them was walking on tiptoe.* | A child, from the Ash Men |
| The bottom wire of the west fence has been lifted and hooked up on a nail | *Somebody small came in under here, and then hooked the wire up neatly again afterwards.* | The way in. Careful, and not a raider |
| The washed bowl is upside down on Bess's step, drying | *A thief would have kept the bowl, but this one cleaned it and left it where we would find it.* | Not a thief |
| A grey handprint is on the shed door, at the height of the player's own shoulder | *The ash in that print is still loose, so whoever made it hasn't left yet.* | He is inside |

### Scene 2. The shed

Behind Bess's spare tyres there is a boy, grey from his hair to his boots, holding a tyre lever in both hands.

> **The boy:** Don't shout. Please don't shout. If you shout, the cook will ring the bell, and then everybody will know
> where I am.
>
> **The boy:** They call me Slack, and I'm a stoker's boy from the Grey Camp. I mean that I was one, until I ran away
> two nights ago.
>
> **Slack:** I only took one bowl of soup, and I washed it afterwards. I'll go as soon as it's dark again, because I
> only needed somewhere to be that wasn't outside.

> *He's holding that tyre lever like a club, and his hands are shaking so much that he can hardly keep hold of it.*
>
> *Moss is taking Bess out within the hour. After that there'll be nothing in this shed to hide behind.*

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Why did you run away?" | **Slack:** An old woman on the coal gang was coughing all night at the cold end of the camp, so I carried her one hot coal in a tin. Clinker saw the glow of it. In the Grey Camp, any fire that leaves the furnace counts as stolen, even if it's only one coal. | What he did: he shared fire |
| "What happens to somebody who does that?" *(only after the question above)* | **Slack:** Clinker makes you watch your coal go out, and then you stand by a cold grate all night while everybody else is warm, so that you learn. I've seen it done to other people, and I didn't wait for it to be done to me. | What he ran from. Nobody is hurt at the Grey Camp, and somebody is always cold |
| "What does a stoker's boy do?" | **Slack:** I carry coal to the furnace and ash away from it, all day and half the night. I know every door in the Grey Camp, because I've carried a sack through each one of them. | What he knows |
| "Will they come looking for you?" | **Slack:** Clinker will, because he's the stoker and I'm one of the things that he counts. He counts everything that he has, every evening, and he has never once let the number go down. | Clinker will come, and soon |
| "How did you get in here?" | **Slack:** I came under your west fence, where the bottom wire is loose, and I hooked it up again behind me. You ought to mend it properly, because I wasn't the first one to find it. | A tell: he gives away a weakness for nothing. A thing to mend: the wire, six seconds with the wrench and 2 scrap |
| "Is Slack your real name?" | **Slack:** Slack is the dust at the bottom of the coal heap, the part that's no use to anybody. It's what they call you when you're small. My name was Nat before I went grey, and nobody has asked me for it in three years. | His name. From this answer on, his bubble reads Nat |

**The decision.**

> *If Clinker comes for him, he'll come to our gate, and he won't come by himself.*
>
> *He carried one hot coal to somebody who was cold. That's the very thing that our hearth is for.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "Stay out of sight. I'll find you a better place than this to hide." | Nobody else knows yet | *If nobody knows he's here, then nobody has to lie about him, except me.* | Hiding him (Scene 4). Clinker comes at dusk (Scene 5) |
| 2 | "Come with me. Auntie Solder ought to hear this from you." | The whole town will know by noon | *She'll feed him first and shout afterwards, or at least I think that's the order she'll do it in.* | The hearth (Scene 3), and then hiding him or not, as the player chooses |
| 3 | "You can't stay here. Get in the car, and I'll take you to somebody who can keep you." | The gate, and the road | *Wherever I take him, Clinker's trouble goes there with him.* | The road out (Scene 7), by day. It is the day's outing |

**The ledger when the player leaves.** Mark: "You found a boy from the Ash Men hiding in Bess's shed." If his name was
asked: "You asked the Ash Men's runaway what his name was, and he told you." If the wire was mended: "You mended the
wire that the runaway came in under."

### Scene 3. The hearth

Auntie Solder, Cinder and Moss, in person. The boy stands as near to the hearth as he dares, which is not very near.

> **Auntie Solder:** So this is who washed my bowl. Sit down, child, and stop standing as if somebody were about to
> hit you. Nobody hits anybody at my hearth.
>
> **Cinder:** I've known Clinker for thirty years, and he has never once let go of anything that he had counted. He'll
> be at our gate by dusk.
>
> **Auntie Solder:** We have two embers, a fence with a hole in it, and now a boy that the Ash Men want back. I'm not
> complaining about any of it, but I am counting.
>
> **Moss:** He folded all the sacks, and I'd keep him for that alone.

**You may ask what they think. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Cinder, could he be a spy?" | **Cinder:** He could be, because Old Smoke has sent people to count our lamps before now. But a spy doesn't wash the bowl, and he doesn't tell you where your fence is weak. | Probably not a trick |
| "Auntie, what would you do?" | **Auntie Solder:** I'd feed him, and I already have. What happens after that isn't a cook's question. You found him, so whoever comes to the gate about him is yours to answer. | The answer at the gate is the player's |
| "What do you want to happen to you?" | **Slack:** I want to be somewhere that Clinker can't count me. I don't mind where it is. I can carry coal and keep a fire in, and I don't eat much. | He asks for very little |

> **Auntie Solder:** Whatever you say at that gate tonight, the rest of us will say it too. So think about it before
> dusk, and not while he's standing in front of you.

**The ledger.** Tin Town knows. Nothing else moves. The player may hide him (Scene 4), leave him at the hearth in
plain sight, or drive him out (Scene 7).

### Scene 4. Hiding him

The choice is made by walking him somewhere. Each place has somebody who finds out, and says so in passing.

| You do | Who finds out, and what is said | Kept out of sight |
| --- | --- | --- |
| Leave him in Bess's shed, where he is | **Moss:** I'm not hiding anybody. I'm only washing a truck, very slowly, in front of this door. | Bess is out all day. The searchers look here first (Scene 6) |
| Hide him in the loft over the forge | **Odessa:** There's a boy in my loft, and he has sorted my bolts by size. I haven't seen him, and I haven't seen the bolts either. | The searchers look here second |
| Hide him in the woodpile by the kiln | **Cinder:** That woodpile has started breathing. I shan't be burning anything from the left-hand end of it for a day or two. | The searchers look here last. The ash on him does not show against the charcoal |
| Hide him among the Walkers *(only if they live inside the fence)* | **Rell:** Ash washes off, so put a salt coat on him and he's one of mine. I'll count twelve where I used to count eleven. | The searchers do not count the Walkers. Wim says whatever she sees |

**If he is among the Walkers,** one question is worth asking.

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Rell, can Wim keep a secret?" | **Rell:** Wim says whatever she sees, as you know. I'll take her down to the Wash to look for shells until the grey men have gone home. | Wim is out of the way. If it is not asked, she speaks at the gate (Scene 5) |

### Scene 5. The gate at dusk

Three rider cars stop in the road with their lamps on. Clinker gets down and walks to the gate, alone. He does not
raise his voice. The cue is `story.gate.bell`, which the player has heard before.

> **Clinker:** Good evening, fire-keepers. My count is one short tonight, and the one I'm missing is a grey boy about so
> high, who answers to Slack.
>
> **Clinker:** His prints go under your west wire, and they don't come out again. I'm not here to raid you. I'm here
> to fetch what belongs to Old Smoke, and then I shall go home to my supper.
>
> **Auntie Solder:** *(on the radio)* That man has never once come to this gate to give us anything. Mind what you
> say to him, because he'll remember every word of it.

**You may ask before you answer. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "What will happen to him if he goes back?" | **Clinker:** He'll carry coal, the same as before. He'll also stand by a cold grate for one night, to learn what he took from the rest of us. Nobody is ever hurt at the Grey Camp. We are only ever cold. | What handing him back means |
| "Why do you want one small boy so badly?" | **Clinker:** Because if one walks out and is kept, then ten walk out. Old Smoke's fire needs forty pairs of hands, and I have counted every pair. | Why Clinker cannot let it go. Keeping the boy will be answered |
| "What did he do that was so wrong?" | **Clinker:** He carried fire out of the furnace and gave it away. It was only one coal, but it's always one coal to begin with, and after that it's a whole town like yours. | How Clinker sees Tin Town |
| "What is he worth to you?" | **Clinker:** Old Smoke doesn't sell people. But the furnace is owed four winters of that boy's work, and two embers would warm it as well as he would. Put them down here, where I can watch them go out. | The price: two embers. It opens the third choice |

**The decision,** when the boy is in Tin Town.

> *If I say that he isn't here and Clinker finds him, Clinker will never believe another word that Tin Town says.*
>
> *If I hand him back, Clinker will go home content, and the boy will spend the night standing by a cold grate.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "There's no boy here. Those prints must be somebody else's." *(only if he is hidden)* | Clinker looks at the fence for a long time | *I've never told a lie to anybody's face at this gate before.* | He does not believe it. The search (Scene 6), tonight |
| 2 | "He's here, and he's staying. He came to our fire by himself." | The riders start their engines | *Now the Ash Men know, and nobody has had to lie, but they'll be back.* | The Ash Men's feud rises one step. The boy is safe inside. Nobody searches |
| 3 | "Here are two embers. Count them, and then count him as gone." *(only if the price was asked, and with two embers in the store)* | The count falls by two | *That's two nights of the whole town's fire, for one boy who doesn't eat much.* | The boy is free and clear, and the feud does not move. Tin Town has shown that it pays |
| 4 | "Take him. He's yours." | The boy walks out through the gate | None | The Ash Men's feud cools one step. What the boy knows goes back with him |

**1. "There's no boy here."**

> **Clinker:** Then you won't mind if I don't believe you. I count very carefully, and my count says that he went
> under your wire and stayed there. Good night, fire-keepers.

> *He didn't argue, and he didn't believe me. He'll come back tonight, and he won't knock.*

If the boy is among the Walkers and Wim has not been taken to the Wash, she is at the gate, and she speaks before
Clinker turns away.

> **Wim:** That boy has a salt coat on, but he's grey underneath it.
>
> **Clinker:** Thank you, little one. You're the first honest person that I've met at this gate.

Then it is choice 2 or choice 4, with the lie already told. Mark: "You told Clinker that there was no boy in Tin
Town." If Wim spoke: "Clinker heard the truth from Wim after he had heard a lie from you."

**2. "He's here, and he's staying."**

> **Clinker:** So Tin Town keeps what belongs to Old Smoke, and says so at its own gate. We will remember
> who it was that kept what we had counted.
>
> **Auntie Solder:** *(on the radio)* Well, that's said now, and it can't be unsaid. Bring the boy to the hearth. If
> we're to be raided for him, he can at least eat properly first.

**The ledger.** The Ash Men: Watching to Raiding. Mark: "You kept the Ash Men's runaway, and you said so to Clinker's
face." In an act with a clock the Ash Men come over the wall a night sooner. Out of one, their cars come to fight
more often at checkpoints for the next three banked nights.

**3. The two embers.** Clinker sets a bucket of ash down in the road. He tips both embers into it and watches them
until they are dark, with the cue `story.pot.lump-grey`, twice.

> **Clinker:** There, they've both gone grey. The boy is paid for, and I'll take him off my count. You see how simple
> it is, when a town knows how to pay?
>
> **Auntie Solder:** *(on the radio)* That's two embers for a boy who washes bowls. I've made worse bargains than
> that, and so have you. Don't tell Cinder what it cost until I've given her some soup.

**The ledger.** Embers: 2 to 0, before the hearth is banked. Mark: "You paid Clinker two embers for the runaway." The
Ash Men: Watching still.

**Tied back,** the next time Clinker names a price for anything.

> **Clinker:** You paid two embers for a coal boy without even arguing, so I've put my prices up for Tin Town. It seemed
> only fair to the furnace.

**4. "Take him."** The boy has heard it. He comes out from wherever he was, by himself, and walks through the gate.

> **Slack:** It's all right. I knew that I'd have to go back in the end. Thank you for the soup.
>
> **Clinker:** You see? You do understand us. What has been counted goes back to where it was counted. Good night,
> fire-keepers.
>
> **Cinder:** *(low)* He'll stand by a cold grate tonight, and he'll carry coal again tomorrow. I'm not saying that
> you were wrong. I'm only saying what happens next.

**The ledger.** The Ash Men's feud cools one step, and never below Watching. Mark: "You handed the runaway back to
Clinker at your own gate."

**Tied back,** once, on a later drive past the Girder Bridge or at a checkpoint where the Ash Men pass. A grey boy is
riding on the back of a truck among the coal sacks. He looks at the player's car until it is out of sight. He does not
wave.

**The decision, when the boy was driven out by day** and is not in Tin Town. Clinker says his first two lines as
written, and the questions stand. The player cannot say that there was no boy, because the prints are there.

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | "He was here this morning. I drove him to {haven.name}." | Clinker looks along the road | *It's the truth, but I wonder what the truth is going to cost {haven.leader}.* | Clinker goes there. That people are visited by three cars of Ash Men, and they think one word less of the player |
| b | "He was here, and he's gone. I'm not telling you where." | The riders start their engines | *He can't search the whole of the Scablands, or at least I hope that he can't.* | The Ash Men's feud rises one step. Nobody is visited |
| c | "He was here this morning. I left him on the Boneyard road." *(only if nobody would take him, in place of a)* | Clinker looks along the road | *It's the truth, and it tells Clinker exactly where to look.* | The riders go down the Boneyard road. The draw for how the road treated him is made at three chances in four of the worse |

> **Clinker:** *(a)* Thank you. That is the first useful thing that anybody has said to me today. I shall go and ask
> them for him, as politely as I have asked you.
>
> **Clinker:** *(b)* Then I shall look everywhere, and I shall begin with the people that you are fond of. We will
> remember who it was that sent us looking.
>
> **Clinker:** *(c)* Thank you. A boy on foot on the Boneyard road will not have gone far. That is the first useful
> thing that anybody has said to me today.

**The ledger.** If Clinker was told: that people's word falls one step, and a mark, "You told Clinker where the runaway
had gone." If he was not: the Ash Men's feud rises one step.

**Tied back,** if the player told him, on the next visit to that people.

> **{haven.leader}:** Three cars of grey men came here asking for the boy, and they knew exactly whose door to knock
> on. He hid, and they left. I'd like to know who told them.

### Scene 6. The search

Only after "There's no boy here." After dark, on foot, about four minutes. A mission, and the player is asked first.

> **Auntie Solder:** They'll come over the west wall tonight, where the wire was lifted, and they'll look in every
> place that a boy could fit. Will you stay up and keep him ahead of them?

| | You say | What happens |
| --- | --- | --- |
| a | "I'll stay up with him." | The search, below |
| b | "He'll have to take his chance." | By a named draw, weighted by where he was hidden: he is found, or he is not. The player sleeps through it and hears at dawn |

A player who slept hears one of two things at dawn: Clinker's line from the wall, below, or this.

> **Auntie Solder:** They found him in the night, and he went back over the wall between the two of them. Clinker
> called down that this town tells lies. I couldn't think of anything to shout back.

**The search.** It holds the checkpoints and the signs. Two of Clinker's people come over the west wall with lamps
that have shutters on them. They look in Bess's shed, then in the forge loft, then in the woodpile, and each look
takes about a minute. A lamp's light on the boy for two seconds has found him. The player goes ahead of them on foot,
fetches the boy out of the place they are coming to, and takes him across the alleys to a place they have already
searched.

> **Slack:** *(low)* The one with the quick lamp found a cat in a coal sack once, from right across the yard. Don't
> look at where I am, because he watches where people look.

- **If the wire was mended,** they have to come over by the gate wall, and it takes them a minute longer.
- **If the Walkers are Friendly,** one of them is on the fence, and the whistle (the cue `night.whistle`) comes twenty
  seconds before the first lamp.
- **If he is among the Walkers,** the searchers do not look there. They search the three places and leave.

**Not found by dawn.** Clinker has stood on the wall all night and has not come down.

> **Clinker:** My two found nothing, and they are good at finding. So either there's no boy, or you hide things better
> than you fence them. I shall write him down as lost on the road.

**The ledger.** The feud does not move. Marks: "You told Clinker that there was no boy in Tin Town." "You kept the
runaway ahead of Clinker's lamps for a whole night."

**Found,** with the cue `open.search.found`. A searcher whistles, and Clinker speaks from the wall.

> **Clinker:** So there was a boy after all. I asked you politely, and you looked me in the face and lied. We will
> remember that this town tells lies.

| | You do | Plain to see | Kept out of sight |
| --- | --- | --- | --- |
| a | Stand aside | The boy climbs the wall between the two of them | The feud rises one step, for the lie |
| b | Stand in front of him | Two searchers, and two more coming over the wall | A fight on foot against people the player has just been told about, with the brand and the Hand Flamer, as in the raid. Fire turns them, and when two are driven out the rest go. The feud rises two steps |

> **Slack:** *(a)* Don't fight them for me. They'd only come back with more, and then it would be your lamps.
>
> **Clinker:** *(b)* You would burn my people over one coal boy? Then you're keeping a fire for him after all. That is
> exactly how it begins.

If the fight is lost, the boy goes over the wall with them, and the feud has risen all the same. Marks: "Clinker's
searchers found the boy that you said was not there." And, if the player fought: "You fought Clinker's people for the
runaway."

### Scene 7. The road out

For a player who drives him out of Tin Town by day. A mission. It holds the checkpoints and the signs, and in an act
with a clock it is the day's outing, so Bess does not go for gas.

> **Auntie Solder:** *(on the radio, as the gate opens)* That's a kind thing to do, but it's the gas run that pays for
> it. Bess stays in her shed today, so tonight we'll burn an ember, and there won't be a new one baked to take its
> place.

**Where he can go.** The player chooses by driving there. Each of these is on the map only if the ledger holds it.

| The haven, and on what condition | What is said when he arrives |
| --- | --- |
| **The Walkers' camp,** if they are Friendly and camped outside the fence | **Rell:** You've brought me a stoker's boy? We've no fire for him to stoke, so he'll have to learn to rake salt. But he walks quietly and he washes bowls. I've taken on worse. |
| **The ships,** if the Deck Folk are Friendly | **Captain Imre:** The Deck Folk can always use another hand, and he need never go ashore again. He will be entered in the log under whatever name he chooses. We have nothing to report. |
| **A found camp** whose people are Friendly | **{haven.leader}:** He can stay, if he works. We've nothing here that the grey men want, and we'd like to keep it that way. He's to keep his head down whenever there's dust on the road. |
| **Nobody,** if the ledger holds no friend | The Boneyard road, with a blanket and a loaf. **Slack:** I'll follow the road until it stops. Roads always go somewhere, don't they? That's what they're for. |

**The drive, by car, about three minutes.** The boy lies on the floor of the car under a sack. Clinker's riders have
been out since first light, and he says so before the gate opens.

> **Slack:** Clinker's riders will be sitting where the roads leave your town. They look into every car when somebody
> has run. If they see me, they'll want me back, and they won't ask you twice.

Two rider cars sit at the first fork with their lamps on. The rule is the one the furnace's lookouts use: a car that
stays in a rider's view within sixty metres for eight seconds has been looked into. A car grey with ash is taken for
one of their own, and has sixteen seconds (design section 13). The player goes round by open ground, or waits for a
rider to look the other way.

- *Not seen.* The road is clear to the haven.
- *Seen,* with the cue `open.riders.seen`. Two cars come after the player, and they can be outrun on a road or fought.
  Win, or lose them, and the drive goes on.
- *The surround.* If the car is wrecked, or boxed in for six seconds, Clinker walks up to the window.

  > **Clinker:** Hand the boy down to me, and then you can drive home with all four of your wheels.

  | | You do | What happens |
  | --- | --- | --- |
  | a | Open the door | The boy gets out. The feud does not move. Mark: "Clinker's riders took the runaway out of your car." |
  | b | Try to break out | A second minute against four riders. Win, and the drive goes on with the feud one step higher. Lose, and the car is wrecked, the boy is taken, and the player is towed home |

**At the haven.** After the line above, the boy says goodbye.

> **Slack:** Nobody has ever driven me anywhere before, because I always walked, with a sack on my back. Thank you for
> the lift, and for the soup.

If the player asked his name, he says this as well.

> **Slack:** And thank you for asking what my name was. I'd nearly forgotten that I had one.

**The ledger.** Mark: "You drove the runaway out of Tin Town to {haven.name}." No gas today. Clinker comes to the gate
at dusk all the same (Scene 5, the second table). With nobody to take him, the mark is: "You drove the runaway to the
Boneyard road and left him there with a blanket."

**If nobody would take him,** how the road treats him is a named draw, and nobody says which way it went until later.
An even chance, weighted toward the worse by the Ash Men's feud.

> **The trader:** I gave a grey boy a ride as far as the Rail Halt last week. He washed my windscreen without being
> asked. He said that somebody in Tin Town had given him a blanket.

> **The trader:** I saw the Ash Men stop a boy on the Boneyard road last week. He had a Tin Town blanket round his
> shoulders. They let him keep the blanket.

### Scene 8. What he leaves

At the hearth, the first morning after he is safe at Tin Town: kept in the open, paid for, or hidden through the
search. Auntie Solder has given him a stool and a second bowl.

**If his name was not asked in the shed:**

> **Auntie Solder:** I'm not shouting "Slack" across my own hearth. It sounds like something that has gone wrong with
> a rope. What did your mother call you?
>
> **Slack:** She called me Nat. Nobody has asked me that since I went grey.

**If it was:**

> **Auntie Solder:** The driver tells me that your name is Nat. Then it's Nat at this hearth, and I'll hear no more
> about coal dust.

Then he takes a stick and draws in the ash at the edge of the hearth.

> **Nat:** This is the furnace yard, and this is the pen, with banks of ash all the way round it. The gate has two men
> on it, day and night.
>
> **Nat:** But here, at the back, is the tip where we threw the ash. Nobody watches it, because nobody wants to stand
> in it. I carried a sack down that tip every day for three years, and I could walk it in the dark.
>
> **Cinder:** He banks a kiln better than I do, and I've no intention of telling him so. He can stay at my fire for as
> long as he likes.

**The ledger.** A thing made: the Grey Camp's back way, known. A rumour: the circle for the Grey Camp on the map.
Mark: "The runaway drew you the Grey Camp in the ash of your own hearth."

**If he was driven to a haven,** the same drawing is made there, on the player's next visit, in the dirt. He says the
two lines above. Cinder's line is not said.

## 6. How you can lose, and what it costs never to follow the sign

- **You lie, and he is found.** The Ash Men's feud rises, he may be taken all the same, and Old Smoke says at the
  parley that your town tells lies.
- **You keep him in the open.** He is safe, and the Ash Men come sooner and oftener.
- **You pay.** Two nights of fire are gone, and Clinker's prices go up.
- **You hand him back.** Nothing is lost at Tin Town. He stands by a cold grate, and one day he looks at your car from
  the back of a truck.
- **You are caught on the road.** He is taken out of your car, and the day's gas was given up for nothing.
- **You tell Clinker where he went.** A friend is visited by three cars of Ash Men, and thinks less of you.
- **You sleep through the search.** Luck decides, and you are told at dawn.

Nobody dies, nothing saved is wiped, and no screen says the game is over.

**If the player never follows the prints.** At dark the boy goes back under the wire by himself. Clinker still comes
at dusk, and says only this.

> **Clinker:** His prints go under your wire, and then they come out again, so he took your soup and went on. You were
> lucky, fire-keepers. Good night.

Some nights later Auntie Solder says the rest.

> **Auntie Solder:** A trader tells me that the Ash Men caught a runaway boy on the Boneyard road. That will be the one
> who washed my bowl. I'd have given him a second bowl, if he had only knocked.

Mark: "A boy hid in Tin Town for a day, and left again before anybody spoke to him."

**What this changes later.**

- A boy who stayed is at Cinder's kiln. He reads the Ash Men's smoke: when their furnace is banked up black for a
  ride, he says so, and Tin Town knows a night ahead that a raid is coming.
- The Grey Camp's back way is known, and every later storyline that goes there can use it.
- Clinker's anger is in the ledger as the feud, and as what he says. He names the boy the next time he speaks to the
  player, whatever was done.
- A boy who was handed back is at the Grey Camp, and other storylines can meet him there.
- Nat, at Tin Town or at a haven, is a boy of twelve who knows the Ash Men from inside, and other storylines can cast
  him.

## 7. Played alone: what happens when nobody ever wrote a fact

| The fact it reads | When nobody wrote it |
| --- | --- |
| The Ash Men's feud | Watching. Clinker comes with three cars |
| Embers in the store | With fewer than two, or outside an act that counts embers, Clinker still names his price, and the third choice is not offered |
| The Walkers' word, and whether they live inside the fence | Nobody whistles on the night of the search, the fourth hiding place is not there, and their camp is not a haven |
| The Deck Folk's word, a found camp | Those havens are not on the map. With no friend at all, the only road out is the Boneyard road with a blanket |
| Whether Old Smoke has made peace | After the act, with peace made, the grey riders are Clinker's own and not Old Smoke's. Every line stands, because Clinker counts for whoever he serves |

## 8. Crossings

| When this has happened | This changes |
| --- | --- |
| The Grey Camp's back way is known (this storyline) | In "Smoke over a friend", when the enemy is the Ash Men, the boy draws the back way in the dirt, the party goes in by the ash tip, and a rescue party's odds are better. Promised in section 19 |
| The boy is at Tin Town (this storyline) | On the fourth night of Five Cold Nights he calls the order in which the throwers take the lamps (below). On the fifth night he stands at the gate and speaks for Clinker's boy (below) |
| The boy was kept in the open (this storyline) | Two more raiders come over the wall on the fourth night, and they are looking for him |
| The boy was handed back, and his name was asked (this storyline) | In "Smoke over a friend", at the Grey Camp, he sees the player on the rim and does not call out. A boy whose name was never asked calls out |
| Any ending (this storyline) | Old Smoke says it back at the parley of the fifth night (below) |
| The Walkers are Friendly, or live inside the fence (Five Cold Nights) | A whistle on the night of the search. A fourth place to hide him. A haven |
| A camp is found and Friendly (the open land, or "The dry pump") | It is a haven, and its leader speaks |
| The Ash Men are Raiding or worse, as after the bridge was fought across (Five Cold Nights) | Clinker comes with five cars, not three, and the fight on foot begins with four searchers |

**What the parley of the fifth night would read.** In `five-cold-nights.md`, section 15, Old Smoke says the player's
own story back, and each line is spoken only if its choice was made. This storyline adds one line to that list, by
its ending.

| The ending | What Old Smoke says |
| --- | --- |
| Kept in the open | **Old Smoke:** You kept my coal boy, and you told Clinker so to his face. Nobody has said no to Clinker's face in years. He hasn't stopped talking about it since. |
| Hidden, and not found | **Old Smoke:** My stoker lost a boy under your wire, and you told him that there was no boy. I keep fire, and you keep secrets. I couldn't tell you which of us is the warmer for it. |
| Hidden, and found | **Old Smoke:** You lied to my stoker's face, and then my people found the boy behind your lie, so your town tells lies. Tell me why I should believe one word that you say to me tonight. |
| Paid for | **Old Smoke:** You paid two embers for a boy who was worth less than one. I let both of them go grey, and I still think that I had the better of the bargain. |
| Handed back | **Old Smoke:** You gave my boy back when you were asked for him. That was correct. What is mine comes back to me, and you knew it without being told. |
| Driven out to a haven | **Old Smoke:** You sent my boy down the road to somebody else's fire, so that the trouble would be theirs and not yours. I've done the same with trouble all my life. |

A boy who is safe at Tin Town or at a haven is not one of the far fires that Old Smoke counts from the tower. He is a
person, not a fire that was given. A lie that was found out makes Old Smoke harder to move: with "Hidden, and found"
he does not come in from the cold unless four fires are alight, where three would have done.

**The other lines that the main story would speak.**

On Day 3, at the Girder Bridge, if the boy is in Tin Town and Bess takes the bridge:

> **Clinker:** A boy of mine went under somebody's wire two nights ago. If it was your wire, I shall be at your gate by
> dusk. You might think about that while you drive.

On the fourth night, in the raid, if the boy is at Tin Town:

> **Nat:** They'll go for the pump lamp next, and after that the forge yard. It's always the same order, because
> Clinker made us learn it.

On the fifth night, at the gate, when Clinker's boy asks for an ember:

> **Nat:** That's Clinker's own boy. He isn't lying to you. He has never been allowed to say enough words at once to
> make a lie out of them.

## 9. What it takes to play, what it needs made, and its sounds

**What it takes to play.** Three sittings of about ten minutes at most, which may be hours or days apart: the morning
(the prints, the shed, and hiding him or driving him out); the dusk and the night (Clinker at the gate, and the
search); and the next morning at the hearth. A player who hands him back at the gate has played about eight minutes
in all.

**What it needs made.**

| What | New or in hand |
| --- | --- |
| Tin Town on foot, with Moss at Bess's shed, Odessa at the forge and Auntie Solder at the hearth | In hand when OPEN-ROAM, OPEN-FIGURES and OPEN-DOORS are built. The forge loft is a second room of the forge shed, and the woodpile is a spot by the kiln |
| Grey footprints, a lifted wire, a bowl, a handprint | Small things drawn in code, found by the `explore` step |
| Slack | New, by the method that made the Walkers: twelve, thin, grey all over, a tyre lever held in both hands |
| Clinker at the gate and on the wall, and three rider cars | Clinker's figure is asked for by `five-cold-nights.md`, section 16. The cars are in hand |
| Two searchers with shuttered lamps | The Ash Men on foot are in hand. The lamp's rule is the one the burned camp's drain uses |
| The fight on foot | In hand: the raid's rule, with the brand and the Hand Flamer |
| The riders who look into cars | In hand: the lookout rule of section 21, Scene 3, and the riders |
| The drawing in the ash | New: one flat picture on the ground by the hearth. Nothing here needs anything the game cannot do |

**Sound cues.** In hand: `story.gate.bell`, `story.pot.lump-grey`, `night.whistle`, `open.clue.found`. New:

| Cue | What it is |
| --- | --- |
| `open.runaway.found` | A tyre lever dropped on a concrete floor |
| `open.riders.seen` | A rider's horn, two notes, as a car is looked into |
| `open.search.lamp` | A lamp's shutter opening: one small metal click |
| `open.search.found` | A whistle on two fingers, from a searcher |
| `open.ash.drawn` | A stick drawn through ash |

## 10. New names

| Name | What it is |
| --- | --- |
| **Slack,** who is **Nat** | A person. A stoker's boy of about twelve who ran from the Grey Camp. Slack is what the Ash Men call him, and Nat is his name |
| **The coal gang** | The people at the Grey Camp who carry coal for the furnace, and who sleep at the cold end of the camp |
| **The ash tip** | A place at the Grey Camp: the bank at its back where the furnace's ash is thrown, which nobody watches |
| **The Grey Camp's back way** | A thing made (`way/grey-camp-back-way`): the ash tip, known to the player |
| **A haven** | A role: whichever Friendly people take the boy in |
| `runaway/found-him`, `/asked-his-name`, `/wire-mended`, `/hidden`, `/lied-to-clinker`, `/wim-told`, `/kept`, `/paid`, `/handed-back`, `/kept-ahead`, `/found-in-search`, `/fought-for-him`, `/sent-on`, `/sent-alone`, `/told-where`, `/taken-on-the-road`, `/drew-the-camp`, `/left` | Marks, each with the sentence given in its scene |
