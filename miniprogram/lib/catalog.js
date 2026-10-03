(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MovieHunterCatalog = factory();
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Facts were checked against each linked film page on 2026-10-03.
  // Moods, desired feelings and keywords are editorial recommendation tags.
  return [
    {
      id: 'soul', title: '心灵奇旅', originalTitle: 'Soul', year: 2020, minutes: 101,
      director: '彼特·道格特', genres: ['animation', 'drama', 'music'],
      moods: ['tired', 'low', 'restless'], desired: ['comfort', 'think'],
      keywords: ['生活', '音乐', '爵士', '梦想', '温暖', '治愈', '人生', '放松'],
      pitch: '一位爵士乐老师的意外旅程，把远大的梦想和每天擦肩而过的小事放在了一起。',
      source: 'https://en.wikipedia.org/wiki/Soul_(2020_film)', poster: '/assets/posters/soul.jpg'
    },
    {
      id: 'coco', title: '寻梦环游记', originalTitle: 'Coco', year: 2017, minutes: 105,
      director: '李·昂克里奇', genres: ['animation', 'adventure', 'music'],
      moods: ['low', 'good', 'calm'], desired: ['comfort', 'release'],
      keywords: ['亲情', '家庭', '音乐', '梦想', '感动', '哭', '温暖', '回忆'],
      pitch: '热爱音乐的男孩踏入一座陌生而绚丽的城市，在歌声中寻找自己的家族故事。',
      source: 'https://en.wikipedia.org/wiki/Coco_(2017_film)', poster: '/assets/posters/coco.jpg'
    },
    {
      id: 'amelie', title: '天使爱美丽', originalTitle: 'Amélie', year: 2001, minutes: 123,
      director: '让-皮埃尔·热内', genres: ['romance', 'comedy'],
      moods: ['low', 'calm', 'good'], desired: ['comfort', 'joy'],
      keywords: ['巴黎', '爱情', '浪漫', '温暖', '治愈', '生活', '孤独', '色彩'],
      pitch: '一位巴黎女孩开始悄悄改变身边人的生活，也试着为自己的日常打开一扇门。',
      source: 'https://en.wikipedia.org/wiki/Am%C3%A9lie', poster: '/assets/posters/amelie.jpg'
    },
    {
      id: 'walter-mitty', title: '白日梦想家', originalTitle: 'The Secret Life of Walter Mitty', year: 2013, minutes: 114,
      director: '本·斯蒂勒', genres: ['adventure', 'comedy', 'drama'],
      moods: ['tired', 'restless', 'curious'], desired: ['comfort', 'thrill'],
      keywords: ['旅行', '冒险', '风景', '梦想', '勇气', '自由', '公路', '出发'],
      pitch: '为了寻找一张底片，习惯在脑海里冒险的杂志职员终于踏上真实的远行。',
      source: 'https://en.wikipedia.org/wiki/The_Secret_Life_of_Walter_Mitty_(2013_film)', poster: '/assets/posters/walter-mitty.jpg'
    },
    {
      id: 'intouchables', title: '触不可及', originalTitle: 'Intouchables', year: 2011, minutes: 112,
      director: '奥利维埃·纳卡什 / 埃里克·托莱达诺', genres: ['drama', 'comedy'],
      moods: ['tired', 'low', 'restless'], desired: ['comfort', 'joy', 'release'],
      keywords: ['友情', '友谊', '温暖', '治愈', '幽默', '轻松', '生活', '感动'],
      pitch: '生活处境截然不同的两个人因一份照护工作相遇，在磨合与玩笑中慢慢靠近。',
      source: 'https://en.wikipedia.org/wiki/The_Intouchables', poster: '/assets/posters/intouchables.jpg'
    },
    {
      id: 'little-miss-sunshine', title: '阳光小美女', originalTitle: 'Little Miss Sunshine', year: 2006, minutes: 102,
      director: '乔纳森·戴顿 / 维莱莉·法瑞斯', genres: ['comedy', 'drama', 'adventure'],
      moods: ['low', 'restless', 'tired'], desired: ['comfort', 'joy', 'release'],
      keywords: ['家庭', '亲情', '公路', '旅行', '成长', '失败', '幽默', '勇气'],
      pitch: '一家人挤进一辆旧面包车，陪小女孩赶赴比赛，也把各自的人生难题带上了路。',
      source: 'https://en.wikipedia.org/wiki/Little_Miss_Sunshine', poster: '/assets/posters/little-miss-sunshine.jpg'
    },
    {
      id: 'about-time', title: '时空恋旅人', originalTitle: 'About Time', year: 2013, minutes: 123,
      director: '理查德·柯蒂斯', genres: ['romance', 'comedy', 'drama'],
      moods: ['low', 'calm', 'good'], desired: ['comfort', 'release', 'think'],
      keywords: ['爱情', '浪漫', '亲情', '家庭', '时间', '温暖', '感动', '生活'],
      pitch: '得知自己可以回到过去后，一个年轻人开始尝试修补约会、家庭和日常里的小遗憾。',
      source: 'https://en.wikipedia.org/wiki/About_Time_(2013_film)', poster: '/assets/posters/about-time.jpg'
    },
    {
      id: 'grand-budapest', title: '布达佩斯大饭店', originalTitle: 'The Grand Budapest Hotel', year: 2014, minutes: 100,
      director: '韦斯·安德森', genres: ['comedy', 'adventure', 'drama'],
      moods: ['good', 'curious', 'restless'], desired: ['joy', 'thrill'],
      keywords: ['幽默', '冒险', '色彩', '复古', '旅行', '友情', '荒诞'],
      pitch: '一位讲究体面的酒店礼宾员和年轻门童卷入遗产风波，在旧欧洲展开一场奇妙奔走。',
      source: 'https://en.wikipedia.org/wiki/The_Grand_Budapest_Hotel', poster: '/assets/posters/grand-budapest.jpg'
    },
    {
      id: 'perfect-days', title: '完美的日子', originalTitle: 'Perfect Days', year: 2023, minutes: 124,
      director: '维姆·文德斯', genres: ['drama'],
      moods: ['tired', 'restless', 'calm'], desired: ['comfort', 'think'],
      keywords: ['生活', '日常', '安静', '慢节奏', '独处', '孤独', '东京', '放空', '治愈'],
      pitch: '东京一位清洁工在工作、音乐与树影之间过着规律的日子，细小的变化悄然进入他的生活。',
      source: 'https://en.wikipedia.org/wiki/Perfect_Days', poster: '/assets/posters/perfect-days.jpg'
    },
    {
      id: 'sing-street', title: '初恋这首情歌', originalTitle: 'Sing Street', year: 2016, minutes: 106,
      director: '约翰·卡尼', genres: ['music', 'romance', 'comedy', 'drama'],
      moods: ['low', 'good', 'restless'], desired: ['joy', 'comfort', 'release'],
      keywords: ['音乐', '青春', '成长', '爱情', '梦想', '乐队', '摇滚', '勇气'],
      pitch: '都柏林的少年为了拍一支音乐录影带组建乐队，在排练中发现了表达自己的声音。',
      source: 'https://en.wikipedia.org/wiki/Sing_Street', poster: '/assets/posters/sing-street.jpg'
    },
    {
      id: 'singin-rain', title: '雨中曲', originalTitle: "Singin' in the Rain", year: 1952, minutes: 103,
      director: '斯坦利·多南 / 吉恩·凯利', genres: ['music', 'comedy', 'romance'],
      moods: ['tired', 'good', 'low'], desired: ['joy', 'comfort'],
      keywords: ['音乐', '歌舞', '舞蹈', '轻松', '快乐', '浪漫', '复古', '经典'],
      pitch: '当电影开始拥有声音，几位好莱坞演员忙着应对变化，把困境跳成了明快的歌舞。',
      source: "https://en.wikipedia.org/wiki/Singin%27_in_the_Rain", poster: '/assets/posters/singin-rain.jpg'
    },
    {
      id: 'paddington-2', title: '帕丁顿熊2', originalTitle: 'Paddington 2', year: 2017, minutes: 104,
      director: '保罗·金', genres: ['comedy', 'adventure'],
      moods: ['tired', 'low', 'good'], desired: ['joy', 'comfort'],
      keywords: ['温暖', '轻松', '家庭', '善良', '快乐', '治愈', '伦敦', '幽默'],
      pitch: '帕丁顿为亲人准备礼物时遭遇意外，伦敦邻里因他的热心与善意聚到了一起。',
      source: 'https://en.wikipedia.org/wiki/Paddington_2', poster: '/assets/posters/paddington-2.jpg'
    },
    {
      id: 'inception', title: '盗梦空间', originalTitle: 'Inception', year: 2010, minutes: 148,
      director: '克里斯托弗·诺兰', genres: ['scifi', 'mystery', 'adventure'],
      moods: ['curious', 'good'], desired: ['thrill', 'think'],
      keywords: ['梦境', '烧脑', '悬疑', '科幻', '刺激', '反转', '冒险', '诺兰'],
      pitch: '一支能够进入梦境的团队接下一项特殊任务，必须在层层梦境里完成一次危险行动。',
      source: 'https://en.wikipedia.org/wiki/Inception', poster: '/assets/posters/inception.jpg'
    },
    {
      id: 'knives-out', title: '利刃出鞘', originalTitle: 'Knives Out', year: 2019, minutes: 130,
      director: '莱恩·约翰逊', genres: ['mystery', 'comedy', 'drama'],
      moods: ['curious', 'good', 'restless'], desired: ['thrill', 'think'],
      keywords: ['悬疑', '推理', '烧脑', '反转', '侦探', '幽默', '谜题'],
      pitch: '一位推理小说家的离世让家人各执一词，受邀前来的侦探开始梳理这座宅邸里的秘密。',
      source: 'https://en.wikipedia.org/wiki/Knives_Out', poster: '/assets/posters/knives-out.jpg'
    },
    {
      id: 'truman-show', title: '楚门的世界', originalTitle: 'The Truman Show', year: 1998, minutes: 103,
      director: '彼得·威尔', genres: ['drama', 'comedy', 'scifi'],
      moods: ['curious', 'restless', 'calm'], desired: ['think', 'release'],
      keywords: ['自由', '人生', '现实', '勇气', '社会', '思考', '荒诞'],
      pitch: '住在海滨小城的楚门逐渐注意到日常中的不协调之处，开始追问自己熟悉的世界。',
      source: 'https://en.wikipedia.org/wiki/The_Truman_Show', poster: '/assets/posters/truman-show.jpg'
    },
    {
      id: 'groundhog-day', title: '土拨鼠之日', originalTitle: 'Groundhog Day', year: 1993, minutes: 101,
      director: '哈罗德·雷米斯', genres: ['comedy', 'romance'],
      moods: ['tired', 'restless', 'good'], desired: ['joy', 'think', 'comfort'],
      keywords: ['时间', '生活', '幽默', '成长', '爱情', '循环', '改变'],
      pitch: '一位不耐烦的天气主播被困在反复重来的同一天，只好重新打量眼前的人和事。',
      source: 'https://en.wikipedia.org/wiki/Groundhog_Day_(film)', poster: '/assets/posters/groundhog-day.jpg'
    },
    {
      id: 'interstellar', title: '星际穿越', originalTitle: 'Interstellar', year: 2014, minutes: 169,
      director: '克里斯托弗·诺兰', genres: ['scifi', 'adventure', 'drama'],
      moods: ['curious', 'good', 'low'], desired: ['thrill', 'think', 'release'],
      keywords: ['宇宙', '太空', '科幻', '亲情', '时间', '冒险', '烧脑', '诺兰', '感动'],
      pitch: '地球面临生存困境，一位父亲加入远航队伍，在星际探索与对家人的牵挂之间前行。',
      source: 'https://en.wikipedia.org/wiki/Interstellar_(film)', poster: '/assets/posters/interstellar.jpg'
    },
    {
      id: 'arrival', title: '降临', originalTitle: 'Arrival', year: 2016, minutes: 116,
      director: '丹尼斯·维伦纽瓦', genres: ['scifi', 'drama', 'mystery'],
      moods: ['curious', 'calm'], desired: ['think', 'release'],
      keywords: ['科幻', '外星', '语言', '沟通', '时间', '烧脑', '思考', '安静'],
      pitch: '外星飞船抵达地球后，一名语言学家尝试建立沟通，在陌生的符号中寻找理解的可能。',
      source: 'https://en.wikipedia.org/wiki/Arrival_(film)', poster: '/assets/posters/arrival.jpg'
    },
    {
      id: 'spirited-away', title: '千与千寻', originalTitle: 'Spirited Away', year: 2001, minutes: 124,
      director: '宫崎骏', genres: ['animation', 'adventure'],
      moods: ['curious', 'low', 'restless'], desired: ['comfort', 'thrill', 'think'],
      keywords: ['成长', '勇气', '奇幻', '冒险', '宫崎骏', '童年', '治愈'],
      pitch: '一个女孩误入陌生的奇幻世界，必须学会工作、辨别善意，并找到回家的办法。',
      source: 'https://en.wikipedia.org/wiki/Spirited_Away', poster: '/assets/posters/spirited-away.jpg'
    },
    {
      id: 'totoro', title: '龙猫', originalTitle: 'My Neighbor Totoro', year: 1988, minutes: 86,
      director: '宫崎骏', genres: ['animation', 'adventure'],
      moods: ['tired', 'low', 'calm', 'restless'], desired: ['comfort', 'joy'],
      keywords: ['童年', '自然', '乡村', '温暖', '安静', '家庭', '治愈', '宫崎骏', '放松'],
      pitch: '搬到乡间的两姐妹探索新家附近的树林，在等待和想象中遇见不可思议的朋友。',
      source: 'https://en.wikipedia.org/wiki/My_Neighbor_Totoro', poster: '/assets/posters/totoro.jpg'
    },
    {
      id: 'fantastic-mr-fox', title: '了不起的狐狸爸爸', originalTitle: 'Fantastic Mr. Fox', year: 2009, minutes: 87,
      director: '韦斯·安德森', genres: ['animation', 'adventure', 'comedy'],
      moods: ['good', 'curious', 'tired'], desired: ['joy', 'thrill'],
      keywords: ['家庭', '冒险', '幽默', '定格', '机智', '色彩', '荒诞'],
      pitch: '一位难以安于平静的狐狸父亲重拾旧本领，也把家人与邻居带进了一场斗智行动。',
      source: 'https://en.wikipedia.org/wiki/Fantastic_Mr._Fox_(film)', poster: '/assets/posters/fantastic-mr-fox.jpg'
    },
    {
      id: 'before-sunrise', title: '爱在黎明破晓前', originalTitle: 'Before Sunrise', year: 1995, minutes: 101,
      director: '理查德·林克莱特', genres: ['romance', 'drama'],
      moods: ['calm', 'curious', 'low'], desired: ['comfort', 'think'],
      keywords: ['爱情', '浪漫', '旅行', '对话', '相遇', '维也纳', '慢节奏', '独处'],
      pitch: '两个在列车上相遇的年轻人决定一起走进维也纳，把有限的一夜交给散步与交谈。',
      source: 'https://www.criterion.com/films/28692-before-sunrise', poster: '/assets/posters/before-sunrise.jpg'
    },
    {
      id: '12-angry-men', title: '十二怒汉', originalTitle: '12 Angry Men', year: 1957, minutes: 96,
      director: '西德尼·吕美特', genres: ['drama', 'mystery'],
      moods: ['curious', 'calm'], desired: ['think', 'thrill'],
      keywords: ['推理', '思考', '社会', '人性', '对话', '法庭', '经典', '烧脑'],
      pitch: '十二名陪审员进入一间房间，围绕一桩案件讨论证据，也逐渐暴露各自的判断与偏见。',
      source: 'https://en.wikipedia.org/wiki/12_Angry_Men_(1957_film)', poster: '/assets/posters/12-angry-men.jpg'
    },
    {
      id: 'chungking-express', title: '重庆森林', originalTitle: 'Chungking Express', year: 1994, minutes: 102,
      director: '王家卫', genres: ['romance', 'drama'],
      moods: ['low', 'calm', 'restless'], desired: ['release', 'think'],
      keywords: ['爱情', '孤独', '失恋', '城市', '香港', '相遇', '王家卫', '夜晚'],
      pitch: '在香港拥挤的街道与小吃店里，几个人带着未散的心事，经历偶然的相遇。',
      source: 'https://en.wikipedia.org/wiki/Chungking_Express', poster: '/assets/posters/chungking-express.jpg'
    }
  ];
}));
