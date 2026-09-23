// ============================================================
// Capture quotidienne des sites partenaires — KryshArt
// Tourne dans GitHub Actions (voir .github/workflows/captures.yml).
// 1. Lit data/site-data.json sur le site EN LIGNE (SITE_DATA_URL)
// 2. Pour chaque partenaire avec une URL : ouvre le site dans Chromium,
//    tente de fermer la bannière de cookies, capture 1200x1200
// 3. Écrit captures/<id>.jpg — le workflow committe ensuite les changements
// ============================================================
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const SITE_DATA_URL = process.env.SITE_DATA_URL;
if (!SITE_DATA_URL) { console.error('SITE_DATA_URL manquant'); process.exit(1); }

// Sélecteurs des CMP les plus répandus (OneTrust, CookieYes, Cookiebot,
// Quantcast, Didomi, Complianz, Funding Choices…) puis heuristique texte.
const CONSENT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '.cky-btn-accept',
  '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  '#CybotCookiebotDialogBodyButtonAccept',
  '.qc-cmp2-summary-buttons button[mode="primary"]',
  '#didomi-notice-agree-button',
  '.cmplz-btn.cmplz-accept',
  '.fc-cta-consent',
  'button#L2AGLb', // Google
];
const CONSENT_TEXT = /^(tout accepter|accepter( tout)?|accept( all)?( cookies)?|j'accepte|i (agree|accept)|allow all|ok|got it|compris|autoriser)$/i;

async function dismissConsent(frame) {
  for (const sel of CONSENT_SELECTORS) {
    try {
      const el = frame.locator(sel).first();
      if (await el.isVisible({ timeout: 300 })) { await el.click({ timeout: 2000 }); return true; }
    } catch (e) { /* sélecteur absent -- suivant */ }
  }
  try {
    const buttons = await frame.locator('button, [role="button"], a').all();
    for (const b of buttons.slice(0, 80)) {
      const txt = ((await b.textContent().catch(() => '')) || '').trim();
      if (txt && txt.length < 40 && CONSENT_TEXT.test(txt) && await b.isVisible().catch(() => false)) {
        await b.click({ timeout: 2000 }).catch(() => {});
        return true;
      }
    }
  } catch (e) { /* heuristique best-effort */ }
  return false;
}

const res = await fetch(SITE_DATA_URL, { cache: 'no-store' });
if (!res.ok) { console.error('site-data.json inaccessible: HTTP ' + res.status); process.exit(1); }
const site = await res.json();
const partners = site.categories
  .flatMap(c => c.galleries)
  .filter(g => g.type === 'partner' && g.url);
console.log(partners.length + ' partenaire(s) avec URL:', partners.map(p => p.id).join(', '));

mkdirSync('captures', { recursive: true });
const browser = await chromium.launch();
let failures = 0;

for (const p of partners) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 1200 }, locale: 'fr-CA' });
  const page = await ctx.newPage();
  try {
    console.log(`== ${p.id} -> ${p.url}`);
    await page.goto(p.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000); // laisse les animations/CMP apparaître
    let dismissed = await dismissConsent(page.mainFrame());
    for (const f of page.frames()) {
      if (dismissed) break;
      dismissed = await dismissConsent(f);
    }
    console.log('   bannière fermée:', dismissed);
    await page.waitForTimeout(1500); // laisse la bannière disparaître
    const buf = await page.screenshot({ type: 'jpeg', quality: 85 });
    writeFileSync(`captures/${p.id}.jpg`, buf);
    console.log('   OK -> captures/' + p.id + '.jpg');
  } catch (err) {
    // échec = on GARDE la capture précédente (pas d'écriture) plutôt
    // qu'une image cassée ; le site a de toute façon son repli local.
    failures++;
    console.error('   ECHEC ' + p.id + ': ' + err.message);
  } finally {
    await ctx.close();
  }
}
await browser.close();
console.log(failures ? failures + ' échec(s) -- captures précédentes conservées.' : 'Toutes les captures ont réussi.');
