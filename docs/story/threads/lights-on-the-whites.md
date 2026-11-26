# Lights on the Whites

A storyline of the open Scablands (`docs/story/open-scablands.md`, section 19), written in full in the form of that
page's section 21. Kind: a find. Its data is `src/story/threads/content/lights-on-the-whites.js`, and every line below
is in that file exactly as it is here. Card OPEN-WRITE-2, 26 November 2026. Nothing here is built yet.

The choice at its heart: follow lights that lead away from every road.

It keeps to `docs/story/ships-in-the-sand.md`. Captain Imre never has anything to report, and no line here has him say
otherwise. The mast is his, and nobody climbs it here. Nothing is said of the lighthouse, and no ship's log is read.

## 1. What it reads and what it writes

| This storyline reads | This storyline writes |
| --- | --- |
| The Deck Folk's word for the player | The Deck Folk's word, and a favour owed |
| Embers in the store, for the fire basket | Embers |
| The Walkers' word, and the sisters' word at Radio Hill, for an answer each on the radio | The Bell Buoy found |
| Whether the Bell Buoy is found | A way aboard the Patience (a thing made) |
| The night, for when it can begin | A watch kept from the masthead (a thing made) |
| | Marks that later scenes read |

## 2. When it can begin, and its sign

**It can begin** on any night from the second, after dark, once the player has driven the Salt Road at least once.
The director draws for it each night at two chances in five. It does not begin on the last night of an act, or while
a mission is running.

In the facts of section 12: `{all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: 'lights-on-the-whites',
at: 'any'}}, {fact: 'draw', name: 'start', chance: .4}]}`.

**Its sign is lights:** four lamps in a line, moving, far out on the salt pan, seen from the Salt Road or from the
Salt Road to the Ridge within three kilometres. They are drawn where they truly are. The sign lasts one night. If the
lamps never came into the player's view, nothing has happened: the storyline goes back on the shelf and can begin on
another night. If they were seen and not followed, it has been ignored (section 6).

## 3. Its cast, and the people in it

This storyline is tied to one place, so it names it: the salt pan north of the Salt Road, which Tin Town calls the
Whites, and the three ships at its western edge. *The buoy* is a new site, the Bell Buoy, at whichever of its three
positions the land's seed picks. *The boat's crew* are found six tenths of the way from the ships to the buoy. A line
may hold `{buoy.bearing}`, one of the eight compass words.

**People in it.** Captain Imre of the Deck Folk, as he is: a lamp on a ship's rail and a voice, who reports. Auntie
Solder, Cinder and Moss, as they are. Rell and Hetty, if their peoples are Friendly. New, all Deck Folk:

- **Fathom,** the Patience's leadsman, sixty, who takes the sounding every year and will not admit that he is lost.
- **Sprat,** eleven, rated ship's boy, who notices things and is not asked.
- **Kedge,** a big cheerful deckhand who has put his foot through the salt crust and cannot walk on it.
- **Wick,** the lamp trimmer, who counts oil and worries.

**Why they are out there.** Once a year the Deck Folk send a boat's crew down the old channel to take the depth of the
sea at the last buoy. The boat is a handcart. The depth has been nil every year since the ships touched bottom, and it
is written in the log all the same. Tonight the haze came up, they lost sight of the ship, and they have been walking
in a circle ever since.

**The salt haze.** At night the cold makes the pan smoke. One minute after the car leaves the road a white haze lies
on the ground, and inside it a person sees about seventy metres (the look of `dust-night`, in white; it changes no
rule). A lamp shows through the haze as a glow from much farther: a hand lamp from 1,500 metres, the car's lamps from
120 metres to somebody on foot, and a fire basket at a masthead from four kilometres. No marker is put on the map for
any person or any lamp. The map and the compass show the player where the car is, as they always do. They do not show
where anybody else is.

## 4. Where things stand, in this example

It is the third day of Five Cold Nights, after dark, and the hearth has not been banked yet. The player is on the Salt
Road, two kilometres short of the ships. The Deck Folk are Strangers, because Bess did not take the long road today.
The Walkers are Friendly. Radio Hill has not been found. There are two embers in the store and 90 scrap in the car.
The land's seed has put the Bell Buoy at `land.at('ships-in-sand', 2600, 150)`, so the boat's crew are about a
kilometre and a half east of the ships and a kilometre short of the buoy.

## 5. Scenes

### Scene 1. The sign

The night is clear and very cold. Far out on the pan, to the north-east, four small lamps move in a line, with the cue
`open.lamps.seen`. Nothing is marked on the map and no line appears on the screen. The first time the lamps are in
view for three seconds, two thought bubbles come.

> *Those are lamps, four of them in a line, and they're moving. Nobody lives out on the salt.*
>
> *They're a long way from the road already, and they're getting farther from it.*

**You may call home before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Auntie, who would carry lamps on the Whites at night?" | **Auntie Solder:** *(on the radio)* On the Whites, at this hour? The salt rakers only ever worked by day. Whoever is out there, they don't come from any town that I know. | Nobody from Tin Town's side |
| "Cinder, could it be the Ash Men?" | **Cinder:** *(on the radio)* It isn't the Ash Men. They put lamps out wherever they find them, and they would never carry four of their own in a row. | Not an enemy |
| "Moss, have you ever driven on the pan?" | **Moss:** *(on the radio)* I took Bess across it once, and it took me half a day to find the road again. It's the same in every direction out there, flat and white. Don't follow anything on to it unless you know your way back. | The danger is the way back |
| "Rell, do your people rake salt by night?" *(only if the Walkers are Friendly)* | **Rell:** *(on the radio)* My people raked that salt for twenty years, and we never once worked it after dark. At night the cold makes the pan smoke, and you can't see your own cart. Lamps in a line like that belong to the ship people. | The haze is coming. Who they are |
| "Hetty, have you heard anything from the salt?" *(only if Radio Hill is Friendly)* | **Hetty:** *(on the radio)* The ships were on the air an hour ago, asking one another whether the boat was back yet. I didn't know that they had a boat. I can't think what use a boat would be to them. | The ships are missing somebody |

**The decision** is made by going somewhere.

| | You do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | Leave the road and follow the lamps | Four lamps, far off, and no road toward them | *If I'm quick, I can reach them while I can still see their lamps.* | Out on the salt (Scene 3). One lamp goes out as the car leaves the road |
| 2 | Drive on to the ships and ask | The ships' rail, a kilometre or two ahead | *The ship people can see the whole pan from their masts. Somebody up there must know who that is.* | Under the ships (Scene 2). The lamps do not wait |
| 3 | Drive on | Nothing | *Whoever they are, they chose to walk out there. It's nothing to do with Tin Town.* | Mark: "You saw lamps far out on the salt at night, and drove on." |

### Scene 2. Under the ships

The player stops below the Patience. A lamp blinks from a rail high above the road.

> **Captain Imre:** Ahoy there, the car. This is the Deck Folk, evening watch. The sounding boat is away on the salt,
> and she is one watch overdue. Nothing to report.

**If the Deck Folk are Cold,** because a promise to them was broken, he says this in place of it.

> **Captain Imre:** Deck Folk, evening watch. We have a note in the log about you, and it is underlined. The sounding
> boat is overdue. That is all that I have to say to you.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Have you lost a shore party?" | **Captain Imre:** The Deck Folk do not go ashore, so we have no shore parties to lose. The salt is not the shore. It is the sea, and the sea is late. What is out there is a boat's crew, and the boat is a handcart. | Who they are: four of the Deck Folk, on foot, with a cart |
| "What is a sounding boat?" | **Captain Imre:** Once a year we send a boat's crew down the old channel to take the depth of the sea at the last buoy. The depth has been nil every year since we touched bottom. It still has to be written down. | Why they went |
| "Why don't you go and look for them?" | **Captain Imre:** We have only the one boat, and she is the one that is missing. I have four hands left aboard, and one of them is the cook. | Nobody else is coming |
| "Why can't they see your lamp?" | **Captain Imre:** Our riding light is an oil lamp, and the haze swallows it. In fog this ship used to burn a fire basket at her masthead, and a boat could steer home by it from the far buoy. We have had nothing to put in the basket since the spring. | Why they are lost. An ember would bring them home |
| "Which way did they go?" | **Captain Imre:** They went down the channel, to the {buoy.bearing} of our bow. The last buoy has a bell on it, and the bell still rings whenever the wind gets up. | A rumour: the circle for the Bell Buoy |

**The decision.**

> *An ember in that basket would burn all night, and they could see it from anywhere on the salt.*
>
> *It would also be one night of Tin Town's fire, burning on top of somebody else's ship.*

| | You say or do | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "Put this ember in your fire basket." *(only with an ember in the store, and only if he was asked about the lamp)* | The count falls by one. A bucket comes down on a line | *That's a night of our own fire gone, and I'll have to explain it to Auntie.* | The basket burns at the masthead all night. The crew can see it and walk home by it, whether the player goes out or not |
| 2 | Leave the road and follow the lamps | The lamps, fewer and farther than before | *I have lamps on my car. They'll have to be enough.* | Out on the salt (Scene 3). A second lamp has gone out while the player was talking |
| 3 | Drive home | The road home | *He says that there's nothing to report. Perhaps there isn't.* | Mark: "You heard that a boat's crew was lost on the salt, and you drove home." |

**1. The fire basket.** The bucket goes up, and a minute later an orange light stands at the Patience's masthead,
with the cue `open.basket.lit`.

> **Captain Imre:** Fire basket lit at the masthead, with fire from Tin Town. I have written that down, and I have
> written down who brought it. Nothing to report.

The player may still follow the lamps, and Scene 3 plays with the basket burning. A player who drives home now has
done enough: the crew walk in by the basket before midnight (Scene 7, "Home by the basket").

**The ledger when the player leaves.** With the basket lit: embers 2 to 1, a favour owed by the Deck Folk, and a mark:
"You gave the ships an ember for their fire basket, to bring a boat's crew home."

### Scene 3. Out on the salt

**The drive, by car, about a minute and a half.** A mission from the moment the car leaves the road. It holds the
checkpoints and the signs. The pan is the fastest ground in the Scablands, and there is nothing on it: no road, no
track, no rock. The lamps are farther than they look, and they go out one at a time, with the cue `open.lamp.out`.

> *There were four lamps when I left the road. I can only count three of them now.*

After a minute the haze comes down, with the cue `open.haze.down`.

> *The ground has gone white and soft at its edges. I can't tell where the salt stops and the air begins.*
>
> *Now there are only two lamps.*

**What there is to lose.** The crew burn their lamps one at a time. Two are left when the haze comes down, and each
lasts two and a half minutes, or under two minutes without Wick to trim it. When the last lamp is out, nobody can be
seen from farther than seventy metres, and nobody on foot can see which way to walk. If the last lamp goes out before
the car has reached them, the player has lost them.

> *The last lamp has gone out, and there's nothing out here now but white. I could drive past them ten metres away
> and never know it.*

The player may search for two minutes, and finds them only by passing within seventy metres. After that the mission
ends, and the crew walk in at dawn when the haze lifts (Scene 7, "In at dawn").

### Scene 4. The boat's crew

A handcart stands on the salt with a pole lashed upright on it and one lamp on the pole. A coil of line and an iron
weight lie in the cart. Three people stand beside it in ships' coats that are white to the knees, and a fourth sits on
the cart with one boot off. A ring of footprints goes round and round the cart.

> **Fathom:** Ahoy, the car. This is the sounding boat of the Patience, and they call me Fathom. We are not lost. We
> are waiting for our mark to show.
>
> **Sprat:** We are lost. We've passed that same crack in the salt five times, and I counted them.
>
> **Kedge:** I put my foot through the crust an hour ago, and my ankle has swelled up like a fender. I'm the reason
> that we're slow, driver, and I'm sorry for it.
>
> **Wick:** We had four lamps when we left the ship, and we have two now. I wouldn't trust either of them to last
> until morning.

**If the fire basket is burning,** it shows orange above the haze behind the player, and the first two lines are
these.

> **Fathom:** Ahoy, the car. This is the sounding boat of the Patience, and they call me Fathom. Our mark has just
> come up bright at the masthead, so we were never lost. We are only slow.
>
> **Sprat:** We were lost until a minute ago. We passed that same crack in the salt five times, and I counted them.

**You may ask before you choose. Asking costs nothing.**

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "What mark are you waiting for?" | **Fathom:** The riding light at the Patience's masthead. A boat steers home by it. It was there at sunset, and then the haze came up, and it has not been there since. | They cannot find the ship without a light to walk toward |
| "What did you come out here for?" | **Fathom:** We came to take the depth of the sea at the bell buoy, as we do every year. There is a sounding in the log for every year since we touched bottom. Tonight's is the only one that has not been taken. | The sounding matters to them. It opens the fourth choice |
| "How far is the buoy?" *(only after the question above)* | **Wick:** The buoy is a kilometre farther out, to the {buoy.bearing}. We turned back when Kedge went through the crust, and that was when we lost the light. | Where the buoy is, and that it lies away from home |
| "Sprat, do you know the way back?" | **Sprat:** The wind was on my left cheek all the way out, so it ought to be on my right cheek going home. I said so an hour ago. I'm not rated to navigate, so nobody wrote it down. | The child knows the way. It opens the second choice |
| "Kedge, can you walk at all?" | **Kedge:** I can hop, driver, and I weigh as much as the cart does. I wouldn't want to be the hand who had to hold me up for the length of the channel. | Kedge has to ride |

**The decision.**

> *My car has two spare seats, and there are four of them.*
>
> *If I drive away with two, the other two are alone out here with one lamp, and I'll have to find this place again.*

| | You say | Plain to see | Your thought, if any | Kept out of sight |
| --- | --- | --- | --- | --- |
| 1 | "Kedge and Sprat, get in. I'll come back for the other two." | Two seats, and the haze | *Every bit of this salt looks the same. I hope that I can find this bit twice.* | Two trips (Scene 6). The two who are left wait where they are, with Wick's lamp |
| 2 | "Kedge and Wick, get in. Sprat, walk Mr Fathom home by the wind, and I'll meet you on the way." *(only if Sprat was asked)* | The child stays out in the cold | *She's the smallest and the coldest of them, and she's the only one who knows the way.* | Two trips, and the two on foot walk the true line home. Nobody has to be found. The lamp they carry is not trimmed |
| 3 | "Everybody walks in together, behind my lamps. Kedge can ride." | Fathom says how slow it will be | *It will take half the night, and nobody will be left behind.* | The walk in (Scene 6). It uses up the night |
| 4 | "Mr Fathom, get in. We'll take your sounding first." *(only if he was asked what they came for)* | The buoy is farther out, away from the ships | *It's only a number in a book, and the number is nought. It matters more to him than his feet do.* | The Bell Buoy (Scene 5), while the lamp at the cart burns down. Then this choice again |

**1.**

> **Fathom:** Take Kedge and the child, driver. Wick and I will stay with the boat, because nobody leaves a boat with
> nobody in it.
>
> **Sprat:** I've never been in a car. Does it go faster than a ship? I suppose that everything goes faster than our
> ship.
>
> **Wick:** Look for one lamp on a pole when you come back. If you can't see it, that's because it has gone out, and
> then I don't know how you'll find us.

**2.**

> **Fathom:** You want me to be led home by the ship's boy? I was taking soundings on this sea before she was born.
>
> **You:** She noticed which way the wind was blowing, Mr Fathom, and nobody else did.
>
> **Fathom:** That is true, and I don't enjoy it. Very well. Sprat, take the head of the line, and call out your
> bearing as you go.
>
> **Sprat:** The wind is on my right cheek, and the bearing is home. Follow me, Mr Fathom, and please keep up.

**3.**

> **Fathom:** All hands together, then, astern of the car. Driver, go slowly, because a boat's crew on foot makes
> about two knots, and a knot is not very much.
>
> **Kedge:** So I'm cargo tonight. I've been called worse things. Mind the bumps, driver, because every one of them
> goes straight up my leg.

If Sprat was asked her question, Fathom adds this, and the line walks true even when it loses the car's lamps.

> **Fathom:** Sprat, you say that you know the way, so walk at the head of the line, where I can watch you being
> right.

**4.**

> **Fathom:** You would drive me out to the buoy? Driver, that is the handsomest thing that anybody has offered this
> ship in years. Wick, mind the lamp. I shall be back as soon as the lead is down.

**The ledger at the cart.** Mark: "You followed four lamps out on to the salt at night, and found the ships' boat's
crew."

### Scene 5. The Bell Buoy

**The drive, by car, about two minutes there and back.** A kilometre to the {buoy.bearing}, away from the ships, with
Fathom in the car. There is no marker. The buoy is found by its bell, the cue `open.buoy.bell`, which is heard from
400 metres and grows louder, and then as a dark shape in the haze. If Captain Imre was asked which way they went, the
rumour's circle is on the map.

The buoy lies on its side on the salt: rusted iron, taller than the car, with a bell in a cage at its top that rings
when the wind moves it. It is found, and it is on the map for good as the Bell Buoy, with the cue `open.site.found`.
Fathom gets out, lowers the iron weight on its line until it lies on the salt, and reads the mark on the line by the
car's lamps. The player waits beside him for twenty seconds.

> **Fathom:** By the mark, nought. The depth of the sea at the bell buoy is no fathoms and no feet. Thank you, driver.
> That is one sounding for every year since we touched bottom, and every one of them agrees.

> *He walked out here in the cold to measure a sea that isn't there, and he's pleased with the answer.*

| You ask | The answer | What it shows you |
| --- | --- | --- |
| "Why do you still measure it?" | **Fathom:** Because one year the answer will not be nought, driver. The Deck Folk mean to be the first people to know it. | Why the Deck Folk keep the watch |

Then back to the cart. The lamp there has been burning all this time. If it has gone out, the cart is found only by
passing within seventy metres, or by the true line if Sprat was asked: she has turned the cart to point home, and she
shouts when she hears the engine.

> **Sprat:** Over here, driver! The lamp went out, so I've been shouting every time I counted to twenty.

**The ledger at the buoy.** The Bell Buoy: found. Mark: "You drove the ships' leadsman out to the bell buoy, so that
the year's sounding was taken."

### Scene 6. Bringing them in

**In two trips, by car, about three minutes.** The first trip is plain driving: the map shows the car and the ships.
At the Patience's side Kedge and the other rider climb out at the foot of the ladder, and the player turns back.
Coming back is the danger. There is no marker where the cart was. The lamp on its pole shows from 1,500 metres while
it burns. The big map draws the ground the car has driven in full (design section 16), so the player's own way out is
on it.

- *Found.*

  > **Wick:** There's the car! I told you that it would come back, Mr Fathom. I told you so twice.
  >
  > **Fathom:** You told me four times, Wick, and I agreed with you each time.

- *If Sprat is leading Fathom home,* they are met on the line between the cart and the ships, about half way, with or
  without a lamp.

  > **Sprat:** There you are, driver. We've come about half of the way, and Mr Fathom has only argued with me twice.

- *If the fire basket is burning,* whoever was left is walking toward it, and is met on the same line.
- *Not found.* The lamp went out, and two minutes of searching have not passed within seventy metres of the cart. The
  mission ends. The two wait where they are and walk in at dawn (Scene 7, "Two at dawn").

**The walk in, by car at a walking pace, in two stretches of about a minute each.** Kedge rides. The others walk
behind the car, pulling the cart, and they follow its lamps. If the car gets more than 120 metres ahead, the hindmost
has lost the lamps.

> **Wick:** Driver, slow down! We've lost your lamps, and Sprat has stopped walking.

A line that has lost the lamps stops and waits, and the player turns back for it. With Sprat at its head it keeps
walking the true way, and is found ahead. Between the two stretches the long middle of the walk is passed over, with
one line at the top of the screen: "They walk for a long time. The haze closes in behind them, and nobody says very
much." In the second stretch Sprat falls behind.

> **Sprat:** I'm not tired. I'm only resting my feet, one at a time.

The player may stop and take her into the car. If she is left to walk, she comes in last and coldest, and Wick says
so at the ship's side. In an act with a clock the walk uses up the night: a promise that falls due tonight is not
kept, and on a night when raiders come, the player is not at the fence.

### Scene 7. The ship's side

Below the Patience, however they came in. A ladder is down, and lamps are moving on the deck. The cue is
`open.crew.aboard`.

**All four came in by the player's doing.**

> **Captain Imre:** Sounding boat returned, all hands aboard. I shall write that she was brought in by a car, because
> it is true, and this log has seen stranger things.
>
> **Captain Imre:** The Deck Folk do not bring strangers aboard. You are not a stranger now. There is a ladder on the
> Patience's quarter, and it will be down whenever you come. Nothing to report.
>
> **Kedge:** Thank you for the ride, driver. Next year somebody else can be the one who goes through the crust.

If the sounding was taken:

> **Fathom:** Depth at the bell buoy, nil. The log is complete, Captain, and it was this driver who took me there to
> complete it.

If it was not:

> **Captain Imre:** No sounding was taken this year. I have left the line blank, and it is the first blank line in the
> book. I don't blame you for it. I have only written it down.

If Sprat led the line home:

> **Captain Imre:** Sprat is rated navigator's mate from this watch. She brought a boat's crew home by the wind on her
> cheek, and I have seen ships' masters do worse with a compass.
>
> **Sprat:** Does a navigator's mate still have to scrub the galley?
>
> **Captain Imre:** Yes.

If Sprat walked in last, and was not taken into the car:

> **Wick:** The child walked every step of it and never once complained. I've put her feet in a bucket of warm water,
> and she fell asleep with them in it.

**The ledger.** The Deck Folk: up one word, and Sworn if the sounding was taken as well. A favour is owed. A thing
made: the way aboard the Patience. Mark: "You brought all four of the ships' boat's crew in off the salt." If Sprat
led: "You told the ships' crew to follow a child who knew the way, and she brought them home."

**Home by the basket.** The player lit the basket and did not go out, or went out and lost them. The four walk in by
the orange light before midnight. This is said on the radio, to a player who is anywhere.

> **Captain Imre:** *(on the radio)* Deck Folk to the car from Tin Town. Sounding boat returned at six bells, all
> hands aboard, steering by your fire. The ladder on the Patience's quarter is down for you. Nothing to report.

**The ledger.** The Deck Folk: up one word. A favour is owed for the ember. The way aboard the Patience. No sounding
was taken.

**Two at dawn.** Two came in by car and two were not found again.

> **Captain Imre:** Two hands came in by car, and two walked in at first light by themselves. They are cold, and they
> are aboard. I have nothing more to report.
>
> **Fathom:** You said that you would come back for us, driver. I am sure that you meant to.

**The ledger.** The Deck Folk's word does not move. No ladder is put down. Mark: "You brought two of the boat's crew
in, and the other two walked in at dawn."

**In at dawn.** The player followed the lamps and lost them, with no basket burning. Said the next time the player
passes under the ships.

> **Captain Imre:** Deck Folk, forenoon watch. The sounding boat came in at first light under her own power. Her crew
> are cold, and the ship's boy has been put to bed with her feet in a bucket. Nothing to report.

**The ledger.** Nothing moves. Mark: "You followed the lamps on to the salt and lost them in the haze."

### Scene 8. Going aboard

On any later day, once the ladder is down. On foot, about five minutes, with nothing to lose. One press of F at the
foot of the ladder takes the player up to the Patience's deck, as on any ladder (`ships-in-the-sand.md`, section 3).

> **Sprat:** The Captain says that the ladder is down for you whenever you come. I'm to show you the ship, and I'm not
> to let you touch the mast, because the mast is his.

**The galley.** If the fire basket was lit:

> **Wick:** We kept your ember going in the galley stove after the basket was done with it. There has been hot soup
> aboard every night since, for the first time since the spring. Sit down and have a bowl.

If it was not:

> **Wick:** The galley is still cold, so all that I can offer you is ship's biscuit. It's older than Sprat, and it's a
> good deal harder than she is.

**The chart table.** Fathom unrolls a chart of the pan, drawn in ink on the back of an old sail.

> **Fathom:** This is the channel, with its three buoys, and the bell buoy is the last of them. I drew it from the
> soundings. I have added the place where Kedge went through the crust, so that nobody need do it twice.

A find: the Bell Buoy is on the map, if it was not found on the night.

**The watch.** Captain Imre speaks from the wing of the bridge, above. He does not come down.

> **Captain Imre:** The Deck Folk owe you a watch, driver. We can keep one for you from the masthead, in one
> direction. Tell me which way you would like us to look.

| | You say | Plain to see | Kept out of sight |
| --- | --- | --- | --- |
| a | "Watch the Salt Road for me." | The road to the yard and the Pipe | Cars that come at a checkpoint on that road are on the small map a minute early, and they come less often |
| b | "Watch the road to the Ridge for me." | The road across the pan to the Ridge | The same, on that road |
| c | "Watch the salt itself, in case anybody else is lost on it." | The whole white pan | No road is watched. Any sign that rises on the pan is called to the player at once, and nobody is ever lost on the Whites for a whole night again |

> **Captain Imre:** *(a)* The Salt Road, then. The masthead lookout will call you when there are riders on it. I shall
> go on having nothing to report.
>
> **Captain Imre:** *(b)* The Ridge road, then. The masthead lookout will call you when there are riders on it. I
> shall go on having nothing to report.
>
> **Captain Imre:** *(c)* The salt, then. I had hoped that you would say so. The masthead lookout will call you if a
> lamp or a smoke shows on it. I shall go on having nothing to report.

**The ledger.** The favour is spent. A thing made: the masthead watch, on the way that was chosen.

## 6. How you can lose, and what it costs never to follow the sign

- **You lose the lamps on the way out.** You drive home having found nobody, and four people walk in at dawn.
- **You take two and cannot find the other two again.** They wait all night where you left them. The Deck Folk do
  not think less of you, and the ladder stays up.
- **You take the sounding and the lamp at the cart burns out while you are gone.** Finding the cart again is the
  whole of the danger, and it was your own choice.
- **You walk them all in.** Nobody is lost, and the night is gone. What was owed at home tonight is not done.
- **You give the ember.** Everybody comes home, and Tin Town has one night of fire fewer.
- **You leave the child out in the cold.** She brings them home. She is the last aboard and the coldest.

Nobody dies, nothing saved is wiped, and no screen says the game is over.

**If the player saw the lamps and drove on,** the four walk in at dawn. Some nights later a trader says this, at the
gate or on the road.

> **The trader:** The ship people lost a boat's crew on the salt for a whole night last week. All four of them walked
> in at dawn, white to the knees and too cold to speak. The old captain still says that he has nothing to report, but
> he says it more quietly now.

**If the player heard it from Captain Imre and drove home,** he says this the next time the car stops below the
ships.

> **Captain Imre:** Deck Folk, evening watch. A car stopped under our bow last week, asked its questions and went home
> to bed. I have logged it without comment. Nothing to report.

The ladder is not put down by this road. The Deck Folk can still be made friends in other ways, as they always could.

**What this changes later.**

- The Patience can be boarded on foot. Her galley gives a meal and the news, and her chart table is somewhere other
  storylines can put a thing to find.
- The masthead watch stands on the way the player chose, for good.
- The Bell Buoy is on the map: the one landmark on the whole pan, and a place to steer for.
- The Deck Folk at Sworn keep their watch on the player's road every night without being asked, and speak for the
  player to anybody who sails, if anybody ever does again.
- Sprat, navigator's mate or ship's boy, is a child of eleven who notices things, and other storylines can cast her.

## 7. Played alone: what happens when nobody ever wrote a fact

| The fact it reads | When nobody wrote it |
| --- | --- |
| The Deck Folk's word | Strangers. Captain Imre's first line is the plain one |
| Embers in the store | With none, or outside an act that counts embers, the fire basket is not offered. Captain Imre still says why the crew cannot see his lamp |
| The Walkers' word | Rell is not there to ask. Nobody warns of the haze before it comes |
| The sisters' word at Radio Hill | Hetty is not there to ask |
| The Bell Buoy is found | It is not, and this storyline may find it: by the sounding, or from Fathom's chart |

## 8. Crossings

| When this has happened | This changes |
| --- | --- |
| The way aboard the Patience is made (this storyline) | The ships are a place with people, a galley and a chart table. In `ships-in-the-sand.md`, "Nothing to Report" needs a standing of 30 with Deck Town before anybody climbs for the logs: a word that rises here posts 25 toward it through the bridge of design section 17 |
| The fire basket was lit with Tin Town's ember (this storyline) | On Day 3 of Five Cold Nights, by the long road, Captain Imre asks one ember for the ships' watch, not two, and says why (below) |
| The masthead watches the salt (this storyline) | In "Smoke over a friend", when the camp that burns stands on the pan, the masthead calls the smoke at once, with the way the raiders left (below). A second boat's crew, or anybody else, is never lost on the Whites for a whole night |
| The Bell Buoy is found (this storyline) | It is a place that "The dry pump" or "Dace goes looking" can send somebody to, and that a rumour can be measured from: "two kilometres north of the bell buoy" |
| The Walkers are Friendly (Five Cold Nights) | Rell warns of the haze and says whose lamps they are |
| Radio Hill is Friendly ("The voice on Radio Hill") | Hetty has heard the ships asking after their boat, and says so |
| The Deck Folk are Cold, because the promise of the fourth night was broken (Five Cold Nights) | Captain Imre's first line is the cold one. Bringing the crew in mends one word, as standing with a people in trouble always does |

**The two lines that other scenes would speak.**

On Day 3 of Five Cold Nights, by the long road, if the fire basket was lit:

> **Captain Imre:** You have put one ember in our fire basket already, and it is in the log. Give us one more for the
> galley, and the ships' watch is yours.

When a sign rises on the pan and the masthead watches the salt:

> **The masthead lookout:** *(on the radio)* Masthead to the car from Tin Town. There is something showing on the
> salt to the {sign.bearing} of the ships. The Captain says that it is nothing to report. I thought that you would
> want to know.

## 9. What it takes to play, what it needs made, and its sounds

**What it takes to play.** Two sittings. The night is about ten minutes, and twelve with the sounding and every
question asked: the road and the ships, the drive out, the crew, and the way home. Going aboard is about five
minutes, on any later day. A player who gives the ember and drives home has played three minutes of it.

**What it needs made.**

| What | New or in hand |
| --- | --- |
| Far lamps, as a sign: small warm points drawn where they truly are, seen from three kilometres | New. This is the one thing here that the game cannot do yet. The same work draws the hand lamps in the haze, the fire basket, and the far fires of Night 5 (`five-cold-nights.md`, section 16) |
| The salt pan | In hand: real ground (`src/world/scablands-regions.js`), flat, fast and without landmarks |
| The haze | In hand: the look of `dust-night` (`src/world/dust-night.js`), in white and without the beam. It changes no rule |
| The three ships, their decks and the ladder | In hand (`src/world/deck-plates.js`). A fire basket at the Patience's masthead is one more lamp |
| The handcart | In hand (`src/world/handcart-view.js`). A pole with a lamp, a coil of line and an iron weight are small things drawn in code |
| Figures: Fathom, Sprat, Kedge, Wick | New, by the method that made the Walkers. Captain Imre stays a lamp on a rail and a voice |
| The Bell Buoy | New: one rusted buoy on its side, with a bell. Drawn in code |
| Two riders in two seats, and people who walk behind a car | In hand: the `rescue` step, and the line of growers who walk home behind a cart in section 21 |

**Where the Bell Buoy stands.** Three positions, each checked on 26 November 2026 against the land's own height and
ground: on the salt pan, flat (under a metre of fall across 56 m), and more than a kilometre from any road.

| Position | From the ships | From the nearest road |
| --- | --- | --- |
| `land.at('ships-in-sand', 2600, 150)` | 2,600 m | 1,650 m from the Salt Road to the Ridge |
| `land.at('ships-in-sand', 3800, 250)` | 3,800 m | 1,170 m from the Salt Road to the Ridge |
| `land.at('ships-in-sand', 2900, 700)` | 2,980 m | 1,030 m from the Salt Road to the Ridge |

**Sound cues.**

| Cue | What it is |
| --- | --- |
| `open.lamps.seen` | Wind over a great flat place, and one high note, when the lamps first come into view |
| `open.lamp.out` | A small pop, far off, as a lamp goes out |
| `open.haze.down` | The wind dropping, and every sound going soft |
| `open.basket.lit` | A bucket chain rattling up, and then a fire catching |
| `open.buoy.bell` | A cracked iron bell, struck unevenly by the wind |
| `open.crew.aboard` | Boots on an iron ladder, and a ship's bell rung twice |

`open.site.found` is in hand from OPEN-SITES.

## 10. New names

| Name | What it is |
| --- | --- |
| **The Whites** | A name people use, not a place on the map: the salt pan north of the Salt Road, as Tin Town calls it. `docs/story/there-is-no-2-15.md` gives the same name to Vane's old salt works on the plateau above it. One question for Claude is open on this (`docs/board/questions/OPEN-WRITE-2.md`) |
| **Fathom** | A person. The Patience's leadsman, sixty, proud of a log with no blank lines |
| **Sprat** | A person. Eleven, rated ship's boy, and navigator's mate if she was trusted to lead |
| **Kedge** | A person. A big deckhand with a swollen ankle |
| **Wick** | A person. The lamp trimmer, who also keeps the galley |
| **The sounding boat** | The Deck Folk's one boat, which is a handcart, and the yearly walk it makes down the old channel |
| **The Bell Buoy** | A site, of the kind "lookout": the last buoy of the old channel, lying on the salt with its bell still ringing |
| **The fire basket** | A scarce thing put to use: an iron basket at the Patience's masthead that burns one ember for a night and is seen from four kilometres |
| **The way aboard the Patience** | A thing made (`way/patience-ladder`): the ladder is down for the player |
| **The masthead watch** | A thing made (`watch/ships-salt-road`, `watch/ships-ridge-road` or `watch/ships-salt-pan`) |
| `lights-on-the-whites/drove-on`, `/heard-and-left`, `/lit-the-basket`, `/found-the-crew`, `/sounding-taken`, `/all-hands-home`, `/sprat-led`, `/two-at-dawn`, `/lost-the-lamps` | Marks, each with the sentence given in its scene |
