// Short field notes, written in each crew member's voice.
export const TOWN_DISPATCH_LOGS = Object.freeze({
  cinder: Object.freeze([
    'I found an old stove. It still owes me an apology.', 'I put out a campfire. The kettle was innocent.',
    'The smoke cleared. The lizard did not.', 'I checked the chimney. It was a very tall pipe.',
    'I found warm ash and no breakfast. Typical.', 'The fire is out. My eyebrows remain on duty.',
    'A burnt sign said REST STOP. I took that personally.', 'I warmed a tin cup. It warmed my glove too.',
    'The only thing burning was my lunch. I saved the pan.', 'I found a spark. It was less useful than it looked.',
  ]),
  odessa: Object.freeze([
    'I fixed a pump with a spoon. I want my wrench back.', 'The wheel was loose. The road was not the problem.',
    'I found a gearbox full of sand. It was nearly a gearbox.', 'The engine starts now. It sounds surprised.',
    'I patched the pipe. It stopped spraying me.', 'I fixed the gate. The hinge still complains.',
    'A bolt was missing. I found it in my pocket.', 'The truck runs. The seat still bites.',
    'I found a toolbox. Somebody kept rocks in it.', 'One turn of the wrench. Four turns of the swearing.',
  ]),
  wren: Object.freeze([
    'I found a road that ends at a very large hole.', 'Tracks go north. The lizard went south.',
    'I saw a tower. It was a tree with confidence.', 'The map was right. My boots are not.',
    'I found a lookout. It looks out at more dust.', 'There is a path here. It is mostly cactus.',
    'I found a sign pointing both ways. Helpful.', 'A vulture followed me. I am choosing not to ask why.',
    'The ridge is clear. The view is mostly beige.', 'I marked the old airstrip. Something still owes landing fees.',
  ]),
  dune: Object.freeze([
    'I found a ridge and a good place to avoid it.', 'The tracks vanished. The dust kept them.',
    'I watched the road. It did not do anything.', 'There is a shortcut. It has a long way around it.',
    'I found a lookout. The view has seen better days.', 'The wind moved the marker. I moved it back.',
    'I saw lights at night. They were fireflies. Probably.', 'The valley is empty. A goat disagreed.',
    'I found a dry creek. It has excellent hiding places.', 'I marked the pass. The pass marked my boots.',
  ]),
  tusk: Object.freeze([
    'I carried the heavy crate. It was full of smaller crates.', 'The gate was stuck. It is not stuck now.',
    'I moved a boulder. It was in my way.', 'The bridge held. I also held it, just in case.',
    'I hauled the engine home. It made a new noise.', 'The wall is safe. It was mostly rocks anyway.',
    'I carried the spare wheel. The truck wanted it back.', 'I lifted the beam. Everyone clapped too early.',
    'The road is clear. I left the little rock there.', 'I found a canteen. It was full of bolts.',
  ]),
  nell: Object.freeze([
    'I checked the charge. It was a biscuit tin.', 'The old door is open. It was already missing.',
    'I found a fuse. It was for the lamps. Boring.', 'The wall has a gap. I did not make it.',
    'I made the safe path safer. Then I marked it twice.', 'That crate was locked. The lock was very brave.',
    'I found a wire. It led to a bell and a goat.', 'No explosives needed. I feel oddly underdressed.',
    "I marked the weak spot. It is now everybody's favorite spot.", 'The bridge is sound. I tested it from a distance.',
  ]),
  jax: Object.freeze([
    'I found a ladder. It goes up, which is the useful part.', 'The roof is clear. The stairs are still terrible.',
    'I boarded a truck. It was parked and very polite.', 'I found a rope. The knot was better than mine.',
    'The wagon is secure. It has no idea how close it came.', 'I checked the rail. The train was late again.',
    'There is a way across. It involves not looking down.', 'I climbed the tower. The stairs won the argument.',
    'I found a hook. It was holding up a hat.', 'The route is open. My knees filed a complaint.',
  ]),
  rook: Object.freeze([
    'I found a place to sit. It was already occupied by a goat.', 'The road is open. Nobody asked it to be.',
    'I fixed the sign. It now points somewhere useful.', 'The job is done. I am keeping the spare biscuit.',
    'I found a dry bed. It was a pile of tin.', 'The camp is quiet. That usually means lunch.',
    'I checked the map. It has more blank bits now.', 'The gate works. The handle has opinions.',
    'I carried the message. The message was a sandwich.', 'All clear here. One vulture is filing an appeal.',
  ]),
  vesper: Object.freeze([
    'I found an old ledger. It still balances. I am offended.', 'The route is clear. Someone has tidied the dust.',
    'I found a marker from before the Dry. It was quite sure of itself.', 'The camp is safe. The paperwork is not.',
    'I spoke to the trader. She charged me for the conversation.', 'There is water under this road. I know the handwriting.',
    'I found a letter addressed to a neighbour. It was not for me.', 'The old road runs west. It still thinks it is important.',
    'I made a note for later. Later can read it itself.', 'The marker stands. The wind is reconsidering.',
  ]),
});

export const TOWN_DISPATCH_LOG_COUNT = Object.values(TOWN_DISPATCH_LOGS).reduce((total, lines) => total + lines.length, 0);
