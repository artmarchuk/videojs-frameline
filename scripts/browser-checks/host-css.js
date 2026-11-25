// Browser check: a host page's CSS does not change the player, and the player's CSS does not change the host page.
// Body of an async function; `page` on /preview.html?tier=studio or ?tier=viewer, at any window size.
//
// The host page is the monitor page itself with a host's stylesheet added to it (the document is rewritten on its
// way to the browser), so the player is the same player in the same box:
//   inherited        typography on the player's ancestors (`font: 20px/2 serif`, colour, `text-align: center`, …)
//   unlayered        element rules outside any layer: margins, padding, borders, backgrounds, fonts, `display`,
//                    `box-sizing` on `button`, `kbd`, `ul`, `li`, `svg`, `span`, `div`, `input`, `a`, `video`, `*`
//   reboot           a framework-style reset, outside any layer
//   tailwind-before  Tailwind v4's preflight in its `base` layer, declared before the skin's CSS
//   tailwind-after   the same, declared after every stylesheet of the skin
// The stylesheets are in fixtures/host-css/; the runner compiles the preflight from the installed `tailwindcss`.
// Out of scope, by design: host rules with `!important`, with an ID, or that name the skin's own classes.
//
// For every element `dom-snapshot.js` records (the skin, its menus, dialogs and tooltips), and their `::before` and
// `::after`, the check reads every computed property and the box, in each state: idle, a control focused from the
// keyboard with its tooltip, every menu open, the help dialog. Each host page must give what the plain page gives.
// A screenshot of the player in each state is compared as well (`shots`, in the results folder), as a second line of
// evidence: under 0.2% of the pixels may be without a match within one pixel. (The player's corners are round on
// this page, so a few pixels of the host's own background show there.)
//
// So that a difference means a leak and not a different layout around the player, the player's parent keeps the box
// it has on the plain page (it is fixed there, with `!important`); `pinKeepsThePlayer` says the plain page looks
// the same with that. Two loads of the plain page are compared first: what differs between them is noise and is left
// out. The buffer bars are always left out: how far the media has buffered differs from load to load.
//
// The other direction, with `args.reverse`: a set of host elements (fixtures/host-css/probe.html) has the same
// computed styles with the skin's stylesheets and without them. The skin's `@property` registrations are global; the
// two properties they register are listed in `out.reverse.registered` and not counted.
//
// As a snapshot (`args.snapshot`, the manifest's `style-snapshot`; `page` on any page of the site): no host CSS, only
// what the page as it is gives, state by state, for the runner's `--save` and `--compare`. Two builds with the same
// snapshot draw the player the same way.
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const out = { variants: {}, shots: args.shots };
const checks = {};
const url = page.url();
const studio = /tier=studio/.test(url);
const VARIANTS = args.variants ?? ['inherited', 'unlayered', 'reboot', 'tailwind-before', 'tailwind-after'];
const { css, probe, differ } = args.host ?? {};
const { writeFileSync } = await import('node:fs');

// The document, rewritten: `before` goes first in the head, `after` first in the body, which is after every
// stylesheet the page and the skin add to the head, the lazy ones too; `markup` goes last in the body.
let inject = { before: '', after: '', markup: '', noSkin: false };
const style = (text) => (text ? `<style data-host>${text.replace(/<\/style/gi, '<\\/style')}</style>` : '');
const documents = (requested) => requested.pathname.endsWith('/preview.html');
await page.route(documents, async (route) => {
  const response = await route.fetch();
  const html = (await response.text()).replace(/<head>/i, (head) => head + style(inject.before)).replace(/<body>/i, (body) => body + style(inject.after)).replace(/<\/body>/i, (body) => inject.markup + body);
  await route.fulfill({ response, body: html });
});
// "Without the skin": every stylesheet but the page's own answers empty.
const sheets = (requested) => requested.pathname.endsWith('.css');
await page.route(sheets, async (route) => {
  if (!inject.noSkin || /\/preview-[^/]+\.css$/.test(new URL(route.request().url()).pathname)) return route.fallback();
  await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
});

const load = async (next) => {
  inject = { before: '', after: '', markup: '', noSkin: false, ...next };
  await page.goto('about:blank');
  await page.goto(url);
  // Without its stylesheets the player has no box, and a video with no box may not load: the probe is enough there.
  if (inject.noSkin) await page.waitForSelector('#host-probe', { state: 'attached', timeout: 30000 });
  else await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 30000 });
  if (studio && !inject.noSkin) await page.waitForSelector('[data-pro-ready] .pro-tl', { timeout: 15000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(800);
};

// Every computed property that differs from a bare element of the same tag in an empty document, and the box
// relative to the player.
const collect = () => page.evaluate(() => {
  let frame = document.querySelector('iframe[data-host-defaults]');
  if (!frame) {
    frame = document.createElement('iframe');
    frame.setAttribute('data-host-defaults', '');
    frame.style.cssText = 'position:fixed!important;left:-200px!important;top:0!important;width:100px!important;height:100px!important;margin:0!important;padding:0!important;border:0!important;visibility:hidden!important;display:block!important';
    document.documentElement.appendChild(frame);
  }
  const blank = frame.contentDocument;
  const defaults = (window.__defaults ??= new Map());
  const bare = (el) => {
    const key = `${el.namespaceURI} ${el.localName}`;
    if (!defaults.has(key)) {
      const twin = blank.createElementNS(el.namespaceURI, el.localName);
      blank.body.appendChild(twin);
      const computed = frame.contentWindow.getComputedStyle(twin);
      const values = {};
      for (const name of computed) values[name] = computed.getPropertyValue(name);
      defaults.set(key, values);
    }
    return defaults.get(key);
  };
  const skins = [...document.querySelectorAll('.media-skin')];
  const outside = [...document.querySelectorAll('.media-popup, [role="dialog"], [role="menu"], [role="tooltip"]')]
    .filter((e) => !e.closest('.media-skin') && !e.closest('#host-probe') && !e.parentElement.closest('.media-popup, [role="dialog"], [role="menu"]'));
  const origin = skins[0].getBoundingClientRect();
  const rows = [];
  const read = (el, pseudo, depth) => {
    const computed = getComputedStyle(el, pseudo || undefined);
    if (pseudo && ['none', 'normal'].includes(computed.content)) return;
    const base = bare(el);
    const style = {};
    for (const name of computed) {
      // Custom properties are the host's way in (the tokens); anchor names are generated anew on every load.
      if (name.startsWith('--') || name === 'anchor-name' || name === 'position-anchor') continue;
      const value = computed.getPropertyValue(name);
      if (pseudo || value !== base[name]) style[name] = value;
    }
    if (!pseudo) {
      const box = el.getBoundingClientRect();
      // An element with no box (`display: none`) reports the window's corner: it has no place to compare.
      style['(box)'] = box.width || box.height ? [box.left - origin.left, box.top - origin.top, box.width, box.height].map((n) => Math.round(n * 100) / 100).join(' ') : 'none';
    }
    rows.push({ id: `${'  '.repeat(depth)}${el.localName}${pseudo} | ${el.getAttribute('class') ?? ''} | ${el.getAttribute('role') ?? ''}`, style, base: pseudo ? null : `${el.namespaceURI} ${el.localName}` });
  };
  const walk = (el, depth) => {
    read(el, '', depth);
    read(el, '::before', depth);
    read(el, '::after', depth);
    for (const child of el.children) walk(child, depth + 1);
  };
  for (const root of [...skins, ...outside]) walk(root, 0);
  const bases = {};
  for (const row of rows) if (row.base && !bases[row.base]) bases[row.base] = defaults.get(row.base);
  return { rows, bases };
});

const playSelector = studio ? '.pro-transport .media-play-button' : '.media-play-button:not(.pro-center-play)';
const focusPlayer = async () => { await page.focus(playSelector).catch(() => page.focus('.media-skin .media-play-button')); };
const shot = async (variant, state) => {
  if (!args.shots) return null;
  const png = await page.locator('.media-skin').first().screenshot({ animations: 'disabled', caret: 'hide' });
  writeFileSync(`${args.shots}/${variant}-${state}.png`, png);
  return png;
};
// Visits the states and returns what each one shows.
const visit = async (variant, states = null) => {
  const seen = {};
  const snap = async (state) => {
    if (states && !states.includes(state)) return;
    seen[state] = { ...(await collect()), png: await shot(variant, state) };
  };
  await snap('idle');
  if (states && states.length === 1) return seen;
  // A control focused from the keyboard: its ring, and its tooltip with the shortcut.
  await focusPlayer(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(900);
  await snap('focus');
  const menus = await page.evaluate(() => [...document.querySelectorAll('.media-skin .media-settings-button, .media-skin [data-pro-menu]')]
    .filter((e) => e.getClientRects().length)
    .map((e, i) => { e.setAttribute('data-host-menu', String(i)); return e.getAttribute('data-pro-menu') ?? 'settings'; }));
  for (const [i, name] of menus.entries()) {
    await page.focus(`[data-host-menu="${i}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(500);
    await snap(`menu-${name}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(350);
  }
  await focusPlayer(); await page.keyboard.press('Shift+?'); await page.waitForTimeout(600);
  await snap('help');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return seen;
};

// The differences of two visits, as `{ state, element, property, plain, host }`.
const compare = (plain, host, ignore = new Set()) => {
  const list = [];
  for (const state of Object.keys(plain)) {
    const a = plain[state], b = host[state];
    if (!b) { list.push({ state, element: '', property: '(state)', plain: 'visited', host: 'missing' }); continue; }
    if (a.rows.length !== b.rows.length || a.rows.some((row, i) => row.id !== b.rows[i].id)) {
      const at = a.rows.findIndex((row, i) => row.id !== b.rows[i]?.id);
      list.push({ state, element: (a.rows[at] ?? b.rows[a.rows.length])?.id.trim() ?? '', property: '(markup)', plain: `${a.rows.length} elements`, host: `${b.rows.length} elements` });
      continue;
    }
    a.rows.forEach((row, i) => {
      const other = b.rows[i];
      // How far the media has buffered differs from load to load, and the buffer bars with it.
      if (/buffer/.test(row.id)) return;
      // A property left out equals the bare element's value on that page; the bare values are the same on both.
      const base = row.base ? a.bases[row.base] : {};
      for (const property of new Set([...Object.keys(row.style), ...Object.keys(other.style)])) {
        const before = row.style[property] ?? base[property], after = other.style[property] ?? base[property];
        if (before === after) continue;
        const key = `${state} | ${i} | ${property}`;
        if (!ignore.has(key)) list.push({ key, state, element: row.id.trim(), property, plain: before, host: after });
      }
    });
  }
  return list;
};
const summary = (list) => {
  const count = (pick) => Object.fromEntries(Object.entries(list.reduce((sums, item) => { sums[pick(item)] = (sums[pick(item)] ?? 0) + 1; return sums; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 25));
  const example = new Map();
  for (const item of list) { const key = `${item.element.split(' | ')[0]} ${item.property}`; if (!example.has(key)) example.set(key, `${item.state}: ${item.element} { ${item.property}: ${item.plain} → ${item.host} }`); }
  return { differences: list.length, elements: new Set(list.map((item) => `${item.state} ${item.key?.split(' | ')[1]}`)).size, byProperty: count((item) => item.property), byElement: count((item) => item.element.split(' | ')[0]), examples: [...example.values()].slice(0, 60) };
};

if (args.snapshot) {
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2, null, { timeout: 30000 });
  if (studio) await page.waitForSelector('[data-pro-ready] .pro-tl', { timeout: 15000 });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1500);
  const seen = await visit('snapshot');
  return { snapshot: Object.fromEntries(Object.entries(seen).map(([state, { rows, bases }]) => [state, { rows, bases }])), count: Object.fromEntries(Object.entries(seen).map(([state, { rows }]) => [state, rows.length])) };
}

// The outline of the focused control in a visit's `focus` state: the row that is not in the idle state's rows is the
// tooltip; the ring is on the button whose outline has a width.
const ring = (seen) => {
  const row = seen.rows.find((item) => /media-play-button/.test(item.id) && item.style['outline-style'] && item.style['outline-style'] !== 'none');
  return row ? `${row.style['outline-width'] ?? seen.bases[row.base]['outline-width']} ${row.style['outline-style']} ${row.style['outline-color'] ?? ''}`.trim() : 'none';
};

// The plain page, and the box of the player's parent on it.
await load();
const unpinned = await visit('plain-unpinned', ['idle']);
const parent = await page.evaluate(() => { const box = document.querySelector('.media-skin').parentElement.getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width }; });
const pin = `.monitor-stage { position: fixed !important; left: ${parent.left}px !important; top: ${parent.top}px !important; right: auto !important; bottom: auto !important; width: ${parent.width}px !important; height: auto !important; min-width: 0 !important; max-width: none !important; min-height: 0 !important; max-height: none !important; margin: 0 !important; padding: 0 !important; border: 0 !important; box-sizing: border-box !important; display: block !important; float: none !important; transform: none !important; overflow: visible !important; }`;
await load({ after: pin });
const plain = await visit('plain');
await load({ after: pin });
const again = await visit('plain-again');
const noise = new Set(compare(plain, again).map((item) => item.key));
out.noise = summary(compare(plain, again));
const pinned = compare({ idle: unpinned.idle }, { idle: plain.idle }, noise);
out.pin = summary(pinned);
checks.pinKeepsThePlayer = pinned.length === 0;
out.ring = { plain: plain.focus ? ring(plain.focus) : null };
out.states = Object.fromEntries(Object.entries(plain).map(([state, seen]) => [state, seen.rows.length]));
checks.statesVisited = Object.keys(plain).length >= (studio ? 6 : 4) && Object.values(out.states).every((count) => count > 20);

for (const variant of VARIANTS) {
  const sheet = variant.startsWith('tailwind') ? css.tailwind : css[variant];
  await load(variant === 'tailwind-before' ? { before: sheet, after: pin } : { after: `${sheet}\n${pin}` });
  const host = await visit(variant);
  const list = compare(plain, host, noise);
  const pictures = {};
  for (const state of Object.keys(plain)) if (host[state]) pictures[state] = await differ(plain[state].png, host[state].png);
  out.variants[variant] = { ...summary(list), pictures: Object.fromEntries(Object.entries(pictures).map(([state, result]) => [state, result.sameSize ? +(result.share * 100).toFixed(3) : `sizes ${result.sizes.join(' and ')}`])) };
  checks[`${variant}: the same styles and boxes`] = list.length === 0;
  // The focus ring of the control focused from the keyboard, as the host page leaves it.
  (out.ring ??= {})[variant] = host.focus ? ring(host.focus) : null;
  checks[`${variant}: the same picture`] = Object.values(pictures).every((result) => result.sameSize && result.share < 0.002);
}

// The other direction: the host's own elements, with the skin's stylesheets and without them.
if (args.reverse) {
  const probeStyles = () => page.evaluate(() => {
    const rows = [];
    const read = (el, pseudo) => {
      const computed = getComputedStyle(el, pseudo || undefined);
      const style = {};
      for (const name of computed) style[name] = computed.getPropertyValue(name);
      rows.push({ id: `${el.localName}${pseudo}${el.id ? `#${el.id}` : ''}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}`, style });
    };
    for (const el of [document.documentElement, document.body, ...document.querySelectorAll('#host-probe, #host-probe *')]) { read(el, ''); read(el, '::before'); read(el, '::after'); }
    return rows;
  });
  await load({ markup: probe });
  const withSkin = await probeStyles();
  await load({ markup: probe, noSkin: true });
  const without = await probeStyles();
  const list = [], registered = new Set();
  withSkin.forEach((row, i) => {
    for (const property of new Set([...Object.keys(row.style), ...Object.keys(without[i]?.style ?? {})])) {
      const a = without[i]?.style[property], b = row.style[property];
      if (a === b) continue;
      // The root's and the body's height follow the page's content, which is the player.
      if (i < 6 && /^(height|block-size|perspective-origin|transform-origin)$/.test(property)) continue;
      if (property.startsWith('--')) registered.add(property);
      else list.push(`${row.id} { ${property}: ${a} → ${b} }`);
    }
  });
  out.reverse = { elements: withSkin.length, differences: list.length, examples: list.slice(0, 40), registered: [...registered] };
  checks['the host page: its own elements keep their styles'] = withSkin.length === without.length && withSkin.length > 150 && list.length === 0;
}

// Under `prefers-contrast: more` the skin's ring is 3 px, and a host's own `button:focus-visible` rule (the reboot
// has one, 2 px) does not thin it.
if (args.ring) checks[`the focus ring is ${args.ring} on every host page`] = Object.values(out.ring).every((value) => value?.startsWith(`${args.ring} `));

await page.unroute(documents);
await page.unroute(sheets);
out.checks = checks;
out.pass = Object.values(checks).every(Boolean);
return out;
