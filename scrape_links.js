// scrape_links.js
const playwright = require('playwright');

/**
 * Pure helper to wait for a random duration (Human behavior simulation)
 * @param {import('playwright').Page} page 
 */
const randomWait = async (page) => {
    const ms = 1000 + Math.random() * 2000; // 1-3 seconds
    await page.waitForTimeout(ms);
};

/**
 * Extracts links from the current page state.
 * Functional/Stateless: Takes page, returns data. Does not mutate external state.
 * @param {import('playwright').Page} page 
 * @returns {Promise<string[]>} List of absolute URLs
 */
async function extractLinksFromPage(page) {
    const links = [];
    const aElements = await page.locator("a").all();
    
    for (const aElement of aElements) {
        const href = await aElement.getAttribute("href");
        if (href && href.includes("/en/search/ati/reference/")) {
            // Convert to absolute URL using the page context
            const absoluteUrl = new URL(href, page.url()).toString();
            links.push(absoluteUrl);
        }
    }
    return links;
}

/**
 * Inspects pagination state of the current page.
 * @param {import('playwright').Page} page 
 * @returns {Promise<{nextButton: import('playwright').Locator, shouldProceed: boolean}>}
 */
async function getPaginationState(page) {
    // Try robust selector (Accessibility) OR generic class (Drupal standard)
    const nextButton = page.getByRole('link', { name: 'Next', exact: true })
                           .or(page.locator("li.pager__item--next > a"))
                           .first();
    
    // Check various disabled conditions
    const isVisible = await nextButton.isVisible();
    
    if (!isVisible) {
        return { nextButton, shouldProceed: false };
    }

    const ariaDisabled = await nextButton.getAttribute('aria-disabled');
    const isDisabled = ariaDisabled === "true";

    // Check parent class for 'last' item indicator
    const parentLi = nextButton.locator('xpath=..');
    const parentClass = await parentLi.getAttribute('class');
    const isLastPage = parentClass && parentClass.includes('pager__item--last');

    const shouldProceed = isVisible && !isDisabled && !isLastPage;

    return { nextButton, shouldProceed };
}

/**
 * Main orchestrator function.
 * Manages the side-effects (Browser interactions) while delegating logic to pure functions.
 * @param {string} url 
 * @returns {Promise<string[]>}
 */
async function scrapeLinks(url) {
    let browser;
    const allUniqueLinks = new Set();
    
    try {
        // Browser Launch Strategy
        try {
            browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' }); 
        } catch (e) {
            console.log("System Chrome not found, using bundled browser...");
            browser = await playwright.chromium.launch({ headless: true });
        }

        const page = await browser.newPage();
        
        console.log(`Navigating to initial URL: ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await randomWait(page);

        // Ensure we have results or wait a bit
        try {
            await page.waitForSelector("a[href*='/en/search/ati/reference/']", { timeout: 15000 });
        } catch (e) {
            console.warn("Warning: Initial search results selector timed out. Page might be empty.");
        }

        let pageNum = 1;
        let scraping = true;

        while (scraping) {
            // 1. Extract Data
            const pageLinks = await extractLinksFromPage(page);
            const countBefore = allUniqueLinks.size;
            pageLinks.forEach(link => allUniqueLinks.add(link));
            const countAfter = allUniqueLinks.size;

            console.log(`Page ${pageNum}: Extracted ${pageLinks.length} links. (${countAfter - countBefore} new unique)`);

            // 2. Determine Next Step
            const { nextButton, shouldProceed } = await getPaginationState(page);

            if (shouldProceed) {
                await randomWait(page);
                await nextButton.click();
                
                // Wait for stability
                await page.waitForLoadState('domcontentloaded');
                await randomWait(page);
                pageNum++;
            } else {
                console.log("Pagination ended.");
                scraping = false;
            }
        }

    } catch (e) {
        console.error(`Scraping Error: ${e.message}`);
    } finally {
        if (browser) await browser.close();
    }

    return Array.from(allUniqueLinks);
}

module.exports = scrapeLinks;