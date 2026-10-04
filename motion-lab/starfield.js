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
  const palette = ['193,217,241', '181,218,224', '211,203,233', '235,241,250'];
  const nebulaPalette = ['91,119,164', '87,135,145', '114,107,156'];
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 0;
  let height = 0;
  let mobile = false;
  let stars = [];
  let galaxy = null;
  let frame = 0;
  let resizeTimer = 0;
  let lastDraw = 0;
  let elapsed = 0;
  let isRunning = false;
  let foregroundBusy = false;
  let destroyed = false;
  let resizePending = false;
  let meteor = null;
  let nextMeteor = 10.5;
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

  function makeSprite(color, nebula) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const brush = sprite.getContext('2d');
    const light = brush.createRadialGradient(32, 32, 0, 32, 32, 32);
    if (nebula) {
      light.addColorStop(0, 'rgba(' + color + ',.27)');
      light.addColorStop(.26, 'rgba(' + color + ',.14)');
      light.addColorStop(.59, 'rgba(' + color + ',.032)');
      light.addColorStop(1, 'rgba(' + color + ',0)');
    } else {
      light.addColorStop(0, 'rgba(244,248,255,.98)');
      light.addColorStop(.075, 'rgba(' + color + ',.92)');
      light.addColorStop(.17, 'rgba(' + color + ',.39)');
      light.addColorStop(.35, 'rgba(' + color + ',.07)');
      light.addColorStop(.66, 'rgba(' + color + ',.012)');
      light.addColorStop(1, 'rgba(' + color + ',0)');
    }
    brush.fillStyle = light;
    brush.fillRect(0, 0, 64, 64);
    return sprite;
  }

  const starSprites = palette.map(color => makeSprite(color, false));
  const cloudSprites = nebulaPalette.map(color => makeSprite(color, true));

  function galaxyCenter(x) {
    return .68 - x * .37 + Math.sin(x * 6.4 + .65) * .038;
  }

  function buildGalaxy(random) {
    // This cache is painted only on resize. Small overlapping filaments form the
    // cloud; there is no full-screen radial gradient or per-frame blur pass.
    const layer = document.createElement('canvas');
    const resolution = Math.min(1, 1400 / width, Math.sqrt(1100000 / (width * height)));
    layer.width = Math.ceil(width * resolution);
    layer.height = Math.ceil(height * resolution);
    const brush = layer.getContext('2d');
    brush.setTransform(resolution, 0, 0, resolution, 0, 0);
    brush.globalCompositeOperation = 'screen';
    const scale = mobile ? .74 : 1;
    const cloudCount = mobile ? 1020 : 1920;

    for (let index = 0; index < cloudCount; index += 1) {
      const x = -.09 + random() * 1.18;
      const strand = index % 3;
      const clustered = .55 + Math.sin(x * 17.5 + strand * 1.7) * .22 + Math.sin(x * 38.4) * .1;
      if (random() > clustered) continue;
      const offset = (strand - 1) * .027;
      const strandWidth = .009 + Math.sin(x * 8.3 + strand) ** 2 * .018;
      const y = galaxyCenter(x) + offset + gaussian(random) * strandWidth;
      const diameter = (8 + random() * 32) * scale;
      const stretch = 1.25 + random() * 1.8;
      const edgeFade = Math.max(0, Math.sin(Math.max(0, Math.min(1, x)) * Math.PI)) ** .45;
      brush.globalAlpha = (.13 + random() * .35) * edgeFade;
      brush.drawImage(cloudSprites[strand], x * width - diameter * stretch * .5, y * height - diameter * .5, diameter * stretch, diameter);
    }

    // Finer filament cores bring detail without turning the dust into noisy dots.
    for (let index = 0; index < (mobile ? 430 : 720); index += 1) {
      const x = random();
      const strand = index % 2;
      const branch = Math.sin(x * 21 + strand * 2.2) * .006;
      const y = galaxyCenter(x) + (strand ? .013 : -.022) + branch + gaussian(random) * .004;
      const size = (3 + random() * 7) * scale;
      brush.globalAlpha = (.19 + random() * .29) * Math.sin(x * Math.PI);
      brush.drawImage(cloudSprites[strand], x * width - size * 1.4, y * height - size * .5, size * 2.8, size);
    }

    // Soft, irregular dark lanes keep the band from becoming a luminous stripe.
    brush.globalCompositeOperation = 'destination-out';
    for (let index = 0; index < 160; index += 1) {
      const x = index / 159;
      const y = galaxyCenter(x) + Math.sin(x * 24) * .009 + .003;
      const diameter = (16 + Math.sin(x * 19) ** 2 * 30) * scale;
      brush.globalAlpha = .38;
      brush.drawImage(cloudSprites[0], x * width - diameter, y * height - diameter * .5, diameter * 2, diameter);
    }
    brush.globalAlpha = 1;
    brush.globalCompositeOperation = 'source-over';
    return layer;
  }

  function rebuildSky() {
    const random = seededRandom(741103);
    const area = width * height;
    const starCount = mobile ? 145 : Math.min(295, Math.max(210, Math.round(area / 4650)));
    stars = [];

    for (let index = 0; index < starCount; index += 1) {
      const depth = .14 + Math.pow(random(), 2) * .86;
      const bright = index % 39 === 0;
      const x = random();
      const inGalaxy = index % 4 === 0;
      stars.push({
        x,
        y: inGalaxy ? galaxyCenter(x) + gaussian(random) * .047 : random(),
        depth,
        size: bright ? 10 + random() * 5 : 3.1 + depth * 4.2,
        alpha: bright ? .74 + random() * .14 : .26 + depth * .36,
        color: bright ? 3 : Math.floor(random() * palette.length),
        phase: random() * twoPi,
        period: 31 + random() * 16,
        bright
      });
    }
    for (const point of stars) {
      point.originX = point.x * width;
      point.originY = point.y * height;
      point.frequency = twoPi / point.period;
      point.sprite = starSprites[point.color];
    }
    galaxy = buildGalaxy(random);
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

  function drawStar(point) {
    const phase = elapsed * point.frequency + point.phase;
    const driftX = Math.sin(phase) * point.depth * 2.4;
    const driftY = Math.cos(phase * .83) * point.depth * 1.9;
    const outwardX = (point.x - .5) * pulseAmount * 10 * point.depth;
    const outwardY = (point.y - .5) * pulseAmount * 8 * point.depth;
    const x = point.originX + driftX + pointer.x * point.depth + outwardX;
    const y = point.originY + driftY + pointer.y * point.depth + outwardY;
    const breathe = .955 + Math.sin(phase * .73) * .045;
    const size = point.size;
    context.globalAlpha = Math.min(.93, point.alpha * breathe + pulseAmount * .012);
    context.drawImage(point.sprite, x - size * .5, y - size * .5, size, size);
  }

  function drawMeteor() {
    if (!meteor) return;
    const progress = (elapsed - meteor.start) / meteor.duration;
    if (progress < 0 || progress > 1) return;
    const visibility = Math.sin(progress * Math.PI) ** 1.3;
    const travel = mobile ? 85 : 155;
    const x = meteor.x * width + progress * travel;
    const y = meteor.y * height + progress * travel * .29;
    const tail = mobile ? 25 : 42;
    const fade = context.createLinearGradient(x - tail, y - tail * .29, x, y);
    fade.addColorStop(0, 'rgba(178,210,231,0)');
    fade.addColorStop(.75, 'rgba(192,221,239,' + (.12 * visibility).toFixed(3) + ')');
    fade.addColorStop(1, 'rgba(224,239,249,' + (.42 * visibility).toFixed(3) + ')');
    context.strokeStyle = fade;
    context.lineWidth = .75;
    context.beginPath();
    context.moveTo(x - tail, y - tail * .29);
    context.lineTo(x, y);
    context.stroke();
  }

  function draw() {
    if (destroyed || !width || !height) return;
    context.globalAlpha = 1;
    context.fillStyle = '#000';
    context.fillRect(0, 0, width, height);
    if (galaxy) {
      const scale = 1.018 + pulseAmount * .006;
      const x = (width - width * scale) * .5 + pointer.x * .22 + Math.sin(elapsed / 39) * 1.3;
      const y = (height - height * scale) * .5 + pointer.y * .2 + Math.cos(elapsed / 43) * .8;
      context.globalAlpha = .85 + Math.sin(elapsed / 31) * .055 + pulseAmount * .025;
      context.drawImage(galaxy, x, y, width * scale, height * scale);
    }
    for (let index = 0; index < stars.length; index += 1) drawStar(stars[index]);
    context.globalAlpha = 1;
    if (!reducedMotion.matches) drawMeteor();
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

    if (meteor && elapsed - meteor.start > meteor.duration) meteor = null;
    if (!meteor && elapsed >= nextMeteor) {
      meteor = {
        x: .09 + Math.random() * .58,
        y: .11 + Math.random() * .18,
        start: elapsed,
        duration: 3.1 + Math.random() * .7
      };
      nextMeteor = elapsed + 8 + Math.random() * 7;
    }
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
        meteor = null;
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
  }

  function resetPointer(event) {
    if (event && event.relatedTarget !== null) return;
    pointer.targetX = 0;
    pointer.targetY = 0;
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
      galaxy = null;
      if (window.MovieHunterStarfield === api) delete window.MovieHunterStarfield;
    }
  };
  window.MovieHunterStarfield = api;
  resize();
  syncMotion();
}());
