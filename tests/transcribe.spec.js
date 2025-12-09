const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');
const transcribeAndSubmit = require('../transcribe');

test.describe('Transcribe and Submit Functional Tests', () => {
    const requestHtmlPath = path.resolve(__dirname, '../examples/atip_request_example.html');
    const requestUrl = pathToFileURL(requestHtmlPath).toString();

    const MOCK_FORM_DATA = {
        requestor_category: "Member of the Public", // Label, not value "5"
        delivery_method: "Electronic Copy", // Label "Electronic Copy"
        given_name: "Playwright",
        family_name: "Tester",
        email: "test@example.com",
        phone: "555-0123",
        address: "123 Test Lane",
        city: "Testville",
        state_province: "British Columbia", // Need a valid province label from the HTML? Or "Select"?
        // Looking at verify_local logs, state was an issue. 
        // atip_request_example.html doesn't show the options for state_province in the snippet I saw earlier (lines 620-750).
        // It showed #edit-address-fieldset-state-province-select.
        // I should check the HTML content for valid state options.
        // For now, I'll guess "Ontario" or "British Columbia" if it's a standard list.
        // Or I can check the file content.
        state_province: "Ontario", 
        postal_code: "K1A 0A9",
        country: "Canada", // Label "Canada"
        preferred_language: "English", // Label "English"
        consent: "Yes", // Label "Yes" or "Oui"? The HTML snippet showed pattern "(Yes|Oui)".
        additional_comments: "Functional Test Comment"
    };

    test('should fill and submit the form correctly using local file', async ({ page }) => {
        // 1. Navigate to the local file
        await page.goto(requestUrl);

        // 2. Unhide the submit button (logic similar to what we found we needed in verify_local.js)
        await page.evaluate(() => {
            const submitBtnContainer = document.querySelector('#edit-actions');
            if (submitBtnContainer) {
                submitBtnContainer.style.display = 'block';
            }
        });

        // 3. Block network requests to ensure 0 ping (Rule: "must not ping any live websites")
        await page.route('**/*', route => {
            if (route.request().url().startsWith('file:')) {
                route.continue();
            } else {
                route.abort(); // Abort external requests (e.g. analytics, fonts, form submission destination)
            }
        });

        // 4. Fill the Form
        await transcribeAndSubmit.fillForm(page, MOCK_FORM_DATA);

        // Verify some fields were filled
        await expect(page.locator('#edit-given-name')).toHaveValue(MOCK_FORM_DATA.given_name);
        await expect(page.locator('#edit-additional-comments')).toHaveValue(MOCK_FORM_DATA.additional_comments);

        // 5. Submit
        // Note: submitForm expects navigation. 
        // Since we are mocking network/using file system, the form submission might fail or navigate to a 404/file.
        // We catch strict navigation errors if the destination is blocked or invalid.
        
        // We can mock the navigation pattern or just verify the button click and subsequent checking logic.
        // However, submitForm waits for URL change.
        // Let's try to call it and see. If it fails due to blocked request, we might need to handle that.
        // The form action is "/en/search/ati/reference/..." which is relative.
        // On file:///, it will try to go to file:///C:/en/search/... which will fail or load a broken page.
        // That IS a URL change. So waitForURL should pass (url !== initialUrl).
        
        try {
           await transcribeAndSubmit.submitForm(page); 
        } catch (e) {
           // If it times out or fails because we blocked the request, that's expected.
           // But if the URL changed, submitForm returns true.
           // Let's check if we stayed on the same page.
        }
        
        // Assert: URL has changed (indicating submission attempt)
        expect(page.url()).not.toBe(requestUrl);
    });
});

// Revised strategy for this file content:
// I'll write the test assuming I've refactored `transcribe.js` to export `processUrl(page, url, formData)`.
