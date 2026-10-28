// Test-only teaching packet: a ball and a fan, not the Lift and weight lesson.
export const exampleLesson = {
  id: 'lift', vocabulary: ['push'],
  wonder: {text: 'Can a fan move this ball?', animation: 'ball', seconds: 2},
  words: [{id: 'push', word: 'Push', meaning: 'A push is a force that moves something away.', animation: 'push'}],
  worked: [
    {name: 'Turn on the fan', text: 'The fan gives the ball a push.', animation: 'push', seconds: 2},
    {name: 'Watch the ball move', text: 'A bigger push moves the ball farther.', animation: 'strong', seconds: 2},
  ],
  tries: ['guided', 'prompted', 'alone'].map(support => ({
    support, prompt: 'Turn the fan handle for a bigger push.', success: 'The ball reached the mark.', seconds: 1,
    animation: 'try', controls: [{id: 'turn', label: 'Turn the fan handle', value: 1}],
    prediction: {text: 'Where will the ball go?', correct: 'far', answers: [
      {id: 'near', label: 'Near the fan', picture: 'near', animation: 'ball'},
      {id: 'far', label: 'To the mark', picture: 'far', animation: 'strong'},
    ]},
  })),
  checks: [0, 1].map(() => ({text: 'Which ball had the bigger push?', correct: 'far', answers: [
    {id: 'near', label: 'Near the fan', picture: 'near', animation: 'ball'},
    {id: 'far', label: 'To the mark', picture: 'far', animation: 'strong'},
  ]})),
  challenge: {text: 'A bigger push moves the ball farther.'},
  hints: {short: {what: 'The ball stopped before the mark. Turn the handle for a bigger push.',
    plainer: 'Turn the fan handle once, then run it again.', worked: 'Watch me turn the handle. Then you do it.'}},
};

function drawing(time, power) {
  const x = Math.min(2, time * power);
  return {
    objects: [{id: 'ball', shape: 'sphere', colour: '#edc557', position: [x - 1, 1.8, 1], size: [.6, .6, .6]},
      {id: 'handle', control: 'turn', position: [-1.8, 1.2, 1.7], size: [.15, .6, .15], rotation: [0, 0, power > 1 ? -.7 : .7], colour: '#56d683'},
      {id: 'mark', position: [1.4, 1.45, 1], size: [.08, .1, 1], colour: '#f5f0dc'}],
    forces: [{kind: 'push', newtons: power * 200, direction: [1, 0, 0], origin: [x - 1, 2.3, 1]}], metresPerNewton: .003,
    streams: [{medium: 'air', origin: [-2, 1.8, 1], direction: [1, 0, 0], speed: power * 2, length: 4}],
    graph: {xLabel: 'Time in seconds', yLabel: 'Distance in metres', maxX: 2, maxY: 2,
      points: Array.from({length: 41}, (_, i) => [i / 20, Math.min(2, i / 20 * power)])},
  };
}
function picture(far) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#35443f'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#afc1b1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(15, h - 24); ctx.lineTo(w - 15, h - 24); ctx.stroke();
    ctx.fillStyle = '#819b9b'; ctx.fillRect(20, 22, 38, 65);
    ctx.fillStyle = '#edc557'; ctx.beginPath(); ctx.arc(far ? w - 45 : 90, h - 44, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#f5f0dc'; ctx.strokeRect(w - 67, h - 68, 44, 44);
    ctx.strokeStyle = '#56d683'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(65, 32); ctx.lineTo(far ? 195 : 100, 32); ctx.stroke();
  };
}
export const exampleHooks = {
  animations: {ball: ({time}) => drawing(time, .2), push: ({time}) => drawing(time, 1),
    strong: ({time}) => drawing(time, 2), try: ({time, input}) => drawing(time, input.turn ? 2 : .2)},
  pictures: {near: picture(false), far: picture(true)},
  evaluate: ({input, prediction}) => ({passed: input.turn === 1 && prediction === 'far', actual: input.turn ? 'far' : 'near', failure: 'short'}),
};
