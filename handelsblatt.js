//@ts-check
const { chromium } = require('playwright');
const path = require('path');
const debug = process.env.PWDEBUG == '1'; // runs non-headless and opens https://playwright.dev/docs/inspector
const login = process.argv.includes('login', 2);
const headless = !debug && !login;

const URL_LOGIN = 'https://id.handelsblatt.com/login/credentials?service=https%3A%2F%2Fepaper.handelsblatt.com%2Fread';
const URL_CLAIM = 'https://epaper.handelsblatt.com/';
const TIMEOUT = 20 * 1000; // 20s, default is 30s

// could change to .mjs to get top-level-await, but would then also need to change require to import and dynamic import for stealth below would just add more async/await
(async () => {
  // https://playwright.dev/docs/auth#multi-factor-authentication
  const context = await chromium.launchPersistentContext(path.resolve(__dirname, 'userDataDir'), {
    channel: 'chrome', // https://playwright.dev/docs/browsers#google-chrome--microsoft-edge
    viewport: { width: 1280, height: 1280 },
    headless,
    // HeadlessChrome instead of Chrome in userAgent is detected, so we fix it:
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36', // see replace of Headless in util.newStealthContext. TODO update if browser is updated!
    acceptDownloads: true,
    // downloadsPath: '.', // deleted after close anyway
  });

  if (!debug) context.setDefaultTimeout(TIMEOUT);
  const page = context.pages().length ? context.pages()[0] : await context.newPage(); // should always exist
  console.log('userAgent:', await page.evaluate(() => navigator.userAgent));

  const clickIfExists = async selector => {
    if (await page.locator(selector).count() > 0)
      await page.click(selector);
  };

  await page.goto(URL_CLAIM, {waitUntil: 'domcontentloaded'}); // default 'load' takes too long
  // @ts-ignore https://caniuse.com/?search=promise.any
  await Promise.any(['Anmelden', 'Abmelden'].map(s => page.waitForSelector(`div:has-text("${s}")`))); // wait for button with login status
  while (await page.locator('div:has-text("Anmelden")').count() > 0) {
    console.error('Not signed in anymore!');
    if (headless) {
      console.log('Please run `node handelsblatt login` to login in the browser.');
      await context.close(); // not needed?
      process.exit(1);
    }
    console.log("Please login and then navigate back or restart the script.");
    context.setDefaultTimeout(0); // give user time to log in without timeout
    await page.goto(URL_LOGIN, {waitUntil: 'domcontentloaded'});
    await clickIfExists('button:has-text("zustimmen")'); // to not waste screen space in --debug
    await page.waitForNavigation({url: URL_CLAIM});
    context.setDefaultTimeout(TIMEOUT);
  }
  console.log('Signed in.');
  // await page.hover('div:has-text("Download")');
  await page.hover('div.fup-menu-item-download');
  await page.click('span:has-text("Gesamte Ausgabe")');
  await page.click('label:has-text("Ich stimme zu.")');
  // https://playwright.dev/docs/downloads
  // Promise.all prevents a race condition between clicking and waiting for the download.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    // could also try has-text, but there are two Download buttons now
    page.click('div.fup-download-button'),
  ]);
  // Downloads are put in a temporary folder and deleted when the browser context is closed, so need to save it.
  // console.log(await download.path()); // temporary file path
  const filename = await download.suggestedFilename();
  console.log('download', filename);
  await download.saveAs(path.resolve('downloads', filename));
  // await page.pause();
  await context.close();
})();
