(function () {
  'use strict';

  if (document.getElementById('starfield')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'starfield';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none;user-select:none;background:#000;';
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return;
  document.body.prepend(canvas);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const palette = ['184,216,231', '175,220,224', '212,220,238', '235,241,247'];
  const fieldPalette = ['99,176,189', '110,191,201', '164,220,226'];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, screenX: -1000, screenY: -1000, active: false };
  let width = 0;
  let height = 0;
  let mobile = false;
  let stars = [];
  let atmosphere = [];
  let frame = 0;
  let resizeTimer = 0;
  let lastDraw = 0;
  let elapsed = 0;
  let isRunning = false;
  let foregroundBusy = false;
  let destroyed = false;
  let resizePending = false;
  let pulseAmount = 0;
  let pulseTarget = 0;
  let pulseExpires = 0;
  const twoPi = Math.PI * 2;

  // A stable seed keeps the same sky when the viewport is resized.
  function seededRandom(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function gaussian(random) {
    return Math.sqrt(-2 * Math.log(Math.max(.00001, random()))) * Math.cos(twoPi * random());
  }

  function makeSprite(color) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    const brush = sprite.getContext('2d');
    const light = brush.createRadialGradient(24, 24, 0, 24, 24, 24);
    light.addColorStop(0, 'rgba(240,247,251,.92)');
    light.addColorStop(.09, 'rgba(' + color + ',.7)');
    light.addColorStop(.24, 'rgba(' + color + ',.18)');
    light.addColorStop(.52, 'rgba(' + color + ',.015)');
    light.addColorStop(1, 'rgba(' + color + ',0)');
    brush.fillStyle = light;
    brush.fillRect(0, 0, 48, 48);
    return sprite;
  }

  const starSprites = palette.map(makeSprite);

  function buildAtmosphere(random) {
    // Fine points form a distant, uneven surface, echoing KIN's particle terrain.
    // Cache three depth planes once; moving their narrow slices follows the same
    // continuous current without repainting thousands of tiny points per frame.
    const planes = [];
    const bandHeight = height * .43;
    const resolution = Math.min(1, 1400 / width, Math.sqrt(1100000 / (width * bandHeight * 3)));
    const columns = mobile ? 8 : 12;
    for (let plane = 0; plane < 3; plane += 1) {
      const layer = document.createElement('canvas');
      layer.width = Math.ceil(width * resolution);
      layer.height = Math.ceil(bandHeight * resolution);
      const brush = layer.getContext('2d');
      brush.setTransform(resolution, 0, 0, resolution, 0, 0);
      brush.fillStyle = 'rgb(' + fieldPalette[plane] + ')';
      const count = mobile ? 1700 : 4000;
      for (let index = 0; index < count; index += 1) {
        const x = random();
        const depth = random();
        const phase = x * 9.4 + depth * 6.8 + plane * .48;
        const ridge = Math.sin(phase) * .036 + Math.sin(x * 18.2 - depth * 4.1) * .014;
        const y = .705 + depth * .16 + ridge + plane * .012 + gaussian(random) * .002;
        const edgeFade = Math.pow(Math.sin(x * Math.PI), .65);
        const crest = .4 + Math.pow(Math.cos(phase), 4) * .6;
        const size = (mobile ? .55 : .6) + depth * .52;
        brush.globalAlpha = (.22 + depth * .25) * crest * edgeFade;
        brush.fillRect(x * width, (y - .62) * height, size, size);
      }
      planes.push({
        image: layer,
        depth: .35 + plane * .25,
        phase: plane * .48,
        columns,
        sourceWidth: layer.width / columns,
        columnWidth: width / columns,
        height: bandHeight,
        top: height * .62
      });
    }
    return planes;
  }

  function drawAtmosphere() {
    for (let index = 0; index < atmosphere.length; index += 1) {
      const plane = atmosphere[index];
      context.globalAlpha = .66 + plane.depth * .12;
      for (let column = 0; column < plane.columns; column += 1) {
        const along = (column + .5) / plane.columns;
        // Neighbouring strips share long waves, so the surface breathes as a
        // volume. Their incommensurate periods prevent a visible looping beat.
        const current = Math.sin(along * 6.3 + elapsed * .095 + plane.phase) * 3.1
          + Math.sin(along * 10.8 - elapsed * .061 + plane.phase) * 1.4;
        const y = plane.top + current * plane.depth + pointer.y * plane.depth * .6;
        const x = column * plane.columnWidth + pointer.x * plane.depth * .45;
        context.drawImage(plane.image, column * plane.sourceWidth, 0, plane.sourceWidth, plane.image.height,
          x, y, plane.columnWidth, plane.height);
      }
    }
  }

  function rebuildSky() {
    const random = seededRandom(741103);
    const area = width * height;
    const starCount = mobile ? 145 : Math.min(295, Math.max(210, Math.round(area / 4650)));
    stars = [];

    for (let index = 0; index < starCount; index += 1) {
      const depth = .12 + Math.pow(random(), 2) * .88;
      const bright = index % 53 === 0;
      const point = {
        x: random() * width,
        y: random() * height,
        depth,
        size: bright ? 6.5 + random() * 2.5 : 2.2 + depth * 3.6,
        alpha: bright ? .56 + random() * .12 : .2 + depth * .29,
        color: bright ? 3 : Math.floor(random() * palette.length),
        phase: random() * twoPi,
        frequency: twoPi / (43 + random() * 29),
        velocityX: 0,
        velocityY: 0,
        offsetX: 0,
        offsetY: 0,
        offsetVelocityX: 0,
        offsetVelocityY: 0,
        // Precomputed smooth-current knots avoid random calls and allocations
        // while drawing. Slow, independent curves avoid a shared diagonal drift.
        currentPhase: random() * 10,
        currentSpeed: .035 + random() * .019,
        currentX: new Float32Array(12),
        currentY: new Float32Array(12)
      };
      for (let knot = 0; knot < 12; knot += 1) {
        point.currentX[knot] = random() * 2 - 1;
        point.currentY[knot] = random() * 2 - 1;
      }
      point.sprite = starSprites[point.color];
      stars.push(point);
    }
    atmosphere = buildAtmosphere(random);
  }

  function resize() {
    if (destroyed) return;
    if (document.hidden || foregroundBusy) {
      resizePending = true;
      return;
    }
    resizePending = false;
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    mobile = width <= 600;
    // This soft background does not need a full Retina backing store. Bound the
    // fill rate on large/high-DPI screens so the foreground keeps its frame budget.
    const pixelBudget = mobile ? 1300000 : 2000000;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(pixelBudget / (width * height)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'low';
    rebuildSky();
    draw();
  }

  function advanceStar(point, delta) {
    const current = elapsed * point.currentSpeed + point.currentPhase;
    const cell = Math.floor(current);
    const fraction = current - cell;
    const blend = fraction * fraction * fraction * (fraction * (fraction * 6 - 15) + 10);
    const a = cell % 12;
    const b = (a + 1) % 12;
    const speed = .16 + point.depth * 1.35;
    const targetX = (point.currentX[a] + (point.currentX[b] - point.currentX[a]) * blend) * speed;
    const targetY = (point.currentY[a] + (point.currentY[b] - point.currentY[a]) * blend) * speed * .72;
    const ease = 1 - Math.exp(-delta * .7);
    point.velocityX += (targetX - point.velocityX) * ease;
    point.velocityY += (targetY - point.velocityY) * ease;
    point.x += point.velocityX * delta;
    point.y += point.velocityY * delta;
    if (point.x < -12) point.x += width + 24;
    if (point.x > width + 12) point.x -= width + 24;
    if (point.y < -12) point.y += height + 24;
    if (point.y > height + 12) point.y -= height + 24;

    // A local, damped response gives nearby dust a little inertia. The effect is
    // bounded to background pixels; controls and text never move with it.
    let forceX = 0;
    let forceY = 0;
    if (pointer.active && point.depth > .4) {
      const dx = point.x - pointer.screenX;
      const dy = point.y - pointer.screenY;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared > 1 && distanceSquared < 19600) {
        const distance = Math.sqrt(distanceSquared);
        const influence = (1 - distance / 140) * point.depth * 5;
        forceX = dx / distance * influence;
        forceY = dy / distance * influence;
      }
    }
    point.offsetVelocityX += (forceX - point.offsetX * 1.5 - point.offsetVelocityX * 2.8) * delta;
    point.offsetVelocityY += (forceY - point.offsetY * 1.5 - point.offsetVelocityY * 2.8) * delta;
    point.offsetX += point.offsetVelocityX * delta;
    point.offsetY += point.offsetVelocityY * delta;
  }

  function drawStar(point) {
    const x = point.x + pointer.x * point.depth + point.offsetX;
    const y = point.y + pointer.y * point.depth + point.offsetY;
    const edgeFade = Math.min(1, Math.max(0, x + 8) / 26, Math.max(0, width + 8 - x) / 26,
      Math.max(0, y + 8) / 26, Math.max(0, height + 8 - y) / 26);
    const breathe = .97 + Math.sin(elapsed * point.frequency + point.phase) * .03;
    const size = point.size;
    context.globalAlpha = point.alpha * breathe * edgeFade + pulseAmount * .006;
    context.drawImage(point.sprite, x - size * .5, y - size * .5, size, size);
  }

  function draw() {
    if (destroyed || !width || !height) return;
    context.globalAlpha = 1;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    drawAtmosphere();
    for (let index = 0; index < stars.length; index += 1) drawStar(stars[index]);
    context.globalAlpha = 1;
  }

  function tick(now) {
    frame = 0;
    if (!isRunning || destroyed) return;
    // Draw on the display's animation cadence. A wall-clock 30fps gate that
    // resets after each draw alternates 33/50ms gaps on ordinary 60Hz screens.
    const delta = Math.max(0, Math.min((now - lastDraw) / 1000, .1));
    lastDraw = now;
    elapsed += delta;
    const ease = 1 - Math.exp(-delta * 2.1);
    pointer.x += (pointer.targetX - pointer.x) * ease;
    pointer.y += (pointer.targetY - pointer.y) * ease;
    if (pulseExpires && elapsed >= pulseExpires) {
      pulseTarget = 0;
      pulseExpires = 0;
    }
    pulseAmount += (pulseTarget - pulseAmount) * (1 - Math.exp(-delta * (pulseTarget ? 2.1 : 1.45)));
    if (Math.abs(pulseAmount) < .0005) pulseAmount = 0;

    for (let index = 0; index < stars.length; index += 1) advanceStar(stars[index], delta);
    draw();
    frame = window.requestAnimationFrame(tick);
  }

  function syncMotion() {
    if (destroyed) return;
    const shouldRun = !foregroundBusy && !document.hidden && !reducedMotion.matches && !document.documentElement.classList.contains('motion-paused');
    if (resizePending && !document.hidden && !foregroundBusy) resize();
    if (shouldRun === isRunning) {
      if (!shouldRun && !document.hidden && !foregroundBusy) draw();
      return;
    }
    isRunning = shouldRun;
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    if (isRunning) {
      lastDraw = performance.now();
      frame = window.requestAnimationFrame(tick);
    } else if (!document.hidden && !foregroundBusy) {
      if (reducedMotion.matches) {
        pulseAmount = 0;
        pulseTarget = 0;
      }
      draw();
    }
  }

  function movePointer(event) {
    if (!isRunning || !finePointer.matches || event.pointerType === 'touch') return;
    // Normalized pointer movement never shifts the background more than 5px.
    pointer.targetX = Math.max(-5, Math.min(5, (event.clientX / width - .5) * 10));
    pointer.targetY = Math.max(-3, Math.min(3, (event.clientY / height - .5) * 6));
    pointer.screenX = event.clientX;
    pointer.screenY = event.clientY;
    pointer.active = true;
  }

  function resetPointer(event) {
    if (event && event.relatedTarget !== null) return;
    pointer.targetX = 0;
    pointer.targetY = 0;
    pointer.active = false;
  }

  function requestResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 120);
  }

  function pointerChanged() {
    if (!finePointer.matches) resetPointer();
  }

  const observer = new MutationObserver(syncMotion);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', requestResize, { passive: true });
  window.addEventListener('pointermove', movePointer, { passive: true });
  document.addEventListener('pointerout', resetPointer, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reducedMotion.addEventListener('change', syncMotion);
  finePointer.addEventListener('change', pointerChanged);

  const api = {
    // Optional foreground renderer coordination: leave the current sky visible
    // but stop competing for canvas work until its transition has completed.
    setForegroundBusy: function (busy) {
      if (destroyed || foregroundBusy === Boolean(busy)) return;
      foregroundBusy = Boolean(busy);
      syncMotion();
    },
    pulse: function (kind) {
      if (destroyed || (kind !== 'leave' && kind !== 'enter')) return;
      if (!isRunning) {
        pulseAmount = 0;
        pulseTarget = 0;
        pulseExpires = 0;
        if (!document.hidden && !foregroundBusy) draw();
        return;
      }
      pulseTarget = kind === 'leave' ? 1 : 0;
      pulseExpires = kind === 'leave' ? elapsed + 2.2 : 0;
    },
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      isRunning = false;
      if (frame) window.cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener('resize', requestResize);
      window.removeEventListener('pointermove', movePointer);
      document.removeEventListener('pointerout', resetPointer);
      document.removeEventListener('visibilitychange', syncMotion);
      reducedMotion.removeEventListener('change', syncMotion);
      finePointer.removeEventListener('change', pointerChanged);
      canvas.remove();
      stars = [];
      atmosphere = [];
      if (window.MovieHunterStarfield === api) delete window.MovieHunterStarfield;
    }
  };
  window.MovieHunterStarfield = api;
  resize();
  syncMotion();
}());
