// Browser check (step 9.3): with `prefers-reduced-motion: reduce` emulated, nothing in the skin or on the page moves.
// Body of an async function; `page` on the page to scan, context created with reducedMotion: 'reduce'. Opens a menu,
// shows a toast (G, grab frame) and the volume slide-out where they exist, then lists every element whose computed
// transition or animation still has a duration, and any smooth scroll behaviour.
const out = {};
out.reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(600);
await page.evaluate(() => { HTMLAnchorElement.prototype.click = function () {}; });
const scan = () => page.evaluate(() => {
  const moving = [];
  for (const el of document.querySelectorAll('body, body *')) {
    const cs = getComputedStyle(el);
    const dur = (v) => v.split(',').some((d) => parseFloat(d) > 0);
    const td = cs.transitionDuration, ad = cs.animationDuration;
    if ((dur(td) && cs.transitionProperty !== 'none') || (dur(ad) && cs.animationName !== 'none') || cs.scrollBehavior === 'smooth') {
      moving.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 3).join('.') : ''), transition: td !== '0s' ? `${cs.transitionProperty} ${td}` : undefined, animation: ad !== '0s' && cs.animationName !== 'none' ? `${cs.animationName} ${ad}` : undefined, scroll: cs.scrollBehavior === 'smooth' ? 'smooth' : undefined });
    }
  }
  return moving;
});
out.idle = await scan();
const studio = await page.$('[data-pro-menu="guides"]');
if (studio) {
  await page.focus('[data-pro-menu="guides"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  out.menuOpen = await scan(); await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  await page.focus('.media-play-button:not(.pro-center-play)'); await page.keyboard.press('g'); await page.waitForTimeout(300);
  out.toast = await scan();
  out.toastShown = !!(await page.$('.pro-toast'));
}
const vol = await page.$('.media-volume-slider-thumb');
if (vol) { await page.focus('.media-volume-slider-thumb'); await page.waitForTimeout(200); out.volumeOpen = await scan(); }
const settings = await page.$('.media-settings-button');
if (settings) { await page.focus('.media-settings-button'); await page.keyboard.press('Enter'); await page.waitForTimeout(300); out.settingsOpen = await scan(); await page.keyboard.press('Escape'); }
out.pass = ['idle', 'menuOpen', 'toast', 'volumeOpen', 'settingsOpen'].every((k) => !out[k] || out[k].length === 0);
return out;
