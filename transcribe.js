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
    
    // Safety check BEFORE clicking
    if (!await page.isVisible(submitButtonSelector)) {
        throw new Error("Submit button not found");
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
 */
async function processSingleLink(context, link, formData) {
    const page = await context.newPage();
    console.log(`\nNavigating to: ${link}`);

    try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for unique element to ensure it's a real ATIP form
        await page.waitForSelector('#edit-actions-submit', { timeout: 15000 });

        await fillForm(page, formData);
        await submitForm(page);
        
        console.log(`-> Submission successful for: ${link}`);
        await logSubmittedUrl(link); // Side effect: logging

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
 */
async function transcribeAndSubmit(formData, links, options = { headless: true }) {
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
            await processSingleLink(context, link, formData);
            
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