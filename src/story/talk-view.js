// The scene rule hands this view a public page and accepts input for that exact page.
// Camera and projection are supplied by the existing world renderer.
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const speakerName = id => id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

// A retired figure still owns its skeleton. Follow the anchor only while its
// entire parent chain is visible and connected to this scene.
export function createTalkSpeakerLookup(scene) {
  let lastId = null, anchor = null, nextLookup = 0;
  function onStage(node) {
    for (let part = node; part && part.visible; part = part.parent) if (part === scene) return true;
    return false;
  }
  return (id, now) => {
    if (id !== lastId || anchor && !onStage(anchor)) {
      lastId = id;
      anchor = null;
      nextLookup = 0;
    }
    if (id && !anchor && now >= nextLookup) {
      const candidate = scene.getObjectByName('story-bubble-' + id);
      anchor = onStage(candidate) ? candidate : null;
      nextLookup = now + 200;
    }
    return anchor;
  };
}

export function talkCameraPose(player, head, onFoot) {
  const dx = head.x - player.x, dz = head.z - player.z;
  const distance = Math.hypot(dx, dz);
  const ux = distance ? dx / distance : 0, uz = distance ? dz / distance : 1;
  const back = onFoot ? 1.65 : 4.8, side = onFoot ? .85 : 1.9;
  return {position: {x: player.x - ux * back + uz * side, y: player.y + (onFoot ? 1.85 : 2.55),
    z: player.z - uz * back - ux * side}, target: {x: head.x, y: head.y - .18, z: head.z}};
}

// Keep the bubble on-screen while the tail still points to the head. At the
// very top of the picture there is more room beneath the speaker.
export function speechPlacement(point, width, height, bubbleWidth, bubbleHeight) {
  const gap = 16, margin = 10;
  const x = clamp(point.x, margin, width - margin), y = clamp(point.y, margin, height - margin);
  const left = clamp(x - bubbleWidth * .43, margin, width - bubbleWidth - margin);
  const below = y < bubbleHeight + gap + margin;
  const top = clamp(below ? y + gap : y - bubbleHeight - gap, margin, height - bubbleHeight - margin);
  return {left, top, below, tail: clamp(x - left, 4, bubbleWidth - 4)};
}

export function mountTalkView(stage, send) {
  const doc = stage.ownerDocument, win = doc.defaultView;
  const create = (tag, cls, words) => {
    const node = doc.createElement(tag);
    node.className = cls;
    if (words != null) node.textContent = words;
    return node;
  };
  const root = create('section', 'story-talk');
  root.setAttribute('aria-label', 'Conversation');
  root.tabIndex = -1;
  root.hidden = true;
  const speech = create('button', 'story-speech'), spokenBy = create('b', 'story-speaker'), words = create('span', 'story-words');
  speech.type = 'button';
  speech.setAttribute('aria-live', 'polite');
  speech.append(spokenBy, words);
  const thoughts = create('div', 'story-thoughts'), options = create('div', 'story-options');
  thoughts.setAttribute('aria-live', 'polite');
  const hint = create('p', 'story-inner-voice'), stocks = create('div', 'story-stocks');
  const controls = create('nav', 'story-talk-controls');
  const next = create('button', '', 'Continue'), recall = create('button', '', 'Recall lines · R');
  next.type = recall.type = 'button';
  const history = create('ol', 'story-recall');
  history.hidden = true;
  recall.setAttribute('aria-expanded', 'false');
  controls.append(next, recall);
  root.append(speech, thoughts, options, hint, stocks, controls, history);
  let current = null, held = -1, selected = -1, restoreFocus = null;
  const stockCounters = new Map();

  function preview(index) {
    const option = current?.options[index];
    if (selected >= 0) options.children[selected]?.classList.remove('weighing');
    selected = option ? index : -1;
    if (selected >= 0) options.children[selected]?.classList.add('weighing');
    hint.textContent = option?.thought ?? '';
    hint.hidden = !option?.thought;
    for (const [stock, counter] of stockCounters) {
      const plain = option?.plain?.stock === stock ? option.plain : null;
      counter.value.textContent = String(plain?.after ?? counter.before);
      counter.node.classList.toggle('is-changing', !!plain && plain.before !== plain.after);
    }
  }
  function choose(index) {
    if (current?.options[index]) send({type: 'select', index}, current);
  }
  function advance() {
    if (current && history.hidden && current.phase !== 'options') send({type: 'advance'}, current);
  }
  function toggleHistory() {
    history.hidden = !history.hidden;
    recall.setAttribute('aria-expanded', String(!history.hidden));
    root.classList.toggle('recalling', !history.hidden);
    recall.textContent = history.hidden ? 'Recall lines · R' : 'Back to conversation · R';
    if (!history.hidden) {
      preview(-1);
      held = -1;
      history.scrollTop = history.scrollHeight;
    }
  }
  function key(event) {
    if (!current || event.ctrlKey || event.metaKey || event.altKey) return;
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(event.code);
    const index = digit ? (Number(digit[1]) || 10) - 1 : -1;
    if (event.type === 'keyup') {
      if (index >= 0 && held === index && history.hidden) {
        held = -1;
        choose(index);
      }
      // The app's keyup clears drive/walk keys even when they were held before the conversation.
      return;
    }
    if (event.code === 'Escape' && history.hidden) return;
    if (event.code === 'Tab') {
      // Keep native Tab and Shift+Tab within the conversation.
      const buttons = history.hidden ? [...root.querySelectorAll('button')].filter(el => !el.disabled && el.offsetParent !== null) : [recall];
      const index = buttons.indexOf(doc.activeElement);
      if (buttons.length) {
        event.preventDefault();
        buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
      event.stopImmediatePropagation();
      return;
    }
    event.stopImmediatePropagation();
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'KeyR' || event.code === 'Escape' && !history.hidden) return toggleHistory();
    if (!history.hidden) {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(event.code)) {
        const dy = event.code.startsWith('Page') ? history.clientHeight * .8 : 50;
        history.scrollTop += event.code.endsWith('Up') ? -dy : dy;
      }
      if (['Enter', 'Space'].includes(event.code) && doc.activeElement === recall) toggleHistory();
      return;
    }
    if (event.code === 'Enter' || event.code === 'Space') {
      if (doc.activeElement === recall) toggleHistory();
      else if (current.phase === 'options') {
        const focused = [...options.children].indexOf(doc.activeElement);
        if (focused >= 0) choose(focused);
      } else advance();
      return;
    }
    if (current.options[index]) {
      held = index;
      preview(index);
    }
  }
  function clearHeld() {
    held = -1;
    if (current) preview(-1);
  }
  const events = new AbortController();
  const capture = {capture: true, signal: events.signal};
  win.addEventListener('keydown', key, capture);
  win.addEventListener('keyup', key, capture);
  win.addEventListener('blur', clearHeld, capture);
  next.addEventListener('click', advance);
  speech.addEventListener('click', advance);
  thoughts.addEventListener('click', advance);
  recall.addEventListener('click', toggleHistory);
  function draw(page) {
    held = selected = -1;
    history.hidden = true;
    recall.setAttribute('aria-expanded', 'false');
    recall.textContent = 'Recall lines · R';
    root.classList.remove('recalling');
    root.dataset.phase = page.phase;
    speech.hidden = !page.line;
    speech.classList.toggle('radio', page.line?.radio === true);
    speech.classList.toggle('low', page.line?.low === true);
    if (page.line) {
      spokenBy.textContent = (page.line.radio ? 'Radio · ' : '') + speakerName(page.line.speaker);
      words.textContent = page.line.words;
    }
    next.hidden = page.phase === 'options';
    recall.disabled = !page.history.length;
    thoughts.replaceChildren(...page.thoughts.map(text => create('p', 'story-cloud', text)));
    history.replaceChildren(...page.history.map(line => {
      const li = create('li', '');
      li.append(create('b', '', speakerName(line.speaker)), doc.createTextNode(' ' + line.words));
      return li;
    }));
    options.replaceChildren(...page.options.map((option, index) => {
      const button = create('button', 'story-cloud');
      button.type = 'button';
      const shortcut = index < 10 ? String((index + 1) % 10) + ' · ' : '';
      button.append(create('small', '', shortcut + (option.kind === 'ask' ? 'Ask' : 'Say')), doc.createTextNode(option.words));
      button.addEventListener('click', () => choose(index));
      for (const name of ['pointerenter', 'focus']) button.addEventListener(name, () => { if (held < 0) preview(index); });
      for (const name of ['pointerleave', 'blur']) button.addEventListener(name, () => { if (held < 0 && selected === index) preview(-1); });
      return button;
    }));
    stocks.replaceChildren();
    stockCounters.clear();
    const amounts = {...page.stocks};
    for (const option of page.options) if (option.plain) amounts[option.plain.stock] ??= option.plain.before;
    for (const [stock, before] of Object.entries(amounts)) {
      const node = create('div', 'story-stock'), value = create('strong', '', String(before));
      node.append(create('small', '', stock), value);
      node.dataset.stock = stock;
      stocks.append(node);
      stockCounters.set(stock, {node, value, before});
    }
    preview(-1);
  }
  function update(page, point) {
    if (page !== current) {
      const opening = !current;
      current = page;
      root.hidden = !page;
      stage.classList.toggle('in-story-talk', !!page);
      if (!page) {
        if (root.contains(doc.activeElement) && restoreFocus?.isConnected) restoreFocus.focus({preventScroll: true});
        restoreFocus = null;
        return;
      }
      if (opening) {
        stage.append(root);
        restoreFocus = doc.activeElement;
        if (doc.pointerLockElement) doc.exitPointerLock();
        root.focus({preventScroll: true});
      }
      draw(page);
    }
    if (!page?.line || page.line.radio) return;
    const w = root.clientWidth, h = root.clientHeight;
    const at = point ?? {x: .5, y: .5};
    const pos = speechPlacement({x: at.x * w, y: at.y * h}, w, h, speech.offsetWidth, speech.offsetHeight);
    speech.style.left = pos.left + 'px';
    speech.style.top = pos.top + 'px';
    speech.style.setProperty('--tail', pos.tail + 'px');
    speech.classList.toggle('below', pos.below);
  }
  return {update, dispose() {
    if (current) update(null);
    events.abort();
    root.remove();
  }};
}
