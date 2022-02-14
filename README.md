# epaper-downloader
Downloads ePaper PDFs from
- https://epaper.handelsblatt.com
- https://focus-epaper.de/ausgaben
- PRs welcome :)

Based on https://github.com/vogler/free-games-claimer.

## Setup
... should be the same on Windows/macOS/Linux:

1. [Install Node.js](https://nodejs.org/en/download)
2. Clone/download this repository and `cd` into it in a terminal
3. Run `npm install && npx playwright install`

This downloads {chromium, firefox, webkit} (742 MB) to a cache in home ([doc](https://playwright.dev/docs/browsers#managing-browser-binaries)).

Issues:
- Playwright seems to not run on (headless) RPi? See [issue](https://github.com/vogler/free-games-claimer/issues/3).

## Usage
### Handelsblatt
Run `node handelsblatt login` to open a browser to login (and also download the current PDF after).

Run `node handelsblatt` to download the current PDF into a folder `downloads`.
This will run in headless mode, i.e., not show any browser UI. It will exit if you are not logged in.

Run `node handelsblatt range 2022-01-04 2022-02-03` to download all PDFs for that date range (in this case 23 files).

If something goes wrong, use `PWDEBUG=1 node handelsblatt` to [inspect](https://playwright.dev/docs/inspector).

You can schedule this to run daily to always have the current epaper. See https://github.com/vogler/free-games-claimer#run-periodically.
Handelsblatt releases one epaper every Mon-Thu and one for the weekend.

### Focus
Same as above, but run `node focus` etc. instead.
`range` function not implemented yet.
Focus release one epaper every Friday.
