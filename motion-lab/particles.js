(function () {
  'use strict';
  // HTML owns the settled scene. Canvas choreographs a visible light-to-content handoff;
  // input, focus, disclosure and scrolling never rebuild a screenshot of the page.
  const stage = document.getElementById('stage');
  const canvas = document.createElement('canvas');
  canvas.className = 'particle-canvas'; canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx || !stage) return;
  const buffer = document.createElement('canvas');
  const sample = buffer.getContext('2d', { willReadFrequently: true });
  const sprites = new Map(), posterCache = new Map();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const profiling = new URLSearchParams(location.search).has('motion-profile');
  let width = 0, height = 0, generation = 0, raf = 0, active = null, failed = false;
  let points = [], prepared = null, sceneAnimation = null, skyAnimation = null, finishArtwork = null, buildCount = 0;
  let quality = 1;
  const off = () => reduce.matches || document.documentElement.classList.contains('motion-paused');
  const random = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = n => { const t = clamp(n); return t * t * (3 - 2 * t); };
  const skyBusy = busy => { window.MovieHunterStarfield?.setForegroundBusy?.(busy); };

  function spriteFor(r, g, b) {
    const color = [r, g, b].map(v => Math.min(255, Math.round(v / 51) * 51)).join(',');
    if (sprites.has(color)) return sprites.get(color);
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 24;
    const c = sprite.getContext('2d'), glow = c.createRadialGradient(12, 12, 0, 12, 12, 12);
    glow.addColorStop(0, 'rgba(' + color + ',1)');
    glow.addColorStop(.045, 'rgba(239,248,252,.9)');
    glow.addColorStop(.14, 'rgba(' + color + ',.52)');
    glow.addColorStop(.38, 'rgba(' + color + ',.07)');
    glow.addColorStop(1, 'rgba(' + color + ',0)');
    c.fillStyle = glow; c.fillRect(0, 0, 24, 24);
    sprites.set(color, sprite); return sprite;
  }

  function visible(element) {
    if (element.closest('dialog,[hidden]')) return false;
    let disclosure = element.closest('details:not([open])');
    while (disclosure) {
      const summary = [...disclosure.children].find(child => child.tagName === 'SUMMARY');
      if (!summary?.contains(element)) return false;
      disclosure = disclosure.parentElement?.closest('details:not([open])');
    }
    const r = element.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < height && r.right > 0 && r.left < width;
  }

  function sizeCanvas() {
    width = document.documentElement.clientWidth; height = innerHeight;
    // Transient light tolerates a lower pixel ratio; native text stays full fidelity.
    const dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1800000 / (width * height)));
    const w = Math.round(width * dpr), h = Math.round(height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addPoint(x, y, color, seed, kind, delay) {
    const depth = .18 + random(seed * 431) ** 1.4 * .82;
    const near = seed > .975;
    const nx = x / width, ny = y / height;
    // Neighboring points belong to the same curved current. A little independent
    // depth breaks up the surface without turning it into unrelated random noise.
    const field = Math.sin(nx * 5.2 + ny * 2.1) + Math.cos(ny * 4.3 - nx * 1.6) * .65;
    const angle = field * 1.8 + (random(seed * 67) - .5) * .65;
    const travel = Math.min(width * .29, 210) * (.32 + depth * .76);
    const curl = Math.sin(nx * 4.1 - ny * 3.8) * (22 + depth * 46);
    const dx = Math.cos(angle) * travel, dy = Math.sin(angle) * travel * .66;
    const tint = kind === 'poster' ? color : seed < .28 ? [160,218,226] : [209,229,241];
    points.push({ x, y, sprite: spriteFor(...tint), depth, near, dx, dy,
      // Cubic paths meet the original glyph/image exactly at their end. Control
      // points carry the point cloud around gentle eddies, with no global sweep.
      c1x: dx * .2 - Math.sin(angle) * curl,
      c1y: dy * .2 + Math.cos(angle) * curl,
      c2x: dx * .72 - Math.sin(angle) * curl * .55,
      c2y: dy * .72 + Math.cos(angle) * curl * .55,
      size: near ? 9 + depth * 4 : kind === 'poster' ? 4.2 + depth * 3.8 : 2.8 + depth * 2.4,
      alpha: near ? .16 : .46 + seed * .37,
      phase: random(seed * 73) * Math.PI * 2,
      delay: delay + (.5 + .5 * Math.sin(nx * 3.4 + ny * 2.7)) * .04 + random(seed * 109) * .075 });
  }

  function sampleText(element, budget, order) {
    if (!visible(element)) return;
    const rect = element.getBoundingClientRect(), style = getComputedStyle(element);
    if (style.visibility === 'hidden' || Number(style.opacity) === 0) return;
    const text = element.textContent.trim(); if (!text) return;
    const fontSize = parseFloat(style.fontSize), resolution = Math.min(1, 360 / rect.width);
    buffer.width = Math.max(1, Math.ceil(rect.width * resolution));
    buffer.height = Math.max(1, Math.ceil(rect.height * resolution));
    sample.setTransform(resolution, 0, 0, resolution, 0, 0);
    sample.font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    sample.fillStyle = style.color; sample.textBaseline = 'middle';
    if ('letterSpacing' in sample) sample.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.5;
    const lines = [];
    // Split only prominent, short labels; no per-character DOM layout reads.
    if (sample.measureText(text).width <= rect.width + 1) lines.push(text);
    else {
      const tokens = /\s/.test(text) ? text.split(/(?<=\s)/) : Array.from(text);
      let line = '';
      for (const token of tokens) {
        if (line && sample.measureText(line + token).width > rect.width) { lines.push(line); line = token.trimStart(); }
        else line += token;
      }
      if (line) lines.push(line);
    }
    lines.forEach((line, i) => {
      const lineWidth = sample.measureText(line).width;
      const x = style.textAlign === 'center' ? (rect.width - lineWidth) / 2 : style.textAlign === 'right' ? rect.width - lineWidth : 0;
      sample.fillText(line, x, lineHeight * (i + .5));
    });
    const data = sample.getImageData(0, 0, buffer.width, buffer.height).data;
    const candidates = [];
    const step = fontSize > 26 ? 2 : 1.5;
    for (let y = 1; y < buffer.height; y += step) for (let x = 1; x < buffer.width; x += step) {
      const i = (Math.floor(y) * buffer.width + Math.floor(x)) * 4;
      if (data[i+3] > 100) candidates.push([x, y, data[i], data[i+1], data[i+2]]);
    }
    const count = Math.min(candidates.length, budget), stride = candidates.length / Math.max(1, count);
    for (let i = 0; i < count; i++) {
      const p = candidates[Math.floor(i * stride)], seed = random(i + order * 179);
      // Subpixel jitter removes the sampling lattice, while staying inside the
      // letter stroke at the final handoff to native text.
      addPoint(rect.left + (p[0] + (random(i + 791) - .5) * .65) / resolution,
        rect.top + (p[1] + (random(i + 449) - .5) * .65) / resolution,
        p.slice(2), seed, 'text', Math.min(order * .012, .085));
    }
  }

  function samplePoster(img, budget) {
    if (!visible(img) || !img.complete || !img.naturalWidth) return;
    const rect = img.getBoundingClientRect(), key = img.currentSrc || img.src;
    let texture = posterCache.get(key);
    if (!texture) {
      // A tiny texture bounds readback work before any point objects are created.
      const sw = 48, sh = 72;
      buffer.width = sw; buffer.height = sh;
      const scale = Math.max(sw / img.naturalWidth, sh / img.naturalHeight);
      sample.drawImage(img, (sw - img.naturalWidth * scale) / 2, (sh - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      try { texture = sample.getImageData(0, 0, sw, sh).data; } catch (_) { return; }
      posterCache.set(key, texture);
      if (posterCache.size > 12) posterCache.delete(posterCache.keys().next().value);
    }
    const stride = 48 * 72 / budget;
    for (let n = 0; n < budget; n++) {
      const pixel = Math.min(3455, Math.floor((n + random(n) * .8) * stride)), i = pixel * 4;
      if (texture[i+3] < 120 || Math.max(texture[i], texture[i+1], texture[i+2]) < 25) continue;
      const x = rect.left + (pixel % 48 + .2 + random(n + 13) * .6) / 48 * rect.width;
      const y = rect.top + (Math.floor(pixel / 48) + .2 + random(n + 71) * .6) / 72 * rect.height;
      if (y < 0 || y > height) continue;
      addPoint(x, y, [texture[i], texture[i+1], texture[i+2]], random(n + 1901), 'poster', .035);
    }
  }

  function prepare() {
    sizeCanvas();
    const hero = stage.querySelector('.hero-poster,.selected-poster');
    const moodInput = stage.querySelector('#lab-mood-input');
    const key = [stage.firstElementChild, width, height, scrollY, hero?.currentSrc || hero?.src, hero?.complete, hero?.naturalWidth,
      moodInput?.value, moodInput?.scrollTop, moodInput?.scrollLeft];
    if (prepared && key.every((value, i) => value === prepared[i])) return;
    const start = performance.now(); points = [];
    const budget = Math.round((width < 650 ? 1100 : 1800) * quality);
    const hasHero = hero && visible(hero);
    const inputPoints = moodInput?.value ? (window.MovieHunterInputStardust?.snapshot?.() || []).slice(0, Math.floor(budget * .24)) : [];
    const selectors = stage.querySelector('.mood-panel') ? '.mood-panel h1 span' : 'h1,.film-title,.option-label';
    const labels = [...stage.querySelectorAll(selectors)].filter(visible).slice(0, 12);
    const textBudget = Math.floor(hasHero ? budget * .35 : budget) - inputPoints.length;
    // Give the headline enough stars to become legible before the native text
    // appears, even when a question has eight smaller options below it.
    const weights = labels.map(el => parseFloat(getComputedStyle(el).fontSize) > 26 ? 4 : 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    labels.forEach((el, index) => sampleText(el, Math.floor(textBudget * weights[index] / totalWeight), index));
    inputPoints.forEach((point, index) => addPoint(point.x, point.y, [209,229,241], random(index + 8827), 'text', .07));
    if (hasHero) samplePoster(hero, Math.floor(budget * .65));
    prepared = key;
    const ms = +(performance.now() - start).toFixed(1);
    canvas.dataset.pointCount = String(points.length); canvas.dataset.buildMs = String(ms); canvas.dataset.buildCount = String(++buildCount);
    if (profiling) document.dispatchEvent(new CustomEvent('movie-hunter:build', { detail: { ms } }));
  }

  function clearScene() {
    if (sceneAnimation) { sceneAnimation.cancel(); sceneAnimation = null; }
    if (skyAnimation) { skyAnimation.cancel(); skyAnimation = null; }
    stage.style.removeProperty('opacity'); stage.style.removeProperty('will-change');
    ctx.clearRect(0, 0, width, height);
  }

  function settle(show = true) {
    if (finishArtwork) finishArtwork();
    if (raf) cancelAnimationFrame(raf); raf = 0;
    const done = active; active = null;
    if (sceneAnimation) { sceneAnimation.cancel(); sceneAnimation = null; }
    if (skyAnimation) { skyAnimation.cancel(); skyAnimation = null; }
    stage.style.opacity = show ? '' : '0'; stage.style.removeProperty('will-change');
    ctx.clearRect(0, 0, width, height);
    canvas.dataset.running = 'false';
    if (done) done.resolve();
  }

  function paint(time) {
    raf = 0;
    if (!active || failed) return;
    if (document.hidden || off()) { settle(true); skyBusy(false); return; }
    const started = performance.now(), animation = active;
    const progress = clamp((time - animation.start) / animation.duration), leaving = animation.type === 'leave';
    ctx.clearRect(0, 0, width, height);
    // The formation stays on screen before clear content takes over. Fading the
    // DOM from frame one would erase this moment, regardless of the particle count.
    const visibility = leaving ? smooth(progress / .2) * (1 - smooth((progress - .45) / .55)) : smooth(progress / .15) * (1 - smooth((progress - .67) / .33));
    ctx.globalCompositeOperation = 'lighter';
    for (const p of points) {
      const local = clamp((progress - p.delay) / (leaving ? .83 : .68));
      const scatter = leaving ? smooth(local) : 1 - smooth(local);
      const rest = 1 - scatter;
      const b1 = 3 * rest * rest * scatter, b2 = 3 * rest * scatter * scatter, b3 = scatter ** 3;
      const direction = leaving ? 1 : -1;
      const tide = Math.sin(progress * Math.PI) * scatter * (2 + p.depth * 5);
      const x = p.x + direction * (b1 * p.c1x + b2 * p.c2x + b3 * p.dx) + Math.sin(progress * 2.2 + p.phase) * tide;
      const y = p.y + direction * (b1 * p.c1y + b2 * p.c2y + b3 * p.dy) + Math.cos(progress * 1.8 + p.phase) * tide * .65;
      const size = p.size * (1 + scatter * (p.near ? .65 : .2));
      // A few defocused foreground specks dissolve before the content resolves.
      // No streaks or frame-to-frame random jitter: light drifts with the volume.
      ctx.globalAlpha = p.alpha * visibility * (p.near ? .3 + scatter * .7 : 1);
      ctx.drawImage(p.sprite, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (!sceneAnimation) stage.style.opacity = String(leaving ? 1 - smooth(progress / .48) : smooth((progress - .52) / .42));
    const elapsed = performance.now() - started;
    canvas.dataset.paintMs = elapsed.toFixed(1);
    // Adapt the next transition, never visibly remove points in the current one.
    if (elapsed > 12) animation.slowFrames++;
    if (progress >= 1) {
      if (animation.slowFrames > 4 && quality > .5) { quality *= .8; prepared = null; }
      settle(!leaving);
    } else raf = requestAnimationFrame(tick);
  }

  function tick(time) {
    try { paint(time); } catch (_) { failSafe(); }
  }

  function animate(type, duration, motionOff) {
    settle(true);
    if (failed || motionOff || off() || document.hidden) return Promise.resolve();
    prepare();
    skyBusy(true);
    stage.style.willChange = 'opacity';
    if (typeof stage.animate === 'function') {
      const keyframes = type === 'leave'
        ? [{opacity:1,offset:0},{opacity:.6,offset:.2},{opacity:0,offset:.48},{opacity:0,offset:1}]
        : [{opacity:0,offset:0},{opacity:0,offset:.52},{opacity:.15,offset:.66},{opacity:.8,offset:.86},{opacity:1,offset:.96},{opacity:1,offset:1}];
      sceneAnimation = stage.animate(keyframes, {duration,easing:'linear',fill:'both'});
    }
    // Keep the cached sky gently breathing on the compositor while its expensive
    // Canvas loop is paused. This changes neither geometry nor input coordinates.
    const sky = document.getElementById('starfield');
    if (sky?.animate) skyAnimation = sky.animate([{opacity:1},{opacity:.94,offset:.38},{opacity:1}], {duration,easing:'ease-in-out'});
    return new Promise(resolve => {
      active = {type,duration,resolve,start:performance.now(),slowFrames:0};
      canvas.dataset.running = 'true'; raf = requestAnimationFrame(tick);
    });
  }

  async function enter(options = {}) {
    if (failed) return;
    if (finishArtwork) finishArtwork();
    const token = ++generation;
    try {
      const hero = stage.querySelector('.hero-poster,.selected-poster');
      if (hero && !hero.complete && !options.motionOff && !off() && !document.hidden && typeof hero.addEventListener === 'function') {
        // A newly inserted <img> has not necessarily loaded when render() returns.
        // Give local artwork a bounded window so the first entrance includes its
        // colors, not just the title. Slow/broken artwork never blocks navigation.
        await new Promise(resolve => {
          const done = () => { clearTimeout(timeout); hero.removeEventListener('load', done); hero.removeEventListener('error', done); if (finishArtwork === done) finishArtwork = null; resolve(); };
          const timeout = setTimeout(done, 180);
          finishArtwork = done;
          hero.addEventListener('load', done, {once:true});
          hero.addEventListener('error', done, {once:true});
        });
        if (token !== generation || failed) return;
      }
      window.MovieHunterStarfield?.pulse('enter');
      await animate('enter', options.keepPosition ? 1240 : 1440, options.motionOff);
    } catch (_) { failSafe(); }
    finally { if (token === generation) { clearScene(); skyBusy(false); } }
  }

  async function leave(options = {}) {
    if (failed) return;
    if (finishArtwork) finishArtwork();
    const token = ++generation;
    try {
      window.MovieHunterStarfield?.pulse('leave');
      await animate('leave', options.keepPosition ? 460 : 580, options.motionOff);
      if (token === generation && !failed) stage.style.opacity = '0';
    } catch (_) { failSafe(); }
  }

  function failSafe() {
    failed = true; ++generation; prepared = null;
    settle(true); clearScene(); skyBusy(false);
    delete window.MovieHunterParticles;
  }

  function interrupt() {
    if (failed) return;
    ++generation; prepared = null; settle(true); skyBusy(false);
  }

  window.MovieHunterParticles = {leave,enter,failSafe};
  new MutationObserver(() => { if (off()) interrupt(); }).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  addEventListener('resize', interrupt, {passive:true});
  // Native scrolling and disclosures are now always native pixels. Invalidate only
  // lightweight future samples, with no Canvas/DOM work at the interaction boundary.
  document.addEventListener('toggle', event => { if (event.target.matches?.('#stage details')) prepared = null; }, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  reduce.addEventListener('change', interrupt);
  requestAnimationFrame(() => enter({motionOff:off()}));
}());
