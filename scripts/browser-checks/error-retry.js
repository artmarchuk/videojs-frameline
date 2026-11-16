// Browser check (step 9.6): on a broken source the error dialog shows, Retry reloads the source, and when that fails
// too the dialog shows again. Body of an async function; `page` on /preview.html?tier=studio&media=error (or viewer).
const out = {};
const dialog = () => page.evaluate(() => { const d = document.querySelector('.media-error-dialog, [role="alertdialog"], [role="dialog"][data-error]') ?? [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].find((e) => /retry/i.test(e.textContent)); return d ? { open: !d.hidden && getComputedStyle(d).display !== 'none' && getComputedStyle(d).visibility !== 'hidden', text: d.textContent.trim().slice(0, 120) } : null; });
await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some((e) => /retry/i.test(e.textContent) && !e.hidden), null, { timeout: 30000 }).catch(() => {});
out.first = await dialog();
out.errorCode = await page.evaluate(() => document.querySelector('video')?.error?.code ?? null);
const retry = page.getByRole('button', { name: /retry/i }).first();
out.retryVisible = await retry.isVisible().catch(() => false);
if (out.retryVisible) await retry.click();
await page.waitForTimeout(400);
out.afterClick = await dialog();
// The reload fails too: the dialog must come back.
await page.waitForFunction(() => [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].some((e) => /retry/i.test(e.textContent) && !e.hidden), null, { timeout: 30000 }).catch(() => {});
out.second = await dialog();
out.errorCodeAfter = await page.evaluate(() => document.querySelector('video')?.error?.code ?? null);
out.pass = !!out.first?.open && out.retryVisible && !!out.second?.open;
return out;
