// scrape_links.js

const playwright = require('playwright');

// Helper function to extract links from the current page
async function extractLinksFromPage(page, uniqueLinks) {
    const aElements = await page.locator("a").all();
    for (const aElement of aElements) {
        const href = await aElement.getAttribute("href");
        if (href && href.includes("/en/search/ati/reference/")) {
            uniqueLinks.add(href);
        }
    }
}

async function scrapeLinks(url) {
    let browser;
    let uniqueLinks = new Set();

    try {
        browser = await playwright.chromium.launch();
        const page = await browser.newPage();

        // Use Playwright's auto-wait for navigation
        await page.goto(url, { waitUntil: "domcontentloaded" });

        const NEXT_BUTTON_SELECTOR = "li.pager__item--next > a";

        // Wait for at least one link to appear before starting the loop
        await page.waitForSelector("a[href*='/en/search/ati/reference/']", { timeout: 15000 });

        while (true) {
            await extractLinksFromPage(page, uniqueLinks);

            const nextButtonLocator = page.locator(NEXT_BUTTON_SELECTOR);

            const isVisible = await nextButtonLocator.isVisible();
            const isDisabled = await nextButtonLocator.get_attribute('aria-disabled') === "true";
            
            // Check for the 'pager__item--last' class on the parent <li> element
            const parentLiLocator = nextButtonLocator.locator('xpath=..');
            const isLastPage = await parentLiLocator.evaluate(el => el.classList.contains('pager__item--last'));


            if (isVisible && !isDisabled && !isLastPage) {
                await nextButtonLocator.click();

                // Wait for a new link element to appear to ensure navigation is complete.
                await page.waitForSelector("a[href*='/en/search/ati/reference/']");
            } else {
                break;
            }
        }

    } catch (e) {
        console.error(`An error occurred during scraping: ${e.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    return Array.from(uniqueLinks);
}

module.exports = scrapeLinks;