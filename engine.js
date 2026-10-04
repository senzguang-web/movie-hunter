(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../miniprogram/lib/recommend'), require('./data/catalog'));
  else root.MovieHunterWebEngine = factory(root.MovieHunterRecommend, root.MovieHunterWorldCatalog || root.MovieHunterCatalog);
}(typeof window !== 'undefined' ? window : this, function (recommendEngine, catalog) {
  'use strict';

  var moods = [
    { id: 'low', label: '有些低落', words: ['心情不好', '不开心', '不快乐', '开心不起来', '难过', '低落', '沮丧', '失落', '失恋', '孤独', '难受', '想哭', '伤心'] },
    { id: 'tired', label: '有点疲惫', words: ['精疲力尽', '筋疲力尽', '累坏', '好累', '疲惫', '疲倦', '没精神', '没力气', '加班', '心累', '犯困', '好困', '很困', '有点困', '累'] },
    { id: 'restless', label: '心有点乱', words: ['静不下来', '心很乱', '心乱', '焦虑', '烦躁', '烦恼', '烦心', '紧张', '压力', '坐立不安', '烦'] },
    { id: 'good', label: '心情不错', words: ['心情不错', '心情很好', '开心', '快乐', '兴奋', '高兴', '愉快', '幸福'] },
    { id: 'curious', label: '充满好奇', words: ['充满好奇', '好奇', '探索', '求知', '新鲜事', '开眼界'] },
    { id: 'calm', label: '平静放空', words: ['平静', '放空', '安静', '独处', '惬意', '悠闲', '平淡'] }
  ];
  var englishMoods = {
    low: { label: 'Feeling low', words: ['not happy', 'unhappy', 'sad', 'lonely', 'heartbroken', 'feeling down'] },
    tired: { label: 'Feeling tired', words: ['tired', 'exhausted', 'worn out', 'drained', 'sleepy'] },
    restless: { label: 'Feeling unsettled', words: ['stressed', 'anxious', 'restless', 'overwhelmed', 'tense'] },
    good: { label: 'In a good mood', words: ['happy', 'joyful', 'excited', 'cheerful'] },
    curious: { label: 'Feeling curious', words: ['curious', 'inquisitive'] },
    calm: { label: 'Feeling calm', words: ['calm', 'peaceful', 'relaxed'] }
  };
  var englishGenres = { drama: 'drama', comedy: 'comedy', romance: 'romance', animation: 'animation', scifi: 'science fiction', mystery: 'mystery', adventure: 'adventure', music: 'music' };
  var countryNames = {
    CN: ['中国大陆', 'Mainland China'], HK: ['中国香港', 'Hong Kong'], TW: ['中国台湾', 'Taiwan'], JP: ['日本', 'Japan'], KR: ['韩国', 'South Korea'], IN: ['印度', 'India'], IR: ['伊朗', 'Iran'],
    FR: ['法国', 'France'], DE: ['德国', 'Germany'], IT: ['意大利', 'Italy'], ES: ['西班牙', 'Spain'], GB: ['英国', 'United Kingdom'], US: ['美国', 'United States'], MX: ['墨西哥', 'Mexico'], BR: ['巴西', 'Brazil'],
    AR: ['阿根廷', 'Argentina'], DK: ['丹麦', 'Denmark'], SE: ['瑞典', 'Sweden'], CA: ['加拿大', 'Canada'], AU: ['澳大利亚', 'Australia'], IE: ['爱尔兰', 'Ireland'], NZ: ['新西兰', 'New Zealand'], AT: ['奥地利', 'Austria'], PL: ['波兰', 'Poland'], LU: ['卢森堡', 'Luxembourg']
  };

  function countryLabel(code, locale) { return countryNames[code] ? countryNames[code][locale === 'en' ? 1 : 0] : code; }

  function validOption(group, value) {
    return recommendEngine.options[group].some(function (item) { return item.id === value; });
  }

  function analyzeMood(text, locale) {
    text = typeof text === 'string' ? text.trim().slice(0, 300) : '';
    // A future wish can contain a feeling without describing the present.
    // Keep independent clauses and any real feeling before the wish. Only this
    // analysis copy changes; buildQuery keeps the original note for exclusions.
    text = text.split(/([，。！？；\n,;.!?])/).map(function (clause) {
      return clause.replace(/(?:希望|但愿|想要|想让|\b(?:wish|hope|want|would like)\b).*$/i, '');
    }).join('');
    var matches = [];
    moods.forEach(function (mood, priority) {
      mood.words.forEach(function (word) {
        var index = text.indexOf(word);
        while (index !== -1) {
          var before = text.slice(Math.max(0, index - 12), index);
          // A wish or a negated feeling is not evidence of the current feeling.
          var denied = /(?:不是|并不|没有|不再|不想|不要|别|没|不)(?:觉得|感觉|感到|那么|这么|太|很|有点|一点|再|怎么|\s){0,4}$/.test(before.replace(/特别/g, '非常'));
          if (word === '累' && /积$/.test(before)) denied = true;
          var wished = /(?:想要|希望|想|要)(?:变得|变|更|能|让自己|自己|一点|\s){0,3}$/.test(before);
          if (!denied && !wished) matches.push({ mood: mood, index: index, length: word.length, priority: priority });
          index = text.indexOf(word, index + word.length);
        }
      });
      var lowerText = text.toLowerCase().replace(/’/g, "'");
      englishMoods[mood.id].words.forEach(function (word) {
        var expression = new RegExp('\\b' + word.replace(/ /g, '\\s+') + '\\b', 'g');
        var match;
        while ((match = expression.exec(lowerText))) {
          var before = lowerText.slice(Math.max(0, match.index - 80), match.index);
          var after = lowerText.slice(match.index + match[0].length);
          var denied = /\b(?:not|never|no longer|don't|do not|isn't|aren't|wasn't|was not|am not|can't|cannot)(?:\s+(?:feel|feeling|really|very|so|that|particularly|quite|too))*\s*$/.test(before);
          var wished = /\b(?:wish|hope|want|would like|trying|try|make me)(?:\s+(?:i|to|be|feel|felt|were|was|am|i'm|could|can|a|bit|more|less|again|really|just|become|feeling|much))*\s*$/.test(before);
          var describesFilm = /^\s+(?:film|movie|story|ending|stories|movies|films)\b/.test(after);
          if (!denied && !wished && !describesFilm) matches.push({ mood: mood, index: match.index, length: match[0].length, priority: priority });
        }
      });
    });
    // Do not let “开心” inside “不开心” override the actual phrase.
    matches = matches.filter(function (match) {
      return !matches.some(function (other) {
        return other.length > match.length && other.index <= match.index && other.index + other.length >= match.index + match.length;
      });
    });
    if (!matches.length) return locale === 'en' ? { id: '', label: 'You decide', message: 'That does not give us a clear mood yet. Choose how you would like a film to make you feel.' } : { id: '', label: '由你来定', message: '这句话还不足以判断你的心情。接下来按你想要的观影感受来选。' };
    matches.sort(function (a, b) { return a.priority - b.priority || a.index - b.index || b.length - a.length; });
    var picked = matches[0].mood;
    if (locale === 'en') return { id: picked.id, label: englishMoods[picked.id].label, message: 'We will start with "' + englishMoods[picked.id].label.toLowerCase() + '". Your next choices can adjust the direction.' };
    return { id: picked.id, label: picked.label, message: '从你提到的感受，先按「' + picked.label + '」来找。你可以在接下来的选择里调整方向。' };
  }

  function buildQuery(input) {
    input = input || {};
    var text = typeof input.text === 'string' ? input.text.trim().slice(0, 300) : '';
    var rawGenres = Array.isArray(input.genres) ? input.genres : (input.genre ? [input.genre] : []);
    var genres = rawGenres.filter(function (id, index, list) {
      return typeof id === 'string' && id !== 'any' && id !== 'all' && id !== '' && list.indexOf(id) === index;
    });
    var minutes = Number(input.maxMinutes);
    return {
      mood: validOption('moods', input.mood) ? input.mood : analyzeMood(text).id,
      desired: validOption('desired', input.desired) ? input.desired : '',
      genres: genres,
      countries: (Array.isArray(input.countries) ? input.countries : []).filter(function (code) { return typeof code === 'string' && code.trim(); }).map(function (code) { return code.trim().toUpperCase(); }).filter(function (code, index, list) { return list.indexOf(code) === index; }).sort(),
      locale: input.locale === 'en' ? 'en' : 'zh',
      maxMinutes: isFinite(minutes) && minutes > 0 ? minutes : 0,
      note: text
    };
  }

  function ids(value) { return Array.isArray(value) ? value.filter(function (id) { return typeof id === 'string'; }) : []; }

  // These editorial angles use only the local catalog's synopsis and themes.
  // The evidence tags prevent a stale angle being reused for a different record.
  var filmAngles = {
    soul: [['爵士', '生活'], '爵士乐与平凡日常', '爵士乐与生活小事交织，把对梦想的执着，放回怎样度过每一天的问题里。'],
    coco: [['亲情', '回忆'], '音乐里的亲情与回忆', '音乐连接着亲情与回忆，适合把注意力留给家人、梦想，以及那些不愿忘记的人。'],
    amelie: [['巴黎', '孤独'], '巴黎日常里的善意与相遇', '它用巴黎日常中的小小善意回应孤独，给人与人之间的靠近留出轻巧的想象。'],
    'walter-mitty': [['旅行', '勇气'], '远行的风景与出发的勇气', '风景和远行之外，它关心的是从想象迈向行动的那一步，适合想暂时离开惯常节奏的夜晚。'],
    intouchables: [['友情', '幽默'], '玩笑中慢慢生长的友情', '友情在磨合与玩笑里慢慢生长，温暖来自两个不同的人愿意理解彼此。'],
    'little-miss-sunshine': [['家庭', '失败'], '一家人面对失败的幽默与勇气', '它把家庭、失败与幽默放在一起，让人生的不顺遂也拥有被陪伴的余地。'],
    'about-time': [['时间', '亲情'], '时间、爱情与家人的分量', '时间的想象最终落回爱情与亲情，留下的是如何看待遗憾、珍惜日常的回味。'],
    'grand-budapest': [['复古', '荒诞'], '复古色彩里的荒诞冒险', '复古色彩、荒诞幽默和冒险交织，适合想让想象力离开熟悉日常的时候。'],
    'perfect-days': [['日常', '慢节奏'], '慢下来的日常与独处', '慢节奏与独处是它的底色，细小的日常变化比戏剧性的转折更值得留意。'],
    'sing-street': [['青春', '乐队'], '青春乐队里的梦想与勇气', '青春、摇滚与成长连在一起，音乐成为表达自己、认真对待梦想的一种方式。'],
    'singin-rain': [['歌舞', '轻松'], '把困境跳成歌舞的轻快', '歌舞与幽默让面对变化这件事变得轻快，适合想把注意力交给旋律和动作的夜晚。'],
    'paddington-2': [['善良', '幽默'], '邻里之间的善意与幽默', '邻里之间的善意和幽默是故事的温度，平常的关心也能成为值得认真对待的大事。'],
    inception: [['梦境', '反转'], '层层梦境里的冒险与反转', '梦境、反转与冒险需要你跟着线索保持注意，适合愿意把今晚交给复杂想象的时候。'],
    'knives-out': [['侦探', '谜题'], '带着幽默的侦探谜题', '侦探谜题与幽默并行，乐趣在于比较不同说法、追踪细节，而不是急着得到答案。'],
    'truman-show': [['自由', '现实'], '对现实与自由的追问', '它从日常里的不协调感走向对现实与自由的追问，适合愿意重新打量熟悉生活的时候。'],
    'groundhog-day': [['循环', '改变'], '循环日常中的幽默与改变', '循环的设定把幽默与改变放在一起，让“如何对待眼前的人和事”变成可以反复思量的问题。'],
    interstellar: [['宇宙', '亲情'], '宇宙远行里的亲情与牵挂', '宇宙想象与亲情互相牵引，探索的尺度很大，对家人的牵挂却始终具体。'],
    arrival: [['语言', '沟通'], '语言、时间与理解的可能', '语言和沟通构成它的思考入口，科幻想象里更值得留意的是理解陌生者的可能。'],
    'spirited-away': [['成长', '勇气'], '奇幻世界里的成长与勇气', '奇幻冒险背后是成长与勇气：面对陌生环境时，如何辨别善意并学着依靠自己。'],
    totoro: [['童年', '自然'], '乡间自然与童年的想象', '自然、家庭与童年的想象构成安静的底色，等待和日常也有值得停下来留意的部分。'],
    'fantastic-mr-fox': [['定格', '机智'], '定格世界里的机智与荒诞', '定格动画把机智、家庭和荒诞冒险揉在一起，适合想在奇想与幽默间换换心情的时候。'],
    'before-sunrise': [['对话', '相遇'], '相遇之后的散步与对话', '相遇和对话是它的重心，爱情更多藏在彼此倾听、交换想法的细节里。'],
    '12-angry-men': [['法庭', '人性'], '证据、判断与人性的交锋', '证据与偏见在对话中交锋，悬念来自人怎样形成判断，适合想认真跟随推理的夜晚。'],
    'chungking-express': [['孤独', '城市'], '城市夜晚里的孤独与相遇', '城市、孤独与偶然相遇交织，给尚未散去的心事留出可以慢慢体会的距离。']
  };
  var goalCopy = {
    comfort: { label: '被温柔治愈', lead: '想找一点温暖，可以走近' },
    joy: { label: '开怀一笑', lead: '想轻松笑一会儿，试试' },
    release: { label: '释放情绪', lead: '想给情绪一个出口，可以走近' },
    thrill: { label: '感受刺激', lead: '想感受刺激，试试' },
    think: { label: '获得思考', lead: '想留点思考，可以看看' }
  };
  var englishGoals = {
    comfort: { label: 'find some comfort', lead: 'For a little warmth' }, joy: { label: 'have a good laugh', lead: 'For a lighter evening' },
    release: { label: 'let your feelings out', lead: 'For an emotional release' }, thrill: { label: 'feel some excitement', lead: 'For a sense of excitement' },
    think: { label: 'have something to think about', lead: 'For something to reflect on' }
  };

  // Explicit English genre exclusions remain hard limits. Parsing does not depend
  // on the UI language, so switching language cannot change the recommendation.
  function englishExcludedGenres(note) {
    var aliases = { drama: ['drama'], comedy: ['comedy', 'comedies'], romance: ['romance', 'romantic'], animation: ['animation', 'animated', 'anime'], scifi: ['science fiction', 'sci-fi', 'sci fi'], mystery: ['mystery', 'mysteries'], adventure: ['adventure'], music: ['musical', 'musicals'] };
    var byWord = {};
    Object.keys(aliases).forEach(function (genre) { aliases[genre].forEach(function (word) { byWord[word] = genre; }); });
    var words = Object.keys(byWord).sort(function (a, b) { return b.length - a.length; });
    var wordPattern = '(?:' + words.join('|') + ')\\b';
    var term = wordPattern + '(?:\\s+(?:films?|movies?|stories))?';
    var expression = new RegExp("\\b(?:no|avoid|without|skip|not|don't want|do not want|don't like|do not like|not in the mood for|don't feel like|do not feel like)(?:\\s+(?:any|a|an|watching|watch|to|see|seeing|more|really))*\\s+(" + term + '(?:\\s*(?:,|or|and)\\s*' + term + ')*)', 'gi');
    var excluded = [];
    var text = note.toLowerCase().replace(/’/g, "'");
    var match;
    while ((match = expression.exec(text))) {
      var found = match[1].match(new RegExp(wordPattern, 'g')) || [];
      found.forEach(function (word) { if (excluded.indexOf(byWord[word]) === -1) excluded.push(byWord[word]); });
    }
    return excluded;
  }

  function optionLabel(group, id) {
    var item = recommendEngine.options[group].filter(function (option) { return option.id === id; })[0];
    return item ? item.label : '';
  }

  function explainEnglish(movie, query, likedMovies) {
    var goal = englishGoals[query.desired];
    var goalMatches = goal && movie.desired.indexOf(query.desired) !== -1;
    var title = movie.titleEn || movie.originalTitle || 'this film';
    var shortReason = movie.angleEn ? movie.angleEn.replace(/[.!?]$/, '') + (goal && !goalMatches ? ' — another direction to explore tonight.' : '.') : (goalMatches ? goal.lead + ': ' + title + '.' : title + ' offers another direction to explore tonight.');
    var sentences = [];
    if (goalMatches) {
      var mood = englishMoods[query.mood];
      var moodContext = mood && movie.moods.indexOf(query.mood) !== -1 ? 'With you ' + mood.label.toLowerCase() + ', ' : '';
      sentences.push(moodContext + (moodContext ? 'this' : 'This') + ' choice follows your wish to ' + goal.label + '.');
    } else if (goal) {
      var alternatives = movie.desired.map(function (id) { return englishGoals[id] && englishGoals[id].label; }).filter(Boolean);
      sentences.push('You wanted to ' + goal.label + '; this film leans more toward helping you ' + (alternatives.slice(0, 2).join(' or ') || 'explore a different feeling') + ', so consider it an alternative.');
    }
    if (movie.angleEn) sentences.push(movie.angleEn.replace(/[.!?]$/, '') + '.');
    var selectedGenres = movie.genres.filter(function (id) { return query.genres.indexOf(id) !== -1; }).map(function (id) { return englishGenres[id]; }).filter(Boolean);
    if (selectedGenres.length) sentences.push('It fits your ' + selectedGenres.join(' / ') + ' selection.');
    var selectedCountries = (movie.countries || []).filter(function (code) { return query.countries.indexOf(code) !== -1; });
    if (selectedCountries.length) sentences.push('Its production countries/regions include ' + selectedCountries.map(function (code) { return countryLabel(code, 'en'); }).join(' / ') + ', matching your selection.');
    if (query.maxMinutes && movie.minutes) sentences.push('At ' + movie.minutes + ' minutes, it fits within your ' + query.maxMinutes + '-minute limit.');
    var similar = likedMovies.filter(function (liked) { return liked.id !== movie.id && liked.genres.some(function (genre) { return movie.genres.indexOf(genre) !== -1; }); })[0];
    if (similar) {
      var shared = movie.genres.filter(function (genre) { return similar.genres.indexOf(genre) !== -1; }).map(function (genre) { return englishGenres[genre]; }).filter(Boolean);
      sentences.push('You liked ' + (similar.titleEn || similar.originalTitle || 'another film') + ', which also features ' + shared.slice(0, 2).join(' / ') + '; that shared genre is another reason to explore this one.');
    }
    if (!sentences.length) sentences.push('Read its synopsis and see whether this is a story you would like to spend time with.');
    return { shortReason: shortReason, rationale: sentences.join(' '), reasons: sentences.slice(0, 3) };
  }

  function explain(movie, query, likedMovies) {
    if (query.locale === 'en') return explainEnglish(movie, query, likedMovies);
    var angle = filmAngles[movie.id];
    var hasAngle = angle && angle[0].every(function (word) { return movie.keywords.indexOf(word) !== -1; }) && movie.pitch;
    var types = movie.genres.map(function (id) { return optionLabel('genres', id); }).filter(Boolean);
    var focus = hasAngle ? angle[1] : (types.length ? '这部' + types.slice(0, 2).join('、') + '电影' : '这个故事');
    var goal = goalCopy[query.desired];
    var goalMatches = goal && movie.desired.indexOf(query.desired) !== -1;
    var shortReason = goalMatches ? goal.lead + focus + '。' : focus + '，是今晚可以探索的另一种方向。';
    if (!hasAngle && movie.angleZh) shortReason = movie.angleZh.replace(/[。！？]$/, '') + (goal && !goalMatches ? '，是今晚可以探索的另一种方向。' : '。');
    var sentences = [];
    if (goalMatches) {
      var mood = moods.filter(function (item) { return item.id === query.mood; })[0];
      var moodContext = mood && movie.moods.indexOf(mood.id) !== -1 ? '从你表达的「' + mood.label + '」出发，' : '';
      sentences.push(moodContext + '这次沿着你想「' + goal.label + '」的方向来选。');
    } else if (goal) {
      var alternatives = movie.desired.map(function (id) { return goalCopy[id] && goalCopy[id].label; }).filter(Boolean);
      sentences.push('你希望「' + goal.label + '」，这部更偏向' + (alternatives.length ? '「' + alternatives.slice(0, 2).join('、') + '」' : '另一种观影感受') + '，可以留作另一种选择。');
    }
    if (hasAngle) sentences.push(angle[2]);
    else if (movie.angleZh) sentences.push(movie.angleZh.replace(/[。！？]$/, '') + '。');
    var selectedGenres = movie.genres.filter(function (id) { return query.genres.indexOf(id) !== -1; }).map(function (id) { return optionLabel('genres', id); });
    var constraints = [];
    if (selectedGenres.length) constraints.push('属于你选的' + selectedGenres.join('、') + '类型');
    var selectedCountries = (movie.countries || []).filter(function (code) { return query.countries.indexOf(code) !== -1; });
    if (selectedCountries.length) constraints.push('制片国家／地区包括你选择的' + selectedCountries.map(function (code) { return countryLabel(code, 'zh'); }).join('、'));
    if (query.maxMinutes && movie.minutes) constraints.push('片长 ' + movie.minutes + ' 分钟，在你留出的 ' + query.maxMinutes + ' 分钟以内');
    if (constraints.length) sentences.push(constraints.join('，') + '。');
    var similar = likedMovies.filter(function (liked) {
      return liked.id !== movie.id && liked.genres.some(function (genre) { return movie.genres.indexOf(genre) !== -1; });
    })[0];
    if (similar) {
      var shared = movie.genres.filter(function (genre) { return similar.genres.indexOf(genre) !== -1; }).map(function (id) { return optionLabel('genres', id); });
      sentences.push('你喜欢的《' + similar.title + '》也属于' + shared.slice(0, 2).join('、') + '类型，这是一条可以继续探索的线索。');
    }
    if (!sentences.length) sentences.push(types.length ? '可以先从这部' + types.join('、') + '电影的简介，看看是否有想走近的故事。' : '可以先看看简介，再决定是否想走进这个故事。');
    return { shortReason: shortReason, rationale: sentences.join('') };
  }

  function recommend(input, history, context) {
    history = history || {};
    context = context || {};
    var effectiveCatalog = Array.isArray(context.catalog) ? context.catalog : catalog;
    var query = buildQuery(input);
    var preferences = {
      seenIds: ids(history.seenIds).concat(ids(history.seen)),
      likedIds: ids(history.likedIds).concat(ids(history.liked)),
      dislikedIds: ids(history.dislikedIds).concat(ids(history.rejectedIds), ids(history.rejected)),
      excludeIds: ids(history.excludeIds)
    };
    var likedMovies = (effectiveCatalog || []).filter(function (movie) {
      return preferences.likedIds.indexOf(movie.id) !== -1 && preferences.dislikedIds.indexOf(movie.id) === -1;
    });
    var excludedGenres = englishExcludedGenres(query.note);
    var rankingContext = { dateKey: context.dateKey, seed: context.seed, catalog: effectiveCatalog };
    return recommendEngine.rankMovies(query, preferences, rankingContext).filter(function (entry) {
      if (query.countries.length && !(entry.movie.countries || []).some(function (code) { return query.countries.indexOf(code) !== -1; })) return false;
      return !entry.movie.genres.some(function (genre) { return excludedGenres.indexOf(genre) !== -1; });
    }).map(function (entry) {
      var explanation = explain(entry.movie, query, likedMovies);
      return { movie: entry.movie, score: entry.score, reasons: query.locale === 'en' ? explanation.reasons : entry.reasons, shortReason: explanation.shortReason, rationale: explanation.rationale };
    });
  }

  // English topic aliases connect the same editorial tags used by Chinese
  // input. They are a bounded matching vocabulary, not generated film facts.
  var batchTopics = [
    { label: ['爵士', 'jazz'], aliases: ['jazz'], keywords: ['爵士'] },
    { label: ['音乐', 'music'], aliases: ['music', 'musical', 'musicals', 'singing', 'dancing'], genres: ['music'] },
    { label: ['乐队', 'bands'], aliases: ['band', 'bands', 'rock music'], keywords: ['乐队', '摇滚'] },
    { label: ['太空', 'space'], aliases: ['space', 'cosmos', 'universe', 'astronaut', 'astronauts'], keywords: ['宇宙', '太空'] },
    { label: ['外星生命', 'alien contact'], aliases: ['alien', 'aliens', 'alien contact'], keywords: ['外星'] },
    { label: ['亲情', 'family'], aliases: ['family', 'parents', 'siblings'], keywords: ['家庭', '亲情', '兄妹'] },
    { label: ['友情', 'friendship'], aliases: ['friendship', 'friendships'], keywords: ['友情', '友谊'] },
    { label: ['旅行', 'travel'], aliases: ['travel', 'travelling', 'traveling', 'road trip', 'road trips'], keywords: ['旅行', '公路'] },
    { label: ['爱情', 'romance'], aliases: ['romance', 'romantic', 'love story', 'love stories'], genres: ['romance'] },
    { label: ['悬疑', 'mystery'], aliases: ['mystery', 'mysteries', 'detective', 'whodunit'], genres: ['mystery'] },
    { label: ['科幻', 'science fiction'], aliases: ['science fiction', 'sci-fi', 'sci fi'], genres: ['scifi'] },
    { label: ['动画', 'animation'], aliases: ['animation', 'animated', 'anime', 'cartoon', 'cartoons'], genres: ['animation'] },
    { label: ['喜剧', 'comedy'], aliases: ['comedy', 'comedies', 'funny'], genres: ['comedy'] },
    { label: ['冒险', 'adventure'], aliases: ['adventure', 'adventures'], genres: ['adventure'] },
    { label: ['自然', 'nature'], aliases: ['nature', 'countryside', 'forest', 'forests'], keywords: ['自然', '乡村'] },
    { label: ['童年', 'childhood'], aliases: ['childhood'], keywords: ['童年'] },
    { label: ['回忆', 'memories'], aliases: ['memory', 'memories', 'nostalgia'], keywords: ['回忆', '记忆', '乡愁'] },
    { label: ['社会', 'society'], aliases: ['society', 'social inequality', 'class inequality'], keywords: ['社会', '阶层'] },
    { label: ['法庭', 'courtroom stories'], aliases: ['courtroom', 'jury', 'jurors'], keywords: ['法庭'] }
  ];

  function regexEscape(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function topicExpression(topic) { return new RegExp('\\b(?:' + topic.aliases.map(regexEscape).join('|') + ')\\b', 'i'); }
  function batchTextTopics(text) {
    var positive = text.toLowerCase().replace(/’/g, "'");
    var avoided = [];
    var aliases = [];
    batchTopics.forEach(function (topic) { aliases = aliases.concat(topic.aliases); });
    aliases.sort(function (a, b) { return b.length - a.length; });
    var word = '(?:' + aliases.map(regexEscape).join('|') + ')\\b';
    var term = word + '(?:\\s+(?:films?|movies?|stories))?';
    var negative = new RegExp("\\b(?:no|avoid|without|skip|not|don't want|do not want|don't like|do not like|not in the mood for|don't feel like|do not feel like)(?:\\s+(?:any|a|an|watching|watch|to|see|seeing|more|really))*\\s+(" + term + '(?:\\s*(?:,|or|and)\\s*' + term + ')*)', 'gi');
    positive = positive.replace(negative, function (match) {
      batchTopics.forEach(function (topic) { if (topicExpression(topic).test(match) && avoided.indexOf(topic) === -1) avoided.push(topic); });
      return ' ';
    });
    return {
      positive: batchTopics.filter(function (topic) { return topicExpression(topic).test(positive); }),
      avoided: avoided
    };
  }
  function movieMatchesTopic(movie, topic) {
    return (topic.genres || []).some(function (genre) { return movie.genres.indexOf(genre) !== -1; }) ||
      (topic.keywords || []).some(function (keyword) { return movie.keywords.indexOf(keyword) !== -1; });
  }

  function ratingEvidence(movieId, ratings) {
    if (!ratings || !Object.prototype.hasOwnProperty.call(ratings, movieId)) return null;
    var record = ratings[movieId];
    if (!record || !Array.isArray(record.scores)) return null;
    var evidence = record.scores.map(function (rating) {
      if (!rating || ['douban', 'imdb'].indexOf(rating.platform) === -1 || typeof rating.url !== 'string') return null;
      var url;
      try { url = new URL(rating.url); } catch (_) { return null; }
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      var validSource = rating.platform === 'douban'
        ? url.hostname === 'movie.douban.com' && /^\/subject\/\d+(?:\/|$)/.test(url.pathname)
        : ['imdb.com', 'www.imdb.com'].indexOf(url.hostname) !== -1 && /^\/(?:[a-z]{2}\/)?title\/tt\d+(?:\/|$)/.test(url.pathname);
      if (!validSource || (typeof rating.value !== 'number' && typeof rating.value !== 'string')) return null;
      if (typeof rating.value === 'string' && !/^\s*\d+(?:\.\d+)?\s*(?:\/\s*10)?\s*$/.test(rating.value)) return null;
      var score = typeof rating.value === 'number' ? rating.value : Number(rating.value.split('/')[0].trim());
      if (!isFinite(score) || score < 0 || score > 10) return null;
      return {
        platform: rating.platform, label: rating.platform === 'douban' ? '豆瓣' : 'IMDb',
        value: String(rating.value).split('/')[0].trim(), score: score, url: url.href,
        checkedAt: rating.checkedAt || record.checkedAt || null, highRated: score >= 8
      };
    }).filter(Boolean).sort(function (a, b) { return b.score - a.score || (a.platform === 'douban' ? -1 : b.platform === 'douban' ? 1 : 0); });
    return evidence[0] || null;
  }

  function rankBatchCandidates(input, history, settings) {
    history = history || {};
    settings = settings || {};
    var query = buildQuery(input);
    var topics = batchTextTopics(query.note);
    var previous = ids(settings.previousIds);
    var recommended = ids(history.recommendedIds).concat(previous);
    var included = [];
    var candidates = recommend(input, history, settings).filter(function (entry) {
      if (included.indexOf(entry.movie.id) !== -1 || topics.avoided.some(function (topic) { return movieMatchesTopic(entry.movie, topic); })) return false;
      included.push(entry.movie.id);
      return true;
    }).map(function (entry, index) {
      var matchedTopics = topics.positive.filter(function (topic) { return movieMatchesTopic(entry.movie, topic); });
      var relevanceScore = entry.score + Math.min(matchedTopics.length, 3) * 12;
      var freshnessPenalty = (recommended.indexOf(entry.movie.id) !== -1 ? 6 : 0) + (previous.indexOf(entry.movie.id) !== -1 ? 6 : 0);
      var quality = ratingEvidence(entry.movie.id, settings.ratings);
      var copy = matchedTopics.length ? (query.locale === 'en'
        ? 'It also matches your interest in ' + matchedTopics.slice(0, 2).map(function (topic) { return topic.label[1]; }).join(' and ') + '.'
        : '也呼应了你提到的「' + matchedTopics.slice(0, 2).map(function (topic) { return topic.label[0]; }).join('、') + '」。') : '';
      return {
        movie: entry.movie, score: relevanceScore - freshnessPenalty, relevanceScore: relevanceScore,
        freshnessPenalty: freshnessPenalty, quality: quality, highRated: Boolean(quality && quality.highRated),
        reasons: copy ? [copy].concat(entry.reasons).slice(0, 3) : entry.reasons,
        shortReason: entry.shortReason, rationale: entry.rationale + (copy ? (query.locale === 'en' ? ' ' : '') + copy : ''),
        tieOrder: index
      };
    }).sort(function (a, b) {
      // A weaker story cannot win just for being unseen or highly rated. Among
      // nearby matches, sourced /10 high ratings take priority over freshness.
      var relevanceBand = Math.floor(b.relevanceScore / 12) - Math.floor(a.relevanceScore / 12);
      if (relevanceBand) return relevanceBand;
      if (a.highRated !== b.highRated) return a.highRated ? -1 : 1;
      return b.score - a.score || ((b.quality ? b.quality.score : -1) - (a.quality ? a.quality.score : -1)) || a.tieOrder - b.tieOrder;
    });
    return candidates.map(function (entry) {
      delete entry.tieOrder;
      return entry;
    });
  }

  function recommendBatch(input, history, settings) {
    history = history || {};
    settings = settings || {};
    var size = Number(settings.size);
    size = isFinite(size) && size >= 1 ? Math.min(7, Math.floor(size)) : 7;
    var previous = ids(settings.previousIds);
    var exposureLog = ids(history.recommendationLog);
    var recommended = ids(history.recommendedIds).concat(exposureLog, previous);
    var candidates = rankBatchCandidates(input, history, settings);
    var query = buildQuery(input);
    var topics = batchTextTopics(query.note).positive;
    var strongest = candidates.reduce(function (best, entry) { return Math.max(best, entry.relevanceScore); }, 0);
    // Refresh explores genuinely fitting alternatives, not every film that merely
    // passes duration/region filters. An explicit viewing goal is a meaningful fit;
    // close-scoring stories can also qualify. Topic requests still need a topic match.
    var relevant = candidates.filter(function (entry) {
      if (topics.length && !topics.some(function (topic) { return movieMatchesTopic(entry.movie, topic); })) return false;
      return (query.desired && entry.movie.desired.indexOf(query.desired) !== -1) || entry.relevanceScore >= Math.max(0, strongest - 24);
    });
    // Explicit refresh excludes every film already exposed in this experience.
    // Keep the existing relevance/rating order and never fill a short batch with
    // old films or weaker matches. A new search can still find familiar favorites.
    var unseen = relevant.filter(function (entry) { return recommended.indexOf(entry.movie.id) === -1; });
    var selection = settings.refresh ? unseen : candidates;
    var entries = selection.slice(0, size);
    var selectedIds = entries.map(function (entry) { return entry.movie.id; });
    var repeatedCount = entries.filter(function (entry) { return recommended.indexOf(entry.movie.id) !== -1; }).length;
    var changedCount = entries.filter(function (entry) { return previous.indexOf(entry.movie.id) === -1; }).length;
    var unseenCount = unseen.filter(function (entry) { return selectedIds.indexOf(entry.movie.id) === -1; }).length;
    return {
      entries: entries, eligibleCount: candidates.length, requestedSize: size,
      shortfall: Math.max(0, size - entries.length), repeatedCount: repeatedCount,
      freshCount: entries.length - repeatedCount, remainingCount: candidates.length - entries.length,
      relevantCount: relevant.length,
      alternativeCount: unseenCount, unseenCount: unseenCount, exhausted: unseenCount === 0,
      changedCount: changedCount,
      unchanged: Boolean(settings.refresh && entries.length > 0 && entries.length === new Set(previous).size && !changedCount)
    };
  }

  return { analyzeMood: analyzeMood, buildQuery: buildQuery, recommend: recommend, recommendBatch: recommendBatch, rankBatchCandidates: rankBatchCandidates, ratingEvidence: ratingEvidence, options: recommendEngine.options, countryLabel: countryLabel };
}));
