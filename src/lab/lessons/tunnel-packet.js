// Wind-tunnel packet wiring only. Each lesson owns its words and rule verdicts.
import {FUEL_RIG} from '../benches/tunnel.js';
export function tunnelPacket(spec, drawing, mount) {
  const {bench, classify, examples} = spec;
  const results = new Map();
  const run = input => { const key = JSON.stringify(input); if (!results.has(key)) results.set(key, bench.run(input)); return results.get(key); };
  const settings = input => {
    const values = {};
    for (const c of spec.controls) if (Object.hasOwn(input, c.id)) values[c.setting ?? c.id] = input[c.id];
    return run(values);
  };
  const answers = spec.answers.map(([id, label]) => ({id, label, picture: id, animation: id}));
  const prediction = {text: spec.question, correct: classify(bench.run(examples[0])), answers};
  const tries = ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: spec.prompts[i], success: spec.success, seconds: 2, animation: 'try', controls: spec.controls,
    prediction: {...prediction, correct: classify(bench.run(examples[i]))},
  }));
  const definition = {
    id: spec.id, vocabulary: spec.words.map(w => w[0].toLowerCase()),
    wonder: {text: spec.wonder, animation: 'wonder', seconds: 3},
    words: spec.words.map(([word, meaning], i) => ({id: `${spec.id}-word-${i}`, word, meaning, animation: `word-${i}`})),
    worked: spec.worked.map(([name, text, input], i) => ({name, text, animation: `watch-${i}`, seconds: 3})),
    tries, checks: spec.checks.map(([text, inputs, correct], n) => ({text, correct: String(correct), answers: inputs.map((input, i) => ({id: String(i), label: String.fromCharCode(65 + i), picture: `check-${n}-${i}`, animation: `check-${n}-${i}`}))})),
    challenge: {text: spec.card, ...(spec.challenge ? {try: {...tries[2], prompt: spec.challenge, prediction}} : {})},
    hints: {change: {what: spec.hint, plainer: spec.plainer, worked: spec.replay}, prediction: {
      what: 'The machine did something different from your picture. Keep the setting and choose the picture that matches.',
      plainer: 'Keep the setting and look at the result before choosing again.', worked: spec.replay}},
  };
  const animations = {}, pictures = {};
  const render = (input, time, mode, context) => drawing(run(input), time, mode, context);
  animations.wonder = c => render(examples[1], c.time, 'wonder', c);
  spec.words.forEach((_, i) => { animations[`word-${i}`] = c => render(spec.wordInputs?.[i] ?? examples[0], c.time, `word-${i}`, c); });
  spec.worked.forEach((step, i) => { animations[`watch-${i}`] = c => render(step[2], c.time, 'watch', c); });
  animations.try = c => ({...drawing(settings(c.input), c.time, 'try', c), previous: c.previous ? drawing(settings(c.previous.input), Math.min(c.time, c.previous.time), 'try', c) : null});
  function addPicture(id, input) {
    const result = bench.run(input);
    animations[id] = c => drawing(result, c.time, 'answer', c);
    pictures[id] = (ctx, w, h) => spec.picture(ctx, w, h, result);
  }
  spec.answers.forEach(([id]) => addPicture(id, spec.answerInputs[id]));
  spec.checks.forEach(([, inputs], n) => inputs.forEach((input, i) => addPicture(`check-${n}-${i}`, input)));
  return {definition, hooks: {animations, pictures, mount,
    evaluate({tryIndex, input, prediction}) {
      const result = settings(input), actual = classify(result);
      const goal = spec.goal(result, tryIndex);
      const failure = goal ? 'prediction' : 'change';
      return {passed: actual === prediction && goal, actual, failure,
        hint: goal ? definition.hints.prediction : {what: spec.resultHint?.(result) ?? spec.hint, plainer: spec.plainer}};
    }}, settings};
}

// Pictures show the part and the measured result, never an answer word alone.
export function partPicture(kind, describe) {
  return (ctx, width, height, result) => {
    ctx.fillStyle = '#202a2d'; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(width * .25, height * .45);
    ctx.strokeStyle = '#aebcc0'; ctx.fillStyle = '#718185'; ctx.lineWidth = 6;
    if (kind === 'tyre' || kind === 'brake') {
      ctx.beginPath(); ctx.arc(0, 0, height * .25, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = kind === 'tyre' ? '#080c10' : '#d85c35'; ctx.lineWidth = kind === 'tyre' ? 14 : 5; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, height * .08, 0, Math.PI * 2); ctx.stroke();
    } else if (kind === 'spring') {
      ctx.beginPath(); for (let i = 0; i < 30; i++) { const x = Math.sin(i * Math.PI / 2) * 23, y = -32 + i * 2.2; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke();
    } else if (kind === 'can') {
      ctx.fillStyle = '#7c8840'; ctx.fillRect(-26, -25, 52, 60); ctx.strokeRect(-15, -38, 30, 14);
      ctx.beginPath(); ctx.moveTo(-20, -15); ctx.lineTo(20, 25); ctx.moveTo(20, -15); ctx.lineTo(-20, 25); ctx.stroke();
      ctx.fillStyle = '#151c20'; ctx.fillRect(15, -18, 7, 44);
      const fill = result.settings.litres / FUEL_RIG.tankLitres * 44;
      ctx.fillStyle = '#edc557'; ctx.fillRect(15, 26 - fill, 7, fill);
    } else {
      ctx.save();
      ctx.rotate(result.settings.wing === 'big' ? -.3 : result.settings.wing === 'small' ? -.15 : 0);
      ctx.beginPath(); ctx.moveTo(-45, 5); ctx.quadraticCurveTo(-30, -30, 45, 0); ctx.lineTo(-45, 5); ctx.fill(); ctx.stroke();
      ctx.restore();
      const push = Math.min(45, result.downforceKg * .18);
      if (push > 0) { ctx.strokeStyle = '#56d683'; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, 10 + push); ctx.lineTo(-7, 3 + push); ctx.moveTo(0, 10 + push); ctx.lineTo(7, 3 + push); ctx.stroke(); }
      const drag = Math.min(42, result.dragN * .025);
      ctx.strokeStyle = '#f0a148'; ctx.beginPath(); ctx.moveTo(-20, -30); ctx.lineTo(-20 + drag, -30); ctx.lineTo(-27 + drag, -37); ctx.moveTo(-20 + drag, -30); ctx.lineTo(-27 + drag, -23); ctx.stroke();
    }
    ctx.restore(); ctx.fillStyle = '#f5f0dc'; ctx.font = 'bold 18px sans-serif';
    describe(result).forEach((text, i) => ctx.fillText(text, width * .48, height * .3 + i * 25));
  };
}
