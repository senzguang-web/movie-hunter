(function () {
  'use strict';

  const stage = document.getElementById('stage');
  const dialog = document.getElementById('prompt-dialog');
  const engine = window.MovieHunterWebEngine;
  const catalog = window.MovieHunterWorldCatalog || window.MovieHunterCatalog || [];
  const ratings = window.MovieHunterRatings || {};
  const interview = window.MovieHunterInterview;
  const allCountries = [...new Set(catalog.flatMap(movie => movie.countries || []))];
  const countryOrder = window.MovieHunterCountryOrder?.buildCountryOrder(catalog, ratings) || { primary: allCountries.slice(0, 6), additional: allCountries.slice(6) };
  const theme = document.body.dataset.theme || 'orbit';
  const publicMode = window.MovieHunterDeployment?.experience === 'stardust';
  const prompt = (window.MovieHunterMotionPrompts || {})[theme] || {};
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    phase: 'mood', locale: 'zh', mood: '', desired: null, genres: [], maxMinutes: null, countries: [], countriesExpanded: false,
    question: 0, preview: false, submitted: false, busy: false, paused: false,
    batch: [], batchKey: '', metadata: null, active: 0, chosenId: null, round: 0, recordedRound: 0,
    recommendedIds: [], recommendationLog: [], lastRefresh: false
  };
  const genreNames = { drama: ['剧情', 'Drama'], comedy: ['喜剧', 'Comedy'], romance: ['爱情', 'Romance'], animation: ['动画', 'Animation'], scifi: ['科幻', 'Sci-fi'], mystery: ['悬疑', 'Mystery'], adventure: ['冒险', 'Adventure'], music: ['音乐', 'Music'] };
  const t = (zh, en) => state.locale === 'en' ? en : zh;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const title = movie => t(movie.title, movie.titleEn || movie.originalTitle || movie.title);
  const film = id => catalog.find(movie => movie.id === id);
  const countryLabel = code => engine?.countryLabel ? engine.countryLabel(code, state.locale) : code;
  const genreLabel = code => genreNames[code] ? t(...genreNames[code]) : code;
  const motionOff = () => state.paused || reducedMotion.matches;
  const announcement = message => { document.getElementById('announcement').textContent = message; };
  const arrow = direction => '<span aria-hidden="true">' + (direction === 'left' ? '←' : '→') + '</span>';
  let composing = false;
  let touch = null;
  let suppressClickUntil = 0;
  let dialogTrigger = null;

  function safeLink(source) {
    try { const url = new URL(source); return url.protocol === 'https:' ? url.href : ''; }
    catch (_) { return ''; }
  }

  function poster(movie) {
    const source = movie.posterUrl || '/miniprogram' + movie.poster;
    return source.startsWith('/') ? new URL((window.MovieHunterDeployment?.assetBase || '../') + source.replace(/^\/+/, ''), window.location.href).href : source;
  }

  function movieMeta(movie) {
    const regions = (movie.countries || []).map(code => engine?.countryLabel ? engine.countryLabel(code, state.locale) : code).join(' / ');
    const genres = (movie.genres || []).map(id => genreNames[id] ? t(...genreNames[id]) : id).join(' / ');
    return [movie.year, regions, movie.minutes + t(' 分钟', ' min'), genres].filter(Boolean).join(' · ');
  }

  function query() {
    return { text: state.mood, desired: state.desired, genres: [...state.genres], maxMinutes: Number(state.maxMinutes), countries: [...state.countries], locale: state.locale };
  }

  function queryKey() { return JSON.stringify([state.mood, state.desired, [...state.genres].sort(), state.maxMinutes, [...state.countries].sort()]); }

  function day() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }

  function updateChrome() {
    document.documentElement.lang = t('zh-CN', 'en');
    const brand = document.querySelector('.lab-header > a > span');
    const brandText = brand && Array.from(brand.childNodes).find(node => node.nodeType === 3);
    if (brandText) brandText.nodeValue = t('电影猎手', 'MOVIE HUNTER');
    const variant = publicMode ? t('星尘影院', 'STARDUST CINEMA') : state.locale === 'en' ? (prompt.nameEn || prompt.english || theme.toUpperCase()) : (prompt.name || theme.toUpperCase());
    document.title = publicMode ? t('电影猎手 · 让故事遇见此刻', 'Movie Hunter · A story for this moment') : variant + t(' · 电影猎手动效实验', ' · Movie Hunter Motion Studies');
    document.documentElement.classList.toggle('motion-paused', motionOff());
    document.body.dataset.phase = state.phase;
    document.body.dataset.locale = state.locale;
    document.getElementById('locale-toggle').textContent = t('EN', '中文');
    document.getElementById('locale-toggle').setAttribute('aria-label', t('Switch to English', '切换为中文'));
    const pause = document.getElementById('motion-toggle');
    pause.textContent = motionOff() ? t('动态已暂停', 'Motion paused') : t('暂停动态', 'Pause motion');
    pause.setAttribute('aria-pressed', String(motionOff()));
    pause.disabled = reducedMotion.matches;
    pause.title = reducedMotion.matches ? t('已遵循系统的减少动态效果设置', 'Following your reduced-motion preference') : '';
    document.getElementById('prompt-open').textContent = t('动效提示词', 'Motion prompt');
    document.getElementById('prompt-open').hidden = publicMode;
    const replay = document.getElementById('particle-replay');
    if (replay) {
      replay.textContent = t('重播粒子转场', 'Replay particles');
      replay.setAttribute('aria-label', t('重播粒子聚合', 'Replay particle gathering'));
      replay.hidden = publicMode || !particleController();
    }
    document.getElementById('restart').textContent = t('重新体验', 'Start again');
    document.querySelector('.lab-footer a').textContent = t('← 全部方案', '← All studies');
    document.querySelector('.lab-footer a').hidden = publicMode;
    document.getElementById('variant-label').textContent = variant;
    document.querySelector('.phase-nav').setAttribute('aria-label', t('预览阶段', 'Preview a stage'));
    document.querySelector('.phase-nav').hidden = publicMode;
    const labels = { mood: t('01 心情', '01 Mood'), questions: t('02 问答', '02 Questions'), results: t('03 电影', '03 Films') };
    document.querySelectorAll('[data-phase]').forEach(button => {
      if (button.tagName !== 'BUTTON') return;
      const active = button.dataset.phase === (state.phase === 'selected' ? 'results' : state.phase);
      button.textContent = labels[button.dataset.phase];
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.setAttribute('aria-label', labels[button.dataset.phase] + t('，可直接预览此阶段', ', preview this stage'));
    });
  }

  function focusHeading() {
    const heading = stage.querySelector('h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }

  function particleController() {
    const controller = window.MovieHunterParticles;
    return controller && typeof controller.leave === 'function' && typeof controller.enter === 'function' ? controller : null;
  }

  async function particleStep(controller, step, keepPosition, originalStyle) {
    if (!controller) return false;
    let timeout;
    try {
      await Promise.race([
        Promise.resolve().then(() => controller[step]({ keepPosition, motionOff: motionOff() })),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Particle transition timed out')), 6000); })
      ]);
      return true;
    } catch (_) {
      // Restore the visible stage if an optional renderer fails midway.
      try { controller.failSafe?.(); } catch (_) { /* A cleanup failure must not block the ordinary page transition. */ }
      if (originalStyle === null) stage.removeAttribute('style'); else stage.setAttribute('style', originalStyle);
      return false;
    } finally { clearTimeout(timeout); }
  }

  async function transition(render, keepPosition = false) {
    if (state.busy) return;
    state.busy = true;
    const focused = document.activeElement;
    const action = focused?.dataset.action;
    const index = focused?.dataset.film;
    const scroll = window.scrollY;
    const railScroll = stage.querySelector('.film-thumbnails')?.scrollLeft || 0;
    let particles = particleController();
    const originalStyle = stage.getAttribute('style');
    stage.setAttribute('aria-busy', 'true');
    stage.classList.add('is-leaving');
    try {
      const left = await particleStep(particles, 'leave', keepPosition, originalStyle);
      if (!left || particleController() !== particles) particles = null;
      if (!left && !motionOff()) await new Promise(resolve => setTimeout(resolve, 180));
      render();
      stage.classList.remove('is-leaving');
      if (!particles && !motionOff()) stage.classList.add('is-entering');
      if (keepPosition) {
        window.scrollTo({ top: scroll, behavior: 'instant' });
        const rail = stage.querySelector('.film-thumbnails');
        if (rail) {
          rail.scrollLeft = railScroll;
          const active = rail.querySelector('[aria-pressed="true"]');
          if (active) {
            const itemBounds = active.getBoundingClientRect(), railBounds = rail.getBoundingClientRect();
            if (itemBounds.left < railBounds.left) rail.scrollLeft -= railBounds.left - itemBounds.left + 8;
            else if (itemBounds.right > railBounds.right) rail.scrollLeft += itemBounds.right - railBounds.right + 8;
          }
        }
        const replacement = index !== undefined ? stage.querySelector('[data-film="' + index + '"]') : action ? stage.querySelector('[data-action="' + action + '"]') : null;
        if (replacement) replacement.focus({ preventScroll: true });
        else if (!focused?.isConnected) focusHeading();
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
        focusHeading();
      }
      const entered = await particleStep(particleController() === particles ? particles : null, 'enter', keepPosition, originalStyle);
      if (!entered && !motionOff()) {
        stage.classList.add('is-entering');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } finally {
      stage.classList.remove('is-leaving', 'is-entering');
      stage.removeAttribute('aria-busy');
      state.busy = false;
    }
  }

  function previewNote() {
    const time = state.maxMinutes === null ? '' : state.maxMinutes ? t(' · ' + state.maxMinutes + ' 分钟以内', ' · Up to ' + state.maxMinutes + ' min') : t(' · 不限时长', ' · Any length');
    return state.preview ? '<p class="preview-note">' + t('预览示例 ·「有点累，想找一点温暖」', 'Preview example · “Feeling tired, looking for a little warmth”') + time + '</p>' : '';
  }

  function renderMood() {
    state.phase = 'mood';
    stage.className = 'stage stage-mood';
    stage.innerHTML = '<section class="mood-panel"><p class="eyebrow">' + t('让故事，遇见此刻', 'A STORY FOR THIS MOMENT') + '</p><h1>' + t('<span>今天，</span><br><span>你的心情怎么样？</span>', '<span>Tonight,</span><br><span>how do you feel?</span>') + '</h1><p class="lead">' + t('把今天留在这里，让故事带你去远方。', 'Leave your day here. Let a story take you somewhere new.') + '</p><form class="mood-form" id="lab-mood-form"><label class="field-label" for="lab-mood-input">' + t('此刻的心情', 'YOUR MOOD') + '</label><div class="input-row"><textarea id="lab-mood-input" class="mood-input" rows="2" maxlength="240" placeholder="' + t('说说吧，今天发生了什么。', 'Tell us a little about your day.') + '" aria-describedby="mood-hint mood-error">' + esc(state.mood) + '</textarea><button class="primary-button" type="submit" ' + (!state.mood.trim() ? 'disabled' : '') + '>' + t('继续', 'Continue') + arrow('right') + '</button></div><div class="field-footer" id="mood-hint"><span>' + t('Enter 继续 · Shift + Enter 换行', 'Enter to continue · Shift + Enter for a new line') + '</span><span id="mood-count">' + state.mood.length + ' / 240</span></div><p class="error" id="mood-error" role="alert"></p></form></section>';
    updateChrome();
  }

  function questionList() {
    let questions;
    if (interview?.getQuestions) {
      questions = interview.getQuestions({ text: state.mood, answers: { desired: state.desired, genres: state.genres, maxMinutes: state.maxMinutes, countries: state.countries }, locale: state.locale });
    } else {
      questions = [
        { key: 'desired', title: t('今晚，希望电影带给你什么？', 'What would you like from a film tonight?'), help: t('感受的方向，由你决定。', 'You choose the direction.'), options: [['comfort', t('被温柔治愈', 'Find comfort')], ['joy', t('开怀一笑', 'Have a good laugh')], ['release', t('释放情绪', 'Let feelings out')], ['thrill', t('感受刺激', 'Feel excitement')], ['think', t('获得思考', 'Find a new perspective')]] },
        { key: 'maxMinutes', title: t('今晚，留多少时间给电影？', 'How much time do you have tonight?'), help: t('选一个时间上限，也可以不限。', 'Choose a maximum running time, or leave it open.'), options: [[90, t('90 分钟以内', 'Up to 90 minutes')], [120, t('两个小时以内', 'Up to 2 hours')], [180, t('三个小时以内', 'Up to 3 hours')], [0, t('不限时间', 'Any length')]] },
        { key: 'countries', title: t('想看哪里的电影？', 'Where should the story come from?') }
      ];
    }
    const adaptiveGenre = questions.find(question => question.key === 'genre');
    const suggested = [...(adaptiveGenre?.options || []), ...(adaptiveGenre?.additionalOptions || [])];
    const genreOrder = [...new Set([...suggested.map(option => option[0]), ...Object.keys(genreNames)])].filter(id => Object.hasOwn(genreNames, id));
    questions.push({
      key: 'genres', multi: true,
      title: adaptiveGenre?.title || t('今晚，想看什么类型的电影？', 'What kinds of films would you like tonight?'),
      help: (adaptiveGenre?.help ? adaptiveGenre.help + ' ' : '') + t('可多选，符合其中一种即可；也可以不限类型。', 'Choose several; a film can match any one of them. Or keep every genre open.'),
      options: [['any', t('不限类型', 'Any genre'), t('让故事自由发生', 'Keep every genre open')], ...genreOrder.map(id => [id, genreLabel(id), suggested.find(option => option[0] === id)?.[2] || ''])]
    });
    const countryQuestion = questions.find(question => question.key === 'countries');
    countryQuestion.multi = true;
    countryQuestion.help = t('可多选，也可不限。选择后只推荐这些制片地区的电影，合拍片符合其中一个地区即可。', 'Choose several or anywhere. Films must include at least one selected production region; co-productions qualify.');
    countryQuestion.options = [['any', t('不限国家／地区', 'Anywhere'), t('让故事自由发生', 'Stories without borders')], ...countryOrder.primary.map(code => [code, countryLabel(code), ''])];
    countryQuestion.additionalOptions = countryOrder.additional.map(code => [code, countryLabel(code), '']);
    return ['desired', 'genres', 'maxMinutes', 'countries'].map(key => questions.find(question => question.key === key));
  }

  function optionMarkup(question, options) {
    return options.map(([value, name, description], index) => {
      const checked = question.multi ? (value === 'any' ? !state[question.key].length : state[question.key].includes(value)) : String(state[question.key]) === String(value);
      return '<label class="option-row' + (question.multi ? (question.key === 'genres' ? ' genre-option' : ' country-option') : '') + '" style="--i:' + index + '"><input type="' + (question.multi ? 'checkbox' : 'radio') + '" name="' + question.key + '" value="' + esc(value) + '" ' + (checked ? 'checked' : '') + '><span class="option-content"><span class="option-copy"><span class="option-label">' + esc(name) + '</span>' + (description ? '<span class="option-description">' + esc(description) + '</span>' : '') + '</span><span class="option-check" aria-hidden="true">✓</span></span></label>';
    }).join('');
  }

  function countriesSummary() {
    return state.countries.length ? state.countries.map(countryLabel).join(t('、', ', ')) : t('不限国家／地区', 'Anywhere');
  }

  function genresSummary() {
    return state.genres.length ? state.genres.map(genreLabel).join(t('、', ', ')) : t('不限类型', 'Any genre');
  }

  function genresStatus() {
    return state.genres.length ? t('已选 ' + state.genres.length + ' 类 · ', state.genres.length + ' selected · ') + genresSummary() : t('当前不限类型，可以直接继续。', 'All genres are welcome. You can continue without choosing.');
  }

  function syncGenres() {
    stage.querySelectorAll('.genre-option input').forEach(input => { input.checked = input.value === 'any' ? !state.genres.length : state.genres.includes(input.value); });
    const status = document.getElementById('genre-selection-status');
    if (status) status.textContent = genresStatus();
  }

  function countriesStatus() {
    return state.countries.length ? t('已选 ' + state.countries.length + ' 个 · ', state.countries.length + ' selected · ') + countriesSummary() : t('当前不限国家／地区，可以直接继续。', 'Anywhere is selected. You can continue without narrowing the regions.');
  }

  function countryMoreLabel() {
    const selected = countryOrder.additional.filter(code => state.countries.includes(code)).length;
    return '<span>' + t('更多国家／地区', 'More countries / regions') + '</span><span class="country-more-count">' + (selected ? t('已选 ' + selected, selected + ' selected') : t(countryOrder.additional.length + ' 个选项', countryOrder.additional.length + ' options')) + '</span>';
  }

  function syncCountries() {
    stage.querySelectorAll('.country-option input').forEach(input => { input.checked = input.value === 'any' ? !state.countries.length : state.countries.includes(input.value); });
    const status = document.getElementById('country-selection-status');
    if (status) status.textContent = countriesStatus();
    const summary = stage.querySelector('.country-more summary');
    if (summary) summary.innerHTML = countryMoreLabel();
  }

  function renderQuestions() {
    state.phase = 'questions';
    const questions = questionList(), question = questions[state.question];
    const stepLabels = { desired: t('感受', 'Feeling'), genres: t('类型', 'Genre'), maxMinutes: t('片长', 'Time'), countries: t('地区', 'Region') };
    stage.className = 'stage stage-questions';
    const more = question.additionalOptions || [];
    const countries = question.multi ? (question.key === 'genres' ? '<p class="genre-selection-status" id="genre-selection-status" role="status" aria-live="polite">' + esc(genresStatus()) + '</p>' : '<p class="country-selection-status" id="country-selection-status" role="status" aria-live="polite">' + esc(countriesStatus()) + '</p>') : '';
    const moreMarkup = more.length ? '<details class="country-more" ' + (state.countriesExpanded ? 'open' : '') + '><summary>' + countryMoreLabel() + '</summary><div class="option-list country-options">' + optionMarkup(question, more) + '</div></details>' : '';
    const orderNote = question.key === 'countries' ? '<p class="country-order-note">' + t('常用地区按本片库已核验的高分影片数量排序（豆瓣／IMDb ≥ 8.0），其余地区均可展开选择。', 'Common regions are ordered by this collection’s sourced Douban / IMDb scores of 8.0 or higher. All other regions remain available below.') + '</p>' : '';
    stage.innerHTML = '<section class="question-panel' + (question.multi ? (question.key === 'genres' ? ' genre-panel' : ' country-panel') : '') + '"><p class="eyebrow">' + (question.key === 'genres' ? t('选择电影类型', 'CHOOSE YOUR GENRES') : t('找到此刻的共鸣', 'FIND YOUR FEELING')) + '</p><div class="step-dots" role="list" aria-label="' + t('第 ' + (state.question + 1) + ' 题，共 ' + questions.length + ' 题', 'Question ' + (state.question + 1) + ' of ' + questions.length) + '">' + questions.map((item, index) => '<span role="listitem" class="' + (index === state.question ? 'active' : index < state.question ? 'done' : '') + '"' + (index === state.question ? ' aria-current="step"' : '') + '>' + stepLabels[item.key] + '</span>').join('') + '</div>' + previewNote() + '<h1 id="lab-question-title">' + esc(question.title) + '</h1><p class="question-help" id="lab-question-help">' + esc(question.help) + '</p>' + countries + '<div class="question-choices" role="' + (question.multi ? 'group' : 'radiogroup') + '" aria-labelledby="lab-question-title" aria-describedby="lab-question-help"><div class="option-list' + (question.multi ? (question.key === 'genres' ? ' genre-options' : ' country-options') : '') + '">' + optionMarkup(question, question.options) + '</div>' + moreMarkup + '</div>' + orderNote + '<div class="question-actions"><button class="text-button" data-action="back-question">' + arrow('left') + (state.question ? t('上一题', 'Back') : t('修改心情', 'Edit mood')) + '</button><button class="primary-button" data-action="next-question" ' + (state[question.key] === null ? 'disabled' : '') + '>' + (state.question === questions.length - 1 ? t('遇见电影', 'Find my films') : t('继续', 'Continue')) + arrow('right') + '</button></div></section>';
    updateChrome();
  }

  function generateBatch(refresh = false) {
    if (!engine?.recommendBatch) { announcement(t('推荐功能尚未加载，请刷新重试。', 'The recommendation engine has not loaded. Please refresh.')); return false; }
    if (refresh && state.metadata?.alternativeCount === 0) {
      announcement(t('当前片库中更契合的影片已全部展示，可以调整选择。', 'All fitting films in this collection are already shown. You can edit your choices.'));
      return false;
    }
    const nextRound = state.round + 1;
    const result = engine.recommendBatch(query(), { recommendedIds: state.recommendedIds, recommendationLog: state.recommendationLog }, { size: 7, seed: nextRound, previousIds: state.batch.map(entry => entry.movie.id), dateKey: day(), ratings, refresh });
    if (refresh && !result.changedCount) {
      state.metadata = { ...state.metadata, alternativeCount: 0 };
      renderResults();
      announcement(t('没有找到更多契合的影片，已保留当前推荐。', 'No additional fitting films were found. Your current selection is preserved.'));
      return false;
    }
    state.round = nextRound;
    state.lastRefresh = refresh;
    state.batch = result.entries;
    state.batchKey = queryKey();
    state.metadata = result;
    state.active = 0;
    state.chosenId = null;
    return true;
  }

  function batchNotice() {
    const info = state.metadata;
    if (!info) return '';
    const parts = [t('精选片库 ' + catalog.length + ' 部 · 当前 ' + info.relevantCount + ' 部更契合你的选择。', catalog.length + ' films in this collection · ' + info.relevantCount + ' fit your choices closely.')];
    if (state.lastRefresh) parts.push(t('本次换入 ' + info.changedCount + ' 部，其中 ' + info.freshCount + ' 部此前未推荐。', info.changedCount + ' changed in this selection; ' + info.freshCount + ' have not been recommended before.'));
    if (info.alternativeCount === 0) parts.push(t('这些影片已全部展示，可调整类型、片长或地区探索更多。', 'These films are all shown. Edit genres, running time or regions to explore more.'));
    else if (info.unseenCount === 0) parts.push(t('契合的影片均已推荐过，接下来会轮换较早出现的作品。', 'All close matches have been recommended; further selections rotate earlier films.'));
    else parts.push(t('还有 ' + info.unseenCount + ' 部未推荐，换组会优先带来新选择。', info.unseenCount + ' close matches remain unseen; another selection prioritizes them.'));
    if (info.shortfall) parts.push(t('本组共 ' + state.batch.length + ' 部，类型、片长与地区条件保持不变。', state.batch.length + (state.batch.length === 1 ? ' film' : ' films') + ' in this selection. Your genre, time and region choices stay in place.'));
    return parts.join(' ');
  }

  function ratingMarkup(entry) {
    const quality = entry.quality;
    if (!quality || !safeLink(quality.url)) return '<p class="rating-evidence rating-missing">' + t('演示模式 · 暂无已核验评分', 'Demo mode · No verified rating yet') + '</p>';
    const platform = quality.platform === 'douban' ? t('豆瓣', 'Douban') : 'IMDb';
    return '<p class="rating-evidence"><a href="' + esc(safeLink(quality.url)) + '" target="_blank" rel="noopener noreferrer">' + platform + ' <strong>' + esc(quality.value) + '</strong><span> / 10 ↗</span></a><span class="rating-caption">' + t('已核验快照', 'Sourced snapshot') + (quality.checkedAt ? ' · ' + esc(String(quality.checkedAt).slice(0, 10)) : '') + '</span></p>';
  }

  function renderResults() {
    state.phase = 'results';
    stage.className = 'stage stage-results';
    const entry = state.batch[state.active];
    const header = '<div class="results-header"><p class="eyebrow">' + t('此刻的电影宇宙', 'YOUR CINEMA ORBIT') + '</p><h1>' + t('让一个故事，靠近你。', 'Let a story find you.') + '</h1><p class="lead">' + t('先听见你的心情，再遇见值得看的电影。', 'Your mood comes first. A good story follows.') + '</p>' + previewNote() + '</div><p class="country-result-summary"><button type="button" class="text-button genre-current" data-action="edit-genres">' + esc(t('类型：', 'Genres: ') + genresSummary()) + '<span aria-hidden="true"> ↗</span></button><button type="button" class="text-button country-current" data-action="edit-countries">' + esc(t('国家／地区：', 'Regions: ') + countriesSummary()) + '<span aria-hidden="true"> ↗</span></button></p>';
    if (!entry) {
      stage.innerHTML = '<section class="results-panel">' + header + '<div class="empty-state"><h2>' + t('这次没有符合条件的电影。', 'No films fit these choices yet.') + '</h2><p>' + t('当前精选片库有限；我们会保留你的类型、片长与地区条件。', 'This curated collection is limited. Your genre, running-time and region choices stay in place.') + '</p><button class="primary-button" data-action="edit-answers">' + t('调整选择', 'Edit choices') + '</button></div></section>';
      updateChrome();
      return;
    }
    const movie = entry.movie;
    const source = safeLink(movie.source);
    stage.innerHTML = '<section class="results-panel">' + header + '<div class="film-stage" tabindex="-1" aria-label="' + t('主推荐电影', 'Featured film') + '"><div class="hero-poster-wrap"><img class="hero-poster" src="' + esc(poster(movie)) + '" alt="' + esc(title(movie) + t('海报', ' poster')) + '" width="600" height="900" draggable="false"><span class="poster-tag">' + (state.active === 0 ? t('此刻首选', 'YOUR FIRST PICK') : t('另一段故事', 'ANOTHER STORY')) + '</span></div><div class="hero-copy"><p class="hero-kicker">' + String(state.active + 1).padStart(2, '0') + ' / ' + String(state.batch.length).padStart(2, '0') + ' · ' + t('为此刻而选', 'FOR THIS MOMENT') + '</p><h2 class="film-title">' + esc(title(movie)) + '</h2><p class="film-meta">' + esc(movieMeta(movie)) + '</p><p class="film-reason">' + esc(entry.rationale || entry.shortReason) + '</p><p class="film-synopsis">' + esc(t(movie.pitch, movie.pitchEn || movie.pitch)) + '</p>' + ratingMarkup(entry) + '<div class="film-actions"><button class="primary-button" data-action="choose">' + t('就看这部', 'This is the one') + arrow('right') + '</button>' + (source ? '<a class="text-button" href="' + esc(source) + '" target="_blank" rel="noopener noreferrer">' + t('影片资料 ↗', 'Film source ↗') + '</a>' : '') + '</div></div></div><div class="film-nav"><button class="secondary-button" data-action="previous-film" aria-label="' + t('上一部电影', 'Previous film') + '" ' + (state.batch.length < 2 ? 'disabled' : '') + '>' + arrow('left') + '</button><span class="film-counter">' + String(state.active + 1).padStart(2, '0') + ' <span>/ ' + String(state.batch.length).padStart(2, '0') + '</span></span><button class="secondary-button" data-action="next-film" aria-label="' + t('下一部电影', 'Next film') + '" ' + (state.batch.length < 2 ? 'disabled' : '') + '>' + arrow('right') + '</button></div><div class="film-thumbnails" role="group" aria-label="' + t('本次推荐电影', 'Films in this selection') + '">' + state.batch.map(({ movie: candidate }, index) => '<button class="thumb ' + (index === state.active ? 'active' : '') + '" data-film="' + index + '" aria-pressed="' + (index === state.active) + '" aria-label="' + esc(t('切换到《' + title(candidate) + '》', 'Show ' + title(candidate))) + '"><img src="' + esc(poster(candidate)) + '" alt="" width="80" height="120" draggable="false"><span>' + esc(title(candidate)) + '</span></button>').join('') + '</div><p class="batch-notice" role="status" aria-live="polite">' + esc(batchNotice()) + '</p><div class="result-tools"><button class="text-button" data-action="edit-answers">' + t('调整选择', 'Edit choices') + '</button><button class="text-button" data-action="another-batch" ' + (state.metadata?.alternativeCount === 0 ? 'disabled' : '') + '>' + (state.metadata?.alternativeCount === 0 ? t('暂无更多合适影片', 'No more matching films') : t('换一组故事', 'Another selection')) + '</button></div></section>';
    if (state.recordedRound !== state.round) {
      const shown = state.batch.map(item => item.movie.id);
      state.recommendedIds = [...new Set([...state.recommendedIds, ...shown])];
      state.recommendationLog = [...state.recommendationLog, ...shown].slice(-400);
      state.recordedRound = state.round;
    }
    updateChrome();
  }

  function renderSelected() {
    const movie = film(state.chosenId);
    if (!movie) { renderResults(); return; }
    state.phase = 'selected';
    stage.className = 'stage stage-selected';
    stage.innerHTML = '<section class="selected-panel"><p class="eyebrow">' + t('今晚，就让故事开始', 'LET TONIGHT’S STORY BEGIN') + '</p><img class="selected-poster" src="' + esc(poster(movie)) + '" alt="' + esc(title(movie) + t('海报', ' poster')) + '" width="300" height="450"><h1 class="chosen-title">' + esc(title(movie)) + '</h1><p class="lead">' + t('愿这个故事，陪你度过一个好夜晚。', 'May this story make good company tonight.') + '</p><p class="selection-note">' + (publicMode ? t('已选好今晚的电影', 'Your film for tonight is chosen') : t('选择已确认 · 本实验不会写入正式网站的片单', 'Choice confirmed · This study does not change your main watchlist')) + '</p><div class="button-row"><button class="primary-button" data-action="back-results">' + t('回到电影空间', 'Back to the films') + '</button><button class="text-button" data-action="restart">' + t('重新体验', 'Start again') + '</button></div></section>';
    updateChrome();
  }

  function renderCurrent() {
    ({ mood: renderMood, questions: renderQuestions, results: renderResults, selected: renderSelected }[state.phase] || renderMood)();
  }

  function reset() {
    if (state.busy) return;
    state.mood = ''; state.desired = null; state.genres = []; state.maxMinutes = null; state.countries = []; state.countriesExpanded = false; state.question = 0;
    state.preview = false; state.submitted = false; state.batch = []; state.batchKey = ''; state.metadata = null;
    state.active = 0; state.chosenId = null; state.round = 0; state.recordedRound = 0; state.recommendedIds = []; state.recommendationLog = []; state.lastRefresh = false;
    transition(renderMood);
  }

  function setExample(readyForResults) {
    state.preview = true;
    state.submitted = false;
    state.mood = t('今天有点累，想看温暖一点的故事。', 'I feel tired today and would like a comforting story.');
    state.desired = readyForResults ? 'comfort' : null;
    state.genres = [];
    state.maxMinutes = readyForResults ? 120 : null;
    state.countries = [];
    state.countriesExpanded = false;
    state.question = 0;
  }

  function goToPhase(phase) {
    if (state.busy) return;
    if (phase === 'mood') { transition(renderMood); return; }
    if (phase === 'questions') {
      if (!state.mood || (!state.submitted && !state.preview)) setExample(false);
      state.question = 0;
      transition(renderQuestions);
    } else if (phase === 'results') {
      if (state.desired === null || state.maxMinutes === null || !state.mood) setExample(true);
      if ((!state.metadata || state.batchKey !== queryKey()) && !generateBatch()) return;
      transition(renderResults);
    }
  }

  function switchFilm(index) {
    if (state.busy || state.phase !== 'results' || state.batch.length < 2) return;
    const next = (index + state.batch.length) % state.batch.length;
    if (next === state.active) return;
    state.active = next;
    transition(renderResults, true).then(() => announcement(title(state.batch[state.active].movie) + t('，第 ' + (state.active + 1) + ' 部，共 ' + state.batch.length + ' 部', ', ' + (state.active + 1) + ' of ' + state.batch.length)));
  }

  function fillPrompt() {
    document.getElementById('prompt-title').textContent = state.locale === 'en' ? (prompt.nameEn || prompt.english || theme.toUpperCase() + ' · Motion prompt') : (prompt.name || '动效提示词');
    document.getElementById('prompt-text').textContent = state.locale === 'en' && prompt.textEn ? prompt.textEn : (prompt.text || t('此方案的提示词尚未加载。', 'The prompt for this study has not loaded.'));
    const references = [
      { name: prompt.sourceName, url: prompt.sourceUrl },
      { name: prompt.extraSourceName, url: prompt.extraUrl }
    ].filter(reference => safeLink(reference.url));
    document.getElementById('prompt-source').innerHTML = references.length ? t('参考来源：', 'References: ') + references.map(reference => '<a href="' + esc(safeLink(reference.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(reference.name || reference.url) + ' ↗</a>').join('<span aria-hidden="true"> · </span>') : esc(prompt.sourceName || '');
    document.getElementById('prompt-close').textContent = t('关闭', 'Close');
    document.getElementById('prompt-copy').textContent = t('复制提示词', 'Copy prompt');
    document.getElementById('copy-status').textContent = '';
  }

  function openPrompt(trigger) {
    if (publicMode) return;
    fillPrompt();
    dialogTrigger = trigger || document.getElementById('prompt-open');
    if (!dialog.open) dialog.showModal();
  }

  function closePrompt() {
    dialog.close();
    if (window.location.hash === '#prompt') window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true });
  }

  async function copyPrompt() {
    const text = document.getElementById('prompt-text').textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(text);
      document.getElementById('copy-status').textContent = t('提示词已复制。', 'Prompt copied.');
    } catch (_) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.getElementById('prompt-text'));
      selection.removeAllRanges(); selection.addRange(range);
      let copied = false;
      try { copied = document.execCommand('copy'); } catch (_) { /* Selected text remains available for manual copying. */ }
      document.getElementById('copy-status').textContent = copied ? t('提示词已复制。', 'Prompt copied.') : t('提示词已选中，请按 ⌘C / Ctrl+C 复制。', 'Prompt selected. Press ⌘C / Ctrl+C to copy.');
    }
  }

  document.addEventListener('submit', event => {
    if (event.target.id !== 'lab-mood-form') return;
    event.preventDefault();
    if (state.busy) return;
    const input = document.getElementById('lab-mood-input');
    const value = input.value.trim();
    if (!value) { document.getElementById('mood-error').textContent = t('写下一句心情，再继续。', 'Write a little about your mood to continue.'); input.focus(); return; }
    state.mood = value; state.preview = false; state.submitted = true; state.question = 0;
    state.batch = []; state.batchKey = ''; state.metadata = null;
    transition(renderQuestions);
  });

  document.addEventListener('input', event => {
    if (event.target.id !== 'lab-mood-input') return;
    state.mood = event.target.value;
    document.getElementById('mood-count').textContent = state.mood.length + ' / 240';
    document.getElementById('mood-error').textContent = '';
    event.target.form.querySelector('button[type="submit"]').disabled = !state.mood.trim();
  });
  document.addEventListener('compositionstart', event => { if (event.target.id === 'lab-mood-input') composing = true; });
  document.addEventListener('compositionend', event => { if (event.target.id === 'lab-mood-input') composing = false; });
  document.addEventListener('change', event => {
    if (!event.target.matches('.option-row input') || stage.classList.contains('is-leaving')) return;
    if (event.target.name === 'countries') {
      const value = event.target.value;
      if (value === 'any') state.countries = [];
      else if (allCountries.includes(value)) state.countries = event.target.checked ? [...new Set([...state.countries, value])] : state.countries.filter(code => code !== value);
      syncCountries();
    } else if (event.target.name === 'genres') {
      const value = event.target.value;
      if (value === 'any') state.genres = [];
      else if (Object.hasOwn(genreNames, value)) state.genres = event.target.checked ? [...new Set([...state.genres, value])] : state.genres.filter(id => id !== value);
      syncGenres();
    } else if (['desired', 'maxMinutes'].includes(event.target.name)) {
      state[event.target.name] = event.target.name === 'maxMinutes' ? Number(event.target.value) : event.target.value;
    }
    stage.querySelector('[data-action="next-question"]').disabled = false;
  });
  document.addEventListener('toggle', event => {
    if (event.target.matches?.('.country-more')) state.countriesExpanded = event.target.open;
  }, true);
  document.addEventListener('keydown', event => {
    if (event.target.id === 'lab-mood-input' && event.key === 'Enter' && !event.shiftKey && !event.isComposing && !composing && event.keyCode !== 229) {
      event.preventDefault(); event.target.form.requestSubmit();
    }
    if (!dialog.open && state.phase === 'results' && stage.contains(event.target) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); switchFilm(state.active + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (Date.now() < suppressClickUntil && stage.contains(button)) { event.preventDefault(); return; }
    if (button.id === 'motion-toggle') { state.paused = !state.paused; updateChrome(); return; }
    if (button.id === 'prompt-open') { openPrompt(button); return; }
    if (button.id === 'prompt-close') { closePrompt(); return; }
    if (button.id === 'prompt-copy') { copyPrompt(); return; }
    if (state.busy) return;
    if (button.id === 'particle-replay') { if (particleController()) transition(renderCurrent, true); return; }
    if (button.id === 'locale-toggle') {
      state.locale = state.locale === 'zh' ? 'en' : 'zh';
      if (state.batch.length && engine?.rankBatchCandidates) {
        const localized = new Map(engine.rankBatchCandidates(query(), {}, { seed: state.round, dateKey: day(), ratings }).map(entry => [entry.movie.id, entry]));
        state.batch = state.batch.map(entry => localized.has(entry.movie.id) ? { ...entry, reasons: localized.get(entry.movie.id).reasons, rationale: localized.get(entry.movie.id).rationale, shortReason: localized.get(entry.movie.id).shortReason } : entry);
      }
      renderCurrent(); if (dialog.open) fillPrompt(); return;
    }
    if (button.id === 'restart' || button.dataset.action === 'restart') { reset(); return; }
    if (button.dataset.phase) { goToPhase(button.dataset.phase); return; }
    if (button.dataset.film !== undefined) { switchFilm(Number(button.dataset.film)); return; }
    switch (button.dataset.action) {
      case 'back-question': if (state.question) { state.question -= 1; transition(renderQuestions); } else transition(renderMood); break;
      case 'next-question':
        if (state[questionList()[state.question].key] === null) return;
        if (state.question < questionList().length - 1) { state.question += 1; transition(renderQuestions); }
        else if (generateBatch()) transition(renderResults);
        break;
      case 'previous-film': switchFilm(state.active - 1); break;
      case 'next-film': switchFilm(state.active + 1); break;
      case 'choose': state.chosenId = state.batch[state.active]?.movie.id; if (state.chosenId) transition(renderSelected); break;
      case 'back-results': transition(renderResults); break;
      case 'edit-answers': state.question = 0; transition(renderQuestions); break;
      case 'edit-countries': state.question = questionList().findIndex(question => question.key === 'countries'); transition(renderQuestions); break;
      case 'edit-genres': state.question = questionList().findIndex(question => question.key === 'genres'); transition(renderQuestions); break;
      case 'another-batch': if (generateBatch(true)) transition(renderResults, true); break;
    }
  });

  stage.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' && state.phase === 'results' && event.target.closest('.film-stage')) touch = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  document.addEventListener('pointerup', event => {
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) { suppressClickUntil = Date.now() + 450; switchFilm(state.active + (dx < 0 ? 1 : -1)); }
  });
  document.addEventListener('pointercancel', () => { touch = null; });
  dialog.addEventListener('cancel', event => { event.preventDefault(); closePrompt(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closePrompt();
  });
  reducedMotion.addEventListener('change', updateChrome);
  window.addEventListener('hashchange', () => { if (window.location.hash === '#prompt') openPrompt(); });
  renderMood();
  if (window.location.hash === '#prompt') openPrompt();
}());
