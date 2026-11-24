// Browser check (step 9.5): axe-core audit. Body of an async function; `page` on the page to scan. `args.state`
// chooses what to open first: 'guides' (Guides menu), 'zoom' (Zoom menu), 'help' (the help dialog), or nothing.
// Returns the violations by impact, with the rule id, the help text and the first target of each.
// Needs `@axe-core/playwright` resolvable from the runner: const { default: AxeBuilder } = await import('@axe-core/playwright').
// Pages, windows and options for the runner (`npm run check:browsers`): manifest.mjs.
const { default: AxeBuilder } = await import(args.axe ?? '@axe-core/playwright');
await page.waitForFunction(() => document.querySelector('video')?.duration > 0, null, { timeout: 30000 });
await page.waitForTimeout(800);
const state = args.state ?? '';
if (state === 'guides' || state === 'zoom') { await page.focus(`[data-pro-menu="${state}"]`); await page.keyboard.press('Enter'); await page.waitForTimeout(600); }
if (state === 'help') { await page.focus('.media-play-button:not(.pro-center-play)'); await page.keyboard.press('Shift+?'); await page.waitForTimeout(600); }
const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
const by = { critical: 0, serious: 0, moderate: 0, minor: 0 };
const list = results.violations.map((v) => { by[v.impact] = (by[v.impact] ?? 0) + v.nodes.length; return { id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, first: v.nodes[0]?.target?.[0], html: v.nodes[0]?.html?.slice(0, 160), summary: v.nodes[0]?.failureSummary?.slice(0, 240) }; });
return { state, url: page.url(), counts: by, violations: list, incomplete: results.incomplete.map((v) => `${v.id} (${v.nodes.length})`) };
