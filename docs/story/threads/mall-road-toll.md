# A toll on the Mall Road

A storyline of the open Scablands (`docs/story/open-scablands.md`, section 19), written in full in the form of its
section 21. Kind: a feud. Its data is `src/story/threads/content/mall-road-toll.js`. Claude, 26 November 2026, card
OPEN-WRITE-3. Nothing here is built yet.

Sump, who leads the Road Rats, drags a row of wrecks across the Mall Road where it goes through a pass in the Breaks,
and charges by the wheel. The player can pay him, break his gate, climb round it through the hills, or go to every
people who use the road and get them to refuse him on the same morning.

| This storyline reads | This storyline writes |
| --- | --- |
| The Road Rats' feud, to decide when the gate goes up and how many buggies guard it | The Road Rats' feud |
| A mark that the player promised Sump that Tin Town would pay his toll (`road-rats/toll-promised`) | Scrap paid, taken or found |
| Camps found, and what each has become | Sump's Gate, found and on the map; the gate empty once it is broken or opened |
| The word of Dot, of the Walkers and of each found camp, for who will stand in the road | Those peoples' words, a favour owed by the Road Rats, and promises to guard a cart |
| Nights banked, and a named draw, for when it begins | Marks that say what the road is now: free, taxed or closed |

**It can begin** on any night from the third, once the Road Rats' feud is at Watching or worse. The director draws for
it each night at a chance of thirty-five in a hundred. If the player has promised Sump that Tin Town will pay his toll,
it begins on the next night with no draw. It does not begin while another storyline of the kind "a feud" is open.

**Its sign** is a thing out of place, come across on a drive: a row of wrecks across the Mall Road, with one gap and a
pole across the gap. It is seen from 600 metres on either side of the pass. The gate stands for six banked nights after
the player first sees it. If the player has neither broken it nor refused it by then, it becomes part of the land.

**Its cast.** *The gate* is one place: the pass on the Mall Road, 600 metres north of the Dead Mall, where the road
runs between two hills of the Breaks (`{road: 'mall-road', share: .855}`). *The enemy* is the Road Rats and nobody
else, because the toll is Sump's own idea. *The camp* is a role: the found camp nearest the gate whose people still
live in it. A player who has found no camp plays without one. The chapter below is written for the Glasshouse.

**People in it.** Sump, as section 21 has him: cheerful, greedy, and sure that everything is a deal. Auntie Solder,
Moss, Dot and Rell, as they are. Marigold and Finch of the Glasshouse. New: **Nan Tallow**, a carter who sells candles
and lamp fat from a three-wheeled van, pays every toll she meets and resents each one.

**Where things stand, in this example.** It is the seventh night since the ledger began, and the Five Cold Nights are
over, so no clock runs. The Ash Men still hold the Girder Bridge, which makes the Mall Road Tin Town's only other way
west. In this player's land the Glasshouse stands in the hill country north-west of the Dead Mall. The player mended
its wind pump, so the growers are Friendly. Dot is Strangers. The Walkers are Friendly and camp at the Wash. The Road
Rats are Watching. The Word on the road is 1. There are 60 scrap in the car. No promise was made to Sump.

## Scene 1. The sign

The player is out in the open, driving the Mall Road toward the Dead Mall. Where the road climbs into the pass, six
wrecked cars stand nose to tail across it from hill to hill. There is one gap, with a scaffold pole across it. A tyre
fire burns beside the gap, three buggies are parked by the fire, and a fourth sits high on the western hill. A car
bonnet is nailed to a post, and painted on it in white is "TOLL. 2 SCRAP A WHEEL." Nothing is marked on the map. When
the gate has been in view for three seconds, two thought bubbles come, with the cue `open.toll.seen`.

> *Those wrecks weren't lying across the road the last time I drove this way. Somebody has dragged them there on
> purpose.*
>
> *There's only one gap, and it has a pole across it. This pass is the only way through these hills that a truck can
> use.*

A three-wheeled van is stopped at the pole ahead of the player. Its driver counts scrap into a bucket that a Road Rat
holds out, the pole lifts with the cue `open.toll.pole`, and the van goes through and pulls over on the far side.

The player may drive up to the pole, turn off into the hills, or turn round. Sump's Gate joins the map when the player
comes within 160 metres of it: "Sump's Gate is on your map."

## Scene 2. The gate

The player stops at the pole. Sump climbs down from the roof of a wreck and walks to the window, smiling.

> **Sump:** Good morning, and welcome to my road. Until four days ago it was only a road, and now it's a road with
> somebody looking after it.
>
> **Sump:** The price is two scrap a wheel. You have four wheels, so that comes to eight scrap, and I'll lift the pole
> for you myself.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "What happens to people who don't pay?" | **Sump:** Then they don't go through. If they try to go through anyway, my lads take their wheels and leave them the scrap. Four wheels are worth a lot more than eight scrap, so you can see which choice is the clever one. | Who would be fought, and why, before any fight |
| "Why did you pick this road?" | **Sump:** Because it has a pass in it. People can drive round most places on a road, but a pass is a door, and I've wanted a door of my own for years. | Sump wants a road more than he wants scrap |
| "Who else is paying you?" | **Sump:** The candle woman pays, and so does the pie van. The pie woman called me a name that I'd never heard before, and I'm having it painted on the gate. | Who uses the road. Dot pays, and hates it |
| "Is there another way through?" | **Sump:** There are the Breaks, if you enjoy climbing. I lost a buggy up there in the spring, and I still don't know which hill it's lying on. | Going round is real, and it is rough ground |

Nan Tallow's van is parked beyond the pole. The player can get out and go to her on foot, round the end of the
wrecks, and the choice shows as "Walk up to the candle van".

> **Nan Tallow:** I'm Nan Tallow, and I sell candles. I've paid a toll on every road I ever drove, to one lot of
> robbers or another, and I've hated every one of them.

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Why do you pay him?" | **Nan Tallow:** I pay because I have one van, and he has nine buggies. I'd stop paying him tomorrow if I thought I wouldn't be the only one who stopped. | A toll lasts only while people pay it. This is the first hint of refusing together |

**If the player promised Sump that Tin Town would pay,** his first two lines are different, and paying here counts
toward the five times that were promised.

> **Sump:** There you are! I've been telling everybody that Tin Town would be along to pay, and here you are, right
> on time.
>
> **Sump:** That's eight scrap, and it's the first of the five you promised me. I'm keeping count on the gatepost so
> that neither of us forgets.

**The decision** is made by doing something. Two thought bubbles come when Sump has finished, or when the player gets
back into the car.

> *Eight scrap isn't much to pay today. I wonder what the price will be once everybody has got used to paying it.*
>
> *Sump has three buggies by the fire and one more up on the hill. I can only see one of me.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Put eight scrap in the bucket | The price was said aloud, and the scrap count falls by eight | *It's cheaper than a fight, and I'll be through in a minute.* | The pole lifts. Everybody waiting sees Tin Town pay. The fifth payment ends the storyline with the road taxed (Scene 3) |
| 2 | Turn off the road and climb into the Breaks | Steep hills on both sides, and Sump's line about his lost buggy | *His lads lost a buggy up there. I think I'm a better driver than his lads are.* | The way round (Scene 4). The buggy on the hill is a lookout |
| 3 | Drive at the pole | Four buggies, counted | *If I knock that pole down, it will only stay down for as long as I keep winning.* | The fight at the gate (Scene 5) |
| 4 | Turn round and drive home | The road home is on the map | *Nan said she'd stop paying if she weren't the only one. I wonder how many other people would say the same.* | Auntie Solder has something to say at the hearth (Scene 6) |

**The ledger when the player leaves.** Sump's Gate is found and on the map. Met: "You found Sump's Gate across the
Mall Road on the seventh night." Mark: "Sump told you his price and what he does to people who will not pay it." If
Nan was asked: "Nan Tallow said she would stop paying if she were not the only one."

## Scene 3. Paying

The scrap goes into the bucket with the cue `open.toll.bucket`, the pole lifts, and the player drives through. Nothing
else happens on the road that day. Every later crossing is the same small scene, and each one is a choice again.

> **Sump:** Thank you kindly. You see how easy that was? Nobody shouted, and nobody lost a wheel. I do like a
> customer who can count.

Sump's price follows what he has learnt. After the player's third payment he says so.

> **Sump:** I'm putting the price up to three scrap a wheel from next week. Everybody has stopped complaining about
> two, and that tells me two was too cheap.

**The fifth payment** ends the storyline. The gate is part of the land from then on.

> **Sump:** That makes five times, and I've enjoyed every one of them. You're my best customer, and I tell everybody
> so. They all pay a little quicker when they hear that Tin Town does.

**The ledger.** Scrap, as paid: 8 for each of the first three crossings and 12 after that. Mark: "Tin Town paid Sump's
toll five times, and now everybody on the Mall Road pays it." The Road Rats' feud does not rise. The Word on the road
rises by one. If the toll was promised, the promise is kept and comes off the page.

**Tied back,** some nights later, by Dot at the diner or at the gate.

> **Dot:** My flour comes up the Mall Road, and it costs me three scrap a wheel before it's even a pie. Sump tells
> everyone that Tin Town pays without a word, so the rest of us look mean if we argue.

## Scene 4. The way round

A mission of about four minutes, driven on real hill country. It holds the checkpoints and the signs. The player
leaves the road west of the gate and climbs between the hills of the Breaks. There is no track. Slopes that are too
steep slide the car back down, as they do everywhere in the Scablands, and a slide into a gully costs armour as any
crash does.

**The lookout.** The buggy on the western hill watches the first valley. The rule is the one the Rats' Nest uses in
section 21: if the car stays in the lookout's view for eight seconds, it has been seen. The player keeps to the far
side of the spurs, or waits in a hollow until the lookout's lamp swings away.

- *Not seen:* the player comes down onto the road south of the gate, with the Dead Mall ahead. Mark: "You know a way
  round Sump's Gate through the Breaks." Later crossings by this way cost no scrap and take four minutes.
- *Seen:* the lookout whistles, with the cue `open.toll.lookout`, and two buggies come up the valley to collect.

  > **Sump's rider:** Sump says the hills are his as well, because they're standing next to his road. That will be
  > eight scrap for the pass and eight more for making us climb.

  | | You do | Plain to see | Kept out of sight |
  | --- | --- | --- | --- |
  | a | "Pay sixteen scrap" | The price was said aloud | Nothing more. The way round is known all the same |
  | b | "Outrun them over the hills" | Two buggies, on ground that is bad for buggies | They give up at the second valley |
  | c | "Fight two buggies on the slope" | Two buggies | A car wrecked here is towed home as section 14 says, and the riders take half the scrap in it |

**Sump's lost buggy.** In the second valley a buggy lies on its side against a rock, half covered by sand. Walking up
to it gives one thought, with the cue `open.clue.found`.

> *This must be the buggy that Sump lost in the spring. Its engine is still in it, and nobody else knows it's here.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | Strip it with the wrench | Ten seconds with the wrench, and 14 scrap of parts | *Nobody would ever know who took them.* | Nothing more. Sump goes on wondering which hill it is on |
| b | Leave it, and tell Sump where it is | Nothing is taken | *He treats everything as a deal. Finding his buggy for him ought to be worth something.* | Sump owes the player one favour. It can be spent at the gate for a week of free crossings, or kept for the morning of the stand (Scene 7) |
| c | Leave it and say nothing | Nothing | None | Nothing. It is still there on any later crossing |

If the player tells him, at the gate, on any later day:

> **Sump:** You found my buggy, and you came and told me when you could have stripped it? Nobody has ever done me a
> favour that I didn't have to pay for first. I owe you one now, and I always write down what I owe.

**Who else can use the way round.** Nobody with a cart or a van, because it is too steep. People on foot can. If the
Walkers are Friendly, the player can tell Rell about it at her camp, with the choice "Tell Rell about the way
through the hills".

> **Rell:** A way through the hills that only feet can use? That's the first road anybody ever found that suits us
> better than it suits everyone else. Thank you. I'll remember who showed it to us.

**The ledger.** Mark: "You know a way round Sump's Gate through the Breaks." Scrap: 14 more if the buggy was stripped.
A favour owed by the Road Rats, if Sump was told. The Walkers: a favour owed to the player, if Rell was told. The gate
still stands, and everybody with a cart still pays.

## Scene 5. Breaking the gate

A fight, by car, of about three minutes. The player knows who is being fought and why: Sump said aloud what he does
to people who will not pay. It holds the checkpoints and the signs.

The player drives at the pole. At fifty kilometres an hour or more the pole comes off its chain, with the cue
`open.toll.gate-down`. The three buggies by the fire are moving within five seconds, and the lookout comes down the
hill within twenty. They ram, they shoot, and with four of them round the car they box it in, as the riders do today.
On Easy a pre-teen wins this about four times in ten, and the thought at the gate said how many there were.

- **If the player wins,** three buggies are wrecked and the fourth runs for the wreck fields. Sump shouts from the
  roof of a wreck.

  > **Sump:** All right, all right, that's enough! You've made your point, and you've made it all over my gate. Take
  > your road back, if it matters that much to you.
  >
  > **Sump:** I had a fair price and a good pole, and you've cost me three buggies. I write down everything that
  > I'm owed, and you've just gone to the top of the page.

  The wrecks are dragged apart by the people who were waiting, and the road is open. Nan Tallow drives through.

  > **Nan Tallow:** I'm not going to thank you until I've seen whether he comes back. If he hasn't come back in a
  > week, I'll bring you a box of candles.

- **If the car is wrecked, or boxed in for six seconds,** it is the surround. Sump walks up to the window.

  > **Sump:** That was a silly thing to do, and I'd been so pleasant to you. I'm taking half the scrap in this car
  > for my pole. That isn't robbery. It's the bill for the damage.
  >
  > **Sump:** Your car doesn't come through my gate again, at any price. If Tin Town wants this road, Tin Town can
  > send somebody with thirty scrap in a bucket to tell me it's sorry.

  The car is towed home as section 14 says.

**The ledger, if the gate is broken.** Sump's Gate: empty, and on the map as "Sump's Gate (broken)". The Road Rats:
Raiding. Mark: "You broke Sump's Gate, and the Mall Road is free." Scrap from three wrecks. If the toll was promised,
the promise is broken: the Road Rats go up one more step, to Hunting, and the Word on the road carries it. The
storyline ends with the road free.

**The ledger, if the fight is lost.** Scrap: half taken. Mark: "Sump has closed the Mall Road to Tin Town." The Road
Rats: Raiding. The road is closed to the player's car, and three things are left to do at the gate.

| | You do | Plain to see | Kept out of sight |
| --- | --- | --- | --- |
| a | "Carry thirty scrap to the gate in a bucket, and say sorry" | Sump named the price | The gate opens again at Sump's price, and the road is taxed |
| b | "Turn off the road and climb into the Breaks" | The hills | The way round (Scene 4) |
| c | "Turn round and drive home" | The road home | The stand can still be called (Scenes 6 and 7) |

**Tied back, after a broken gate,** the next time the Road Rats come to fight at a checkpoint.

> **Sump's rider:** That's the car that knocked down the gate! Sump says we're to collect the toll from you wherever
> we find you now, because the whole road is a gate as far as you're concerned.

**Tied back, after a broken promise,** by Nan Tallow, wherever she is next met.

> **Nan Tallow:** I heard that Tin Town gave Sump its word, and then knocked his gate down. I'm glad the gate has
> gone. I'd still like to know whether your word is only good while it's cheap.

## Scene 6. Home, and the round of visits

At the hearth, at dusk, on any day after the gate was seen. This is the fourth way: refuse it together.

> **Auntie Solder:** With the Ash Men sitting on the bridge, that road is the only other way we have to the west. Now
> Sump wants paying every time one of our wheels turns on it.
>
> **Auntie Solder:** A toll lasts exactly as long as people go on paying it. If nobody on that road pays him on the
> same morning, all he owns is a heap of wrecks and a pole.
>
> **Moss:** He can't take the wheels off everybody at once, because he hasn't enough lads to do it. He can take them
> off anyone who turns up alone, though, and he will.
>
> **Auntie Solder:** Tin Town will stand in that road, and you can tell people so. You'll need two more besides us
> before it's worth trying. Go and ask them to their faces. Nobody comes out for a message.

Each people who use the road is now a marker on the map, wherever their own day has put them. The player drives to
each and asks. Nothing counts down. What each one says depends on that people's word for the player.

> *If I ask somebody and they say no, they'll still know what we're planning to do.*

**Dot,** at the diner. The player asks: "Will you stand with us at the gate, Dot?"

| Dot's word | What she says | What it means |
| --- | --- | --- |
| Friendly or Sworn | **Dot:** I'll bring the van, and I'll bring a tray of pies as well, because people stand a great deal longer with something hot in their hands. Tell me the morning and I'll be there. | Dot stands |
| Strangers | **Dot:** I'd like to, and I'm frightened to. That van is my whole living, and it has four wheels he could take. I'll come if you promise me your car stays beside my van from start to finish. | Dot stands if the player says "You have my word. My car stays beside your van." The promise goes on the page: "You promised Dot that your car would stay beside her van at Sump's Gate." If the player says "I can't promise that, Dot." she does not stand |
| Wary or Cold | **Dot:** No. I don't park my van in front of the Road Rats for people I can't rely on. I'd sooner pay Sump his eight scrap, because at least I know what I'm getting for it. | Dot does not stand |

**Marigold,** at the Glasshouse. The camp is whichever camp was cast. The player asks: "Will your people stand with
us at the gate?"

| The camp's word | What is said | What it means |
| --- | --- | --- |
| Sworn | **Marigold:** We'll come, and we'll bring both carts. You don't need to promise us anything. You've kept every promise you ever made here, and that's why we're coming. | The camp stands, with two carts |
| Friendly | **Marigold:** We've only the one cart, and it's the water cart. If he takes its wheels, nine people go thirsty. I'll bring it if you give me your word that your car stays right beside it. | The camp stands if the player says "You have my word. My car stays beside your cart." The promise goes on the page: "You promised the Glasshouse that your car would stay beside its cart at Sump's Gate." If the player says "I can't promise that." the camp does not stand |
| Strangers | **Marigold:** We don't know you well enough for that. You're asking us to put our cart in front of the Road Rats on your say alone. Come back when we know you better. | The camp does not stand |
| Wary or Cold | **Marigold:** No. And I'd think hard about who else you ask, because not everybody on this road wishes Tin Town well. | The camp does not stand. One time in two, drawn from the seed, somebody from the camp sells the plan to Sump for a free crossing |

**Rell,** at the Walkers' camp, if the Walkers are Friendly or better. The player asks: "Will the Walkers stand
with us at the gate?"

> **Rell:** We walk, so he charges us by the cart, and we have three carts and nothing in them worth two scrap. We'll
> stand with you. My people are very good at standing about in the cold.

**Nan Tallow,** at the gate or on the road. The player asks: "Will you stand with us at the gate?" She says yes
once anybody besides Tin Town has said yes.

> **Nan Tallow:** There are two of you already? Truly? Then I'm the third, and I shan't be the last. I told you I'd
> stop paying the day I wasn't the only one.

If nobody besides Tin Town has said yes, she will not be the first.

> **Nan Tallow:** Ask me again when you have somebody else. One van and one car aren't a refusal. They're two
> people about to lose their wheels.

**Calling the morning.** When Tin Town and two others have agreed, Auntie Solder asks at the hearth.

> **Auntie Solder:** That's enough of us to try it. I can send word tonight, and everybody will be at the pass at
> first light. Once I've sent it, we can't call them back. Shall I send it?

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "Send it. We'll stand at first light." | The names of those who agreed are on the page | *Every one of them is only coming because I asked them to.* | The stand is tomorrow's mission (Scene 7). In an act with a clock it is the day's outing |
| 2 | "Not yet. I want to ask somebody else first." | Nothing changes | None | Each one more who stands shortens the morning. Each one asked who says no knows the plan |

**The ledger.** A mark for each who agreed: "Tin Town will stand at Sump's Gate.", "Dot will stand at Sump's Gate.",
"The Glasshouse will stand at Sump's Gate.", "The Walkers will stand at Sump's Gate." and "Nan Tallow will stand at
Sump's Gate." Each promise, as written above. If the
plan was sold: a mark the player cannot see, "Sump was warned about the stand."

## Scene 7. The stand

A mission at first light, about six minutes, at the gate. It holds the checkpoints and the signs. The line forms on
the road north of the pole with the player's car at the front, then Dot's van, the Glasshouse's water cart, the
Walkers with their carts and Nan Tallow's van, each if they agreed. Their horns sound together once, with the cue
`open.toll.horns`. Sump stands on the gate.

> **Sump:** Well, isn't this a lovely queue! I've never had so many customers at once. Who is going to be first?

The player answers. It is the only thing to say.

> **You:** Nobody in this line is paying you today, Sump. Nobody is paying you tomorrow either.
>
> **Sump:** I can count every scrap that I'm not being paid this morning. I can also count the wheels in this line,
> and I have lads here who'd enjoy taking every one of them.

**The squeeze, by car, about three minutes.** The buggies come down both sides of the line. They rev, they bump, and
they try to push one cart out of the line and herd it to the bucket. The player drives up and down the line and puts
the car between each buggy and the cart it is after, shoving the buggy off as on any run.

- The buggies go first for the cart whose people are least sure: one the player promised to stay beside, and
  otherwise Nan Tallow's.
- **The line holds** if no cart is out of it for more than six seconds. It must hold for three minutes with three
  standing, and half a minute less for each one more.
- **A promise is kept** if the player's car is never more than thirty metres from that cart while a buggy is on it.
  With two promises, the player cannot be beside both carts at once.
- **If Sump was warned,** two more buggies are waiting behind the wrecks, and he says who told him.

  > **Sump:** I knew that you were coming this morning. Somebody at the Glasshouse sold me the day for one free
  > crossing. That was a very good price, and I'd have paid three.

- **Shooting first makes it a fight.** The carts pull back up the road, nobody on them is hurt, and the morning
  becomes Scene 5 with two more buggies in it.

**Sump's offer to the player alone.** After the first minute, the buggies draw off and Sump walks down to the
player's window. He speaks low, so that the line cannot hear.

> **Sump:** *(low)* You're the one I could do business with. Drive through now and your car goes free on my road for
> ever. Leave the rest of them here, and they can each decide for themselves.

> *Every car and cart behind me came here because I asked them to come.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | Drive through the gap | The pole is up, and it is up for the player alone | *I'd never have to pay him again.* | The line breaks behind the player. Everybody who came thinks one word less of the player, each promise is broken, and the storyline ends with the road taxed for everyone else |
| b | Stay where you are | Nothing moves | *He only made me that offer because the line is holding.* | The squeeze goes on for the rest of its time |

If the player stays:

> **You:** They came because I asked them, Sump. I'm staying where I am.
>
> **Sump:** That's a pity. I do hate it when somebody turns down a bargain.

**If the line holds.** The buggies pull back to the fire. Sump climbs down and walks along the whole line, looking at
each cart, and then speaks loudly enough for everybody.

> **Sump:** All right. I can do the sum as well as any of you, and there's no toll in it. So here's a different
> offer, and you can all hear this one.
>
> **Sump:** A road wants looking after. For one scrap a cart, my lads keep this pass clear, tow anybody who breaks
> down in it, and see off the Ash Men if they come sniffing. It isn't a toll. It's a wage.

Those who stood each say one thing, and they do not agree.

> **Dot:** I didn't get out of bed before dawn to haggle with him. We came here to pay nothing, and nothing is what
> I mean to pay.
>
> **Nan Tallow:** One scrap, and a tow when my axle goes? I've paid a lot more than that for a lot less. I'd take it
> and be glad.
>
> **Marigold:** If we pay him a wage, he'll be here every day, and so will his buggies. If we don't, he'll be
> somewhere else, and we won't know where.

> *They're all looking at me. Whatever I say now, some of them will think I chose wrongly.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "No toll and no wage. The road was free before you came." | The pole comes down and the Rats leave the pass | *He'll go somewhere, and he won't be in a good mood when he gets there.* | The road is free. The Road Rats go up one step. Nobody keeps the pass |
| 2 | "One scrap a cart, and you keep the pass. That's a fair wage." | The pole stays up, and a Rat chalks a tally of carts | *I wonder what Sump does with a road once he has one.* | The road is taxed lightly. The Road Rats' feud does not rise. Dot is cross. It is the first step toward a peace with Sump |

> **Sump:** *(1)* Then you can have your free road, and all the holes in it. Don't come looking for me the day
> somebody worse than me finds this pass empty.
>
> **Sump:** *(2)* Now that is a deal! I told the lads that Tin Town could be reasoned with. You won't see a wreck on
> this road that we didn't put there ourselves.
>
> **Dot:** *(2)* So we stood in the cold for an hour to pay him less. I'll pay it, because I said I'd stand with
> you. I shan't pretend that I like it.

**If the line breaks.** A cart is pushed out for six seconds, a buggy on each side walks it to the bucket, and its
driver pays.

> **Sump:** There, that's one of you paid. One is all a toll ever needs. Tomorrow it will be two of you, and by the
> end of the week you'll all be telling each other it was never worth the fuss.
>
> **Sump:** As for Tin Town, my gate is shut to you until I've had thirty scrap and an apology, and I want the
> apology first.

**The ledger, by how it ended.**

| How it ended | What is written |
| --- | --- |
| The line held, and no wage | Sump's Gate: empty. The Road Rats: up one step, to Raiding here. Each people who stood: up one word. Mark: "The Mall Road refused Sump's toll together, and it is free." |
| The line held, and a wage | Sump's Gate stays. The Road Rats' feud does not rise. Each people who stood: up one word, but Dot's word does not move. Mark: "Sump keeps the pass on the Mall Road for one scrap a cart." |
| The player drove through alone | Each people who stood: down one word. Each promise broken. Mark: "You drove through Sump's Gate and left the others standing in the road." The road is taxed |
| The line broke | Mark: "Sump has closed the Mall Road to Tin Town." A promise to guard that cart is broken, and that people go down one word. The others' words do not move |
| A promise was kept | It comes off the page, and that people are up one word more: "You stayed beside Dot's van, as you said you would." or "You stayed beside the Glasshouse's cart, as you said you would." |

**Tied back, after driving through alone,** by whoever stood, at the player's next visit.

> **Marigold:** We waited in that road until the sun was right up, and then we paid him, one cart at a time. Finch
> asked me why you'd driven off without us. I told him I'd let you answer that yourself.

## How you can lose

- **You pay, and go on paying.** The price rises, and so does everybody else's, because Tin Town was seen to pay.
- **You are seen in the Breaks.** It costs twice the toll, or a fight on a slope.
- **You lose the fight at the gate.** Half the scrap in the car is gone, and the road is closed to Tin Town.
- **You break a promise to Sump.** The Road Rats go to Hunting, and people on the road ask what your word is worth.
- **You ask the wrong camp.** Somebody sells the morning to Sump, and two more buggies are waiting.
- **You cannot be beside two carts.** A promise is broken in front of the people it was made to.
- **The line breaks.** The toll stands, and the road is closed to Tin Town.
- **You take Sump's offer.** You never pay again, and everybody who came out for you remembers it.

Nobody dies, nothing saved is wiped, and no screen says the game is over.

**If you never follow the sign.** The gate stands for six banked nights and then becomes part of the land. Sump's
price goes to three scrap a wheel, the trader at Tin Town's gate asks a quarter more for everything that came up the
Mall Road, and the Road Rats have two more buggies at every checkpoint on their own ground. Some nights later Dot
mentions it.

> **Dot:** Pies are a scrap dearer from today, and you can blame the Mall Road for it. Somebody ought to have done
> something about that gate in its first week, while it was still only a pole.

## What this changes later

- A road that is **free** has no gate, and the Road Rats are angrier. At Raiding they are the likelier enemy wherever
  a storyline casts one, and they come to fight at checkpoints more often.
- A road that is **taxed** costs scrap at every crossing, for the player and for everybody whose goods come up it.
- A road that is **closed** sends Tin Town's cars round by the Breaks, or to Sump with a bucket and an apology.
- **Sump keeping the pass** is the beginning of the road of his own that section 20 says is his price for peace.
- Peoples who stood and were not let down are up one word, and a people at Sworn come when called.
- The way round stays known, and Sump's lost buggy stays where it is until somebody strips it or tells him.

## When nobody ever wrote a fact it reads

| The fact | What happens without it |
| --- | --- |
| The promise to Sump (`road-rats/toll-promised`) | The storyline begins by its draw. Sump's first lines are his ordinary ones, and no promise can be kept or broken |
| A found camp | No camp is cast. The round of visits has Dot, the Walkers if they qualify, and Nan Tallow, and the stand can still be called with Tin Town, Dot and Nan |
| Dot's word | She is Strangers, as anybody is who has no word yet, and stands if the player promises to stay beside her van |
| The Walkers' word | They are not at a camp to be asked, and they do not stand |
| The Road Rats' feud | It is Watching, where every feud begins, and four buggies guard the gate |

## Crossings

| When this has happened | This changes |
| --- | --- |
| The gate was broken, so the Road Rats' feud is Raiding (this storyline writes it) | The Road Rats are the likelier enemy in every storyline that casts one by feud, as section 19 promised |
| Sump keeps the pass (`mall-road-toll/sump-keeps-the-pass`) | The Road Rats do not come to fight at checkpoints on the Mall Road. One of Sump's riders can walk into a market at Tin Town and be served. A later peace with Sump starts from here |
| The player knows the way round (`mall-road-toll/knows-the-round`) | Any errand to the Dead Mall may be driven by the Breaks, out of sight of the pass |
| The road is closed to Tin Town (`mall-road-toll/road-closed`) | A camp's need for something fetched from the Mall side takes one night longer, and whoever asks for it says why |
| The player promised Sump that Tin Town would pay (`road-rats/toll-promised`, written wherever that promise is made) | The gate stands at once. Paying counts toward five. Breaking or refusing the gate breaks the promise, and the Road Rats go one step higher |
| A trader's word is Friendly or better (this storyline reads it) | That trader's truck joins the line at the stand as one more, without being asked twice |

## What it takes to play

Three sittings of about ten minutes, which may be days apart: the gate, with a crossing by the Breaks or a fight; the
round of visits; and the stand. A player who pays and drives on has played two minutes of it.

## What it needs made

| What | New or in hand |
| --- | --- |
| Sump's Gate: six wrecks in a row, a scaffold pole on a chain, a tyre fire, a painted bonnet on a post, a bucket | The wrecks are in hand (`src/world/boneyard-wrecks.js`). The pole, the post and the bucket are small new things |
| The pass and the Breaks | In hand: the pass and its two shoulders are in `src/world/scablands-height.js` |
| The lookout's eight seconds | In hand once OPEN-BURNED-SCOUT has built it for the Rats' Nest |
| Sump's lost buggy, on its side | The riders' buggy in hand, laid over |
| Figures: Sump and two Road Rats on foot | OPEN-FIGURES-2 |
| Figure: Nan Tallow, and her three-wheeled van | New |
| The line at the stand: carts and vans that keep their places and can be pushed out of them | New. It is the one thing here that the game cannot do yet. The buggies' pushing is the riders' boxing in, which is in hand |

**Sound cues.** `open.toll.seen`: wind in the pass, and one low note, when the gate first comes into view.
`open.toll.pole`: a scaffold pole lifting on a chain. `open.toll.bucket`: scrap dropped into a tin bucket.
`open.toll.lookout`: a two-finger whistle from high on a hill. `open.toll.gate-down`: a pole ringing on the road.
`open.toll.horns`: five different horns sounded together. `open.toll.tally`: chalk on a car door, for the wage. The
find at the buggy is `open.clue.found`, in hand.

## New names

| Name | What it is |
| --- | --- |
| **Sump's Gate** | A site of the kind "den": the Road Rats' toll gate in the pass on the Mall Road, 600 metres north of the Dead Mall. Its id is `sumps-gate` |
| **Nan Tallow** | A person: a carter who sells candles and lamp fat from a three-wheeled van. Her id is `nan-tallow` |
| **The sorry bucket** | Thirty scrap and an apology, which is Sump's price for opening a road he has closed |
| **The wage** | One scrap a cart, paid to the Road Rats for keeping the pass |
| `road-rats/toll-promised` | A mark this storyline reads and never writes: the player promised Sump that Tin Town would pay |
| `mall-road-toll/price-heard`, `mall-road-toll/nan-asked`, `mall-road-toll/paid-once` to `mall-road-toll/paid-five` | Marks of the gate and of paying |
| `mall-road-toll/knows-the-round`, `mall-road-toll/buggy-stripped`, `mall-road-toll/buggy-told`, `mall-road-toll/walkers-shown` | Marks of the way round |
| `mall-road-toll/stands-tin-town`, `mall-road-toll/stands-dot`, `mall-road-toll/stands-camp`, `mall-road-toll/stands-walkers`, `mall-road-toll/stands-nan`, `mall-road-toll/sump-warned` | Marks of the round of visits |
| `mall-road-toll/gate-broken`, `mall-road-toll/refused-together`, `mall-road-toll/road-free`, `mall-road-toll/road-taxed`, `mall-road-toll/road-closed`, `mall-road-toll/sump-keeps-the-pass`, `mall-road-toll/drove-through-alone`, `mall-road-toll/promise-broken` | Marks of how it ended |
