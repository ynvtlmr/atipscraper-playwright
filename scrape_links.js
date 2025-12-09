// scrape_links.js

const playwright = require('playwright');

// Helper function to extract links from the current page
async function extractLinksFromPage(page, uniqueLinks) {
    const aElements = await page.locator("a").all();
    for (const aElement of aElements) {
        const href = await aElement.getAttribute("href");
        if (href && href.includes("/en/search/ati/reference/")) {
            // Convert to absolute URL
            const absoluteUrl = new URL(href, page.url()).toString();
            uniqueLinks.add(absoluteUrl);
        }
    }
}

async function scrapeLinks(url) {
    let browser;
    let uniqueLinks = new Set();
    
    // Helper for random wait 1-3 seconds
    const randomWait = async (page) => {
        const ms = 1000 + Math.random() * 2000;
        await page.waitForTimeout(ms);
    };

    try {
        // Use system Chrome/Edge if available to avoid needing bundled browser
        browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' }); 
    } catch (e) {
        console.log("Could not launch system Chrome, trying default bundled...");
        browser = await playwright.chromium.launch({ headless: true });
    }

    try {
        const page = await browser.newPage();
        
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: "domcontentloaded" });

        // Initial wait to look human
        await randomWait(page);

        const NEXT_BUTTON_SELECTOR = "li.pager__item--next > a";

        // Wait for at least one link to appear before starting the loop
        try {
            await page.waitForSelector("a[href*='/en/search/ati/reference/']", { timeout: 15000 });
        } catch(e) {
            console.warn("No results found on the first page. Checking content...");
        }

        let pageNum = 1;
        while (true) {
            const countBefore = uniqueLinks.size;
            await extractLinksFromPage(page, uniqueLinks);
            const countAfter = uniqueLinks.size;
            
            console.log(`Page ${pageNum}: Found ${countAfter - countBefore} new links. (Total: ${countAfter})`);

            const nextButtonLocator = page.locator(NEXT_BUTTON_SELECTOR);
            const isVisible = await nextButtonLocator.isVisible();
            
            // Check for disabled state safely
            let isDisabled = false;
            if (isVisible) {
                 const ariaDisabled = await nextButtonLocator.getAttribute('aria-disabled');
                 isDisabled = ariaDisabled === "true";
            }
            
            // Check for the 'pager__item--last' class on the parent <li> element to prevent infinite loops
            let isLastPage = false;
            if (isVisible) {
                const parentLiLocator = nextButtonLocator.locator('xpath=..');
                // Check class safely
                const classAttribute = await parentLiLocator.getAttribute('class');
                if (classAttribute && classAttribute.includes('pager__item--last')) {
                    isLastPage = true;
                }
            }

            if (isVisible && !isDisabled && !isLastPage) {
                await randomWait(page); // Wait before clicking next
                await nextButtonLocator.click();
                
                // Wait for the URL to change or new content. 
                // A simple wait is often more robust for pagers that don't change URL drastically or use AJAX
                await page.waitForLoadState('domcontentloaded');
                await randomWait(page); // Wait after load
                
                pageNum++;
            } else {
                console.log("No next page button or end of pagination reached.");
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