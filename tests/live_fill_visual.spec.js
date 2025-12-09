const { test, expect } = require('@playwright/test');
const { loadFormData } = require('../config_handler');
const scrapeLinks = require('../scrape_links');
const { fillForm } = require('../transcribe');

// Force headed mode for this test file as per requirements
test.use({ 
    headless: false,
    viewport: null, // Let browser size itself
    launchOptions: {
        args: ['--start-maximized'] // Try to maximize if possible
    }
});

test('Live E2E Visual Verification (No Submit)', async ({ page }) => {
    // Disable default timeout to allow indefinite manual inspection
    test.setTimeout(0); 

    console.log("Loading configuration...");
    const formData = await loadFormData();
    
    if (!formData.url) {
        throw new Error("Missing 'url' in form_data.json. Please ensure it is configured.");
    }

    console.log(`Scraping live links from: ${formData.url}`);
    // Note: scrapeLinks runs in its own (headless) browser context by default. 
    // This is fine, we only need the result.
    const links = await scrapeLinks(formData.url);
    
    if (links.length === 0) {
        console.warn("No links found! Please check the URL or search criteria in form_data.json.");
        return;
    }

    const targetUrl = links[0];
    console.log(`\nTARGET: ${targetUrl}`);
    console.log("Navigating to first found index link...");

    await page.goto(targetUrl);

    console.log("Filling form fields...");
    await fillForm(page, formData);

    console.log("\n*** TEST PAUSED FOR VISUAL INSPECTION ***");
    console.log("The browser window should be open with the form filled.");
    console.log("Press the 'Resume' button in the Playwright Inspector overlay to close the test.");
    
    // Pause execution to keep browser open
    await page.pause();
});
