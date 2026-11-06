// Letter wording and trigger names are from The Polite Letter, section 4.
// Conditions are strings so later town systems can report new events without
// changing this content table.
const letter=(id,condition,text,repeatable=false)=>Object.freeze({id,condition,text:`${text}`,repeatable});
export const VANE_LETTERS=Object.freeze([
  letter('vane.l.statue','statue-built','Dear Neighbour, I can see your statue from my window. I have asked for the window to be cleaned. Kind regards.'),
  letter('vane.l.hall','town-hall-built','Dear Neighbour, congratulations on your Town Hall. I do so admire brick. It is what people use before they can afford anything else. Kind regards.'),
  letter('vane.l.school','school-built','Dear Neighbour, I understand your children are learning to read. I look forward to their opinions of my contracts. Kind regards.'),
  letter('vane.l.clinic','clinic-built','Dear Neighbour, a clinic! People who live longer drink more water. I could not be more pleased. Kind regards.'),
  letter('vane.l.fire','building-burned','Dear Neighbour, I was sorry to hear about your fire. My company sells water for putting those out. It is the same water at the same price, and I find people do not stop to argue. Kind regards.'),
  letter('vane.l.drought','dry-summer','Dear Neighbour, what a dry summer. I cannot think how that happens. Should your taps fail, you know where I am. You can see it from anywhere. Kind regards.'),
  letter('vane.l.rain','wet-month','Dear Neighbour, I hear you had rain. Do enjoy it. I have looked into buying it, and I am told it cannot yet be done. Kind regards.'),
  letter('vane.l.winter','winter-in-canvas','Dear Neighbour, I notice some of your people spent the winter in tents. Mine have heating. I mention it only as a neighbour. Kind regards.'),
  letter('vane.l.goat','goat-pen-built','Dear Neighbour, one of your goats has eaten my sign. I enclose an invoice for the sign, and a smaller one for the distress. Kind regards.'),
  letter('vane.l.bo','bo-fifteen','Dear Neighbour, a young man named Bo has asked whether he may drive my armoured pickup. I said no. He asked again. Is he yours? Kind regards.'),
  letter('vane.l.dentist','kettle-at-peace','Dear Neighbour, I hear your dentist used to be a warlord. Mine used to be a dentist, which I find the better way round. Kind regards.'),
  letter('vane.l.vultures','vultures-at-peace','Dear Neighbour, your accountants have sent me two answers to the same question. Both are correct. I would like to hire them, and I would like them to stop. Kind regards.'),
  letter('vane.l.magnus','magnus-visited-twice','Dear Neighbour, a man with a crane has taken four of my trucks. He says he is building something. Do pass on my admiration, and this invoice. Kind regards.'),
  letter('vane.l.sal','sal-driven-off','Dear Neighbour, thank you for sending me Sal. She has already cut my costs. She has also cut a door. Kind regards.'),
  letter('vane.l.mirage','mirage-driven-off','Dear Neighbour, a charming woman has sold me a lake. I have been out to see it. I shall not be taking this further, and I would be grateful if you did not mention it. Kind regards.'),
  letter('vane.l.raid','raided-vane-truck','Dear Neighbour, one of my trucks came home empty, with your tyre marks on it. I have had them measured. Your left front is wearing badly. Kind regards.'),
  letter('vane.l.escort','escorted-fuel-truck','Dear Neighbour, my men tell me your fuel arrived after all. I have had a word with them. They have asked me to say how sorry they are. Kind regards.'),
  letter('vane.l.deed.won','outbid-vane','Dear Neighbour, congratulations on paying that much. Kind regards.'),
  letter('vane.l.deed.lost','vane-won-deed','Dear Neighbour, I have bought the road you use to reach your other road. Your first toll is enclosed. It is a small one. They begin small. Kind regards.'),
  letter('vane.l.deed.sign','player-holds-deed-set','Dear Neighbour, I saw your flag. I am told it was sewn by hand. I could tell. Kind regards.'),
  letter('vane.l.deed.twelve','vane-holds-twelve-deeds','Dear Neighbour, I have stopped buying for now. I find it unkind to hold everything at once. It leaves people nothing to look forward to. Kind regards.'),
  letter('vane.l.deed.back','player-won-deed-duel','Dear Neighbour, I gather you have won back a stretch of road by driving very fast at someone. How refreshing. My lawyers would like to know how that is legal. So would I. Kind regards.'),
  letter('vane.l.people.500','population-500','Dear Neighbour, five hundred people. That is five hundred customers, whatever you may call them. Kind regards.'),
  letter('vane.l.people.1000','population-1000','Dear Neighbour, your town has passed a thousand. I remember when it was twelve. I had their names written down as well. Kind regards.'),
  letter('vane.l.people.leave','family-left-town','Dear Neighbour, a family has arrived at my gate from your town. They seem very nice. They say the water’s fine, but it is not what it was. I do not ask. Kind regards.'),
  letter('vane.l.brown','water-brown-again','Dear Neighbour, I do hope your water is well. A small bird tells me it is the colour of tea this week. I still have your kiosks in storage, all clean. Kind regards.'),
  letter('vane.l.reservoir','reservoir-built','Dear Neighbour, two million litres, all in one place, open to the sky. In this sun. I do admire your confidence. Kind regards.'),
  letter('vane.l.helipad','kestrel-over-vane-tower','Dear Neighbour, there is a helicopter over my tower. I do not believe I invited one. It is rather a small helicopter. Kind regards.'),
  letter('vane.l.dome','won-at-scrapdome','Dear Neighbour, I do not attend the Scrapdome. I am told you win quite often. I am sure it is very important to the people who go. Kind regards.'),
  letter('vane.l.bowl','scrapasaurus-beaten','Dear Neighbour, I understand you have beaten a large metal dinosaur. I had one like it made, and I sent it back. Kind regards.'),
  letter('vane.l.yearly','quiet-yearly-visit','Dear Neighbour, it is Year {year} and you are still here. How persistent. Kind regards.',true),
  letter('vane.l.yearly2','quiet-yearly-road','Dear Neighbour, I have looked over your town again this year. You have moved a road. I had thought it was fine where it was. Kind regards.',true),
  letter('vane.l.yearly3','quiet-yearly-book','Dear Neighbour, I have been reading your Town’s Book. Do not ask me how. There is a very nice bit in Year {year}. You should look after that family. Kind regards.',true),
  letter('vane.l.yearly4','quiet-yearly-no-reply','Dear Neighbour, I notice you never reply. I do not mind. I only write so that it is written down. Kind regards.',true),
  letter('vane.l.reply','quiet-yearly-reply','Dear Neighbour, you did reply after all. A boy has delivered a drawing of my tower on fire. It is very good. I have had it framed. Kind regards.',true),
]);

export function validateVaneLetters(letters=VANE_LETTERS) {
  if (!Array.isArray(letters) || letters.length<30) throw new TypeError('Mrs Vane needs at least thirty letters.');
  const ids=new Set();
  for (const item of letters) {
    if (!item || typeof item.id!=='string' || ids.has(item.id) || typeof item.condition!=='string' || !item.condition || typeof item.text!=='string')
      throw new TypeError('Each Mrs Vane letter needs a unique id, condition and text.');
    ids.add(item.id);
    if (!item.text.startsWith('Dear Neighbour,') || !item.text.endsWith('Kind regards.') || item.text.length>260)
      throw new TypeError(`${item.id} must be a short, polite letter.`);
  }
  return true;
}
validateVaneLetters();
