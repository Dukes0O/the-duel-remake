// The Everburn's words (docs/WASTELAND_WORLD.md section 5). Captions use the
// radio click; no voice file or new sound cue. Hollis's opening note is never
// spoken. Words only: nothing here changes a race, a fight or a save.
import {registerStoryLines} from './story-lines.js';

const line = (who, where, text) => Object.freeze({who, where, text, captionOnly: true});
const note = (id, who, where, text) => Object.freeze({id, who, where, spoken: false, text});

export const EMBER_NOTE_ID = 'story.ember.hollis.note';
export const EMBER_NOTE = note(EMBER_NOTE_ID, 'Hollis (a note, never spoken)', 'The Story Wall, opening note',
  'Driver, the forge at Tin Town has gone cold, and no forge means no boiler parts. A woman named Cinder is at the back gate with a pot of fire and a bad attitude. I like her. Go and see. Hollis');

export const EMBER_CAPTIONS = Object.freeze({
  'story.ember.cinder.1': line('Cinder', 'Job 1 start', 'This pot holds the last of the Everburn. Don\'t drop it. I mean it.'),
  'story.ember.cinder.2': line('Cinder', 'Job 1 start', 'I\'ve bolted a flamethrower to your car. Press its number and burn anything in the way.'),
  'story.ember.cinder.3': line('Cinder', 'First barricade', 'Ash Men\'s fence. Get close, and burn it.'),
  'story.ember.cinder.4': line('Cinder', 'Crash, pot spills', 'You dropped my fire! Go back, I\'ve got more. Slower this time.'),
  'story.ember.cinder.24': line('Cinder', 'Job 1 sighting', 'See the smoke with wheels under it? That is Old Smoke\'s furnace. Keep the pot out of its sight.'),
  'story.ember.auntie-solder.1': line('Auntie Solder', 'Tin Town in sight', 'Is that smoke coming from your roof, or are you just pleased to see us?'),
  'story.ember.auntie-solder.2': line('Auntie Solder', 'Job 1 won', 'A live ember. I haven\'t seen one in a year. Bring it in.'),
  'story.ember.auntie-solder.3': line('Auntie Solder', 'Job 2 start', 'You can\'t get that car down my alleys. You\'ve legs, haven\'t you?'),
  'story.ember.cinder.5': line('Cinder', 'Job 2 start', 'Hold F to step out. Take my Hand Flamer. It only reaches six metres, so get close.'),
  'story.ember.cinder.6': line('Cinder', 'First lamp', 'One lit. Two more. Watch your eyebrows.'),
  'story.ember.cinder.7': line('Cinder', 'Raiders', 'Ash Men on the walkway. Fire works on them too.'),
  'story.ember.auntie-solder.4': line('Auntie Solder', 'Job 2 won', 'Three lamps. Now we can see how bad it is. The board\'s by the door if you want work.'),
  'story.ember.auntie-solder.5': line('Auntie Solder', 'Job 3 start', 'Thief! He\'s got my bellows! Heading for the Boneyard!'),
  'story.ember.cinder.8': line('Cinder', 'In the Boneyard', 'He\'s going through the planes. So are you.'),
  'story.ember.cinder.9': line('Cinder', 'Falling behind', 'Closer! You\'re losing him!'),
  'story.ember.cinder.10': line('Cinder', 'Job 3 won', 'Those are good bellows. Keep the flamethrower. You\'ve earned it.'),
  'story.ember.cinder.22': line('Cinder', 'Job 3 sighting', 'He was taking the bellows to the furnace. There it goes, out the far end.'),
  'story.ember.moss.1': line('Big Bess\'s driver, Moss', 'Job 4 start', 'Bess does twenty miles an hour, downhill, with a tailwind. Keep them off us.'),
  'story.ember.moss.2': line('Moss', 'Bess hit', 'That one hurt her feelings.'),
  'story.ember.moss.3': line('Moss', 'Bess resting', 'She needs a minute. Hold on.'),
  'story.ember.moss.4': line('Moss', 'Job 4 sighting', 'Furnace on the ridge, keeping pace with us. Bess does not like being watched.'),
  'story.ember.auntie-solder.6': line('Auntie Solder', 'Job 4 won', 'Listen to that. That\'s a forge. That is a forge, you lovely thing.'),
  'story.ember.cinder.11': line('Cinder', 'Job 5 start', 'Old Smoke keeps the well key in the old mall. Leave the car outside. Too loud.'),
  'story.ember.cinder.12': line('Cinder', 'Inside the mall', 'Stay out of their lamps. If they see you, run. Nobody\'s cross with you for running.'),
  'story.ember.cinder.13': line('Cinder', 'Key taken', 'Got it? You\'ll walk slow with that. Mind the way back.'),
  'story.ember.cinder.14': line('Cinder', 'Alarm', 'They\'ve seen you! Run for the car!'),
  'story.ember.old-smoke.1': line('Old Smoke', 'Job 5 won', 'Little driver. You took my key. Come and give it back, up at the well.'),
  'story.ember.cinder.15': line('Cinder', 'Job 6 start', 'Hold them off while I work the valve. Three lots, I\'d guess.'),
  'story.ember.cinder.16': line('Cinder', 'Waves over', 'Valve\'s free. Hang on, what\'s that noise?'),
  'story.ember.old-smoke.2': line('Old Smoke', 'Old Smoke appears', 'Fire is mine. Everything goes grey in the end.'),
  'story.ember.old-smoke.4': line('Old Smoke', 'Chase starts, after his first line', 'If I cannot have the fire, nobody has it. I am going to put out your forge.'),
  'story.ember.cinder.23': line('Cinder', 'Chase starts', 'He is heading for Tin Town! When a door glows, hit it!'),
  'story.ember.cinder.18': line('Cinder', 'First vent', 'One down. Stay on him!'),
  'story.ember.old-smoke.3': line('Old Smoke', 'Second vent', 'My beautiful furnace! Stop that!'),
  'story.ember.cinder.19': line('Cinder', 'Third vent', 'That\'s it! Get clear! GET CLEAR!'),
  'story.ember.auntie-solder.7': line('Auntie Solder', 'The gate burns', 'He has set the gate alight! We will mend it. You stop that furnace.'),
  'story.ember.auntie-solder.8': line('Auntie Solder', 'The furnace reaches the gate with the right door broken', 'That is close enough, Smoke. Look at the state of you. Go home.'),
  'story.ember.cinder.20': line('Cinder', 'Job 6 won', 'Well, look at that. A hundred years old and still showing off.'),
  'story.ember.cinder.21': line('Cinder', 'Job 6 won', 'I\'m with you now, if you\'ll have me. Nobody else lets me bring the pot.'),
  'story.ember.hollis.1': line('Hollis', 'Job 6 won', 'I can see that fire from the gate. Good work, driver. The boiler has its parts.'),
  'story.ember.cinder.26': line('Cinder', "The well's defence fails and the wave starts again", 'They reached the valve! I have shut it again. Same lot, once more.'),
  'story.ember.auntie-solder.12': line('Auntie Solder', 'The soup spills', 'That was my good soup! Come back. There is more in the pot, and less in my patience.'),
  // RUN-GAS (docs/board/cards/RUN-GAS.md): the gas run, once the six jobs are won.
  'story.ember.moss.5': line('Moss', 'A long road run starts', 'The long way round, then. Bess likes a quiet road.'),
  'story.ember.moss.6': line('Moss', 'A Boneyard road run starts', 'Through the Boneyard. Keep your eyes on the planes; that is where they wait.'),
  'story.ember.moss.7': line('Moss', 'The first raid of a run appears', 'Here they come. Keep them off the tank.'),
  'story.ember.moss.8': line('Moss', 'A run arrives with Bess at 70 health or more', 'Every drop delivered. Bess thanks you, in her way.'),
  'story.ember.moss.9': line('Moss', 'A run arrives with Bess under 70 health', 'We are here, and most of the gas is too. That will do.'),
  'story.ember.moss.10': line('Moss', 'An ambush gives up', 'They have had enough of waiting. Go, go, go.'),
  'story.ember.auntie-solder.9': line('Auntie Solder', 'The feud reaches War party', 'They have stopped raiding and started gathering. That is a war party, driver. Mind how you go.'),
  // FIELD-BATTLE-ASH (docs/board/cards/FIELD-BATTLE-ASH.md): the battle on the Boneyard road at War party. Clinker is Old Smoke's
  // stoker, who drives the patched furnace.
  'story.ember.moss.11': line('Moss', 'The battle starts', 'That is his furnace on the road behind us. Somebody pulled it out of the well.'),
  'story.ember.clinker.1': line('Clinker', 'The furnace comes out', 'You put him in the well. I am putting you in the ground.'),
  'story.ember.clinker.2': line('Clinker', 'A door breaks', 'That door was the last thing he made. You will pay for that door.'),
  'story.ember.moss.12': line('Moss', 'Cinders land on Big Bess', 'It is throwing fire on the tank! Get it off us!'),
  'story.ember.cinder.25': line('Cinder', 'The furnace dies', 'That is the last of his fire, and it went out on a road. Bring the gas home.'),
  'story.ember.auntie-solder.10': line('Auntie Solder', 'Big Bess arrives with the furnace still rolling', 'The gas is in and the gate is shut. That thing will be back. Next time, finish it.'),
  'story.ember.auntie-solder.11': line('Auntie Solder', 'The battle is won', 'No more toll on the Boneyard road. Tin Town owes you a supper.'),
});

export const EMBER_LINE_IDS = Object.freeze([...Object.keys(EMBER_CAPTIONS), EMBER_NOTE_ID]);

registerStoryLines('ember', {captions: EMBER_CAPTIONS, letter: EMBER_NOTE});

// Ships in the Sand (docs/story/ships-in-the-sand.md section 4), word for word.
// Captions use the radio click; letters stay unspoken. No voice file or new cue.
const shipsLine = (who, where, text) => Object.freeze({who, where, text, captionOnly: true});
const shipsLetter = (id, who, where, text) => Object.freeze({id, who, where, spoken: false, text});

export const SHIPS_CAPTIONS = Object.freeze({
  "story.ships.next": shipsLine("Screen (NEXT line)", "Chapter 23 opens", "Take Vesper to see the Baron."),
  "story.ships.1.start": shipsLine("Vesper", "Job starts", "I want to see my father. It's been years. Drive me round the back of the Dome. If I say turn round, don't listen."),
  "story.ships.1.exit": shipsLine("Vesper", "Arrived", "Hold F to step out. Walk me to the door. I'll be fine after that. I'll be fine anyway."),
  "story.ships.1.baron": shipsLine("The Baron", "At the cell door", "Daughter. You've come to gloat at last. Do sit down. I would offer you the chair, but I'm chained to it."),
  "story.ships.1.vesper": shipsLine("Vesper", "Straight after", "What's the book, Father? You've had it under your arm since we locked you up."),
  "story.ships.1.rent": shipsLine("The Baron", "Straight after", "My logbook. Years and years of rent, paid on time. I was an excellent tenant. Ask anyone. I was robbed. By my landlord."),
  "story.ships.1.oil": shipsLine("Vesper", "She opens it", "Lamp oil. One barrel a month, every month since I was six, sent to the lighthouse. Father, nobody lives in the lighthouse. Mother died there."),
  "story.ships.1.word": shipsLine("The Baron", "Straight after", "I was told never to stop paying. I gave my word. It is the only thing I ever kept. Now go away, I'm writing my memoirs."),
  "story.ships.1.won": shipsLine("Vesper", "Back at the car", "The oil goes through Deck Town. Let's go and ask a man who has never reported anything in his life."),
  "story.ships.2.start": shipsLine("Captain Imre", "Job starts", "Deck Town, forenoon watch. Lamp oil goes out on the first of every month. Standing orders: leave the barrel, take the empty, don't knock. Nothing to report."),
  "story.ships.2.vesper": shipsLine("Vesper", "Straight after", "And the barrels come back empty? All these years? You didn't think that was worth writing down?"),
  "story.ships.2.imre": shipsLine("Captain Imre", "Straight after", "Not under the heading of weather. It's all in the ships' logs, if you care to climb for them. One press of F takes you up a ladder. Three ships. Mind the gaps."),
  "story.ships.2.exit": shipsLine("Captain Imre", "Still in the car", "Nobody boards my ships in a car. Hold F to step out."),
  "story.ships.2.log1.go": shipsLine("Captain Imre", "Heading for log 1", "First log's in the chart room on the Good Hope. Up the ladder on her near side."),
  "story.ships.2.log1": shipsLine("Vesper", "Reading log 1", "The first book. \"Morning watch, tide out as normal. Afternoon watch, tide has not come back.\" Next day, \"Tide late.\" Next day, \"Tide late.\""),
  "story.ships.2.log2.go": shipsLine("Captain Imre", "Heading for log 2", "Second is on the Marigold. Don't lean on her rail. She sold the other half of it."),
  "story.ships.2.log2": shipsLine("Vesper", "Reading log 2", "A year on. \"Water down to the anchor chains. Felt her touch bottom at four bells.\" So the sea didn't go in a fortnight. The tide did. The rest went slowly, and everyone had stopped looking."),
  "story.ships.2.log3.go": shipsLine("Captain Imre", "Heading for log 3", "The last is mine, on the Patience. Wipe your feet."),
  "story.ships.2.log3": shipsLine("Vesper", "Reading log 3", "{aground} years of this. \"Sea's late. Sea's late. Sea's late.\" Captain, this is the saddest book I have ever read."),
  "story.ships.2.accurate": shipsLine("Captain Imre", "Straight after", "It's very accurate."),
  "story.ships.2.mast.go": shipsLine("Captain Imre", "Heading for the mast", "I go up the mast every evening, about now. You may as well see it. It's only a ladder. It's a long ladder."),
  "story.ships.2.mast": shipsLine("Vesper", "At the top of the mast", "The light. It's lit. That lighthouse is lit, and it's been lit all this time, and nobody thought to mention it."),
  "story.ships.2.light": shipsLine("Captain Imre", "Straight after", "Evening watch. Light on. Nothing to report."),
  "story.ships.2.won": shipsLine("Vesper", "Job won", "Somebody up there is trimming that lamp. Mr Crisp watches that road, and in clear air his lamps see everything. The spring dust will hide us. We wait for the dust."),
  "story.ships.3.start": shipsLine("Captain Imre", "Job starts", "First dust of spring, and two of our lookouts went out with the oil cart, and the storm has them. Steer by the lighthouse. Nothing to report, but I would hurry."),
  "story.ships.3.vesper": shipsLine("Vesper", "Straight after", "You can't see a thing in this. Watch for the beam coming round, and follow the arrow."),
  "story.ships.3.dustmonger": shipsLine("The Dustmonger", "In the storm, if at peace", "Still not my dust. I checked. Whoever's dust it is, I'd like it noted that it isn't mine."),
  "story.ships.3.crisp": shipsLine("Mr Crisp", "In the storm", "So sorry, this road is closed for maintenance. Also, I'm told it isn't a road. Terribly sorry."),
  "story.ships.3.stop": shipsLine("Vesper", "Near a lookout", "There! A lamp, waving. Stop right beside it and wait."),
  "story.ships.3.one": shipsLine("First lookout", "Picked up", "Bless you. We've been walking in a circle since supper. We passed this rock four times. It's a good rock."),
  "story.ships.3.two": shipsLine("Second lookout", "Picked up", "Forenoon lookout, reporting for rescue. Is it still forenoon? It has felt like forenoon for some time."),
  "story.ships.3.won": shipsLine("Vesper", "At the lighthouse door", "The door's not locked. There's fresh oil on the step and one clean cup. Stay close, driver."),
  "story.ships.4.start": shipsLine("Vesper", "Job starts", "Hold F to step out, and F again at the foot of the stairs. Stay behind me. If it's Vane's people, I'm going to be rude to them."),
  "story.ships.4.drawings": shipsLine("Vesper", "First landing", "Drawings, all the way up the wall. Those are gates. That's the Dry Dam, every bolt of it."),
  "story.ships.4.letters": shipsLine("Vesper", "Second landing", "A box of letters. They've all got my name on. Nobody ever posted them."),
  "story.ships.4.isolde": shipsLine("Isolde", "Top of the stairs", "I heard you on the gravel. You drive like your father. Shut that door, there's a storm on, and I have only just swept."),
  "story.ships.4.dead": shipsLine("Vesper", "Straight after", "You're dead. You've been dead since I was six."),
  "story.ships.4.told": shipsLine("Isolde", "Straight after", "I told him to say so. It's the one instruction he ever followed."),
  "story.ships.4.years": shipsLine("Vesper", "Straight after", "All those years."),
  "story.ships.4.cup": shipsLine("Isolde", "Straight after", "A letter a year. I never found a way to send them that wouldn't send Prudence Vane to you. Sit down. There's only the one cup. You have it."),
  "story.ships.4.sea": shipsLine("Isolde", "Straight after", "You've been told the sea dried up. It never did. The ocean is on the other side of that dam, as high as it ever was. We shut the sea gate, and the sun did the rest."),
  "story.ships.4.why": shipsLine("Isolde", "Straight after", "Under the water was salt and metal, worth far more than the water. Prudence knew that. I was her chief engineer, and I drew that gate. When I understood what it was for, I said no, in writing."),
  "story.ships.4.leak": shipsLine("Isolde", "Straight after", "The dam leaks, of course. One litre a second through one crack is eighty-six thousand litres a day. She boils the salt out and sells it to you by the bottle. Prudence built a business on a leak."),
  "story.ships.4.salt": shipsLine("Jax", "Straight after, on the radio", "So THAT'S why the wall tastes of salt. I'd like it known I said so."),
  "story.ships.4.letgo": shipsLine("Vesper", "Straight after", "And she just let you go?"),
  "story.ships.4.dead2": shipsLine("Isolde", "Straight after", "She sent a very nice letter. Then some men came, very politely. So I died. She doesn't look for dead people. She is far too tidy."),
  "story.ships.4.lamp": shipsLine("Isolde", "Vesper looks at the lamp", "That's for the ships. You don't leave a ship without a light just because the sea is late."),
  "story.ships.4.clue": shipsLine("Isolde", "Job won", "I have the drawings and half the codes. The other half went in the gate log, up in the gatehouse on the Ridge. The man who kept it would know. A boy, nineteen or so, very polite. He asked me if a fortnight was a long time."),
  "story.ships.5.start": shipsLine("Isolde", "Job starts", "I am packed. My drawings are in the pilot boat, on the trailer out the back. Forty feet of her, about fifteen tonnes. Yes, a boat. Yes, it's a desert. She was here first."),
  "story.ships.5.vane": shipsLine("Mr Crisp", "Straight after", "So sorry, Mrs Blackiron. Mrs Vane sends her kind regards, and some men. Nothing personal."),
  "story.ships.5.hand": shipsLine("Isolde", "Straight after", "Tell Prudence her handwriting has got worse."),
  "story.ships.5.hook": shipsLine("Odessa", "Vehicle ready", "That's the tow rig. Back up to the trailer and stop. Then go slowly, because that line snaps if you pull too hard."),
  "story.ships.5.vesper": shipsLine("Vesper", "Moving", "I'll keep them off the rope. You keep driving. Don't look at the boat. Nobody can drive and look at that boat."),
  "story.ships.5.bump": shipsLine("Mr Crisp", "Pickups arrive", "So sorry, would you mind awfully stopping? I've been told to bump you until you do."),
  "story.ships.5.snap": shipsLine("Isolde", "The line snaps", "You've snapped my line. How fast did you think a boat goes? Back up and hook on again."),
  "story.ships.5.imre": shipsLine("Captain Imre", "Passing Deck Town", "Deck Town, afternoon watch. Boat going by on a trailer, on dry land, in our sea. Nothing to report."),
  "story.ships.5.bo": shipsLine("Bo", "At the north gate, grown up by now", "That's a real boat. I've got a very good truck of my own now, you know. I could tow that better than you. Can I drive it?"),
  "story.ships.5.know": shipsLine("Isolde", "Straight after, seeing Hollis", "You. I know you. You've got old."),
  "story.ships.5.maam": shipsLine("Hollis", "Straight after", "Yes, ma'am."),
  "story.ships.5.what": shipsLine("Vesper", "Straight after", "Hollis? What was that?"),
  "story.ships.5.won": shipsLine("Hollis", "Job won", "Leave the boat there. Nobody's to sit in it."),
  "story.ships.6.start": shipsLine("Hollis", "Job starts", "There's a gatehouse up on the Ridge. I've not been up there since I was nineteen. I'd like you to drive me, in something that climbs."),
  "story.ships.6.mo": shipsLine("Big Mo", "Owns neither the Titan nor the rally car", "LADIES AND GENTLEMEN AND ALSO DOGS, THE SHOW TRUCK IS OUT ON LOAN! PLEASE DO NOT SCRATCH IT! HE SAID PLEASE!"),
  "story.ships.6.left": shipsLine("Hollis", "Leaving the road", "Left here."),
  "story.ships.6.knees": shipsLine("Hollis", "First big bump", "Mind the bumps. I've had these knees a long time."),
  "story.ships.6.green": shipsLine("Hollis", "Halfway up", "It was greener."),
  "story.ships.6.tam": shipsLine("Old Tam", "Higher", "Who's that on my ridge? Is that young Hollis? Tell that boy he still owes me a goat."),
  "story.ships.6.goat": shipsLine("Hollis", "Straight after", "I do."),
  "story.ships.6.view": shipsLine("Hollis", "Arrived", "You can see all of it from here. I'd forgotten that. Wait by the car, driver. I'll go in alone."),
  "story.ships.6.wait.vesper": shipsLine("Vesper", "Waiting, on the radio", "What's he doing up there? He's never left that gate. He won't take a day off for his own birthday."),
  "story.ships.6.wait.isolde": shipsLine("Isolde", "Waiting, on the radio", "Let him be."),
  "story.ships.6.out": shipsLine("Vesper", "He comes out, she reads it over the radio as he says it", "The gate log. Last page. \"Sea gate shut, on orders. Back on duty in a fortnight.\" Hollis, is that your handwriting?"),
  "story.ships.6.reveal": shipsLine("Hollis", "Job won (words from Long Dry Act 4)", "I've kept a gate all my life, driver. That was the first one. I was nineteen and they told me it was for a fortnight. I can open it. I'll need a lot of help."),
  "story.ships.6.isolde": shipsLine("Isolde", "Straight after", "You will. I've got half the codes and he's got the rest. You'd better build something, driver. You'd better build something very big."),
  "story.ships.oil.start": shipsLine("Captain Imre", "Job starts", "First of the month. Barrel's on your roof. Standing orders: leave it, take the empty. You may knock now, if you like. Nothing to report."),
  "story.ships.oil.spill": shipsLine("Captain Imre", "Barrel spilled", "Oil on the sea bed. I shall not be writing that down. Come back for another."),
  "story.ships.oil.won": shipsLine("Captain Imre", "Delivered", "Evening watch. Light on. Nothing to report."),
  "story.ships.b0.odessa": shipsLine("Odessa", "Report: chapter 23 opens", "That bottle of water from the dam has been on my shelf long enough. I'm sending it to Brian. If it's only a salty well, I want to know, and then I can stop thinking about it."),
  "story.ships.b0.brian": shipsLine("Brian", "Test finished", "I boiled a litre dry and weighed what was left. Thirty-five grams of salt. That number is the sea, driver, nearly everywhere on Earth. Not a salty well. The sea. So why is it in your dam?"),
  "story.ships.b0.hollis": shipsLine("Hollis", "Straight after", "Hm."),
  "story.ships.b1.pell": shipsLine("Mr Pell", "Report: after job 1, a month later", "I've read the Baron's logbook. His rent adds up, sadly. A barrel is two hundred litres, so that oil is about six and a half litres a night, and that is exactly what a lighthouse lamp burns. Somebody is burning it."),
  "story.ships.b1.friend": shipsLine("Captain Imre", "Report: standing too low", "Deck Town, forenoon watch. We do not show our logs to strangers. Bring water and buy salt for a while. Nothing to report."),
  "story.ships.b4.pack": shipsLine("Isolde", "Report: after job 4", "I will come when I am packed, and not before. All those years of drawings, in order. The trailer wants new tyres and an axle. And somebody learns that lamp before I leave it. Go home. I'll send word."),
  "story.ships.b4.keeper": shipsLine("Captain Imre", "Report: the keeper learns", "Deck Town, forenoon watch. Two of ours are learning the lamp. She has made one of them cry. Nothing to report."),
  "story.ships.b5.office": shipsLine("Isolde", "Report: after job 5", "I need a dry room, a long table and good light. Then I need two people who can draw a straight line. Your school has turned out a few by now. I will teach them the rest."),
  "story.ships.b5.copying": shipsLine("Vesper", "Report: copying under way", "She's had them copying every bolt of that dam. Nobody knows what it's for yet. I asked Hollis. He went and looked at the gate for a while."),
  "story.ships.b5.ready": shipsLine("Isolde", "Report: every drawing read", "I have read every sheet twice. I still need the other half of the codes. It has been a year, Hollis."),
  "story.ships.b5.know": shipsLine("Hollis", "Straight after", "I know."),
});

export const SHIPS_NOTE_ID = "story.ships.hollis.note";
export const SHIPS_NOTE = shipsLetter(SHIPS_NOTE_ID, "Hollis (note)", "The Story Wall, after the Iron Mule", "Driver, Vesper wants to see her father. I'd go with her. People should have someone to drive them to that sort of thing. Hollis");

export const VANE_LETTER_ID = "story.ships.6.letter";
export const VANE_LETTER = shipsLetter(VANE_LETTER_ID, "Mrs Vane (letter)", "Next town visit", "Dear Neighbour, I understand you have been up at the old gatehouse. Mr Hollis and I go back some way. Do give him my regards. Kind regards.");

export const SHIPS_LINE_IDS = Object.freeze([...Object.keys(SHIPS_CAPTIONS), SHIPS_NOTE_ID, VANE_LETTER_ID]);

registerStoryLines('ships', {captions: SHIPS_CAPTIONS, letter: SHIPS_NOTE});
