// Short lines for the town's yearly book. Keep each line suitable for a child.
export const TOWN_BOOK_FORMS = Object.freeze([
  'They made a start, and kept at it.', 'The year was hard work, mostly.', 'A little more stood here by winter.',
  'The town grew in the usual untidy way.', 'There was more to mend than to celebrate.', 'People came, and found room.',
  'The work went on, one load at a time.', 'The year left the town a little stronger.', 'Not every plan worked the first time.',
  'The people made the best of what they had.', 'The old road carried another year of traffic.', 'A new roof is a fine thing in winter.',
  'The wells did their best.', 'The town kept its lamps lit.', 'There was enough to share, after a fashion.',
  'The workers finished what they had started.', 'The year was dry, and the buckets were busy.', 'The people learned where the ground gave way.',
  'The town kept going through the hot months.', 'There was dust in everything, as usual.', 'The rain came late, but it came.',
  'The water lasted, though nobody wasted it.', 'The town found another use for old scrap.', 'The new place soon had muddy footprints.',
  'A quiet year is still a year lived.', 'The children found room to play.', 'The neighbours knew the road by heart.',
  'There was a good deal of hammering.', 'The stores were counted twice.', 'The last load arrived before dark.',
  'A fire made the night longer.', 'The smoke cleared, and the work began again.', 'The town lost something and carried on.',
  'The dry spell tested every well.', 'Water was watched more closely that year.', 'The ground gave little back for a while.',
  'The town made it through the dry season.', 'The first one of its kind was finished.', 'A new skill found a place in town.',
  'The first proper meal was shared.', 'The first clean water was worth the wait.', 'The first school day began with one piece of chalk.',
  'The first light stayed on after sunset.', 'The first harvest was smaller than hoped.', 'The first road reached the next place.',
  'The first winter under a roof was a relief.', 'The first market day was busy enough.', 'The first machine did not behave at once.',
  'A child was born, and the town made room.', 'Someone came through the gate and stayed.', 'One of the old hands was laid to rest.',
  'A family found its way back home.', 'The town welcomed people who had been away.', 'The gate opened more often that year.',
  'The people knew one another better by then.', 'The town was larger, but still familiar.', 'The new work brought its own troubles.',
  'There was no shortage of advice.', 'The meeting ended when the kettle boiled dry.', 'The book keeper ran out of room, then found some.',
  'The year passed without asking permission.', 'The town remembered who had helped.', 'A new name was added to the map.',
  'The old hands taught the young ones.', 'The people settled the matter over supper.', 'The town made do, which is not the same as doing well.',
  'A small repair saved a large job.', 'The road was busy and the dust was worse.', 'The last day felt much like the first.',
  'There was work tomorrow, as ever.', 'The town took stock and carried on.', 'Nobody called it easy, but it was home.',
]);

export function townBookSentence(index) {
  return TOWN_BOOK_FORMS[((index % TOWN_BOOK_FORMS.length) + TOWN_BOOK_FORMS.length) % TOWN_BOOK_FORMS.length];
}
