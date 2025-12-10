// scrape_links.js
const playwright = require('playwright');
const logger = require('./logger');
const selectors = require('./selectors.json');

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
    // Use the specific selector to find relevant links directly
    const aElements = await page.locator(selectors.search.links).all();
    
    for (const aElement of aElements) {
        const href = await aElement.getAttribute("href");
        if (href) {
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
    // Use the unified selector from config
    const nextButton = page.locator(selectors.search.next_button).first();
    
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
async function scrapeLinks(url, existingPage = null, options = { headless: true }) {
    let browser;
    const allUniqueLinks = new Set();
    let page = existingPage;
    
    try {
        if (!page) {
            // Browser Launch Strategy
            const launchArgs = ['--start-maximized', '--window-position=0,0'];
            try {
                browser = await playwright.chromium.launch({ headless: options.headless, channel: 'chrome', args: launchArgs }); 
            } catch (e) {
                logger.info("System Chrome not found, using bundled browser...");
                browser = await playwright.chromium.launch({ headless: options.headless, args: launchArgs });
            }
            page = await browser.newPage();
        }
        
        logger.info(`Navigating to initial URL: ${url}`);
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page.evaluate(() => window.focus()); // Bring to front
        await randomWait(page);

        // Ensure we have results or wait a bit
        try {
            await page.waitForSelector(selectors.search.links, { timeout: 15000 });
        } catch (e) {
            logger.warn("Warning: Initial search results selector timed out. Page might be empty.");
        }

        let pageNum = 1;
        let scraping = true;

        while (scraping) {
            // 1. Extract Data
            const pageLinks = await extractLinksFromPage(page);
            const countBefore = allUniqueLinks.size;
            pageLinks.forEach(link => allUniqueLinks.add(link));
            const countAfter = allUniqueLinks.size;

            logger.info(`Page ${pageNum}: Extracted ${pageLinks.length} links. (${countAfter - countBefore} new unique)`);

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
                logger.info("Pagination ended.");
                scraping = false;
            }
        }

    } catch (e) {
        logger.error(`Scraping Error: ${e.message}`);
    } finally {
        if (browser) await browser.close();
    }

    return Array.from(allUniqueLinks);
}

module.exports = scrapeLinks;
