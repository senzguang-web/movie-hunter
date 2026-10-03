(function () {
  'use strict';

  if (document.getElementById('cinema-atmosphere')) return;

  const atmosphere = document.createElement('div');
  atmosphere.id = 'cinema-atmosphere';
  atmosphere.setAttribute('aria-hidden', 'true');
  atmosphere.innerHTML = '<div class="atmosphere-stars"></div>' +
    '<div class="atmosphere-parallax"><div class="atmosphere-optics">' +
      '<div class="atmosphere-haze"></div>' +
      '<svg class="atmosphere-arc" viewBox="0 0 1800 1100" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<linearGradient id="cinema-arc-light" x1="120" y1="465" x2="1610" y2="165" gradientUnits="userSpaceOnUse">' +
            '<stop offset="0" stop-color="#91abce" stop-opacity="0"/>' +
            '<stop offset=".18" stop-color="#91abce" stop-opacity=".09"/>' +
            '<stop offset=".37" stop-color="#a3abb8" stop-opacity=".32"/>' +
            '<stop offset=".49" stop-color="#f2f2f0" stop-opacity=".55"/>' +
            '<stop offset=".61" stop-color="#a3abb8" stop-opacity=".22"/>' +
            '<stop offset=".82" stop-color="#afa4c7" stop-opacity=".035"/>' +
            '<stop offset="1" stop-color="#91abce" stop-opacity="0"/>' +
          '</linearGradient>' +
          '<path id="cinema-open-arc" d="M -280 990 C 140 170 900 -20 2100 275"/>' +
        '</defs>' +
        '<use class="atmosphere-arc-diffusion" href="#cinema-open-arc" stroke="url(#cinema-arc-light)" stroke-width="38"/>' +
        '<use class="atmosphere-arc-bloom" href="#cinema-open-arc" stroke="url(#cinema-arc-light)" stroke-width="7"/>' +
        '<use class="atmosphere-arc-edge" href="#cinema-open-arc" stroke="url(#cinema-arc-light)" stroke-width=".65"/>' +
      '</svg>' +
    '</div></div><div class="atmosphere-vignette"></div>';

  const stars = atmosphere.querySelector('.atmosphere-stars');
  // Stable coordinates make the space feel familiar between views and reloads.
  let seed = 17031;
  function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  }
  for (let index = 0; index < 28; index += 1) {
    const star = document.createElement('i');
    const x = 3 + random() * 94;
    const y = 9 + random() * 81;
    const size = index % 9 === 0 ? 1.6 : 1;
    star.className = 'atmosphere-star';
    star.style.cssText = '--star-x:' + x.toFixed(2) + '%;--star-y:' + y.toFixed(2) + '%;' +
      '--star-size:' + size + 'px;--star-opacity:' + (.13 + random() * .25).toFixed(2) + ';' +
      '--star-duration:' + (14 + random() * 12).toFixed(2) + 's;--star-delay:-' + (random() * 26).toFixed(2) + 's;';
    stars.appendChild(star);
  }
  document.body.prepend(atmosphere);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pendingFrame = 0;
  let x = 0;
  let y = 0;
  let isPaused = false;

  function resetPointer() {
    if (pendingFrame) window.cancelAnimationFrame(pendingFrame);
    pendingFrame = 0;
    atmosphere.style.setProperty('--atmosphere-x', '0px');
    atmosphere.style.setProperty('--atmosphere-y', '0px');
  }

  function syncMotion() {
    isPaused = reduced.matches || document.hidden || document.body.classList.contains('motion-paused');
    atmosphere.classList.toggle('atmosphere-paused', isPaused);
    if (isPaused || !finePointer.matches) resetPointer();
  }

  function onPointerMove(event) {
    if (isPaused || !finePointer.matches || event.pointerType === 'touch') return;
    x = (event.clientX / window.innerWidth - .5) * 5;
    y = (event.clientY / window.innerHeight - .5) * 3;
    if (pendingFrame) return;
    // Schedule only on input. There is no continuous JavaScript animation loop.
    pendingFrame = window.requestAnimationFrame(function () {
      pendingFrame = 0;
      atmosphere.style.setProperty('--atmosphere-x', x.toFixed(2) + 'px');
      atmosphere.style.setProperty('--atmosphere-y', y.toFixed(2) + 'px');
    });
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerout', function (event) {
    if (event.relatedTarget === null) resetPointer();
  }, { passive: true });
  document.addEventListener('visibilitychange', syncMotion);
  reduced.addEventListener('change', syncMotion);
  finePointer.addEventListener('change', syncMotion);
  new MutationObserver(syncMotion).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  syncMotion();
}());
