import {registerStoryLines} from '../../story/story-lines.js';

const caption = (who, where, text) => Object.freeze({who, where, text, captionOnly:true});

// The Long Dry section 10. Lines stay data so other town strands can register
// their own captions without changing the radio.
export const TOWN_CAPTIONS = Object.freeze({
  'town.hollis.note.dry': caption('Hollis (note)', 'First open, water road unfinished', 'Driver, people keep turning up at the gate. They heard there is a camp here, and they have walked a long way on the strength of that. I keep a gate. I do not keep a town. There is flat ground all round the Dome. You build it. Hollis'),
  'town.hollis.note.wet': caption('Hollis (note)', 'First open, the Baron beaten', 'Driver, the water is running and the whole Wasteland has heard. People are walking in by the dozen and sitting down in my road. I keep a gate. I do not keep a town. There is flat ground all round the Dome. You build it. Hollis'),
  'town.hollis.name': caption('Hollis', 'Naming the town', "What do we call it? It's your town. Rustwall's what I've been calling it, but I don't like to fuss."),
  'town.1.twelve': caption('Hollis', 'Chapter 1', "Twelve of them so far. They've got a bit of canvas and not much else. They've got names, too. I wrote them down. Somebody should."),
  'town.1.pits': caption('Odessa', 'Chapter 1', "Right. Nobody lives anywhere without water. It's down there somewhere, and not the same depth everywhere. Mark me three places and we'll dig test pits. It'll take a few days. Nothing out here is quick."),
  'town.1.road': caption('Odessa', 'Pits dug', "Next, a road. That's not a line on a map. That's four people and two barrows, so don't make it longer than you need."),
  'town.2.well': caption('Odessa', 'Chapter 2', "That pit's the best of them. Water at six metres. Dig it out and line it. Nobody's going to thank you until it's done."),
  'town.2.brown': caption('Hollis', 'Well done', "It's brown. It's also ours. One thing at a time."),
  'town.3.nothing': caption('Odessa', 'Chapter 3', "We've nothing to build with. There's a whole graveyard of airliners out in the Boneyard, and a flatbed in the truck bay. It'd do you good to get out of that chair."),
  'town.3.load': caption('Odessa', 'Driving back', "Slowly. That's a month's work on the back of that truck."),
  'town.3.won': caption('Odessa', 'Unloaded', 'Now that\'s a pile of scrap I can respect.'),
  'town.4.soup': caption('Odessa', 'Chapter 4', 'They have water, so now they want dinner. People are like that. Build a soup kitchen.'),
  'town.4.homes': caption('Odessa', 'Soup built', "Paint some ground for homes and they'll put up their own. You don't build houses. You build reasons to stay."),
  'town.5.smell': caption('Odessa', 'Chapter 5', "You smell that? That is a lot of people and no plan. Build a latrine, downhill and well away from the well. I'll explain why if you make me."),
  'town.5.sick': caption('Odessa', 'Latrine within 30 metres of a well, or uphill of it', "Everyone's sick. Look at the map: what goes in the ground goes in the water, and it runs downhill. Move the latrine or move the well."),
  'town.5.fact': caption('Odessa', 'After the sickness, or from the Why button', 'True story. In 1854 a doctor in London stopped a deadly sickness by working out which water pump it came from and taking off the handle. Everybody thought he was mad.'),
  'town.6.winter': caption('Hollis', 'Chapter 6', "Nights are turning. Canvas won't do for a winter out here. You've got until the frost to get them under tin."),
  'town.6.short': caption('Odessa', 'Site short of tin', "We're out of tin. The Boneyard's got more, if somebody'd go and get it. I'm looking at you."),
  'town.6.made': caption('Hollis', 'All under tin by the frost', "That's all of them under a roof. They'll remember who did that."),
  'town.6.late': caption('Hollis', 'Not all under tin', "Some of them spent that winter in canvas. They got through it. They'll remember that too."),
  'town.7.fire': caption('Odessa', 'The fire report', 'FIRE! The soup kitchen! There\'s an old engine in the truck bay. She started last Tuesday. GO!'),
  'town.7.spray': caption('Odessa', 'First in the truck', 'Drive right up to it. Hold H to spray. She holds three minutes of water. When the tank runs dry, stop at any tap to fill up.'),
  'town.7.won': caption('Odessa', 'Fire out', 'Still standing. You smell terrible. Well done.'),
  'town.7.ash': caption('Hollis', 'After the fire', "There's ash on the ground, and it isn't from the fire. Somebody started this. There's a woman named Cinder who knows about ash."),
  'town.8.payday': caption('Hollis', 'Chapter 8', "Bills are in. The till is the town's money and your scrap is yours. Bills only ever come out of the till. Have a look at the Ledger."),
  'town.8.books': caption('Hollis', 'Ledger opened, Vultures not at peace', "Money in, money out. What's left is the profit. I have added it up twice and got two answers."),
  'town.8.vultures': caption('The Vultures', 'Ledger opened, at peace', 'Two columns. One of you. Do the math.'),
  'town.8.won': caption('Hollis', 'One good year', "That's a town that pays for itself. Don't let it go to your head."),
  'town.9.pipes': caption('Odessa', 'Chapter 9', 'Half this town spends half its day carrying buckets. Time for pipes. And a tower, because water won\'t climb on its own. Think of the tower as a very tall bucket.'),
  'town.9.fact': caption('Odessa', 'Tower running', "Ten metres of height is about one bar of pressure, no matter how much water's in it. It's why towers are tall and not fat. Ask Brian if you don't believe me."),
  'town.10.hall': caption('Hollis', 'Chapter 10', "A hundred people, and they keep asking me who's in charge. Build a Town Hall. Then they can ask you."),
  'town.10.statue': caption('Hollis', 'Hall built', "They've voted to put up a statue of you. It doesn't look like you. Nobody here has seen you outside a car."),
  'town.book.first': caption('The Book', 'First page', 'These twelve came first. {founders}'),
  'town.bo.16': caption('Bo', 'At about sixteen, on a visit', 'I passed the test. Dot\'s van counts as a test. Can I drive it now?'),
  'town.bo.grown': caption('Bo', 'Grown, with his own truck', "Don't look at me like that. It's a very good truck."),
  'town.quill.last': caption('Miss Quill', 'The convoy, Act 5', 'Bo. Get in the truck.'),
  'dot.flour.dot': caption('Dot', 'Chapter 11', "This is Dot, out on the Boneyard road. I've got a pie oven and no flour. Bring me ten sacks and I'll send you back pies. Don't ask about the coffee."),
  'dot.flour.bump': caption('Dot', 'Sacks spilled', "That's flour on the road, that is! Go back and get more!"),
  'dot.flour.won': caption('Dot', 'Delivered', "Sit down. Have a coffee. No, don't. I like you."),
  'dot.flour.pies': caption('Odessa', 'Pies home', "Everyone's in a better mood. That's what a trade road does. It also means we have to keep it open."),
  'dot.fire.fire': caption('Dot', 'Chapter 12', 'Road Rats threw a lamp through my window! Now my diner\'s on fire and I am VERY cross!'),
  'dot.fire.cinder': caption('Cinder', 'On the way, if she has joined', "That's an amateur fire. Put it out before I get embarrassed for them."),
  'dot.fire.saved': caption('Dot', 'Fire out', "It's still got a roof. Mostly. They'll be back, you know."),
  'dot.fire.offer': caption('Hollis', 'Report: Offer protection', "She's on her own out there. Run a fence round her and put a lookout on it, and she'll pay us a bit a week. It's not a threat. Make sure she knows it's not a threat."),
  'dot.fire.fence': caption('Hollis', 'The fence job', 'Four stops. Drop a fence at each. The Rats will try to stop you.'),
  'dot.fire.won': caption('Dot', 'Fence done', "Best fence I ever saw. Coffee's on me. That's a threat."),
  'quill.quill': caption('Miss Quill', 'Chapter 13', 'This is Miss Quill, at the school in the third airliner. We have one piece of chalk, and forty children have been using it since spring.'),
  'quill.bo': caption('Bo', 'At the school', 'Is that your real car? Can I drive it? Can I drive it now?'),
  'quill.won': caption('Miss Quill', 'Delivered', 'Children, say thank you. Bo, get out of the truck.'),
  'quill.drawing': caption('Miss Quill', 'Later report, with a child\'s picture', 'The children drew your town. Bo has drawn it on fire. He says that\'s how he likes it best.'),
  'tam.tam': caption('Hollis', 'Chapter 14', "There's an old fellow on the Ridge with the last good goats anywhere, and he won't come down. You'll have to go up. Only the Titan or the rally car will get that far."),
  'tam.up': caption('Old Tam', 'You arrive', 'You drove all the way up here? Mad. Salt\'s on the shelf. Goats are in the kitchen. Mind the goats.'),
  'tam.sea': caption('Old Tam', 'Loading', 'I was up here the day the sea went. People say it dried up. Seas don\'t dry up in a fortnight, driver.'),
  'imre.imre': caption('Captain Imre', 'Chapter 15', 'Deck Town, afternoon watch. Nothing to report. Sea\'s late. Our tank is dry, if you have any water going.'),
  'imre.won': caption('Captain Imre', 'Tank filled; {aground} is thirty plus the town\'s year, in words', '{aground} years aground and we\'ve not missed a watch. She\'ll want a crew when the water\'s back.'),
  'imre.salt': caption('Captain Imre', 'Trade', "We've a great deal of salt. It's about all that was left behind."),
  'pim.pim': caption('Pim', 'Chapter 16', 'Rail Halt here. The 2:15 is running on time. I should tell you there is no 2:15. But if there were.'),
  'pim.fix': caption('Pim', 'Job', 'My water crane\'s seized. Bring your wrench. Tuesday will show you where. Tuesday is the dog.'),
  'pim.night': caption('Pim', 'Night', 'Something goes by here most nights with no lights on, leaking water. I set my clock by it. That is rather the trouble.'),
  'pim.hook': caption('Hollis', 'After', 'A train nobody owns, carrying water nobody sold. Somebody\'s got a lot of nerve, or a lot of money.'),
  'town.heli.tam': caption('Old Tam', 'The report', 'The Ridge is on fire. The goats have views on it. No truck\'s getting up here, driver.'),
  'town.heli.hollis': caption('Hollis', 'The report', "I know a pilot. That's you, isn't it? Build a pad. I'll make a call."),
  'town.heli.roger': caption('Roger', 'First flight over', "Kestrel One, Tremblant. Say again your position? I didn't know that wall had another side."),
  'town.heli.dune': caption('Dune', 'No pilot yet', "I'll take the job. I don't fly, but I know a man who owes me a helicopter. Don't ask."),
});

const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function numberWords(value) {
  let number = BigInt(value);
  if (number < 20n) return SMALL[Number(number)];
  if (number < 100n) return `${TENS[Number(number / 10n)]}${number % 10n ? `-${SMALL[Number(number % 10n)]}` : ''}`;
  if (number < 1000n) return `${SMALL[Number(number / 100n)]} hundred${number % 100n ? ` ${numberWords(number % 100n)}` : ''}`;
  for (const [size, name] of [[1000000000000000000n, 'quintillion'], [1000000000000000n, 'quadrillion'], [1000000000000n, 'trillion'], [1000000000n, 'billion'], [1000000n, 'million'], [1000n, 'thousand']]) {
    if (number >= size) return `${numberWords(number / size)} ${name}${number % size ? ` ${numberWords(number % size)}` : ''}`;
  }
  return String(number);
}

function founderNames(town) {
  const names = Array.isArray(town?.founders) ? town.founders.map(founder => typeof founder === 'string' ? founder : founder?.name).filter(name => typeof name === 'string' && name.trim()) : [];
  return names.length ? names.join(', ') : 'the twelve founders';
}

export function townCaptionText(id, town = {}) {
  const text = TOWN_CAPTIONS[id]?.text ?? null;
  if (text === null) return null;
  const year = BigInt(town?.calendar?.year ?? 1);
  return text.replaceAll('{founders}', founderNames(town)).replaceAll('{aground}', numberWords(30n + year));
}

const RADIO_CAPTIONS = Object.fromEntries(Object.entries(TOWN_CAPTIONS).map(([id, value]) => [`story.town.${id.replace(/^town\./, '')}`, value]));
registerStoryLines('town', {captions:RADIO_CAPTIONS});
