(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../miniprogram/lib/catalog.js'));
  else root.MovieHunterWorldCatalog = factory(root.MovieHunterCatalog || []);
}(typeof window !== 'undefined' ? window : this, function (base) {
  'use strict';

  // Production countries/regions, not spoken language or filming locations.
  // Facts and poster provenance: ./world-sources.md. Editorial copy is original.
  var additions = {
    'soul': {
      countries: ['US'], titleEn: 'Soul', directorEn: 'Pete Docter',
      pitchEn: 'An unexpected journey leads a jazz teacher to reconsider his biggest dream and the small pleasures he passes by each day.',
      angleZh: '爵士乐与生活里的小事，让紧绷的节奏慢慢放松', angleEn: 'Its jazz rhythms and everyday pleasures leave room to slow down',
      reviewSummaryEn: 'Critics praise its delicate visuals and reflections on life, finding the emotional appeal that makes Pixar work for all ages.'
    },
    'coco': {
      countries: ['US'], titleEn: 'Coco', directorEn: 'Lee Unkrich',
      pitchEn: 'A boy who loves music enters a dazzling unfamiliar city and follows its songs into the story of his family.',
      angleZh: '音乐、亲情与记忆，为想念和感动留出位置', angleEn: 'Music and family memories make space for longing and emotion',
      reviewSummaryEn: 'Rich visuals and careful storytelling explore family, culture, life and death in a film made for family viewing.'
    },
    'amelie': {
      countries: ['FR', 'DE'], titleEn: 'Amélie', directorEn: 'Jean-Pierre Jeunet',
      pitchEn: 'A young Parisian starts quietly changing the lives of people around her while trying to open up her own.',
      angleZh: '巴黎街角的小善意，把孤独变成轻盈的浪漫', angleEn: 'Small acts of kindness turn Parisian solitude into playful romance',
      reviewSummaryEn: 'Critics highlight its lightness, imagination and leading performance, describing a distinctly pleasurable film.'
    },
    'walter-mitty': {
      countries: ['AU', 'CA', 'GB', 'US'], titleEn: 'The Secret Life of Walter Mitty', directorEn: 'Ben Stiller',
      pitchEn: 'A magazine employee who usually adventures in his imagination sets out on a real journey to find a missing photograph.',
      angleZh: '辽阔风景与一次真正的出发，让日常之外的可能变得具体', angleEn: 'Open landscapes and a first real adventure make new possibilities feel tangible',
      reviewSummaryEn: 'Critics recognize its ambitious imagery and premise, but find that the story lacks the depth to sustain its grand ideas.'
    },
    'intouchables': {
      countries: ['FR'], titleEn: 'The Intouchables', directorEn: 'Olivier Nakache / Éric Toledano',
      pitchEn: 'Two men from very different circumstances meet through a caregiving job and grow closer through friction, humor and companionship.',
      angleZh: '两个人的磨合与玩笑，让友情带来轻松的陪伴', angleEn: 'An unlikely friendship brings company through friction and shared jokes',
      reviewSummaryEn: 'Critics praise the performances and sensitive direction while noting a gentle approach to difficult subjects.'
    },
    'little-miss-sunshine': {
      countries: ['US'], titleEn: 'Little Miss Sunshine', directorEn: 'Jonathan Dayton / Valerie Faris',
      pitchEn: 'A family squeezes into an old van to take a young girl to a competition, bringing all their private troubles along for the ride.',
      angleZh: '一家人的笨拙与互相支持，让失败也能有温柔的出口', angleEn: 'An awkward but devoted family finds tenderness in falling short',
      reviewSummaryEn: 'Its ensemble and humorous screenplay stand out, giving the comedy emotional weight through an imperfect family.'
    },
    'about-time': {
      countries: ['GB', 'US'], titleEn: 'About Time', directorEn: 'Richard Curtis',
      pitchEn: 'After learning he can revisit the past, a young man tries to repair small regrets in his love life, family and ordinary days.',
      angleZh: '爱情与家庭里的微小遗憾，带你重新看见普通的一天', angleEn: 'Small regrets in love and family bring an ordinary day back into focus',
      reviewSummaryEn: 'Critics appreciate its attractive imagery and open sincerity, while also acknowledging its strong sentimental streak.'
    },
    'grand-budapest': {
      countries: ['US', 'DE'], titleEn: 'The Grand Budapest Hotel', directorEn: 'Wes Anderson',
      pitchEn: 'A meticulous hotel concierge and his young lobby boy become entangled in an inheritance dispute and a peculiar European adventure.',
      angleZh: '精致构图与荒诞冒险，为好奇心打开一个奇妙世界', angleEn: 'Precise compositions and an absurd adventure reward a curious mood',
      reviewSummaryEn: 'Critics find emotion and ideas beneath the elaborate visual style, especially praising the connection between form and feeling.'
    },
    'perfect-days': {
      countries: ['JP', 'DE'], titleEn: 'Perfect Days', directorEn: 'Wim Wenders',
      pitchEn: 'A Tokyo cleaner follows a steady routine of work, music and sunlight through trees, as small changes enter his days.',
      angleZh: '树影、磁带与重复的日常，让疲惫有一段安静的落脚处', angleEn: 'Tree shadows, cassette tapes and familiar routines offer a quiet place to rest',
      reviewSummaryEn: 'Critics praise the quiet storytelling and Koji Yakusho’s performance, which builds emotion from small moments of daily life.'
    },
    'sing-street': {
      countries: ['IE', 'GB', 'US'], titleEn: 'Sing Street', directorEn: 'John Carney',
      pitchEn: 'A Dublin teenager starts a band to make a music video and discovers his own voice through rehearsals and friendship.',
      angleZh: '少年组乐队的笨拙热情，为梦想和勇气添一点声音', angleEn: 'A teenage band’s unruly enthusiasm gives dreams and courage a sound',
      reviewSummaryEn: 'Its cast, melodies and optimism enliven a familiar coming-of-age story with sincerity and musical pleasure.'
    },
    'singin-rain': {
      countries: ['US'], titleEn: "Singin’ in the Rain", directorEn: 'Stanley Donen / Gene Kelly',
      pitchEn: 'As silent movies give way to sound, a group of Hollywood performers dances and sings its way through a changing industry.',
      angleZh: '明快的歌舞与机智笑料，让一晚变得轻松明亮', angleEn: 'Bright dance numbers and quick wit bring lightness to an evening',
      reviewSummaryEn: 'Witty, perceptive and full of laughter, it is celebrated by critics as a defining classic Hollywood musical.'
    },
    'paddington-2': {
      posterUrl: '/assets/posters/paddington-2.jpg',
      countries: ['GB', 'FR', 'LU'], titleEn: 'Paddington 2', directorEn: 'Paul King',
      pitchEn: 'An unexpected mishap interrupts Paddington’s plans for a family gift, drawing his London neighbors together through kindness.',
      angleZh: '一只熊的善意和邻里冒险，带来不费力的温暖与笑意', angleEn: 'A bear’s kindness and neighborhood adventures offer easy warmth and laughter',
      reviewSummaryEn: 'Charming visuals and gentle storytelling balance family warmth with the pleasures of an adventure for all ages.'
    },
    'inception': {
      countries: ['US', 'GB'], titleEn: 'Inception', directorEn: 'Christopher Nolan',
      pitchEn: 'A team able to enter dreams accepts an unusual assignment that requires a dangerous operation across several layers of sleep.',
      angleZh: '层层梦境与紧张任务，让注意力进入一场需要参与的谜题', angleEn: 'Layered dreams and a tense mission turn viewing into an absorbing puzzle',
      reviewSummaryEn: 'Critics praise its imagination and tension, finding it satisfying as both a sensory experience and an intellectual challenge.'
    },
    'knives-out': {
      countries: ['US'], titleEn: 'Knives Out', directorEn: 'Rian Johnson',
      pitchEn: 'After a mystery novelist dies, his relatives offer conflicting accounts while an invited detective untangles the household’s secrets.',
      angleZh: '各执一词的家人与精巧线索，满足推理时不断猜测的乐趣', angleEn: 'Conflicting accounts and carefully placed clues invite you to keep guessing',
      reviewSummaryEn: 'A strong ensemble and carefully arranged suspense bring freshness to the classic murder mystery.'
    },
    'truman-show': {
      countries: ['US'], titleEn: 'The Truman Show', directorEn: 'Peter Weir',
      pitchEn: 'A resident of a seaside town begins noticing odd inconsistencies and questioning the familiar world around him.',
      angleZh: '熟悉世界里的裂缝，把对自由与人生选择的追问变成故事', angleEn: 'Cracks in a familiar world turn questions about freedom and choice into a story',
      reviewSummaryEn: 'Critics find it funny, tender and thought-provoking, particularly in its treatment of celebrity and the invasion of ordinary people’s privacy.'
    },
    'groundhog-day': {
      countries: ['US'], titleEn: 'Groundhog Day', directorEn: 'Harold Ramis',
      pitchEn: 'An impatient weather presenter becomes trapped in a repeating day and must reconsider the people and routines in front of him.',
      angleZh: '反复重来的同一天，用幽默重新打量改变的可能', angleEn: 'A repeating day uses humor to reconsider the possibility of change',
      reviewSummaryEn: 'Smart, warm and inventive, it showcases Bill Murray’s dramatic acting as well as its comic premise.'
    },
    'interstellar': {
      countries: ['US', 'GB'], titleEn: 'Interstellar', directorEn: 'Christopher Nolan',
      pitchEn: 'With Earth facing a crisis, a father joins a space expedition while carrying the pull of the family he leaves behind.',
      angleZh: '宇宙尺度的冒险与亲情，让震撼和牵挂同时发生', angleEn: 'A cosmic adventure joins the wonder of space with the pull of family',
      reviewSummaryEn: 'Critics praise its visual spectacle, suspense and ideas, while finding that some concepts exceed what the narrative can carry.'
    },
    'arrival': {
      countries: ['US'], titleEn: 'Arrival', directorEn: 'Denis Villeneuve',
      pitchEn: 'When alien vessels arrive on Earth, a linguist tries to build a means of communication through unfamiliar symbols.',
      angleZh: '语言与时间的谜题，把科幻的好奇引向人与人的理解', angleEn: 'Puzzles of language and time connect science-fiction curiosity with human understanding',
      reviewSummaryEn: 'Emotion and Amy Adams’s performance support its complex science-fiction ideas, rewarding viewers who want something to think about.'
    },
    'spirited-away': {
      countries: ['JP'], titleEn: 'Spirited Away', directorEn: 'Hayao Miyazaki',
      pitchEn: 'A girl wanders into an unfamiliar spirit world and must learn to work, recognize kindness and find her way home.',
      angleZh: '陌生世界中的成长与善意，为不安留下一点勇气', angleEn: 'Growth and kindness in a strange world offer a little courage in uncertainty',
      reviewSummaryEn: 'Critics praise its beautiful, enchanting fairy-tale world and the curiosity it encourages about the world around us.'
    },
    'totoro': {
      countries: ['JP'], titleEn: 'My Neighbor Totoro', directorEn: 'Hayao Miyazaki',
      pitchEn: 'Two sisters explore the woods around their new country home and meet extraordinary companions amid waiting and imagination.',
      angleZh: '乡间树林与童年的想象，让紧绷的心情慢慢舒展开', angleEn: 'Country woods and childhood imagination let a tense mood gently unwind',
      reviewSummaryEn: 'Critics admire its warm, delicate depiction of the simple pleasures of childhood.'
    },
    'fantastic-mr-fox': {
      countries: ['GB', 'US'], titleEn: 'Fantastic Mr. Fox', directorEn: 'Wes Anderson',
      pitchEn: 'A fox father who struggles with a quiet life returns to his old tricks, pulling his family and neighbors into a battle of wits.',
      angleZh: '定格动画的细节与机智冒险，让好奇心和笑意都有着落', angleEn: 'Tactile animation and a clever adventure give curiosity and laughter plenty to enjoy',
      reviewSummaryEn: 'Its humor and intricate visuals earn equal praise, with critics highlighting its appeal across ages.'
    },
    'before-sunrise': {
      countries: ['US', 'AT'], titleEn: 'Before Sunrise', directorEn: 'Richard Linklater',
      pitchEn: 'Two strangers meet on a train, step off together in Vienna and give one brief night to walking and conversation.',
      angleZh: '一夜的散步与坦诚对话，适合慢慢靠近爱情和自我的想法', angleEn: 'One night of walking and candid conversation makes room for thoughts about love and self',
      reviewSummaryEn: 'Natural performances and beautiful imagery turn a romantic encounter into a thoughtful, observant portrait of modern love.'
    },
    '12-angry-men': {
      countries: ['US'], titleEn: '12 Angry Men', directorEn: 'Sidney Lumet',
      pitchEn: 'Twelve jurors debate a case in one room, revealing their assumptions and prejudices as they examine the evidence.',
      angleZh: '一间房里的证据与争论，带来紧凑而值得思考的张力', angleEn: 'Evidence and argument in a single room create tight, thought-provoking tension',
      reviewSummaryEn: 'Critics celebrate the screenplay and concentrated dramatic tension, regarding the film as a modern classic.'
    },
    'chungking-express': {
      countries: ['HK'], titleEn: 'Chungking Express', directorEn: 'Wong Kar-wai',
      pitchEn: 'In Hong Kong’s crowded streets and snack bars, several people carrying unfinished feelings experience chance encounters.',
      angleZh: '城市夜色与偶然相遇，让孤独和未说完的心事有了回声', angleEn: 'City nights and chance encounters give loneliness and unfinished feelings an echo',
      reviewSummaryEn: 'Beyond its distinctive visual style, detailed characters and natural performances give the film emotional force.'
    }
  };

  var world = [
    {
      id: 'the-road-home', title: '我的父亲母亲', titleEn: 'The Road Home', originalTitle: '我的父亲母亲', year: 1999, minutes: 89,
      director: '张艺谋', directorEn: 'Zhang Yimou', countries: ['CN'], genres: ['romance', 'drama'],
      moods: ['calm', 'low', 'tired'], desired: ['comfort', 'release'],
      keywords: ['爱情', '乡村', '思念', '回忆', '温柔', '初恋', '等待', 'love', 'rural', 'memory', 'tender', 'romance'],
      pitch: '儿子回乡处理父亲的后事，母亲的坚持让他重新走近一段始于乡村学校的爱情。',
      pitchEn: 'A son returns to his village after his father’s death, and his mother’s wishes lead him back to a love story that began at a rural school.',
      angleZh: '乡间的等待与朴素的爱，让思念在缓慢叙事中找到形状',
      angleEn: 'Patient rural rhythms and a simple love story give longing a gentle shape',
      source: 'https://en.wikipedia.org/wiki/The_Road_Home_(1999_film)', poster: '/assets/world/the-road-home.jpg', posterUrl: '/assets/world/the-road-home.jpg'
    },
    {
      id: 'yi-yi', title: '一一', titleEn: 'Yi Yi', originalTitle: '一一', year: 2000, minutes: 173,
      director: '杨德昌', directorEn: 'Edward Yang', countries: ['TW', 'JP'], genres: ['drama'],
      moods: ['calm', 'restless', 'curious'], desired: ['think', 'release'],
      keywords: ['人生', '家庭', '生活', '台北', '成长', '遗憾', '孤独', 'life', 'family', 'Taipei', 'growing up', 'regret'],
      pitch: '台北一家三代人在婚礼之后各自遇见生活的难题，从不同角度看见彼此，也看见自己。',
      pitchEn: 'After a wedding, three generations of a Taipei family face their own uncertainties and see one another, and themselves, from new angles.',
      angleZh: '三代人的日常与遗憾，适合留一段完整时间慢慢思考人生',
      angleEn: 'Three generations of ordinary lives and regrets reward an evening of unhurried reflection',
      source: 'https://en.wikipedia.org/wiki/Yi_Yi', poster: '/assets/world/yi-yi.jpg', posterUrl: '/assets/world/yi-yi.jpg'
    },
    {
      id: 'parasite', title: '寄生虫', titleEn: 'Parasite', originalTitle: '기생충', year: 2019, minutes: 132,
      director: '奉俊昊', directorEn: 'Bong Joon Ho', countries: ['KR'], genres: ['drama', 'mystery', 'comedy'],
      moods: ['curious', 'restless', 'good'], desired: ['thrill', 'think'],
      keywords: ['悬疑', '阶层', '社会', '反转', '紧张', '家庭', 'thriller', 'class', 'society', 'suspense', 'family'],
      pitch: '一次家教工作的机会，让生活拮据的一家人与富裕家庭产生联系，平静的房屋里逐渐出现裂缝。',
      pitchEn: 'A tutoring opportunity connects a struggling household with a wealthy family, and cracks gradually appear beneath the home’s calm surface.',
      angleZh: '黑色幽默与步步收紧的家庭关系，让刺激之后留下社会的追问',
      angleEn: 'Dark humor and tightening family tensions leave social questions beyond the suspense',
      source: 'https://en.wikipedia.org/wiki/Parasite_(2019_film)', poster: '/assets/world/parasite.jpg', posterUrl: '/assets/world/parasite.jpg'
    },
    {
      id: '3-idiots', title: '三傻大闹宝莱坞', titleEn: '3 Idiots', originalTitle: '3 Idiots', year: 2009, minutes: 171,
      director: '拉吉库马尔·希拉尼', directorEn: 'Rajkumar Hirani', countries: ['IN'], genres: ['comedy', 'drama', 'music'],
      moods: ['tired', 'low', 'restless', 'good'], desired: ['joy', 'think', 'release'],
      keywords: ['友情', '大学', '学习', '压力', '梦想', '成长', '快乐', 'friendship', 'college', 'pressure', 'dreams', 'comedy'],
      pitch: '多年后，两个老朋友踏上寻找大学同伴的旅程，回忆起他们曾怎样面对成绩、期待与自己的梦想。',
      pitchEn: 'Two old friends search for a college companion, revisiting the years when grades, expectations and personal dreams pulled them in different directions.',
      angleZh: '校园里的友情与笑闹，为成绩和期待带来的压力提供另一种视角',
      angleEn: 'Campus friendship and humor offer another perspective on the pressure to succeed',
      source: 'https://en.wikipedia.org/wiki/3_Idiots', poster: '/assets/world/3-idiots.jpg', posterUrl: '/assets/world/3-idiots.jpg'
    },
    {
      id: 'children-of-heaven', title: '小鞋子', titleEn: 'Children of Heaven', originalTitle: 'بچه‌های آسمان', year: 1997, minutes: 89,
      director: '马基德·马基迪', directorEn: 'Majid Majidi', countries: ['IR'], genres: ['drama'],
      moods: ['low', 'calm', 'tired'], desired: ['comfort', 'release'],
      keywords: ['亲情', '童年', '兄妹', '温暖', '善良', '奔跑', 'family', 'childhood', 'siblings', 'kindness', 'tender'],
      pitch: '哥哥弄丢了妹妹的鞋子，两人决定轮流穿一双鞋去上学，一个小小的秘密改变了他们每天的脚步。',
      pitchEn: 'After a boy loses his sister’s shoes, the siblings share a single pair for school, and their small secret changes the rhythm of each day.',
      angleZh: '一双鞋与兄妹之间的体谅，在短小的故事里留下朴素的感动',
      angleEn: 'A shared pair of shoes and a sibling bond find quiet emotion in a compact story',
      source: 'https://www.siskelfilmcenter.org/children-heaven', poster: '/assets/world/children-of-heaven.jpg', posterUrl: '/assets/world/children-of-heaven.jpg'
    },
    {
      id: 'cinema-paradiso', title: '天堂电影院', titleEn: 'Cinema Paradiso', originalTitle: 'Nuovo Cinema Paradiso', year: 1988, minutes: 124,
      director: '朱塞佩·托纳多雷', directorEn: 'Giuseppe Tornatore', countries: ['IT', 'FR'], genres: ['drama', 'romance'],
      moods: ['low', 'calm', 'tired'], desired: ['comfort', 'release'],
      keywords: ['电影', '童年', '回忆', '成长', '乡愁', '友情', 'cinema', 'childhood', 'nostalgia', 'friendship', 'home'],
      pitch: '一位导演因故回到西西里故乡，回忆起童年时的小镇影院，以及改变他人生的放映员。',
      pitchEn: 'A filmmaker returns to his Sicilian hometown and remembers the village cinema and projectionist who shaped his childhood.',
      angleZh: '小镇影院与忘年友情，让乡愁和对电影的热爱慢慢涌上来',
      angleEn: 'A village cinema and an unlikely friendship make room for nostalgia and a love of film',
      runtimeEditionZh: '124分钟院线版', runtimeEditionEn: '124-minute theatrical version',
      source: 'https://en.wikipedia.org/wiki/Cinema_Paradiso', poster: '/assets/world/cinema-paradiso.jpg', posterUrl: '/assets/world/cinema-paradiso.jpg'
    },
    {
      id: 'pans-labyrinth', title: '潘神的迷宫', titleEn: 'Pan’s Labyrinth', originalTitle: 'El laberinto del fauno', year: 2006, minutes: 120,
      director: '吉尔莫·德尔·托罗', directorEn: 'Guillermo del Toro', countries: ['ES', 'MX'], genres: ['drama', 'adventure'],
      moods: ['curious', 'restless'], desired: ['thrill', 'think', 'release'],
      keywords: ['奇幻', '黑暗童话', '战争', '勇气', '选择', 'fantasy', 'dark fairy tale', 'war', 'courage', 'choice'],
      pitch: '战后的西班牙，一个女孩跟随母亲来到偏僻驻地，在严酷现实与神秘迷宫之间面对不同的考验。',
      pitchEn: 'In postwar Spain, a girl moves with her mother to a remote outpost and faces trials between harsh reality and a mysterious labyrinth.',
      angleZh: '黑暗童话与现实交错，带来紧张的幻想之旅和关于选择的思考',
      angleEn: 'A dark fairy tale woven into harsh reality offers suspense and questions about choice',
      source: 'https://en.wikipedia.org/wiki/Pan%27s_Labyrinth', poster: '/assets/world/pans-labyrinth.jpg', posterUrl: '/assets/world/pans-labyrinth.jpg'
    },
    {
      id: 'central-station', title: '中央车站', titleEn: 'Central Station', originalTitle: 'Central do Brasil', year: 1998, minutes: 113,
      director: '沃尔特·塞勒斯', directorEn: 'Walter Salles', countries: ['BR', 'FR'], genres: ['drama', 'adventure'],
      moods: ['low', 'restless', 'calm'], desired: ['comfort', 'release', 'think'],
      keywords: ['公路', '亲情', '寻找', '孤独', '信任', '巴西', 'road trip', 'family', 'loneliness', 'trust', 'Brazil'],
      pitch: '在里约车站替人写信的女人，与一个寻找父亲的男孩一同上路，陌生人之间的关系在旅途中慢慢改变。',
      pitchEn: 'A woman who writes letters for strangers in Rio joins a boy searching for his father, and their uneasy bond changes along the road.',
      angleZh: '穿越巴西的旅程，把陌生人之间的戒备慢慢变成信任',
      angleEn: 'A journey across Brazil slowly turns distrust between strangers into connection',
      source: 'https://en.wikipedia.org/wiki/Central_Station_(film)', poster: '/assets/world/central-station.jpg', posterUrl: '/assets/world/central-station.jpg'
    }
  ];

  return base.map(function (film) {
    return Object.assign({}, film, { posterUrl: '/miniprogram' + film.poster }, additions[film.id]);
  }).concat(world);
}));
