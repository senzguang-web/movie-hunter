from playwright.sync_api import sync_playwright
import json,sys
sys.path.insert(0,'qa')
# Deliberately don't import browser_qa: it runs its full suite.
report={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,port in [('before',8081),('after',8080)]:
  page=b.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
  page.goto(f'http://127.0.0.1:{port}/')
  page.locator('#lab-mood-input').fill('今天有点累')
  page.locator('#lab-mood-input').press('Enter')
  for i in range(4):
   page.wait_for_function("!document.querySelector('#stage').hasAttribute('aria-busy')")
   if i==0:page.locator('input[value=comfort]').check()
   if i==2:page.locator('input[value="0"]').check()
   page.locator('[data-action=next-question]').click()
  page.wait_for_function("!document.querySelector('#stage').hasAttribute('aria-busy')")
  page.mouse.move(0,0)
  page.locator('.film-thumbnails').scroll_into_view_if_needed()
  page.wait_for_timeout(300)
  report[name]=page.evaluate('''()=>({thumb:{color:getComputedStyle(document.querySelector('.thumb:not(.active) span')).color,opacity:getComputedStyle(document.querySelector('.thumb:not(.active)')).opacity},counter:getComputedStyle(document.querySelector('.film-counter span')).color,posters:performance.getEntriesByType('resource').filter(x=>x.name.includes('paddington')).map(x=>({url:x.name,bytes:x.encodedBodySize})),images:[...document.images].map(e=>({src:e.currentSrc,width:e.clientWidth,loading:e.loading}))})''')
  page.screenshot(path=f'qa/screenshots/12-{name}-comfort-comparison.png',full_page=True)
  page.close()
 b.close()
open('qa/asset-comparison.json','w').write(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
