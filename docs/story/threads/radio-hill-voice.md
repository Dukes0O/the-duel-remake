# The voice on Radio Hill

A storyline of the open Scablands (`docs/story/open-scablands.md`, section 19), written in full in the form of that
page's section 21. Kind: a find. Its data is `src/story/threads/content/radio-hill-voice.js`, and every line below is in
that file exactly as it is here. Card OPEN-WRITE-2, 26 November 2026. Nothing here is built yet.

The choice at its heart: trust a voice you cannot see, and drive where it says.

## 1. What it reads and what it writes

| This storyline reads | This storyline writes |
| --- | --- |
| Whether Radio Hill is found, and the sisters' word for the player | Radio Hill found. The sisters' word |
| The Road Rats' feud, for how many wait in the Pocket and whether Parrot will deal | The Road Rats' feud |
| The Walkers' word, for one answer on the radio | The Pocket found |
| Whether a tower stands on the Crow's Step, for one line from its keeper | A second set on Radio Hill (a thing made), or two voices on one station (a mark) |
| The scrap in the car, for wheels and for fuel | Scrap. A promise of fuel. The Word on the road |
| The night, for when it can begin | Marks that later scenes read |

## 2. When it can begin, and its sign

**It can begin** on any night from the second, after dark, while the player is out in the open in the car, on a road
within four kilometres of Radio Hill. The director draws for it each night at an even chance. It does not begin on the
last night of an act, or while a mission is running.

In the facts of section 12: `{all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: 'radio-hill-voice', at:
'any'}}, {fact: 'draw', name: 'start', chance: .5}]}`.

**Its sign is a call:** a voice on the car's radio. It is heard for three nights running. On the fourth night the
radio is quiet, and the storyline has been ignored (section 6).

## 3. Its cast, and the people in it

This storyline is tied to one place, so it names it. *The hill* is Radio Hill, wherever the land's seed has put it
(card OPEN-SITES gives its three possible positions). *The Pocket* is a new site, a horseshoe of stacked wrecks with
one way in. It stands at whichever of its three positions is most nearly opposite the hill as seen from Tin Town's
gate, so that the two voices never send a driver the same way. A line may hold `{hill.bearing}` or `{pocket.bearing}`,
which is one of the eight compass words worked out from the car to the site.

**People in it.** Hetty and Bern of Radio Hill, as OPEN-SITES has them: Hetty listens to everything and repeats most
of it, and Bern mends everything and says little. Auntie Solder, Cinder and Moss, as they are. Rell, if the Walkers
are Friendly. New: **Parrot**, a Road Rat who can do anybody's voice. She has listened to Hetty every night since the
spring, and she uses Hetty's own words to bring cars into the Pocket, where Sump's Rats take the wheels off them. She
is cheerful about it, she hurts nobody, and she likes the radio a good deal more than she likes the robbing.

**The enemy is always the Road Rats.** Old Smoke will not have a radio near him, and Cinder says why.

## 4. Where things stand, in this example

It is the third day of Five Cold Nights, after dark, and the hearth has not been banked yet. The player is driving
home down the Ridge Road. Radio Hill has not been found; the land's seed has put it on the mesa north-west of Tin
Town, so the Pocket stands in the wreck fields to the south. The Road Rats are Watching, and so three buggies wait in
the Pocket. The Walkers are Friendly. No tower stands. There are two embers in the store and 90 scrap in the car. The
named draw `who-calls-first` has put Hetty first.

## 5. Scenes

### Scene 1. The first call

The road is dark and empty. The car's radio clicks and hisses, with the cue `open.radio.voice`. No marker appears on
the map and no line appears on the screen.

> **A voice:** *(on the radio, through static)* This is Radio Hill, calling the car with two lamps on the road below
> us. I can see your lamps from where I'm sitting. If you can hear me, stop your car where it is, and then I'll know.

> *Nobody in Tin Town has ever told me about a place called Radio Hill.*
>
> *Whoever she is, she can see me, and I can't see her.*

The answer is made by doing something. A car that stands still for three seconds has stopped.

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Stop the car | A dark road, and nobody on it | *If I stop, somebody out in the dark knows exactly where I am.* | She answers at once, and she watches for this car from now on (Scene 4) |
| 2 | Keep driving | The road ahead | *I'm not stopping on a dark road because a stranger tells me to.* | She gives her name all the same. Nothing is lost |

**If the car stops.**

> **A voice:** *(on the radio)* You've stopped! Bern, come and look, the car has stopped.
>
> **Hetty:** *(on the radio)* My name is Hetty, and my sister and I keep the mast up here. We have the news of every
> road, and the kettle is on. Turn to the {hill.bearing} and look for a red lamp that blinks.

**If the car keeps going.**

> **Hetty:** *(on the radio)* You didn't stop. Well, I wouldn't stop for a stranger either. I'm Hetty, and the red
> lamp to the {hill.bearing} is ours. I'll be on the air again tomorrow night, in case you change your mind.

**The ledger.** If the car stopped, a mark: "You stopped your car on a dark road because a voice asked you to."

### Scene 2. The second voice

About twenty seconds later, on the same radio, with the cue `open.radio.second-voice`. The words are nearly Hetty's
own. Under them, an engine is ticking over.

> **A second voice:** *(on the radio, through static)* This is Radio Hill, calling the car on the road. Take no notice
> of that other station, driver. There are people about tonight who copy our voice to lead cars off the road.
>
> **A second voice:** *(on the radio)* The real hill is to the {pocket.bearing}, where you'll see a white lamp held
> steady. Come quickly, and tell me where you are now, so that I can guide you in.
>
> **Hetty:** *(on the radio)* Who is that on my set? I have said those words every night for eleven years, and that is
> not me saying them.
>
> **A second voice:** *(on the radio)* Do you hear how well she does it, driver? She even sounds cross. Please be
> careful which of us you believe.

> *There are two of them now, and each one says that the other is lying.*
>
> *One of them said that she could see my lamps. I don't think both of them can.*

**If the draw puts the second voice first,** she opens the night with this line, Hetty's call of Scene 1 cuts across
it, and the rest follows as written.

> **A second voice:** *(on the radio, through static)* This is Radio Hill, calling anybody who can hear us. If you can
> hear me, tell me where you are, and I'll guide you in to a fire and a hot meal.

**If a tower stands on the Crow's Step,** its keeper speaks next, unasked.

> **The keeper:** *(on the radio)* I can see both of those lamps from up here. The red one is on a mast, on top of a
> mesa. The white one is on a pole, and the pole keeps moving about.

**You may test them before you choose. Testing costs nothing.** Each question is put to both voices, and both answer.

| You ask | The first voice | The second voice | What it shows you |
| --- | --- | --- | --- |
| "What can you see from where you are?" | **Hetty:** *(on the radio)* I can see the road with you on it, and the glow of your town's hearth. I can also see three sets of lamps standing still among the wrecks to the {pocket.bearing}, and they haven't moved all evening. | **A second voice:** *(on the radio)* I can see the whole land from up here, driver. What I can see most clearly is that you're wasting time. | The first voice names things that are really there. Three cars are waiting to the {pocket.bearing} |
| "What colour is my car?" | **Hetty:** *(on the radio)* I can't tell you that, because it's dark and you're a long way off. I can tell you that your left lamp is dimmer than your right one. | **A second voice:** *(on the radio)* It's a very fine car, driver, and that's all I need to know. There's no time for games tonight. | One of them can see the lamps, and says plainly what she cannot see |
| "Blink your lamp three times for me." | **Hetty:** *(on the radio)* There you are, that was three. Bern says that if I do it again the bulb will go, and it's the only one we have. | **A second voice:** *(on the radio)* Ours isn't the blinking kind of lamp, driver. A steady light is an honest light. | Far to the {hill.bearing} the red lamp goes dark and then blinks three times, with the cue `open.lamp.blink`. The white lamp does not change. This is seen only from ground where both lamps are in view |
| "What's that noise behind you?" | **Hetty:** *(on the radio)* That's our generator. It has coughed like that ever since the dust storm, and Bern says it wants a new filter. | **A second voice:** *(on the radio)* That's only the wind in the mast, driver. | A thought follows: *That didn't sound like wind. It sounded like an engine ticking over.* |
| "Who else is up there with you?" | **Hetty:** *(on the radio)* There's only my sister Bern, who mends things. She's holding a coil of wire and shaking her head at me. | **A second voice:** *(on the radio)* There's a whole friendly camp of us here, with a fire, hot food and room for your car. | The second voice offers more than a hilltop could hold |

**You may also call home. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Auntie, is there a place called Radio Hill?" | **Auntie Solder:** *(on the radio)* There was a mast on one of the mesas when I was a girl, and it played dance music on Saturdays. I'd no idea that anybody was still up there. I do know that nobody ever built a mast in a scrap heap. | A mast stands on high ground |
| "Cinder, would the Ash Men use a radio?" | **Cinder:** *(on the radio)* Old Smoke says that a radio is a small fire that talks, so he won't have one near him. The Road Rats would use one, though. They'll use anything that they can unbolt from a truck. | Who the liar probably is |
| "Moss, what's out to the {pocket.bearing}?" | **Moss:** *(on the radio)* There's nothing out that way but wrecks stacked in rows, with one way in and no way out. I wouldn't take Bess in among them, and I wouldn't take your car in either. | The ground the second bearing leads to |
| "Rell, have your people seen a red lamp at night?" *(only if the Walkers are Friendly)* | **Rell:** *(on the radio)* We carry no radio, but we've walked under that red lamp. Two women live up there, and one of them waved to us for an hour. Nobody waves for an hour if she means you harm. | The red lamp, vouched for by somebody who has seen it |

**The decision** is made by going somewhere.

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Drive to the {hill.bearing}, toward the red lamp | A red lamp, high up, that blinks | *A lamp on top of a hill is where a mast ought to be.* | The foot of the ramp (Scene 3) |
| 2 | Drive to the {pocket.bearing}, toward the white lamp | A white lamp, low down, held steady | *She did tell me to come quickly.* | The Pocket (Scene 4) |
| 3 | Drive home and bank the hearth | The road home | *Neither of them is going anywhere tonight, and I can think better by the hearth.* | Both call again tomorrow night. Nothing is lost by sleeping on it, until the fourth night |

**The ledger when the player leaves.** Marks: "You heard two voices on the radio, and each of them said it was Radio
Hill." And, if any test was made: "You tested the two voices before you believed either of them."

### Scene 3. The ramp

The red lamp is on a mast on top of a mesa. One ramp goes up, cut into the side of the rock, with no wall and no lamps
on it. The player stops at its foot.

> **Hetty:** *(on the radio)* The only way up is the ramp, and it has no lamps on it and no wall. I'll talk you up it,
> if you'll trust me to. Will you come up?

> *I can't see the edge of that ramp at all. She says that she can.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | "Talk me up. I'm coming." | A dark ramp and a long drop | *If she's the liar, this is exactly where she would want me.* | The climb, below. A driver who comes up in the dark on Hetty's word is Friendly from the first cup |
| b | "Not tonight. I'll come back when I can see the edge." | The road home | None | By day the ramp is plain and safe, and climbing it is no mission. The sisters are Strangers, as they are for anybody who finds them |

**The climb, by car, about three minutes.** A mission. It holds the checkpoints and the signs. The lamps show twelve
metres of ramp and nothing of the drop. Hetty watches the car's lamps from above and calls each turn four seconds
before it comes. While Parrot still has her set, she cuts in on the same station with calls of her own, with the cue
`open.radio.cut-in`. On the climb every radio line is shown under the one label "The radio", because a driver hears
two voices from one set and has only the words to tell them apart. The voice that says what it can see is Hetty's.

> **Hetty:** *(on the radio)* Driver, the way up starts at the white rock on your left. Take it slowly. I can see your
> lamps all the way, so I'll tell you what's coming before you reach it.
>
> **Hetty:** *(on the radio)* There's a bend to your right in a moment, with no wall on the outside of it. Keep close
> in to the rock.
>
> **Parrot:** *(on the radio)* Keep left here, driver, well out to the left. The rock on your right has fallen away.
>
> **Hetty:** *(on the radio)* That wasn't me! Keep right, close to the rock. Your left lamp is shining out over nothing
> at all.
>
> **Hetty:** *(on the radio)* Now stop where you are. The ledge in front of you is broken, and your lamps won't show
> you the hole until you're in it.
>
> **Hetty:** *(on the radio)* Turn hard to your left and come up the inside. Bern cut that way with a pick, and she's
> very proud of it.
>
> **Parrot:** *(on the radio)* You're nearly at the top. Put your foot down for the last rise, or you'll roll all the
> way back.
>
> **Hetty:** *(on the radio)* Slowly, please, slowly. The top is flat for two car lengths, and after that there isn't
> any more top.
>
> **Hetty:** *(on the radio)* That's it, you're up. Turn your lamps off before you blind my sister. Welcome to Radio
> Hill.

If Parrot has lost her set, or the player has already driven out of her Pocket, she does not cut in, because she has
learnt to leave this driver alone. Her two calls are not spoken, and Hetty's fourth line is this one.

> **Hetty:** *(on the radio)* Keep to the right here, close to the rock. There's nothing on your left but air.

On Easy a car that follows a false call has two seconds to brake before a wheel goes over, and Hetty shouts.

- *Up.* Radio Hill is found, with the cue `open.site.found`. The first meeting is spoken as OPEN-SITES has it, and
  then these.

  > **Hetty:** You trusted a voice you couldn't see, all the way up a cliff in the dark. I'd like to say that I'd have
  > done the same, but I don't think I would have.
  >
  > **Bern:** She talked you up, and I cut the road. I'd like that remembered as well.

  The sisters: Friendly. Mark: "Hetty talked you up the ramp in the dark, and you did everything she said."
- *Over the edge,* with the cue `open.ramp.edge`. The car slides to the foot of the mesa on its side. Nobody is hurt.
  The car's armour is gone, and Bern comes down with the winch truck.

  > **Bern:** That's the third car that the other voice has put off our ramp this year. You're the first driver who
  > was coming to see us, so I'll winch you up for nothing.
  >
  > **Hetty:** I'm so sorry, driver. I said right, and she said left, and you had no way of knowing which of us was
  > which.

  Radio Hill is found all the same. The sisters: Strangers. Mark: "The other voice put your car off the ramp at Radio
  Hill."

**If the player comes up by day after hearing the calls and not answering them,** Hetty says one thing more.

> **Hetty:** You came up in daylight, which was very sensible of you. I talked to you for three nights, you know. I'd
> begun to think that I was talking to the wind.

**The ledger at the top.** Radio Hill is on the map for good. The sisters' word as above. The storyline rests at "the
other voice" (Scene 5) until the player comes back after a banked night.

### Scene 4. The Pocket

For a player who follows the second bearing. The white lamp stands a hundred metres inside a horseshoe of wrecks
stacked three high, with one mouth, just wide enough for two cars. The player may stop short of the mouth and look,
from the car or on foot. The cue `open.clue.found` marks each thing, and each gives one thought.

| What is there | The thought | What it tells |
| --- | --- | --- |
| Many narrow tyre tracks go in through the mouth, and none of them comes out again | *A lot of cars have gone in here, and I can't see where any of them came out.* | Buggies, and they are still inside |
| The white lamp hangs on a pole, and somebody is holding the pole very still | *That lamp isn't on a mast. Somebody is standing there holding it up on a pole.* | There is no mast. There is a Road Rat with a lamp |
| Four car wheels are stacked beside the mouth, with the tyres still on them | *Those are good wheels, and nobody throws good wheels away. They came off somebody's car.* | What is taken here |
| The wrecks stand higher than the car on three sides | *I'm at the bottom of a heap of wrecks. Nobody would build a radio mast down here.* | It was never Radio Hill |

While the player waits, the second voice goes on.

> **A second voice:** *(on the radio)* You're so close now, driver. Come on in to the light, where it's warm.

**The decision at the mouth.**

> *She promised a fire and hot food. I can't see a fire, and I can't smell any smoke.*
>
> *If I drive in there, the only way out is the way I came in.*

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | Drive in to the lamp | A white lamp and a narrow mouth | *It could still be a camp. Camps do hide themselves.* | The trap is sprung, below |
| b | Back out and drive for the red lamp | The red lamp still blinks to the {hill.bearing} | *One of those voices could see my lamps. It wasn't this one.* | Scene 3. Parrot knows that her trick has failed, and says so |
| c | Turn off your lamps and wait at the mouth *(only if the wheels or the tracks were found)* | Darkness, and the engine off | *She can't see me. I'd like to know what she does when the car doesn't come.* | She walks out to look, and the player sees who she is |

**b. Backing out.**

> **A second voice:** *(on the radio)* Off you go, then. It was worth a try. Give my love to the old girl on the hill,
> and tell her that she drops her voice at the end of "anybody".

**c. Waiting in the dark.** After twenty seconds a woman in a coat of seat covers walks out along the row of wrecks
with a radio set on a strap, talking into it in Hetty's voice. Behind her, three buggies start their engines.

> **A second voice:** *(on the radio)* Driver? Driver, are you there? Please answer me. We're all so worried about you
> up here on the hill.

> *That's a Road Rat with a radio on a strap, and she's doing the voice. There are three buggies behind her with their
> engines running.*

The player drives away in the dark, and nobody follows a car that they cannot see. Mark: "You saw who the second voice
is."

**a. The trap sprung,** with the cue `open.trap.sprung`. Three buggies close the mouth behind the car. Before anything
moves, the second voice speaks again, and this time it is her own.

> **Parrot:** *(on the radio)* That was lovely driving, straight to where I asked you. My name is Parrot, and I do the
> voices. Those are Sump's Rats behind you, and all we want tonight is your wheels.
>
> **Parrot:** *(on the radio)* Nobody gets hurt in my Pocket. You can step out and walk home in your boots, or you can
> try for the mouth, and then we'll want the scrap in your boot as well.

> *Three cars in a place this narrow can't all get at me at once.*
>
> *Wheels can be bought again. I'm not sure that the whole car can.*

| | You do | Plain to see | Kept out of sight |
| --- | --- | --- | --- |
| 1 | Fight your way out through the mouth | Three buggies and one gap | A fight by car, about two minutes. On Easy a pre-teen wins it about five times in ten. If the Road Rats are Raiding or worse, there are five buggies |
| 2 | Step out and give up the wheels | The car stays, and the player walks | The wheels are gone and nothing else. The Road Rats' feud does not move |

**If the car stopped for Hetty in Scene 1,** she has been watching for it, and she speaks as the fight begins. The gap
she names is marked, and a car that leaves by it takes half the knocks.

> **Hetty:** *(on the radio)* Driver, I can see lamps bunched together among the wrecks, and I think one pair is yours.
> The buggy on your left has its lamps pointed at the wall. The gap is on that side.

- *Out.* Two buggies are wrecked and the third backs away. The Road Rats' feud rises one step, and the wrecks pay
  scrap.

  > **Parrot:** *(on the radio)* All right, all right, mind my paint! Go on, then. I'll say this for you, driver:
  > nobody has ever driven out of the Pocket before.

  Mark: "You drove out of the Pocket with all four wheels." Parrot does not cut in on this driver's climb.
- *Wrecked, boxed in for six seconds, or the wheels given up,* with the cue `open.wheels.off`.

  > **Parrot:** There, that's all four of them off, and there isn't a scratch on you. I'd say thank you, but I expect
  > you'd rather I didn't.

  The player gets home as section 14 of the design has it: a tow from the nearest people who are Friendly, which
  spends a favour, or a lift from a trader for scrap. The car is at the yard at dawn on blocks, and Odessa fits a set
  of wheels for 30 scrap. A player who fought and lost also loses a third of the scrap that was in the car. Mark: "The
  Road Rats took your wheels in the Pocket."

Whichever way it went, the Pocket is on the map for good, and the red lamp is still blinking.

> **Hetty:** *(on the radio)* I watched all of that, and I couldn't do a thing about it. Will you come up now, and let
> me say sorry for a voice that wasn't mine?

**The ledger when the player leaves.** The Pocket: found. The Road Rats' feud, and the scrap, as above. The climb of
Scene 3 is open the same night to a car that still has its wheels, and on any later night.

### Scene 5. The other voice

On the hilltop, at the hut, on any visit after a banked night, for as long as Parrot still has her set. Hetty is not
at the set. She is standing at the edge, looking south.

> **Hetty:** She was on the air again last night, driver, using my words. A hauler from the Mall Road followed her
> white lamp, and he walked home without his wheels.
>
> **Bern:** People have begun to say that Radio Hill robs travellers. Nobody will answer a station that robs them.
>
> **Hetty:** I waited eleven years for somebody to answer me. I don't want the first thing they hear to be a lie in my
> own voice.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "How long has she been doing it?" | **Hetty:** Since the spring. At first she only repeated my weather, and I was almost pleased, because it meant that somebody was listening. | She began as a listener |
| "Can't you talk over her?" | **Bern:** We can, if Hetty sits at the set from dusk until dawn and never stops. She'd be no use for anything else, and the generator would drink fuel all night long. | Talking over her costs the sisters their nights, and fuel |
| "Where does she call from?" | **Hetty:** She calls from a buggy, so it moves about. But the engine behind her voice is always the same one, and after dark it always stands in the Pocket. | Where to find her. A rumour: the circle for the Pocket, if it is not found yet |
| "What does she want?" | **Hetty:** Wheels, I suppose. Though last week she read out all of my news after I'd gone to bed, and nobody was robbed that night. I've wondered about that ever since. | She may like the radio for its own sake |

**The decision.**

> *Hetty wants her own voice back. I don't think she wants anybody hurt to get it.*
>
> *Whatever I do about the second voice, the Road Rats are going to hear of it.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "I'll go to the Pocket and take her set away from her." | Bern says how many buggies are there | *Without a set she can't call anybody. Sump will also know exactly who took it.* | A mission (Scene 6). The Road Rats' feud rises. The hill gains a second set |
| 2 | "Talk over her every night. I'll keep you in fuel for as long as it takes." | Bern says what it will cost | *That keeps everybody safe, and it means Hetty never sleeps.* | A promise of fuel. Hetty has no news to give while it lasts. Nothing is settled |
| 3 | "Give me the microphone. I'd like to talk to her myself." | Hetty hands it over, frowning | *She copied Hetty all spring before she robbed anybody. Perhaps what she wants is to be listened to.* | A talk on the air (Scene 7) |

**2. Talking over her.**

> **Bern:** The generator drinks a can of fuel a night when the set never rests, and we have nine cans. Bring us a drum
> from Tin Town before they're gone, and we can keep it up.
>
> **Hetty:** Then I'll sit up every night and say my own words louder than she says them. I shan't have any news for
> you while I'm doing it, because I can't talk and listen at once.

A promise goes on the page: "You promised Radio Hill a drum of generator fuel within nine nights." Moss sells a drum
for 25 scrap, and it is carried in the car. While Hetty talks over her, nobody is brought into the Pocket, and the
row "What Hetty knows" of OPEN-SITES gives only this line.

> **Hetty:** I've no news for you, driver. I've spent every night this week talking over that woman, and I haven't
> listened to anything else.

Each drum buys nine more nights. A promise that is broken costs a word, the mast goes dark, and the white lamp is the
only voice on the air. The other two choices stay open on every visit.

**The ledger.** The promise. Mark: "Hetty talks over the second voice every night, on your fuel." The sisters' word
rises one step when the first drum is brought.

### Scene 6. Taking the set

> **Bern:** There are three buggies in the Pocket after dark, and one of them carries her set. I'd leave your car well
> back from the mouth, where they can't hear its engine. Will you go tonight?

| | You say | What happens |
| --- | --- | --- |
| a | "I'll go tonight." | The mission begins at dusk. It is the day's outing in an act with a clock |
| b | "Not yet." | Nothing changes. Bern asks again on the next visit |

**The Pocket, on foot, about four minutes.** A mission. It holds the checkpoints and the signs. The car is left two
hundred metres from the mouth. One Road Rat stands inside with the white lamp on its pole and turns slowly, and a
player who is in the lamp's light for two seconds has been seen. Parrot sits on the bonnet of the middle buggy with the
set beside her, calling.

> **Parrot:** *(into the set)* This is Radio Hill, calling anybody who can hear us. There's a fire here, and hot food,
> and room for your car.

The player goes from wreck to wreck while the lamp is turned away, reaches the buggy from behind and holds the wrench
on the set's bracket for six seconds, with the cue `open.set.taken`. The set is heavy, and walking with it is slow.

- *Out with the set.* The player carries it to the car and drives to the hill.

  > **Bern:** That's a better set than ours, and I shan't be telling Hetty so. Now she can listen on one and talk on
  > the other, and heaven help the rest of us.
  >
  > **Hetty:** I've two sets now, so I can listen to the Mall Road and scold my sister at the same time. And nobody on
  > this land will hear a lie in my voice again.

  The sisters: up one word. The Road Rats' feud rises one step. A thing made: the second set on Radio Hill. Mark:
  "You took Parrot's radio out of the Pocket and gave it to Radio Hill."
- *Seen.* It is not a failure.

  > **A Road Rat:** There's somebody in the Pocket! Parrot, there's somebody at your set!

  The three buggies start. The player runs for the car with or without the set, and the buggies can be outrun on the
  road or fought.
- *Caught on foot,* boxed in between two buggies for six seconds.

  > **Parrot:** You walked all this way to steal a radio from a thief. I admire that, driver, I really do. I'm still
  > having your wheels.

  The set stays, the wheels go, and the Pocket has twice the watch on it from tonight.

**Tied back,** the next time the Road Rats are met at a checkpoint after the set was taken.

> **A Road Rat:** That's the car that took Parrot's voice box. She hasn't said a word to anybody for a week, and Sump
> says that the quiet is costing him wheels.

### Scene 7. Talking to Parrot

On the air, from the hut. Hetty and Bern stand behind the player's chair.

> **You:** Parrot, this is the driver you tried to rob. I'm sitting on Radio Hill, and I can hear your engine.
>
> **Parrot:** *(on the radio)* Well, that's cheating. Nobody was meant to find the real one. Is the old girl cross with
> me?
>
> **Hetty:** I am extremely cross with you. You have my voice nearly right, and you use it to steal wheels.
>
> **Parrot:** *(on the radio)* Only nearly right? I've worked at it for months. Sump wants wheels, and the voice gets
> him wheels. I'd sooner read the weather, if I'm honest, but nobody pays me for weather.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Would you stop, if you had something better to do?" | **Parrot:** *(on the radio)* I'd stop tomorrow. I like the set far more than I like the Pocket. But Sump counts wheels, and he'll notice when I stop bringing them. | She would rather have the radio than the robbing. Sump is in the way |
| "What does Sump want most?" | **Parrot:** *(on the radio)* Sump wants to know things before other people know them. He likes to hear who is on which road and what they're carrying. Wheels are only what he takes when he doesn't know anything better. | News is worth more to Sump than wheels |

**The decision.**

> *If she reads the news from this hill, then Sump hears everything that Hetty hears.*
>
> *If she doesn't, she goes on doing the only other thing that she's good at.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| a | "Read the news with Hetty every evening, and leave the white lamp at home." | Hetty and Bern look at each other | *Then the Road Rats will know the news of every road as soon as the hill does.* | Two voices on one station. Nobody is robbed by a voice again. The Word on the road rises by one. The hill never warns of the Road Rats' own riders |
| b | "Stop it, or I'll come and take your set." | Nothing | *She knows that I found the hill. She may believe that I can find her.* | She does not stop. Choices 1 and 2 of Scene 5 stay open, and the Pocket has twice the watch |

**a. Two voices.** This choice is not offered while the Road Rats are Raiding or worse. Parrot says why.

> **Parrot:** *(on the radio)* Sump says that we're at war with your town this week, driver, so I can't be seen making
> friends. Ask me again when he's calmed down.

Otherwise:

> **Hetty:** I've talked to nobody for eleven years. I suppose I can put up with talking to a thief, if she keeps to
> the weather.
>
> **Bern:** I'll be listening to both of them. If the white lamp goes up again, I shall know it before the driver
> does.
>
> **Parrot:** *(on the radio)* Good evening, the Scablands. This is Radio Hill, and so is this. There's weather coming
> in from the west, and nobody at all is going to be robbed tonight.

The cue is `open.news.evening`. **The ledger.** The sisters: up one word. The Road Rats' feud does not move. The Word
on the road: up one. Mark: "Parrot reads the evening news with Hetty, because you asked her to."

**b. The threat.**

> **Parrot:** *(on the radio)* Then you'll have to find me first, driver, and I've moved twice while we've been
> talking.

## 6. How you can lose, and what it costs never to follow the sign

- **You go off the ramp.** The car's armour is gone, and the sisters meet you as somebody they had to winch.
- **You drive into the Pocket.** You fight your way out against three cars, or you walk home without your wheels.
- **You fight in the Pocket and lose.** The wheels go, and a third of your scrap goes with them.
- **You are caught taking the set.** The wheels go again, and the Pocket is watched twice as hard.
- **You promise fuel and do not bring it.** The mast goes dark, the sisters think one word less of you, and the white
  lamp is the only voice left.
- **You make the peace.** Nobody is robbed, and Sump hears every piece of news that you do.

Nobody dies, nothing saved is wiped, and no screen says the game is over.

**If the player never answers.** The voices call for three nights. On the fourth the radio is quiet, and the
storyline ends as "unanswered". Radio Hill can still be found by its mast, as OPEN-SITES has it, and the Pocket goes
on taking wheels. Some nights later Dot says this, at the diner or at the gate.

> **Dot:** A hauler from the Mall Road followed a voice on his radio in among the wrecks last week. He walked into my
> diner two days later carrying his own steering wheel, because it was all that they'd left him.

And when Radio Hill is found by any other way, Hetty's first greeting has one more line.

> **Hetty:** I called you for three nights, driver, and you never once stopped. I don't blame you for it. I only wish
> that the other voice hadn't been the one that people remembered.

**What this changes later.**

- With the sisters Friendly, every sign that is a call reaches the player wherever the car is, and Hetty gives news
  on each visit, as OPEN-SITES has it.
- With a second set, the hill listens and talks at once. Hetty's warning of cars that come to fight reaches three
  kilometres from the hill, where it was a kilometre and a half.
- With two voices on the station, the warning is never given for the Road Rats' own cars, and the Road Rats at a
  checkpoint come to fight less often, because Sump would sooner hear the news than break the car that brings it.
- The Pocket is on the map for good. Every later storyline that involves the Road Rats can use it.
- Parrot, with or without her set, is a Road Rat who can be talked to, and other storylines can cast her.

## 7. Played alone: what happens when nobody ever wrote a fact

| The fact it reads | When nobody wrote it |
| --- | --- |
| Radio Hill is found | It is not found, and this storyline finds it. If it was found already, by its mast or by Finch's rumour, the storyline begins with the second voice alone: Hetty answers her from the hill, and Scenes 4 to 7 play as written |
| The sisters' word | Strangers, as for any people not yet met |
| The Road Rats' feud | Watching. Three buggies wait in the Pocket, and Parrot will deal |
| The Walkers' word | Rell is not there to ask. The other three answers on the radio stand |
| A tower on the Crow's Step | No keeper speaks. The player tests the voices unaided |
| Scrap in the car | With less than 30, Odessa fits the wheels on credit and says so. With less than 25, Moss will not sell a drum, and the promise of fuel is not offered |

## 8. Crossings

| When this has happened | This changes |
| --- | --- |
| Radio Hill is Friendly (this storyline) | Every sign that is a call reaches the player wherever the car is, and not only near home. Promised in section 19 |
| A second set stands on Radio Hill (this storyline) | In "Smoke over a friend", Hetty calls the smoke the hour it rises, with the road the raiders took. In "The stranded hauler", a car in real trouble has been heard calling, and Hetty can say that it is no bait |
| Two voices read the news (this storyline) | In "A toll on the Mall Road", Sump knows which camps mean to refuse his toll before the player has finished the round of visits. In "Market day", Parrot asks whether she may come, and somebody has to answer her |
| The Road Rats are Raiding or worse, as after the toll was broken ("A toll on the Mall Road") | Five buggies wait in the Pocket, not three, and Parrot cannot make peace until the feud has cooled |
| A tower stands on the Crow's Step ("The watch line") | Its keeper tells the two lamps apart for the player, unasked |
| The Walkers are Friendly (Five Cold Nights) | Rell vouches for the red lamp |
| The wheels were taken in the Pocket (this storyline) | Wherever a Road Rat next speaks to the player, in any storyline, the first thing said is about the wheels |

## 9. What it takes to play, what it needs made, and its sounds

**What it takes to play.** Three sittings of about ten minutes at most, which may be days apart: the two voices and
the climb or the Pocket; the hilltop and the other voice; and taking the set or making the peace. A player who tests
the voices, climbs at once and makes the peace on the next visit has played about fifteen minutes in all.

**What it needs made.**

| What | New or in hand |
| --- | --- |
| Radio Hill: the mast, the hut, the generator, the red lamp, and Hetty and Bern | In hand when OPEN-SITES and OPEN-FIGURES-2 are built |
| The ramp, driven by night with calls on the radio | The ramps are in hand (OPEN-SITES: each mesa is climbed by its own ramp). The calls are lines said at places along a path, which the job engine does today |
| The red lamp that blinks when asked, and the white lamp on its pole | Two lamps of the kind in hand (`src/world/town-lamp-look.js`), seen from far off at night. A sign of the kind "lights" is the one thing here that the game cannot draw yet |
| The Pocket: a horseshoe of wrecks three high with one mouth, and four wheels in a stack | The wrecks are in hand (`src/world/boneyard-wrecks.js`). No ground is cut |
| Parrot, on foot with a radio set on a strap | New, by the method that made the Walkers. The Road Rat with a lamp on a pole is in OPEN-FIGURES-2 |
| Three buggies | The riders' cars in hand, in the Road Rats' paint |
| The fight, the surround and the creep past a lamp | In hand: the `rider-fight` step, the surround of `five-cold-nights.md` section 5, and the lamp rule of the burned camp's drain |

**Where the Pocket stands.** Three positions, each checked on 26 November 2026 against the land's own height and
ground: flat (no more than a metre of fall across 56 m) and well clear of the Rats' Nest. Claude checks each for a way
in when the site's row is written.

| Position | Ground | From the nearest road |
| --- | --- | --- |
| `land.at('boneyard', 1000, -300)` | The wreck fields, south of Tin Town | 680 m from the Tin Road |
| `land.at('tin-town', 300, -1700)` | The flats, north of Tin Town | 1,000 m from the Ridge Road |
| `land.at('tin-town', -2600, 700)` | The low scab plates, west of Tin Town | 415 m from the East Road |

**Sound cues.** `open.radio.voice` is in hand from OPEN-SITES: a voice through static. New:

| Cue | What it is |
| --- | --- |
| `open.radio.second-voice` | The same static, with an engine ticking over underneath it |
| `open.radio.cut-in` | Two stations on one setting: a short squeal, and then a voice |
| `open.lamp.blink` | A relay clicking three times, heard over the radio |
| `open.ramp.edge` | Gravel going over an edge, and a long slide |
| `open.trap.sprung` | Three small engines starting at once |
| `open.wheels.off` | A wheel brace turning, and a wheel dropped on the ground |
| `open.set.taken` | A bracket coming loose, and the static cut dead |
| `open.news.evening` | A tin lid struck once, which opens the evening news |

## 10. New names

| Name | What it is |
| --- | --- |
| **Parrot** | A person. A Road Rat who can do anybody's voice, and who would sooner read the weather |
| **The Pocket** | A site, of the kind "den". A horseshoe of stacked wrecks with one mouth, where the Road Rats take wheels |
| **The second set** | A thing made (`radio-hill/second-set`): Parrot's radio, wired in on Radio Hill |
| **The evening news** | What Hetty and Parrot read together when the peace is made. A service of Radio Hill for a later table |
| `radio-hill-voice/stopped-for-hetty`, `/heard-two-voices`, `/tested`, `/talked-up`, `/off-the-ramp`, `/saw-parrot`, `/drove-out`, `/wheels-taken`, `/talks-over`, `/took-the-set`, `/two-voices` | Marks, each with the sentence given in its scene |
