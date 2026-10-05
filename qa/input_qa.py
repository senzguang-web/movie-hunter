from playwright.sync_api import sync_playwright
import json
from pathlib import Path
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 page.goto('http://127.0.0.1:8080/')
 mood=page.locator('#lab-mood-input');mood.fill('今天有点累')
 mood.dispatch_event('compositionstart');mood.press('Enter')
 assert page.locator('#lab-mood-input').is_visible()
 mood.dispatch_event('compositionend');mood.press('Shift+Enter')
 assert '\n' in mood.input_value()
 mood.press('Enter')
 def settled():page.wait_for_function("!document.querySelector('#stage').hasAttribute('aria-busy')")
 for i,label in enumerate(['feeling','genres','duration','regions']):
  settled();page.screenshot(path=f'qa/screenshots/13-{i+1}-mobile-{label}.png',full_page=True)
  if i==0:page.locator('input[value=comfort]').check()
  if i==2:page.locator('input[value="0"]').check()
  page.locator('[data-action=next-question]').tap()
 settled()
 page.locator('.film-stage').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':1,'clientX':280,'clientY':340})
 page.locator('.film-stage').dispatch_event('pointerup',{'pointerType':'touch','pointerId':1,'clientX':80,'clientY':340})
 settled();assert page.locator('.thumb.active').get_attribute('data-film')=='1'
 page.locator('.film-stage').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':2,'clientX':280,'clientY':340})
 page.locator('.film-stage').dispatch_event('pointercancel',{'pointerType':'touch','pointerId':2})
 page.locator('.film-stage').dispatch_event('pointerup',{'pointerType':'touch','pointerId':2,'clientX':80,'clientY':340})
 assert page.locator('.thumb.active').get_attribute('data-film')=='1'
 b.close()
report={'imeEnter':'passed','shiftEnter':'passed','mobileTaps':'passed','swipeAndPointerCancel':'passed via synthetic pointer events'}
Path('qa/input-results.json').write_text(json.dumps(report,indent=2)+'\n');print(report)
