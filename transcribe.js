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
 * Injects a countdown overlay and waits for user action or timeout.
 * @param {import('playwright').Page} page
 * @returns {Promise<'SUBMIT'|'SKIP'|'STOP'>}
 */
async function waitForUserAction(page) {
    return page.evaluate(() => {
        return new Promise((resolve) => {
            // Create container
            const container = document.createElement('div');
            container.style.position = 'fixed';
            container.style.bottom = '20px';
            container.style.right = '20px';
            container.style.backgroundColor = '#fff';
            container.style.border = '1px solid #ccc';
            container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            container.style.padding = '15px';
            container.style.borderRadius = '8px';
            container.style.zIndex = '999999';
            container.style.fontFamily = 'system-ui, sans-serif';
            container.style.minWidth = '300px';

            // Title / Countdown
            const title = document.createElement('div');
            title.style.fontSize = '18px';
            title.style.marginBottom = '10px';
            title.style.fontWeight = 'bold';
            title.style.textAlign = 'center';
            container.appendChild(title);

            // Button Container
            const btnContainer = document.createElement('div');
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            btnContainer.style.justifyContent = 'space-between';
            container.appendChild(btnContainer);

            // Helper to create buttons
            const createBtn = (text, color, action) => {
                const btn = document.createElement('button');
                btn.textContent = text;
                btn.style.padding = '8px 12px';
                btn.style.border = 'none';
                btn.style.borderRadius = '4px';
                btn.style.color = 'white';
                btn.style.backgroundColor = color;
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '14px';
                btn.onclick = () => cleanup(action);
                return btn;
            };

            const submitBtn = createBtn('Submit Now', '#2ecc71', 'SUBMIT');
            const skipBtn = createBtn('Skip', '#f1c40f', 'SKIP');
            const stopBtn = createBtn('Stop', '#e74c3c', 'STOP');

            btnContainer.appendChild(submitBtn);
            btnContainer.appendChild(skipBtn);
            btnContainer.appendChild(stopBtn);

            document.body.appendChild(container);

            // Timer Logic
            let timeLeft = 3;
            const updateTimer = () => {
                title.textContent = `Submitting in ${timeLeft}...`;
                if (timeLeft <= 0) {
                    cleanup('SUBMIT');
                }
                timeLeft--;
            };

            updateTimer();
            const interval = setInterval(updateTimer, 1000);

            function cleanup(action) {
                clearInterval(interval);
                if (container.parentNode) {
                    container.parentNode.removeChild(container);
                }
                resolve(action); // Resolve promise with action
            }
        });
    });
}

/**
 * Process a single URL: Visit -> Fill -> (Interactive Wait) -> Submit -> Log.
 * Functional: Isolated execution scope.
 * @param {import('playwright').BrowserContext} context 
 * @param {string} link 
 * @param {Object} formData 
 * @param {Object} options
 * @returns {Promise<'CONTINUE'|'STOP'>} 
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

        // --- Interactive Step ---
        // If headless, we can't really do interactive, so strict 3s wait? 
        // Or assume this feature implies headed mode (which is forced in main.js anyway)
        const action = await waitForUserAction(page);
        
        console.log(`-> User Action: ${action}`);

        if (action === 'STOP') {
            return 'STOP';
        }
        
        if (action === 'SKIP') {
            return 'CONTINUE';
        }

        // Action is SUBMIT (either auto or manual)
        if (options.dryRun) {
            console.log("-> [TEST MODE] Skipping submission (User allowed submit).");
            await page.waitForTimeout(1000); 
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
    return 'CONTINUE';
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
            const flowControl = await processSingleLink(context, link, formData, options);
            
            if (flowControl === 'STOP') {
                console.log("\n! Stop signal received. Halting batch processing.");
                break;
            }

            // Random wait between separate submissions (if not stopped)
            // We use a shorter wait now because the interactive countdown adds delay naturally
            // But let's keep a small minimal one for politeness if they clicked 'Submit Now' instantly
            await new Promise(r => setTimeout(r, 1000)); 
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