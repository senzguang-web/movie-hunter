# Web 国际片库资料来源

核验日期：2026-10-03。片库共32部，原有24部保留全部原始字段，Web扩展层补充制作国家/地区、中英文文案和统一海报路径；新增8部非英语电影。这里只扩展本地精选片库，不声称已经接入全球实时电影数据库。

## 归属与版本口径

- `countries` 使用 ISO 3166-1 alpha-2 代码，表示来源列出的制作国家/地区。联合制作保留多个代码；不按对白语言、演员国籍、取景地或故事发生地判断。
- 国家/地区为推荐偏好所用的影片资料属性；界面语言独立于影片制作地及对白语言。
- 简介、`angleZh` / `angleEn` 和推荐标签是原创建议性编辑文案，不是观众评论，也不是心理或疗效承诺。
- 原24部的 `reviewSummaryEn` 仅翻译 `ratings.js` 中既有中文摘要，沿用原 `reviewSource`；未添加新的影评事实或新评分。
- 新8部不附加评分或影评人共识；资料字段缺失应由界面明确显示，不得借用旧影片的评分或生成数值。

## 原有24部制作国家/地区核验

来源电影条目的 Country / Countries 字段已逐项读取。

| 影片 | 制作国家/地区 | 核验来源 |
| --- | --- | --- |
| 心灵奇旅 / Soul | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Soul_(2020_film)) |
| 寻梦环游记 / Coco | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Coco_(2017_film)) |
| 天使爱美丽 / Amélie | 法国 (FR)、德国 (DE) | [电影资料](https://en.wikipedia.org/wiki/Am%C3%A9lie) |
| 白日梦想家 / The Secret Life of Walter Mitty | 澳大利亚 (AU)、加拿大 (CA)、英国 (GB)、美国 (US) | [电影资料](https://en.wikipedia.org/wiki/The_Secret_Life_of_Walter_Mitty_(2013_film)) |
| 触不可及 / The Intouchables | 法国 (FR) | [电影资料](https://en.wikipedia.org/wiki/The_Intouchables) |
| 阳光小美女 / Little Miss Sunshine | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Little_Miss_Sunshine) |
| 时空恋旅人 / About Time | 英国 (GB)、美国 (US) | [电影资料](https://en.wikipedia.org/wiki/About_Time_(2013_film)) |
| 布达佩斯大饭店 / The Grand Budapest Hotel | 美国 (US)、德国 (DE) | [电影资料](https://en.wikipedia.org/wiki/The_Grand_Budapest_Hotel) |
| 完美的日子 / Perfect Days | 日本 (JP)、德国 (DE) | [电影资料](https://en.wikipedia.org/wiki/Perfect_Days) |
| 初恋这首情歌 / Sing Street | 爱尔兰 (IE)、英国 (GB)、美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Sing_Street) |
| 雨中曲 / Singin’ in the Rain | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Singin%27_in_the_Rain) |
| 帕丁顿熊2 / Paddington 2 | 英国 (GB)、法国 (FR)、卢森堡 (LU) | [电影资料](https://en.wikipedia.org/wiki/Paddington_2) |
| 盗梦空间 / Inception | 美国 (US)、英国 (GB) | [电影资料](https://en.wikipedia.org/wiki/Inception) |
| 利刃出鞘 / Knives Out | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Knives_Out) |
| 楚门的世界 / The Truman Show | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/The_Truman_Show) |
| 土拨鼠之日 / Groundhog Day | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Groundhog_Day_(film)) |
| 星际穿越 / Interstellar | 美国 (US)、英国 (GB) | [电影资料](https://en.wikipedia.org/wiki/Interstellar_(film)) |
| 降临 / Arrival | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Arrival_(film)) |
| 千与千寻 / Spirited Away | 日本 (JP) | [电影资料](https://en.wikipedia.org/wiki/Spirited_Away) |
| 龙猫 / My Neighbor Totoro | 日本 (JP) | [电影资料](https://en.wikipedia.org/wiki/My_Neighbor_Totoro) |
| 了不起的狐狸爸爸 / Fantastic Mr. Fox | 英国 (GB)、美国 (US) | [电影资料](https://en.wikipedia.org/wiki/Fantastic_Mr._Fox_(film)) |
| 爱在黎明破晓前 / Before Sunrise | 美国 (US)、奥地利 (AT) | [电影资料](https://en.wikipedia.org/wiki/Before_Sunrise) |
| 十二怒汉 / 12 Angry Men | 美国 (US) | [电影资料](https://en.wikipedia.org/wiki/12_Angry_Men_(1957_film)) |
| 重庆森林 / Chungking Express | 中国香港 (HK) | [电影资料](https://en.wikipedia.org/wiki/Chungking_Express) |

《白日梦想家》的源条目列出澳大利亚、加拿大、英国、美国；《帕丁顿熊2》列出英国、法国、卢森堡；《爱在黎明破晓前》列出美国、奥地利。保留共同制作方，不因熟悉的拍摄地或主要语言而删减。

## 新增8部电影

| 影片 | 年份 | 片长（分钟） | 制作国家/地区 | 基本资料来源 |
| --- | --- | --- | --- | --- |
| 我的父亲母亲 / The Road Home | 1999 | 89 | 中国大陆 (CN) | [电影资料](https://en.wikipedia.org/wiki/The_Road_Home_(1999_film)) |
| 一一 / Yi Yi | 2000 | 173 | 中国台湾 (TW)、日本 (JP) | [电影资料](https://en.wikipedia.org/wiki/Yi_Yi) |
| 寄生虫 / Parasite | 2019 | 132 | 韩国 (KR) | [电影资料](https://en.wikipedia.org/wiki/Parasite_(2019_film)) |
| 三傻大闹宝莱坞 / 3 Idiots | 2009 | 171 | 印度 (IN) | [电影资料](https://en.wikipedia.org/wiki/3_Idiots) |
| 小鞋子 / Children of Heaven | 1997 | 89 | 伊朗 (IR) | [电影资料](https://www.siskelfilmcenter.org/children-heaven) |
| 天堂电影院 / Cinema Paradiso | 1988 | 124 | 意大利 (IT)、法国 (FR) | [电影资料](https://en.wikipedia.org/wiki/Cinema_Paradiso) |
| 潘神的迷宫 / Pan’s Labyrinth | 2006 | 120 | 西班牙 (ES)、墨西哥 (MX) | [电影资料](https://en.wikipedia.org/wiki/Pan%27s_Labyrinth) |
| 中央车站 / Central Station | 1998 | 113 | 巴西 (BR)、法国 (FR) | [电影资料](https://en.wikipedia.org/wiki/Central_Station_(film)) |

片长版本说明：

- 《天堂电影院》采用 **124分钟院线版本**。国家/年份来自电影条目；片长由发行商 [Arrow Films 的124分钟院线版说明](https://www.arrowfilms.com/p/cinema-paradiso-4k-uhdblu-ray/12613127/)核验。155分钟原始版本和174分钟导演剪辑版不用于本次片长筛选。对象保留 `runtimeEditionZh` / `runtimeEditionEn` 字段，后续详情可显示版本。
- 《小鞋子》采用放映机构 [Gene Siskel Film Center 的89分钟资料](https://www.siskelfilmcenter.org/children-heaven)，其页面也列出1997年、导演Majid Majidi及伊朗；维基条目另记88分钟。按89分钟处理不会突破90分钟上限。剧情简介另核对发行商 [Miramax](https://www.miramax.com/movie/children-of-heaven/)。
- 《我的父亲母亲》89分钟与 [Sony旗下的影片页面](https://www.sonypictures.com/movies/theroadhome)、[IMDb的1小时29分钟资料](https://www.imdb.com/title/tt0235060/)对照，制作国家按条目的China归入CN。

## 新增海报来源

海报均为真实电影发行海报，取自对应Wikipedia电影条目的主信息框。每张保留本地JPEG，最长边不超过800像素，用于本地开发中的影片识别。图片版权属于原权利人，Wikipedia托管并不代表图片采用文字条目的自由许可；对外发行时应使用获得许可的电影数据服务或素材。原24张海报未修改，沿用既有资料。

| 本地文件 | 来源电影条目 | 原图片 |
| --- | --- | --- |
| `web/assets/world/the-road-home.jpg` | [电影条目](https://en.wikipedia.org/wiki/The_Road_Home_(1999_film)) | [发行海报](https://upload.wikimedia.org/wikipedia/en/f/f4/Road_Home_Poster.jpg) |
| `web/assets/world/yi-yi.jpg` | [电影条目](https://en.wikipedia.org/wiki/Yi_Yi) | [发行海报](https://upload.wikimedia.org/wikipedia/en/5/5c/Yiyiposter.jpg) |
| `web/assets/world/parasite.jpg` | [电影条目](https://en.wikipedia.org/wiki/Parasite_(2019_film)) | [发行海报](https://upload.wikimedia.org/wikipedia/en/5/53/Parasite_%282019_film%29.png) |
| `web/assets/world/3-idiots.jpg` | [电影条目](https://en.wikipedia.org/wiki/3_Idiots) | [发行海报](https://upload.wikimedia.org/wikipedia/en/d/df/3_idiots_poster.jpg) |
| `web/assets/world/children-of-heaven.jpg` | [电影条目](https://en.wikipedia.org/wiki/Children_of_Heaven_(1997_film)) | [发行海报](https://upload.wikimedia.org/wikipedia/en/f/f7/Children_of_heaven.jpg) |
| `web/assets/world/cinema-paradiso.jpg` | [电影条目](https://en.wikipedia.org/wiki/Cinema_Paradiso) | [发行海报](https://upload.wikimedia.org/wikipedia/en/8/86/CinemaParadiso.jpg) |
| `web/assets/world/pans-labyrinth.jpg` | [电影条目](https://en.wikipedia.org/wiki/Pan%27s_Labyrinth) | [发行海报](https://upload.wikimedia.org/wikipedia/en/6/67/Pan%27s_Labyrinth.jpg) |
| `web/assets/world/central-station.jpg` | [电影条目](https://en.wikipedia.org/wiki/Central_Station_(film)) | [发行海报](https://upload.wikimedia.org/wikipedia/en/1/12/Central-do-brasil-poster04.jpg) |

机器可读的原图片URL及本地文件体积记录在 `web/assets/world/sources.json`。
