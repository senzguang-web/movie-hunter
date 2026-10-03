(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine'));
  else root.MovieHunterInterview = factory(root.MovieHunterWebEngine);
}(typeof window !== 'undefined' ? window : this, function (engine) {
  'use strict';

  var goals = {
    comfort: ['被温柔治愈', 'Find comfort', '把节奏放轻一点', 'A little gentleness'],
    joy: ['开怀一笑', 'Have a good laugh', '让今晚轻快一点', 'A lighter evening'],
    release: ['释放情绪', 'Let feelings out', '给心事一个出口', 'Room for your feelings'],
    thrill: ['感受刺激', 'Feel the excitement', '走进未知与悬念', 'A step into the unknown'],
    think: ['获得思考', 'Find a new perspective', '留下一点回味', 'Something to reflect on']
  };
  var genres = {
    drama: ['现实人生', 'Human stories', '日常、成长与相遇', 'Everyday lives and connections'],
    comedy: ['轻松喜剧', 'Comedy', '幽默、荒诞与惊喜', 'Humour and unexpected turns'],
    romance: ['浪漫爱情', 'Romance', '靠近、心动与牵挂', 'Love and human connection'],
    animation: ['动画世界', 'Animation', '童真与自由的想象', 'Wonder and imagination'],
    scifi: ['科幻想象', 'Science fiction', '时间、宇宙与可能', 'Time, space and possibility'],
    mystery: ['悬疑推理', 'Mystery', '线索与未揭开的答案', 'Clues and unanswered questions'],
    adventure: ['奇遇冒险', 'Adventure', '出发，去往陌生之地', 'Journeys beyond the familiar'],
    music: ['音乐故事', 'Music', '旋律、舞台与梦想', 'Melodies, stages and dreams'],
    any: ['交给你决定', 'Surprise me', '不限定故事类型', 'Keep every genre open']
  };
  var genreOrder = ['drama', 'comedy', 'romance', 'animation', 'scifi', 'mystery', 'adventure', 'music', 'any'];
  // The chosen goal sets the main genre set; the current feeling only moves
  // matching types toward the front. No feeling silently selects an answer.
  var moodGenrePreferences = {
    low: ['drama', 'romance', 'music'],
    tired: ['animation'],
    restless: ['comedy', 'animation', 'music'],
    good: ['comedy', 'adventure', 'music'],
    curious: ['scifi', 'mystery', 'adventure'],
    calm: ['drama', 'music', 'animation']
  };
  var moodCopy = {
    low: {
      order: ['comfort', 'release', 'joy', 'think', 'thrill'],
      title: ['今晚，要接住情绪，还是换个心情？', 'Stay with your feelings, or find a change of mood?'],
      help: ['可以给心事一点空间，也可以换个方向。', 'Make room for what you feel, or choose another direction.'],
      context: ['有些低落', 'Feeling a little low']
    },
    tired: {
      order: ['comfort', 'joy', 'release', 'think', 'thrill'],
      title: ['有点累的今晚，想怎样放松？', 'Feeling tired tonight. What would feel right?'],
      help: ['温柔一点，或笑一会儿，都由你决定。', 'A little comfort or a good laugh — the choice is yours.'],
      context: ['有点疲惫', 'Feeling a little tired']
    },
    restless: {
      order: ['comfort', 'release', 'joy', 'think', 'thrill'],
      title: ['心有点乱，今晚想怎样安放？', 'Feeling unsettled. What would help tonight?'],
      help: ['慢下来、释放情绪，或暂时换个频道。', 'Slow down, let feelings out, or change the channel for a while.'],
      context: ['心有点乱', 'Feeling a little unsettled']
    },
    good: {
      order: ['joy', 'thrill', 'think', 'comfort', 'release'],
      title: ['心情不错，今晚想延续哪种感受？', 'In a good mood. Where shall the evening go?'],
      help: ['让快乐继续，也可以尝试另一种感受。', 'Keep the good feeling going, or try something different.'],
      context: ['心情不错', 'In a good mood']
    },
    curious: {
      order: ['think', 'thrill', 'joy', 'comfort', 'release'],
      title: ['带着好奇，今晚想发现什么？', 'Feeling curious. What would you like to discover?'],
      help: ['让想象走远一点，或给自己一点意外。', 'Follow an idea further, or leave room for a surprise.'],
      context: ['带着好奇', 'Feeling curious']
    },
    calm: {
      order: ['think', 'comfort', 'joy', 'release', 'thrill'],
      title: ['平静的今晚，想留给哪种感受？', 'A quiet mood. What would you like from tonight?'],
      help: ['留一点回味，也可以让故事带你远行。', 'Leave room for reflection, or let a story take you somewhere.'],
      context: ['心情平静', 'Feeling calm']
    }
  };
  var paths = {
    comfort: {
      genres: ['animation', 'drama', 'comedy', 'romance', 'any'],
      title: ['哪一种故事，能让你松弛下来？', 'What kind of story would feel comforting?'],
      time: ['给自己一段放松的时间，时长由你决定。', 'Make room to unwind. You decide how much time to give it.']
    },
    joy: {
      genres: ['comedy', 'music', 'animation', 'adventure', 'any'],
      title: ['今晚，想走进哪一种快乐？', 'What kind of story would brighten your evening?'],
      time: ['为一点快乐留多久，由你决定。', 'How much time would you like to set aside for a little joy?']
    },
    release: {
      genres: ['drama', 'romance', 'music', 'animation', 'any'],
      title: ['想在哪一种故事里，释放情绪？', 'What kind of story would help you let feelings out?'],
      time: ['给心事留一点空间，选一个舒服的时长。', 'Give your feelings some room. Choose a length that suits you.']
    },
    thrill: {
      genres: ['mystery', 'scifi', 'adventure', 'drama', 'any'],
      title: ['今晚，想走进哪一种未知？', 'What kind of unknown would you like to step into?'],
      time: ['紧凑一点，或慢慢入戏，时间由你安排。', 'A quick escape or a longer journey — you set the time.']
    },
    think: {
      genres: ['drama', 'scifi', 'mystery', 'animation', 'any'],
      title: ['想从哪一种故事里，找到新的视角？', 'What kind of story might offer a new perspective?'],
      time: ['给思绪留多久，由你决定。', 'You decide how much time to leave for reflection.']
    }
  };

  function translate(pair, language) { return pair[language]; }
  function options(ids, source, language) {
    return ids.map(function (id) {
      var entry = source[id];
      return [id, entry[language], entry[language + 2]];
    });
  }

  // The shared detector handles negated feelings. Remove the rest of a wish
  // clause as well, so e.g. “希望今晚能开心” is not treated as present happiness.
  function presentFeelingText(text) {
    return (typeof text === 'string' ? text.slice(0, 300) : '').split(/([，。！？；\n,;.!?])/).map(function (clause) {
      return clause.replace(/(?:希望|但愿|想要|想让|\b(?:wish|hope|want|would like)\b).*$/i, '');
    }).join('');
  }

  function getQuestions(input) {
    input = input || {};
    var answers = input.answers || {};
    var language = input.locale === 'en' ? 1 : 0;
    var mood = engine.analyzeMood(presentFeelingText(input.text), input.locale);
    var feeling = moodCopy[mood.id];
    var desired = Object.prototype.hasOwnProperty.call(paths, answers.desired) ? answers.desired : '';
    var path = paths[desired];
    var mainGenres = path ? path.genres : ['drama', 'romance', 'scifi', 'mystery', 'any'];
    var preferredGenres = moodGenrePreferences[mood.id] || [];
    mainGenres = preferredGenres.filter(function (id) { return mainGenres.indexOf(id) !== -1; }).concat(mainGenres.filter(function (id) { return preferredGenres.indexOf(id) === -1; }));
    var context = feeling ? translate(feeling.context, language) : '';
    var genreHelp;
    if (desired) {
      genreHelp = language
        ? (context ? context + '. ' : '') + 'Following your choice: ' + goals[desired][1].toLowerCase() + '.'
        : (context ? context + '，' : '') + '沿着你选的「' + goals[desired][0] + '」来找。';
    } else {
      genreHelp = language
        ? (context ? context + '. Choose where the story goes next.' : 'No mood assumed. Your choices will set the direction.')
        : (context ? context + '，故事的方向仍由你选择。' : '暂不判断心情，按你的选择来决定方向。');
    }
    return [
      {
        key: 'desired',
        title: feeling ? translate(feeling.title, language) : translate(['今晚，希望电影带给你什么？', 'What would you like a film to bring you tonight?'], language),
        help: feeling ? translate(feeling.help, language) : translate(['先不定义心情，按你想要的感受来选。', 'No mood assumed. Choose how you would like a film to make you feel.'], language),
        options: options(feeling ? feeling.order : ['comfort', 'joy', 'release', 'thrill', 'think'], goals, language)
      },
      {
        key: 'genre',
        title: path ? translate(path.title, language) : translate(['你更想走进哪一种故事？', 'What kind of story would you like to enter?'], language),
        help: genreHelp,
        options: options(mainGenres, genres, language),
        additionalOptions: options(genreOrder.filter(function (id) { return mainGenres.indexOf(id) === -1; }), genres, language)
      },
      {
        key: 'countries',
        title: translate(['想看哪里的电影？', 'Where should the story come from?'], language),
        help: desired
          ? translate(['沿着「' + goals[desired][0] + '」的方向，看看世界各地的故事。', 'Explore stories from around the world as you ' + goals[desired][1].toLowerCase() + '.'], language)
          : translate(['可以多选，也可以让故事来自任何地方。', 'Choose more than one, or let stories come from anywhere.'], language),
        multi: true,
        options: []
      },
      {
        key: 'maxMinutes',
        title: translate(['今晚，留多少时间给电影？', 'How much time do you have for a film tonight?'], language),
        help: path ? translate(path.time, language) : translate(['选一个时间上限，也可以不限。', 'Choose a maximum running time, or leave it open.'], language),
        options: language ? [
          [90, 'Up to 90 minutes', ''], [120, 'Up to 2 hours', ''], [180, 'Up to 3 hours', ''], [0, 'Any length', '']
        ] : [
          [90, '90 分钟以内', ''], [120, '两个小时以内', ''], [180, '三个小时以内', ''], [0, '不限时间', '']
        ]
      }
    ];
  }

  return { getQuestions: getQuestions };
}));
