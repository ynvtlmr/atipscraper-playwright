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
    "additional_comments": "#edit-description", // Common ID for comments field
};

const DROPDOWN_KEYS = [
    "requestor_category", "delivery_method", "state_province",
    "country", "preferred_language", "consent",
];

async function logSubmittedUrl(link) {
    const csvPath = path.join(process.cwd(), 'urls.csv');
    // Append the URL followed by a newline
    try {
        await fs.appendFile(csvPath, `${link}\n`, 'utf-8');
    } catch (error) {
        console.warn(`Warning: Could not log submitted URL to urls.csv: ${error.message}`);
    }
}

async function transcribeAndSubmit(formData, refLinks) {
    let browser;
    try {
        // Launch a headless browser - try system chrome first
        try {
             browser = await playwright.chromium.launch({ headless: true, channel: 'chrome' });
        } catch(e) {
             console.log("Could not find system Chrome, trying default bundled...");
             browser = await playwright.chromium.launch({ headless: true });
        }
        const context = await browser.newContext();
        const page = await context.newPage();
        
        console.log(`Starting submission of ${refLinks.length} new ATIP links...`);

        for (const link of refLinks) {
            console.log(`\nNavigating to: ${link}`);
            
            try {
                await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForSelector('#edit-actions-submit', { timeout: 15000 });
                
                // === Form Filling Logic ===
                for (const key in formData) {
                    const value = formData[key];
                    const selector = ID_MAP[key];

                    if (selector && value) {
                        if (DROPDOWN_KEYS.includes(key)) {
                            // Playwright selects by visible text (label)
                            await page.selectOption(selector, { label: value });
                        } else {
                            // Regular text inputs and textarea
                            await page.fill(selector, value);
                        }
                    }
                }
                
                // === Submission ===
                const submitButtonSelector = "#edit-actions-submit";
                await page.click(submitButtonSelector);
                console.log("-> Clicked Submit button.");

                // Wait for the next page to load (e.g., success page)
                await page.waitForURL(url => url !== link, { waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log(`-> Submission successful for: ${link}`);
                
                await logSubmittedUrl(link);
                
            } catch (navigationError) {
                console.error(`-> Error during submission of ${link}: ${navigationError.message}`);
                // Continue to the next link
            }
        }
    } catch (e) {
        console.error(`Browser initialization error: ${e.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = transcribeAndSubmit;