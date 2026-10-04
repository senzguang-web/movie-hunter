(function () {
  'use strict';
  const button = document.getElementById('sound-toggle');
  if (!button) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const scriptURL = new URL(document.currentScript.src);
  const asset = new URL('../assets/audio/seaside.mp3', scriptURL);
  asset.search = scriptURL.search;
  let context, master, source, buffer, loading;
  let enabled = false, busy = false, failed = false, locale = 'zh', destroyed = false;
  let revision = 0, suspendTimer = 0;
  let envelope = { from: 0, to: 0, start: 0, end: 0 };
  const volume = .32;
  const t = (zh, en) => locale === 'en' ? en : zh;

  function update() {
    button.disabled = !AudioContext;
    button.dataset.playing = String(enabled && !busy && !document.hidden && context?.state === 'running');
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = !AudioContext ? t('声音不可用', 'Sound unavailable')
      : busy ? t('海岸声 · 准备中', 'Coast · Loading')
      : failed ? t('海岸声 · 重试', 'Coast · Retry')
      : enabled ? t('海岸声 · 开', 'Coast · On') : t('海岸声 · 关', 'Coast · Off');
    button.setAttribute('aria-label', enabled
      ? t('关闭海浪与远处海鸥声', 'Turn off waves and distant gulls')
      : t('开启海浪与远处海鸥声，声音将轻柔淡入', 'Turn on waves and distant gulls with a gentle fade-in'));
    button.title = failed ? t('声音暂时未能载入，点击重试', 'The sound could not load. Click to retry.')
      : t('海浪与远处海鸥 · 轻柔淡入淡出', 'Waves and distant gulls · Gentle fades');
  }

  function currentLevel(now) {
    const progress = envelope.end > envelope.start ? Math.max(0, Math.min(1, (now - envelope.start) / (envelope.end - envelope.start))) : 1;
    return envelope.from + (envelope.to - envelope.from) * progress;
  }

  function fade(to, seconds) {
    if (!master) return;
    const now = context.currentTime, from = currentLevel(now);
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(from, now);
    master.gain.linearRampToValueAtTime(to, now + seconds);
    envelope = { from, to, start: now, end: now + seconds };
  }

  function cancelSuspend() { clearTimeout(suspendTimer); suspendTimer = 0; }

  function quiet(seconds = 1.2) {
    cancelSuspend();
    if (!context || context.state === 'closed') return;
    fade(0, seconds);
    suspendTimer = setTimeout(() => {
      suspendTimer = 0;
      if ((!enabled || document.hidden) && context.state !== 'closed') {
        Promise.resolve(context.suspend()).catch(() => {});
      }
    }, seconds * 1000 + 60);
  }

  function getContext() {
    if (context) return context;
    context = new AudioContext();
    master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.connect(context.destination);
    // A single continuous source survives all question and movie transitions.
    // Its output starts at zero; loading or resuming cannot produce a loud onset.
    envelope = { from: 0, to: 0, start: context.currentTime, end: context.currentTime };
    return context;
  }

  function makeLoop(recording) {
    // Join the last three seconds to the first three once, after decoding. The
    // loop boundary then falls between adjacent original samples, not two cuts.
    const overlap = Math.min(Math.floor(recording.sampleRate * 3), Math.floor(recording.length / 4));
    const length = recording.length - overlap;
    const loop = context.createBuffer(recording.numberOfChannels, length, recording.sampleRate);
    for (let channel = 0; channel < recording.numberOfChannels; channel++) {
      const input = recording.getChannelData(channel), output = loop.getChannelData(channel);
      output.set(input.subarray(0, length));
      for (let i = 0; i < overlap; i++) {
        const phase = i / Math.max(1, overlap - 1) * Math.PI / 2;
        output[i] = input[length + i] * Math.cos(phase) + input[i] * Math.sin(phase);
      }
    }
    return loop;
  }

  function load() {
    if (buffer) return Promise.resolve(buffer);
    if (!loading) {
      loading = (async () => {
        const response = await fetch(asset.href, { credentials: 'omit' });
        if (!response.ok) throw new Error('Sound unavailable');
        const recording = await context.decodeAudioData(await response.arrayBuffer());
        if (destroyed) return null;
        if (!recording.length || recording.duration < 4) throw new Error('Invalid sound');
        buffer = makeLoop(recording);
        return buffer;
      })().finally(() => { loading = null; });
    }
    return loading;
  }

  async function start(token) {
    try {
      // Resume is called directly from the user's click before awaiting a fetch.
      const resumed = getContext().resume();
      await resumed;
      const sound = await load();
      if (destroyed || token !== revision || !enabled) return;
      // The tab may have been hidden and suspended while the file was loading.
      if (!document.hidden && context.state !== 'running') {
        await context.resume();
        if (destroyed || token !== revision || !enabled) return;
      }
      if (!source && sound) {
        source = context.createBufferSource(); source.buffer = sound; source.loop = true;
        source.connect(master); source.start();
      }
      busy = false;
      if (!document.hidden) { cancelSuspend(); fade(volume, 6); }
      else quiet(.35);
      update();
    } catch (_) {
      if (destroyed || token !== revision) return;
      enabled = false; busy = false; failed = true;
      quiet(.15); update();
    }
  }

  function toggle() {
    if (!AudioContext || destroyed) return;
    enabled = !enabled; failed = false; ++revision;
    cancelSuspend();
    if (enabled) { busy = !buffer; update(); start(revision); }
    else { busy = false; quiet(); update(); }
  }

  async function restore() {
    if (!enabled || busy || !context || destroyed || document.hidden) return;
    const token = revision;
    try {
      cancelSuspend(); await context.resume();
      if (destroyed || !enabled || token !== revision || document.hidden) return;
      fade(volume, 4); update();
    } catch (_) {
      if (destroyed || token !== revision) return;
      enabled = false; failed = true; quiet(.15); update();
    }
  }

  function visibility() {
    if (document.hidden) { quiet(.35); update(); }
    else restore();
  }
  function pagehide(event) {
    if (event.persisted) { if (master) { fade(0, 0); context.suspend().catch(() => {}); } }
    else destroy();
  }
  function destroy() {
    destroyed = true; enabled = false; busy = false; ++revision; cancelSuspend();
    source?.stop(); source?.disconnect(); master?.disconnect();
    if (context && context.state !== 'closed') context.close().catch(() => {});
    button.removeEventListener('click', toggle);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
    window.removeEventListener('pageshow', restore);
    update();
  }
  button.addEventListener('click', toggle);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  window.addEventListener('pageshow', restore);
  window.MovieHunterSeaside = { setLocale(value) { locale = value; update(); }, destroy };
  update();
}());
