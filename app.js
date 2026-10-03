(function () {
  'use strict';
  const catalog = window.MovieHunterWorldCatalog || window.MovieHunterCatalog || [];
  const engine = window.MovieHunterWebEngine;
  const snapshots = window.MovieHunterRatings || {};
  const staticDeployment = window.MovieHunterDeployment?.mode === 'static';
  const root = document.getElementById('main');
  const detailDialog = document.getElementById('detail-dialog');
  const aboutDialog = document.getElementById('about-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'movie-hunter-web-v1';
  const genreNames = {drama:['剧情','Drama'],comedy:['喜剧','Comedy'],romance:['爱情','Romance'],animation:['动画','Animation'],scifi:['科幻','Sci-fi'],mystery:['悬疑','Mystery'],adventure:['冒险','Adventure'],music:['音乐','Music']};
  const desireNames = {comfort:['温柔治愈','A little comfort'],joy:['开怀一笑','A good laugh'],thrill:['感受刺激','A little suspense'],think:['获得思考','Something to reflect on'],release:['释放情绪','An emotional release']};
  const countryNames = {CN:['中国大陆','Mainland China'],HK:['中国香港','Hong Kong, China'],TW:['中国台湾','Taiwan, China'],JP:['日本','Japan'],KR:['韩国','South Korea'],IN:['印度','India'],IR:['伊朗','Iran'],FR:['法国','France'],IT:['意大利','Italy'],ES:['西班牙','Spain'],MX:['墨西哥','Mexico'],BR:['巴西','Brazil'],DE:['德国','Germany'],AT:['奥地利','Austria'],GB:['英国','United Kingdom'],IE:['爱尔兰','Ireland'],US:['美国','United States'],CA:['加拿大','Canada'],AU:['澳大利亚','Australia'],DK:['丹麦','Denmark'],SE:['瑞典','Sweden'],NZ:['新西兰','New Zealand']};
  countryNames.LU=['卢森堡','Luxembourg'];
  const interview = window.MovieHunterInterview;
  const countryOrder = window.MovieHunterCountryOrder.buildCountryOrder(catalog, snapshots);
  const paths = {x:'M6 6l12 12M6 18 18 6',back:'m14 6-6 6 6 6',next:'m10 6 6 6-6 6',play:'m9 5 11 7-11 7V5Z',check:'m5 12 4 4L19 6',bookmark:'M6 3h12v18l-6-4-6 4V3',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8'};
  const esc = value => String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
  const movieById = id => catalog.find(movie=>movie.id===id);
  const poster = movie => {
    const source=movie.posterUrl||'/miniprogram'+movie.poster;
    return staticDeployment&&source.startsWith('/')?'./'+source.replace(/^\/+/, ''):source;
  };
  const dateKey = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function safeUrl(value) { try { const url=new URL(value);return url.protocol==='https:'?esc(url.href):''; } catch { return ''; } }
  function readHistory() {
    const result={savedIds:[],likedIds:[],seenIds:[],dislikedIds:[],chosen:null,motionPaused:false,locale:'zh'};
    try {
      const stored=JSON.parse(localStorage.getItem(storageKey)||'{}');
      for(const key of ['savedIds','likedIds','seenIds','dislikedIds'])if(Array.isArray(stored?.[key]))result[key]=[...new Set(stored[key])].filter(movieById);
      if(movieById(stored?.chosen?.id))result.chosen=stored.chosen;
      result.motionPaused=stored?.motionPaused===true;
      result.locale=stored?.locale==='en'?'en':'zh';
    } catch { /* The experience also works without persistent storage. */ }
    return result;
  }
  const history=readHistory();
  const t=(zh,en)=>history.locale==='en'?en:zh;
  const title=movie=>t(movie.title,movie.titleEn||movie.originalTitle);
  const secondaryTitle=movie=>movie.originalTitle===title(movie)?t(movie.titleEn||'',''):movie.originalTitle;
  const pitch=movie=>t(movie.pitch,movie.pitchEn||'');
  const director=movie=>t(movie.director,movie.directorEn||movie.director);
  const label=(map,id)=>map[id]?t(...map[id]):id;
  const countryLabel=id=>id==='LU'?t('卢森堡','Luxembourg'):label(countryNames,id);
  const duration=minutes=>minutes+t(' 分钟',' min');
  const movieMeta=movie=>[movie.year,(movie.countries||[]).map(countryLabel).join(' / '),duration(movie.minutes)].filter(Boolean).join(' · ');
  const state={view:'home',draft:'',step:0,answers:{desired:null,genre:null,countries:[],maxMinutes:null},query:null,completed:false,ranked:[],activeIndex:0,chosenId:null,libraryTab:'saved',detailId:null,detailTrigger:null,ratings:{},transitioning:false,switching:false,dirtyResults:false,railScroll:0,expanded:{genre:false,countries:false}};
  let toastTimer,detailRequest=0,composingMood=false,touchStart=null,suppressClickUntil=0;
  const motionOff=()=>reducedMotion.matches||history.motionPaused;
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function toast(message) {
    document.querySelectorAll('.toast,.detail-status').forEach(box=>box.hidden=true);
    const box=detailDialog.open?detailDialog.querySelector('.detail-status'):document.querySelector('.toast');if(!box)return;box.textContent=message;box.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.hidden=true,3000);
  }
  function persist() {
    try { localStorage.setItem(storageKey,JSON.stringify(history)); }
    catch { toast(t('本次记录已保留，但浏览器未允许保存到本机。','Your choices are kept for this visit, but browser storage is unavailable.')); }
    updateChrome();
  }
  function languageButtons() {
    return '<button class="lang-button" data-locale="zh" lang="zh-CN" aria-label="切换为中文" aria-pressed="'+(history.locale==='zh')+'">中文</button><button class="lang-button" data-locale="en" lang="en" aria-label="Switch to English" aria-pressed="'+(history.locale==='en')+'">EN</button>';
  }
  function updateChrome() {
    document.documentElement.lang=t('zh-CN','en');
    document.body.dataset.locale=history.locale;document.body.dataset.view=state.view;
    document.title=t('电影猎手 · 让故事遇见此刻','Movie Hunter · A story for this moment');
    document.querySelector('.brand span').textContent=t('电影猎手','MOVIE HUNTER');
    document.querySelector('.brand').setAttribute('aria-label',t('电影猎手首页','Movie Hunter home'));
    document.querySelector('.skip-link').textContent=t('跳转到主要内容','Skip to main content');
    document.querySelector('.header nav').setAttribute('aria-label',t('主导航','Main navigation'));
    document.querySelector('[data-nav="results"] .nav-label').textContent=t('电影空间','Discover');
    document.querySelector('[data-nav="saved"] .nav-label').textContent=t('想看片单','Watchlist');
    document.querySelector('.footer > span').textContent=t('让故事，遇见此刻。','A story for this moment.');
    document.querySelector('.footer button').textContent=t('推荐与数据说明','About the recommendations');
    document.querySelectorAll('.header [data-nav]').forEach(button=>{
      button.hidden=!state.completed||['questions','reveal'].includes(state.view);
      button.classList.toggle('active',button.dataset.nav===state.view);
      if(button.dataset.nav===state.view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    });
    const count=document.querySelector('.saved-count');count.textContent=history.savedIds.length;count.hidden=!history.savedIds.length;
    const control=document.querySelector('.motion-toggle');
    control.textContent=motionOff()?t('动态已暂停','Motion paused'):t('暂停漂浮','Pause motion');
    control.setAttribute('aria-pressed',String(motionOff()));control.disabled=reducedMotion.matches;
    control.title=reducedMotion.matches?t('已遵循系统的减少动态效果设置','Following your reduced-motion preference'):'';
    document.body.classList.toggle('motion-paused',motionOff());
    document.querySelectorAll('[data-locale]').forEach(button=>{if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.locale===history.locale));});
  }
  async function transition(render) {
    if(state.transitioning)return;
    state.transitioning=true;root.classList.add('is-leaving');
    await delay(motionOff()?0:240);render();root.classList.remove('is-leaving');
    window.scrollTo({top:0,behavior:'instant'});
    const heading=root.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    state.transitioning=false;
  }
  function renderHome() {
    state.view='home';composingMood=false;
    root.innerHTML='<section class="mood-scene scene"><div class="mood-inner"><h1 class="glow-heading"><span class="heading-lead">'+t('今天，','Tonight,')+'</span> <span class="heading-main">'+t('你的心情怎么样？','how do you feel?')+'</span></h1><p class="mood-intro">'+t('把今天留在这里，让故事带你去远方。','Leave your day here. Let a story take you somewhere new.')+'</p><form id="mood-form" class="mood-form" novalidate><label class="mood-field-label" for="mood-input">'+t('此刻的心情','Your mood')+'</label><div class="mood-entry"><textarea id="mood-input" aria-label="'+t('说说今天的心情','Tell us how you feel')+'" placeholder="'+t('说说吧，今天发生了什么。','Tell us a little about your day.')+'" maxlength="240" rows="2">'+esc(state.draft)+'</textarea><button class="primary-button" type="submit">'+t('继续','Continue')+icon('next')+'</button></div><div class="input-foot"><span>'+t('Enter 继续 · Shift + Enter 换行','Enter to continue · Shift + Enter for a new line')+'</span><span id="mood-count">'+state.draft.length+' / 240</span></div><p id="mood-error" class="mood-error" role="alert"></p></form></div></section>';
    updateChrome();
    const moodInput=document.getElementById('mood-input');
    moodInput.setAttribute('aria-describedby','mood-input-hint mood-error');
    root.querySelector('.input-foot').id='mood-input-hint';
    root.querySelector('#mood-form button[type="submit"]').disabled=!state.draft.trim();
  }
  function questions() {
    const list=interview.getQuestions({text:state.draft,answers:state.answers,locale:history.locale});
    const countryQuestion=list.find(question=>question.key==='countries');
    countryQuestion.options=[['any',t('不限国家／地区','Anywhere'),t('让故事自由发生','Stories without borders')],...countryOrder.primary.map(code=>[code,countryLabel(code),''])];
    countryQuestion.additionalOptions=countryOrder.additional.map(code=>[code,countryLabel(code),'']);
    return list;
  }
  function optionMarkup(question,options,offset=0) {
    return options.map(([value,name,description],i)=>{
      const checked=question.multi?(value==='any'?!state.answers.countries.length:state.answers.countries.includes(value)):String(state.answers[question.key])===String(value);
      return '<label class="question-option '+(question.multi?'country-option'+(value==='any'?' country-any':''):'')+'" style="--i:'+(i+offset)+'"><input type="'+(question.multi?'checkbox':'radio')+'" name="'+question.key+'" value="'+value+'" '+(checked?'checked':'')+'/><span class="option-content"><span class="option-copy"><span class="option-label">'+esc(name)+'</span>'+(description?'<span class="option-description">'+esc(description)+'</span>':'')+'</span><span class="option-check" aria-hidden="true">'+icon('check')+'</span></span></label>';
    }).join('');
  }
  function moreSummary(question) {
    const additional=question.additionalOptions||[];
    const selected=question.multi?additional.filter(option=>state.answers.countries.includes(option[0])).length:additional.find(option=>option[0]===state.answers.genre);
    const name=question.multi?t('更多国家／地区','More countries / regions'):t('其他故事类型','More story types');
    const selectedText=question.multi?(selected?t('已选 '+selected,selected+' selected'):''):(selected?selected[1]:'');
    return '<span>'+name+'</span><span class="more-summary-meta">'+esc(selectedText||t(additional.length+' 个选项',additional.length+' options'))+'</span>'+icon('next');
  }
  function selectedCountriesMarkup() {
    return state.answers.countries.map(code=>'<button type="button" class="selected-country" data-country-remove="'+esc(code)+'" aria-label="'+esc(t('移除'+countryLabel(code),'Remove '+countryLabel(code)))+'">'+esc(countryLabel(code))+icon('x')+'</button>').join('');
  }
  function renderQuestion() {
    state.view='questions';const list=questions(),question=list[state.step];
    const more=question.additionalOptions||[];
    root.innerHTML='<section class="question-scene scene"><div class="question-inner"><p class="step-label"><span class="sr-only">'+t('第 '+(state.step+1)+' 题，共 '+list.length+' 题','Question '+(state.step+1)+' of '+list.length)+'</span><span aria-hidden="true">0'+(state.step+1)+' / 0'+list.length+'</span></p><h1 class="glow-heading" id="question-title">'+esc(question.title)+'</h1><p class="question-help">'+esc(question.help)+'</p>'+(question.multi?'<div class="country-toolbar"><p id="country-selection-status" role="status" aria-live="polite">'+countrySelectionStatus()+'</p><div class="selected-countries" aria-label="'+t('已选国家／地区','Selected countries / regions')+'">'+selectedCountriesMarkup()+'</div></div>':'')+'<div class="question-choices '+(question.multi?'country-choices':'')+'" role="'+(question.multi?'group':'radiogroup')+'" aria-labelledby="question-title"><div class="question-options '+(question.multi?'country-options':'')+'">'+optionMarkup(question,question.options)+'</div>'+(more.length?'<details class="question-more" data-more="'+question.key+'" '+(state.expanded[question.key]?'open':'')+'><summary>'+moreSummary(question)+'</summary><div class="question-options '+(question.multi?'country-options':'')+'">'+optionMarkup(question,more)+'</div></details>':'')+'</div>'+(question.multi?'<p class="country-order-note">'+t('按本片库已核验高分影片数量排序','Ordered by verified highly rated films in this collection')+' <button type="button" data-action="about">'+t('排序依据','How we order')+'</button></p>':'')+'<div class="question-actions"><button class="text-button" data-action="back-question">'+icon('back')+(state.step?t('上一题','Back'):t('修改心情','Edit mood'))+'</button><button class="primary-button" data-action="next-question" '+(state.answers[question.key]===null?'disabled':'')+'>'+(state.step===list.length-1?t('遇见电影','Find my film'):t('继续','Continue'))+icon('next')+'</button></div></div></section>';
    updateChrome();
  }
  function countrySelectionStatus() {
    const count=state.answers.countries.length;
    return count?t('已选 '+count+' 个国家／地区',count+' '+(count===1?'country / region':'countries / regions')+' selected'):t('可多选，也可以不限','Choose several, or explore anywhere');
  }
  function syncCountrySelection() {
    root.querySelectorAll('.country-option input').forEach(input=>input.checked=input.value==='any'?!state.answers.countries.length:state.answers.countries.includes(input.value));
    const status=document.getElementById('country-selection-status');if(status)status.textContent=countrySelectionStatus();
    const chips=root.querySelector('.selected-countries');if(chips)chips.innerHTML=selectedCountriesMarkup();
    const summary=root.querySelector('.question-more summary');if(summary)summary.innerHTML=moreSummary(questions()[state.step]);
  }
  function startQuestions() {
    if(state.transitioning)return;
    const text=document.getElementById('mood-input').value.trim();
    if(!text){document.getElementById('mood-error').textContent=t('写下一句心情，再继续。','Write a little about your mood to continue.');document.getElementById('mood-input').focus();return;}
    if(!engine){toast(t('选片功能尚未加载，请刷新后重试。','Please refresh to load the recommendations.'));return;}
    state.draft=text;transition(()=>{state.step=0;renderQuestion();});
  }
  function refreshRanking(preserve=true) {
    const current=preserve?state.ranked[state.activeIndex]?.movie.id:null;
    state.ranked=engine.recommend({...state.query,locale:history.locale},history,{dateKey:dateKey()});
    const index=state.ranked.findIndex(entry=>entry.movie.id===current);
    state.activeIndex=index>=0?index:Math.min(state.activeIndex,Math.max(0,state.ranked.length-1));state.dirtyResults=false;
  }
  function renderReveal() {
    state.view='reveal';updateChrome();
    root.innerHTML='<section class="reveal-scene scene" aria-live="polite"><div><h1 class="glow-heading">'+t('这些故事，<br>也许懂你此刻的心情。','Some stories meet you<br>right where you are.')+'</h1><p class="scene-note">'+t('在世界的故事里，遇见今晚这一部。','Somewhere in the world, a story for tonight.')+'</p></div></section>';
  }
  async function finishQuestions() {
    if(state.transitioning)return;
    state.query={text:state.draft,desired:state.answers.desired,genre:state.answers.genre==='any'?'':state.answers.genre,countries:[...state.answers.countries],maxMinutes:Number(state.answers.maxMinutes)};
    state.activeIndex=0;refreshRanking(false);state.completed=true;state.railScroll=0;
    await transition(renderReveal);await delay(motionOff()?120:1200);
    if(state.view==='reveal')await transition(renderResults);
  }
  function querySummary() {
    const regions=state.query.countries.length?state.query.countries.map(countryLabel).join(' / '):t('不限国家／地区','Anywhere');
    return [label(desireNames,state.query.desired),state.query.genre?label(genreNames,state.query.genre):t('类型不限','Any genre'),regions,state.query.maxMinutes?t(state.query.maxMinutes+' 分钟以内','Up to '+state.query.maxMinutes+' min'):t('不限时长','Any length')].join(' · ');
  }
  function sideFilm(offset) {
    if(state.ranked.length<2||(state.ranked.length===2&&offset===-1))return '';
    const movie=state.ranked[(state.activeIndex+offset+state.ranked.length)%state.ranked.length].movie;
    return '<button class="side-film '+(offset<0?'side-prev':'side-next')+'" data-direction="'+offset+'" aria-label="'+esc((offset<0?t('上一部：','Previous: '):t('下一部：','Next: '))+title(movie))+'"><img src="'+poster(movie)+'" alt="" draggable="false"/><span class="side-label">'+(offset<0?t('上一段故事','PREVIOUS STORY'):t('下一段故事','NEXT STORY'))+'</span><span class="side-title">'+esc(title(movie))+'</span></button>';
  }
  function featureMarkup() {
    const entry=state.ranked[state.activeIndex],movie=entry.movie;
    return sideFilm(-1)+'<article class="hero-film" data-film="'+movie.id+'"><img class="film-aura" src="'+poster(movie)+'" alt="" aria-hidden="true"/><button class="hero-poster-button" data-detail="'+movie.id+'" aria-label="'+esc(t('了解《'+title(movie)+'》','Explore '+title(movie)))+'"><img class="hero-poster" src="'+poster(movie)+'" alt="'+esc(title(movie)+t('海报',' poster'))+'" width="600" height="900" draggable="false"/><span class="poster-edge" aria-hidden="true"></span></button><div class="hero-copy"><p class="hero-index">'+(state.activeIndex===0?t('今晚，先看这一部','YOUR FIRST PICK'):t('另一种可能','ANOTHER POSSIBILITY'))+'</p><h2 class="hero-title">'+esc(title(movie))+'</h2><p class="hero-original">'+esc(secondaryTitle(movie))+'</p><p class="hero-meta">'+esc(movieMeta(movie))+'</p><div class="hero-story"><p class="hero-reason-label">'+t('为此刻的你','WHY THIS STORY')+'</p><p class="hero-reason">'+esc(entry.shortReason||entry.reasons[0])+'</p><p class="hero-synopsis">'+esc(pitch(movie))+'</p></div><div class="hero-actions"><button class="primary-button" data-action="choose-movie" data-id="'+movie.id+'">'+icon('play')+t('就看这部','This is the one')+'</button><button class="secondary-button" data-detail="'+movie.id+'">'+t('了解这部','Explore this film')+icon('next')+'</button><button class="text-button" data-save="'+movie.id+'" aria-pressed="'+history.savedIds.includes(movie.id)+'">'+icon('bookmark')+(history.savedIds.includes(movie.id)?t('已想看','Saved'):t('想看','Save'))+'</button></div></div></article>'+sideFilm(1);
  }
  function railMarkup() {
    const start=Math.max(0,Math.min(state.activeIndex-3,state.ranked.length-7));
    return state.ranked.slice(start,start+7).map((entry,i)=>{
      const movie=entry.movie,index=start+i;
      return '<button class="rail-film" data-feature="'+index+'" aria-current="'+(index===state.activeIndex)+'" aria-label="'+esc(t('切换到《'+title(movie)+'》','Show '+title(movie)))+'"><img src="'+poster(movie)+'" alt="" loading="lazy" draggable="false"/><span>'+esc(title(movie))+'</span></button>';
    }).join('');
  }
  function renderResults() {
    if(!state.query){renderHome();return;}if(state.dirtyResults)refreshRanking();
    const oldRail=root.querySelector('.film-rail');if(oldRail)state.railScroll=oldRail.scrollLeft;
    state.view='results';updateChrome();
    const heading='<div class="explore-heading"><h1>'+t('一个故事，恰好此刻。','One story. This moment.')+'</h1>'+(state.ranked.length?'<p class="explore-subtitle">'+t('从 '+state.ranked.length+' 部符合偏好的电影里，找到今晚这一部。',(state.ranked.length===1?'One story fits your choices tonight.':'Find tonight’s film among '+state.ranked.length+' stories that fit your choices.'))+'</p>':'')+'</div>';
    if(!state.ranked.length){root.innerHTML='<section class="spotlight-scene">'+heading+'<div class="empty-state"><h2>'+t('还没有符合这些条件的电影。','No films match these choices yet.')+'</h2><p>'+t('试着调整国家／地区、类型或时长。我们不会为了补足数量而放宽条件。','Try different regions, a genre, or a longer running time. We’ll keep your choices as limits.')+'</p><button class="primary-button" data-action="edit-answers">'+t('调整偏好','Edit choices')+'</button></div></section>';return;}
    root.innerHTML='<section class="spotlight-scene">'+heading+'<div class="spotlight-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="'+t('电影推荐，使用左右方向键或滑动切换','Film recommendations. Use left and right arrows or swipe to explore.')+'">'+featureMarkup()+'</div><div class="film-navigation"><button class="carousel-arrow" data-direction="-1" aria-label="'+t('上一部电影','Previous film')+'" '+(state.ranked.length<2?'disabled':'')+'>'+icon('back')+'</button><div class="film-counter"><strong>'+String(state.activeIndex+1).padStart(2,'0')+'</strong><span> / '+String(state.ranked.length).padStart(2,'0')+'</span></div><button class="carousel-arrow" data-direction="1" aria-label="'+t('下一部电影','Next film')+'" '+(state.ranked.length<2?'disabled':'')+'>'+icon('next')+'</button></div><p class="carousel-hint">'+t('左右切换，让下一段故事走近。','Move left or right. Let another story come closer.')+'</p><div class="film-rail" role="group" aria-label="'+t('其他候选电影','Other films to explore')+'">'+railMarkup()+'</div><div class="explore-tools"><p>'+esc(querySummary())+'</p><button class="text-button" data-action="edit-answers">'+t('调整偏好','Edit choices')+'</button></div><p class="sr-only" id="film-announcement" role="status" aria-live="polite"></p></section>';
    const rail=root.querySelector('.film-rail');rail.scrollLeft=state.railScroll;
    rail.addEventListener('scroll',()=>state.railScroll=rail.scrollLeft,{passive:true});
  }
  async function switchFeature(direction,index) {
    if(state.view!=='results'||state.switching||state.transitioning||state.ranked.length<2)return;
    const nextIndex=index!=null?Math.max(0,Math.min(index,state.ranked.length-1)):(state.activeIndex+direction+state.ranked.length)%state.ranked.length;
    if(nextIndex===state.activeIndex)return;
    const stage=root.querySelector('.spotlight-stage');if(!stage)return;
    const oldButton=document.activeElement,nextId=state.ranked[nextIndex].movie.id;
    const stillCurrent=()=>stage.isConnected&&root.querySelector('.spotlight-stage')===stage&&state.view==='results'&&!state.transitioning&&state.ranked[nextIndex]?.movie.id===nextId;
    state.switching=true;stage.dataset.direction=(index!=null?nextIndex>state.activeIndex:direction>0)?'next':'prev';stage.style.setProperty('--switch-shift',stage.dataset.direction==='next'?'-12px':'12px');stage.setAttribute('aria-busy','true');
    try {
      if(!motionOff()){
        stage.classList.add('is-switching');
        const preload=new Image();preload.src=poster(state.ranked[nextIndex].movie);
        await Promise.all([delay(160),Promise.race([preload.decode().catch(()=>{}),delay(180)])]);
      }
      if(!stillCurrent())return;
      state.activeIndex=nextIndex;stage.innerHTML=featureMarkup();
      stage.classList.remove('is-switching');stage.classList.add('is-entering');
      root.querySelector('.film-counter strong').textContent=String(state.activeIndex+1).padStart(2,'0');
      const rail=root.querySelector('.film-rail');rail.innerHTML=railMarkup();rail.scrollLeft=state.railScroll;
      root.querySelector('#film-announcement').textContent=title(state.ranked[state.activeIndex].movie)+t('，第 '+(state.activeIndex+1)+' 部，共 '+state.ranked.length+' 部',', '+(state.activeIndex+1)+' of '+state.ranked.length);
      if(!oldButton.isConnected&&document.activeElement===document.body)stage.focus({preventScroll:true});
      if(!motionOff())await delay(360);
    } finally {
      stage.classList.remove('is-switching','is-entering');stage.removeAttribute('aria-busy');stage.style.removeProperty('--switch-shift');delete stage.dataset.direction;state.switching=false;
    }
  }
  function currentRatings(id){return state.ratings[id]||snapshots[id]||{scores:[]};}
  function ratingHTML(movie,data,loading=false) {
    const names={douban:t('豆瓣','Douban'),imdb:'IMDb',rottentomatoes:t('烂番茄','Rotten Tomatoes'),metacritic:'Metacritic'};
    const units={douban:t('观众评分 /10','Audience /10'),imdb:t('观众评分 /10','Audience /10'),rottentomatoes:t('影评人好评率','Positive critic reviews'),metacritic:t('影评人评分 /100','Critics /100')};
    const scores=(data.scores||[]).filter(score=>score.value!=null&&safeUrl(score.url));
    const status=loading?t('正在检查评分来源…','Checking rating sources…'):data.mode==='live'?t('评分接口已更新','Ratings updated from the service'):scores.length?t('演示模式 · 已核验评分快照','Demo mode · Sourced rating snapshots'):t('演示模式 · 暂无已核验评分','Demo mode · No verified ratings yet');
    return '<div class="ratings-grid">'+scores.map(score=>'<a class="rating-box" href="'+safeUrl(score.url)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc((names[score.platform]||score.label)+' '+score.value+t('，打开评分来源',', open rating source'))+'"><strong>'+esc(score.value)+'</strong><span>'+esc(names[score.platform]||score.label)+'<small>'+esc(units[score.platform]||'')+'</small>'+(data.mode==='live'&&score.mode==='snapshot'?'<small>'+t('快照 ','Snapshot ')+esc(String(score.checkedAt||'').slice(0,10))+'</small>':'')+'</span></a>').join('')+'</div><p class="rating-status">'+status+(!loading&&scores.length&&data.checkedAt?' · '+esc(String(data.checkedAt).slice(0,10)):'')+' · <a href="'+safeUrl(movie.source)+'" target="_blank" rel="noopener noreferrer">'+t('影片资料','Film source')+'</a>'+(data.unavailable?'<br>'+t('暂时无法刷新，保留已有来源资料。','The service is unavailable. Showing existing sourced information.'):'')+'</p>';
  }
  async function fetchRatings(id) {
    if(state.ratings[id])return state.ratings[id];
    if(staticDeployment){const data={...(snapshots[id]||{scores:[]}),mode:'snapshot'};state.ratings[id]=data;return data;}
    try{const response=await fetch('/api/ratings/'+encodeURIComponent(id),{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('ratings');const data=await response.json();if(!Array.isArray(data.scores))throw new Error('ratings');state.ratings[id]=data;return data;}
    catch{return {...(snapshots[id]||{scores:[]}),mode:'snapshot',unavailable:true};}
  }
  function reviewHTML(movie,data) {
    const summary=t(data.reviewSummary,movie.reviewSummaryEn);
    if(!summary||!safeUrl(data.reviewSource))return '<p class="review-note">'+t('暂未收录可核验的影评共识；缺失数据不会作填补。','No sourced review summary is available yet. Missing data is left unfilled.')+'</p>';
    return '<div class="review-block"><div class="review-heading"><span>'+t('影评人怎么看','The critical view')+'</span><a href="'+safeUrl(data.reviewSource)+'" target="_blank" rel="noopener noreferrer">'+t('查看原文','Read the source')+'</a></div><p>'+esc(summary)+'</p><span class="review-note">'+t('根据来源影评人共识整理的中文转述。','An editorial paraphrase of the source’s critics consensus.')+'</span></div>';
  }
  function detailActions(movie) {
    return '<button class="primary-button" data-action="choose-movie" data-id="'+movie.id+'">'+t('就看这部','This is the one')+'</button><button class="secondary-button" data-save="'+movie.id+'" aria-pressed="'+history.savedIds.includes(movie.id)+'">'+icon('bookmark')+(history.savedIds.includes(movie.id)?t('已加入想看','Saved to watchlist'):t('想看','Save to watchlist'))+'</button><button class="text-button" data-action="next-film" '+(state.ranked.length<2?'disabled':'')+'>'+t('看看下一部','Explore the next film')+'</button>';
  }
  function feedbackActions(movie) {
    return '<button class="text-button" data-feedback="liked" data-id="'+movie.id+'" aria-pressed="'+history.likedIds.includes(movie.id)+'">'+icon('heart')+(history.likedIds.includes(movie.id)?t('已喜欢','Liked'):t('喜欢这类电影','More like this'))+'</button><button class="text-button" data-feedback="seen" data-id="'+movie.id+'">'+(history.seenIds.includes(movie.id)?t('已看过','Watched'):t('看过了','Already watched'))+'</button><button class="text-button" data-feedback="disliked" data-id="'+movie.id+'">'+t('不感兴趣','Not for me')+'</button>';
  }
  async function showDetail(id,trigger,options={}) {
    if(!state.completed||state.transitioning)return;const movie=movieById(id);if(!movie)return;
    const origin=trigger?.querySelector('img')?.getBoundingClientRect();
    state.detailId=id;if(trigger)state.detailTrigger=trigger;
    const request=++detailRequest,entry=state.ranked.find(item=>item.movie.id===id),data=currentRatings(id);
    detailDialog.innerHTML='<div class="detail-content"><div class="detail-language language-switch" role="group" aria-label="'+t('语言','Language')+'">'+languageButtons()+'</div><button class="detail-close" data-action="close-detail" aria-label="'+t('返回电影空间','Back to the films')+'">'+icon('x')+'</button><div class="detail-layout"><div class="detail-poster-wrap"><img class="detail-poster" src="'+poster(movie)+'" alt="'+esc(title(movie)+t('海报',' poster'))+'"/></div><div class="detail-info"><p class="detail-kicker">'+t('一个可以走进去的故事','A STORY TO STEP INTO')+'</p><h2 id="detail-title">'+esc(title(movie))+'</h2><p class="original-title">'+esc(movie.originalTitle)+'</p><p class="featured-meta">'+esc(movieMeta(movie))+'<br>'+esc(movie.genres.map(id=>label(genreNames,id)).join(' / '))+'<br>'+t('导演：','Directed by ')+esc(director(movie))+'</p><p class="detail-pitch">'+esc(pitch(movie))+'</p><div class="detail-reason"><span>'+t('为什么推荐给你','Why it belongs here')+'</span><p>'+esc(entry?.rationale||t('这是你在片单中留下的故事。','A story you kept in your collection.'))+'</p></div></div></div><div id="detail-ratings">'+ratingHTML(movie,data,true)+'</div><div id="detail-review">'+reviewHTML(movie,data)+'</div><div class="detail-actions" id="detail-actions">'+detailActions(movie)+'</div><div class="detail-feedback" id="detail-feedback">'+feedbackActions(movie)+'</div><div class="detail-status" role="status" hidden></div></div>';
    document.body.classList.add('detail-open');if(!detailDialog.open)detailDialog.showModal();
    const detailHeading=detailDialog.querySelector('#detail-title');detailHeading.tabIndex=-1;detailHeading.focus({preventScroll:true});
    detailDialog.querySelector('.original-title').textContent=secondaryTitle(movie);
    const edition=t(movie.runtimeEditionZh,movie.runtimeEditionEn);
    if(edition)detailDialog.querySelector('.featured-meta').append(document.createElement('br'),document.createTextNode(t('版本：','Version: ')+edition));
    if(options.scroll!=null)detailDialog.querySelector('.detail-content').scrollTop=options.scroll;
    const target=detailDialog.querySelector('.detail-poster');
    if(origin&&origin.width&&!motionOff()){
      const end=target.getBoundingClientRect(),flying=target.cloneNode();flying.className='poster-flight';flying.alt='';flying.setAttribute('aria-hidden','true');
      Object.assign(flying.style,{left:origin.left+'px',top:origin.top+'px',width:origin.width+'px',height:origin.height+'px'});target.style.opacity='0';detailDialog.appendChild(flying);
      flying.animate([{left:origin.left+'px',top:origin.top+'px',width:origin.width+'px',height:origin.height+'px',opacity:.7},{left:end.left+'px',top:end.top+'px',width:end.width+'px',height:end.height+'px',opacity:1}],{duration:550,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}).finished.catch(()=>{}).then(()=>{flying.remove();target.style.opacity='';});
    }
    const updated=await fetchRatings(id);if(request!==detailRequest||!detailDialog.open||state.detailId!==id)return;
    document.getElementById('detail-ratings').innerHTML=ratingHTML(movie,updated);document.getElementById('detail-review').innerHTML=reviewHTML(movie,updated);
  }
  function closeDetail(restore=true) {
    if(!detailDialog.open)return;
    detailRequest++;detailDialog.close();document.body.classList.remove('detail-open');
    if(state.dirtyResults&&state.view==='results')renderResults();if(state.view==='saved')renderLibrary();
    if(restore){const target=state.detailTrigger?.isConnected?state.detailTrigger:root.querySelector('[data-detail="'+CSS.escape(state.detailId)+'"]')||root.querySelector('h1');if(target){if(!target.matches('button'))target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function toggleSave(id) {
    const movie=movieById(id);if(!movie)return;const saved=history.savedIds.includes(id);
    history.savedIds=saved?history.savedIds.filter(value=>value!==id):history.savedIds.concat(id);persist();
    if(detailDialog.open)document.getElementById('detail-actions').innerHTML=detailActions(movie);
    root.querySelectorAll('[data-save="'+CSS.escape(id)+'"]').forEach(button=>{button.setAttribute('aria-pressed',String(!saved));button.innerHTML=icon('bookmark')+(!saved?t('已想看','Saved'):t('想看','Save'));});
    if(state.view==='saved')renderLibrary();
    toast(saved?t('已移出想看','Removed from your watchlist'):t('已加入想看片单','Saved to your watchlist'));
  }
  function feedback(kind,id) {
    if(!movieById(id)||!['liked','seen','disliked'].includes(kind))return;
    const key=kind+'Ids',already=history[key].includes(id),wasDisliked=history.dislikedIds.includes(id);
    if(kind==='liked'&&already)history[key]=history[key].filter(value=>value!==id);else if(!already)history[key].push(id);
    if(kind==='liked')history.dislikedIds=history.dislikedIds.filter(value=>value!==id);if(kind==='disliked')history.likedIds=history.likedIds.filter(value=>value!==id);
    persist();if(kind!=='liked'||wasDisliked)state.dirtyResults=true;
    if(detailDialog.open)document.getElementById('detail-feedback').innerHTML=feedbackActions(movieById(id));
    toast(kind==='liked'?(already?t('已取消喜欢','Like removed'):t('已记住你的喜好，下次选片会参考。','We’ll keep your taste in mind next time.')):kind==='seen'?t('已标记看过，后续推荐会避开。','Marked as watched. We’ll leave it out of future picks.'):t('已记住，后续不再推荐这部。','Noted. We’ll leave this film out of future picks.'));
  }
  async function chooseMovie(id) {if(!movieById(id)||state.transitioning)return;state.chosenId=id;history.chosen={id,date:dateKey()};persist();closeDetail(false);await transition(renderChosen);}
  function renderChosen() {
    const movie=movieById(state.chosenId);if(!movie){renderResults();return;}state.view='chosen';updateChrome();
    root.innerHTML='<section class="chosen-scene scene"><div class="chosen-inner"><p class="chosen-seal">'+icon('check')+t('今晚的电影','YOUR FILM FOR TONIGHT')+'</p><p class="scene-eyebrow">'+t('今晚的选择，已为你记下','TONIGHT, THE CHOICE IS YOURS')+'</p><img class="chosen-poster" src="'+poster(movie)+'" alt="'+esc(title(movie)+t('海报',' poster'))+'"/><h1 class="glow-heading">'+esc(title(movie))+'</h1><p class="chosen-meta">'+esc(movieMeta(movie))+'</p><p class="scene-note">'+t('愿这个故事，陪你度过一个好夜晚。','May this story make good company tonight.')+'</p><div class="chosen-actions"><button class="secondary-button" data-save="'+movie.id+'" aria-pressed="'+history.savedIds.includes(movie.id)+'">'+(history.savedIds.includes(movie.id)?t('已想看','Saved'):t('加入想看','Save to watchlist'))+'</button><button class="text-button" data-nav="results">'+t('回到电影空间','Back to the films')+'</button></div></div></section>';
  }
  function renderLibrary() {
    state.view='saved';updateChrome();const movies=history[state.libraryTab+'Ids'].map(movieById).filter(Boolean);
    root.innerHTML='<section class="library"><p class="scene-eyebrow">'+t('你留下的故事','STORIES YOU KEPT')+'</p><h1 class="glow-heading">'+t('我的片单','Your collection')+'</h1><div class="library-tabs" role="group" aria-label="'+t('片单分类','Collection categories')+'">'+[['saved',t('想看','Watchlist')],['liked',t('喜欢','Liked')],['seen',t('看过','Watched')],['disliked',t('不感兴趣','Not for me')]].map(([id,name])=>'<button class="filter-chip '+(state.libraryTab===id?'active':'')+'" data-library-tab="'+id+'" aria-pressed="'+(state.libraryTab===id)+'">'+name+' '+history[id+'Ids'].length+'</button>').join('')+'</div>'+(movies.length?'<div class="library-list">'+movies.map(movie=>'<article class="library-row"><div><button class="library-row-title" data-detail="'+movie.id+'">'+esc(title(movie))+'</button><p class="library-row-info">'+esc(movieMeta(movie))+'</p></div>'+(['seen','disliked'].includes(state.libraryTab)?'<button class="text-button" data-restore="'+movie.id+'">'+t('重新加入推荐','Include in recommendations')+'</button>':'<button class="text-button" data-save="'+movie.id+'">'+(history.savedIds.includes(movie.id)?t('移出想看','Remove from watchlist'):t('加入想看','Save to watchlist'))+'</button>')+'</article>').join('')+'</div>':'<div class="empty-state"><p>'+t('遇见想看的故事时，把它留在这里。','When a story catches your eye, keep it here.')+'</p><button class="primary-button" data-nav="results">'+t('回到电影空间','Back to the films')+'</button></div>')+'</section>';
  }
  function renderAbout() {
    aboutDialog.innerHTML='<button class="detail-close" data-action="close-about" aria-label="'+t('关闭说明','Close information')+'">'+icon('x')+'</button><h2 id="about-title">'+t('选片，有理由可循。','Every pick has a reason.')+'</h2><h3>'+t('从心情出发，走进世界电影','Your mood. A world of cinema.')+'</h3><p>'+t('从 '+catalog.length+' 部精选电影中，结合心情、观影目标、类型、制片国家／地区、时长与本机喜好记录来推荐。国家／地区可多选，合拍片匹配任一所选地区；不限时探索完整片库。不是全网检索，片库仍会有未覆盖的地区。','We recommend from '+catalog.length+' curated films using your mood, viewing goal, genre, production regions, time limit and saved preferences. Select multiple regions; a co-production matches any one. “Anywhere” explores the whole collection. This is a curated collection, not a search across every film in the world.')+'</p><h3>'+t('国家／地区怎样排序','How regions are ordered')+'</h3><p>'+t('常用国家／地区优先展示，其余收在更多选项中。各组内按本片库已核验的豆瓣或 IMDb 8.0 分及以上影片数量排序，同一影片不因多个评分重复计数；合拍片计入每个制片地区。数量相同则参考片库收录数量。这是当前精选片库的统计，不是全球电影质量排名；未取得评分的电影不计入高分数量。','Common production regions appear first; all others remain available under more options. Within each group, regions are ordered by the number of films with a sourced Douban or IMDb score of at least 8.0. Each film counts once per production region; co-productions count in each region. Ties use collection size. This describes our curated collection, not a global ranking. Films without verified scores are not counted as highly rated.')+'</p><h3>'+t('有来源的评分','Sourced ratings')+'</h3><p>'+t('演示模式展示已有核验快照，缺失分数不作填补。每项评分可打开来源，核验日期不代表源站当天更新。国家／地区按制作归属记录，不代表对白语言。','Demo mode shows sourced rating snapshots. Missing ratings remain empty. Each score links to its source; the checked date is not a promise of a current score. Production regions do not imply a film’s spoken language.')+'</p><h3>'+t('你的偏好，留在本机','Your preferences stay here')+'</h3><p>'+t('心情使用中英文关键词与标签匹配，复杂表达可能理解不完整。切换界面语言不会改变电影的语言，也不会清空当前问答。语言偏好、收藏和喜好保存在当前浏览器。','Mood matching uses Chinese and English keywords and editorial tags; complex expressions may be missed. Switching the interface language does not change a film’s spoken language or clear your answers. Your language, watchlist and taste are saved in this browser.')+'</p><h3>'+t('按你的节奏探索','Explore at your own pace')+'</h3><p>'+t('使用左右按钮、方向键或手机滑动切换主推荐。可暂停漂浮，也会遵循系统减少动态效果设置。','Use the arrows, keyboard arrow keys or a horizontal swipe to change the featured film. Motion can be paused and follows your system’s reduced-motion setting.')+'</p>';
  }
  function setLocale(locale) {
    if(!['zh','en'].includes(locale)||history.locale===locale||state.transitioning)return;
    const open=detailDialog.open,detailScroll=open?detailDialog.querySelector('.detail-content').scrollTop:0;
    const activeId=state.detailId,scroll=window.scrollY;
    history.locale=locale;persist();
    if(state.query){
      const localized=engine.recommend({...state.query,locale},{...history,seenIds:[],dislikedIds:[]},{dateKey:dateKey()});
      const byId=new Map(localized.map(entry=>[entry.movie.id,entry]));
      state.ranked=state.ranked.map(entry=>byId.has(entry.movie.id)?{...byId.get(entry.movie.id),score:entry.score}:entry);
    }
    const pendingExclusions=state.dirtyResults;state.dirtyResults=false;
    ({home:renderHome,questions:renderQuestion,reveal:renderReveal,results:renderResults,chosen:renderChosen,saved:renderLibrary}[state.view]||renderHome)();
    state.dirtyResults=pendingExclusions;
    window.scrollTo({top:scroll,behavior:'instant'});
    if(open){showDetail(activeId,null,{scroll:detailScroll});detailDialog.querySelector('[data-locale="'+locale+'"]').focus({preventScroll:true});}
    else if(!aboutDialog.open)document.querySelector('.header [data-locale="'+locale+'"]')?.focus({preventScroll:true});
    if(aboutDialog.open)renderAbout();
    document.querySelectorAll('.toast,.detail-status').forEach(box=>box.hidden=true);
  }
  async function navigate(view) {
    if(state.transitioning)return;closeDetail(false);
    if(view==='results'&&state.completed)await transition(renderResults);else if(view==='saved'&&state.completed)await transition(renderLibrary);else await transition(renderHome);
  }
  function recoverFocus(button) {
    const context=button.closest('dialog')||root;
    const selector=['action','save','feedback','id','libraryTab','restore'].filter(key=>button.dataset[key]!==undefined).map(key=>'[data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+'="'+CSS.escape(button.dataset[key])+'"]').join('');
    if(!selector)return;
    queueMicrotask(()=>{if(button.isConnected||state.transitioning)return;const active=document.activeElement;if(active!==document.body&&active!==context)return;const replacement=context.querySelector(selector)||context.querySelector('h1,h2');if(replacement){if(!replacement.matches('button'))replacement.tabIndex=-1;replacement.focus({preventScroll:true});}});
  }
  document.addEventListener('click',event=>{
    if(Date.now()<suppressClickUntil&&event.target.closest('.spotlight-stage')){event.preventDefault();return;}
    const button=event.target.closest('button,a.brand');if(!button||button.disabled)return;recoverFocus(button);
    if(state.switching&&button.closest('.spotlight-stage'))return;
    if(button.matches('a.brand')){event.preventDefault();navigate('home');return;}
    const data=button.dataset;
    if(data.countryRemove){state.answers.countries=state.answers.countries.filter(code=>code!==data.countryRemove);syncCountrySelection();const focus=root.querySelector('.selected-country')||root.querySelector('.country-option input');if(focus)focus.focus({preventScroll:true});return;}
    if(data.locale){setLocale(data.locale);return;}if(data.nav){navigate(data.nav);return;}if(data.direction){switchFeature(Number(data.direction));return;}if(data.feature!==undefined){switchFeature(0,Number(data.feature));return;}
    if(data.detail){showDetail(data.detail,button);return;}if(data.save){toggleSave(data.save);return;}if(data.feedback){feedback(data.feedback,data.id);return;}
    if(data.libraryTab){state.libraryTab=data.libraryTab;renderLibrary();return;}
    if(data.restore){history.seenIds=history.seenIds.filter(id=>id!==data.restore);history.dislikedIds=history.dislikedIds.filter(id=>id!==data.restore);state.dirtyResults=true;persist();renderLibrary();toast(t('已恢复，可以再次出现在推荐中。','Restored to your recommendations.'));return;}
    switch(data.action){
      case 'toggle-motion':if(!reducedMotion.matches){history.motionPaused=!history.motionPaused;persist();}break;
      case 'about':renderAbout();aboutDialog.showModal();break;
      case 'close-about':aboutDialog.close();break;
      case 'close-detail':closeDetail();break;
      case 'choose-movie':chooseMovie(data.id);break;
      case 'next-film':{
        const previous=state.detailId,index=state.ranked.findIndex(entry=>entry.movie.id===previous);
        const origin=index>=0?index:state.activeIndex;
        const nextIds=state.ranked.map((_,offset)=>state.ranked[(origin+offset+(index>=0?1:0))%state.ranked.length].movie.id);
        if(index>=0)state.activeIndex=index;
        closeDetail(false);if(state.view!=='results')renderResults();
        const nextId=nextIds.find(id=>state.ranked.some(entry=>entry.movie.id===id));
        const nextIndex=state.ranked.findIndex(entry=>entry.movie.id===nextId);
        if(nextIndex>=0&&nextIndex!==state.activeIndex)switchFeature(0,nextIndex);
        break;
      }
      case 'edit-answers':transition(()=>{state.step=0;renderQuestion();});break;
      case 'back-question':transition(()=>{if(state.step){state.step--;renderQuestion();}else renderHome();});break;
      case 'next-question':if(state.transitioning||state.answers[questions()[state.step].key]===null)return;if(state.step===questions().length-1)finishQuestions();else transition(()=>{state.step++;renderQuestion();});break;
    }
  });
  document.addEventListener('submit',event=>{if(event.target.id==='mood-form'){event.preventDefault();startQuestions();}});
  document.addEventListener('input',event=>{if(event.target.id==='mood-input'){state.draft=event.target.value;document.getElementById('mood-count').textContent=state.draft.length+' / 240';document.getElementById('mood-error').textContent='';event.target.form.querySelector('button[type="submit"]').disabled=!state.draft.trim();}});
  document.addEventListener('compositionstart',event=>{if(event.target.id==='mood-input')composingMood=true;});
  document.addEventListener('compositionend',event=>{if(event.target.id==='mood-input')composingMood=false;});
  document.addEventListener('keydown',event=>{
    if(event.target.id==='mood-input'&&event.key==='Enter'&&!event.shiftKey&&!event.isComposing&&!composingMood&&event.keyCode!==229){event.preventDefault();event.target.form.requestSubmit();}
    if(!detailDialog.open&&!aboutDialog.open&&event.target.closest('.spotlight-scene')&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();switchFeature(event.key==='ArrowLeft'?-1:1);}
  });
  document.addEventListener('change',event=>{
    if(state.view!=='questions'||!event.target.matches('.question-option input'))return;
    const question=questions()[state.step];
    if(question.multi){
      const value=event.target.value;
      if(value==='any')state.answers.countries=[];
      else if(event.target.checked)state.answers.countries=[...new Set([...state.answers.countries,value])];
      else state.answers.countries=state.answers.countries.filter(id=>id!==value);
      syncCountrySelection();
    }else {state.answers[question.key]=event.target.value;const summary=root.querySelector('.question-more summary');if(summary)summary.innerHTML=moreSummary(question);}
    root.querySelector('[data-action="next-question"]').disabled=false;
  });
  document.addEventListener('toggle',event=>{if(event.target.isConnected&&state.view==='questions'&&event.target.matches?.('.question-more'))state.expanded[event.target.dataset.more]=event.target.open;},true);
  document.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'&&event.target.closest('.spotlight-stage'))touchStart={x:event.clientX,y:event.clientY,id:event.pointerId};});
  document.addEventListener('pointerup',event=>{if(!touchStart||event.pointerId!==touchStart.id)return;const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){suppressClickUntil=Date.now()+400;switchFeature(dx<0?1:-1);}});
  document.addEventListener('pointercancel',()=>touchStart=null);
  detailDialog.addEventListener('cancel',event=>{event.preventDefault();closeDetail();});
  [detailDialog,aboutDialog].forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){if(dialog===detailDialog)closeDetail();else dialog.close();}}));
  document.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.classList.add('image-failed');event.target.alt=t('海报暂时无法显示','Poster unavailable');}},true);
  reducedMotion.addEventListener('change',updateChrome);
  renderHome();
})();
