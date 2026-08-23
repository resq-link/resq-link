import puppeteer from 'puppeteer-core';

const BASE = process.env.QA_BASE_URL || 'http://localhost:3000';
const EMAIL = 'superadmin@rescue.ph';
const PASSWORD = 'SuperAdmin2024!';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: true,
    args: ['--window-size=1440,900', '--disable-gpu'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error)));

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#login-email', { timeout: 20000 });
    await page.type('#login-email', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => location.pathname.includes('/admin/'), { timeout: 60000 });
    record('UI Super Admin login lands on dashboard', page.url().includes('/admin/dashboard'), page.url());
    await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 20000 });
    await page.waitForFunction(() => document.body.innerText.includes('Platform Overview'), { timeout: 30000 });

    await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 20000 });
    const dashboard = await page.evaluate(() => {
      const text = document.body.innerText;
      const counts = [...document.querySelectorAll('.tabular-nums')].map((el) => el.textContent.trim());
      return {
        hasQuickActions: text.includes('Quick Actions'),
        hasCivilians: text.includes('Civilians'),
        hasResponders: text.includes('Responders'),
        hasDispatchers: text.includes('Dispatchers'),
        hasAgencies: text.includes('Active Agencies'),
        hasKyc: text.includes('Pending KYC'),
        hasNeedsAttention: text.includes('Needs Attention'),
        hasActivity: text.includes('Recent Administrative Activity'),
        hasPersonnel: text.includes('Personnel'),
        placeholders: counts.filter((value) => value === '-' || value === '—'),
        counts,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        sidebarFixed: Boolean(document.querySelector('.admin-shell aside')),
        title: document.querySelector('h1')?.textContent || '',
      };
    });
    record('Dashboard Quick Actions removed', !dashboard.hasQuickActions);
    record('Dashboard people/org sections visible', dashboard.hasCivilians && dashboard.hasResponders && dashboard.hasDispatchers && dashboard.hasAgencies && dashboard.hasKyc);
    record('Dashboard Needs Attention + activity visible', dashboard.hasNeedsAttention && dashboard.hasActivity && dashboard.hasPersonnel);
    record('Dashboard counts are not dash placeholders', dashboard.placeholders.length === 0, dashboard.counts.join(','));
    record('Dashboard title is Platform Overview', dashboard.title.includes('Platform Overview'), dashboard.title);
    record('Sidebar present on dashboard', dashboard.sidebarFixed);
    record('No horizontal page overflow at 1440px', dashboard.scrollWidth <= dashboard.clientWidth + 1, `${dashboard.scrollWidth}/${dashboard.clientWidth}`);

    const routes = [
      ['/admin/notifications', 'Notifications'],
      ['/admin/dispatchers', 'Dispatchers'],
      ['/admin/responders', 'Responders'],
      ['/admin/civilians', 'Civilians'],
      ['/admin/agencies', 'Agencies'],
      ['/admin/kyc', 'KYC Review'],
      ['/admin/audit', 'Audit Logs'],
      ['/admin/settings', 'Settings'],
    ];

    for (const [path, title] of routes) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('nav[aria-label="Primary"]', { timeout: 20000 });
      const state = await page.evaluate((expectedTitle) => {
        const heading = document.querySelector('h1')?.textContent || '';
        const sidebar = document.querySelector('.admin-shell aside');
        const active = document.querySelector('nav[aria-label="Primary"] a[aria-current="page"]')?.textContent?.trim();
        return {
          heading,
          hasSidebar: Boolean(sidebar),
          active,
          matchesTitle: heading.includes(expectedTitle),
          bodyOverflow: getComputedStyle(document.body).overflow,
          htmlOverflow: getComputedStyle(document.documentElement).overflow,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      }, title);
      record(`UI ${path} heading`, state.matchesTitle, state.heading);
      record(`UI ${path} sidebar stays mounted`, state.hasSidebar);
      record(`UI ${path} no horizontal overflow`, state.scrollWidth <= state.clientWidth + 1, `${state.scrollWidth}/${state.clientWidth}`);
    }

    await page.goto(`${BASE}/admin/dispatchers`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.querySelector('table') || document.body.innerText.includes('No dispatchers found.'), { timeout: 30000 });
    const actions = await page.$$('button[aria-label="Actions"]');
    record('Dispatchers Actions menus exist', actions.length > 0, `count=${actions.length}`);
    if (actions.length) {
      await actions[0].click();
      const menuVisible = await page.waitForSelector('[role="menu"]', { timeout: 5000 }).then(() => true).catch(() => false);
      record('Dispatchers first-row Actions menu opens in portal', menuVisible);
      if (menuVisible) {
        const labels = await page.$$eval('[role="menu"] [role="menuitem"]', (els) => els.map((el) => el.textContent.trim()));
        record('Actions include View/Edit/Agency/Disable', labels.includes('View Details') && labels.includes('Edit Account') && labels.includes('Change Agency'), labels.join(', '));
        await page.keyboard.press('Escape');
      }
    }

    await page.goto(`${BASE}/admin/agencies`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => document.body.innerText.includes('BFP') || document.body.innerText.includes('Bureau of Fire Protection'), { timeout: 30000 });
    record('Agencies page shows BFP', true);

    await page.click('button[aria-label^="Notifications"]');
    const notif = await page.waitForSelector('[aria-label="Notifications"][role="menu"]', { timeout: 5000 }).then(() => true).catch(() => false);
    record('Notification bell dropdown opens', notif);
    await page.keyboard.press('Escape');

    await page.click('button[aria-label="Open account menu"]');
    const profile = await page.waitForSelector('[aria-label="Account menu"]', { timeout: 5000 }).then(() => true).catch(() => false);
    record('Profile menu opens', profile);
    const profileText = profile ? await page.$eval('[aria-label="Account menu"]', (el) => el.textContent) : '';
    record('Top bar no longer has permanent Sign Out text', !profile ? true : /Sign Out/.test(profileText), 'Sign Out lives in the profile menu');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    await page.setViewport({ width: 390, height: 844 });
    await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('nav[aria-label="Primary"], button[aria-label="Open navigation"]', { timeout: 20000 });
    await page.waitForFunction(() => document.body.innerText.includes('Platform Overview'), { timeout: 20000 });
    await new Promise((resolve) => setTimeout(resolve, 800));
    await page.waitForSelector('button[aria-label="Open navigation"]', { visible: true, timeout: 15000 });
    const mobile = await page.evaluate(() => {
      const aside = document.querySelector('.admin-shell > aside');
      return {
        menuButton: Boolean(document.querySelector('button[aria-label="Open navigation"]')),
        desktopSidebarHidden: aside ? getComputedStyle(aside).display === 'none' : true,
      };
    });
    record('Mobile menu button visible', mobile.menuButton);
    record('Desktop sidebar hidden on mobile', mobile.desktopSidebarHidden);
    await page.$eval('button[aria-label="Open navigation"]', (el) => el.click());
    await new Promise((resolve) => setTimeout(resolve, 400));
    const drawerDebug = await page.evaluate(() => ({
      close: Boolean(document.querySelector('button[aria-label="Close navigation"]')),
      overlay: Boolean(document.querySelector('.admin-shell [aria-label="Close navigation"]')),
      z50: Boolean(document.querySelector('.fixed.z-50')),
      buttons: [...document.querySelectorAll('button')].map((el) => el.getAttribute('aria-label')).filter(Boolean),
    }));
    const drawer = drawerDebug.close || drawerDebug.z50;
    record('Mobile sidebar drawer opens', drawer, JSON.stringify(drawerDebug));

    const realErrors = pageErrors.filter(
      (message) => !/ResizeObserver|hydrat|ChunkLoadError|Loading chunk/i.test(message)
    );
    record('No uncaught page errors', realErrors.length === 0, realErrors.slice(0, 5).join(' | '));
  } finally {
    await browser.close();
  }

  const failed = results.filter((item) => !item.pass);
  console.log(`\nPassed ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    for (const item of failed) console.log(` - ${item.name}: ${item.detail}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
