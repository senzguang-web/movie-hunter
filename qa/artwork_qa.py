import asyncio,json,time
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
 results={}
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for mode in ['broken','slow']:
   page=await b.new_page(reduced_motion='reduce')
   async def intercept(route):
    if mode=='broken':await route.abort()
    else:
     await asyncio.sleep(5)
     try: await route.continue_()
     except Exception: pass # Context can close while delayed artwork remains pending.
   await page.route('**/*.{jpg,webp}',intercept)
   await page.goto('http://127.0.0.1:8080/')
   await page.locator('#lab-mood-input').fill('jazz');await page.locator('#lab-mood-input').press('Enter')
   async def settled():await page.wait_for_function("!document.querySelector('#stage').hasAttribute('aria-busy')")
   for i in range(4):
    await settled()
    if i==0:await page.locator('input[value=think]').check()
    if i==2:await page.locator('input[value="0"]').check()
    if i==3:await page.emulate_media(reduced_motion='no-preference')
    t=time.monotonic();await page.locator('[data-action=next-question]').click()
   await settled();elapsed=time.monotonic()-t
   assert elapsed<3.5,(mode,elapsed)
   assert await page.locator('.hero-poster').evaluate('(e)=>e.naturalWidth')==0
   assert await page.locator('.hero-poster').get_attribute('alt')
   await page.locator('[data-action=choose]').click();await settled()
   assert await page.locator('.selected-panel').is_visible()
   results[mode]={'resultsReadySeconds':round(elapsed,3),'navigationWhileArtworkUnavailable':'passed'}
   await page.close()
  await b.close()
 Path('qa/artwork-results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results,indent=2))
asyncio.run(main())
