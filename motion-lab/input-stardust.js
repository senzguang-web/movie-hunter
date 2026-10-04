(function () {
  'use strict';
  // The textarea remains the only editor. This short-lived light layer never
  // changes its value, focus, selection, caret, or native text visibility.
  const stage = document.getElementById('stage');
  if (!stage || !document.createRange || typeof matchMedia !== 'function') return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const states = new WeakMap();
  const canvas = document.createElement('canvas');
  canvas.className = 'input-stardust-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, { position: 'fixed', pointerEvents: 'none', zIndex: '4', display: 'none' });
  const ctx = canvas.getContext('2d', { alpha: true });
  const buffer = document.createElement('canvas');
  const sample = buffer.getContext('2d', { willReadFrequently: true });
  if (!ctx || !sample) return;
  const mirror = document.createElement('div');
  mirror.setAttribute('aria-hidden', 'true');
  Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', pointerEvents: 'none', margin: '0', border: '0', height: 'auto', overflow: 'visible', boxSizing: 'border-box', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' });
  document.body.appendChild(canvas);
  document.body.appendChild(mirror);
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  let raf = 0, points = [], currentInput = null, box = null, compositionTimer = 0, failed = false, builds = 0;
  const sprites = [];
  const smooth = n => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
  const random = n => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };
  const off = () => failed || document.hidden || reduce.matches || document.documentElement.classList.contains('motion-paused') || stage.getAttribute('aria-busy') === 'true' || stage.classList.contains('is-leaving');
  const isMood = target => target?.id === 'lab-mood-input';
  const stateFor = input => {
    if (!states.has(input)) states.set(input, { value: input.value, composing: false, pending: false });
    return states.get(input);
  };

  function clear() {
    if (raf) cancelAnimationFrame(raf);
    if (compositionTimer) clearTimeout(compositionTimer);
    if (currentInput) stateFor(currentInput).pending = false;
    raf = 0; compositionTimer = 0; points = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none'; canvas.dataset.running = 'false'; canvas.dataset.pointCount = '0';
    mirror.textContent = '';
  }

  function failSafe() { clear(); failed = true; }

  function spriteFor(index) {
    if (sprites[index]) return sprites[index];
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 20;
    const c = sprite.getContext('2d');
    const color = index ? '209,229,241' : '160,218,226';
    const glow = c.createRadialGradient(10, 10, 0, 10, 10, 10);
    glow.addColorStop(0, 'rgba(239,248,252,.9)');
    glow.addColorStop(.14, 'rgba(' + color + ',.6)');
    glow.addColorStop(.4, 'rgba(' + color + ',.09)');
    glow.addColorStop(1, 'rgba(' + color + ',0)');
    c.fillStyle = glow; c.fillRect(0, 0, 20, 20);
    sprites[index] = sprite; return sprite;
  }

  function changedRange(before, after) {
    let start = 0, tail = 0;
    while (start < before.length && start < after.length && before[start] === after[start]) start++;
    while (tail < before.length - start && tail < after.length - start && before[before.length - tail - 1] === after[after.length - tail - 1]) tail++;
    return { start, end: after.length - tail, append: start === before.length && !tail };
  }

  function glyphs(value) {
    if (segmenter) return Array.from(segmenter.segment(value), item => ({ text: item.segment, start: item.index, end: item.index + item.segment.length }));
    let index = 0;
    return Array.from(value, text => { const start = index; index += text.length; return { text, start, end: index }; });
  }

  function layout(input, overlay) {
    const rect = input.getBoundingClientRect(), style = getComputedStyle(input);
    const borderLeft = parseFloat(style.borderLeftWidth) || 0, borderTop = parseFloat(style.borderTopWidth) || 0;
    const visible = { left: rect.left + borderLeft, top: rect.top + borderTop, right: rect.left + borderLeft + input.clientWidth, bottom: rect.top + borderTop + input.clientHeight };
    const next = { left: rect.left - 36, top: rect.top - 36, width: rect.width + 72, height: rect.height + 72 };
    if (overlay) {
      if (box && (box.left !== next.left || box.top !== next.top || box.width !== next.width || box.height !== next.height)) points = [];
      box = next;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(box.width * dpr)); canvas.height = Math.max(1, Math.round(box.height * dpr));
      Object.assign(canvas.style, { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px', display: 'block' });
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const copied = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariant', 'lineHeight', 'letterSpacing', 'wordSpacing', 'textAlign', 'textIndent', 'textTransform', 'direction', 'tabSize', 'wordBreak', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
    copied.forEach(key => { mirror.style[key] = style[key]; });
    mirror.style.left = (visible.left - input.scrollLeft) + 'px';
    mirror.style.top = (visible.top - input.scrollTop) + 'px';
    mirror.style.width = input.clientWidth + 'px';
    mirror.textContent = input.value;
    return { style, visible };
  }

  function build(input, change, snapshotOnly = false) {
    const { style, visible } = layout(input, !snapshotOnly);
    const range = document.createRange(), node = mirror.firstChild;
    const candidates = [], captured = [];
    // DOM ranges use the browser's real wrapping and font shaping. Limit sampling
    // to visible, newly committed graphemes, even when a long passage is pasted.
    for (const glyph of glyphs(input.value)) {
      if (glyph.end <= change.start || glyph.start >= change.end || !glyph.text.trim()) continue;
      range.setStart(node, glyph.start); range.setEnd(node, glyph.end);
      const rect = range.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.right <= visible.left || rect.left >= visible.right || rect.bottom <= visible.top || rect.top >= visible.bottom || rect.bottom <= 0 || rect.top >= innerHeight) continue;
      candidates.push({ ...glyph, rect });
    }
    const budget = document.documentElement.clientWidth < 650 ? 260 : 420;
    const count = Math.min(candidates.length, 32), start = performance.now();
    const perGlyph = Math.min(70, Math.floor(budget / Math.max(1, count)));
    for (let i = 0; i < count; i++) {
      const glyph = candidates[Math.floor(i * candidates.length / count)], rect = glyph.rect;
      buffer.width = Math.max(1, Math.min(96, Math.ceil(rect.width))); buffer.height = Math.max(1, Math.min(64, Math.ceil(rect.height)));
      sample.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
      sample.fillStyle = '#d1e5f1'; sample.textBaseline = 'alphabetic'; sample.textAlign = 'left';
      if ('direction' in sample) sample.direction = style.direction;
      if ('letterSpacing' in sample) sample.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      const metrics = sample.measureText(glyph.text), fontSize = parseFloat(style.fontSize) || 14;
      const ascent = metrics.fontBoundingBoxAscent || fontSize * .8, descent = metrics.fontBoundingBoxDescent || fontSize * .2;
      sample.fillText(glyph.text, 0, (buffer.height - ascent - descent) / 2 + ascent);
      const data = sample.getImageData(0, 0, buffer.width, buffer.height).data, pixels = [];
      for (let y = 0; y < buffer.height; y += 1.5) for (let x = 0; x < buffer.width; x += 1.5) {
        if (data[(Math.floor(y) * buffer.width + Math.floor(x)) * 4 + 3] > 95) pixels.push([x, y]);
      }
      const limit = Math.min(pixels.length, perGlyph);
      for (let j = 0; j < limit; j++) {
        const pixel = pixels[Math.floor(j * pixels.length / limit)];
        const x = rect.left + pixel[0], y = rect.top + pixel[1];
        if (x < visible.left || x > visible.right || y < visible.top || y > visible.bottom) continue;
        if (snapshotOnly) { captured.push({ x, y }); continue; }
        const seed = random(j + glyph.start * 97 + builds * 31), depth = .3 + random(seed * 431) * .7;
        const angle = Math.sin(x * .025 + y * .011) * 1.5 + (seed - .5) * .75;
        const distance = 14 + depth * 21, curl = Math.sin(x * .019 - y * .026) * 17;
        const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance * .75;
        points.push({ x: x - box.left, y: y - box.top, dx, dy,
          c1x: dx * .2 - Math.sin(angle) * curl, c1y: dy * .2 + Math.cos(angle) * curl,
          c2x: dx * .72 - Math.sin(angle) * curl * .55, c2y: dy * .72 + Math.cos(angle) * curl * .55,
          sprite: spriteFor(seed < .28 ? 0 : 1), size: 2.7 + depth * 1.3, alpha: .35 + seed * .24,
          start: start + i / Math.max(1, count) * 65, duration: 880 + seed * 240 });
      }
    }
    mirror.textContent = '';
    if (snapshotOnly) return captured;
    if (points.length > budget) points = points.slice(points.length - budget);
    canvas.dataset.pointCount = String(points.length); canvas.dataset.buildCount = String(++builds);
  }

  function paint(time) {
    raf = 0;
    if (off() || !currentInput?.isConnected) { clear(); return; }
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.globalCompositeOperation = 'lighter';
    points = points.filter(point => time - point.start < point.duration);
    for (const point of points) {
      const progress = Math.max(0, Math.min(1, (time - point.start) / point.duration));
      const scatter = 1 - smooth(progress), rest = 1 - scatter;
      const b1 = 3 * rest * rest * scatter, b2 = 3 * rest * scatter * scatter, b3 = scatter ** 3;
      const x = point.x + b1 * point.c1x + b2 * point.c2x + b3 * point.dx;
      const y = point.y + b1 * point.c1y + b2 * point.c2y + b3 * point.dy;
      ctx.globalAlpha = point.alpha * smooth(progress / .2) * (1 - smooth((progress - .52) / .48));
      ctx.drawImage(point.sprite, x - point.size / 2, y - point.size / 2, point.size, point.size);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (points.length) raf = requestAnimationFrame(tick); else clear();
  }

  function tick(time) { try { paint(time); } catch (_) { failSafe(); } }

  function commit(input) {
    const state = stateFor(input), before = state.value, after = input.value;
    state.value = after;
    if (before === after) return;
    const change = changedRange(before, after);
    if (!change.append || input !== currentInput) clear();
    currentInput = input;
    if (change.start === change.end || off()) { clear(); return; }
    try {
      build(input, change);
      if (points.length && !raf) { canvas.dataset.running = 'true'; raf = requestAnimationFrame(tick); }
      else if (!points.length) clear();
    } catch (_) { failSafe(); }
  }

  document.addEventListener('focusin', event => { if (isMood(event.target)) stateFor(event.target); });
  document.addEventListener('beforeinput', event => { if (isMood(event.target)) stateFor(event.target); });
  document.addEventListener('compositionstart', event => {
    if (!isMood(event.target)) return;
    clear(); currentInput = event.target;
    const state = stateFor(event.target); state.value = event.target.value; state.composing = true;
  });
  document.addEventListener('compositionend', event => {
    if (!isMood(event.target)) return;
    const input = event.target, state = stateFor(input); state.composing = false; state.pending = true;
    // Browsers put the final input on either side of compositionend. One task
    // gathers the committed value once, without animating phonetic candidates.
    compositionTimer = setTimeout(() => {
      compositionTimer = 0; state.pending = false;
      if (input.isConnected) commit(input);
    }, 0);
  });
  document.addEventListener('input', event => {
    if (!isMood(event.target)) return;
    const state = stateFor(event.target);
    if (state.composing || state.pending || event.isComposing) return;
    commit(event.target);
  });
  document.addEventListener('submit', event => { if (event.target.id === 'lab-mood-form') clear(); }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  document.addEventListener('scroll', clear, { capture: true, passive: true });
  window.addEventListener('resize', clear, { passive: true });
  reduce.addEventListener('change', () => { if (reduce.matches) clear(); });
  new MutationObserver(() => { if (off() || currentInput && !currentInput.isConnected) clear(); }).observe(stage, { childList: true, attributes: true, attributeFilter: ['class', 'aria-busy'] });
  new MutationObserver(() => { if (off()) clear(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  function snapshot() {
    const input = document.getElementById('lab-mood-input');
    if (!input?.value || !input.isConnected || failed || document.hidden || reduce.matches || document.documentElement.classList.contains('motion-paused')) return [];
    try { return build(input, { start: 0, end: input.value.length }, true); }
    catch (_) { mirror.textContent = ''; return []; }
  }

  window.MovieHunterInputStardust = { clear, snapshot };
}());
