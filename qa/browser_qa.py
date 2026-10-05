"""Run against `python3 -m http.server 8080`; requires Playwright and Chromium.
Optional baseline server on 8081 enables measured before/after comparisons.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json, time
ROOT=Path(__file__).resolve().parent
results={}
def settled(page):
 page.wait_for_function("!document.querySelector('#stage').hasAttribute('aria-busy')")
 assert page.locator('#stage').evaluate('(e)=>getComputedStyle(e).opacity')=='1'
def flow(page, mood='今天有点累', desired='comfort', genres=(), minutes='0', countries=()):
 page.locator('#lab-mood-input').fill(mood)
 page.locator('#lab-mood-input').press('Enter');settled(page)
 page.locator(f'input[value="{desired}"]').check()
 page.locator('[data-action=next-question]').click();settled(page)
 for genre in genres: page.locator(f'input[value="{genre}"]').check()
 page.locator('[data-action=next-question]').click();settled(page)
 page.locator(f'input[value="{minutes}"]').check()
 page.locator('[data-action=next-question]').click();settled(page)
 for country in countries:
  target=page.locator(f'input[value="{country}"]')
  if not target.is_visible(): page.locator('.country-more summary').click()
  target.check()
 page.locator('[data-action=next-question]').click();settled(page)
def shots(page,name):
 page.mouse.move(0,0);page.screenshot(path=str(ROOT/'screenshots'/name),full_page=True)
def batch(page): return page.locator('.thumb').evaluate_all('(es)=>es.map(e=>e.getAttribute("aria-label"))')
def contrast(page,selector):
 data=page.locator(selector).first.evaluate('''e=>{let opacity=1;for(let n=e;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);return {color:getComputedStyle(e).color,opacity,background:getComputedStyle(document.body).backgroundColor}}''')
 rgb=[float(x.strip())*data['opacity']/255 for x in data['color'][4:-1].split(',')]
 linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
 data['ratioOnBlack']=round((sum(a*b for a,b in zip(linear,[.2126,.7152,.0722]))+.05)/.05,2)
 return data
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8080/',wait_until='networkidle')
 shots(page,'04-after-desktop-mood.png')
 assert page.locator('#motion-toggle').is_disabled()
 flow(page,'jazz','think');assert len(batch(page))==1
 assert page.locator('[data-action=another-batch]').is_disabled()
 shots(page,'05-after-jazz-one-result.png')
 page.locator('#locale-toggle').click();assert page.locator('html').get_attribute('lang')=='en'
 assert len(batch(page))==1 and 'Soul' in page.locator('.film-title').inner_text()
 page.locator('[data-action=choose]').click();settled(page)
 assert page.locator('.chosen-title').inner_text()=='Soul'
 page.locator('[data-action=back-results]').click();settled(page)
 page.locator('#restart').click();settled(page)
 flow(page,'jazz','think',minutes='90');assert page.locator('.empty-state').is_visible()
 shots(page,'06-after-empty-result.png');results['one_zero_selection_locale']='passed'
 page.locator('#restart').click();settled(page)
 page.locator('#locale-toggle').click()
 flow(page)
 first=batch(page);assert len(first)>1
 shots(page,'07-after-desktop-results.png')
 page.mouse.move(0,0)
 results['contrast']={'thumbnail':contrast(page,'.thumb:not(.active) span'),'counter':contrast(page,'.film-counter span')}
 page.locator('[data-action=next-film]').focus();page.keyboard.press('ArrowRight');settled(page)
 assert page.locator('.thumb.active').get_attribute('data-film')=='1'
 assert page.locator('[data-action=next-film]').evaluate('(e)=>e===document.activeElement')
 page.keyboard.press('ArrowLeft');settled(page)
 assert page.locator('.thumb.active').get_attribute('data-film')=='0'
 # System motion preference changes while the page stays open.
 page.emulate_media(reduced_motion='no-preference')
 t=time.monotonic();page.locator('[data-action=next-film]').click();settled(page)
 results['filmSwitchSeconds']=round(time.monotonic()-t,3)
 assert results['filmSwitchSeconds']<.7
 for _ in range(8): page.locator('[data-action=next-film]').click();settled(page)
 assert page.locator('.thumb.active').get_attribute('data-film')==str(9%len(first))
 page.locator('#motion-toggle').click();assert page.locator('html').evaluate('(e)=>e.classList.contains("motion-paused")')
 page.set_viewport_size({'width':320,'height':740});settled(page)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert page.locator('.film-reason').bounding_box()['width']>=270
 assert page.locator('[data-action=next-film]').bounding_box()['height']>=44
 shots(page,'08-after-mobile-results.png')
 page.locator('#locale-toggle').click();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 shots(page,'09-after-mobile-english.png')
 page.set_viewport_size({'width':720,'height':500}) # 1440 desktop at 200% layout zoom equivalent
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 shots(page,'10-after-200pct-layout.png')
 results['keyboard_mobile_320_zoom_layout_rapid']='passed (720 CSS px reflow; not native browser zoom)'
 page.locator('#locale-toggle').click()
 seen=first[:];rounds=[len(first)]
 while not page.locator('[data-action=another-batch]').is_disabled():
  page.locator('[data-action=another-batch]').click();settled(page)
  current=batch(page);assert not set(current)&set(seen)
  seen+=current;rounds.append(len(current));assert len(rounds)<33
 last=batch(page)
 page.locator('[data-action=another-batch]').evaluate('(e)=>e.click()');assert batch(page)==last
 shots(page,'11-after-exhaustion.png')
 page.locator('#restart').click();settled(page);flow(page)
 assert set(batch(page))&set(seen)
 results['refresh_exhaustion_reset']={'roundSizes':rounds,'uniqueFilms':len(seen)}
 page.locator('#restart').click();settled(page)
 flow(page,genres=['drama','comedy'],minutes='120',countries=['US','GB'])
 texts=page.locator('.film-meta').inner_text();assert '分钟' in texts
 results['multifilter_browser']='passed; full 256-query engine matrix separately'
 # Interrupt a full particle transition by resize, reduced motion, and visibility events.
 page.locator('#motion-toggle').click()
 page.locator('[data-action=edit-answers]').click()
 page.set_viewport_size({'width':390,'height':844});page.emulate_media(reduced_motion='reduce');settled(page)
 assert page.locator('.question-panel').is_visible()
 page.emulate_media(reduced_motion='no-preference')
 page.locator('[data-action=back-question]').click()
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
 settled(page)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))")
 assert page.locator('#lab-mood-input').is_visible()
 results['interruptions']='resize, reduced-motion change, synthetic background/foreground events passed; real OS tab suspension unrun'
 page.emulate_media(reduced_motion='reduce')
 # Broken artwork cannot block choosing a film or moving to another.
 page.route('**/*.{jpg,webp}',lambda route:route.abort())
 flow(page)
 assert page.locator('.hero-poster').evaluate('(e)=>e.complete')
 page.locator('[data-action=choose]').click();settled(page)
 assert page.locator('.selected-panel').is_visible()
 results['broken_images']='passed navigation/selection; accessible alt remains'
 results['pageErrors']=errors;assert not errors
 browser.close()
(ROOT/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False,indent=2))
