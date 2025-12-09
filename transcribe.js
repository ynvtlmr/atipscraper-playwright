// transcribe.js
const playwright = require('playwright');
const fs = require('fs/promises');
const path = require('path');

const ID_MAP = {
    "requestor_category": "#edit-requestor-category",
    "delivery_method": "#edit-delivery-method",
    "given_name": "#edit-given-name",
    "family_name": "#edit-family-name",
    "email": "#edit-your-e-mail-address",
    "phone": "#edit-your-telephone-number",
    "address": "#edit-address-fieldset-address",
    "address_2": "#edit-address-fieldset-address-2",
    "city": "#edit-address-fieldset-city",
    "state_province": "#edit-address-fieldset-state-province-select",
    "postal_code": "#edit-address-fieldset-postal-code",
    "country": "#edit-address-fieldset-country",
    "preferred_language": "#edit-preferred-language-of-correspondence",
    "consent": "#edit-consent",
    "additional_comments": "#edit-additional-comments", // Updated to match atip_request_example.html
};

const DROPDOWN_KEYS = [
    "requestor_category", "delivery_method", "state_province",
    "country", "preferred_language", "consent",
];

async function logSubmittedUrl(link) {
    const csvPath = path.join(process.cwd(), 'urls.csv');
    try {
        await fs.appendFile(csvPath, `${link}\n`, 'utf-8');
    } catch (error) {
        console.warn(`Warning: Could not log submitted URL to urls.csv: ${error.message}`);
    }
}

/**
 * Fills the form on the current page with the provided data.
 * SRP: Only handles filling.
 * @param {import('playwright').Page} page 
 * @param {Object} formData 
 */
async function fillForm(page, formData) {
    for (const key in formData) {
        const value = formData[key];
        const selector = ID_MAP[key];

        if (selector && value) {
            if (DROPDOWN_KEYS.includes(key)) {
                await page.selectOption(selector, { label: value });
            } else {
                await page.fill(selector, value);
            }
        }
    }
}

/**
 * Submits the form and verifies the result.
 * SRP: Only handles submission interactions.
 * @param {import('playwright').Page} page 
 * @returns {Promise<boolean>} success
 */
async function submitForm(page) {
    const submitButtonSelector = "#edit-actions-submit";
    
    // Safety check: Wait for button to be visible (in case of dynamic appearance after form fill)
    const submitBtn = await page.waitForSelector(submitButtonSelector, { state: 'visible', timeout: 5000 });
    if (!submitBtn) {
        throw new Error("Submit button not found or not visible");
    }

    // Capture current URL to verify navigation
    const initialUrl = page.url();

    await page.click(submitButtonSelector);
    
    try {
        // Wait for URL change or Success message
        // A generic robust check is URL change
        await page.waitForURL(url => url.toString() !== initialUrl, { timeout: 30000, waitUntil: 'domcontentloaded' });
        return true;
    } catch (e) {
        throw new Error("Form submission likely failed (navigation timed out).");
    }
}

/**
 * Process a single URL: Visit -> Fill -> Submit -> Log.
 * Functional: Isolated execution scope.
 * @param {import('playwright').BrowserContext} context 
 * @param {string} link 
 * @param {Object} formData 
 * @param {Object} options
 */
async function processSingleLink(context, link, formData, options) {
    const page = await context.newPage();
    console.log(`\nNavigating to: ${link}`);

    try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for FORM element instead of submit button (often hidden initially)
        // Requestor Category is the first field and must be visible
        await page.waitForSelector('#edit-requestor-category', { timeout: 15000 });

        await fillForm(page, formData);

        if (options.dryRun) {
            console.log("-> [TEST MODE] Skipping submission. Form filled successfully.");
            // Wait briefly to allow visual inspection during auto-play
            await page.waitForTimeout(2000); 
        } else {
            await submitForm(page);
            console.log(`-> Submission successful for: ${link}`);
            await logSubmittedUrl(link); // Side effect: logging
        }

    } catch (error) {
        console.error(`-> Error processing ${link}: ${error.message}`);
    } finally {
        await page.close();
    }
}

/**
 * Main batch orchestrator.
 * @param {Object} formData 
 * @param {string[]} links 
 * @param {Object} options
 */
async function transcribeAndSubmit(formData, links, options = { headless: true, dryRun: false }) {
    let browser;
    try {
        // Browser Launch Strategy
        try {
            browser = await playwright.chromium.launch({ headless: options.headless, channel: 'chrome' }); 
        } catch (e) {
            console.log("System Chrome not found, using bundled browser...");
            browser = await playwright.chromium.launch({ headless: options.headless });
        }

        const context = await browser.newContext();
        console.log(`Starting submission of ${links.length} forms...`);

        // Process sequentially to be polite (and functional)
        for (const link of links) {
            await processSingleLink(context, link, formData, options);
            
            // Random wait between separate submissions
            const ms = 1000 + Math.random() * 2000;
            await new Promise(r => setTimeout(r, ms)); 
        }

    } catch (e) {
        console.error(`Browser Batch Error: ${e.message}`);
    } finally {
        if (browser) await browser.close();
    }
}

module.exports = transcribeAndSubmit;
module.exports.fillForm = fillForm;
module.exports.submitForm = submitForm;