# epaper-downloader
Download ePaper/PDF for
- https://epaper.handelsblatt.com/
- PRs welcome :)

Based on https://github.com/vogler/free-games-claimer.

## Setup
... should be the same on Windows/macOS/Linux:

1. [Install Node.js](https://nodejs.org/en/download)
2. Clone/download this repository and `cd` into it in a terminal
3. Run `npm install && npx playwright install`

This downloads {chromium, firefox, webkit} (742 MB) to a cache in home ([doc](https://playwright.dev/docs/browsers#managing-browser-binaries)).

## Usage
Run `npm handelsblatt login` to open a browser to login (and also download after).

Run `node handelsblatt` to download the current epaper into a folder `downloads`.
This will run in headless mode, i.e., not show any browser UI. It will exit if you are not logged in.

If something goes wrong, use `PWDEBUG=1 node handelsblatt` to [inspect](https://playwright.dev/docs/inspector).

Issues:
- Playwright seems to not run on (headless) RPi? See [issue](https://github.com/vogler/free-games-claimer/issues/3).
