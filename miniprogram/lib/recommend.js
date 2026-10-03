(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog'));
  else root.MovieHunterRecommend = factory(root.MovieHunterCatalog);
}(typeof window !== 'undefined' ? window : this, function (catalog) {
  'use strict';

  var options = {
    moods: [
      { id: 'tired', label: '有点疲惫' }, { id: 'low', label: '情绪低落' },
      { id: 'restless', label: '心有点乱' }, { id: 'good', label: '心情不错' },
      { id: 'curious', label: '充满好奇' }, { id: 'calm', label: '平静放空' }
    ],
    desired: [
      { id: 'comfort', label: '被治愈' }, { id: 'joy', label: '开怀笑' },
      { id: 'thrill', label: '来点刺激' }, { id: 'think', label: '有所思考' },
      { id: 'release', label: '释放情绪' }
    ],
    genres: [
      { id: 'drama', label: '剧情' }, { id: 'comedy', label: '喜剧' },
      { id: 'romance', label: '爱情' }, { id: 'animation', label: '动画' },
      { id: 'scifi', label: '科幻' }, { id: 'mystery', label: '悬疑' },
      { id: 'adventure', label: '冒险' }, { id: 'music', label: '音乐' }
    ],
    durations: [
      { value: 0, label: '不限时长' }, { value: 90, label: '90 分钟内' },
      { value: 120, label: '2 小时内' }, { value: 180, label: '3 小时内' }
    ]
  };

  var genreWords = {
    drama: ['剧情'], comedy: ['喜剧', '搞笑'], romance: ['爱情', '恋爱', '浪漫'],
    animation: ['动画', '动漫'], scifi: ['科幻'], mystery: ['悬疑', '推理'],
    adventure: ['冒险'], music: ['音乐', '歌舞']
  };
  var desireWords = {
    comfort: ['治愈', '温暖', '放松'], joy: ['开心', '快乐', '轻松', '搞笑'],
    thrill: ['刺激', '紧张'], think: ['思考', '烧脑'], release: ['感动', '哭', '释放']
  };
  var negation = '(?:不想|不喜欢|不要|不爱|不看|别|拒绝|避免)(?:看|要|再|太|很|什么|任何|一点|有|关于|的|\\s){0,8}';

  function strings(value) {
    return Array.isArray(value) ? value.filter(function (item) { return typeof item === 'string'; }) : [];
  }

  function normalized(query) {
    query = query || {};
    var minutes = Number(query.maxMinutes);
    return {
      mood: typeof query.mood === 'string' ? query.mood : '',
      desired: typeof query.desired === 'string' ? query.desired : '',
      genres: strings(query.genres).filter(function (id, index, list) { return list.indexOf(id) === index; }).sort(),
      maxMinutes: isFinite(minutes) && minutes > 0 ? minutes : 0,
      note: typeof query.note === 'string' ? query.note.trim().replace(/\s+/g, ' ').slice(0, 300) : ''
    };
  }

  function queryKey(query) { return JSON.stringify(normalized(query)); }

  function dateKey(date) {
    date = date || new Date();
    function pad(value) { return value < 10 ? '0' + value : String(value); }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function label(group, id) {
    var item = options[group].filter(function (entry) { return entry.id === id; })[0];
    return item ? item.label : '';
  }

  function hash(value) {
    var result = 2166136261;
    for (var index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function parseNote(note, effectiveCatalog) {
    var avoidedGenres = [];
    var avoidedWords = [];
    var positiveNote = note;
    var allWords = [];
    Object.keys(genreWords).forEach(function (id) { allWords = allWords.concat(genreWords[id]); });
    Object.keys(desireWords).forEach(function (id) { allWords = allWords.concat(desireWords[id]); });
    effectiveCatalog.forEach(function (movie) { allWords = allWords.concat(movie.keywords); });
    allWords = allWords.filter(function (word, index, list) { return list.indexOf(word) === index; });
    allWords.sort(function (a, b) { return b.length - a.length; });

    // Keep coordinated terms inside a negation, but stop before a new clause.
    var wordPattern = '(?:' + allWords.join('|') + ')';
    var termPattern = wordPattern + '(?:电影|片)?';
    var negativeGroup = negation + '(' + termPattern + '(?:\\s*(?:和|或|以及|、)\\s*' + termPattern + ')*)';
    positiveNote = positiveNote.replace(new RegExp(negativeGroup, 'g'), function (match, phrase) {
      var words = phrase.match(new RegExp(wordPattern, 'g')) || [];
      words.forEach(function (word) {
        avoidedWords.push(word);
        Object.keys(genreWords).forEach(function (id) {
          if (genreWords[id].indexOf(word) !== -1) avoidedGenres.push(id);
        });
      });
      return ' ';
    });
    // A negated feeling is not a positive request or a film exclusion.
    // Remove only that occurrence so a later wish such as “想开心一点” survives.
    positiveNote = positiveNote.replace(/(?:不是|并不|没有|不再|没|不)(?:觉得|感觉|感到|那么|这么|太|很|有点|一点|再|怎么|特别|非常|\s){0,4}(?:开心|快乐|轻松|放松|紧张|感动|孤独)/g, ' ');
    return { positive: positiveNote, avoidedGenres: avoidedGenres, avoidedWords: avoidedWords };
  }

  function containsAny(list, other) {
    return list.some(function (value) { return other.indexOf(value) !== -1; });
  }

  function rankMovies(query, history, context) {
    var current = normalized(query);
    history = history || {};
    context = context || {};
    var effectiveCatalog = Array.isArray(context.catalog) ? context.catalog : catalog;
    var excluded = strings(history.seenIds).concat(strings(history.dislikedIds), strings(history.excludeIds));
    var liked = strings(history.likedIds);
    var likedGenres = [];
    effectiveCatalog.forEach(function (movie) {
      if (liked.indexOf(movie.id) !== -1) likedGenres = likedGenres.concat(movie.genres);
    });
    var note = parseNote(current.note, effectiveCatalog);
    var day = context.dateKey || dateKey();
    var salt = day + '|' + queryKey(current) + '|' + (context.seed || 0);

    return effectiveCatalog.filter(function (movie) {
      if (excluded.indexOf(movie.id) !== -1) return false;
      if (current.maxMinutes && (!movie.minutes || movie.minutes > current.maxMinutes)) return false;
      if (current.genres.length && !containsAny(movie.genres, current.genres)) return false;
      if (containsAny(movie.genres, note.avoidedGenres)) return false;
      if (containsAny(movie.keywords, note.avoidedWords)) return false;
      return true;
    }).map(function (movie) {
      var score = 0;
      var reasons = [];
      if (movie.desired.indexOf(current.desired) !== -1) {
        score += 36;
        reasons.push('你想「' + label('desired', current.desired) + '」，这部片的气质与之接近。');
      }
      if (movie.moods.indexOf(current.mood) !== -1) {
        score += 20;
        reasons.push('可以作为「' + label('moods', current.mood) + '」时的一种观影选择。');
      }
      var matchedWords = movie.keywords.filter(function (word) { return note.positive.indexOf(word) !== -1; });
      movie.genres.forEach(function (genre) {
        genreWords[genre].forEach(function (word) {
          if (note.positive.indexOf(word) !== -1 && matchedWords.indexOf(word) === -1) matchedWords.push(word);
        });
      });
      movie.desired.forEach(function (desire) {
        desireWords[desire].forEach(function (word) {
          if (note.positive.indexOf(word) !== -1 && matchedWords.indexOf(word) === -1) matchedWords.push(word);
        });
      });
      if (matchedWords.length) {
        score += Math.min(matchedWords.length, 4) * 12;
        reasons.unshift('匹配了你提到的「' + matchedWords.slice(0, 2).join('、') + '」。');
      }
      var similarGenres = movie.genres.filter(function (genre) { return likedGenres.indexOf(genre) !== -1; });
      if (similarGenres.length) {
        score += Math.min(similarGenres.length, 2) * 6;
        reasons.push('与已标记喜欢的影片有「' + label('genres', similarGenres[0]) + '」类型上的交集。');
      }
      if (current.maxMinutes) reasons.push('片长 ' + movie.minutes + ' 分钟，在你选择的时间内。');
      if (current.genres.length) {
        var selected = movie.genres.filter(function (genre) { return current.genres.indexOf(genre) !== -1; });
        reasons.push('属于你选择的「' + selected.map(function (genre) { return label('genres', genre); }).join('、') + '」类型。');
      }
      if (!reasons.length) reasons.push('从当前片库中选出的一部，看看这段故事是否让你感兴趣。');
      return { movie: movie, score: score, reasons: reasons.slice(0, 3) };
    }).sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      var difference = hash(salt + '|' + a.movie.id) - hash(salt + '|' + b.movie.id);
      return difference || a.movie.id.localeCompare(b.movie.id);
    });
  }

  return { rankMovies: rankMovies, options: options, dateKey: dateKey, queryKey: queryKey };
}));
