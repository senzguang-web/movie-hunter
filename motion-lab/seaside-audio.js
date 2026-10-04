(function () {
  'use strict';
  const button = document.getElementById('sound-toggle');
  if (!button) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const scriptURL = new URL(document.currentScript.src);
  const asset = new URL('../assets/audio/seaside.mp3', scriptURL);
  asset.search = scriptURL.search;
  const fallbackAsset = new URL('../assets/audio/seaside-pcm.wav', scriptURL);
  fallbackAsset.search = scriptURL.search;
  let context, master, source, buffer, loading;
  let enabled = false, busy = false, failed = '', locale = 'zh', destroyed = false;
  let revision = 0, suspendTimer = 0;
  const pendingTasks = new Set();
  let envelope = { from: 0, to: 0, start: 0, end: 0 };
  const volume = .32;
  const t = (zh, en) => locale === 'en' ? en : zh;
  function failure(kind, error) {
    const result = new Error(kind);
    result.kind = kind; result.reason = error?.name || 'Error';
    return result;
  }

  function update() {
    button.disabled = !AudioContext;
    button.dataset.audioError = failed;
    button.dataset.playing = String(enabled && !busy && !document.hidden && context?.state === 'running');
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = !AudioContext ? t('声音不可用', 'Sound unavailable')
      : busy ? t('海岸声 · 准备中', 'Coast · Loading')
      : failed ? t('海岸声 · 重试', 'Coast · Retry')
      : enabled ? t('海岸声 · 开', 'Coast · On') : t('海岸声 · 关', 'Coast · Off');
    button.setAttribute('aria-label', enabled
      ? t('关闭海浪与远处海鸥声', 'Turn off waves and distant gulls')
      : t('开启海浪与远处海鸥声，声音将轻柔淡入', 'Turn on waves and distant gulls with a gentle fade-in'));
    const messages = {
      network: t('音频下载未完成，请点击重试', 'The audio download did not finish. Click to retry.'),
      permission: t('浏览器尚未允许播放，请再次点击开启', 'Playback was not allowed. Click again to enable sound.'),
      decode: t('音频格式未能读取，请点击重试', 'The audio format could not be read. Click to retry.'),
      player: t('声音播放器暂未就绪，请点击重试', 'The audio player is not ready. Click to retry.')
    };
    button.title = messages[failed] || t('海浪与远处海鸥 · 轻柔淡入淡出', 'Waves and distant gulls · Gentle fades');
    if (failed) button.setAttribute('aria-label', button.title);
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
    if (context && master && context.state !== 'closed') return context;
    let next;
    try {
      next = new AudioContext();
      const gain = next.createGain();
      gain.gain.setValueAtTime(0, next.currentTime);
      gain.connect(next.destination);
      context = next; master = gain; source = null;
    } catch (error) {
      if (next) Promise.resolve(next.close()).catch(() => {});
      throw failure(error?.name === 'NotAllowedError' ? 'permission' : 'player', error);
    }
    // A single continuous source survives all question and movie transitions.
    // Its output starts at zero; loading or resuming cannot produce a loud onset.
    envelope = { from: 0, to: 0, start: context.currentTime, end: context.currentTime };
    return context;
  }

  function deadline(promise, ms, kind, cancel) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (value, error) => {
        if (settled) return;
        settled = true; clearTimeout(timer); pendingTasks.delete(stop);
        if (error) reject(error); else resolve(value);
      };
      const stop = () => { try { cancel?.(); } catch (_) {} finish(null, failure(kind)); };
      const timer = setTimeout(stop, ms);
      pendingTasks.add(stop);
      Promise.resolve(promise).then(value => finish(value), error => finish(null, error?.kind ? error : failure(kind, error)));
    });
  }

  function resume() {
    const player = getContext();
    try { return deadline(player.resume(), 6000, 'permission'); }
    catch (error) { return Promise.reject(failure('permission', error)); }
  }

  async function download(url) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const request = (async () => {
      const response = await fetch(url.href, { credentials: 'omit', ...(controller ? {signal: controller.signal} : {}) });
      if (!response.ok) throw failure('network');
      return response.arrayBuffer();
    })();
    return deadline(request, 20000, 'network', () => controller?.abort());
  }

  function decode(bytes) {
    // Older WebKit accepts callbacks but returns no Promise. Supplying both
    // callbacks and observing a returned Promise supports either implementation.
    const decoded = new Promise((resolve, reject) => {
      const result = context.decodeAudioData(bytes, resolve, reject);
      if (result?.then) result.then(resolve, reject);
    });
    return deadline(decoded, 12000, 'decode');
  }

  function readPCM(bytes) {
    // The fallback is uncompressed PCM, so it does not depend on the platform's
    // MP3 decoder. Validate all chunk bounds before allocating an audio buffer.
    const view = new DataView(bytes);
    const tag = offset => String.fromCharCode(...new Uint8Array(bytes, offset, 4));
    if (view.byteLength < 44 || view.byteLength > 8000000 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE'
      || view.getUint32(4, true) + 8 > view.byteLength) throw failure('decode');
    let format, data;
    for (let offset = 12; offset + 8 <= view.byteLength;) {
      const size = view.getUint32(offset + 4, true), start = offset + 8;
      if (start + size > view.byteLength) throw failure('decode');
      if (tag(offset) === 'fmt ') {
        if (size < 16) throw failure('decode');
        format = {code:view.getUint16(start,true), channels:view.getUint16(start+2,true),
          rate:view.getUint32(start+4,true), align:view.getUint16(start+12,true), bits:view.getUint16(start+14,true)};
      } else if (tag(offset) === 'data') data = {start,size};
      offset = start + size + (size % 2);
    }
    if (!format || !data || format.code !== 1 || format.bits !== 16 || ![1,2].includes(format.channels)
      || format.align !== format.channels * 2 || format.rate < 8000 || format.rate > 48000
      || data.size % format.align) throw failure('decode');
    const length = data.size / format.align, duration = length / format.rate;
    if (duration < 4 || duration > 120) throw failure('decode');
    const recording = context.createBuffer(format.channels, length, format.rate);
    for (let channel = 0; channel < format.channels; channel++) {
      const output = recording.getChannelData(channel);
      for (let i = 0; i < length; i++) output[i] = view.getInt16(data.start + i * format.align + channel * 2, true) / 32768;
    }
    return recording;
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
        const bytes = await download(asset);
        if (destroyed) return null;
        let recording;
        try {
          recording = await decode(bytes);
          if (!recording?.length || recording.duration < 4) throw failure('decode');
        } catch (error) {
          if (destroyed) return null;
          const pcm = await download(fallbackAsset);
          if (destroyed) return null;
          recording = readPCM(pcm);
        }
        if (destroyed) return null;
        buffer = makeLoop(recording);
        return buffer;
      })().finally(() => { loading = null; });
    }
    return loading;
  }

  async function start(token) {
    try {
      // Resume is called directly from the user's click before awaiting a fetch.
      await resume();
      const sound = await load();
      if (destroyed || token !== revision || !enabled) return;
      // The tab may have been hidden and suspended while the file was loading.
      if (!document.hidden && context.state !== 'running') {
        await resume();
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
    } catch (error) {
      if (destroyed || token !== revision) return;
      enabled = false; busy = false; failed = error.kind || 'player';
      quiet(.15); update();
    }
  }

  function toggle() {
    if (!AudioContext || destroyed) return;
    enabled = !enabled; failed = ''; ++revision;
    cancelSuspend();
    if (enabled) { busy = !buffer; update(); start(revision); }
    else { busy = false; quiet(); update(); }
  }

  async function restore() {
    if (!enabled || busy || !context || destroyed || document.hidden) return;
    const token = revision;
    try {
      cancelSuspend(); await resume();
      if (destroyed || !enabled || token !== revision || document.hidden) return;
      fade(volume, 4); update();
    } catch (error) {
      if (destroyed || token !== revision) return;
      enabled = false; failed = error.kind || 'player'; quiet(.15); update();
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
    for (const cancel of pendingTasks) cancel();
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
