//@ts-check
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const debug = process.env.PWDEBUG == '1'; // runs non-headless and opens https://playwright.dev/docs/inspector
const login = process.argv.includes('login', 2);
const headless = !debug && !login;

const DLDIR = 'downloads/focus'; // directory where to save downloads to
const URL_LOGIN = 'https://focus-epaper.de/login';
const URL_CLAIM = 'https://focus-epaper.de/ausgaben';
const TIMEOUT = 20 * 1000; // 20s, default is 30s

let urls = [];
if (process.argv[2] == 'range') {
  // example: https://focus-epaper.de/download/9873
  if (process.argv.length != 5) {
    console.error('Usage: node handelsblatt range 52/2021 06/2022');
    process.exit(1);
  }
  const d1 = process.argv[3];
  const d2 = process.argv[4];
  // https://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates
  var dateRange = (s,e) => { for(var a=[],d=new Date(s); d <= new Date(e); d.setDate(d.getDate()+1)){ a.push(new Date(d));}return a; };
  const dates = dateRange(d1, d2).map(d => d.toISOString().split('T')[0]);
  // console.log(dates);
  console.error('range not supported yet');
  process.exit(1);
  urls = dates.map(d => `https://focus-epaper.de/download/${d}`);
  console.log('Will try to download the following:');
  console.log(urls);
}

// could change to .mjs to get top-level-await, but would then also need to change require to import and dynamic import for stealth would just add more async/await
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
  // will redirect to login page if not logged in
  while (page.url() != URL_CLAIM) { 
    console.error('Not signed in anymore!');
    if (headless) {
      console.log('Please run `node focus login` to login in the browser.');
      await context.close(); // not needed?
      process.exit(1);
    }
    console.log("Please login and then navigate back or restart the script.");
    context.setDefaultTimeout(0); // give user time to log in without timeout
    // await page.goto(URL_LOGIN, {waitUntil: 'domcontentloaded'});
    console.log(page.url()); // should automatically have been redirected to login page
    await clickIfExists('button:has-text("zustimmen")'); // to not waste screen space in --debug
    await page.waitForNavigation({url: URL_CLAIM});
    context.setDefaultTimeout(TIMEOUT);
  }
  await page.waitForSelector('span:has-text("Eingeloggt als")');
  console.log('Signed in.');

  // console.log(await page.locator('article h5').first().textContent());
  // console.log(await page.locator('a:has-text("Download")').first().getAttribute('href'));

  const epapers = await page.$$('article');
  let n = 0;
  for (const epaper of epapers) {
    const title = await (await epaper.$('h5')).textContent();
    const dlbtn = await epaper.$('a:has-text("Download")');
    const url = await dlbtn.getAttribute('href');
    console.log(title, url);

    // https://playwright.dev/docs/downloads
    // Promise.all prevents a race condition between clicking and waiting for the download.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dlbtn.click(),
    ]);
    // Downloads are put in a temporary folder and deleted when the browser context is closed, so need to save it.
    // console.log(await download.path()); // temporary file path, waits for download to finish
    const filename = download.suggestedFilename();
    const fp = path.resolve(DLDIR, filename);
    if (fs.existsSync(fp)) { // TODO add an option for this? maybe we do want to download it again?
      console.log(filename, 'already exists!');
      await download.cancel(); // helps or already downloaded here?
    } else {
      console.log('download', filename);
      await download.saveAs(fp); // this will create non-existing directories and overwrite the file if it already exists
    }
    // await page.pause();
    n++;
    if (n == 1) break; // only download the first file, TODO option to download last n epapers? TODO range
  }
  await context.close();
})();
