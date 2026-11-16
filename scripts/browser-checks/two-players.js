// Browser check (step 9.6): two players on one page do not share state. Body of an async function; `page` on
// /two-players.html, 1440 wide. In, frame steps, zoom and a guide set in player A leave B alone; `K` with focus in B
// plays B only; each player remembers guides under its own key; no element id is used twice.
const out = {};
await page.waitForFunction(() => { const v = document.querySelectorAll('video'); return v.length === 2 && [...v].every((e) => e.duration > 0); }, null, { timeout: 40000 });
await page.waitForTimeout(1000);
await page.evaluate(() => { try { localStorage.clear(); } catch {} });
const S = (i) => page.evaluate((i) => {
  const s = document.querySelectorAll('.pro-skin')[i]; const v = s.querySelector('video');
  return { paused: v.paused, t: +v.currentTime.toFixed(2), range: s.querySelector('.pro-timeline')?.dataset.range ?? null, titleSafe: s.hasAttribute('data-guide-title-safe'), zoom: s.dataset.zoom ?? 'fit', tc: s.querySelector('[data-pro-timecode]')?.textContent.trim().slice(0, 11) };
}, i);
const skin = (i) => page.locator('.pro-skin').nth(i);
const play = (i) => skin(i).locator('.media-play-button:not(.pro-center-play)');
await page.evaluate(() => { document.querySelectorAll('video').forEach((v, i) => { v.pause(); v.currentTime = 10 + i * 10; }); });
await page.waitForTimeout(800);
await play(0).focus(); await page.keyboard.press('i'); await page.waitForTimeout(400);
out.inOnlyA = { a: await S(0), b: await S(1) };
await page.keyboard.press('.'); await page.keyboard.press('.'); await page.waitForTimeout(600);
out.stepOnlyA = { a: await S(0), b: await S(1) };
await page.keyboard.press('z'); await page.waitForTimeout(400);
out.zoomOnlyA = { a: await S(0), b: await S(1) };
await skin(0).locator('[data-pro-menu="guides"]').focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400); await page.keyboard.press('Enter'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
out.guidesOnlyA = { a: await S(0), b: await S(1) };
out.storage = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('frameline')).sort());
await play(1).focus(); await page.keyboard.press('k'); await page.waitForTimeout(800);
out.playOnlyB = { a: await S(0), b: await S(1) };
await page.keyboard.press('k'); await page.waitForTimeout(300);
out.liveRegions = await page.evaluate(() => document.querySelectorAll('[aria-live]').length);
out.dupIds = await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map((e) => e.id); return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))].slice(0, 8); });
// Video.js numbers text-track menu items by kind and index (`subtitles0`), so two players repeat those ids; that is
// Video.js's, not the skin's, and is listed but does not fail the check.
out.dupIdsOurs = out.dupIds.filter((id) => !/^(subtitles|captions|chapters|descriptions|metadata)\d+$/.test(id));
out.pass = out.inOnlyA.a.range !== 'none' && out.inOnlyA.b.range === 'none'
  && out.stepOnlyA.a.t > out.inOnlyA.a.t && out.stepOnlyA.b.t === out.inOnlyA.b.t
  && out.zoomOnlyA.a.zoom !== 'fit' && out.zoomOnlyA.b.zoom === 'fit'
  && out.guidesOnlyA.a.titleSafe && !out.guidesOnlyA.b.titleSafe
  && out.storage.includes('frameline:two-a') && !out.storage.includes('frameline:two-b')
  && out.playOnlyB.a.paused && !out.playOnlyB.b.paused
  && out.dupIdsOurs.length === 0;
return out;
